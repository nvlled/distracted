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

	"github.com/gen2brain/beeep"
	"github.com/huandu/go-sqlbuilder"
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
	devMode  bool

	scheduler CardScheduler

	distractions []DistractionFile

	cardWatcher *CardWatcher

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

	return app
}

func (app *App) startup(ctx context.Context) {
	if app.devMode {
		runtime.Hide(ctx)
	}

	app.LoadConfig()
	app.ctx = ctx
	app.InitDB()
	app.userData.Load()
	app.config.LastReviewDate = app.LastReviewDate()

	runtime.LogSetLogLevel(ctx, logger.DEBUG)
	runtime.WindowSetDarkTheme(app.ctx)

	if !app.IsDataDirInitialized() {
		app.InitDataDir()
	}

	app.initCardWatcher()

}

func (app *App) startNotifier(id int, seconds float64) {
	notifier, ok := app.notifierIDs[id]
	if !ok || notifier == nil {
		return
	}

	for seconds > 0 {
		time.Sleep(1 * time.Second)
		seconds--
		fmt.Printf(">%v", seconds)
		if notifier.stopped {
			return
		}
	}

	for !notifier.stopped {
		beeep.Notify("hello", "time to study again", "icon.png")
		time.Sleep(10 * time.Second)
	}
	delete(app.notifierIDs, id)
}

func (app *App) Notify(title, message string) {
	beeep.Notify(title, message, "icon.png")
}

func (app *App) StartBreakTime(seconds float64) int {
	id := app.notifierID
	app.notifierID++

	app.notifierIDs[id] = &Notifier{false}
	go app.startNotifier(id, seconds)

	return id
}

func (app *App) StopBreakTime(timerID int) {
	notifier, ok := app.notifierIDs[timerID]
	if ok && notifier != nil {
		notifier.stopped = true
	}
}
func (app *App) ClearBreakTimeNotifiers() {
	ns := app.notifierIDs
	app.notifierIDs = map[int]*Notifier{}
	for _, n := range ns {
		n.stopped = true
	}
}

func (app *App) GetLastUsedCollection() string {
	return app.dbAPI.GetDataString(UserDataKeys.LastUsedCollection)
}
func (app *App) SetLastUsedCollection(collectionName string) {
	app.dbAPI.SetData(UserDataKeys.LastUsedCollection, collectionName)
}

func (app *App) IsDataDirInitialized() bool {
	if !DirectoryExists(app.ctx, app.config.UserDataDir) {
		return false
	}

	return app.dbAPI.GetDataBool(UserDataKeys.DataDirInitialized)
}

func (app *App) InitDataDir() {
	config := app.config
	Mkdir(config.DecksDir)
	Mkdir(config.DistractionsDir)
	app.dbAPI.SetData(UserDataKeys.DataDirInitialized, "1")
}

