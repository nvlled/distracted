Here's a problem:
Given a text generate a random text for the purpose of recognizing the text among the noise

Example: I'm learning to recognize the text 頭, and I have to find it among the noise text
```
布財財辞布食事書辞頭財布堂布布 
財辞食書布事書橋辞事頭辞布辞財 
食布辞布橋食財堂橋財橋財頭財橋 
辞食書事橋書事橋布財書辞事橋頭
```

What I'm doing now is select all other characters from a selected other texts, then random-inserting based on that noise. This works fine as of now, but more generally, I want to generate other related characters just based on the input text alone. 

Conveniently, there's this unicode chracter range https://jrgraphix.net/r/Unicode. I could just select the matching ranges and produce random characters based on that. I think this is relatively simple to implement, but I will defer from doing right away as I have other things to do.