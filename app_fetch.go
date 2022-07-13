package main

import (
	"changeme/reddit"
	"crypto/tls"
	"database/sql"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"path"
	"strconv"
	"time"

	"github.com/guregu/null"
	"github.com/jmoiron/sqlx"
	"github.com/samber/lo"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	RedditOrderHot    = "hot"
	RedditOrderRandom = "random"
	RedditOrderRising = "rising"
	RedditOrderNew    = "new"
)

type RedditItem struct {
	Author string `json:"author"`
	Score  int    `json:"score"`
	URL    string `json:"url"`
	Title  string `json:"title"`
}

type RedditCrawler struct {
	app *App

	NumDownload   int
	NumFetched    int
	FetchingBatch bool
	Running       bool
	Handler       func(post reddit.Subreddit) bool
}

func NewRedditCrawler(app *App, handler func(post reddit.Subreddit) bool) *RedditCrawler {
	return &RedditCrawler{
		app:     app,
		Handler: handler,
	}
}

func (self *RedditCrawler) Register(sub string, orderType string) bool {
	db := self.app.dbAPI.db
	ctx := self.app.ctx
	query := "INSERT INTO `requests_redddit` (`sub`, `orderType`, `after`) VALUES($1, $2, $3)"
	res, err := db.Exec(query, sub, orderType, "")
	LogError(ctx, err)
	if res != nil {
		return lo.Must(res.RowsAffected()) > 0
	}
	return false
}

func (self *RedditCrawler) DeleteStaleRequests() {
	db := self.app.dbAPI.db
	ctx := self.app.ctx
	result, err := db.Exec("DELETE FROM `requests_reddit` WHERE strftime('%s', 'now')-`lastUpdate` > 86400")
	if err != nil {
		self.app.Errorf("failed to delete stale requests: %v", err.Error())
	} else {
		runtime.LogDebugf(ctx, "deleted %v stale requests", lo.Must(result.RowsAffected()))
	}
}
func (self *RedditCrawler) DeleteInactiveRequests() {
	db := self.app.dbAPI.db
	ctx := self.app.ctx
	result, err := db.Exec("DELETE FROM `requests_reddit` WHERE `subreddit` NOT IN(?)", self.app.userData.Subreddits)
	if err != nil {
		self.app.Errorf("failed to delete inactive requests: %v", err.Error())
	} else {
		runtime.LogDebugf(ctx, "deleted %v inactive requests", lo.Must(result.RowsAffected()))
	}
}

func (self *RedditCrawler) FetchBatch() []reddit.Subreddit {
	if self.FetchingBatch {
		return nil
	}
	self.FetchingBatch = true
	defer func() { self.FetchingBatch = false }()

	db := self.app.dbAPI.db
	ctx := self.app.ctx

	type Sub struct {
		Sub       string `db:"subreddit"`
		OrderType string `db:"orderType"`
	}

	runtime.LogDebugf(ctx, "reading requests_reddit")

	subs := lo.Map(self.app.userData.Subreddits, func(sub string, i int) Sub {
		return Sub{sub, "hot"}
	})

	batch := []reddit.Subreddit{}

	runtime.LogDebugf(ctx, "starting fetch loop")
	for _, req := range subs {
		data, err := GetRequestState(db, req.Sub, req.OrderType)
		if err != nil {
			data = &fetchRedditPostsData{}
		}
		runtime.LogDebugf(ctx, "request state: %v", data)

		if data == nil {
			continue
		}

		runtime.LogDebugf(ctx, "fetching reddit posts: %v, %v", req.Sub, req.OrderType)
		posts, newData, err := fetchRedditPosts(req.Sub, req.OrderType, *data)
		if err != nil {
			runtime.LogDebugf(ctx, "failed to fetch reddit posts: %v", err.Error())
			time.Sleep(10 * time.Second)
			continue
		}
		if posts == nil {
			posts = []reddit.Subreddit{}
		}

		runtime.LogDebugf(ctx, "newData: %v", newData)
		if newData == nil || len(posts) == 0 {
			newData = &fetchRedditPostsData{}
		}
		if newData != nil {
			err = SetRequestState(db, req.Sub, req.OrderType, *newData)
			LogError(ctx, err)
		}

		for _, post := range posts {
			batch = append(batch, post)
		}
		if len(batch) > self.NumDownload {
			break
		}

		time.Sleep(time.Second * 5)
	}

	rand.Shuffle(len(batch), func(i, j int) { batch[i], batch[j] = batch[j], batch[i] })

	return batch
}

func (self *RedditCrawler) Stop() {
	self.Running = false
}

