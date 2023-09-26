2022-10-07
From what I wrote before: ![[random noise text generator]]
The current implementation is indeed unsatisfactory, as I could easily pick up unrelated clues on what the correct answer is, without actually knowing the actual answer. That is terrible, since I'm not actually learning.

In addition to the random text generator, I'm thinking of adding something to disrupt short-term recall. For instance, after viewing 頭, I will briefly show something completely unrelated, like an image, then return back to the text search. This is try to jog the memory, for purposes of forgetting sooner.

The image shown will come from a folder of images, and can be freely added or modified by the user. I will also show this image in-between cards. This momentary distraction is different from break time. The distraction is at most seconds, and break time can last for minutes.

---
Instead of referring to unicode character ranges, I could just get the code point and increment/decrement that to get related characters. Amusingly, getting characters near 南 gets me the swastika,  卐 and 卍, which I just learned is an actual kanji character too. I wonder why it's included in the  **[CJK characters](https://en.wikipedia.org/wiki/CJK_characters)** and not in the hindu symbols?

---
Okay, one downside of just getting adjacent code points is that I get exposed to some obscure characters that aren't really used in practice, or characters only used in other languages (like chinese). I can just check use regex for kanjis, but since I'm not just exclusively generating characters for japanese, that wouldn't work.

Well, I guess it doesn't matter. It's not like I'd remember the obscure ones anyway. It'd be pretty impressive if I remember and learn them just by skimming the noise.