package main

import (
	"errors"
)

const (
	DistractionUnknown = "unknown"
	DistractionReddit  = "reddit"
	DistractionYoutube = "youtube"
)

type Config struct {
	StartDecksDir         string
	SampleDistractionsDir string
	UserDataDir           string
	DecksDir              string
	DistractionsDir       string

	//UserDataFile       string
	UserInterestsFile  string
	UserSubredditsFile string

	DBFile string

	AppName string `json:"appName"`

	BaseUrlDecks string `json:"baseUrlDecks"`
}

type CardRow struct {
	Path         string `db:"path"`
	Md5sum       string `db:"md5sum"`
	NumRecall    int    `db:"numRecall"`
	NumForget    int    `db:"numForget"`
	ConsecRecall int    `db:"consecRecall"`
	ConsecForget int    `db:"consecForget"`
	Interval     int64  `db:"interval"`
	LastUpdate   int64  `db:"lastUpdate"`
}

type CardData struct {
	DeckName string `json:"deckName"`
	Filename string `json:"filename"`
	Path     string `json:"path"` // $deckID/$filename
	Contents string `json:"contents"`
	Md5sum   string `json:"-"`

	NumRecall    int   `json:"numRecall"`
	NumForget    int   `json:"numForget"`
	ConsecRecall int   `json:"consecRecall"`
	ConsecForget int   `json:"consecForget"`
	Interval     int64 `json:"interval"`
	LastUpdate   int64 `json:"lastUpdate"`
}

type CardFile struct {
	DeckName string `json:"deckName"`
	Filename string `json:"filename"`
	Path     string `json:"path"`
}

type ErrorList struct {
	ErrInvalidDeckPath        error `json:"errInvalidDeckPath"`
	ErrDeckAlreadyAdded       error `json:"errDeckAlreadyAdded "`
	ErrIOError                error `json:"ErrIOError "`
	ErrCreateDeckPathNotEmpty error `json:"errCreateDeckPathNotEmpty"`
	ErrInvalidStartingDeck    error `json:"errInvalidStartingDeck "`
	ErrRedditRateLimit        error `json:"errRedditRateLimit "`
	ErrInvalidCardPath        error `json:"errInvalidCardPath"`
}

var errorList = ErrorList{
	ErrInvalidDeckPath:        errors.New("invalid deck path"),
	ErrDeckAlreadyAdded:       errors.New("deck already added"),
	ErrIOError:                errors.New("something went wrong while dealing with files"),
	ErrCreateDeckPathNotEmpty: errors.New("deck folder must be empty"),
	ErrInvalidStartingDeck:    errors.New("unknown starting deck name"),
	ErrRedditRateLimit:        errors.New("too many reddit requests"),
	ErrInvalidCardPath:        errors.New("invalid card path"),
}

func (self *ErrorList) Get() *ErrorList {
	return self
}

//type Deck string

/*
type Deck struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	FullPath string `json:"fullpath"`
}
*/
