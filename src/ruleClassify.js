import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import posTagger from 'parts-of-speech';

const tags = {
  wword: ['WDT', 'WP', 'WP$', 'WRB'],
  nouns: ['NN', 'NNP', 'NNPS', 'NNS'],
  verbs: ['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ'],
  adjectives: ['JJ', 'JJR', 'JJS'],
};

const _is = function _is(pos, _class) {
  return !!(tags[_class].indexOf(pos) > -1);
};

const lastPos = function lastPos(pos) {
  const l = pos.length;
  if (pos[l - 1] === '.') {
    return pos[l - 2];
  } else {
    return pos[l - 1];
  }
};

const lastWord = function lastWord(words) {
  const l = words.length;
  if (words[l - 1] === '?' || words[l - 1] === '.' || words[l - 1] === '!') {
    return words[l - 2];
  } else {
    return words[l - 1];
  }
};

const readLists = function readLists() {
  const data = {};
  const dir = path.join(__dirname, '../data/list/');
  const fileNames = fs.readdirSync(dir);
  fileNames.map((fileName) => {
    const contents = fs.readFileSync(dir + fileName, 'utf-8');
    const lowerFileName = fileName.toLowerCase();
    data[lowerFileName] = contents.split('\n');
    data[lowerFileName].forEach((line) => {
      return line.toLowerCase();
    });
  });
  return data;
};

const replaceAll = function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
};

const lists = readLists();

const clean = function clean(sen) {
  sen = replaceAll("What 's", 'what is', sen);
  sen = replaceAll("Where 's", 'where is', sen);
  sen = replaceAll('In what', 'what', sen);

  sen = sen.replace(new RegExp('approximately how', 'i'), 'how');
  sen = sen.replace(new RegExp('about how', 'i'), 'how');
  sen = sen.replace(new RegExp('in what', 'i'), 'what');
  sen = sen.replace(new RegExp('in which', 'i'), 'which');

  sen = replaceAll("'", '', sen);
  sen = replaceAll('`', '', sen);
  sen = replaceAll("'s", '', sen);
  sen = replaceAll(' s ', ' ', sen);

  return sen;
};

class ListSet {
  constructor(words) {
    this.listSet = [];
    this.words = words;

    let n = 0;
    words = words.map(word => word.toLowerCase());
    words.forEach((word) => {
      const listSet = [];
      for (const list in lists) {
        if (lists[list].indexOf(word) !== -1) {
          listSet.push(list);
        }
      }
      if (listSet.length !== 0) {
        this.listSet.push({ word, list: listSet, position: n });
      }
      n += 1;
    });
  }

  // This Loops though the words and not the list items, so pos is the actual word pos
  inWordList(listName, pos) {
    const ln = listName.toLowerCase();
    for (let n = 0; n < this.listSet.length; n++) {
      if (this.listSet[n].position === pos && this.listSet[n].list.indexOf(ln) !== -1) {
        return true;
      }
    }
    return false;
  }

  inList(listName, pos) {
    const ln = listName.toLowerCase();
    for (let i = 0; i < this.listSet.length; i++) {
      if (pos !== undefined) {
        if (i === pos && this.listSet[i].list.indexOf(ln) !== -1) {
          return true;
        }
      } else if (this.listSet[i].list.indexOf(ln) !== -1) {
        return true;
      }
    }
    return false;
  }

  first() {
    const args = Array.prototype.slice.call(arguments);
    if (args.length === 0) {
      // Return true / false if we have a listSet[0]
      return !!(this.listSet[0]);
    } else {
      // Assuming 1 arg
      return this.inList(args[0], 0);
    }
  }
}

const listify = function listify(words) {
  return new ListSet(words);
};

const chain = function chain(...args) {
  const words = args[0];
  const lookup = args.slice(1);

  for (let i = 0; i < words.length; i++) {
    if (words[1] && words[i + 1]
      && words[i].toLowerCase() === lookup[0].toLowerCase()
      && words[i + 1].toLowerCase() === lookup[1].toLowerCase()) {
      return true;
    }
  }
  return false;
};