func (app *App) GetStartingDecks() ([]string, error) {
	entries, err := os.ReadDir(app.config.StartDecksDir)
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

func (app *App) CompleteIntro() {
	app.userData.IntroCompleted = true
	app.dbAPI.SetData(UserDataKeys.IntroCompleted, true)
}

func (app *App) CreateStartingDeck(deckName string, overwrite bool) (string, error) {
	ctx := app.ctx
	config := app.config
	destPath := filepath.Join(app.config.DecksDir, deckName)

	if yes, err := IsEmptyDirectory(destPath); err != nil {
		return "", err
	} else if !yes && !overwrite {
		return "", errorList.ErrCreateDeckPathNotEmpty
	}

	srcPath := filepath.Join(config.StartDecksDir, deckName)
	runtime.LogDebugf(app.ctx, "starting deck path: %v", srcPath)
	if !DirectoryExists(app.ctx, srcPath) {
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
		app.Error(err)
		return "", errorList.ErrSysError
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
func (app *App) CurrentDate() int64 {
	t := time.Unix(time.Now().Unix(), 0)
	var y int64 = (int64)(t.Year())
	var m int64 = (int64)(t.Month())
	var d int64 = (int64)(t.Day())
	return d + m*100 + y*10000
}

func (app *App) StudyCard(sessionName string, cardpath string, recalled bool, seconds int) (*CardData, error) {
	date := app.CurrentDate()

	card, err := app.GetCard(cardpath)
	if err != nil {
		return nil, err
	}

	var updatedCard CardData
	if recalled {
		updatedCard = app.scheduler.Recalled(*card)
	} else {
		updatedCard = app.scheduler.Forgot(*card)
	}

	card = &updatedCard

	if err = app.PersistCardStats(card); err != nil {
		return nil, err
	}

	query := "" +
		"UPDATE `study_sessions` SET " +
		"`studyDuration`        = `studyDuration` + $1 " +
		"WHERE `name` = $2 and `date` = $3"

	_, err = app.dbAPI.db.Exec(query, seconds, sessionName, date)
	if err != nil {
		app.Error(err)
		return nil, errorList.ErrSysError
	}

	return card, nil
}

func (app *App) CreateCardDBEntry(path string) (CardRow, error) {
	filename := filepath.Join(app.config.DecksDir, path)
	md5sum, _ := GetFileMd5Sum(filename)
	row := CardRow{
		Path:       path,
		Md5sum:     md5sum,
		LastUpdate: 0,
	}
	query := "" +
		"INSERT INTO `cards` (`path`, `md5sum`, `lastUpdate`) " +
		"VALUES (:path, :md5sum, :lastUpdate) "
	_, err := app.dbAPI.db.NamedExec(query, &row)

	return row, err
}

func (app *App) GetCard(path string) (*CardData, error) {
	path = filepath.FromSlash(path)
	filename := filepath.Join(app.config.DecksDir, path)

	bytes, err := ioutil.ReadFile(filename)
	if err == os.ErrNotExist || err == os.ErrInvalid {
		return nil, errorList.ErrInvalidCardPath
	}

	var row CardRow

	err = app.dbAPI.db.Get(
		&row, "SELECT `ROWID` AS `id`, `md5sum`, `numRecall`, `numForget`, `consecRecall`, `consecForget`, `proficiency`, `lastUpdate`, `lastRecallDate`, `interval`, `counter` "+
			"FROM `cards` WHERE `path` = ?", path,
	)
	if err != nil && err != sql.ErrNoRows {
		app.Errorf("failed to query card: %v", err.Error())
		return nil, errorList.ErrSysError
	}

	if err == sql.ErrNoRows {
		row = CardRow{
			Path:       path,
			LastUpdate: 0,
		}
	}

	if row.Md5sum == "" {
		row.Md5sum, _ = GetMd5Sum(bytes)
	}

	date := app.CurrentDate()
	interval := row.Interval
	counter := row.Counter
	if row.LastRecallDate != date {
		interval = 0
		counter = 0
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
			Interval:     interval,
			Proficiency:  row.Proficiency,
			NumRecall:    row.NumRecall,
			NumForget:    row.NumForget,
			ConsecRecall: row.ConsecRecall,
			ConsecForget: row.ConsecForget,
			LastUpdate:   row.LastUpdate,
			Counter:      counter,
		},
	}

	return &card, nil
}

func (app *App) SetTextEditor(textEditor string) error {
	app.dbAPI.SetData(UserDataKeys.TextEditor, textEditor)
	app.userData.TextEditor = textEditor
	return nil
}

func (app *App) OpenCardFile(cardpath string) error {
	cardpath = filepath.FromSlash(cardpath)
	filename := filepath.Join(app.config.DecksDir, cardpath)

	textEditor := app.dbAPI.GetDataString(UserDataKeys.TextEditor)
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
			app.dbAPI.SetData(UserDataKeys.TextEditor, textEditor)
			return nil
		}
	}

	return err
}

func (app *App) GetStudySessionsToday() ([]StudySession, error) {
	var rows []StudySession
	db := app.dbAPI.db
	err := db.Select(
		&rows,
		"SELECT `name`, `date`, `startTime`, `studyDuration`, `type`, "+
			"(SELECT COUNT(1) FROM `study_session_cards` `ssc` WHERE `ssc`.`sessionID` = `ss`.ROWID) AS `cardCount` "+
			"FROM `study_sessions` `ss` "+
			"ORDER BY `startTime` DESC")

	if err != nil {
		return nil, app.Error(err)
	}
	if rows == nil {
		rows = []StudySession{}
	}

	return rows, nil
}

func (app *App) GetDailyStudySession() (*StudySession, error) {
	db := app.dbAPI.db
	currentDate := app.CurrentDate()
	var row StudySession

	err := db.Get(
		&row,
		"SELECT `name`, `date`, `startTime`, `studyDuration`, `type`, "+
			"(SELECT COUNT(1) FROM `study_session_cards` `ssc` WHERE `ssc`.`sessionID` = `ss`.ROWID) AS `cardCount` "+
			"FROM `study_sessions` `ss` WHERE `name` = $1 AND `date` = $2",
		DefaultStudyName,
		currentDate)

	if err != nil && err != sql.ErrNoRows {
		return nil, app.Error(err)
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
		return nil, app.Error(err)
	}

	return &row, nil
}

