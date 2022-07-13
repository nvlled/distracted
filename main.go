package main

import (
	"embed"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
)

//go:embed wails.json
//go:embed frontend/dist
//go:embed starting-decks
//go:embed schema.sql
var assets embed.FS

func main() {
	defer func() {
		if err := recover(); err != nil {
			log.Printf("panic occurred: %+v\n", err)
			os.Exit(1)
		}
	}()

	rand.Seed(time.Now().UnixNano())
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		WindowStartState: options.Minimised,
		StartHidden:      true,
		Assets:           assets,
		AssetsHandler:    app.server,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},

		OnStartup: app.startup,

		//OnDomReady:    func(ctx context.Context) {},
		//OnShutdown:    func(ctx context.Context) {},
		//OnBeforeClose: func(ctx context.Context) bool { return false },

		Bind: []interface{}{
			app,
			&WailsExt{app.ctx},
			&errorList,
		},
	})

	if err != nil {
		println("Error:", err)
	}
}
