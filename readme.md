
# qTypes

This is a real simple rule based question classifier inspired by this paper.

http://cogcomp.cs.illinois.edu/Data/QA/QC/definition.html

Using Trec 10 Labeled questions from: http://cogcomp.cs.illinois.edu/Data/QA/QC/

Results in sample questions are roughly 80+% on course features and 75% on finer sub categories

    { coarse: 80.19603920784157, fine: 71.37427485497099 }

## Usage

    npm install qtypes

## API

* `classify(question)`

Returns a question type and subtype, for example:

```
const class = classify("How many steps from here to Alaska?");
console.log(class);
// NUM:count
```

* `questionType(question)`

Returns a coarse question type:

	- CH: Choice or Alternate Question
  - WH: QWord Question
  - YN: Yes/No Question
  - TG: Tag Question

```
const type = questionType("Is Sandy still at home or did she already leave for the party?");
console.log(type);
// CH
```

* `isQuestion(question)`

Returns true/false depending upon whether the string is a sentence or not.

```
const question = isQuestion("How many steps from here to Alaska?");
console.log(question);
// true
```

See the test file for further examples.
