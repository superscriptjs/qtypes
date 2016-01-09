var fs = require("fs");
var readline = require('readline');
var posTagger = require("parts-of-speech");
var _ = require("underscore");
var p = require("path");

// Used for testing
var norm    = require("node-normalizer");

var tags = {
  wword:  ['WDT','WP','WP$','WRB'],
  nouns : ['NN','NNP','NNPS','NNS'],
  verbs : ['VB','VBD','VBG','VBN','VBP','VBZ'],
  adjectives:['JJ','JJR','JJS']
};

var _is = function(pos, _class){
  return !!(tags[_class].indexOf(pos) > -1)
}

var lastPos = function(pos) {
  var l = pos.length;
  if (pos[l - 1] == ".") {
    return pos[l - 2]
  } else {
    return pos[l - 1];
  }
}

var lastWord = function(words) {
  var l = words.length;
  if (words[l - 1] == "?" || words[l - 1] == "." || words[l - 1] == "!") {
    return words[l - 2]
  } else {
    return words[l - 1];
  }
}



var readLists = function(cb) {

  var dir= p.join(__dirname, '../data/list/');
  var data={};

  fs.readdir(dir,function(err,files){
    if (err) throw err;
    var c=0;
    files.forEach(function(file){
      c++;
      fs.readFile(dir+file,'utf-8',function(err, html){
        if (err) throw err;
        var ln = file.toLowerCase();
        data[ln] = html.split("\n");
        data[ln].forEach(function(item){ return item.toLowerCase()})
        if (0===--c) {
          cb(data);
        }
      });
    });
  });
}


var RuleClassifier = function(callback) {
  var that = this;
  readLists(function(data){
    that.lists = data;
    callback(that);
  });
}

RuleClassifier.prototype.clean = function(sen) {
  sen = replaceAll("What 's","what is", sen);
  sen = replaceAll("Where 's","where is", sen);
  sen = replaceAll("In what","what", sen);

  sen = sen.replace(new RegExp("approximately how", 'i'), "how");
  sen = sen.replace(new RegExp("about how", 'i'), "how");
  sen = sen.replace(new RegExp("in what", 'i'), "what");
  sen = sen.replace(new RegExp("in which", 'i'), "which");

  sen = replaceAll("'","", sen);
  sen = replaceAll("`","", sen);
  sen = replaceAll("'s","", sen);
  sen = replaceAll(" s "," ", sen);

  return sen;
}

RuleClassifier.prototype.listify = function(words) {

  var that = this;

  ListSet = function(words) {
    this.listSet = [];
    this.words = words;
    var _this = this;
    var n = 0;
    words = words.map(function(word) {return word.toLowerCase() });
    words.forEach(function(word) {
      var listSet = [];
      for (var list in that.lists) {
        if (that.lists[list].indexOf(word) != -1) {
          listSet.push(list);
        }
      }
      if (listSet.length != 0) {
        _this.listSet.push({word: word, list: listSet, position: n });
      }
        
      n++;
    });
  }

  // This Loops though the words and not the list items, so pos is the actual word pos
  ListSet.prototype.inWordList = function(listName, pos) {
    var ln = listName.toLowerCase();
    
    for(var n = 0; n < this.listSet.length; n++) {
      if(this.listSet[n].list.indexOf(ln) != -1 && this.listSet[n].position == pos) {
        return true;
      }
  
    }
    return false;
  }

  ListSet.prototype.inList = function(listName, pos) {
    var ln = listName.toLowerCase();
    for(var i = 0; i < this.listSet.length; i++) {
      if (pos != undefined) {
        if(i == pos && this.listSet[i].list.indexOf(ln) != -1) {
          return true;
        }       
      } else {
        if(this.listSet[i].list.indexOf(ln) != -1) {
          return true;
        }
      }
    }
    return false;
  }

  ListSet.prototype.first = function() {
    var args = Array.prototype.slice.call(arguments);
    if (args.length == 0) {
      // Return true / false if we have a listSet[0]
      return (this.listSet[0]) ? true : false;
    } else {
      // Assuming 1 arg
      return this.inList(args[0], 0);
    }
    
  }

  return new ListSet(words);
}


var chain = function() {
  var args = Array.prototype.slice.call(arguments);
  var words = args[0];
  var lookup = args.slice(1);

  for (var i = 0; i < words.length; i++) {
    if (words[1] && words[i+1] 
      && words[i].toLowerCase() == lookup[0].toLowerCase() 
      && words[i + 1].toLowerCase() == lookup[1].toLowerCase() ) {
      return true
    }   
  }
  return false; 

}

