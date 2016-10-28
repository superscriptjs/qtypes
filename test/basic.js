import norm from 'node-normalizer';
import should from 'should';
import readline from 'readline';
import fs from 'fs';

import ruleClassifier from '../src/classify';

const createReadlineStream = function createReadlineStream(fileName) {
  const rd = readline.createInterface({
    input: fs.createReadStream(fileName),
    output: process.stdout,
    terminal: false,
  });

  return rd;
};

const testTagQuestions = function testTagQuestions(fileName, done) {
  const rd = createReadlineStream(fileName);
  const failedTests = [];

  rd.on('line', (line) => {
    const cleanedSentence = ruleClassifier.clean(norm.clean(line));
    const result = ruleClassifier.questionType(cleanedSentence);

    if (result !== 'TG') {
      console.log(`Expected 'TG', got '${result}' for sentence '${cleanedSentence}'`);
      failedTests.push({ cleanedSentence, result });
    }
  });

  rd.on('close', () => {
    failedTests.should.be.empty();
    done();
  });
};

const testAltQuestions = function testAltQuestions(fileName, done) {
  const rd = createReadlineStream(fileName);
  const failedTests = [];

  rd.on('line', (line) => {
    const cleanedSentence = ruleClassifier.clean(norm.clean(line));
    const result = ruleClassifier.questionType(cleanedSentence);

    if (result !== 'CH') {
      console.log(`Expected 'CH', got '${result}' for sentence '${cleanedSentence}'`);
      failedTests.push({ cleanedSentence, result });
    }
  });

  rd.on('close', () => {
    failedTests.should.be.empty();
    done();
  });
};

const testQuestions = function testQuestions(fileName, done) {
  const rd = createReadlineStream(fileName);
  const failedTests = [];
  let lineCount = 0;

  rd.on('line', (line) => {
    lineCount += 1;

    const match = line.match(/([A-Z]+):([a-z]+) (.+)/);
    const cat = match[1];
    const subcat = match[2];
    const sentence = match[3];

    // Why does this fail more tests when norm.clean() is used as well?
    const cleanedSentence = ruleClassifier.clean(sentence);
    const result = ruleClassifier.classify(cleanedSentence);

    if (result !== (`${cat}:${subcat}`)) {
      const log = `Expected ${cat}:${subcat}, got ${result} for sentence '${cleanedSentence}'`;
      failedTests.push(log);
    }
  });

  rd.on('close', () => {
    let ratio = ((lineCount - failedTests.length) / lineCount) * 100;
    ratio = ratio.toFixed(2);
    console.log(`Passed ${lineCount - failedTests.length} out of ${lineCount} (${ratio}%) tests.`);
    ratio.should.be.above(70);
    done();
  });
};

describe('qtypes', () => {
  describe('question classification', () => {
    it('should correctly classify tag questions', (done) => {
      testTagQuestions('./data/tagQuestions.txt', done);
    });
    it('should correctly classify alt questions', (done) => {
      testAltQuestions('./data/altQuestions.txt', done);
    });
    it('should classify random questions with reasonable accuracy', (done) => {
      testQuestions('./data/500q.txt', done);
    });
  });
});

// // Alternative question or Choice Questions
// // http://aclweb.org/anthology/Y/Y00/Y00-1037.pdf

// ** Can you give me an example of a living animal?
// ** Can you tell me the name of a famous actor?
// ** CAN YOU TELL JOKES
// ** Is the capital of Italy Milan?
// ** Name something you would find on a beach.
// ** Name something you would find at the North Pole.
// ** CAN I HAVE A PICTURE OF YOU
// ** Can you name two of Earth's oceans?
// ** Milk comes from what animal?
// ** Are you going on vacation this year?
// ** Will you teach me something?
// ** May I tell you a joke?
