
# review discovery

Things to note
- keywords (text) tend to be shorter in length
- definitions (meaning) are generally longer, and loosely formatted
- some items may not have an associated sound in them

---  

## Discovery by examples
- This is included in the factory discovery
- find example sentences in the card by finding lists that contains a bolded keyword

---
### <Home />
(collapsible content)
| Find cards to study (N)
  <DiscoverCards />
| Cards to study (N)
  <SelectedDailyCards />
   
[ ] lofi grind [ ] test
[start]

---

#### <DiscoverCards />
`Cards to study for the day: N` (Fixed, floating component)

|v Overview | (Overview, Pick, Search)

.........................................[card filter]....
| <CardFilter />                                    |
.............................................................
<CardOverview /> | <SequentialRecap /> | <SearchTable />

---
##### <CardFilter />
Filter cards [default]
* N cards are matched  

Include from decks: [ ] all 
   [ ] deck 1
   [ ] deck 2 (show these when all is unchecked)
   [ ] deck 3
..............................................................................

[ ] Include reviewing cards [v]
    ( ) all
    [ ] include cards reviewed in the last  | 2|weeks |
    [ ] exclude cards reviewed in the last | 3|days |
..............................................................................

[ ] Include new cards
[ ] Include these cards
............................................
| <CardListEditor />          |
|                                          |
|                                          |
............................................


---

##### <CardOverview />
- the keywords (meaning) moves around the page
- the user would lazily watch these items move around
- if a user sees a forgotten item, then the user clicks on that item
- basically, like what I did to that failed game I made before

```
						電気
			雪
						雨
										[雲]
																	難しい
			雑誌
								集める
											隠れる
			隣
	階段
							降る
													降りる
```
(?) Find and click the cards that you have forgotten

---  

##### <SequentialRecaps />
- each factor item is shown one by one
- if it's sound, play it automatically
- clicking a button or pressing a key flags the item as forgotten
- there's is a time limit to respond 
- no response means no operation, will be shown again later (probably)
- randomly select a factor from a card

...................................[settings]....
| factor [v auto]
| duration: [--------------|----]
......................................................

   `hint`
[factor here]

[skip]   /   [forgot | study]

(?) Click if you forgot or don't recognize
      the shown detail about a card,
      if you are not sure, just wait or click `skip`

---  

##### <SearchCard />
- affected by the filter above
- should be reusable component
- use a wrapper component that directly modified selected cards

...............................[search settings]....
| columns v
|   [ ] id [ ]filename [ ]text [ ]meaning [ ]sound
|   page size: | 10 |
............................................................

[random page select]
.............................................................................
| rows here                                                          |
.............................................................................
< 1 2 3 ... 4 5 6 >

----
#### <SelectedCards />
- A wrapper for the CardListEditor 

[edit | save]          sort by [v added]
.......................................................
| A                                                  |
| B                                                  |
| C                                                  |
.......................................................

----
### <StudySession />

`N M X Y` session stats, mouse-over to see legend info

Sidebar
  | <SearchCard />
  | <Notes />
  | <Settings />

<CardView />


----
#### <CardView />
........................................[settings]...
| [remove for today]
|   remove from current study session
|   this will not delete the card file
| [edit card]
|   change cards contents
| [retry]
|   click if pressed a wrong button
..........................................................


```

[*]
| type: [ ]trial [ ]observation
| show: |v text| |v sound |
----------------------------------------------
|                     |                      |
|                     |                      |
|  factor 1           |   factor2            |
|                     |                      |


            [filename.md] [*] (open settings)

```
