
--------
please give your interests (one per line)
|               |
|               |
|               |
|               |
--------

Do you go to the website reddit?
[yes] [no]

--------

Can you give the subreddits that you like to read?
Preferrably subreddits with lots of images or
videos.
|                         |
|                         |
|                         |
|                         |

What for? The posts on those subreddits
will be shown here. It will be explained
later for what purpose.

-------------------------------

@deckname | search             |
✓ cards1.txt            [view]
  cards2.txt            [view]
  cards3.txt            [view]

[add random]
// selected cards are sorted by added

-------------------------------

[add cards from] |v deckname|

cards                   
> cards1.txt            [remove][view][move up][move down]
> cards2.txt            [remove][view]
> cards3.txt            [remove][view]

sort by |v random | |ascending| // random,reviewCount,interval,name
[clear] (confirm user)

// change button caption depending on state
|v collection name (optional)| [save] // create,save

[start]

-------------------------------

things to memorize in order:
1. general appearance of the word (for recognition)
2. sounds or pronunciation
3. specific, or detailed appearance of the word.

(3) isn't required, the process of remembering it
would be done naturally with enough exposure.
But even noticing tiny details
helps with recognition, so applying some effort
to recognize the subtler details is good.

Reading from an example sentence is actually
misleading since I tend to use the context to remember
the word, but fail to recognize or remember it
out of that very specific example context.

So it's important to only look at the word itself first.
If it can't be recognized, then it's considered
not remembered. And look or listen at the sample
sentence or context if the keyword is remembered.

-------------------------------

I think it would generally be better if the user
has more control over his study/review process.
The app as of now does give plenty of options
for custom workflows, but... no wait I'm thinking
of adding features again. Focus on shipping goddarn it.
Did I say something about a prototype?

Finish last batch of TODO, then no more.
Test it, ship it or throw it.
I'm going broke, and I have 7 puppies to feed.
I really need to work on my attention span.

But as for the algorithm, what do I think?
I haven't finished working on it, but does
it have potential? At least, it seems
to have worked on words I haven't heard of before:
koutsuujiko and shokai
although I might have over-reviewed them while testing

bending the curve
I feel like I'm missing a critical piece of the puzzle
I think I'm on the right track, 
oh well no use thinking hard about it right now
it's good enough for now

-------------------------------

Let me recap the goals:
To accelerate commiting things in long-term memory
by "bending the curve", which is done by
shortening the recall-forget cycles.
Instead of waiting for hours or days to forget,
this process will be done within an hour to a day.
Current methods include finding ways to model
the forgetting curve. The innovation in my method, if I may call it that,
is not even bother trying to model the curve.

The problem is making the user forget sooner.
In my experience, I actually tend to forget sooner,
even without the presence of other things in mind.
This is a stark contrast to say anki, where I have
to wait at least a day for the next review cycle.
This makes learning a card way longer than it needs to.

For the short-term phase, simple distractions does
make me forget, on some cards at least.
For other cards, they seem to be harder to forget,
even for words or concepts that I'm not already familiar with.

Why is that?

If I have to guess, it's because memorizing an idea
depends on the previous memories I have. The more
similarities and associations a new idea have with my
pre-existing memories, the easier to remember them.

Aside: what about mnemonics? I guess it depends on the person,
I personally avoid mnemonics that are too convoluted or
that takes a lot of imagination. These sort of mnemonics
yield slower recalls, potentially more cognitively demanding,
hence doesn't scale for things like vocabulary building.
I'm also not a fan of visually interpreting kanjis as some
some of picture or scene, for reasons mentioned before, but
also because some kanjis are very similar but has no
relation at all. Most importantly, picturesque mnemonics
are quite specific to japanese or other asian characters.

I dunno. It's an interesting idle thought for later,
it's not directly crucial to what I'm achieving though.
The important thing to note is some words or ideas
are harder to remember than others. Trying to accurately
model into the fogetting curve this would be more difficult, at least for me.


The solution:
gradually adjust recall difficulty, that way,
forget-recall ratio stays close to 1.
What does that mean?
Gradually adjust the amount of detail to remember.
The lesser detail, the easier to remember.
Once some of details starts to permeate the existing memories,
more details can then be added.

For example:
 交通事故         

 level of details
 1. high-level imprecise recognition
 2. meaning/definition
 3. pronunciation
 4. low-level precise recognition
 5. visualization (can be imagined or drawn from memory)

 (5) is very difficult (for kanji at least), but it's not important to be able to do it.
 It's purpose is to put the recall/forget cycle in equilibrium.

 Edit: I found a way to help with (5). It involves shuffling the character,
 and have the user piece back together. This allows the user to pay
 attention to low-level details. It mostly can be only solved if the user
 is well familiar with how it looks.

 This may take me another week to implement, so I'm not going to implement
 them just yet. I think the app is good enough for the most part.
 I probably just need to tweak the interval changes, and probably 
 some better distractions. Well actually no, I don't think I even
 need to implement them, I can use the algorithm in my head
 while reviewing. No, implementing them as an actual feature will
 make it easier.

As a side note, why am I not referring to existing literatures on
space repetition? My excuse is that I'm doing something completely
different (I'm free to fantasize). My second excuse is that it's more fun creating
systems out of my own naivety. Third excuse is that current literature
is way beyond my expertise.

For sure, I will be labeled as crank by practicing neuro guys.
For that reason alone that I'm hesitant to put these thoughts in public.

The other subgoal to keep in mind is to have a scheduling or spacing
algorithm that isn't specific to language learning.

-------------------------------

Rethink interface and user study flow

After reading some user comments from anki and other
subreddits, it occured to me that users do want
more control over their study process. I did expect
some degree of customized flow based on my experience,
but different users have varying ways of learning
and studying.

There are even users that aren't fond of
space repetition, and just prefer to manually study.
Of course, I can't entirely drop the spacing effect since I still
believe in the forgetting curve model, albeit I'm 
trying to find alternative ways around it, or a 
more efficient version of it.

Instead, I will settle something in-between:
localized spacing effect
By localized, I mean spacing and scheduling
will only apply to a smaller time frame,
for instance, per day, in which all spacing related data
will reset back to zero after the time frame has ended.
Or rather than time frame, it could be per study session.

The interface has to be informative such that the user
can decide needs studying. I will just use a table instead
that can be sorted by several columns, and be searched and filtered.

Yeah, I think this design will do, and it's a lot more simpler too.
No need for silly card phases. I don't why I didn't realize sooner
that spacing effect doesn't have to depend on time. Well, "time out"
is still important for things like letting the mind rest and be
distracted. Is this the missing puzzle piece I'm looking for?


brain dump:
- instead of card collection, do study sessions instead
  with time frame and/or number of repetitions 
  user can select which scheduling algorithm to use

- spacing doesn't have to depend on time
  it can be done by methodically alternating cards in between

- hopefully I or someone else gains the insight to a more
  accurate "forgetting" curve model. I put quotes in it because
  I don't believe forgetting is necessarily an important factor.

-------------------------------

De ja vu?

What ever happened to the plan of just making a really dead simple prototype
within a week. One and a half-month later, and I have nothing to show for.
I do change my mind a lot, try lots of things, and discard or redo things
that doesn't work. I would like to show people what I've made, but
first I have to be satisfied with what I've done, and that I've achieved
the bare minimum of what I've trying to achieve. What's the point
of prematurely showing it to someone else and asking for opinions and thoughts,
when I know better than anyone else what's everything wrong with it.
Well, I could ask for ideas or improvements, but again, it would be too early for that,
since I still change a lot of things. Studying competing products would 
give me more insight.

-------------------------------

Why use a web-based UI instead of a proper native controls?

Because I have yet found a platform that offers the same
degree of customizability. I look at something like go-gio
or something, and my first thought is that, it's going
to be a piece of work to make it do something beyond
the normal CRUD interfaces. Maybe I just had bad impressions
from java swing years ago, I just have a hard time going back
to the OOP and the MV*M style of interface programming.

-------------------------------

Aug 19
I feel quite terrible today. I might have eaten
something funny, that popcorn I had yesterday 
may have been long overdue. I feel feverish,
and have searing headache, and elevated pulse.
On the other hand, at least I'm not having a breathing
difficulty, unlike the last the I had a fever or in sickly state.
Popcorn aside, it might also be to due the fact that I have
been exerting myself physically more than I need to.
With 7 puppies around, I have to do more cleaning that usual.
Also, I have to attend to 2 rabbits and 2 goats, as well
as feed the bigger dogs and the cats.

Now I'm feeling sick, I actually feel comfy and relieved that
I am temporarily freed from the wordly troubles. I shall
spend this day, and the weekend by being the most useless
person around.

I should probably reduce my working days to avoid this
happening again. Hopefully I recover before the next week starts.
I'll officially self-declare fridays as do nothing day.
Well, maybe do some lighter tasks instead, like writing.

-------------------------------

card view based on level

level 0-2:
show front

level 3-4:
hide keyword, play audio

level 5-7:
obscure keyword

level 8:
show back

level 9-10:
random

-------------------------------

level = Math.max(conseqRecall, recall + forget, 0))
if (learned(card)) {
      level = Math.max(level, 10)
}
// I should probably add another field `level` to card
// if the user incurs too much `forget`,
// it will be hard to level up the card.
// There should be no penaly to too much mistakes.

