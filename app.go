package main

import (
	"changeme/reddit"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
	"github.com/skratchdot/open-golang/open"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	goruntime "runtime"
)

type App struct {
	ctx      context.Context
	server   *echo.Echo
	config   *Config
	userData *UserData
	dbAPI    *DBAPI

	scheduler CardScheduler

	distractions []DistractionFile

	redditCrawler *RedditCrawler

	fileWatcher *fsnotify.Watcher
}

func NewApp() *App {
	app := &App{}
	userData := NewUserData(app)
	app.server = app.createServer()
	app.userData = &userData
	app.LoadConfig()
	app.scheduler = CardScheduler{}

	return app
}

func (self *App) startup(ctx context.Context) {

	self.ctx = ctx
	runtime.LogSetLogLevel(ctx, logger.DEBUG)
	runtime.WindowHide(ctx)

	self.InitDB()

	if !self.IsDataDirInitialized() {
		self.InitDataDir()
	}

	self.userData.Load()
	self.LoadDistractions()

	onRedditFetch := func(postData reddit.Subreddit) bool {
		post := CreateRedditPost(postData)
		self.Debugf("> %+v", post)
		var url string
		var filename string

		if post.Video != "" {
			url = post.VideoURL
			filename = post.Video
		} else if post.Image != "" {
			url = post.ImageURL
			filename = post.Image
		} else {
			return false
		}

		destFile := filepath.Join(self.config.DistractionsDir, filename)
		err := GetURL(url, destFile)

		stat, err := os.Stat(destFile)
		maxFileByteSize := 25 * 1024 * 1024
		var fileSize int64
		if err == nil {
			fileSize = stat.Size()
		}

		if fileSize > int64(maxFileByteSize) {
			if err := os.Remove(destFile); err != nil {
				self.Error(err)
			}
			return false
		}

		if err != nil {
			self.Debugf(err.Error())
			return false
		} else if filename != "" && fileSize > 0 {
			md5Sum := fmt.Sprintf("%x", lo.Must(GetFileMd5Sum(destFile)))
			err := self.dbAPI.RegisterDistraction(filename, DistractionReddit, md5Sum, post)
			if err != nil {
				self.Error(err)
				runtime.LogErrorf(self.ctx, "failed to register distraction %v: %v", filename, err.Error())
			}
			return false
		}
		return true
	}

	self.redditCrawler = NewRedditCrawler(self, onRedditFetch)
	if self.userData.IsDownloading {
		self.StartCrawler(self.redditCrawler.NumDownload)
	}

	if w, err := fsnotify.NewWatcher(); err != nil {
		self.Error(err)
	} else {
		self.fileWatcher = w
		go self.startFileWatcher()
	}
}

func (self *App) StartCrawler(numToDownload int) {

	if !self.redditCrawler.Running {
		self.redditCrawler.NumDownload = numToDownload
		go self.redditCrawler.Start()
	}
}
func (self *App) StopCrawler() {
	self.redditCrawler.Stop()
}

func (self *App) IsDataDirInitialized() bool {
	if !DirectoryExists(self.ctx, self.config.UserDataDir) {
		return false
	}

	return self.dbAPI.GetDataBool(UserDataKeys.DataDirInitialized)
}

func (self *App) InitDataDir() {
	config := self.config
	Mkdir(config.DecksDir)
	Mkdir(config.DistractionsDir)
	CreateEmptyFile(self.ctx, config.UserInterestsFile)
	CreateEmptyFile(self.ctx, config.UserSubredditsFile)
	CreateEmptyFile(self.ctx, config.UserSubredditsFile)
	self.InitDistractions()
	self.dbAPI.SetData(UserDataKeys.DataDirInitialized, "1")
}

func (self *App) InitDistractions() {
	ctx := self.ctx
	srcPath := self.config.SampleDistractionsDir
	destPath := self.config.DistractionsDir
	err := filepath.WalkDir(srcPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relPath, err := filepath.Rel(srcPath, path)
		if err != nil {
			return err
		}

		destFile, err := filepath.Abs(filepath.Join(destPath, relPath))
		if err != nil {
			return err
		}

		if d.IsDir() {
			os.MkdirAll(destFile, 0755)
			runtime.LogDebugf(ctx, "creating dir: %v", destFile)
		} else {
			runtime.LogDebugf(ctx, "> copying %v -> %v", path, destFile)
			err := CopyFileContents(path, destFile)
			if err != nil {
				return nil
			}
		}

		return nil
	})
	if err != nil {
		self.Error(err)
	}
}

