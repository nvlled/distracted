While browsing reddit, I came across a post https://gist.github.com/busypeoples/6467e46ac618c7b2f09c30022c0c86db

I think the post itself was interesting, but my mind focused on how spaced repetition was defined:

> more difficult flashcards are shown more frequently, 
> while older and less difficult flashcards are shown less frequently 

I thought, that can't be right, isn't spaced repetition about
adjusting review intervals to maximize study time and for increased retention (by means of modelling the forgetting curve)? Almost all spaced repetition resources define it this way, explicitly
or implicitly. All this time, I was challenging a specific sub-definition and method of space repetition, popularized by anki
and friends.

While technically the ankiesque spaced repetition still fits the definition, there is less emphasis on the difficulty,  and more on gradual exponential increase in interval time.

Well, it doesn't matter how spaced repetition is defined, really.
It doesn't matter that popular usage appropriated the definition to something else. I'm challenging how spaced repetition is done, as defined by the current, dominant practices. 

The definition above was from wikipedia. Slight tangent, I remember something about my university professor. I remember three things about her: she was really moe, she smells nice, and she frequently would recite these words in our heads: you can't directly cite a wikipedia page (or something like that).
Strangely enough, we were allowed to cite random blogs.
I thought it was to deter laziness of finding sources, but no,
it was because anyone can edit wikipedia. That's probably true in those earlier days. What class was this again though? Pretty sure it was for english research writing.

I don't care anyway where or who made the definition above though. I do wonder where my waifu teacher is now. Out of idle interest, I scanned the wikipedia page. I scrolled to the Problems and Contradictions and found some interesting [[KarpickeBauernschmidt2011.pdf|paper]], titled:

> Spaced Retrieval: Absolute Spacing Enhances Learning Regardless of Relative Spacing (2011)

I should preface that I am at most a layman that has no business reading white papers. Anytime someone (from reddit)  cites a really technical paper to support their argument confidently,  I can only assume they have some prerequisite background to
read that, or are just full of shit.

Just this once, I'll be that guy full of shit, and argue with
myself. Well, not really argue, but to derive whatever insight I can from this paper. Surprisingly though, the paper is readable, particularly the intro and the discussion sections.

These are the interesting tidbits:

> The rationale for expanding the intervals between repeated tests rests  on two important assumptions. First, gradually expanding the interval between tests should increase the difficulty of repeated retrievals. Second, a pattern of increasing retrieval difficulty should enhance long-term retention

> ... repeated tests occurred in expanding, equally spaced, or contracting schedules did not produce any measurable impact on long-term retention. This finding contradicts the idea that expanding schedules should be inherently superior to other schedules ...

> However, these patterns of increasing retrieval difficulty were not associated with greater levels of final recall. Instead, patterns of increasing retrieval ease were associated with increases in final recall ...

Interesting stuffs! Spaced repetition, as implicitly defined by anki and friends, appears not to have any measurable impact on long-term retention, and that it is not inherently better than any other spaced repetition methods.

I should say that I am not necessarily believing what this paper has concluded, but I'm just happy to see that people are actually criticizing or challenging widely accepted scientifically "proved" assertions. People arguing in good faith, science as it should be, not about establishing immutable truths? I need to continue reading Popper again.

I will have to continue this tomorrow. I have much to say about this paper.  Also, this paper is from 2011, maybe there have been more refutations since then.

---

Okay, I have read the paper more in depth. I highlighted and added annotations, but sadly they are now gone a day after. LOL. That is going to be the last time I'm relying on annotations on PDF files. Anyway, I still somewhat have the notes in my head.

First things first, the definitions (as I initially confused the terms):
- absolute spacing: the total number of trials that occur between all repeated tests
- relative spacing: the repeated tests are spaced relative to one another
- relative spacing schedules: either expanding, equally spaced, and contracting

As I understand it, the terms absolute and relative spacing here are irrelevant for me outside this discussion, since the researchers only used them particularly for their research method. The most relevant one is the type of relative spacing schedule used here.

In summary, I do not dispute with the results, but I do not entirely agree with the final remarks. In particular:

> whether repeated tests occurred in expanding, equally spaced, or contracting schedules did not produce any measurable impact on long-term retention

I have two interpretations on the phrase `did not produce any measurable impact on long-term retention`.  One interpretation is that it's useless for long-term retention. This is clearly false, because otherwise current spaced repetition apps are all snake oils, mine included!

The second likely interpretation is that the impact is measured in relation to other scheduling. The following sentences imply that it is indeed the second one (comparing which is superior):