func (self *RedditCrawler) Start() {
	self.app.dbAPI.SetData(UserDataKeys.NumToDownload, self.NumDownload)
	self.app.dbAPI.SetData(UserDataKeys.IsDownloading, true)
	if self.NumDownload == 0 {
		self.NumDownload = -1
	}
	self.Running = true
	self.app.Debugf("starting downloads")
	for self.Running {
		if self.NumDownload == 0 {
			break
		}
		//self.DeleteInactiveRequests()
		//self.DeleteStaleRequests()

		if (self.NumFetched+1)%100 == 0 {
			time.Sleep(time.Minute * 60)
		} else if self.NumFetched > 0 {
			time.Sleep(time.Minute * 3)
		}

		batch := self.FetchBatch()

		if len(batch) > 0 && self.Handler != nil {
			for _, post := range batch {
				downloaded := self.Handler(post)
				if self.NumDownload > 0 && downloaded {
					self.NumDownload--
				}
				self.app.dbAPI.SetData(UserDataKeys.NumToDownload, self.NumDownload)
				if self.NumDownload <= 0 {
					break
				}
			}
		}

		self.NumFetched += len(batch)

	}
	runtime.EventsEmit(self.app.ctx, "on-finish-download")
	self.app.dbAPI.SetData(UserDataKeys.NumToDownload, 0)
	self.app.dbAPI.SetData(UserDataKeys.IsDownloading, false)
}

type redditRateLimit struct {
	used           int
	remaining      int
	secondsToReset int
}

type fetchRedditPostsData struct {
	after     string
	count     int
	rateLimit redditRateLimit
}

// TODO: dont' bother with reading the rate limit?
// I get random 429s anyway
func fetchRedditPosts(sub string, orderType string, data fetchRedditPostsData) ([]reddit.Subreddit, *fetchRedditPostsData, error) {
	var count null.Int
	var after null.String

	if data.count != 0 {
		count.SetValid(int64(data.count))
	}
	if data.after != "" {
		after.SetValid(data.after)
	}
	rateLimit := data.rateLimit

	if rateLimit.secondsToReset > 0 && rateLimit.remaining <= 0 {
		return nil, nil, nil
	}

	redditData, newRateLimit, err := redditGET(sub, orderType, redditGetArgs{
		after: after,
		count: count,
	})

	if err != nil {
		return nil, nil, err
	}

	data.count += len(redditData.Data.Children)
	if redditData.Data.After != "" {
		data.after = redditData.Data.After
	}

	var result []reddit.Subreddit
	for _, child := range redditData.Data.Children {
		result = append(result, child.Data)
	}

	data.rateLimit = *newRateLimit
	return result, &data, nil
}

type redditGetArgs struct {
	after null.String
	count null.Int
}

func redditGET(sub, orderType string, args redditGetArgs) (*reddit.Reddit, *redditRateLimit, error) {
	requestURL := fmt.Sprintf("https://reddit.com/r/%s/%s.json", sub, orderType)

	params := url.Values{}
	if args.after.Valid {
		params.Add("after", args.after.String)
	}
	if args.count.Valid {
		params.Add("count", strconv.FormatInt(args.count.Int64, 10))
	}

	urlData := lo.Must(url.Parse(requestURL))
	urlData.RawQuery = params.Encode()

	requestURL = urlData.String()
	log.Printf("redditGET %v\n", requestURL)

	// note: this is required because
	// reddit API is broke, will respond with 403
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{},
		},
	}

	resp, err := client.Get(requestURL)
	if err != nil {
		return nil, nil, err
	}
	log.Printf("resp != nil: %v\n", resp != nil)

	defer resp.Body.Close()

	log.Printf("status code: %v\n", resp.StatusCode)
	if resp.StatusCode != http.StatusOK /*&& resp.StatusCode != http.StatusTooManyRequests */ {
		return nil, nil, errorList.ErrRedditRateLimit
	}

	log.Printf("reading response body\n")
	bytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	log.Printf("unmarshalling response: %v\n", len(bytes))
	redditData, err := reddit.UnmarshalReddit(bytes)
	if err != nil {
		return nil, nil, err
	}

	rateLimit := &redditRateLimit{
		used:           FirstResult(strconv.Atoi(resp.Header.Get("X-Ratelimit-Used"))),
		remaining:      FirstResult(strconv.Atoi(resp.Header.Get("X-Ratelimit-Remaining"))),
		secondsToReset: FirstResult(strconv.Atoi(resp.Header.Get("X-Ratelimit-Reset"))),
	}

	log.Printf("redditGET success\n")

	return &redditData, rateLimit, nil
}

