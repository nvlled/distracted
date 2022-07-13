package main

import (
	"math"
	"time"
)

const (
	BaseStepForget = 3
	BaseStepRecall = 2
)
const (
	CardPhaseLearn  = 1
	CardPhaseReview = 2
)

type CardScheduler struct {
	CardPhaseLearn  int `json:"cardPhaseLearn"`
	CardPhaseReview int `json:"cardPhaseReview"`
}

func (self *CardScheduler) IsDue(card CardData) bool {
	now := time.Now().Unix()
	return now >= card.LastUpdate+card.Interval
}

func (self *CardScheduler) Recalled(card CardData) CardData {
	card.ConsecForget = 0

	if card.ConsecRecall < 0 {
		card.ConsecRecall = 0
	}
	card.ConsecRecall++
	card.NumRecall++

	var step = 10 + math.Pow(BaseStepRecall, float64(card.ConsecRecall))
	if step < 30 {
		step = 30
	}
	//var step = float64(card.ConsecRecall) * BaseStepRecall
	card.LastUpdate = time.Now().Unix()

	card.Interval += int64(step)
	if card.Interval < 0 {
		card.Interval = 0
	}

	return card
}

func (self *CardScheduler) Forgot(card CardData) CardData {
	card.ConsecRecall = 0

	if card.ConsecForget < 0 {
		card.ConsecForget = 0
	}
	card.ConsecForget++
	card.NumForget++

	var step = -1 * math.Pow(BaseStepForget, float64(card.ConsecForget))
	card.Interval += int64(step)
	card.LastUpdate = time.Now().Unix()

	card.Interval += int64(step)
	if card.Interval < 0 {
		card.Interval = 0
	}

	return card
}
