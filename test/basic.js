var ra = require("../lib/ruleClassify.js");

new ra(function(q) {
	
	// Question Word Questions
	var r1 = q.questionType("How many steps from here to Alaska?");
	
	// Alternative question or Choice Questions
	// http://aclweb.org/anthology/Y/Y00/Y00-1037.pdf
	var r2 = q.questionType("Who is slower, Mary or John?");
	
	// Tag Questions	
	// var r3 = q.questionType("She does a beautiful job, does not she?");
	var r3 = q.questionType("Peter plays football, does not he?");

	// YN Questions
	var r4 = q.questionType("Do you want dinner?");
	
	// q.assertAlt("./data/altQuestions.txt", function(results) {
	// 	console.log(results);
	// });

	// q.assertTag("./data/tagQuestions.txt", function(results) {
	// 	console.log(results);
	// });
	
	q.assert("./data/5000q.txt", function(results) {
		console.log(results);
	});

});
