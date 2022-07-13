package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"io/ioutil"

	_ "github.com/glebarez/go-sqlite"
	"github.com/jmoiron/sqlx"
	"github.com/samber/lo"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

/*

table userData
  key
  value
  ---------------
  key, value
  last_post_fetch, 0
  last_reddit_request
  last_youtube_request
  intro_complete, 0
  distractionIndex



table distraction
  filename # relative to db file
  md5
  data # json
  # { type, link, ...}
  # if user renames a file
  # find a row with matching md5, then update filename

table reddit_requests
  type # hot, top, random
  subname
  after
  count

table youtube_requests
	searchQuery
	pageNum
*/

var UserDataKeys = struct {
	IntroCompleted     int
	DistractionIndex   int
	LastRedditRequest  int
	LastYoutubeRequest int
	DataDirInitialized int

	IsDownloading int
	NumToDownload int

	TextEditor int
}{
	IntroCompleted:     1,
	DistractionIndex:   2,
	LastRedditRequest:  3,
	LastYoutubeRequest: 4,
	DataDirInitialized: 5,

	IsDownloading: 6,
	NumToDownload: 7,

	TextEditor: 8,
}

type DBAPI struct {
	db         *sqlx.DB
	appContext context.Context
}

func (self *DBAPI) GetDataInt(key int) int {
	var value int
	err := self.db.Get(&value, "SELECT `value` FROM `user_data` WHERE `key`=$1", key)
	if err != nil && err != sql.ErrNoRows {
		runtime.LogDebugf(self.appContext, "failed to query data string: %v", err)
	}

	return value
}

func (self *DBAPI) GetDataBool(key int) bool {
	var value bool
	err := self.db.Get(&value, "SELECT `value` FROM `user_data` WHERE `key`=$1", key)
	if err != nil && err != sql.ErrNoRows {
		runtime.LogDebugf(self.appContext, "failed to query data string: %v", err)
	}

	return value
}

func (self *DBAPI) GetDataString(key int) string {
	var value string
	err := self.db.Get(&value, "SELECT `value` FROM `user_data` WHERE `key`=$1", key)
	if err != nil && err != sql.ErrNoRows {
		runtime.LogDebugf(self.appContext, "failed to query data string: %v", err)
	}

	return value
}
func (self *DBAPI) SetData(key int, value any) {
	query := "" +
		"INSERT INTO `user_data` (`key`, `value`) " +
		"VALUES ($1, $2) " +
		"ON CONFLICT(`key`) DO UPDATE SET `value`=`excluded`.`value`"

	_, err := self.db.Exec(query, key, value)
	if err != nil && err != sql.ErrNoRows {
		runtime.LogDebugf(self.appContext, "failed to query data string: %v", err)
	}
}

type GetDistractionResult struct {
	Filename string `db:"filename"`
	Md5sum   string `db:"md5sum"`
	Data     string `db:"data"`
}

func (self *DBAPI) GetDistraction(filename string) (*GetDistractionResult, error) {
	var result GetDistractionResult
	err := self.db.Get(&result, "SELECT `filename`, `md5sum`, `data` FROM `distractions` WHERE `filename` = $1", filename)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (self *DBAPI) RegisterDistraction(filename, dtype, md5Sum string, data any) error {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return err
	}

	query := "" +
		"INSERT INTO `distractions` (`filename`, `md5sum`, `data`) " +
		"VALUES ($1, $2, $3)" +
		"ON CONFLICT(`filename`) DO UPDATE SET `md5sum`=`excluded`.`md5sum`, `data`=`excluded`.`data`"
	_, err = self.db.Exec(query, filename, md5Sum, dataBytes)

	if err != nil {
		return err
	}

	return err
}

func (self *App) InitDB() {
	db, err := sqlx.Open("sqlite", self.config.DBFile)
	if err != nil {
		self.Debugf(err.Error())
	}
	schema := lo.Must(ioutil.ReadFile("schema.sql"))
	db.MustExec(string(schema))

	self.dbAPI = &DBAPI{db, self.ctx}
}
