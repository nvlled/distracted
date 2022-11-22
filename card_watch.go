package main

import (
	"context"
	"database/sql"
	"io/ioutil"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/huandu/go-sqlbuilder"
	"github.com/samber/lo"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type exemptedFile struct {
	absolutePath string
	time         time.Time
}

type CardWatcherHandler func(cardPath string, op string)

type CardWatcher struct {
	ctx         context.Context
	config      *Config
	running     bool
	fileWatcher *fsnotify.Watcher
	mu          sync.Mutex

	Handler CardWatcherHandler

	exempted []exemptedFile
}

func NewCardWatcher(ctx context.Context, config *Config, handler CardWatcherHandler) *CardWatcher {
	return &CardWatcher{
		ctx:     ctx,
		config:  config,
		running: false,
		Handler: handler,
	}
}

func (self *CardWatcher) init() {
	self.fileWatcher = lo.Must(fsnotify.NewWatcher())

	decksDir := self.config.DecksDir

	var err error
	for file := range EnumerateFiles(decksDir, &err) {
		if file.IsDirectory {
			debugf(self.ctx, "found dir: %+v", file.FilePath)
			self.fileWatcher.Add(file.FilePath)
		}
	}
	self.fileWatcher.Add(decksDir)
}

func (self *CardWatcher) ExemptNextWrite(filename string) {
	self.mu.Lock()
	self.exempted = append(self.exempted, exemptedFile{
		absolutePath: lo.Must(filepath.Abs(filename)),
		time:         time.Now(),
	})
	self.mu.Unlock()
}

func (self *CardWatcher) checkExemption(filename string) bool {
	fileExempted := false
	exempted := []exemptedFile{}

	self.mu.Lock()

	debugf(self.ctx, "checking exemptions")
	for _, file := range self.exempted {
		debugf(self.ctx, "> %v, %v", file.absolutePath, filename)
		if file.absolutePath == filename {
			fileExempted = true
		} else {
			exempted = append(exempted, file)
		}
	}

	self.mu.Unlock()

	self.exempted = exempted

	return fileExempted
}

func (self *CardWatcher) Start() {
	if self.running {
		return
	}
	self.init()
	self.running = true

	lastEvent := fsnotify.Event{
		Name: "",
		Op:   0,
	}
	lastUpdate := time.Now()

	for {
		ctx := self.ctx
		select {
		case event, ok := <-self.fileWatcher.Events:
			if !ok {
				return
			}

			if event.Name == lastEvent.Name && event.Op == lastEvent.Op &&
				time.Since(lastUpdate) < 64*time.Millisecond {
				continue
			}
			lastEvent = event
			lastUpdate = time.Now()

			debugf(ctx, "file watcher event: %v", event)

			if self.checkExemption(event.Name) && event.Has(fsnotify.Write) {
				debugf(ctx, "exempted watched file %v", event.Name)
				continue
			}

			isDir, _ := IsDirectory(event.Name)

			if isDir {
				if event.Op&fsnotify.Create == fsnotify.Create {
					debugf(ctx, "created directory: %v", event.Name)
					self.fileWatcher.Add(event.Name)
				}
			} else if !event.Has(fsnotify.Chmod) {
				cardpath := GetCardPath(strings.TrimPrefix(event.Name, self.config.DecksDir))
				if filepath.Dir(cardpath) != "/" && len(strings.Split(cardpath, "/")) == 2 {
					debugf(ctx, "modified file: %v", cardpath)
					self.Handler(cardpath, self.getOpName(event))
				}

			}

		case err, ok := <-self.fileWatcher.Errors:
			if !ok {
				debugf(ctx, "stopping file watcher")
				return
			}
			logError(ctx, err)
		}

	}
}

func (self *CardWatcher) getOpName(event fsnotify.Event) string {
	if event.Has(fsnotify.Create) {
		return "CREATE"
	}
	if event.Has(fsnotify.Write) {
		return "WRITE"
	}
	if event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
		return "REMOVE"
	}
	return ""
}

func (self *CardWatcher) Stop() {
	self.fileWatcher.Close()
	self.running = false
}

func (self *App) initCardWatcher() {
	self.startupCheckModified()
	self.cardWatcher = NewCardWatcher(self.ctx, self.config, self.OnCardFileEvent)
	go self.cardWatcher.Start()
}

func (self *App) startupCheckModified() {
	lastCheck := self.dbAPI.GetDataInt64(UserDataKeys.LastFsCheck)
	var err error

	self.Debugf("last check %v", lastCheck)
	startTime := time.Now()
	count := 0
	for cardFile := range self.enumerateModifiedCards(lastCheck, &err) {
		count++
		err := self.UpdateModifiedCard(cardFile.Path)
		if err != nil {
			break
		}
	}
	elapsed := time.Since(startTime)
	self.Debugf("enumerating %v cards took: %v", count, elapsed)
	self.dbAPI.SetData(UserDataKeys.LastFsCheck, time.Now().Unix())
}

func (self *App) OnCardFileEvent(cardPath string, op string) {
	if op != "REMOVE" {
		self.UpdateModifiedCard(cardPath)
	}
	runtime.EventsEmit(self.ctx, "card-file-updated", cardPath, op)
}

