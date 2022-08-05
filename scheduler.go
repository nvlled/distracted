package main

import (
	"time"
)

const yearInterval = 60 * 60 * 24 * 30 * 12

const (
	BaseStepForget = 4
	BaseStepRecall = 3
)
const (
	CardPhaseLearn  = 1
	CardPhaseReview = 2
)

const (
	seconds = 1
	min     = 60 * seconds
	hour    = 60 * min
	day     = 24 * hour
	week    = 7 * day
	month   = 30 * week
	year    = 12 * month
)

type CardLevel int

const (
	BaseLearnLevel  = 0
	BaseReviewLevel = 4

	MaxLearnLevel  = BaseReviewLevel
	MaxReviewLevel = BaseLearnLevel + 10
)

/*
var LevelToInterval = map[CardLevel]int64{
	BaseLearnLevel + 1:  60 * seconds,
	BaseLearnLevel + 2:  2*min + 30*seconds,
	BaseLearnLevel + 3:  4*min + 0*seconds,
	BaseLearnLevel + 4:  5*min + 45*seconds,
	BaseLearnLevel + 5:  7*min + 30*seconds,
	BaseLearnLevel + 6:  9*min + 40*seconds,
	BaseLearnLevel + 7:  10*min + 30*seconds,
	BaseLearnLevel + 8:  12 * min,
	BaseLearnLevel + 9:  15 * min,
	BaseLearnLevel + 10: 20 * min,

	BaseReviewLevel + 0:  6 * hour,
	BaseReviewLevel + 1:  1 * day,
	BaseReviewLevel + 2:  3 * day,
	BaseReviewLevel + 3:  7 * day,
	BaseReviewLevel + 4:  2 * week,
	BaseReviewLevel + 5:  1 * month,
	BaseReviewLevel + 6:  2 * month,
	BaseReviewLevel + 7:  3 * month,
	BaseReviewLevel + 8:  4 * month,
	BaseReviewLevel + 9:  5 * month,
	BaseReviewLevel + 10: 6 * month,
	BaseReviewLevel + 11: 1 * year,
}

var IntervalsReviewPhase = map[CardLevel]int64{}
*/

type CardScheduler struct {
	CardPhaseLearn  int `json:"cardPhaseLearn"`
	CardPhaseReview int `json:"cardPhaseReview"`
}

func (self *CardScheduler) Recalled(card CardData) CardData {
	card.LastUpdate = time.Now().Unix()
	card.LastRecallDate = card.LastUpdate
	card.ConsecForget = 0

	if card.ConsecRecall < 0 {
		card.ConsecRecall = 0
	}
	card.ConsecRecall++
	card.NumRecall++

	return card

}

func (self *CardScheduler) Forgot(card CardData) CardData {
	card.LastUpdate = time.Now().Unix()
	card.ConsecRecall = 0

	if card.ConsecForget < 0 {
		card.ConsecForget = 0
	}
	card.ConsecForget++
	card.NumForget++

	if (card.Proficiency < MaxLearnLevel && card.ConsecForget >= 2) || card.ConsecForget > 10 {
		if card.Proficiency > BaseLearnLevel {
			card.Proficiency--
		}

		/*
			if interval, ok := LevelToInterval[CardLevel(card.Level)]; ok {
				card.Interval = interval
			}
		*/
	}

	return card

}

func (self *CardScheduler) ToLearnPhase(card CardData) CardData {
	card.Proficiency = BaseLearnLevel
	/*
		if interval, ok := LevelToInterval[CardLevel(card.Level)]; ok {
			card.Interval = interval
		}
	*/
	return card
}

func (self *CardScheduler) ToReviewPhase(card CardData) CardData {
	card.Proficiency = BaseReviewLevel
	/*
		if interval, ok := LevelToInterval[CardLevel(card.Level)]; ok {
			card.Interval = interval
		}
	*/
	return card
}