func FirstResult[A any, B any](a A, b B) A {
	return a
}

func GetRequestState(db *sqlx.DB, sub string, orderType string) (*fetchRedditPostsData, error) {
	var data struct {
		AfterID     string `db:"afterID"`
		ResultCount int    `db:"resultCount"`
		RlUsed      int    `db:"rlUsed"`
		RlRemaining int    `db:"rlRemaining"`
		RlSeconds   int    `db:"rlSeconds"`
	}

	query := "SELECT `afterID`, `resultCount`, `rlUsed`, `rlRemaining`, `rlSeconds` " +
		" FROM `requests_reddit` WHERE `subreddit`=$1 AND `orderType`=$2"

	// oh great, I don't even get an error for the excess parameter
	err := db.Get(&data, query, sub, orderType)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	log.Printf("sub=%v, order=%v, query data: %v\n", sub, orderType, data)

	result := &fetchRedditPostsData{
		after: data.AfterID,
		count: data.ResultCount,
		rateLimit: redditRateLimit{
			used:           data.RlUsed,
			remaining:      data.RlRemaining,
			secondsToReset: data.RlSeconds,
		},
	}

	return result, nil
}

func SetRequestState(db *sqlx.DB, sub string, orderType string, data fetchRedditPostsData) error {
	query := "" +
		"INSERT INTO `requests_reddit` (`subreddit`, `orderType`, `afterID`, `resultCount`, `rlUsed`, `rlRemaining`, `rlSeconds`, `lastUpdate`) " +
		"VALUES ($1, $2, $3, $4, $5, $6, $7, strftime('%s', 'now')) " +
		"ON CONFLICT(`subreddit`, `orderType`) DO UPDATE SET " +
		"`afterID`=`excluded`.`afterID`, " +
		"`resultCount`=`excluded`.`resultCount`, " +
		"`rlUsed`=`excluded`.`rlUsed`, " +
		"`rlRemaining`=`excluded`.`rlRemaining`, " +
		"`rlSeconds`=`excluded`.`rlSeconds`, " +
		"`lastUpdate`=`excluded`.`lastUpdate` "

	rl := data.rateLimit
	result, err := db.Exec(query, sub, orderType, data.after, data.count, rl.used, rl.remaining, rl.secondsToReset)
	if err == nil {
		log.Printf("rows affected: %v\n", lo.Must(result.RowsAffected()))
	}

	return err
}

type RedditPost struct {
	Type      string  `json:"type"` // always set to reddit
	Author    string  `json:"author"`
	PermaLink string  `json:"permalink"`
	Created   float64 `json:"created"`
	Score     int64   `json:"score"`
	Title     string  `json:"title"`
	VideoURL  string  `json:"videoURL"`
	ImageURL  string  `json:"imageURL"`
	Video     string  `json:"video"`
	Image     string  `json:"image"`
	Subreddit string  `json:"subreddit"`
	ID        string  `json:"id"`
	IsVideo   bool    `json:"isVideo"`
}

func CreateRedditPost(postData reddit.Subreddit) RedditPost {
	post := RedditPost{
		Type:      DistractionReddit,
		Author:    postData.Author,
		PermaLink: postData.Permalink,
		Created:   postData.Created,
		Score:     postData.Score,
		Title:     postData.Title,
		Subreddit: postData.Subreddit,
		ID:        postData.ID,
		IsVideo:   postData.IsVideo,
	}
	if postData.IsVideo {
		videoURL, err := url.Parse(postData.Media.RedditVideo.FallbackURL)
		fmt.Printf("parse video url error: %v\n", err)
		if err == nil {
			id := path.Base(path.Dir(videoURL.Path))
			ext := path.Ext(videoURL.Path)
			if id != "" && ext != "" {
				post.VideoURL = videoURL.String()
				post.Video = id + ext
			}
		}
	} else {
		imageURL, err := url.Parse(postData.URL)
		log.Printf("parse image url error: %v\n", err)
		if err == nil {
			ext := path.Ext(imageURL.Path)
			filename := path.Base(imageURL.Path)
			log.Printf("image filename=%v, ext=%v\n", filename, ext)
			if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".gif" || ext == ".gifv" ||
				ext == ".webm" || ext == ".apng" {
				post.Image = filename
				post.ImageURL = imageURL.String()
			}
		}

	}

	return post
}

func GetURL(url, destFilename string) error {
	pr, pw := io.Pipe()
	defer pr.Close()
	defer pw.Close()

	destFile, err := os.Create(destFilename)
	if err != nil {
		return err
	}
	defer destFile.Close()

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	_, err = io.Copy(destFile, resp.Body)
	return err
}
