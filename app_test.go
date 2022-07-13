package main

import (
	"fmt"
	"log"
	"testing"
	"time"

	"github.com/samber/lo"
)

func TestRedditFetch(t *testing.T) {
	requestData := &fetchRedditPostsData{
		count:     0,
		after:     "",
		rateLimit: redditRateLimit{},
	}
	app := NewApp()
	app.InitDB()
	db := app.dbAPI.db

	for {
		time.Sleep(3 * time.Second)
		sub := "programming"
		order := RedditOrderHot
		r := lo.Must(GetRequestState(db, sub, order))
		if r != nil {
			requestData = r
		}

		items, newData, err := fetchRedditPosts(sub, order, *requestData)
		if err != nil {
			log.Println(err)
			continue
		}
		requestData = newData

		for _, item := range items {
			fmt.Printf("%v\n", item.Title)
		}
		fmt.Println("------------------------------------------")

		fmt.Printf("new data: %v", *requestData)
		lo.Must0(SetRequestState(db, sub, order, *requestData))

		// TODO: why isn't it commiting the changes to the database?
		// is it because it's running from a test?
		// yeah, looks like it,
		// maybe it mocking the calls to the filesystem
		break
	}

}
