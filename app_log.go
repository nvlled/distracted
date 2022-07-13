package main

import (
	"context"
	"runtime/debug"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (self *App) Debugf(format string, args ...any) {
	runtime.LogDebugf(self.ctx, format, args...)
}

func (self *App) Error(err error) error {
	if err != nil {
		runtime.LogError(self.ctx, err.Error())
		debug.PrintStack()
		return errorList.ErrIOError
	}
	return nil
}
func (self *App) Errorf(format string, args ...any) {
	runtime.LogErrorf(self.ctx, format, args...)
	debug.PrintStack()
}

func LogError(ctx context.Context, err error) {
	if err != nil {
		runtime.LogError(ctx, err.Error())
		debug.PrintStack()
	}
}
