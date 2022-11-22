package main

import (
	"encoding/base64"
	"fmt"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

const CurrentEmbeddedVersion = 1

type EmbeddedCardData struct {
	CardStats
	CardID  int64
	Version int
	Delete  bool
}

func ReadEmbeddedCardData(cardContents string) (*EmbeddedCardData, error) {
	var emptyResult *EmbeddedCardData = nil
	re := regexp.MustCompile(`@data:.*`)
	dataLine := re.FindString(cardContents)
	if dataLine == "" {
		return emptyResult, nil
	}
	b64 := strings.TrimSpace(strings.TrimPrefix(dataLine, "@data:"))
	if b64 == "x" {
		return &EmbeddedCardData{
			Delete: true,
		}, nil
	}

	bytes := make([]byte, len(b64))
	_, err := base64.StdEncoding.Decode(bytes, []byte(b64))
	if err != nil {
		return emptyResult, err
	}

	result := &EmbeddedCardData{}
	data := strings.TrimFunc(string(bytes), unicode.IsControl)

	for i, field := range strings.Split(data, ",") {
		n, _ := strconv.ParseFloat(field, 64)

		switch i {
		case 0:
			result.Version = int(n)
		case 1:
			result.CardID = int64(n)
		case 2:
			result.Interval = float32(n)
		case 3:
			result.Proficiency = int(n)
		case 4:
			result.NumRecall = int(n)
		case 5:
			result.NumForget = int(n)
		case 6:
			result.ConsecRecall = int(n)
		case 7:
			result.ConsecForget = int(n)
		case 8:
			result.LastUpdate = int64(n)
		case 9:
			result.Counter = int64(n)
		}
	}

	if result.Version != CurrentEmbeddedVersion {
		return emptyResult, nil
	}

	//err = json.Unmarshal(bytes, &result)
	//if err != nil {
	//	return nil, self.Error(err)
	//}

	return result, nil
}

func ReplaceEmbeddedCardData(data EmbeddedCardData, cardContents string) (string, error) {
	// TODO: use JSON if more complex data is needed
	//jsonStr, err := json.Marshal(stats)
	//if err != nil {
	//	return "", err
	//}
	fields := []any{
		data.Version,
		data.CardID,
		data.Interval,
		data.Proficiency,
		data.NumRecall,
		data.NumForget,
		data.ConsecRecall,
		data.ConsecForget,
		data.LastUpdate,
		data.Counter,
	}

	fmts := []string{}
	for range fields {
		fmts = append(fmts, "%v")
	}

	fmtStr := strings.Join(fmts, ",")
	str := fmt.Sprintf(fmtStr, fields...)
	println(">" + str)
	b64Str := base64.StdEncoding.EncodeToString([]byte(str))

	re := regexp.MustCompile(`@data:.*`)
	contents := strings.TrimSpace(re.ReplaceAllString(cardContents, ""))
	contents = fmt.Sprintf("%s\n\n@data:%s\n", contents, b64Str)

	return contents, nil
}

func ChecKModifiedCard(lastStartupCheck time.Time, cardPath string, config Config) bool {
	lastModify := GetModTime(filepath.Join(config.DecksDir, cardPath))
	lastModify.Sub(lastStartupCheck)
	return lastStartupCheck.Sub(lastModify) < 0
}

func GetCardMediaFilenames(cardContents string) []string {
	re := regexp.MustCompile(`([\w,-]+?(\\|/))*?[\w,-]+?\.[A-Za-z]{1,4}`)
	return re.FindAllString(cardContents, -1)
}