func (self *App) GetStartingDecks() ([]string, error) {
	entries, err := os.ReadDir(self.config.StartDecksDir)
	if err != nil {
		return nil, err
	}
	var decks []string
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		decks = append(decks, entry.Name())
	}
	return decks, nil
}

func (self *App) CompleteIntro() {
	self.userData.IntroCompleted = true
	self.dbAPI.SetData(UserDataKeys.IntroCompleted, true)
}

func (self *App) CreateStartingDeck(deckName string, overwrite bool) (string, error) {
	ctx := self.ctx
	config := self.config
	destPath := filepath.Join(self.config.DecksDir, deckName)

	if yes, err := IsEmptyDirectory(destPath); err != nil {
		return "", err
	} else if !yes && !overwrite {
		return "", errorList.ErrCreateDeckPathNotEmpty
	}

	srcPath := filepath.Join(config.StartDecksDir, deckName)
	runtime.LogDebugf(self.ctx, "starting deck path: %v", srcPath)
	if !DirectoryExists(self.ctx, srcPath) {
		return "", errorList.Get().ErrInvalidStartingDeck
	}

	err := filepath.WalkDir(srcPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relPath, err := filepath.Rel(srcPath, path)
		if err != nil {
			return err
		}

		destFile, err := filepath.Abs(filepath.Join(destPath, relPath))
		if err != nil {
			return err
		}

		if d.IsDir() {
			os.MkdirAll(destFile, 0755)
			runtime.LogDebugf(ctx, "creating dir: %v", destFile)
		} else {
			runtime.LogDebugf(ctx, "> copying %v -> %v", path, destFile)
			err := CopyFileContents(path, destFile)
			if err != nil {
				return nil
			}
		}

		return nil
	})
	if err != nil {
		self.Error(err)
		return "", errorList.ErrIOError
	}

	//fullDestPath, err := filepath.Abs(destPath)
	//if err != nil {
	//	runtime.LogError(ctx, err.Error())
	//	return nil, errorList.ErrIOError
	//}

	//deck, err := self.RegisterDeck(fullDestPath, deckName)
	//if err != nil {
	//	return nil, err
	//}

	//self.userData.AddDeck(*deck)

	return deckName, nil
}

/*
func (self *App) BrowseDeckFolder() (string, error) {
	filePath := lo.Must(runtime.OpenDirectoryDialog(self.ctx, runtime.OpenDialogOptions{
		CanCreateDirectories:       true,
		TreatPackagesAsDirectories: true,
		Title:                      "Select folder to save new deck",
	}))

	if filePath == "" {
		return "", nil
	}

	runtime.LogDebugf(self.ctx, "selected folder: %v", filePath)

	for _, deck := range self.Decks {
		if deck.FullPath == filePath {
			return "", errorList.ErrDeckAlreadyAdded
		}
	}

	if isDir, err := IsDirectory(filePath); err != nil {
		return "", err
	} else if !isDir {
		return "", errorList.ErrInvalidDeckPath
	}

	//deck := self.addDeck(filePath)
	return filePath, nil
}
*/

/*
func (self *App) RegisterDeck(deckPath string, deckName string) (*Deck, error) {
	for _, deck := range self.Decks {
		if deck.FullPath == deckPath {
			return nil, errorList.ErrDeckAlreadyAdded
		}
	}

	if deckName == "" {
		deckName = path.Base(deckPath)
	}

	idSum := md5.Sum([]byte(deckPath))
	deck := Deck{
		ID:       fmt.Sprintf("%x", idSum),
		Name:     deckName,
		FullPath: deckPath,
	}

	runtime.LogDebugf(self.ctx, "registered deck: %v", deck)
	self.Decks = append(self.Decks, deck)
	return &deck, nil
}
*/

type DistractionFile struct {
	Filename string `json:"filename"`
	ModTime  int64  `json:"modTime"`
}
type Distraction struct {
	//Type     string `json:"type"`
	Filename string `json:"filename"`
	UrlPath  string `json:"urlPath"`
	MetaData string `json:"metaData"`
}

func (self *App) LoadDistractions() {
	// TODO:
	// read all files from distractions/
	// sort by modification date
	// index by distractionIndex

	//foo, _ := os.Stat("filename")
	//foo.ModTime().Unix()
	var distractions []DistractionFile

	var err error
	for file := range EnumerateFiles(self.config.DistractionsDir, &err) {
		distractions = append(distractions, DistractionFile{
			Filename: file.Filename,
			ModTime:  file.ModTime,
		})
	}
	if err != nil {
		self.Error(err)
		return
	}

	sort.SliceStable(distractions, func(i, j int) bool {
		return distractions[i].ModTime < distractions[j].ModTime
	})

	self.distractions = distractions
}

