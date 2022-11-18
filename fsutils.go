package main

import (
	"bytes"
	"context"
	"crypto/md5"
	"errors"
	"io"
	"io/fs"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/samber/lo"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func DirectoryExists(ctx context.Context, path string) bool {
	fileInfo, err := os.Stat(path)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			runtime.LogDebugf(ctx, err.Error())
		}
		return false
	}

	return fileInfo.IsDir()
}

func RegularFileExists(ctx context.Context, path string) bool {
	fileInfo, err := os.Stat(path)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			runtime.LogDebugf(ctx, err.Error())
		}
		return false
	}

	return !fileInfo.IsDir()
}

func CreateEmptyFile(ctx context.Context, filename string) {
	if RegularFileExists(ctx, filename) {
		return
	}
	file, err := os.Create(filename)
	if err != nil {
		runtime.LogDebugf(ctx, err.Error())
		return
	}
	file.Close()
}

func IsDirectory(path string) (bool, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return false, err
	}
	return fileInfo.IsDir(), err
}

func IsEmptyDirectory(path string) (bool, error) {
	isDir, _ := IsDirectory(path)
	if !isDir {
		return false, nil
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return false, err
	}

	for range entries {
		return false, nil
	}
	return true, nil
}

func CopyFileContents(srcFile, destFile string) (err error) {
	in, err := os.Open(srcFile)
	if err != nil {
		return
	}
	defer in.Close()
	out, err := os.Create(destFile)
	if err != nil {
		return
	}
	defer func() {
		cerr := out.Close()
		if err == nil {
			err = cerr
		}
	}()
	if _, err = io.Copy(out, in); err != nil {
		return
	}
	err = out.Sync()
	return
}

func Mkdir(dir string) { os.MkdirAll(dir, 0755) }

func CopyFiles(srcDir string, destDir string) []string {
	var matches []string
	println("copying files")
	filepath.WalkDir(destDir, func(path string, d fs.DirEntry, err error) error {
		return nil
	})
	return matches
}

func GetMd5Sum(data []byte) (string, error) {
	byteReader := bytes.NewReader(data)

	hash := md5.New()
	_, err := io.Copy(hash, byteReader)

	if err != nil {
		return "", err
	}

	return string(hash.Sum(nil)), nil
}

func GetFileMd5Sum(filename string) (string, error) {
	file, err := os.Open(filename)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	_, err = io.Copy(hash, file)

	if err != nil {
		return "", err
	}

	return string(hash.Sum(nil)), nil
}

func ReadLines(filename string) ([]string, error) {
	bytes, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	return strings.Split(string(bytes), "\n"), nil
}
func ReadNonEmptyLines(filename string) ([]string, error) {
	lines, err := ReadLines(filename)
	if err != nil {
		return nil, err
	}
	var result []string
	for _, line := range lines {
		line = strings.Trim(line, " 	\n")
		if line != "" {
			result = append(result, line)
		}
	}
	return result, nil
}

type EnumerateFileEntry struct {
	Filename    string
	FilePath    string
	IsDirectory bool
	ModTime     int64
}

func EnumerateFiles(srcPath string, returnError *error) chan EnumerateFileEntry {
	ch := make(chan EnumerateFileEntry)
	go func() {
		err := filepath.WalkDir(srcPath, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			relPath, err := filepath.Rel(srcPath, path)
			if err != nil {
				return err
			}
			if relPath == "." {
				return nil
			}

			fileInfo, err := d.Info()
			if err != nil {
				return err
			}

			ch <- EnumerateFileEntry{
				Filename:    relPath,
				FilePath:    filepath.Join(srcPath, relPath),
				IsDirectory: fileInfo.IsDir(),
				ModTime:     fileInfo.ModTime().Unix(),
			}

			return nil
		})
		if err != nil && returnError != nil {
			*returnError = err
		}

		close(ch)
	}()

	return ch
}

func GetCardPath(absPath string) string {
	dir, filename := filepath.Split(absPath)
	deckName := filepath.Base(dir)
	return path.Join(deckName, filename)
}

func GetModTime(filename string) time.Time {
	stat := lo.Must(os.Stat(filename))
	return stat.ModTime()
}
