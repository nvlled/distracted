package main

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"strings"

	"github.com/samber/lo"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// TODO: remove everything here
type UserData struct {
	app *App

	IntroCompleted bool `json:"introCompleted"`
	IsDownloading  bool `json:"isDownloading"`
	NumToDownload  int  `json:"numToDownload"`

	TextEditor string `json:"textEditor"`

	Decks      []string `json:"decks"`
	Interests  []string `json:"interests"`
	Subreddits []string `json:"subreddits"`
}

func (self *App) GetUserData() UserData {
	return *self.userData
}

func NewUserData(app *App) UserData {
	return UserData{
		app:        app,
		Subreddits: []string{},
		Interests:  []string{},
	}
}
func (data *UserData) Save() {
	data.SaveInterests()
	data.SaveSubreddits()
}
func (data *UserData) Load() {
	// TODO: remove
	data.LoadInterests()
	data.LoadSubreddits()

	decks, err := data.getDecks()
	if err != nil {
		data.app.Error(err)
	} else {
		data.app.Debugf("loaded user decks: %v", decks)
		data.Decks = decks
	}

	// TODO: remove
	data.IntroCompleted = data.app.dbAPI.GetDataBool(UserDataKeys.IntroCompleted)
	data.IsDownloading = data.app.dbAPI.GetDataBool(UserDataKeys.IsDownloading)
	data.NumToDownload = data.app.dbAPI.GetDataInt(UserDataKeys.NumToDownload)
	if data.NumToDownload == 0 {
		data.IsDownloading = false
	}

	data.TextEditor = data.app.dbAPI.GetDataString(UserDataKeys.TextEditor)
}

func (data *UserData) SaveInterests() {
	config := data.app.config
	lines := strings.Join(data.Interests, "\n")
	bytes := lo.Must(json.Marshal(lines))
	lo.Must0(ioutil.WriteFile(config.UserInterestsFile, bytes, 0644))
	runtime.LogDebugf(data.app.ctx, "saved user interests: %v", data.app.config.UserInterestsFile)
}

func (data *UserData) SaveSubreddits() {
	config := data.app.config
	lines := strings.Join(data.Subreddits, "\n")
	bytes := lo.Must(json.Marshal(lines))
	lo.Must0(ioutil.WriteFile(config.UserSubredditsFile, bytes, 0644))
	runtime.LogDebugf(data.app.ctx, "saved user subreddits: %v", data.app.config.UserSubredditsFile)
}

func (data *UserData) LoadInterests() {
	app := data.app

	filename := app.config.UserInterestsFile
	runtime.LogDebugf(app.ctx, "loading user interests: %v", filename)
	if !RegularFileExists(data.app.ctx, filename) {
		runtime.LogDebugf(app.ctx, "no user interests found")
		return
	}

	interests, err := ReadNonEmptyLines(filename)
	if err != nil {
		runtime.LogDebugf(app.ctx, "failed to load interests: %v", err.Error())
	} else {
		data.Interests = interests
	}
	runtime.LogDebugf(app.ctx, "loaded user interests: %v", interests)
}

func (data *UserData) LoadSubreddits() {
	app := data.app

	filename := app.config.UserSubredditsFile
	runtime.LogDebugf(app.ctx, "loading user subreddits: %v", filename)
	if !RegularFileExists(data.app.ctx, filename) {
		runtime.LogDebugf(app.ctx, "no user subreddits found")
		return
	}

	subreddits, err := ReadNonEmptyLines(filename)
	if err != nil {
		runtime.LogDebugf(app.ctx, "failed to load user subreddits: %v", err.Error())
	} else {
		data.Subreddits = subreddits
	}
	runtime.LogDebugf(app.ctx, "loaded user subreddits: %v", subreddits)
}

func (data *UserData) AddInterest(interest string) bool {
	interest = strings.Trim(interest, " 	\n")
	app := data.app
	if lo.ContainsBy(data.Interests, func(entry string) bool { return interest == entry }) {
		return false
	}

	runtime.LogDebugf(app.ctx, "added %v to user interests: %v", interest, app.config.UserInterestsFile)
	data.Interests = append(data.Interests, interest)
	data.SaveInterests()

	return true
}
func (data *UserData) RemoveInterest(interest string) bool {
	interest = strings.Trim(interest, " 	\n")
	app := data.app
	if !lo.ContainsBy(data.Interests, func(entry string) bool { return interest == entry }) {
		return false
	}

	runtime.LogDebugf(app.ctx, "removed %v from user interests: %v", interest, app.config.UserInterestsFile)
	data.Interests = lo.Filter(data.Interests, func(entry string, i int) bool {
		return interest != entry
	})

	data.SaveInterests()

	return true
}

func (data *UserData) AddSubreddit(subreddit string) bool {
	subreddit = strings.Trim(subreddit, " 	\n")
	app := data.app
	if lo.ContainsBy(data.Subreddits, func(entry string) bool { return subreddit == entry }) {
		return false
	}

	runtime.LogDebugf(app.ctx, "added %v to user subreddit: %v", subreddit, app.config.UserSubredditsFile)
	data.Subreddits = append(data.Subreddits, subreddit)
	data.SaveSubreddits()

	return true
}

func (data *UserData) RemoveSubreddit(subreddit string) bool {
	subreddit = strings.Trim(subreddit, " 	\n")
	app := data.app
	if !lo.ContainsBy(data.Subreddits, func(entry string) bool { return subreddit == entry }) {
		return false
	}

	runtime.LogDebugf(app.ctx, "removed %v from user subreddit: %v", subreddit, app.config.UserSubredditsFile)
	data.Subreddits = lo.Filter(data.Subreddits, func(entry string, i int) bool {
		return subreddit != entry
	})

	data.SaveSubreddits()

	return true
}

func (data *UserData) getDecks() ([]string, error) {
	entries, err := os.ReadDir(data.app.config.DecksDir)
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