const findCode = function findCode(nounSet, listSet, words, sen, depth = 0) {
  let code = '';

  if (depth === 5) {
    return '';
  }

  if (nounSet.first()) {
    if (nounSet.first('num')) {
      code = 'NUM:other';
    } else if (nounSet.first('speed')) {
      code = 'NUM:speed';
    } else if (nounSet.first('dimen')) {
      code = 'NUM:volsize';
    } else if (nounSet.first('date')) {
      code = 'NUM:date';
    } else if (nounSet.first('money')) {
      code = 'NUM:money';
    } else if (nounSet.first('code')) {
      code = 'NUM:code';
    } else if (nounSet.first('peop') || nounSet.first('prof')  /* || nounSet.first("sport")*/) {
      code = 'HUM:ind';
    } else if (nounSet.first('group') || nounSet.first('comp')) {
      code = 'HUM:gr';
    } else if (nounSet.first('job')) {
      code = 'HUM:title';
    } else if (nounSet.first('country')) {
      code = 'LOC:country';
    } else if (nounSet.first('state')) {
      code = 'LOC:state';
    } else if (nounSet.first('city')) {
      code = 'LOC:city';
    } else if (nounSet.first('mount')) {
      code = 'LOC:mount';
    } else if (nounSet.first('loca')) {
      code = 'LOC:other';
    } else if (nounSet.first('prod')) {
      code = 'ENTY:product';
    } else if (nounSet.first('art')) {
      code = 'ENTY:cremat';
    } else if (nounSet.first('food')) {
      nounSet.listSet.shift();
      const code2 = findCode(nounSet, listSet, words, sen);
      code = (code2 !== '') ? code2 : 'ENTY:food';
    } else if (nounSet.first('plant')) {
      code = 'ENTY:plant';
    } else if (nounSet.first('lang')) {
      code = 'ENTY:lang';
    } else if (nounSet.first('substance')) {
      code = 'ENTY:substance';
    } else if (nounSet.first('word')) {
      code = 'ENTY:word';
    } else if (nounSet.first('letter')) {
      code = 'ENTY:letter';
    } else if (nounSet.first('instrument')) {
      code = 'ENTY:instru';
    } else if (nounSet.first('color')) {
      code = 'ENTY:color';
    } else if (nounSet.first('dise')) {
      code = 'ENTY:dismed';
    } else if (nounSet.first('anim')) {
      code = 'ENTY:animal';
    } else if (nounSet.first('religion')) {
      code = 'ENTY:religion';
    } else if (nounSet.first('term')) {
      code = 'ENTY:termeq';
    } else if (nounSet.first('other')) {
      code = 'ENTY:other';
    } else if (nounSet.first('sport')) {
      code = 'ENTY:sport';
    } else if (nounSet.first('def')) {
      code = 'DESC:def';
    } else if (nounSet.first('cause')) {
      code = 'DESC:reason';
    } else if (nounSet.first('desc') || nounSet.first('quot')) {
      code = 'DESC:desc';
    } else if (nounSet.first('abb')) {
      code = 'ABBR:abb';
    } else if (sen.indexOf(' stand for') !== -1) {
      code = 'ABBR:exp';
    } else if (nounSet.inList('anim')) {
      code = 'ENTY:animal';
    }

    // Fixes "what toy company"
    if (code === 'ENTY:product' && nounSet.inList('comp')) {
      code = 'HUM:gr';
    } else if (code === 'ENTY:termeq' && words.indexOf('name') !== -1) {
      const newList = [];
      for (let i = 0; i < nounSet.listSet.length; i++) {
        if (nounSet.listSet[i].word !== 'name') {
          newList.push(nounSet.listSet[i]);
        }
      }
      nounSet.listSet = newList;
      depth += 1;
      const code2 = findCode(nounSet, listSet, words, sen, depth);
      code = (code2 !== '') ? code2 : 'HUM:ind';
    }
  } else if (sen.indexOf(' stand for') !== -1 || sen.indexOf(' full form') !== -1) {
    code = 'ABBR:exp';
  } else if (words.indexOf('name') !== -1) {
    code = 'HUM:ind';
  } else if (listSet.inList('def')) {
    code = 'DESC:def';
  } else if (listSet.inList('who')) {
    code = 'HUM:ind';
  } else if (listSet.inList('peop') || listSet.inList('prof') || listSet.inList('sport')) {
    code = 'HUM:ind';
  } else {
    code = 'DESC:def';
  }

  return code;
};

const isQuestion = function isQuestion(sen) {
  let result = false;
  const words = new posTagger.Lexer().lex(sen);
  const taggedWords = new posTagger.Tagger().tag(words);
  const lastTag = taggedWords.pop();

  if (lastTag && lastTag[1] === '.' && lastTag[0] === '?') {
    result = true;
  }

  // Punct is either missing or not qmark
  const type = questionType(sen);
  if (type !== '') {
    result = true;
  }

  // var classify = classify(sen);
  // console.log(type, classify);
  return result;
};

const questionType = function questionType(sen) {
  let code = '';

  let words = new posTagger.Lexer().lex(sen);
  const taggedWords = new posTagger.Tagger().tag(words);
  const pos = taggedWords.map((item) => {
    return item[1];
  });

  const hasWWord = _.some(pos, item => _is(item, 'wword'));

  words = words.map(word => word.toLowerCase());

  const listSet = listify(words);

  if (hasWWord) {
    code = 'WH';
  }

  // Yes/no questions begin with words in the modal/do/have/singleBe/presentBe lists
  if (listSet.inWordList('modal', 0)
    || listSet.inWordList('do', 0)
    || listSet.inWordList('have', 0)
    || listSet.inWordList('singleBe', 0)
    || listSet.inWordList('presentBe', 0)) {
    code = 'YN';
  }

  // Tag questions always have a comma and end with a personal pronoun
  if (_.includes(pos, ',') && pos.indexOf(',') < pos.length) {
    const nl = pos.indexOf(',') + 1;
    if ((lastPos(pos) === 'PRP' || lastWord(words) === 'i') && (pos[nl] === 'MD' || _is(pos[nl], 'verbs'))) {
      code = 'TG';
    }
  }

  // Choice questions either follow a certain regex or contain the word "or"
  if (/NNP? CC(?:\s*DT\s|\s)NNP?/.test(pos.join(' ')) || _.includes(words, 'or')) {
    if (listSet.inWordList('be', 0)
      || listSet.inWordList('do', 0)
      || listSet.inWordList('have', 0)
      || listSet.inWordList('modal', 0)
      || code === 'WH'
      || pos.length === 3) {
      code = 'CH';
    }
  }

  return code;
};