func (self *App) GetCurrentDistraction() (*Distraction, error) {
	index := self.dbAPI.GetDataInt(UserDataKeys.DistractionIndex)
	if index < 0 || index >= len(self.distractions) {
		return nil, nil
	}

	fileInfo := self.distractions[index]
	row, err := self.dbAPI.GetDistraction(fileInfo.Filename)
	if err != nil {
		return nil, err
	}

	if row == nil {
		return &Distraction{
			Filename: fileInfo.Filename,
			UrlPath:  path.Join("distractions", fileInfo.Filename),
			MetaData: "",
		}, nil

	}

	return &Distraction{
		Filename: row.Filename,
		UrlPath:  path.Join("distractions", row.Filename),
		MetaData: row.Data,
	}, nil
}

func (self *App) NextDistraction() (*Distraction, error) {
	index := self.dbAPI.GetDataInt(UserDataKeys.DistractionIndex)
	index++

	if index >= len(self.distractions) {
		index = 0
	}

	self.dbAPI.SetData(UserDataKeys.DistractionIndex, index)

	return self.GetCurrentDistraction()
}

func (self *App) StudyCard(cardPath string, recalled bool) (*CardData, error) {
	card, err := self.GetCard(cardPath)
	if err != nil {
		return nil, err
	}

	var updatedCard CardData
	if recalled {
		updatedCard = self.scheduler.Recalled(*card)
	} else {
		updatedCard = self.scheduler.Forgot(*card)
	}

	card = &updatedCard

	row := struct {
		Path string `db:"path"` // $deckID/$filename

		NumRecall    int   `db:"numRecall"`
		NumForget    int   `db:"numForget"`
		ConsecRecall int   `db:"consecRecall"`
		ConsecForget int   `db:"consecForget"`
		Interval     int64 `db:"interval"`
		LastUpdate   int64 `db:"lastUpdate"`
	}{
		Path: card.Path,

		NumRecall:    card.NumRecall,
		NumForget:    card.NumForget,
		ConsecRecall: card.ConsecRecall,
		ConsecForget: card.ConsecForget,
		Interval:     card.Interval,
		LastUpdate:   card.LastUpdate,
	}

	query := "" +
		"UPDATE `cards` SET " +
		"`numRecall`    = :numRecall, " +
		"`numForget`    = :numForget, " +
		"`consecRecall` = :consecRecall, " +
		"`consecForget` = :consecForget, " +
		"`interval`	    = :interval, " +
		"`lastUpdate`   = :lastUpdate " +
		"WHERE `path` = :path"

	_, err = self.dbAPI.db.NamedExec(query, &row)
	if err != nil {
		self.Error(err)
		return nil, errorList.ErrIOError
	}

	return card, nil
}

func (self *App) CreateCardDBEntry(path string) (CardRow, error) {
	filename := filepath.Join(self.config.DecksDir, path)
	md5sum, _ := GetFileMd5Sum(filename)
	row := CardRow{
		Path:   path,
		Md5sum: md5sum,

		NumRecall:    0,
		NumForget:    0,
		ConsecRecall: 0,
		ConsecForget: 0,
		Interval:     0,

		LastUpdate: time.Now().Unix(),
	}
	query := "" +
		"INSERT INTO `cards` (`path`, `md5sum`, `numRecall`, `numForget`, `consecRecall`, `consecForget`, `interval`, `lastUpdate`) " +
		"VALUES (:path, :md5sum, :numRecall, :numForget, :consecRecall, :consecForget, :interval, :lastUpdate) "
	_, err := self.dbAPI.db.NamedExec(query, &row)

	return row, err
}

func (self *App) GetCard(path string) (*CardData, error) {
	path = filepath.FromSlash(path)
	filename := filepath.Join(self.config.DecksDir, path)

	bytes, err := ioutil.ReadFile(filename)
	if err == os.ErrNotExist || err == os.ErrInvalid {
		return nil, errorList.ErrInvalidCardPath
	}

	var row CardRow

	err = self.dbAPI.db.Get(
		&row, "SELECT `md5sum`, `numRecall`, `numForget`, `consecRecall`, `consecForget`, `interval`, `lastUpdate` "+
			"FROM `cards` WHERE `path` = ?", path,
	)
	if err != nil && err != sql.ErrNoRows {
		self.Errorf("failed to query card: %v", err.Error())
		return nil, errorList.ErrIOError
	}

	if err == sql.ErrNoRows {
		row, err = self.CreateCardDBEntry(path)
		self.Error(err)
	}

	if row.Md5sum == "" {
		row.Md5sum, _ = GetMd5Sum(bytes)
	}

	card := CardData{
		Filename: filepath.Base(path),
		DeckName: filepath.Dir(path),
		Path:     path,
		Contents: string(bytes),
		Md5sum:   row.Md5sum,

		NumRecall:    row.NumRecall,
		NumForget:    row.NumForget,
		ConsecRecall: row.ConsecRecall,
		ConsecForget: row.ConsecForget,
		Interval:     row.Interval,
		LastUpdate:   row.LastUpdate,
	}

	return &card, nil
}

