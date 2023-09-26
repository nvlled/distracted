Discovery mode

What for?

This replaces the work of scheduling algorithms that to predict the forgetting curve of the user. The idea is to let the user to decide if they are starting or have forgotten a card. 

Won't this just be the same as tediously reviewing the cards one by one? Not realy, if it works as intended, then the user should be able to skim over which have been forgotten.

I'll be implementing this sooner, so I'll start writing down some thoughts:

For the reviewed cards:
- exclude viewed cards today (recalled or not recalled)
- exclude selected cards
- include cards that were reviewed on the day before, or whichever the last previous day was
- have a page that lists some (text factor) keywords, and have the user quickly scan the unfamiliar/forgotten ones
- have a page that lists some example sentences, with the keyword highlighted, and have the user similarly scan it as well
- have a page that shows one factor at a time, and ask user if they remember anything about it

For the new ones:
- just pick one at random, but prefer keywords that share a common character with the currently reviewed/learned ones


---
Implementation notes:
- ~~update anki deck extractor
- ~~parse examples
- ~~parse context hint
- ~~make selected cards global
- ~~fix and redo card editing
	- ~~update views when card is edited
	- ~~each discovery items must have a button to open card file

- SequentRecap
  - to avoid repeatedly showing a card more than twice, use a local storage state
  - if no are selected for recap, clear LS state, and try again
  
- UnorderedRecap
   - double click to add
   - single click to select, click again to add
   - each keyword is shown in its own line
   - keywords move in alternating opposite directions
   - show cards at least  twice

- show discovery mode if no cards are added yet for the day, and there are at least 10 review cards

---

I'll need to do some sketching on the notebook to plan out the complete UI flow and design for card discovery. This should save me some time hacking away arbitrary changes later on.
