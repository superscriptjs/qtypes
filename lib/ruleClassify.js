var fs = require("fs");
var readline = require('readline');
var posTagger = require("pos");
var _ = require("underscore");

var tags = {
	wword: 	['WDT','WP','WP$','WRB'],
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


var readLists = function(cb) {

	var dir='./data/list/';
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

	ListSet.prototype.inList = function(listName, pos) {
		for(var i = 0; i < this.listSet.length; i++) {
			var ln = listName.toLowerCase();
			if (pos != undefined) {
				
				if(i == pos && 
					this.listSet[i].list.indexOf(ln) != -1) {
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


var findCode = function(nounSet, listSet, words, sen) {
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

		} else if (nounSet.first("peop") || nounSet.first("prof")  || nounSet.first("sport")) {
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
			code = "ENTY:food";
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

			// More Broad lookup
			// console.log("---", sen, JSON.stringify(nounSet))

			if (nounSet.inList("anim")) {
				code = "ENTY:animal";	
			}
		}

		// Fixes "what toy company"
		if (code == "ENTY:product" && nounSet.inList("comp")) { 
			code = "HUM:gr";
		}
	} else {

		if (sen.indexOf(" stand for ") != -1 ) {
			code = "ABBR:exp";
		} else if (words.indexOf("name") != -1) {
			code = "HUM:ind";
		} else if (listSet.inList("def")) {
			code = "DESC:def";
		} else {
			code = "DESC:def";	
		}
	}	

	return code;
}

RuleClassifier.prototype.classify = function(sen) {
	var code = "ENTY:other";

	sen = this.clean(sen);

	var words = new posTagger.Lexer().lex(sen);	
	var taggedWords = new posTagger.Tagger().tag(words);	
	var pos = taggedWords.map(function(item){return item[1]})
	words = words.map(function(word){ return word.toLowerCase()});
	
	var listSet = this.listify(words);

	var nn = _.map(pos, function(item, key){ return _is(item,'nouns') })
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
		if (words[1] == "many") {
			if (listSet.inList('weight')) {
				code = "NUM:weight";
			} else {
				code = "NUM:count";	
			}

		} else if (words[1] == "much") {
			if (listSet.inList('weight')) {
				code = "NUM:weight";
			} else {
				code = "NUM:count";	
			}

			if (listSet.inList('money')) {
				code = "NUM:money";
			}
		} else if (words[1] == "often" || listSet.inList('perc')) {
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
		}
	
	}

	// mannar
	if (words[0] == "how" && (words[1] == "can" || _is(pos[1],'verbs'))) {
		code = "DESC:manner"
	}

	if (words[0] == "what" || words[0] == "which") {
		code = findCode(nounSet, listSet, words, sen);
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
		if (words[1] == "a") {
			// This is wrong, Name a... cound be anything
			code = findCode(nounSet, listSet, words, sen);
		} else {
			code = "HUM:ind";	
		}
	}

	return code;
}

RuleClassifier.prototype.assert = function(testfile, cb) {
	var that = this;
	var cm = 0, fm = 0, lc = 0;
	var results = {};
	var moreResults = [];

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
		var sc = result.split(":");

		var cleanedSentense = that.clean(sentense);
		if (sc[0] == cat) {
			cm++;
			results[cat + ":correct"] = (results[cat+ ":correct"] == undefined) ? 0 : results[cat+ ":correct"] + 1;
		} else {
			// console.log("Expect:", cat, "Got:", result, cleanedSentense)
			results[cat + ":error"] = (results[cat+ ":error"] == undefined) ? 0 : results[cat+ ":error"] + 1;
		}

		if (result == cat + ":" + subcat) {
			fm++;
			results[result + ":correct"] = (results[result+ ":correct"] == undefined) ? 0 : results[result+ ":correct"] + 1;
		} else { 
			moreResults.push("Expect: " +  cat+":"+subcat + " Got: " + result + " " + cleanedSentense)
			results[result + ":error"] = (results[result+ ":error"] == undefined) ? 0 : results[result+ ":error"] + 1;
		}

	});

	rd.on('close', function() {
		
		// console.log(moreResults.sort())
		cb({couse:(cm / lc) * 100, fine:(fm / lc) * 100});
	});
}


function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

module.exports = RuleClassifier;
