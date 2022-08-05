package main

import (
	"errors"
	"time"

	"github.com/samber/lo"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var ErrRuntimeError = errors.New("something happened, please remain seated")

type WailsExt struct {
	app *App
}

func (self *WailsExt) WindowMinimize() {
	w := 300
	h := 100
	ctx := self.app.ctx
	runtime.WindowUnfullscreen(ctx)
	time.Sleep(100 * time.Millisecond)
	runtime.WindowSetAlwaysOnTop(ctx, true)
	time.Sleep(100 * time.Millisecond)
	runtime.WindowSetSize(ctx, w, h)
	time.Sleep(100 * time.Millisecond)
	for _, screen := range lo.Must(runtime.ScreenGetAll(ctx)) {
		if screen.IsPrimary {
			runtime.WindowSetPosition(ctx, 0, screen.Height-h)
			break
		}
	}
}
func (self *WailsExt) WindowRestore() {
	ctx := self.app.ctx
	runtime.WindowSetAlwaysOnTop(ctx, false)
	runtime.WindowFullscreen(ctx)
}

func (self *WailsExt) WindowAlwaysOnTop(val bool) {
	runtime.WindowSetAlwaysOnTop(self.app.ctx, val)
}

func (self *WailsExt) OpenDirectory() (string, error) {
	ctx := self.app.ctx
	filePath, err := runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		Title:                "Select folder to save the deck",
		CanCreateDirectories: true,
	})
	if err != nil {
		LogError(ctx, err)
		return "", ErrRuntimeError
	}

	if isDir, err := IsDirectory(filePath); err != nil {
		LogError(ctx, err)
		return "", ErrRuntimeError
	} else if !isDir {
		return "", errorList.ErrInvalidDeckPath
	}

	return filePath, nil
}
