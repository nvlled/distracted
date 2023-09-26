# distracted

[![demo](https://i.ytimg.com/vi/Q3oNS4FsT1o/maxresdefault.jpg)](https://www.youtube.com/watch?v=Q3oNS4FsT1o "demo")
(Click to watch demo on youtube)

# About

This is a card-based study tool that uses spaced repetition,
conceptually similar to anki. The goal is accelerate memorization
from short-term to long-term memory in less time.

## Theory of distorted forgetting curve

The project is premised on the idea that
a fact/knowledge is better retained the more it is forgotten and recalled.
With enough repetition of forget-remember cycle, a memory would be put
to long-term memory in less amount of time (in theory).
Unlike anki which tries to model and maximize the forgetting curve,
this project makes no effort in modeling the curve.
Instead, it presupposes that the curve, whatever shape it may be,
can be bent to a reduced, simplified form.

For this to be possible, one must be able to forget something
sooner. How to forget something, aside from the passge of time?

I can't at will forget my name, but that's because
it's already entreched in my long-term memory. But for instance,
I want to remember a random, isolated information, like the number **843294831279**.
This is relatively easy to put in short-term memory, but also
quite easy to forget in the long-term. If I want to remember it
for longer periods of time, I could try periodically reviewing it,
say everyday. This may take a long while, and could have excessive
or redundant reviews since it might not be fitting the forgetting curve.

What I want is to forget it sooner than normal, making the reviews
more effective and shorter. There are plenty of possible ways how to
forget something, but these what I came up with:

- **Information overloading**. Basically, trying to memorize another
  fact right after memoring the other one. For instance, I managed to memorize **1283123713** for now.
  To make me forget this sooner, I will then try to learn or memorize other information,
  like **573573475** or **jaodsifjaosdf**, a whole bunch of them. It's irrelevant whether
  I memorize the other two, they are just noises, and my focus is on **1283123713**.
  There's one big downside to this approach in my experience, and it's that
  this process is cognitively demanding, it would tire me out very quickly.

- **Distraction**. Similar to information overloading, but more relaxed
  and less effortful. I haven't tried this approach that much yet if it works.

- **Increased difficulty**. Something that is complex and difficult to remember also
  has the higher tedency to be forgotten.

In this project, I mostly opted for information overloading.

## Issues and project status

If you are from somone in the academia, you are probably begging
for citations at this point. Where are the papers that back up what I believe?
Zilch, nada[1]. I won't even dare call any of this science.
This project is just a personal research that has the goal of solving
a problem I have. I was really reluctanct to put this project in
a public repository, and expose my self as a phony larping researcher.

I have long discontinued this project. But recently, I needed
some stuff to put in my dearthly portfolio for work applications,
so I dug this up again, and added some readme.
Hence, despite my reservations, I decided to just put this in a public repo anyways.
I spent at least a month working on this one,
it'd be a waste to let this rot into oblivion.

I'm not planning on continuing this particular project though, but
I'm still open to continuing the "research" sometime in the future.
I don't like how this project turned out. It's buggy, it's slow,
and it has terrible UI. I'd rather start anew from scratch with
an simplified UI and a simpler tech stack.

[1] Well actually I have notes somewhere in this repo.

## Dependencies

- go compiler
- node runtime
- [wails](https://wails.io/) v2.3.1

## Development

I left this project in a half-working state, and I have
zero reasons to fix anything or maintain it. I doubt
I could make this project run on another computer, but
here are the instructions anyways:

1. Install dependencies (see also wails dependencies)
2. Download and extract data.zip into the project folder
   the data/ must contains something like data.sqlite3.
   This contains the cards from the the [AJT anki deck](https://ankiweb.net/shared/info/917377946)
   that are converted into markdown.
3. Run `$ wails dev`