var findCode = function(nounSet, listSet, words, sen, depth) {
  var code = "";

  if (!depth) {
    depth = 0;
  }

  if (depth == 5) {
    return "";
  }

  if (nounSet.first()) {
    if (nounSet.first('num')) {
      code = "NUM:other";
    } else if (nounSet.first('speed')) {
      code = "NUM:speed"; 
    } else if (nounSet.first('dimen')) {
      code = "NUM:volsize";   
    } else if (nounSet.first('date')) {
      code = "NUM:date";
    } else if (nounSet.first('money')) {
      code = "NUM:money";
    } else if (nounSet.first('code')) {
      code = "NUM:code";

    } else if (nounSet.first("peop") || nounSet.first("prof")  /* || nounSet.first("sport")*/) {
      code = "HUM:ind";
    } else if (nounSet.first("group") || nounSet.first("comp") ) {
      code = "HUM:gr";
    } else if (nounSet.first("job")) {
      code = "HUM:title";

    } else if (nounSet.first("country")) {
      code = "LOC:country";
    } else if (nounSet.first("state")) {
      code = "LOC:state";
    } else if (nounSet.first("city")) {
      code = "LOC:city";
    } else if (nounSet.first("mount")) {
      code = "LOC:mount";
    } else if (nounSet.first("loca")) {
      code = "LOC:other";

    } else if (nounSet.first("prod")) {
      code = "ENTY:product";
    } else if (nounSet.first("art")) {
      code = "ENTY:cremat";
    } else if (nounSet.first("food")) {

      nounSet.listSet.shift();
      var code2 = findCode(nounSet, listSet, words, sen);
      code = (code2 != "") ? code2 : "ENTY:food";

    } else if (nounSet.first("plant")) {
      code = "ENTY:plant";
    } else if (nounSet.first("lang")) {
      code = "ENTY:lang";
    } else if (nounSet.first("substance")) {
      code = "ENTY:substance";        
    } else if (nounSet.first("word")) {
      code = "ENTY:word"; 
    } else if (nounSet.first("letter")) {
      code = "ENTY:letter";       
    } else if (nounSet.first("instrument")) {
      code = "ENTY:instru"; 
    } else if (nounSet.first("color")) {
      code = "ENTY:color";  
    } else if (nounSet.first("dise")) {
      code = "ENTY:dismed"; 
    } else if (nounSet.first("anim")) {
      code = "ENTY:animal"; 
    } else if (nounSet.first("religion")) {
      code = "ENTY:religion"; 
    } else if (nounSet.first("term")) {
      code = "ENTY:termeq"; 
    } else if (nounSet.first("other")) {
      code = "ENTY:other";
    } else if (nounSet.first("sport")) {
      code = "ENTY:sport";  

    } else if (nounSet.first("def")) {
      code = "DESC:def";  
    } else if (nounSet.first("cause")) {
      code = "DESC:reason"; 

    } else if (nounSet.first("desc") || nounSet.first("quot")) {
      code = "DESC:desc";
    } else if (nounSet.first("abb")) {
      code = "ABBR:abb";
    } else if (sen.indexOf(" stand for ") != -1 ) {
      code = "ABBR:exp";
    } else {
      if (nounSet.inList("anim")) {
        code = "ENTY:animal"; 
      }
    }

    // Fixes "what toy company"
    if (code == "ENTY:product" && nounSet.inList("comp")) { 
      code = "HUM:gr";
    } else if (code == "ENTY:termeq" && words.indexOf("name") != -1) {
      var newList = [];
      for (var i = 0; i < nounSet.listSet.length;i++) {
        if (nounSet.listSet[i].word != "name") {
          newList.push(nounSet.listSet[i]);
        }
      }
      nounSet.listSet = newList;
      depth += 1;
      var code2 = findCode(nounSet, listSet, words, sen, depth);
      code = (code2 != "") ? code2 : "HUM:ind";

    }
  } else {

    if (sen.indexOf(" stand for ") != -1 ) {
      code = "ABBR:exp";
    } else if (words.indexOf("name") != -1) {
      code = "HUM:ind";
    } else if (listSet.inList("def")) {
      code = "DESC:def";
    } else if (listSet.inList("who")) {
      code = "HUM:ind";
    } else if (listSet.inList("peop") || listSet.inList("prof")  || listSet.inList("sport")) {
      code = "HUM:ind";
    } else {
      code = "DESC:def";  
    }
  } 

  return code;
}

RuleClassifier.prototype.isQuestion = function(sen) {
  var isQuestion = false;
  var words = new posTagger.Lexer().lex(sen); 
  var taggedWords = new posTagger.Tagger().tag(words);
  var lastTag = taggedWords.pop();
  
  if (lastTag && lastTag[1] == "." && lastTag[0] == "?") {
    isQuestion = true;
  }

  // Punct is either missing or not qmark
  var type = this.questionType(sen);
  if (type != "") {
    isQuestion = true;  
  }

  // var classify = this.classify(sen);
  // console.log(type, classify);
  return isQuestion;
}