func (app *App) GetDailyStudyCards() ([]CardData, error) {
	return app.GetStudySessionCardsToday(DefaultStudyName)
}
func (app *App) GetDailyStudyCardIds() ([]int64, error) {
	return app.GetStudySessionCardIDsToday(DefaultStudyName)
}

func (app *App) GetStudySessionCardsToday(sessionName string) ([]CardData, error) {
	date := app.CurrentDate()
	db := app.dbAPI.db

	b := sqlbuilder.NewSelectBuilder()
	b.Select(b.As("c.ROWID", "id"), "c.path", "ssc.order")
	b.Select("c.numRecall", "c.numForget", "c.consecRecall", "c.consecForget")
	b.Select("c.lastUpdate", "c.proficiency", "c.lastRecallDate", "c.interval", "c.counter")
	b.From(b.As("study_session_cards", "ssc")).
		Join("cards c", "ssc.cardID = c.ROWID").
		Join("study_sessions sc", "sc.ROWID = ssc.sessionID").
		Where(b.Equal("sc.name", sessionName), b.Equal("sc.date", date)).
		OrderBy("ssc.order", "c.ROWID").Asc()

	type Row struct {
		ID   int64  `db:"id"`
		Path string `db:"path"`

		Order          int     `db:"order"`
		Interval       float32 `db:"interval"`
		Proficiency    int     `db:"proficiency"`
		NumRecall      int     `db:"numRecall"`
		NumForget      int     `db:"numForget"`
		ConsecRecall   int     `db:"consecRecall"`
		ConsecForget   int     `db:"consecForget"`
		LastUpdate     int64   `db:"lastUpdate"`
		LastRecallDate int64   `db:"lastRecallDate"`
		Counter        int64   `db:"counter"`
	}

	query, args := b.Build()
	var rows []Row
	err := db.Select(&rows, query, args...)

	if err != nil {
		return nil, app.Error(err)
	}

	result := []CardData{}
	for _, row := range rows {
		path := filepath.FromSlash(row.Path)
		filename := filepath.Join(app.config.DecksDir, path)
		bytes, err := ioutil.ReadFile(filename)
		if err == os.ErrNotExist || err == os.ErrInvalid {
			return nil, errorList.ErrInvalidCardPath
		}

		// reset interval on the next study date
		interval := row.Interval
		counter := row.Counter
		if row.LastRecallDate != date {
			interval = 0
			counter = 0
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
				Interval:     interval,
				Proficiency:  row.Proficiency,
				NumRecall:    row.NumRecall,
				NumForget:    row.NumForget,
				ConsecRecall: row.ConsecRecall,
				ConsecForget: row.ConsecForget,
				LastUpdate:   row.LastUpdate,
				Counter:      counter,
			},
		}

		result = append(result, card)
	}

	return result, nil

}

func (app *App) GetStudySessionCardIDsToday(sessionName string) ([]int64, error) {
	date := app.CurrentDate()
	db := app.dbAPI.db

	query := "SELECT `c`.`ROWID` AS `id` " +
		"FROM `study_session_cards` `ssc` JOIN `cards` `c` ON `ssc`.`cardID` = `c`.`ROWID` JOIN `study_sessions` `sc` ON `sc`.`ROWID` = `ssc`.`sessionID` " +
		"WHERE `sc`.`name` = $1 AND `sc`.`date` = $2 ORDER BY `ssc`.`order`, `c`.`ROWID` ASC"

	type Row struct {
		ID int64 `db:"id"`
	}
	var rows []Row
	err := db.Select(&rows, query, sessionName, date)

	if err != nil {
		return nil, app.Error(err)
	}

	result := []int64{}
	for _, row := range rows {
		result = append(result, row.ID)
	}

	return result, nil

}

