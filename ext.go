package main

import (
	"context"
	"errors"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var ErrRuntimeError = errors.New("something happened, please remain seated")

type WailsExt struct {
	ctx context.Context
}

func (self *WailsExt) OpenDirectory() (string, error) {
	filePath, err := runtime.OpenFileDialog(self.ctx, runtime.OpenDialogOptions{
		Title:                "Select folder to save the deck",
		CanCreateDirectories: true,
	})
	if err != nil {
		LogError(self.ctx, err)
		return "", ErrRuntimeError
	}

	if isDir, err := IsDirectory(filePath); err != nil {
		LogError(self.ctx, err)
		return "", ErrRuntimeError
	} else if !isDir {
		return "", errorList.ErrInvalidDeckPath
	}

	return filePath, nil
}