learning card phase
level      interval 
0           0
1           10s
2           25s
3           1m
4           1m30s
5           2m00s
6           2m30s
7           3m00s
8           4m00s
9           7m30s
10          10m0s

review card phase
level      interval 
0           6h
1           1d
2           3d
3           7d
4           2w
5           1mon
6           2mon
7           3mon
8           4mon
9           5mon
10          6mon


-------------------------------
localized scheduling
Needs more tweaking
- it should balance between going through all cards,
  and going back to difficult ones

a batch is a group of cards that will be viewed
until the next break/distraction time

let only a card be recalled correctly at most
once per batch, if forgotten, it can be viewed
more than once

- make card level non-local?

- should find the right break time and batch size 
  so it feels as natural as procrastinating

-------------------------------
Okay, creating a new study session every day
is actually not a very fun user experience.
It easily clutters, and just adds one more
thing to do everyday. 

I should think about this more, it just
doesn't feel right. Cumbersome is probably
the word for it. On the other hand, it's
part of the localized scheduling design.
Maybe the localized scheduling wasn't
a good idea after all?

-------------------------------

Two types of study sessions:
- daily (no name)
- custom (must be named)

Actually, only one type of study session,
but dailies would have a predefined name, like "daily".


Dailies are automatically created,
can be freely added/edited.
Custom are still available for more
flexible study options.

note: daily study sessions are only automatically created,
it doesn't mean the user have to study everyday

Will custom studies be daily as well?
Yeah, since there's no longer long-term scheduling.
There would only be non-time-based short-term scheduling (at most a day).
No more algorithms for predicting when the user would forget.
The problem shifts to discovering which has been forgotten, 
which personally I think has a lot more viable solutions.

But wait, what ever happened to bending the forgetting curve?
It's still part of the design, where the forget-recall cycle is largely shortened.
Even if the theory doesn't work,
I still think the resulting overall program design is better
than the current spaced repetitions apps. If not, well,
back to job searching. I actually would want to dig deeper
into the reasoning and assumptions behind space repetition, maybe I could
find jobs related to that?

Changes to db:
- global card states: level, numRecalls, numForget, consecRecall, consecForget, lastUpdate, lastRecallDate
- study session state:  name, date (int,yyyymmdd), studyDuration, type
- study session card state: cardpath

I actually dont' need a separate rows for the custom card state,
I could just set them to zero on the frontend.

study session type:
- normal
- quiz (show cards until they are recalled correctly)

this affects what order cards are shown (how many times, and how frequent)

side note:
it's weird how much of the program design I'm doing now are very similar
to the first spacedout app version I made years ago that I made for 
(supposedly) learning swedish. I made decisions unconsciously, without
explicit reasoning to what I was doing. What seems like arbitrary decisions
I made back has apparently logical reasoning behind them. Or was it all 
a fluke? One thing is for sure though, it's always better to write things down.
Pretty sure way back then, all I could mutter to myself, "I have no idea
what I'm doing".

-------------------------------

revised localized scheduling
two card phases:
- learning
- review

phases are hidden from the user, and are only 
internally used to decide how a card is presented

- in accordance to bending the curve, a card
will have a longer learning phase, that will
happen within the first 1-2 days when it is first
viewed.
- if the theory of bent forgetting curve works, then
a card would have way shorter review frequency, ideally
a month at least after first learned

a study session would have two card queues (these are frontend states only):
- q1 (dequeue by order of insertion, cards not recalled yet for today takes priority)
- q2 (learning cards, or review cards that were not recalled successfully)
and a series of card batches

a card can only be in either q1 or q2, not both

scheduling algorithm:
1. dequeue due a card from q2
2. if none, then dequeue from q1
due here is defined by current batching implementation

what happens when q1 has been  emptied?
prompt user to:
- continue
- add more cards
- stop

if continue, refill q1 with cards not in q2,
then proceed with scheduling as usual

batching will be done as the way it is

-------------------------------
(re)discovery of forgotten cards

Since, I am no longer relying on long-term
scheduling algorithm for spacing effect,
I may need a more smoother/faster process of 
figuring out what has been forgotten.

Of course, the user can just use
the search table to quickly skim over
which cards are forgotten, or just
review all cards that hasn't been
viewed for a week. This method certainly
eliminates the problem of modeling and predicting the
forgetting curve.

Which is to say, it's good enough for now, 
but there's probably a better way.
I will keep it in the back of my head,
in case a spark of insight ignites on some
random waking moment.

random ideas:
- let app run in background, and randomly
  play audio, or show keywords
- labels, or color indicator

- add discover mode view, where card keyword/audio
  shown in rapid succession (timed around 5 seconds)
  there's only one button, [forgot], where if the user
  presses it, the card is added to the study session.
  If the user didn't respond, it is skipped, the reason
  being that the user is still undecided if remembered or forgotten.

-------------------------------

Scheduling needs some more tweaking,
particularly when to inform user to add more cards

- probably just set minimum available cards to 20
  the reason being that the number of available cards 
  is used for spacing, e.g., it helps the user to forget

  the more cards, the better variation
  with just around 10 cards, it just gets repetitive
  when they are all learning cards

-------------------------------

Okay, it's all too easy to lose track of the time
while working on this. If I'm not careful, another month would have passed
without me noticing. As soon as I'm satisfied with the 
overall app user experience, I'm going to do a testing for a week or two
while I start finding some part-time work.

No wait, first I cleanup the code and add some readme and documentation.
Ideally, I should find some work that is very similar to this.
Then I would find some companies who would seem interested in what
I made. Of course, I'm not planning to sell this? Or rather, I'd rather not give
the ownership to someone else. I prefer the project to be 
open source, like anki.
The more ideal situation is to
find someone or people to fund me on this one. Unlikely though,
reaching out to people would be the hardest part
Finding to companies seems more plausible.
What kind of companies though?
Probably those that make apps related to gamified learning or education.
Companies that make apps for language learning too, there's probably
a tons of them, although I'd rather avoid the snake oil sellers.

Ultimately, I just need to earn money to sustain myself, my mother
and my dogs, and cats. Worst case, I fail to find any ideal job,
and I'm still working on this until the end of the year.
That doesn't seem too bad though, as long as I found out
if the theory of bendable forgetting curve is true or not.


-------------------------------

I'm still somewhat unsatisfied with the obscuring of the keyword.
The goal is primarily to train recognition, not necessarily be
able to visualize it from memory, which is probably harder for some people.

