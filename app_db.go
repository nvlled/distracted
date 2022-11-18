package main

import (
	"context"
	"database/sql"
	"encoding/json"

	_ "github.com/glebarez/go-sqlite"
	"github.com/jmoiron/sqlx"
	"github.com/samber/lo"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// TODO: this is pain, just use strings
// or just plain consts
var UserDataKeys = struct {
	IntroCompleted     int
	DataDirInitialized int

	IsDownloading int
	NumToDownload int

	TextEditor         int
	LastUsedCollection int
	LastReviewDate     int
	LastFsCheck        int
}{
	IntroCompleted:     1,
	DataDirInitialized: 5,

	IsDownloading: 6,
	NumToDownload: 7,

	TextEditor:         8,
	LastUsedCollection: 9,
	LastReviewDate:     10,
	LastFsCheck:        11,
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
func (self *DBAPI) GetDataInt64(key int) int64 {
	var value int64
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
	db.SetMaxOpenConns(1)

	if err != nil {
		self.Debugf(err.Error())
	}

	schema := lo.Must(assets.ReadFile("schema.sql"))
	db.MustExec(string(schema))

	self.dbAPI = &DBAPI{db, self.ctx}
}
