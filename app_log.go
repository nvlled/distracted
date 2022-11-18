package main

import (
	"context"
	"errors"
	"fmt"
	"runtime/debug"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func debugf(ctx context.Context, format string, args ...any) {
	runtime.LogDebugf(ctx, format, args...)
}
func logErrorf(ctx context.Context, format string, args ...any) error {
	err := errors.New(fmt.Sprintf(format, args...))
	runtime.LogError(ctx, err.Error())
	debug.PrintStack()
	return errorList.ErrSysError
}
func logError(ctx context.Context, err error) error {
	if err != nil {
		runtime.LogError(ctx, err.Error())
		debug.PrintStack()
		return errorList.ErrSysError
	}
	return nil
}

func (self *App) Debugf(format string, args ...any) {
	runtime.LogDebugf(self.ctx, format, args...)
}

func (self *App) Error(err error) error {
	if err != nil {
		runtime.LogError(self.ctx, err.Error())
		debug.PrintStack()
		return errorList.ErrSysError
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