RuleClassifier.prototype.questionType = function(sen) {
  var code = "";
  
  var words = new posTagger.Lexer().lex(sen);  

  var taggedWords = new posTagger.Tagger().tag(words);  
  var pos = taggedWords.map(function(item){return item[1]})

  var hasWh = _.any(pos, function(item, key) {return _is(item, 'wword')} );
  words = words.map(function(word){ return word.toLowerCase()});
  var listSet = this.listify(words);

  if (hasWh) {
    code = "WH";
  }

  if (listSet.inWordList("modal", 0) || listSet.inWordList("do", 0) || 
    listSet.inWordList("have", 0) || listSet.inWordList("singleBe", 0) || listSet.inWordList("presentBe", 0)) {
    code = "YN";
  }

  // Tag Questions always have a comma and end with a personal pronoun
  if (_.contains(pos, ",") && pos.indexOf(",") < pos.length) {
    var nl = pos.indexOf(",") + 1;
    if ((lastPos(pos) == "PRP" || lastWord(words) == "i") && (pos[nl] == "MD" || _is(pos[nl],'verbs'))) {
      code = "TG";
    }
  }

  if (/NNP? CC(?:\s*DT\s|\s)NNP?/.test(pos.join(" ")) || _.contains(words, "or")) {
    if (listSet.inWordList("be", 0) ||  listSet.inWordList("do", 0) ||  listSet.inWordList("have", 0) || code == "WH" || pos.length === 3) {
      code = "CH";
    }
  }

  return code;
}


RuleClassifier.prototype.classify = function(sen) {
  var code = "";

  sen = this.clean(sen);
  var words = new posTagger.Lexer().lex(sen);
  var taggedWords = new posTagger.Tagger().tag(words);
  
  var pos = taggedWords.map(function(item){return item[1]})
  words = words.map(function(word){ return word.toLowerCase()});

  var qtype = this.questionType(sen);
  var listSet = this.listify(words);

  var hasWh = _.any(pos, function(item, key) {return _is(item, 'wword')} );

  var nn = _.map(pos, function(item, key){ return _is(item, 'nouns') });
  var nouns = _.filter(_.map(nn, function(item, key){ if(item) return words[key]}), Boolean);
  var nounSet = this.listify(nouns);
  var token = nounSet.first();
  
  // When VB, Date (current or past?)
  if (words[0] == "when") {
    code = "NUM:date";
  }

  // Who: Human, Individual or Group...
  if (listSet.inList("who", 0)) {
    code = "HUM:ind";

    // Who is ProperNoun should be a DESC
    if((pos[1] == "VBD" || pos[1] == "VBZ") && pos[2] == "NNP") {
      code = "HUM:desc";
    }
  }

  // Why VB: Reason "Why do birds sing?"
  if (words[0] == "why" && (_is(pos[1],'verbs'))) {
    code = "DESC:reason"
  }
  
  // Edge Reason - Give a reason...
  if (words[0] == "give" && words[1] == "a" && words[2] == "reason") {
    code = "DESC:reason"
  }

  // Describe
  if (words[0] == "describe" ) {
    code = "DESC:desc"
  }

  // Define
  if (words[0] == "define") {
    code = "DESC:def"
  }

  if (words[0] == "what" && (listSet.inList("time", 1) || listSet.inList("date", 1))) {
    code = (listSet.inList("time", 1)) ? "NUM:time" : "NUM:date";
  }

  if (words[0] == "how") {  
    if (words[1] == "often" || listSet.inList('perc')) {
      // New subtype Probability
      code = "NUM:perc";
    } else if (listSet.inList('dimen') || listSet.inList('big')) {
      code = "NUM:volsize";
    } else if (listSet.inList('weight')) {
      code = "NUM:weight";
    } else if (listSet.inList('time')) {
      code = "NUM:period";
    } else if (listSet.inList('dist')) {
      code = "NUM:dist";
    } else if (listSet.inList('temp')) {
      code = "NUM:temp";
    } else if (listSet.inList('speed')) {
      code = "NUM:speed";
    } else if (listSet.inList('num')) {
      code = "NUM:other";
    }
  }

  if (chain(words, "how", "many")) {
    if (listSet.inList('weight')) {
      code = "NUM:weight";
    } else {
      code = "NUM:count"; 
    }
  }

  if (chain(words, "how", "much")) {
    if (listSet.inList('weight')) {
      code = "NUM:weight";
    } else {
      code = "NUM:count"; 
    }

    if (listSet.inList('money') || chain(words, "is", "a") || chain(words, "be", "a")) {
      code = "NUM:money";
    }
  }
  if (words[0] == "how" && (words[1] == "can" || _is(pos[1],'verbs'))) {
    code = "DESC:manner";
  }

  if (words[0] == "what" || words[0] == "which") {
    code = findCode(nounSet, listSet, words, sen);

    // Double check these, 
    // What was the name... was slipping though
    if (code == "ENTY:termeq" && words.indexOf("was") != -1) {
      code = "HUM:ind";
    }
  }

  if (words.indexOf("mean") != -1 || words.indexOf("meaning") != -1 ) {
    code = "DESC:def";
  }

  // Where, Location - Place
  if (words[0] == "where") {
    code = "LOC:other"
  }

  // Not a leading Question
  if (!_is(pos[0], 'wword') && (listSet.inList("time") || listSet.inList("date"))) {
      code = (listSet.inList("time")) ? "NUM:time" : "NUM:date";
  }

  if (words[0] == "name") {
    if (words[1] == "a" || words[1] == "something") {
      // This is wrong, Name a... cound be anything
      code = findCode(nounSet, listSet, words, sen);
    } else {
      code = "HUM:ind"; 
    }
  }

  if (!_is(pos[0], 'wword') && hasWh == true && code == "") {
    // Do we have a wword anywhere?
    // Process questions with non-head wh words
    code = findCode(nounSet, listSet, words, sen);
  }

  // This will handle CAN / WILL etc
  if (qtype == "YN") {
    code = findCode(nounSet, listSet, words, sen)
  }

  return code;
}

