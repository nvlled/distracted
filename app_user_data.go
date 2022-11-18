package main

import (
	"os"
)

// TODO: remove everything here
type UserData struct {
	app *App

	IntroCompleted bool `json:"introCompleted"`

	TextEditor string `json:"textEditor"`

	Decks []string `json:"decks"`
}

func (self *App) GetUserData() UserData {
	return *self.userData
}

func NewUserData(app *App) UserData {
	return UserData{
		app: app,
	}
}
func (data *UserData) Save() {
}
func (data *UserData) Load() {
	decks, err := data.getDecks()
	if err != nil {
		data.app.Error(err)
	} else {
		data.app.Debugf("loaded user decks: %v", decks)
		data.Decks = decks
	}

	data.IntroCompleted = data.app.dbAPI.GetDataBool(UserDataKeys.IntroCompleted)
	data.TextEditor = data.app.dbAPI.GetDataString(UserDataKeys.TextEditor)
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
