package main

import (
	"fmt"
	"strings"
	"testing"

	"github.com/samber/lo"
)

func TestEmbedding(t *testing.T) {
	stats := EmbeddedCardData{
		CardStats: CardStats{
			Interval:    19928,
			Proficiency: 152101,
		},
	}
	contents, err := ReplaceEmbeddedCardData(stats, `

one
---
two
---
three

@data: ignored
@data: WzEyLDM0LDU1NCwyMywxMiwzLDIxMiwzMiw0MywxMiwzMl0=
	`)

	if err != nil {
		panic(err)
	}

	println(contents)
	readStats := lo.Must(ReadEmbeddedCardData(contents))
	if readStats != nil {
		if readStats.Interval != stats.Interval {
			t.Fail()
		}
		if readStats.Proficiency != stats.Proficiency {
			t.Fail()
		}
	}
}

func TestFilenameExtract(t *testing.T) {
	actual := GetCardMediaFilenames(`one\two\three.png
path/to/filename.md   filename.jpeg   
[some/file.ogg]
`)
	expected := []string{
		"one\\two\\three.png",
		"path/to/filename.md",
		"filename.jpeg",
		"some/file.ogg",
	}
	fmt.Printf("%+v, %+v\n", actual, expected)
	if len(actual) != len(expected) {
		t.Fatal("actual and expected length does not match")
	}
	for i := range actual {
		if actual[i] != expected[i] {
			t.Fatalf(`'%+v' != '%+v'`, actual[i], strings.TrimSpace(expected[i]))
		}
	}
}
