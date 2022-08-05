package main

import (
	"fmt"
	"math/rand"
	"strings"
	"sync"
	"time"
)

type SearchOpts struct {
	DeckName      string `json:"deckName"`
	FilenameQuery string `json:"filenameQuery"`
	ContentsQuery string `json:"contentsQuery"`
}

type Searcher struct {
	opts      SearchOpts
	batch     chan []*CardData
	running   bool
	lastError error
	batchSize int
	mu        sync.Mutex
}

type CardSearch struct {
	searchers map[string]*Searcher
	mu        sync.Mutex
}

func (self *App) StartSearch(opts SearchOpts) string {
	opts.DeckName = strings.ToLower(opts.DeckName)
	opts.FilenameQuery = strings.ToLower(opts.FilenameQuery)
	opts.ContentsQuery = strings.ToLower(opts.ContentsQuery)

	searcher := &Searcher{
		opts:      opts,
		running:   true,
		batchSize: 256,
		batch:     make(chan []*CardData, 0),
	}

	go func() {
		decks, err := self.GetDecks()
		if err != nil {
			self.Error(err)
			searcher.lastError = err
			return
		}
		var temp []*CardData
		for _, deck := range decks {
			if opts.DeckName != "" && opts.DeckName != deck {
				continue
			}

			for card := range self.enumerateCards(deck, &err) {
				if !searcher.running {
					break
				}

				if opts.FilenameQuery != "" {
					filenameMatch := strings.Contains(
						strings.ToLower(card.Filename),
						opts.FilenameQuery,
					)
					if !filenameMatch {
						continue
					}
				}
				if opts.ContentsQuery != "" {
					contentsMatch := strings.Contains(
						strings.ToLower(card.Contents),
						opts.ContentsQuery,
					)
					if !contentsMatch {
						continue
					}
				}

				temp = append(temp, card)
				if len(temp) >= searcher.batchSize {
					searcher.batch <- temp
					temp = nil
				}
			}
		}
		searcher.batch <- temp
		searcher.running = false
		close(searcher.batch)
	}()

	id := fmt.Sprintf("%v-%v", time.Now().Unix(), rand.Int31())

	if _, ok := self.cardSearch.searchers[id]; ok {
		panic("should not happen")
	}

	self.cardSearch.mu.Lock()
	self.cardSearch.searchers[id] = searcher
	self.cardSearch.mu.Unlock()

	return id
}

type SearchBatch struct {
	Data    []*CardData `json:"data"`
	HasMore bool        `json:"hasMore"`
}

func (self *App) NextSearchResults(id string) SearchBatch {
	self.cardSearch.mu.Lock()
	searcher, ok := self.cardSearch.searchers[id]
	self.cardSearch.mu.Unlock()

	if !ok {
		return SearchBatch{[]*CardData{}, false}
	}

	batch := <-searcher.batch
	running := searcher.running

	if !running {
		self.StopSearch(id)
	}

	if batch == nil {
		batch = []*CardData{}
	}

	return SearchBatch{batch, running}
}

func (self *App) StopSearch(id string) {
	self.cardSearch.mu.Lock()
	searcher, ok := self.cardSearch.searchers[id]
	delete(self.cardSearch.searchers, id)
	self.cardSearch.mu.Unlock()

	if ok {
		searcher.running = false
	}
}