const classify = function classify(sen) {
  let code = '';

  let words = new posTagger.Lexer().lex(sen);
  const taggedWords = new posTagger.Tagger().tag(words);

  const pos = taggedWords.map(item => item[1]);

  words = words.map(word => word.toLowerCase());

  const qtype = questionType(sen);
  const listSet = listify(words);

  const hasWWord = _.some(pos, item => _is(item, 'wword'));

  // Creates a new array of just all the nouns in the sentence
  const nn = _.map(pos, item => _is(item, 'nouns'));
  const nouns = _.filter(_.map(nn, (item, key) => {
    if (item) return words[key];
  }), Boolean);
  const nounSet = listify(nouns);

  // When VB, Date (current or past?)
  if (words[0] === 'when') {
    code = 'NUM:date';
  }

  // Who: Human, Individual or Group...
  if (listSet.inList('who', 0)) {
    code = 'HUM:ind';

    // Who is ProperNoun should be a DESC
    if ((pos[1] === 'VBD' || pos[1] === 'VBZ') && pos[2] === 'NNP') {
      code = 'HUM:desc';
    }
  }

  // Why VB: Reason "Why do birds sing?"
  if (words[0] === 'why' && (_is(pos[1], 'verbs'))) {
    code = 'DESC:reason';
  }

  // Edge Reason - Give a reason...
  if (words[0] === 'give' && words[1] === 'a' && words[2] === 'reason') {
    code = 'DESC:reason';
  }

  // Describe
  if (words[0] === 'describe') {
    code = 'DESC:desc';
  }

  // Define
  if (words[0] === 'define') {
    code = 'DESC:def';
  }

  if (words[0] === 'what' && (listSet.inList('time', 1) || listSet.inList('date', 1))) {
    code = (listSet.inList('time', 1)) ? 'NUM:time' : 'NUM:date';
  }

  if (words[0] === 'how') {
    if (words[1] === 'often' || listSet.inList('perc')) {
      // New subtype Probability
      code = 'NUM:perc';
    } else if (listSet.inList('dimen') || listSet.inList('big')) {
      code = 'NUM:volsize';
    } else if (listSet.inList('weight')) {
      code = 'NUM:weight';
    } else if (listSet.inList('time')) {
      code = 'NUM:period';
    } else if (listSet.inList('dist')) {
      code = 'NUM:dist';
    } else if (listSet.inList('temp')) {
      code = 'NUM:temp';
    } else if (listSet.inList('speed')) {
      code = 'NUM:speed';
    } else if (listSet.inList('num')) {
      code = 'NUM:other';
    }
  }

  if (chain(words, 'how', 'many')) {
    if (listSet.inList('weight')) {
      code = 'NUM:weight';
    } else {
      code = 'NUM:count';
    }
  }

  if (chain(words, 'how', 'much')) {
    if (listSet.inList('weight')) {
      code = 'NUM:weight';
    } else {
      code = 'NUM:count';
    }

    if (listSet.inList('money') || chain(words, 'is', 'a') || chain(words, 'be', 'a')) {
      code = 'NUM:money';
    }
  }

  if (words[0] === 'how' && (words[1] === 'can' || _is(pos[1], 'verbs'))) {
    code = 'DESC:manner';
  }

  if (words[0] === 'what' || words[0] === 'which') {
    code = findCode(nounSet, listSet, words, sen);

    // Double check these,
    // What was the name... was slipping though
    if (code === 'ENTY:termeq' && words.indexOf('was') !== -1) {
      code = 'HUM:ind';
    }
  }

  if (words.indexOf('mean') !== -1 || words.indexOf('meaning') !== -1) {
    code = 'DESC:def';
  }

  // Where, Location - Place
  if (words[0] === 'where') {
    code = 'LOC:other';
  }

  // Not a leading Question
  if (!_is(pos[0], 'wword') && (listSet.inList('time') || listSet.inList('date'))) {
    code = (listSet.inList('time')) ? 'NUM:time' : 'NUM:date';
  }

  if (words[0] === 'name') {
    if (words[1] === 'a' || words[1] === 'something') {
      // This is wrong, Name a... cound be anything
      code = findCode(nounSet, listSet, words, sen);
    } else {
      code = 'HUM:ind';
    }
  }

  if (!_is(pos[0], 'wword') && hasWWord && code === '') {
    // Do we have a wword anywhere?
    // Process questions with non-head wh words
    code = findCode(nounSet, listSet, words, sen);
  }

  // This will handle CAN / WILL etc
  if (qtype === 'YN') {
    code = findCode(nounSet, listSet, words, sen);
  }

  return code;
};

export default {
  classify,
  clean,
  isQuestion,
  listify,
  questionType,
};
