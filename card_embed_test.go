package main

import (
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
	var huh *EmbeddedCardData = nil
	if readStats == huh {
		t.Fail()
	}
	if readStats.Interval != stats.Interval {
		t.Fail()
	}
	if readStats.Proficiency != stats.Proficiency {
		t.Fail()
	}
}
