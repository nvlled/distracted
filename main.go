package main

import (
	"embed"
	"math/rand"
	"os"
	"time"

	"github.com/huandu/go-sqlbuilder"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed wails.json
//go:embed frontend/dist
//go:embed starting-decks
//go:embed schema.sql
var assets embed.FS

func index[T any](xs []T, i int) T {
	if i < 0 || i >= len(xs) {
		var defaultValue T
		return defaultValue
	}
	return xs[i]
}

func main() {

	sqlbuilder.DefaultFlavor = sqlbuilder.SQLite
	rand.Seed(time.Now().UnixNano())
	app := NewApp()

	if len(os.Args) >= 2 && os.Args[1] == "-devmode" {
		app.devMode = true
	}

	err := wails.Run(&options.App{
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: app.server,
		},

		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},

		OnStartup: app.startup,

		Bind: []interface{}{
			app,
			&WailsExt{app},
			&errorList,
		},
	})

	if err != nil {
		println("Error:", err)
	}
}
