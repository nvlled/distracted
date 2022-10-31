package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/gen2brain/beeep"
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

	startHidden bool

	scheduler CardScheduler

	distractions []DistractionFile

	fileWatcher *fsnotify.Watcher

	cardSearch *CardSearch

	notifierID  int
	notifierIDs map[int]*Notifier
}

func NewApp() *App {
	app := &App{}
	userData := NewUserData(app)
	app.server = app.createServer()
	app.userData = &userData
	app.scheduler = CardScheduler{}
	app.cardSearch = &CardSearch{
		searchers: make(map[string]*Searcher),
	}
	app.notifierID = 1
	app.notifierIDs = map[int]*Notifier{}
	app.LoadConfig()

	return app
}

func (self *App) startup(ctx context.Context) {
	self.ctx = ctx
	self.InitDB()
	self.userData.Load()
	self.config.LastReviewDate = self.LastReviewDate()

	if self.startHidden {
		runtime.Hide(ctx)
	}

	runtime.LogSetLogLevel(ctx, logger.INFO)
	runtime.WindowSetDarkTheme(self.ctx)

	if !self.IsDataDirInitialized() {
		self.InitDataDir()
	}

	if w, err := fsnotify.NewWatcher(); err != nil {
		self.Error(err)
	} else {
		self.fileWatcher = w
		go self.startFileWatcher()
	}

}

func (self *App) startNotifier(id int, seconds int) {
	notifier, ok := self.notifierIDs[id]
	if !ok || notifier == nil {
		return
	}

	for seconds > 0 {
		//self.Debugf("tick %v", seconds)
		time.Sleep(1 * time.Second)
		seconds--
		if notifier.stopped {
			return
		}
	}

	for !notifier.stopped {
		beeep.Notify("**** 12i3j123 yo", "yo it's study time again, get back here", "icon.png")
		time.Sleep(10 * time.Second)
	}
	delete(self.notifierIDs, id)
}

func (self *App) Notify(title, message string) {
	beeep.Notify(title, message, "icon.png")
}

func (self *App) StartBreakTime(seconds int) int {
	id := self.notifierID
	self.notifierID++

	self.notifierIDs[id] = &Notifier{false}
	go self.startNotifier(id, seconds)

	return id
}

func (self *App) StopBreakTime(timerID int) {
	notifier, ok := self.notifierIDs[timerID]
	if ok && notifier != nil {
		notifier.stopped = true
	}
}
func (self *App) ClearBreakTimeNotifiers() {
	ns := self.notifierIDs
	self.notifierIDs = map[int]*Notifier{}
	for _, n := range ns {
		n.stopped = true
	}
}

func (self *App) GetLastUsedCollection() string {
	return self.dbAPI.GetDataString(UserDataKeys.LastUsedCollection)
}
func (self *App) SetLastUsedCollection(collectionName string) {
	self.dbAPI.SetData(UserDataKeys.LastUsedCollection, collectionName)
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
	self.dbAPI.SetData(UserDataKeys.DataDirInitialized, "1")
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

	return deckName, nil
}

type DistractionFile struct {
	Filename string `json:"filename"`
	ModTime  int64  `json:"modTime"`
}

type Distraction struct {
	Filename string `json:"filename"`
	UrlPath  string `json:"urlPath"`
	MetaData string `json:"metaData"`
}

// returns yyyymmdd
func (self *App) CurrentDate() int64 {
	t := time.Unix(time.Now().Unix(), 0)
	var y int64 = (int64)(t.Year())
	var m int64 = (int64)(t.Month())
	var d int64 = (int64)(t.Day())
	return d + m*100 + y*10000
}

