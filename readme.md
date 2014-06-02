
# qTypes

This is a real simple rule based question classifier inspired by this paper.

http://cogcomp.cs.illinois.edu/Data/QA/QC/definition.html

Using Trec 10 Labled questions from : http://cogcomp.cs.illinois.edu/Data/QA/QC/

## Usage

    npm install qtypes

## API 

    classify("How many steps from here to Alaska?"); 
    // NUM:count

    questionType("How many steps from here to Alaska?"); 
    // WH
    Returns 
    	- CH: Choice or Alternate Question
      - WH: QWord Question
      - YN: Yes/No Question
      - TG: Tag Question

    assert("file", callback)

See the test file for an example.

Results in sample questions are roughtly 
80+% on course features and 75% on finer sub categories

    { coarse: 80.19603920784157, fine: 71.37427485497099 }

 