The text jumbler works fine, but it is somewhat slow and time consuming.
Maybe try:
- keyboard controls
- decrease tile size (more rows and cols), but increase fixed tiles
  cons: possible whitespaces and empty blocks
- jigsaw puzzle?
  no, this would take even longer, though maybe more fun 


Also, what about: get other keywords from the collection, and
show them to the user, and let the user search the right one.
For instance, can I find hirogohan? from the current list?
Yeah, but I think it would be better if I take from the all the reviewing cards.

How would this look like? They don't have to be animated, probably better
to make it look like regular text.

-------------------------------
recognition trainers
should be a replacement for spoilered and jumbled text

# recognition trainer 1
PhraseSearch

|***| (hover to show)

足りる 距離 踊る 車
転勤 辛[×つら]い 辞める
軽い 辞書 辺 辺り
迄 迄に

- click the correct answer, indicate if it's correct
- the user should still manually select yes/no
- entries are taken from review/learning cards

----

<Back card face>

-------------------------------
# recognition trainer 2
PhraseInput

足____ =? |***| (hover to show)


足 り る 距 離 踊 る 車
転 勤 辛[×つら]い 辞 め る
軽 い 辞 書 辺 辺 り
迄 迄 に
- clicking here inserts into the text above
- indicate if correct/wrong if length matches

----

<Back card face>

-------------------------------
# recognition trainer 3

← 足りる 距離 踊る 車 軽い 辞書 辺 辺り 迄 迄に →

- bigger font
- click arrows to move forward/back
  wraps around, so no end
- this seems better, at least I don't have to move my
  eyes around too much

- what about a 2D grid?
  nah, I want it to be like similar to a regular text


-------------------------------
Yeah, these recognition trainers should be a good 
improvement over the spoilered text and the jumbled text.
It's faster to do, and doesn't encumber the imagination.
I guess all those shitty failed past projects wasn't
all for naught.

Yikes, I never run out of things to do.
On the on other hand, I like implementing new features
and trying out stuffs.
At least, I'm focusing on the essential features
to get the app working with the bare minimum.


-------------------------------

So I'm actually tempted to write an relatively
"hot take" with regards to spaced repetition
and how it's like treated like the silver 
holy grail bullet of learning. It's quite rare
to see learning apps that doesn't implement
space repetition. People forget that in the
end it's still a map, and probably still way
too far from representing even a modicum
of the territory.

I kind of amazed how people would create these
really intricate complex statistical models to "improve"
the forgetting curve represention, when in 
reality it makes the model no better, or even worse
than before.

Well, it's probably a burning take. I can imagine
people who design these models would seeth with 
mouth-foaming rage to hear from a uncredentialed
third-world weeb shit on their years of work.

I'm not claiming absolute truthfulness, I'm not 
claiming I'm totally right, just that maybe
these guys might be a bit wrong, and needs
to step back away from their specialized tunnel
vision, and get a different perspective.  

So the purpose for writing the hot take would be to
- raise awareness of my proposed solution
  of course, assuming I yield promising results first
  from my own tests
- hear from like-minded people who could point me
  to related resources
- make more enemies, because why not,
  I'm already on bad terms with insecure morons,
  so why not pick a fight with the beefy brains.
  I'm hoping at least the smarter ones would
  not be too eager to construct an imaginary representation
  of their opponent.


-------------------------------
Aha, I like what I'm seeing. I'm actually forgetting
the learning cards sooner, which is a good sign
that the spacing is working. Of course, if I'm forgetting
the review cards, then that can't be a good sign.
Maybe learning phase needs to be extended a bit.

What if I'm just having a bad memory day?
Nah, my head is sufficiently sharp these days.

-------------------------------

Okay, just a little more, the scheduling
feels satisfactory now, it should be usable
for day-to-day testing now.

My app usage and workflow would like this:
1. open app first thing after opening
   (or automatically open it)
2. Finish one batch of cards then
   read HN/reddit while on breaktime
   (maybe I should let the  starting break time be configurable)
3. repeat until I get bored of procrastinating
   or I have other things to do
  
The best part is that I get to procrastinate
and feel not too feel guilty about it.
The app is designed not to incur much
mental effort, so I could use it for hours
without feeling tiring. Why wouldn't it incur
mental effort? Because if I can't remember 
something within 3 seconds, then I don't
try harder to remember it. It just means
I'm not well-acquainted with the card or word yet.
I don't exert effort to memorize anything.
I let the process of repetition do it's thing.
At most, the onerous part is echoing back
the keyword in my mind, and that's pretty
effortless too. If I forget, then that's fine
too, and actually the point.

There's no pressure too, no stats or reminders
telling me to go back to studying. I can do
it everyday, once a week, or haphazardly whenever
I feel like it.

In accordance to testing the theory, the
card should not be reviewed after the learning phase
again until the next month, or longer.
Or two weeks, I don't know. For that,
I'll need to implement the discovery feature.

The other nice feature is that I can control
the rate of card I learn. If I want, I go
do something like "skimming" the whole deck,
by trying out every card once first,
to get a feel and broad overview of the
vocabulary.

In short, the app user experience is explicitly
designed for lazy bums like me who has zero
consistency when it comes to studying.
Yay!?!? If it works for me, I couldn't care 
less if others find it useful or not.

It would be nice though if I can monetize it,
or get some returns for the time and effort
I put into this shit.

I don't like subscription-based software,
so that's out of the question. I could try
funding through patreon or others, but
I would have to get census first if people
find it useful. 

I could also try a free version, and 
a paid version, although I don't know
put on the paid version. Some exclusive
feature maybe? Like what? Probably the
most community-requested feature. Yeah,
that sounds reasonable, if someone's
telling me to do something, I should
get paid for it professionally.

This note section would be a reference
for making tag lines or maketing phrases
designed to reach people.

-------------------------------

In continuation to yesterday's rationalizations
why this app exists, I will now make rough
comparisons to anki. Since I used anki as a reference
for the program design, basically a supposedly better anki,
it's easier to list the pros over the cons.
But for fairness, I shall also think and criticize
my own creation, and give an equal list of cons.

To start, here are the cons and my own rebuttals:

- new unstable, software, so expect bugs
  answer: it's a simple small, program with a well-defined initial scope
           so it's relatively easy to fix bugs

- no community-created content
  answer: it's trivial to create a program for users
           upon request, to leech off the anki decks, AHHAAHA!?111
           kidding aside, the proper term would be import feature

- it looks ugly and stupid
  answer: y-you too
  
- interface design is weird
  answer: fair enough, I admit this one of my weak areas
           but hopefully it's not weird enough to compromise
           usability

- it's nothing like what I'm used to, *cough* AKA not anki*couch*
  answer: can't help you there, if you used it in earnest and
          didn't like it, then no problem, you can go back
          to using what you have always been using

- space repetition is broken
  answer: it's broken intentionally
          I mean, it's not broken, it's just different 
  

Here are my problems with anki after using it in earnest
to learn japanese vocabulary:
- stressful, I didn't even reach a "100 cards to review" yet per day
  but holy crap, it wasn't a pleasant experience
  there's always the nagging feeling that if I miss a day or two,
  my due cards will pile up and it will be hard to catch up,
  and it did happen, and was impossible to gain my reviewing momentum

- fixed, steady new cards, and inflexible scheduling
  there are some days I don't really want to learn new cards
  and just want to review
  it's probably possible to do this, but with a plugin
  or some obscure settings

- complex, obscure settings: starting ease, easy bonus, interval modifier, what?
  this is all rooted on hacky statistical scheduling algorithm that anki uses

- choice fatigue on again, hard, good, easy buttons
  why four buttons? again, for the algorithm to "predict"
  my forgetting curve
  then tatsumoto and others recommend just using hard and good buttons
  then tweaking the shitty settings so anki would be less broke
  did I do the settings right? it seems to be?
  looking back, I can't believe I tolerated such a shitty user experience