func (app *App) GetDecks() ([]string, error) {
	decksPath := app.config.DecksDir
	if !DirectoryExists(app.ctx, decksPath) {
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

func (app *App) CreateStudySession(sessionName string, sessionType int, cardpaths []string) error {
	date := app.CurrentDate()
	//if len(cardpaths) == 0 {
	//	return nil
	//}

	db := app.dbAPI.db

	tx, err := db.Beginx()
	if err != nil {
		return app.Error(err)
	}
	defer tx.Commit()

	var currentID int64 = -1
	if err := tx.Get(&currentID, "SELECT `ROWID` FROM `study_sessions` WHERE `name` = $1 AND `date` = $2", sessionName, date); err != nil && err != sql.ErrNoRows {
		return app.Error(err)
	} else if err == nil && sessionName != DefaultStudyName {
		fmt.Printf("huh: %v, %v\n", sessionName, DefaultStudyName)
		return app.Error(errorList.ErrSessionNameAlreadyUsed)
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
			return app.Error(err)
		}
		if id, err := res.LastInsertId(); err != nil {
			return app.Error(err)
		} else {
			sessionID = id
		}
	} else {
		_, err := tx.Exec("DELETE FROM `study_session_cards` WHERE `sessionID` = $1", sessionID)
		if err != nil {
			return app.Error(err)
		}
	}

	stmt, err := tx.Prepare(
		"INSERT INTO `study_session_cards` (`sessionID`, `cardID`, `order`) SELECT " +
			"(SELECT `ss`.`ROWID` FROM `study_sessions` `ss` WHERE `ss`.`ROWID` = $1), " +
			"(SELECT `c`.`ROWID` FROM `cards` `c` WHERE `c`.`path` = $2), " +
			"$3")
	if err != nil {
		return app.Error(err)
	}

	for i, c := range cardpaths {
		_, err = stmt.Exec(sessionID, c, i+1)
		if err != nil {
			return app.Error(err)
		}
	}

	return nil
}

func (app *App) GetNotes() (string, error) {
	notesPath := filepath.Join(app.config.UserDataDir, "notes.txt")
	bytes, err := ioutil.ReadFile(notesPath)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return "", app.Error(err)
	}
	return string(bytes), nil
}
func (app *App) SaveNotes(notes string) error {
	notesPath := filepath.Join(app.config.UserDataDir, "notes.txt")
	err := ioutil.WriteFile(notesPath, []byte(notes), 0644)
	return app.Error(err)
}

func (app *App) ListCards(deck string) ([]CardFile, error) {
	fullDeckPath := filepath.Join(app.config.DecksDir, string(deck))
	if !DirectoryExists(app.ctx, fullDeckPath) {
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
		fullCardPath := filepath.Join(fullDeckPath, file.Name())

		stat := lo.Must(os.Stat(fullCardPath))

		cards = append(cards, CardFile{
			Filename: filepath.Base(cardPath),
			DeckName: filepath.Dir(cardPath),
			Path:     cardPath,
			ModTime:  stat.ModTime().Unix(),
		})
	}

	return cards, nil
}

func (app *App) enumerateModifiedCards(lastCheck int64, returnError *error) chan *CardFile {
	ch := make(chan *CardFile)

	go func() {
		for _, deck := range lo.Must(app.GetDecks()) {
			filenames, err := app.ListCards(deck)

			if err == nil {
				for _, file := range filenames {
					if lastCheck >= file.ModTime {
						continue
					}
					if err != nil {
						break
					} else {
						ch <- &file
					}
				}
			}

			if err != nil && returnError != nil {
				*returnError = err
			}
		}

		close(ch)
	}()

	return ch
}