func (self *App) watchFile(filePath string) error {
	return self.fileWatcher.Add(filePath)
}

func (self *App) UnwatchCardFile(cardpath string) error {
	cardpath = filepath.FromSlash(cardpath)
	filename := filepath.Join(self.config.DecksDir, cardpath)
	return self.fileWatcher.Remove((filename))
}

func (self *App) WatchCardFile(cardpath string) error {
	cardpath = filepath.FromSlash(cardpath)
	filename := filepath.Join(self.config.DecksDir, cardpath)
	return self.fileWatcher.Add((filename))
}
func (self *App) ClearWatchedFiles() error {
	files := self.fileWatcher.WatchList()
	for _, file := range files {
		err := self.fileWatcher.Remove(file)
		self.Error(err)
	}
	return nil
}

func (self *App) startFileWatcher() {
	self.Debugf("starting file watcher")
	for {
		select {
		case event, ok := <-self.fileWatcher.Events:
			if !ok {
				return
			}
			runtime.LogInfof(self.ctx, "file watcher event: %v", event)
			if event.Op&fsnotify.Write == fsnotify.Write {
				cardpath := GetCardPath(event.Name)
				runtime.EventsEmit(self.ctx, "card-file-updated", cardpath)
				runtime.LogInfof(self.ctx, "modified file: %v", cardpath)
			}
		case err, ok := <-self.fileWatcher.Errors:
			if !ok {
				self.Debugf("stopping file watcher")
				return
			}
			self.Error(err)
		}
	}
}

func (self *App) SetTextEditor(textEditor string) error {
	self.dbAPI.SetData(UserDataKeys.TextEditor, textEditor)
	self.userData.TextEditor = textEditor
	return nil
}

func (self *App) OpenCardFile(cardpath string) error {
	cardpath = filepath.FromSlash(cardpath)
	filename := filepath.Join(self.config.DecksDir, cardpath)

	textEditor := self.dbAPI.GetDataString(UserDataKeys.TextEditor)
	if textEditor != "" {
		return open.RunWith(filename, textEditor)
	}

	var editors []string
	if goruntime.GOOS == "windows" {
		editors = []string{"code", "notepad++", "notepad"}
	} else if goruntime.GOOS == "linux" {
		editors = []string{"codium", "code", "gedit", "gvim", "emacs"}
	}

	var err error
	for _, textEditor := range editors {
		err = open.RunWith(filename, textEditor)
		if err == nil {
			self.dbAPI.SetData(UserDataKeys.TextEditor, textEditor)
			return nil
		}
	}

	return err
}

func (self *App) Search(query string) ([]CardData, error) {
	// TODO:
	// for simplicity, just manually read the files
	// for every search, no caching
	return []CardData{}, nil
}

func (self *App) GetCardCollections() (map[string][]string, error) {
	db := self.dbAPI.db
	var rows []struct {
		Name     string `db:"name"`
		Cardpath string `db:"cardpath"`
	}
	err := db.Select(&rows, "SELECT `name`, `cardpath` FROM `card_collections`")
	if err != nil {
		return nil, self.Error(err)
	}
	result := map[string][]string{}
	for _, row := range rows {
		result[row.Name] = append(result[row.Name], row.Cardpath)
	}

	return result, nil
}

func (self *App) CreateCardCollection(name string, cardpaths []string) error {
	if len(cardpaths) == 0 {
		return nil
	}

	db := self.dbAPI.db
	_, err := db.Exec("DELETE FROM `card_collections` WHERE `name` = $1", name)
	if err != nil {
		return self.Error(err)
	}

	tx, err := db.Begin()
	if err != nil {
		return self.Error(err)
	}
	defer tx.Commit()

	stmt, err := tx.Prepare("INSERT INTO `card_collections` (`name`, `cardpath`) VALUES ($1, $2)")
	if err != nil {
		return self.Error(err)
	}

	for _, c := range cardpaths {
		_, err = stmt.Exec(name, c)
		if err != nil {
			return self.Error(err)
		}
	}

	return nil
}