- takes a long time to "learn" a card,
  the spacing algorithm stretch too far between days or weeks,
  so I have these really shallow recollections of cards,
  where I can't really recognize or recall them in the media
  until days to weeks, or even months later after the initial review

- dearth of exposure to cards, I can only recall a card once a day.
  again, the result is that takes a while to become proficient with a card
  who says viewing cards more than once is not good?
  because I need to go over my review pile quickly?
  yeah, fuck that, I ain't speed running

  I really want to believe, that the theory of bent curve works,
  and works better than current spacing algorithms.
  
The usual comeback I hear from anki proponents is that, it's just
a tool, you're supposed to use it with other methods and tools.
Yeah, no, that's no excuse for a terrible usability.
Just kidding, it's obviously my bias as a competing product developer
talking. Or not, I may be biased, but I try to objectively assess
the cases as fair as I can.

-------------------------------

So I made this primarily for vocabulary building, but 
would it work for cramming or memorizing in a short period of time?
Maybe, I'm still testing it. I mean, the app covers the use
case of a medical student in distress.

-------------------------------

Custom studies are useful when clarifying or reinforcing
related concepts together. Or not, the daily studies
can be used for that as well. 
Alternatively, allow unchecking done status, 
and just reorder related cards in the top.

-------------------------------

It's actually harder when there are lots of very
similar looking kanjis in one study session.
I don't know if this is a bad thing or not.

Well, no this is actually a good thing.
When learning cards, sort by filename
so cards with similar characters are grouped together.
(alternatively, on learning discovery mode, gets cards with common chars)
I made a little change to account for the difficulty.
The 3rd card stage would be PhraseInput,
and I would repeatedly do it, until I can do it correctly 
without peeking.

So basically, the difficulty of forgetting comes primarily
from not remembering it properly in the first place.
In other words, be more attentive, but not necessarily
think harder.

-------------------------------

Well, that sucks, I didn't notice the bug until now,
it made me review the cards too more than needed.
I'll have to fix the other bugs and add the improvements 
tomorrow before I do another test run.

-------------------------------
As I study more kanji, the more I notice
how subtly very similar kanjis are. I 
thought the similar kanjis would be less frequent,
but no, it's more common than I thought.
On the bright side, I can tell them apart
with enough repetition.

Today's result wasn't satisfactory, I have to admit.
I did try to digest more than 50 new cards at once.
I'll have to find that ideal learn/review ratio of cards.

Also, I did say using the app wouldn't incur mental effort,
but that doesn't appear to be true.
I feel tired after almost 5 hours of testing.
I'm guessing it's because of the bug,
and the fact I added too many new cards at once.
Still, there's still a hard limit on usage it seems?
Or was I too tense? Or was I too focused?

Yeah, I think it's PhraseInput. It demands too much
of my focus and attention. I may not be cognitively
exerting much effort, but it drains my focus, whatever
that means. I think I need a better design for 
recognition. PhraseInput is less recognition,
and more output from memory. I should probably
just improve PhraseSearch instead. 

No, like I said, reduce the number of hours first,
and less new cards a day. If that's still tiring,
then redesign a recognition trainer.
I did put more hours testing the other day,
and I wasn't as tired.

-------------------------------

Realistically, I don't think I can finish
a fully working prototype, not for unknown days more.
My mom is putting pressure on me again, so that 
makes it harder to work too.

The new plan then is, as soon as I confirm
effectiveness of the app, I will do a cleanup
and put the project on a public repo, and add
extensive readme, documentation and plans.
I will show to people who might be interested,
not necessarily end users, and then
I will use it to apply on job boards for 
jobs related to space repetition or learning.

Explicitly comparing it to anki seems like a bad
idea too, since that community have a cult-like
following.

-------------------------------
Aha, I have another idea. Not implementing it though yet,
just thought it would be a nice feature.

In the SearchTable, I could add a text box,
where I would paste a text, add it would
add all the cards with the matching words from the text.
I would study the cards, and later on see if I 
could guess or understand what the text means roughly.
It's immersion, and vocabulary building, in one go!?!

It's probably harder than it seems though, because 
of inflections. Or a letter by letter match seems
good enough.

Man, so much ideas, so little time and money.
Sucks to be me.

-------------------------------

Just a thought, avoid longer keywords,
or rather too many long keywords in one study session.
I realize there is too much to absorb per card:
meaning, sound, and the text. The unfamiliar individual
characters are by far the most difficult ones.
Shorter keywords helps transition into longer ones
as I get more familiar with characters.

Language isn't strictly heirarchical, but some words and
characters are dependent on others. What I'm saying is that,
mostly prioritize the non-compounds keywords.

And yet, why is difficulty a problem?
If I am testing the theory, difficulty should be irrelevant,
since the idea is with enough repetition in a short
spaced-out period of time, familiarity will follow naturally.

This does seem like a conflicting goal. No, finding methods
to make language learning smoother is a mere niceity,
but it isn't my goal. The app should be applicable more generally,
not just for language learning. So if a card seems difficult,
it may just need more time and iterations compared to others cards,
in addition to tweaking the interval times and break time.

I think PhraseInput is still it's too much effort.
Of course, when I'm actually doing the vocabulary building 
for real, I do need to keep in mind to do the non-compound words first.

-------------------------------

Once again, I just found out a big scheduling bug.
I've been wondering why I never get to the completed message
"All cards have been reviewed today".

And I realize I sort of want more control when
to stop, or at least, when to continue studying.
Cases I want to cover:
- I only want to correctly recall cards in the session once

planned changes:
- New unfamiliar cards needs to have a shorter interval
  when forgotten, I feel like there's too big of a gap
  show again at least once before ending the batch

- When is a card considered done for the day.
  I think this is something that should have a
  a simple criteria, like recalled once for the day.
  The reason being, a complex condition resembles
  an algorithm trying to predict or decide for me.
  If I feel like I'm not quite yet done for a card,
  there should just be an action to do so.

-------------------------------
Suppose the shortened spacing works, but takes a lot
from the mental effort, which should be preferred?
No, I designed the program specifically to address 
that issue of mental drain. Because if it something
tedious, painful or exhausting to use, then
I wouldn't use it consistency.
So if it takes a lot from me, then adjust
break time period and batch size, and limit 
maximum hours per day. I think 5 hours is too long
anyway to be a background activity for a day.

Wait, I should probably factor in the fact
I'm programming at the same time while testing it.
That probably compound the effect of fatigue on me.

-------------------------------

Fatigue aside, isn't forgetting often is precisely
how I wanted it to be? And that forgetting more often
early on speed up the process?
Why am I trying to fix it? I need to precisely define
my goals as they seem to be in conflict.

I sort realize now why forgetting is bothering me.
I internally equated forgetting frequently to mean
that the app is not working, hence a failure.
That mindset probably causes the fatigue as well.

I need to keep in mind to trust the process for now,
and avoid too much change on a whim.
I reverted back the change so that card stage progresses
slower.

-------------------------------

I spent some of my time today  
doodling ideas on my trusty rocketbook.
Along with some passive HN reading, 
I managed to draft some new nice ideas, 
which purports to fix and add improvements.
Why am I writing like this?
I dunno, I guess how I write reflects on
what I recently read.

Anyways, first of all, the HN article
"The suck", which as a summary states
that writing things down helps us
remember things, by way of neuro imprinting
or whatever that means.
In addition to studies supporting this claim
and to other testaments,
I can attest that writing things down does
indeed help. Of course, I'm assuming that
the claim universally holds for any condition
and for what kind of information, and what
volume. Well, obviously that can't be true,
but suppose that it holds for vocabulary building.

The clear downside of handwriting is that
it's slow and time-consuming, RSI-inducing
and produces a lot of waste on paper.

But with some creativity, those problems
can be worked around.

So why I haven't implemented a handwriting feature?
I saw some website that has a collection svg images
that show the handstrokes for each kanjis.
It looks tricky to integrate in my app, but doable.
The primary problem is that I'm not making an exclusive
japanese flashcard app. If I want to support other languages,
I have to find similar sites, with possibly different file formats.