func (app *App) enumerateCards(deck string, returnError *error) chan *CardData {
	ch := make(chan *CardData)

	go func() {
		filenames, err := app.ListCards(deck)

		if err == nil {
			for _, file := range filenames {
				card, err := app.GetCard(file.Path)
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

func (app *App) FindInvalidCardPaths(cardpaths []string) []string {
	nonExist := []string{}
	for _, path := range cardpaths {
		path = filepath.FromSlash(path)
		filename := filepath.Join(app.config.DecksDir, path)
		if !RegularFileExists(app.ctx, filename) {
			nonExist = append(nonExist, path)
		}
	}
	return nonExist
}

func (app *App) ManualExportType() *CardStats {
	// FIX: this is just a workaround since I don't
	// know how to bind types without using them in a method
	return nil
}

func (app *App) DistractionModeOff() {
	runtime.WindowSetAlwaysOnTop(app.ctx, false)
	runtime.WindowMaximise(app.ctx)
	runtime.WindowCenter(app.ctx)
	runtime.WindowFullscreen(app.ctx)
	time.Sleep(1500 * time.Millisecond)
	runtime.WindowHide(app.ctx)
	time.Sleep(1500 * time.Millisecond)
	runtime.WindowShow(app.ctx)
}

func (app *App) DistractionModeOn() {
	w := 300
	h := 80
	runtime.WindowSetAlwaysOnTop(app.ctx, true)
	runtime.WindowUnfullscreen(app.ctx)
	runtime.WindowUnmaximise(app.ctx)
	runtime.WindowSetSize(app.ctx, w, h)
	runtime.WindowSetMaxSize(app.ctx, w, h)
	//for _, s := range lo.Must(runtime.ScreenGetAll(app.ctx)) {
	//	if s.IsPrimary && s.IsCurrent {
	//		runtime.WindowSetPosition(app.ctx, 1, s.Height-h)
	//		break
	//	}
	//}
}

func (app *App) PersistCardStats(card *CardData) error {
	if card.LastRecallDate == 0 {
		card.LastRecallDate = app.CurrentDate()
	}
	cardsRow := struct {
		ID   int64  `db:"id"`
		Path string `db:"path"`

		Interval       float32 `db:"interval"`
		Proficiency    int     `db:"proficiency"`
		NumRecall      int     `db:"numRecall"`
		NumForget      int     `db:"numForget"`
		ConsecRecall   int     `db:"consecRecall"`
		ConsecForget   int     `db:"consecForget"`
		LastUpdate     int64   `db:"lastUpdate"`
		LastRecallDate int64   `db:"lastRecallDate"`
		Counter        int64   `db:"counter"`
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
		Counter:        card.Counter,
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
		"`lastRecallDate`   = :lastRecallDate, " +
		"`counter`   = :counter " +
		"WHERE `path` = :path"

	_, err := app.dbAPI.db.NamedExec(query, &cardsRow)
	if err != nil {
		app.Error(err)
		return errorList.ErrSysError
	}

	date := app.CurrentDate()
	app.dbAPI.SetData(UserDataKeys.LastReviewDate, date)

	contents, err := ReplaceEmbeddedCardData(EmbeddedCardData{
		Version:   CurrentEmbeddedVersion,
		CardID:    card.ID,
		CardStats: card.CardStats,
	}, card.Contents)
	filename := filepath.Join(app.config.DecksDir, card.Path)
	ioutil.WriteFile(filename, []byte(contents), 0644)

	return nil
}

func (app *App) GetReviewingCards(deckName string, count int) []*CardData {
	empty := []*CardData{}
	decks, err := app.GetDecks()
	if err != nil {
		app.Error(err)
		return empty
	}

	var result []*CardData
	for _, deck := range decks {
		if deckName != "" && deckName != deck {
			continue
		}

		for card := range app.enumerateCards(deck, &err) {
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

func (app *App) ListAllCards() ([]*CardData, error) {
	decks, err := app.GetDecks()
	if err != nil {
		return nil, app.Error(err)
	}
	result := []*CardData{}
	debugf(app.ctx, "> GetDecks %+v", decks)
	for _, deck := range decks {
		for card := range app.enumerateCards(deck, &err) {
			result = append(result, card)
		}
		if err != nil {
			return nil, app.Error(err)

		}
	}
	debugf(app.ctx, "ListAllCards: %v", len(result))
	return result, nil
}

func (app *App) LastReviewDate() int64 {
	return int64(app.dbAPI.GetDataInt(UserDataKeys.LastReviewDate))
}

func (app *App) PreviousSessionCardIDs() ([]int64, error) {
	currentDate := app.CurrentDate()
	db := app.dbAPI.db

	lastSessionDate := 0
	err := db.Get(&lastSessionDate, "SELECT COALESCE(MAX(`ss`.`date`), 0) FROM `study_session_cards` `ssc` INNER JOIN `study_sessions` `ss` ON `ss`.`ROWID` = `ssc`.`sessionID` WHERE `ss`.`date` < $1", currentDate)
	if err != nil {
		return nil, app.Error(err)
	}
	var rows []int64
	err = db.Select(&rows, "SELECT `ssc`.`cardID` FROM `study_session_cards` `ssc` INNER JOIN `study_sessions` `ss` ON `ss`.`ROWID` = `ssc`.`sessionID` WHERE `ss`.`date` = $1 OR `ss`.`date` = $1-1", lastSessionDate)
	if err != nil {
		return nil, app.Error(err)
	}
	return rows, nil
}