func (self *App) GetNotes() (string, error) {
	notesPath := filepath.Join(self.config.UserDataDir, "notes.txt")
	bytes, err := ioutil.ReadFile(notesPath)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return "", self.Error(err)
	}
	return string(bytes), nil
}
func (self *App) SaveNotes(notes string) error {
	notesPath := filepath.Join(self.config.UserDataDir, "notes.txt")
	err := ioutil.WriteFile(notesPath, []byte(notes), 0644)
	return self.Error(err)
}

func (self *App) ListCards(deck string) ([]CardFile, error) {
	fullDeckPath := filepath.Join(self.config.DecksDir, string(deck))
	if !DirectoryExists(self.ctx, fullDeckPath) {
		return []CardFile{}, nil
	}
	entries := lo.Must(os.ReadDir(fullDeckPath))

	var cards []CardFile
	for _, file := range entries {
		ext := strings.ToLower(filepath.Ext(file.Name()))
		if !(ext == ".txt" || ext == ".md") {
			continue
		}

		cardPath := filepath.Join(deck, file.Name())

		cards = append(cards, CardFile{
			Filename: filepath.Base(cardPath),
			DeckName: filepath.Dir(cardPath),
			Path:     cardPath,
		})
	}

	return cards, nil
}

func (self *App) ManualExportType() *RedditPost {
	// FIX: this is just a workaround since I don't
	// know how to bind types without using them in a method
	return nil
}

/*
func (self *App) getDeckByID(id string) *Deck {
	runtime.LogDebugf(self.ctx, "num decks: %v", self.Decks)
	for _, deck := range self.Decks {
		runtime.LogDebugf(self.ctx, "getDeckByID: %v ==? %v", deck.Name, id)
		if deck.ID == id || deck.Name == id {
			return &deck
		}
	}
	return nil
}
*/

type SearchResult struct {
	VideoID   string `json:"videoID"`
	Title     string `json:"title"`
	Thumbnail string `json:"thumbnail"`
}

func (self *App) SearchYoutube(query string, pageNum int) ([]SearchResult, error) {
	return nil, nil
}

// -------------------------------------------------
/*

--------
please give your interests
[        ]
[        ]
--------
Do you go to the website reddit?
[yes] [no]

--------
Can you give the subreddits that you like to read?
Preferrably subreddits with lots of images or
videos.
[                         ]
[                         ]
[                         ]
[                         ]

What for? The posts on those subreddits
will be shown here. It will be explained
later for what purpose.

-------------------------------


-------------------------------

things to memorize in order:
1. general appearance of the word (for recognition)
2. sounds or pronunciation
3. specific, or detailed appearance of the word.

Reading from an example sentence is actually
misleading since I tend to use the context to remember
the word, but fail to recognize or remember it
out of that very specific example context.

So it's important to only look at the word itself first.
If it can't be recognized, then it's considered
not remembered.


TODO: max study time limit

TODO: distraction file rotation
      just automatically download new files when N distractions are left
	  delete older ones

TODO: save last selected cards
TODO: edit extractor, add * to all keywords


TODO: add option to minimize window during distraction
		show only when interval is greater than 5 minutes


TODO: Intro tutorial


TODO: card scheduling and spacing
What name should I use for the algorithm?
I did create a new algorithm ... right?
It's not like it has a formal mathematical model,
but it's still well-defined with finite steps.

ebisu
sm-2

TODO: read subreddits.txt
      shuffle batch
      add option to disable crawling
      add option to download next batch

TODO: group distractions by folder

TODO: write reddit crawler
include search results
https://www.reddit.com/subreddits/search.json?q=goats&include_over_18=on


app.exe
dataDir/
  data.sqlite3
  interests.txt
  subreddits.txt
  distractions/
	reddit/
		meme1.jpg
		meme2.png
		unepxected.mp4

	# downloading youtube videos isn't a good idea
	# since they could easily fill up the user's disk space
	video-title.yt.txt # contents = id or url
	links.yt.txt

	| get N random, cueVideoByUrl() each
	historical-arts/
		art1.jpg
		art2.jpg
    some-quote.txt
	plaintext.txt
  decks/
    deck1/
	deck2/

// on app startup
updateRenamedFiles() {
	// get rows from db, get rows with missing files
	// foreach file in dir
	//   if md5(file) in missing files
	//      update row
	// remove rows with missing files
}
// just fs watch the decks and distractions
// and update row with matching old filename

buildFileIndex() {
	// list files in dir
	//  if no file matching file, create entry
	//  else md5 mismatch, update md5
}


nextRedditPost()
consumeRedditPost(post) // deletes from table
fetchDistractions()
  fetchRedditPosts()
  fetchYoutubeLinks()



*/