> This finding contradicts the idea that expanding schedules should be inherently superior to other schedules, but the results are consistent with a growing literature that suggests that the relative spacing of tests may not matter much for long-term retention

The use of the word "superior" here is interesting. If we (me and the researchers) only look at the particular results, then, yes, it doesn't matter what relative spacing schedules is used, because they produce the same result in the end. But, one thing they failed to mention or to account for is the overall time incurred when learning, especially when considering the following: 

> Repeated retrieval with long intervals between each test produced a 200% improvement in final recall relative to repeated retrieval with three massed tests

Expanding scheduling has the clear advantage here, since a fixed scheduling paired with really long intervals will result in a wide time gap between the time from first study to long-term retention. It's not viable for any short or mid-term studying.

Interesting, but the question is, why does this work? Is there an explanation for this? Without looking up the actual reason, my guess (and based on the other related sources I've read) is that spacing results in forgetting, and forgetting then recalling results to reinforced retention. 

Longer intervals means higher chance of having forgotten it. (Or not necessarily forgotten, but pushed at the way back of the mind, whatever the  actual term for that.)

And it all makes sense now. This is why anki and friends use expanding scheduling, and why they tweak their algorithm so much to model the forgetting curve. They have based upon the idea that spacing undisputably works (which I have as well), and focus their further work on optimizing the amount of time to learn and minimize the number of redundant reviews.

But! There is an assumption that you can only do spacing by means of time, that you have to wait for a certain amount of 
days to wait and forget. There is also the problem of accurately modelling the curve. So the further question is, how much more time-efficient the expanding scheduling can get? And is the forgetting curve model the only way to create more time-wise efficient scheduling?

The project I've been working seeks to answer those questions.

Aside: But why do we have to forget more to remember better? We can perfectly remember some things without forgetting them first.

---

So what does this mean for me? Not much really. It changes nothing for me. I have gained valuable insights, and I feel more positive and confident about what I'm exploring.

There's also one more slightly important takeaway from this paper. Programs that use expandng scheduling (in particular, the ones that tries to model the forgetting curve) offers no better advantage or improvement when it comes to _long-term retention_, in comparison to other programs that uses simpler or less sophisticated spacing algorithms. In short, as long as we review something every now and then (weeks or months in between) for a greater number of times, we will remember it for the long-term, however inefficient and tedious it may be.

The time-inefficiency of reviewing is the very source of my ails though, and the very reason why this projects was started. If can I can put more items in my long-term memory for a shorter interval and for lesser effort and stress, then the sooner I can proficiently use them for immersion or output.

---

Edit:
Thanks to losing my annotations, I tried to remember recall the importants points. I wrote the text above without rereading first. But I forgot some of the points listed below.

The key points in the paper are:
1. increasing the absolute spacing of repeated tests enhances long-term retention
2. repeated retrieval with long intervals between each test produced a 200% improvement in final recall
3. expanding retrieval schedules tended to produce patterns of increasing retrieval difficulty
4. patterns of increasing retrieval difficulty were not associated with greater levels of final recall
5. patterns of increasing retrieval ease were associated with increases in final recall
6. that initial retrieval ease is associated with greater recall 

What I've said in the previous section still applies, but with some addendum here for the omitted points.

(1) means that the more we review something, the more we will remember it more (for long-term recall, but does this apply to short-term as well? Not necessarily in my experience.).  (2) means that (1) is more effective if we put some time in between reviews. The longer spacing, the better recall, but also longer time to learn.

(3) means expanding retrieval scheduling (what anki does) results to more (how much?) difficulty in remembering, but this added difficulty did not necessarily improve long-term recall (4).

Most importantly (5) and (6) supports what I'm doing with the balancing of proficiency factors. If I may allow to brag, I am amazed I was able to come to the same conclusion with the other researchers, but through my own intuition and experience. 

(3) and (4) also affirms my own experience, hence my initial distate to anki's scheduling.

Am I not being too biased in finding flaws on anki and friends? No, this paper contends that anki are snake oils. I gave my arguments why this is not true. But I also highlighted the points why anki (well not particularly anki, but expanding algorithms in general) isn't the holy grail, as some people would like to believe.

That all said, nothing is conclusive yet (since there are cited studies that are somewhat conflicting). The points here listed
are merely insights to guide what I should do. It remains to be seen if this project would yield meaningful results. Larping as a researcher if fun and all, but I should focus on finishing my project first.

---

Another accessible paper I would like to read is the ones that discusses if output affects retention, and if so, how much.

---

Revised summary of my takeaways and insights:
- a
- b
- c