The alternative is to let the user just trace over the text,
regardless how the user writes it. My concern is that the user
subconsciously trains how to write improperly. With that, I dropped
the idea since the difficulty of implementation is high and actual
effectiveness is low. 

Returning it to now, I just thought of another idea.
Instead of writing, I could just make it like coloring.
The user would just color over the text, like how I 
use my pen to color over the text on textbooks.
Isn't that the same tracing?
Nope. For instance, the letter A.
The user wouldn't just do three strokes, no.
The letter A will be shown in big ole 300px,
and the user will be making motions similar to
drawing, coloring over the text.

Wouldn't that take even longer?
And even more RSI?

Yes and yes, but actually yes and no.
The coloring feature will be only used
on difficult items, e.g. complex kanjis, 
and probably just one or twice. The important part is
that the user (me), pays attention to
every minute detail without needing
to learn how to write it.

Two questions:
1 why don't I just write it like goddamn normal person would do
  (on paper, or digitally with a mouse or any input device)
2 won't the color method be not as engaging,
  and therefore wouldn't have the same effect
  as actually writing it down? 

(1) means conceding defeat, it means there's only
one tried true method and no more room for any
progress or innovation, that it's done and
it's pointless to question it. It means we're still
stuck with a several centuries-old pedagogigal tool.
I'm not saying I'm going to yield results, but
that doesn't mean I wouldn't try.

(2) dunno, maybe, maybe not
If writing down means I'm taking time to slown
and pay more attention to details, then yes, maybe coloring would work.
But if it's related to muscle assisted memory, then no,
color method would probably not work. 
There's only one way to find out: implement it of course.

The coloring feature aside,
I devised a solution how to address
the seemingly conflicting goals of
making the app an efficient learning tool,
and making it less stressful.

-------------------------------

changes:
- change levels to proficiency, where proficiency is a number
   consisting of three parts (factors): tttsssmmm [text, sound, meaning]

- no more done status
  instead there will separate modes of study (names to change):
  - overview
    purpose: for a short, fixed time study
    this will go over all the cards in the collection
    at least once, and it's done.
    No need for scheduling on this mode, just go over
    through the card list in specified order.

  - grind
    purpose: for a possibly long, extended "lo-fi" study
    mainly for new cards that are still not learned or mastered
    basically a procratination mode, the cards will
    cycle one after another at no end
    this will use the proficiency factor

Separating it into two modes should simplify and fix
the conflicted scheduling that tries to preserve card
order, and at the same time prioritizes one after another. 

I'm considering removing the non-time based scheduling on the grind mode,
and use the regular interval scheduling, but still local for one study session.
The reason being, non-time based scheduling is hard to control
and harder to implement. Or maybe, probably because I just did wrong
due to conflicted goals. Still, interval scheduling is simpler,
and works better for longer stretches of time.

Are modes a good idea?

Here's a scenario: I start my day, use card discovery
to pick a couple of cards to review. Then I randomly
add several dozens of new cards to learn.

I use overview mode to quickly recall the review cards,
as well as go over the new cards quickly, and decide
if any cards needs removing. 

After I have settled down, my buttcheeks planted firmly in seat,
with coffee mug on my left hand, read a couple of HN submissions,
then I start the grind mode.
(okay, maybe grind is the wrong word for it)
After I finish a batch, I go back to HN or reddit, and muck around
some more. Repeat ad infinitum.

The idea is that learning (memorizing) volumes of volumes of mindless tidbits of information
(vocabulary building in my case), that requires little to no thinking,
could be done as a background, mostly passive activity.
Of course, it can on only be done along side other equally less-demanding
activities, like procrastinating on reddit/HN/youtube,
otherwise it would be a disrupting experience.
Maybe not so much if the break time set to longer period.

Some time later in the day, I needed to get up and do other things.
An hour or two later, I resume the app without any friction,
and procrastinate a bit.

Sounds reasonable so far.
What did I forgot to account for with the mode change?

I feel like I pivoted the goal from testing the theory of
bent curve to a study tool designed for consistent, less stressful
routines.

Why do I keep making changes? Shouldn't I just focus on the theory first?
Based on some cards I tested, I partially confirmed that it works,
not necessarily true in all cases, but for some cards. I am being
vague because I am not entirely sure myself. It works, but it's not 
clear yet how much of an improvement it is over the traditional space repetition.

So what's stopping me from further testing is that I encountered some problems:
1 it's more cognitively demanding than I expected (stressful)
2 it doesn't scale well
3 complex, highly detailed units of information (e.g. kanjis)

(2) is related to (1). If it's stressful (1),
or requires more effort, it means I wouldn't be able to do it consistently
without sacrificing other activities. (2) means I am not covering
cards fast enough. Not speedrun-fast, but a decent workable pace.

As for (3), there are some cards that are just hard to digest, or
to put in my short-term working memory, much less on my long-term memory.
The theory only presupposes that the word/card can be put in
the short-term memory first. I can't test the theory on things I can't
remember to begin with. (3) is also related to (1) and (2).

So the changes I've made and plan on making are designed to address
these problems. I will probably keep on tweaking until I've achieved
my ideal user experience.

The only reason I keep digging deeper further is because I personally
think my idea has a lot of potential, even despite going
through my internal critics. This is unlike the shitty
game I worked before this project. I knew deep inside
that game project was a dead end, partially because of the idea,
but also because I lack experience how to make engaging games.
(Also, I got bored with it)

-------------------------------

The other change, proficiency, is designed to level out the difficulty,
speficically, to maintain the RF (Recall/Forget) ratio close to 1.
Why a ratio of 1? Because a ratio too high means it is probably
learned or mastered, a ratio too low means is too difficult, or
in either case the algorithm is broken. 
With the proficiency number, the user
will alternate learning between the sound, text, and meaning.

For instance, if the user is well more familiar with the sound,
he would score likely score higher on it, like 00100902. [text=1,sound=9,meaning=2]
This would result in a high RF ratio, but still poor familiarity
with the card. To prevent this from happening, the program would
prioritize training the weakest part. The score above would not happen
because the sound would not reach 2 before the others reach 1 first.
If the user is weak on text, but strong on sound, he will forget just as much as
he remembers, until the user becomes strong on all factors.

The other benefit of 1 rf ratio is the psychological effect
of consecutively making mistakes and the impression of 
not making progress. Repeatedly making mistakes on its own isn't a
problem on other contexts, but on memorization, it's just a frustrating
experience. 

----------------------------
side note: if the rf ratio still grows too low despite the balancing effort,
switch to observation mode. That is, no testing will be done. The user
will be given activities (such as colorize) to increase familiarity with the material.
Count each observation as recalling the card, repeat until rf is at least 0.5.

What if just one factor lags behind?
Same, switch into observation mode.

----------------------------


Then after a certain point, the user would reach a proficiency of something
like 010010010 [text=10, sound=10, meaning=10]. The RF ratio would then
start to steer away to a higher number. I think this is fine, since
it signals a mastery over the card.

I'm still undecided if I should implement the compound factors:
[meaning+sound, meaning+text, sound+text, text, sound, meaning]
I think this is no longer necessary.
No, I think the error is requesting the user to remember 2 or more
things at the same time. What I should have done is only show
only one factor of detail, then request user to remember one other factor.

For instance:
- given sound, recall text
- given text, recall meaning
- given meaning, recall sound
- given meaning, recall text
- given text, recall sound

... and so on

The other error I've made is showing two factors at the same time. 
For instance, given sound+text, recall meaning.
If the user was already strong on sound, it would skew the result.
More atomic things to remember, and permutate all combinations
to gradually flood all neural canals with details. Man, anything
sounds smart if I add the word neural in it. Neural diarrhea?
Maybe not.

Again, previously I used the difficulty to maintain the RF ratio,
but with proficiency factors, this is no longer needed. In short,
no need for compound factors.