RuleClassifier.prototype.assertTag = function(testfile, cb) {

  that = this;

  norm.loadData(function(){
    var rd = readline.createInterface({
      input: fs.createReadStream(testfile),
      output: process.stdout,
      terminal: false
    });

    rd.on('line', function(line) {
      
      var cleanedSentense = that.clean(norm.clean(line));
      var result = that.questionType(cleanedSentense);
      
      if (result != "TG") {
        console.log("--", result, cleanedSentense); 
      }

    });

    rd.on('close', function() {
      // cb({coarse:(cm / lc) * 100, fine:(fm / lc) * 100});
      cb();
    });
  });
}

RuleClassifier.prototype.assertAlt = function(testfile, cb) {

  that = this;

  norm.loadData(function(){
    var rd = readline.createInterface({
      input: fs.createReadStream(testfile),
      output: process.stdout,
      terminal: false
    });

    rd.on('line', function(line) {
      
      var cleanedSentense = that.clean(norm.clean(line));
      var result = that.questionType(cleanedSentense);
      

      if (result != "CH") {
        console.log("--", result, cleanedSentense); 
      } else {
        console.log("!", result, cleanedSentense);  
      }

    });

    rd.on('close', function() {
      cb(null);
    });
  });
}


RuleClassifier.prototype.assert = function(testfile, cb) {
  var that = this;
  var cm = 0, fm = 0, lc = 0;
  var results = {};
  var moreResults = [];
  var emptyResults = [];

  var rd = readline.createInterface({
    input: fs.createReadStream(testfile),
    output: process.stdout,
    terminal: false
  });

  rd.on('line', function(line) {
    
    var match = line.match(/([A-Z]+):([a-z]+) (.+)/);
    var cat = match[1];
    var subcat = match[2];
    var sentense = match[3];
    
    lc++;
    
    var result = that.classify(sentense);
    var cleanedSentense = that.clean(sentense);

    var sc = result.split(":");
    
    if (sc[0] == cat) {
      cm++;
      results[cat + ":correct"] = (results[cat+ ":correct"] == undefined) ? 0 : results[cat+ ":correct"] + 1;
    } else {
      results[cat + ":error"] = (results[cat+ ":error"] == undefined) ? 0 : results[cat+ ":error"] + 1;
    }

    if (result == cat + ":" + subcat) {
      fm++;
      results[result + ":correct"] = (results[result+ ":correct"] == undefined) ? 0 : results[result+ ":correct"] + 1;
    } else { 
      moreResults.push("Expect: " +  cat+":"+subcat + " Got: " + result + " " + cleanedSentense)
      results[result + ":error"] = (results[result+ ":error"] == undefined) ? 0 : results[result+ ":error"] + 1;
    }

    // if (cat+":"+subcat == "HUM:ind" && result != "HUM:ind" ) {
    //  moreResults.push("Expect: " +  cat+":"+subcat + " Got: " + result + " " + cleanedSentense)
    //  results[result + ":error"] = (results[result+ ":error"] == undefined) ? 0 : results[result+ ":error"] + 1;      
    // }

  });

  rd.on('close', function() {
    console.log(moreResults.sort());
    // console.log(results);
    cb({coarse:(cm / lc) * 100, fine:(fm / lc) * 100});
  });
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

module.exports = RuleClassifier;
