package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (self *App) serveDeckFile(routerCtx echo.Context, pathFields []string) (bool, error) {
	if len(pathFields) < 2 {
		return false, nil
	}
	deckFile := strings.Join(pathFields[1:], string(os.PathSeparator))
	deckName := pathFields[0]

	fmt.Printf(
		"search for deck file %v, %v\n",
		deckName,
		deckFile,
	)

	filename := filepath.Join(self.config.DecksDir, deckName, deckFile)

	if !RegularFileExists(self.ctx, filename) {
		filename = filepath.Join(self.config.MediaDir, deckFile)
	}

	fmt.Printf(
		"serving deck file: id=%v, %v\n",
		deckName,
		filename,
	)

	return true, routerCtx.File(filename)
}

func (self *App) serveDistractionFile(routerCtx echo.Context, pathFields []string) (bool, error) {
	if len(pathFields) < 1 {
		return false, nil
	}
	filename := strings.Join(pathFields[0:], string(os.PathSeparator))

	runtime.LogInfof(self.ctx,
		"search for distraction file %v",
		filename,
	)

	distractionFile := filepath.Join(self.config.DistractionsDir, filename)

	runtime.LogInfof(self.ctx,
		"serving distraction file: id=%v",
		distractionFile,
	)

	return true, routerCtx.File(distractionFile)
}

func (self *App) createServer() *echo.Echo {
	server := echo.New()

	server.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			reqPath := c.Request().URL.Path
			reqPath = strings.TrimLeft(reqPath, "/")
			fields := strings.Split(reqPath, "/")

			fmt.Printf("got request: %v\n", c.Request().URL.Path)

			var err error
			handled := false
			if len(fields) > 0 {
				if fields[0] == self.config.BaseUrlDecks {
					handled, err = self.serveDeckFile(c, fields[1:])
				} else if fields[0] == "distractions" {
					handled, err = self.serveDistractionFile(c, fields[1:])
				}

			}

			if err != nil {
				return err
			}
			if handled {
				return nil
			}
			return next(c)
		}
	})

	return server
}