(I could generalize this to any number of parts, like to add images, but 
that will make it more complicated to implement. This is fine for now)

With this, the mental effort required to learn a card should ease down.
In other words, less stressful.
That's the idea, not sure how it would work in practice.

Edit: actually works well, it significantly reduced the mental load, and I learn the cards better

For cards that has passed a certain proficiency threshold (reviewing),
I think I can use compound factors here?
In grind sessions, cards will be scheduled once until it is recalled
correctly. If the user wants it to only show up once, there are other
modes for that.

Nope, doing that counts as deciding for the user.
If the user wants to grind/lo-fi study even for really familiar
ones, why should I prevent that? Maybe for reasons like
reinforcing associations between words in a single study session.
So, review cards will be scheduled the same as the learning cards.

----
aside: What about balancing of proficiency factors? Isn't that "deciding for the user"?
In this case, this is something the user can't easily decide on,
since the user has to do a lot of book-keeping. There should
at least a core set of features that "decides" for the user,
known as core features or program logic. Otherwise, the user
might as well use paper flashcards.
----

At the start of the grind session, all learning cards will
start with the same base interval (say 1m), and review cards
with interval (10m)

interval
break time

Not sure how would I go about this one: An ideal scheduler would be:
- usable for any stretches of time (like from 30m to 3h, at most for a day)
- can be interrupted and resumed any time
- helps ease difficulty
  if a user a having difficulty with a set of cards,
  difficult cards should be placed in one batch
  and avoid taking from the pile
   
how would the exponential increase in interval would apply here?
The increments are still exponential, but the user should not 
be able to notice it, not until it's large enough.
At some point, the card intervals would be large enough 
that the break time gets larger as well.

Either limit min/max break time, or ask user to add more cards
if current cards' interval has grown large enough, or both.

Show a message something like:
Break time will now be 30m. If this is too long, you can 
add more cards.

Too convoluted scheduling? Kind of.

Just sort list by lastUpdate. Graph break time over a sine function (from 2m to 10m and back).
If the cards seem to get repetitive, the user can add more cards.
on their own volition. Easing difficulty should probably not be part of the
scheduler. Will this work?

Almost, but the more difficult ones should appear more often.
Or maybe not? Goes against easing the difficulty. Not really,
if the factor balancing works as intended, then 
making it appear more frequent shouldn't affect difficulty.

[A B C D E F]
[B C D E F A] A was recalled
[C D E F A B] B was recalled
[D E C F A B] C was not recalled, put at middle


Example scenario:
I have around 100 cards in the pile for longish grind session.
If I merely sort by lastUpdate, I have to go over 99 cards
before I see the same card again. For new cards, that
would be a little too long.
What I want is that weaker cards to appear more often (not too often)
and stronger cards to appear less often. Slowly go over through
the pile, but not in one go.

What about:
just do it like how it's done before
Sort by due time (lastUpdate+interval)
interval increases on recall, decrease on forget,
but lower the max limit (like 5m, twice the break time)
With lots of cards in the pile, this should work as expected.

But if there are too few cards, there's a chance
that there wouldn't be any cards to schedule for a while.
Schedule anyway even if not due.

As it turns out, the behaviour I'm describing
is exactly what the 2 queues scheduling I'm using right now.
I just need to make some changes to use interval instead.

No, that one still too complicated.

Given a pile of cards [A, B, C, D, ..., Z]
initial state: 
- all cards are due

seleting next due card:
- starting from 0 index, pick the first N due cards, 
  and pick a random card as the next card to present

notes:
- the interval is used to give chance to other cards
  at some point all cards will all have identical 
  interval, which results in all cards having equal chance again,
  but actually only the first N-M cards with will be selected,
  over and over again
- the actual interval value isn't really important here
  my current implementation used batchID, which is similar
  to interval but abstracted from the time
  meaning, I change my mind and not use interval, but still
  use batchIDs
- why the actual interval value doesn't matter?
  because spacing is already done with the card number
  and the break time. If I want exponential spacing,
  I can just adjust it easily with having to adjust
  the intervals too
- there's still the problem the equalization of batchIDs
- instead of batchID, use frequency (regular integer)
  a card will be due if batchNum%frequency == 0
  a frequency of 0 or 1 means a card is due every batch
  2 is due every two batches, and so on
- I will use frequency instead of batchID because
  I can limit frequency at a max num, unlike batchID
  which indefinitely just keeps incrementing

- a would-be solution: if frequency > max, decrement
  frequency, but only decrement down until a certain
  point, not down to 0

- the resulting behavior would be that the card will cycle between
  from being more frequent, to less frequent, to midly frequent again,
  to less frequent again, and so on

- what happens when new cards are added? no special case handling needed,
  since they will start with 0 frequency, they will be scheduled sooner
  or later, depending on the current state, which is the expected behavior

- frequency is the wrong term here, since lower frequency means less often, 
  not the other way around
  just use infrequency (abbreviated to infreq)

- there's still a higher chance for the cards at the beginning of the pile,
  in cases where there are lots of cards with the same infreq
  prioritize cards with higher infreq when due
  dueCards.sort(byInfreqDesc).slice(0, N).randomSelect()

- I think that covers everything, since this is transient state,
  I actually don't need to put it in db 

- I used batchID before because I wanted a card to appear only
  once per batch, but that actually wasn't really an ideal behavior
  there are cases where I want a card to appear sooner, especially
  if it's a particularly difficult one
  I should just use counter in place or batchID
  counter increments for every card reviewed

- if there no due cards in the current batch, or
  there number of due cards less than expected (batch size),
  get the next cards that are to be due

Example case:
counter=4, A=6, B=7, C=3, D=5
Here, no cards are due yet, but sorting by next to due, 
it would be: D, A, C, B
ah what the heck, just use loops instead of finding
an short expression
but is the DACB right?
on counter=4, no due card
on counter=5, D is due
on counter=6, A,C is due
on counter=7, B is due

is it even possible to find the solution without  using a loop?
how to do I express the number that represents next-dueness?

how to compute maxInfreq
if it's too high, I get too many alternating cards, making it more difficult
if it's too low, it becomes ineffective at spacing out the cards
actually
since I found a solution to dueness, I don't need to limit
infreq and step size, it should still behave as expected

grind scheduling algorithm:
N = (just any arbitrary but reasonable number)
- new cards are given a 0 interval (unsigned)
- for every card review, interval += step
   where step = Math.min(consecRecalls + -consecForget, N)
- a card is due when counter%interval === 0
- to select which card to present:
  dueCards.sort(byInfreqDesc).slice(0, N).randomSelect()
- if no due cards are available for the current counter,
  keep incrementing counter until min(batchSize, numCards.length)

Yeah, this should be good enough, if it's not, I'd be
able to tell anyway when I test it

other things:
- persist counter on localStorage
- reuse interval, instead of infreq

-------------------------------
Proficiency implementation notes

I could use three numbers to represent the factor,
but adding more columns on the database is PITA.

Epiphany #169: Don't use a relational database when prototyping
and the data models still aren't clear or final.
Or maybe use one, but also use a high-level level library 
that abstracts over the database. I want everything in a type-safe
code, I don't like string mangling with sql. At this point,
I should have represented serialized state with just one big JSON file.
Hindsight is a bitch that slaps me way too late.

definition/terms:
- factor:           an atomic part of the card that needs to be learned
                    this doesn't include the example sentence and example audio
- presented factor: the factor to show to the user
- tested factor:    the factor the user must recall, given the presented factor

presented and tested factor must not be the same 

--------
Deciding which factors to present and test
***note: the tested factor must be selected first
         otherwise, the algorithm that follows will be broken 

selecting the tested factor:
- if all are equal, pick rightmost factor
- select the mid factor if consecForget = 1
- else if consecRecall > 0, pick the weakest factor  
- else if consecForget > 0, pick the strongest factor  

selecting the presented factor:
- if all are equal, random select
- pick the highest factor that will not be tested
--------



A sample case on a difficult kanji