func (self *App) UpdateModifiedCard(cardPath string) error {
	self.Debugf("updating card data: %v", cardPath)
	db := self.dbAPI.db
	config := self.config
	filename := filepath.Join(config.DecksDir, cardPath)
	contentBytes, err := ioutil.ReadFile(filename)
	if err != nil {
		return self.Error(err)
	}
	data, err := ReadEmbeddedCardData(string(contentBytes))
	if err != nil {
		return self.Error(err)
	}

	if data == nil || data.CardID == 0 {
		self.Debugf("no embedded card data for %v", cardPath)
		return nil
	}
	self.Debugf("embedded card data: %v, %+v", cardPath, data)

	// card data explicitly requested to be deleted
	if data.Delete {
		self.Debugf("deleting card data: %v", cardPath)
		b := sqlbuilder.NewDeleteBuilder()
		b.DeleteFrom("cards").Where(b.Equal("path", cardPath))
		_, err := db.Exec(b.Build())
		if err != nil {
			return self.Error(err)
		}
		return nil
	}

	var row struct {
		ID   int64  `db:"id"`
		Path string `db:"path"`
	}

	b := sqlbuilder.NewSelectBuilder()
	query, args := b.Select(b.As("ROWID", "id"), "path").From("cards").
		Where(b.Equal("id", data.CardID)).
		Build()

	err = db.Get(&row, query, args...)

	if err == sql.ErrNoRows {
		// maybe imported
		self.Debugf("imported card %v", cardPath)
		b := sqlbuilder.NewInsertBuilder()
		b.InsertInto("cards").
			Values(
				data.CardID, "", cardPath, data.Interval, data.NumRecall, data.NumForget,
				data.ConsecRecall, data.ConsecForget, data.LastUpdate, data.Proficiency,
				data.Counter,
			).
			Cols(
				"ROWID", "md5Sum", "path", "interval", "numRecall", "numForget",
				"consecRecall", "consecForget", "lastUpdate", "proficiency",
				"counter",
			)

		query, args := b.Build()
		_, err = db.Exec(query, args...)
		if err != nil {
			return self.Error(err)
		}
		return nil
	}

	if err != nil {
		return self.Error(err)
	}

	dbFilename := filepath.Join(config.DecksDir, row.Path)
	if !RegularFileExists(self.ctx, dbFilename) {
		// renamed
		self.Debugf("renamed card %v -> %v", row.Path, cardPath)
		b := sqlbuilder.NewUpdateBuilder()
		b.Update("cards").Set(b.Assign("path", cardPath)).Where(b.Equal("ROWID", row.ID))
		query, args := b.Build()
		_, err = db.Exec(query, args...)
		if err != nil {
			return self.Error(err)
		}
		return nil
	}

	if dbFilename != filename {
		// copied
		self.Debugf("copied card %v -> %v", row.Path, cardPath)
		b := sqlbuilder.NewInsertBuilder()
		b.InsertInto("cards").
			Values(
				cardPath, "", data.Interval, data.NumRecall, data.NumForget,
				data.ConsecRecall, data.ConsecForget, data.LastUpdate, data.Proficiency,
				data.Counter,
			).
			Cols(
				"path", "md5Sum", "interval", "numRecall", "numForget",
				"consecRecall", "consecForget", "lastUpdate", "proficiency",
				"counter",
			)

		query, args := b.Build()
		res, err := db.Exec(query, args...)
		if err != nil {
			return self.Error(err)
		}

		insertID := lo.Must(res.LastInsertId())
		data.CardID = insertID
		contents, err := ReplaceEmbeddedCardData(*data, string(contentBytes))
		if err != nil {
			logError(self.ctx, err)
		} else {
			bytes := []byte(contents)
			self.cardWatcher.ExemptNextWrite(filename)
			err = ioutil.WriteFile(filename, bytes, 0644)
			logError(self.ctx, err)
		}

		return nil
	}
	self.Debugf("no op for modified card %v", cardPath)

	return nil
}

/*
func (app *App) getFullDeckPath(cardPath string) string {
	return lo.Must(filepath.Abs(filepath.ToSlash(path.Dir(cardPath))))
}

func (app *App) CopyCardFiles(srcCardPath string, destCardPath string) {
	ctx := app.ctx
	fullCardPath := filepath.Join(app.config.DecksDir, string(srcCardPath))
	srcDir := filepath.Join(app.config.DecksDir, string(srcCardPath))
	destDir := filepath.Join(app.config.DecksDir, string(srcCardPath))

	contents := lo.Must(ioutil.ReadFile(fullCardPath))
	mediaFiles := GetCardMediaFilenames(string(contents))
	debugf(ctx, "mediaFiles: %+v", mediaFiles)
	for _, mediaFile := range mediaFiles {
		srcMediaFile := filepath.Join(srcDir, mediaFile)
		destMediaFile := filepath.Join(destDir, mediaFile)
		debugf(ctx, "copying %v -> %v", srcMediaFile, destMediaFile)
		_, err := os.Stat(mediaFile)
		logError(ctx, err)
		//emptyFile := err == nil && stat.Size() == 0
		if err == nil {
			//err = CopyFileContents(srcMediaFile, destMediaFile)
			//logError(app.ctx, err)
		}
	}
}
*/