func (self *App) StudyCard(sessionName string, cardpath string, recalled bool, seconds int) (*CardData, error) {
	date := self.CurrentDate()

	card, err := self.GetCardFromSession(cardpath, sessionName)
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

	if err = self.PersistCardStats(card); err != nil {
		return nil, err
	}

	query := "" +
		"UPDATE `study_sessions` SET " +
		"`studyDuration`        = `studyDuration` + $1 " +
		"WHERE `name` = $2 and `date` = $3"

	_, err = self.dbAPI.db.Exec(query, seconds, sessionName, date)
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
		Path:       path,
		Md5sum:     md5sum,
		LastUpdate: 0,
	}
	query := "" +
		"INSERT INTO `cards` (`path`, `md5sum`, `lastUpdate`) " +
		"VALUES (:path, :md5sum, :lastUpdate) "
	_, err := self.dbAPI.db.NamedExec(query, &row)

	return row, err
}

func (self *App) GetCard(path string) (*CardData, error) {
	return self.GetCardFromSession(path, DefaultStudyName)
}

func (self *App) GetCardFromSession(path string, session string) (*CardData, error) {
	if session == "" {
		session = DefaultStudyName
	}

	path = filepath.FromSlash(path)
	filename := filepath.Join(self.config.DecksDir, path)

	bytes, err := ioutil.ReadFile(filename)
	if err == os.ErrNotExist || err == os.ErrInvalid {
		return nil, errorList.ErrInvalidCardPath
	}

	var row CardRow

	err = self.dbAPI.db.Get(
		&row, "SELECT `ROWID` AS `id`, `md5sum`, `numRecall`, `numForget`, `consecRecall`, `consecForget`, `proficiency`, `lastUpdate`, `lastRecallDate`, `interval` "+
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
		ID:             row.ID,
		Filename:       filepath.Base(path),
		DeckName:       filepath.Dir(path),
		Path:           path,
		Contents:       string(bytes),
		Md5sum:         row.Md5sum,
		LastRecallDate: row.LastRecallDate,

		CardStats: CardStats{
			Interval:     row.Interval,
			Proficiency:  row.Proficiency,
			NumRecall:    row.NumRecall,
			NumForget:    row.NumForget,
			ConsecRecall: row.ConsecRecall,
			ConsecForget: row.ConsecForget,
			LastUpdate:   row.LastUpdate,
		},
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

func (self *App) GetStudySessionsToday() ([]StudySession, error) {
	var rows []StudySession
	db := self.dbAPI.db
	err := db.Select(
		&rows,
		"SELECT `name`, `date`, `startTime`, `studyDuration`, `type`, "+
			"(SELECT COUNT(1) FROM `study_session_cards` `ssc` WHERE `ssc`.`sessionID` = `ss`.ROWID) AS `cardCount` "+
			"FROM `study_sessions` `ss` "+
			"ORDER BY `startTime` DESC")

	if err != nil {
		return nil, self.Error(err)
	}
	if rows == nil {
		rows = []StudySession{}
	}

	return rows, nil
}

func (self *App) GetDailyStudySession() (*StudySession, error) {
	db := self.dbAPI.db
	currentDate := self.CurrentDate()
	var row StudySession

	err := db.Get(
		&row,
		"SELECT `name`, `date`, `startTime`, `studyDuration`, `type`, "+
			"(SELECT COUNT(1) FROM `study_session_cards` `ssc` WHERE `ssc`.`sessionID` = `ss`.ROWID) AS `cardCount` "+
			"FROM `study_sessions` `ss` WHERE `name` = $1 AND `date` = $2",
		DefaultStudyName,
		currentDate)

	if err != nil && err != sql.ErrNoRows {
		return nil, self.Error(err)
	}

	if err == sql.ErrNoRows {
		row = StudySession{
			Name:          DefaultStudyName,
			Date:          currentDate,
			CardCount:     0,
			StudyDuration: 0,
			StartTime:     time.Now().Unix(),
			Type:          StudySessionTypeNormal,
		}

		_, err = db.Exec(
			"INSERT INTO `study_sessions` (`name`, `date`, `startTime`, `type`) VALUES ($1, $2, $3, $4)",
			row.Name,
			row.Date,
			row.StartTime,
			row.Type,
		)
	}

	if err != nil {
		return nil, self.Error(err)
	}

	return &row, nil
}

func (self *App) GetDailyStudyCards() ([]CardData, error) {
	return self.GetStudySessionCardsToday(DefaultStudyName)
}
func (self *App) GetDailyStudyCardIds() ([]int64, error) {
	return self.GetStudySessionCardIDsToday(DefaultStudyName)
}

func (self *App) GetStudySessionCardsToday(sessionName string) ([]CardData, error) {
	date := self.CurrentDate()
	db := self.dbAPI.db

	query := "SELECT `c`.`ROWID` AS `id`, `c`.`path`, `ssc`.`order`, " +
		"`c`.`numRecall`, `c`.`numForget`, `c`.`consecRecall`, `c`.`consecForget`, `c`.`lastUpdate`, `c`.`proficiency`, `c`.`lastRecallDate`, `c`.`interval` " +
		"FROM `study_session_cards` `ssc` JOIN `cards` `c` ON `ssc`.`cardID` = `c`.`ROWID` JOIN `study_sessions` `sc` ON `sc`.`ROWID` = `ssc`.`sessionID` " +
		"WHERE `sc`.`name` = $1 AND `sc`.`date` = $2 ORDER BY `ssc`.`order`, `c`.`ROWID` ASC"

	type Row struct {
		ID   int64  `db:"id"`
		Path string `db:"path"`

		Order          int   `db:"order"`
		Interval       int   `db:"interval"`
		Proficiency    int   `db:"proficiency"`
		NumRecall      int   `db:"numRecall"`
		NumForget      int   `db:"numForget"`
		ConsecRecall   int   `db:"consecRecall"`
		ConsecForget   int   `db:"consecForget"`
		LastUpdate     int64 `db:"lastUpdate"`
		LastRecallDate int64 `db:"lastRecallDate"`
	}
	var rows []Row
	err := db.Select(&rows, query, sessionName, date)

	if err != nil {
		return nil, self.Error(err)
	}

	result := []CardData{}
	for _, row := range rows {
		path := filepath.FromSlash(row.Path)
		filename := filepath.Join(self.config.DecksDir, path)
		bytes, err := ioutil.ReadFile(filename)
		if err == os.ErrNotExist || err == os.ErrInvalid {
			return nil, errorList.ErrInvalidCardPath
		}
		card := CardData{
			Filename:       filepath.Base(row.Path),
			DeckName:       filepath.Dir(row.Path),
			Contents:       string(bytes),
			Path:           row.Path,
			ID:             row.ID,
			Order:          row.Order,
			LastRecallDate: row.LastRecallDate,

			CardStats: CardStats{
				Interval:     row.Interval,
				Proficiency:  row.Proficiency,
				NumRecall:    row.NumRecall,
				NumForget:    row.NumForget,
				ConsecRecall: row.ConsecRecall,
				ConsecForget: row.ConsecForget,
				LastUpdate:   row.LastUpdate,
			},
		}

		result = append(result, card)
	}

	return result, nil

}

func (self *App) GetStudySessionCardIDsToday(sessionName string) ([]int64, error) {
	date := self.CurrentDate()
	db := self.dbAPI.db

	query := "SELECT `c`.`ROWID` AS `id` " +
		"FROM `study_session_cards` `ssc` JOIN `cards` `c` ON `ssc`.`cardID` = `c`.`ROWID` JOIN `study_sessions` `sc` ON `sc`.`ROWID` = `ssc`.`sessionID` " +
		"WHERE `sc`.`name` = $1 AND `sc`.`date` = $2 ORDER BY `ssc`.`order`, `c`.`ROWID` ASC"

	type Row struct {
		ID int64 `db:"id"`
	}
	var rows []Row
	err := db.Select(&rows, query, sessionName, date)

	if err != nil {
		return nil, self.Error(err)
	}

	result := []int64{}
	for _, row := range rows {
		result = append(result, row.ID)
	}

	return result, nil

}

func (self *App) GetDecks() ([]string, error) {
	decksPath := self.config.DecksDir
	if !DirectoryExists(self.ctx, decksPath) {
		return []string{}, nil
	}
	entries := lo.Must(os.ReadDir(decksPath))

	var decks []string
	for _, file := range entries {
		if file.IsDir() {
			decks = append(decks, file.Name())
		}
	}

	return decks, nil
}

func (self *App) CreateStudySession(sessionName string, sessionType int, cardpaths []string) error {
	date := self.CurrentDate()
	//if len(cardpaths) == 0 {
	//	return nil
	//}

	db := self.dbAPI.db

	tx, err := db.Beginx()
	if err != nil {
		return self.Error(err)
	}
	defer tx.Commit()

	var currentID int64 = -1
	if err := tx.Get(&currentID, "SELECT `ROWID` FROM `study_sessions` WHERE `name` = $1 AND `date` = $2", sessionName, date); err != nil && err != sql.ErrNoRows {
		return self.Error(err)
	} else if err == nil && sessionName != DefaultStudyName {
		fmt.Printf("huh: %v, %v\n", sessionName, DefaultStudyName)
		return self.Error(errorList.ErrSessionNameAlreadyUsed)
	}
	alreadyExists := currentID >= 0

	sessionID := currentID
	if !alreadyExists {
		res, err := tx.Exec(
			"INSERT INTO `study_sessions` (`name`, `date`, `startTime`, `type`) VALUES ($1, $2, $3, $4)",
			sessionName,
			date,
			time.Now().Unix(),
			sessionType,
		)
		if err != nil {
			return self.Error(err)
		}
		if id, err := res.LastInsertId(); err != nil {
			return self.Error(err)
		} else {
			sessionID = id
		}
	} else {
		_, err := tx.Exec("DELETE FROM `study_session_cards` WHERE `sessionID` = $1", sessionID)
		if err != nil {
			return self.Error(err)
		}
	}

	stmt, err := tx.Prepare(
		"INSERT INTO `study_session_cards` (`sessionID`, `cardID`, `order`) SELECT " +
			"(SELECT `ss`.`ROWID` FROM `study_sessions` `ss` WHERE `ss`.`ROWID` = $1), " +
			"(SELECT `c`.`ROWID` FROM `cards` `c` WHERE `c`.`path` = $2), " +
			"$3")
	if err != nil {
		return self.Error(err)
	}

	for i, c := range cardpaths {
		_, err = stmt.Exec(sessionID, c, i+1)
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

func (self *App) enumerateCards(deck string, returnError *error) chan *CardData {
	ch := make(chan *CardData)

	go func() {
		filenames, err := self.ListCards(deck)

		self.Error(err)

		if err == nil {
			for _, file := range filenames {
				card, err := self.GetCard(file.Path)
				if err != nil {
					break
				} else {
					ch <- card
				}
			}
		}

		if err != nil && returnError != nil {
			*returnError = err
		}

		close(ch)
	}()

	return ch
}

func (self *App) FindInvalidCardPaths(cardpaths []string) []string {
	nonExist := []string{}
	for _, path := range cardpaths {
		path = filepath.FromSlash(path)
		filename := filepath.Join(self.config.DecksDir, path)
		if !RegularFileExists(self.ctx, filename) {
			nonExist = append(nonExist, path)
		}
	}
	return nonExist
}

func (self *App) ManualExportType() *CardStats {
	// FIX: this is just a workaround since I don't
	// know how to bind types without using them in a method
	return nil
}

func (self *App) DistractionModeOff() {
	runtime.WindowSetAlwaysOnTop(self.ctx, false)
	runtime.WindowMaximise(self.ctx)
	runtime.WindowCenter(self.ctx)
	runtime.WindowFullscreen(self.ctx)
	time.Sleep(1500 * time.Millisecond)
	runtime.WindowHide(self.ctx)
	time.Sleep(1500 * time.Millisecond)
	runtime.WindowShow(self.ctx)
}

func (self *App) DistractionModeOn() {
	w := 300
	h := 80
	runtime.WindowSetAlwaysOnTop(self.ctx, true)
	runtime.WindowUnfullscreen(self.ctx)
	runtime.WindowUnmaximise(self.ctx)
	runtime.WindowSetSize(self.ctx, w, h)
	runtime.WindowSetMaxSize(self.ctx, w, h)
	//for _, s := range lo.Must(runtime.ScreenGetAll(self.ctx)) {
	//	if s.IsPrimary && s.IsCurrent {
	//		runtime.WindowSetPosition(self.ctx, 1, s.Height-h)
	//		break
	//	}
	//}
}

func (self *App) PersistCardStats(card *CardData) error {
	cardsRow := struct {
		ID   int64  `db:"id"`
		Path string `db:"path"`

		Interval       int   `db:"interval"`
		Proficiency    int   `db:"proficiency"`
		NumRecall      int   `db:"numRecall"`
		NumForget      int   `db:"numForget"`
		ConsecRecall   int   `db:"consecRecall"`
		ConsecForget   int   `db:"consecForget"`
		LastUpdate     int64 `db:"lastUpdate"`
		LastRecallDate int64 `db:"lastRecallDate"`
	}{
		ID:   card.ID,
		Path: card.Path,

		Interval:       card.Interval,
		Proficiency:    card.Proficiency,
		NumRecall:      card.NumRecall,
		NumForget:      card.NumForget,
		ConsecRecall:   card.ConsecRecall,
		ConsecForget:   card.ConsecForget,
		LastUpdate:     card.LastUpdate,
		LastRecallDate: card.LastRecallDate,
	}

	query := "" +
		"UPDATE `cards` SET " +
		"`interval`     = :interval, " +
		"`proficiency`  = :proficiency, " +
		"`numRecall`    = :numRecall, " +
		"`numForget`    = :numForget, " +
		"`consecRecall` = :consecRecall, " +
		"`consecForget` = :consecForget, " +
		"`lastUpdate`   = :lastUpdate, " +
		"`lastRecallDate`   = :lastRecallDate " +
		"WHERE `path` = :path"

	_, err := self.dbAPI.db.NamedExec(query, &cardsRow)
	if err != nil {
		self.Error(err)
		return errorList.ErrIOError
	}

	date := self.CurrentDate()
	self.dbAPI.SetData(UserDataKeys.LastReviewDate, date)

	return nil
}

func (self *App) GetReviewingCards(deckName string, count int) []*CardData {
	empty := []*CardData{}
	decks, err := self.GetDecks()
	if err != nil {
		self.Error(err)
		return empty
	}

	var result []*CardData
	for _, deck := range decks {
		if deckName != "" && deckName != deck {
			continue
		}

		for card := range self.enumerateCards(deck, &err) {
			if card.NumRecall+card.NumForget > 0 && card.LastUpdate > 0 {
				result = append(result, card)
			}
			if count > 0 && len(result) >= count {
				break
			}
		}
	}

	return result
}

func (self *App) ListAllCards() ([]*CardData, error) {
	decks, err := self.GetDecks()
	if err != nil {
		return nil, self.Error(err)
	}
	var result []*CardData
	for _, deck := range decks {
		for card := range self.enumerateCards(deck, &err) {
			result = append(result, card)
		}
		if err != nil {
			return nil, self.Error(err)

		}
	}
	return result, nil
}

func (self *App) LastReviewDate() int64 {
	return int64(self.dbAPI.GetDataInt(UserDataKeys.LastReviewDate))
}

func (self *App) PreviousSessionCardIDs() ([]int64, error) {
	currentDate := self.CurrentDate()
	db := self.dbAPI.db

	lastSessionDate := 0
	err := db.Get(&lastSessionDate, "SELECT MAX(`ss`.`date`) FROM `study_session_cards` `ssc` INNER JOIN `study_sessions` `ss` ON `ss`.`ROWID` = `ssc`.`sessionID` WHERE `ss`.`date` < $1", currentDate)
	if err != nil {
		return nil, self.Error(err)
	}
	var rows []int64
	err = db.Select(&rows, "SELECT `ssc`.`cardID` FROM `study_session_cards` `ssc` INNER JOIN `study_sessions` `ss` ON `ss`.`ROWID` = `ssc`.`sessionID` WHERE `ss`.`date` = $1 OR `ss`.`date` = $1-1", lastSessionDate)
	if err != nil {
		return nil, self.Error(err)
	}
	return rows, nil
}
