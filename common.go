package main

import (
	"errors"
)

const DefaultStudyName = "daily-study"

const (
	DistractionFileMaxCount = 2000
)

const (
	StudySessionTypeNormal = 0
	StudySessionTypeQuiz   = 1
	StudySessionTypeManual = 2
)

const (
	DistractionUnknown = "unknown"
	DistractionReddit  = "reddit"
	DistractionYoutube = "youtube"
)

type StudySessionTypes struct {
	Normal int `json:"normal"`
	Quiz   int `json:"quiz"`
}

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

	StudySessionTypes StudySessionTypes `json:"studySessionTypes"`

	DailyStudyName string `json:"defaultStudyName"`

	MaxLearnLevel int `json:"maxLearnLevel"`

	CurrentDate int64 `json:"currentDate"`
}

type CardRow struct {
	ID     int64  `db:"id"`
	Path   string `db:"path"`
	Md5sum string `db:"md5sum"`

	Interval       int   `db:"interval"`
	Proficiency    int   `db:"proficiency"`
	NumRecall      int   `db:"numRecall"`
	NumForget      int   `db:"numForget"`
	ConsecRecall   int   `db:"consecRecall"`
	ConsecForget   int   `db:"consecForget"`
	LastUpdate     int64 `db:"lastUpdate"`
	LastRecallDate int64 `db:"lastRecallDate"`
}

type CardStats struct {
	Interval     int   `json:"interval"`
	Proficiency  int   `json:"proficiency"`
	NumRecall    int   `json:"numRecall"`
	NumForget    int   `json:"numForget"`
	ConsecRecall int   `json:"consecRecall"`
	ConsecForget int   `json:"consecForget"`
	LastUpdate   int64 `json:"lastUpdate"`
}

type CardData struct {
	CardStats

	ID       int64  `json:"id"`
	DeckName string `json:"deckName"`
	Filename string `json:"filename"`
	Path     string `json:"path"` // $deckID/$filename
	Contents string `json:"contents"`
	Md5sum   string `json:"-"`

	Order          int   `json:"order"`
	LastRecallDate int64 `json:"lastRecallDate"`
}

type CardFile struct {
	DeckName string `json:"deckName"`
	Filename string `json:"filename"`
	Path     string `json:"path"`
}

type StudySession struct {
	Name          string `db:"name" json:"name"`
	Date          int64  `db:"date" json:"date"`
	StartTime     int64  `db:"startTime" json:"startTime"`
	CardCount     int    `db:"cardCount" json:"cardCount"`
	StudyDuration int    `db:"studyDuration" json:"studyDuration"`
	Type          int    `db:"type" json:"type"`
}

type ErrorList struct {
	ErrInvalidDeckPath        error `json:"errInvalidDeckPath"`
	ErrDeckAlreadyAdded       error `json:"errDeckAlreadyAdded "`
	ErrIOError                error `json:"ErrIOError "`
	ErrCreateDeckPathNotEmpty error `json:"errCreateDeckPathNotEmpty"`
	ErrInvalidStartingDeck    error `json:"errInvalidStartingDeck "`
	ErrRedditRateLimit        error `json:"errRedditRateLimit "`
	ErrInvalidCardPath        error `json:"errInvalidCardPath"`
	ErrSessionNameAlreadyUsed error `json:"errSessionNameAlreadyUsed"`
}

var errorList = ErrorList{
	ErrInvalidDeckPath:        errors.New("invalid deck path"),
	ErrDeckAlreadyAdded:       errors.New("deck already added"),
	ErrIOError:                errors.New("something went wrong while dealing with files"),
	ErrCreateDeckPathNotEmpty: errors.New("deck folder must be empty"),
	ErrInvalidStartingDeck:    errors.New("unknown starting deck name"),
	ErrRedditRateLimit:        errors.New("too many reddit requests"),
	ErrInvalidCardPath:        errors.New("invalid card path"),
	ErrSessionNameAlreadyUsed: errors.New("session name is already used"),
}

func (self *ErrorList) Get() *ErrorList {
	return self
}

type Notifier struct {
	stopped bool
}
