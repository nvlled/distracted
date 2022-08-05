package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/samber/lo"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (self *App) GetConfig() Config {
	return *self.config
}

func (app *App) LoadConfig() {
	var config = Config{
		StartDecksDir:         "starting-decks",
		SampleDistractionsDir: "sample-distractions",
		BaseUrlDecks:          "decks",
		DailyStudyName:        DefaultStudyName,
		MaxLearnLevel:         MaxLearnLevel,
		CurrentDate:           app.CurrentDate(),
		StudySessionTypes: StudySessionTypes{
			Normal: StudySessionTypeNormal,
			Quiz:   StudySessionTypeQuiz,
		},
	}

	bytes := lo.Must(assets.ReadFile("wails.json"))
	data := struct {
		Name string `json:"name"`
	}{}

	lo.Must0(json.Unmarshal(bytes, &data))

	userDataDir := "."
	if exePath, err := os.Executable(); err == nil {
		userDataDir = filepath.Dir(exePath)
	} else {
		runtime.LogDebugf(app.ctx, "failed to get executable path: %v", err.Error())
		exePath, err = os.UserConfigDir()
		if err != nil {
			runtime.LogDebugf(app.ctx, "failed to get user data path: %v", err.Error())
			exePath = "."
		}
	}

	config.AppName = data.Name
	config.UserDataDir = filepath.Join(userDataDir, "data")
	//config.UserDataFile = filepath.Join(config.UserDataDir, "data.json")
	config.UserInterestsFile = filepath.Join(config.UserDataDir, "interests.txt")
	config.UserSubredditsFile = filepath.Join(config.UserDataDir, "subreddits.txt")

	config.DBFile = filepath.Join(config.UserDataDir, "data.sqlite3")
	config.DecksDir = filepath.Join(config.UserDataDir, "decks")
	config.DistractionsDir = filepath.Join(config.UserDataDir, "distractions")

	fmt.Printf("user data dir: %v\n", config.UserDataDir)
	Mkdir(config.UserDataDir)

	app.config = &config
}