cr -> consecRecall
cf -> consecForget
000 000 000  | 
             | present text, test sound 
000 001 000  | recalled, cr=1
             | present text, test meaning 
000 001 001  | recalled, cr=2
             | present sound, test text 
             | (text shouldn't be presented here)
000 001 001  | forgot, cf=1
             | present sound, test meaning 
000 001 002  | recalled, cr=1
             | present meaning, test text 
000 001 002  | forgot, cf=1
             | present meaning, test sound 
             | (meaning should be tested here)
000 002 002  | recalled, cf=1


Based on these rules, it can definitely happen
that the text factor here stays at 0, while
the sound and meaning keeps incrementing.
On the plus side, the rf ratio can be maintained at 1.
The downside is that it seems wrong.

If the difference between the strongest factor
and the weakest factor becomes greater than N (probably just N=2), 
then switch to observation mode as noted above.
For each observation, increment weak factor by 1.
Repeat until difference is 1.
Testing on other factors will not be done until
difference is restored.

This algorithm only accounts for new or learning cards.
For review cards, it's expected that rf steadily rise above 1
on few iterations.

-------------------------------
What happens if the user start with just two factors,
and then later on added another one.
For instance, the user started with text and meaning
and then added sound later, resulting in a proficiency like
[0, 5, 6]

I think the current algorithm would just work fine.
The only change I would do is on observation mode:
always show the presented factor before the tested factor.
In this case, the user will observe sound for 4 times.
This is expected, since the user is little stronger on
text and meaning, then he slowly associate it with
a sound. Yeah, this works fine.


-------------------------------
I think I need to be more clear with the terms I'm
using:

001002003 - proficiency

[1, 9, 3] - proficiency factors, or simlpy factors?

proficiency
{
  meaning: 1,
  text: 9,
  sound: 3,
}


are these also called factors?
factor data
成る
become
filename.ogg

after parsing card content, I would have something like
{
  ...,
  factors: {text: 0, meaning: 0, sound: null}
  factorData: {text: "成る", meaning: "become", sound: null},
}

-------------------------------

What about the part where tested factor is ambiguous,
and cannot be inferred from the presented factor?
For example, cards with [*] in them.

If it's ambiguous, there should be an option for the user
for a hint for disambiguation.
Alternatively, add context description for each card.

errant cases:
家 - has two readings (uchi, ie) but same meaning?
mou - same readings, different but related meaning

hayai - same as mou
for hayai I could just edit the cards and add 
contextual hints that wouldn't give the answer away
like time and speed

yeah, context hints seems better
just use code blocks `context hint here`
wait, wouldn't examples suffice as context hints?
no, too detailed and may be give away the meaning
but speed seems like a big hint too
okay, a better context hint would be a really short
example sentence without being too detailed

-------------------------------
card file format change

I'm thinking of removing the front/back
structure of card, and just use plain markdown
syntax for designating which is which

For instance:

===============================
~~~~~~~~~~sample card file contents~~~~~~~~~~~~~~~
@type: card|auto|factored

[必要](text) `context hint`
[media/JLPT_Tango_N5_0267-01.ogg](sound)
some random text here
blah


---------------------

> 私には沢山のお金が*必要*だ
[](media/JLPT_Tango_N5_0267-01.ogg)

[important, vital, requiredneed, necessary](meaning)
some notes here

Translation: I need a lot of money.

===============================

[redacted: Here, text is delimited with **word**, meaning with *some text*,
and the sound with a link to the filename. The text "sound"
is important here.]

The idea is to let the user format and present
the card contents, however they want, if it helps
with learning.

some problems:
- missing factors
  if there are less than two factors given, for now show error message
  if there only two factors, exclude missing factor from presentation/testing

- what if there multiple different **word** and *words*
  maybe I can just do 
  [必要](text)
  [important, vital, requiredneed, necessary](meaning)
  [filename](sound)
  then show warning if there are multiple conflicting entries in the card page
  yeah, this could work, at least I don't have to extend the markdown syntax

Okay, I changed my idea on this one. 



ProficiencyDrill
- type is explicitly set to factor
- or there are at least two factors available
- only this type of drill will update proficiency

CardDrill
- type is set to 2sided
- or there not enough factors available
-    and there is at one line ---

DocumentDrill
- type is set 1sided
- or there is no lines or any factors
- cloze over the text factors
- on [show], show all clozed texts


type DrillType = "factor" | "card" | "doc"
function getDrillType(card)  { }

-------------------------------
@type: factored

<some text here> -> recall meaning
[show]
-----

<some text here> -> <actual meaning here>
do you remember?
[yes] [no]

-----

<show all card contents here>
(wait for sounds to finish playing as usual)
[continue]

-------------------------------
@type: card
<front>
--------
[show]

<front>
--------
<back>

do you remember?
[yes] [no]

-------------------------------
I should use the remark library. It will
simplify rendering the card components:

<ReactMarkdown
  components={{
    // Map `h1` (`# heading`) to use `h2`s.
    h1: 'h2',
    // Rewrite `em`s (`*like so*`) to `i` with a red foreground color.
    em: ({node, ...props}) => <i style={{color: 'red'}} {...props} />
  }}
/>


-------------------------------

I found some nifty resources for jp immersion.
This note section is out of scope for this project,
thus will not be implemented as features here,
but it could be a later sibling project that
would complement this program.

As of now, I'm solving the problem of memorizing
large volumes of disjuncted information, e.g. vocabulary.

The next problem to solve would be literacy or fluency.
I'm deriving the previous idea of pasting a text and
then selecting the cards that matches the "words" in 
the text. I will build on that idea.

This is where tadoku.org comes in. The provided graded
books that designed to be accesible for all levels of 
readers by using furigana. It's a nice idea, but
I noticed one major flaw: I doubt you can learn
kanji by always showing the furigana. For me, 
I would focus mostly on the furigana, and hardly
on the kanji itself. The baffling part is that
they used images or pdfs, instead of html documents. It's
books like these that could benefit from even
a little interactivity. Wait, is this a general criticism
of furigana? Maybe, I guess there's a reason why japanese
discourage their use?

The other problem is that you still need a base level
vocabulary and grammar to read this. Otherwise it mostly 
incomprehensible input. Can't just I just infer
the meaning based on word usage? Okay, I read hiroshima.
Assuming I didn't know that hiroshima is a name of a place,
there's no way I could infer that. In short, level 0
is a nice way to get readers to start, but still misleading.

No, but their advice is to just read what you can understand.
Their actual wording is to just enjoy reading without translating,
or using a dictionary, and that the kanji will look familiar
eventually.

Nope, I like their base idea, but their marketing phrase is just plain
misleading, and the execution fell short. Am I not being
too uncharitable? Objectively speaking, no, even level 0
requires at least some little previous japanese knowledge.

There are two ways around this: I convert some books
in simple interactive documents, where the reader
could toggle between different scripts. It's written
in manga style though? Just photoshop the pictures
to remove the embedded text, just enough as proof of concept. 
Then I test it if it improves usability (for me).

The other solution is extract each word from a book,
then create a deck out of it. I grind the heck out of it,
until I'm comfortable with each word. Then I go back
to the book, actually read the goddamn thing.

Where's the solution? People do that already.
There's one tiny difference.
One approach is to study the most common words first.
Then start immersing, hoping to encounter those words.

In this case though, I study and master all the words
(and maybe grammar) first from a text (preferrably short texts like tadoku books)
before reading it, then read that text
with almost guaranteed 100% comprehensible input.
The difference is shortened feedback cycle from 
studying vocab to learning/application.

Of course, this study flow is especially supported 
with this app I'm working on. And all these I'm
working on aren't specific to japanese learning too.

I don't know, this is a half-formed idea anyway.
I will come back to this later on.

-------------------------------

While browsing reddit, I came across a post
about spaced repetition:
https://gist.github.com/busypeoples/6467e46ac618c7b2f09c30022c0c86db

I think the post was interesting, but my mind focused on how
spaced repetition was defined:
> more difficult flashcards are shown more frequently, 
> while older and less difficult flashcards are shown less frequently 

I thought, that can't be right, isn't spaced repetition about
adjusting review intervals to maximize study time and for increased
retention (by means of modelling the forgetting curve)? Almost
all spaced repetition resources define it this way, explicitly
or implicitly. All this time, I was challenging a specific
sub-definition and method of space repetition, popularized by anki
and friends.

While technically the ankiesque spaced repetition still fits the
definition, there is less emphasis on the difficulty, 
and more on gradual exponential increase in interval time.

Well, it doesn't matter how spaced repetition is defined, really.
It doesn't matter that popular usage appropriated the definition
to something else. I'm challenging how spaced repetition is done, as defined
by the current, dominant practices. 

The definition above was from wikipedia. Slight tangent, I remember
something about my university professor. I remember three things about her:
she was really moe, she smells nice, and she frequently would recite these
words in our heads: you can't directly cite a wikipedia page (or something like that).
Strangely enough, we were allowed to cite random blogs.

I don't care anyway where or who made the definition above. I
do wonder where my waifu teacher is now. Out of idle interest,
I scanned the wikipedia page. I scrolled to the Problems and
Contradictions and found some interesting paper, titled:

Spaced Retrieval: Absolute Spacing Enhances Learning Regardless of
Relative Spacing (2011)

I should preface that I am at most a layman that has no business
reading white papers. Anytime someone (from reddit) 
cites a really technical paper to support their argument confidently, 
I can only assume they have some prerequisite background to
read that, or are just full of shit.

Just this once, I'll be that guy full of shit, and argue with
myself. Well, not really argue, but to derive whatever insight I can
from this paper. Surprisingly though, the paper is readable, particularly
the intro and the discussion sections.

These are the interesting tidbits:

> The rationale for expanding the intervals between repeated tests rests 
> on two important assumptions. First, gradually expanding the interval 
> between tests should increase the difficulty of repeated retrievals. 
> Second, a pattern of increasing retrieval difficulty should enhance long-term retention

> ... repeated tests occurred in expanding, equally spaced, or contracting schedules did not produce any
> measurable impact on long-term retention. This finding contradicts
> the idea that expanding schedules should be inherently superior to
> other schedules ...

> However, these patterns of increasing retrieval difficulty were
> not associated with greater levels of final recall. Instead, patterns
> of increasing retrieval ease were associated with increases in final
> recall ...

Interesting stuffs! Spaced repetition, as defined by anki and friends,
did not produce measurable impact on long-term retention, and that
it is not inherently better than any other spaced repetition methods.

I should say that I am not necessarily believing what this paper has concluded,
but I'm just happy to see that people are actually criticizing or challenging
widely accepted scientifically "proved" assertions. People arguing
in good faith, science as it should be, not about establishing immutable
truths? I need to continue reading Popper again.

I will have to continue this tomorrow. I have much to say about this paper.
Also, this paper is from 2011, maybe there have been more refutations since then.

-------------------------------

home page

Cards for today
[add cards/edit] [start]
 filename    RFR    done
> aaa        1      ✓
> bbb        0.5    ✓
> ccc        1      ✓

* RFR: recall-forget ratio

-------------------------------

Custom studies for today [create]
name        actions
test1       [go][edit]
test2       [go][edit]


[view history]

-------------------------------

search |                    |
<table>

selected cards:
<list>

study name: |             |
or
study name: {prop.studyName}
or 
(none) {prop.studyname if default}

[submit][cancel]

-------------------------------

TODO: -if q2 is too large, then q1 never gets dequeued
      always take at least 1 from q1 per batch
TODO: sort by filename length
TODO: play audio when PhraseInput is correct 

TODO: increase break time interval
      when there are less cards
      at least it gives the option of
      studying, say 5 cards only, for a day

TODO: maybe allow unchecking the done 
      not sure if this feature makes sense yet

TODO: remove italicized styling on keyword
TODO: test new changes
     add numRecall, numForgot to study_session_cards
     - if a review card is forgotten 10 times, consider it done for the day
     - if a review card is recalled 5 times, consider it done for the day

  - fix PhraseSearch, limit and randomize added suffix

   - filter out done cards, unless the user explicitly unfilters them
     gray out done cards
     if the number of cards is less than the minimum, prompt user
   
   - alternatively, increase break time if number of cards is less
     than the minimum

---------------------------------

TODO: make notification more intrusive and annoying
TODO: add more info on break time page
TODO: add more space between yes and no
      make it bigger

TODO: fix bugs in release build
TODO: put batchID and batchNum on database
      or not, just put it in localStorage
      it's just a transient state anyway

TODO: - card flags (disabled) # for the trivial ones, or the already fully memoried
      - add also card options section
      

TODO: discovery mode 
TODO: custom studies

-------------------------------------------

TODO: just show notifications periodically
until user switches back to the app,
since the window API of wails is actually
buggy at the moment. Also, notifications
and letting user to manually switch to other apps
would work well with mobile platforms too,
if ever I decided to porting this to mobile.

-------------------------------
TODO: add shuffle on selected search cards
TODO: add random (new) cards
TODO: add random (probably forgotten) cards
      where probably forgotten means a card hasn't
      been viewed for days


TODO: sort cards by kanji found in
https://github.com/scriptin/topokanji

TODO: color-code card search

TODO: redo user introduction

--------------------------------

TODO: try to scape data from https://www.kanshudo.com/collections/vocab_usefulness2021
into a deck, it seems to be a cleaner/curated deck compared to the deck I'm using
Or try the pro version, maybe the download feature includes a json file?

On second thought, they probably have usage restrictions.
A better, free approach would just take their top N kanji list,
create a silly example or stories with them, use a decent TTS
and bundle them up into a deck+short book.
The idea is to have a list of related words, put them
into a chapter+list of words for spacing review.


-----------------------------------

TODO: cleanup, bug fixes
      release prototype build
      - use immer?
      - remove crawler code
      - namespace _Component {} //...
        const Component = _Component.View

TODO: add 3 more decks
      - 1 swedish
      - obscure or uncommon words
      - random facts

TODO: add a WSIWYG markdown editor for non-tech users
      (there's surely a dozen to chose from)
      remove custom markdown syntax

TODO: deck about / info page (like in anki)
      info.md

TODO: fix build
      - audio not playing
      - do not include wails.json
      - embed schema.sql

TODO: card scheduling and spacing
What name should I use for the algorithm?
I did create a new algorithm ... right?
It's not like it has a formal mathematical model,
but it's still well-defined with finite steps.

ebisu
sm-2

TODO: read subreddits.txt
      shuffle batch
      add option to disable crawling
      add option to download next batch

TODO: group distractions by folder

TODO: write reddit crawler
include search results
https://www.reddit.com/subreddits/search.json?q=goats&include_over_18=on


app.exe
dataDir/
  data.sqlite3
  interests.txt
  subreddits.txt
  distractions/
	reddit/
		meme1.jpg
		meme2.png
		unepxected.mp4

	# downloading youtube videos isn't a good idea
	# since they could easily fill up the user's disk space
	video-title.yt.txt # contents = id or url
	links.yt.txt

	| get N random, cueVideoByUrl() each
	historical-arts/
		art1.jpg
		art2.jpg
    some-quote.txt
	plaintext.txt
  decks/
    deck1/
	deck2/

// on app startup
updateRenamedFiles() {
	// get rows from db, get rows with missing files
	// foreach file in dir
	//   if md5(file) in missing files
	//      update row
	// remove rows with missing files
}
// just fs watch the decks and distractions
// and update row with matching old filename

buildFileIndex() {
	// list files in dir
	//  if no file matching file, create entry
	//  else md5 mismatch, update md5
}


nextRedditPost()
consumeRedditPost(post) // deletes from table
fetchDistractions()
  fetchRedditPosts()
  fetchYoutubeLinks()


