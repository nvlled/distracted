package main

import (
	"fmt"
	"os"
	"path/filepath"
)

func (self *App) GetConfig() Config {
	return *self.config
}

func (app *App) LoadConfig() {
	var config = Config{
		StartDecksDir:  "starting-decks",
		BaseUrlDecks:   "decks",
		DailyStudyName: DefaultStudyName,
		MaxLearnLevel:  MaxLearnLevel,
		CurrentDate:    app.CurrentDate(),
		LastReviewDate: 0,
		StudySessionTypes: StudySessionTypes{
			Normal: StudySessionTypeNormal,
			Quiz:   StudySessionTypeQuiz,
		},

		UserDataDir:     "",
		DecksDir:        "",
		DistractionsDir: "",
		DBFile:          "",
		AppName:         "blah",
	}

	userDataDir := "."
	if app.devMode {
		if dir, err := os.Getwd(); err != nil {
			panic(err)
		} else {
			userDataDir = dir
		}
	} else {
		if exePath, err := os.Executable(); err != nil {
			panic(err)
		} else {
			userDataDir = filepath.Dir(exePath)
		}
	}

	config.UserDataDir = filepath.Join(userDataDir, "data")

	config.DBFile = filepath.Join(config.UserDataDir, "data.sqlite3")
	config.DecksDir = filepath.Join(config.UserDataDir, "decks")
	config.DistractionsDir = filepath.Join(config.UserDataDir, "distractions")

	fmt.Printf("user data dir: %v\n", config.UserDataDir)
	//Mkdir(config.UserDataDir)

	app.config = &config
}
