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

var ra = require("../lib/ruleClassify.js");

new ra(function(q) {

	// // Question Word Questions
	// var r1 = q.questionType("How many steps from here to Alaska?");
	
	// // Alternative question or Choice Questions
	// // http://aclweb.org/anthology/Y/Y00/Y00-1037.pdf
	// var r2 = q.classify("How much is a loaf of bread?");
	// console.log(r2);

	// var s = "johnnyrodgers: __proto__ under last_time_divider is returning \"Invalid Date\"";
	var s = "testing constructor __proto__";
	console.log(q.classify(s));

	
	// // Tag Questions	
	// // var r3 = q.questionType("She does a beautiful job, does not she?");
	// var r3 = q.questionType("Peter plays football, does not he?");

	// // YN Questions
	// var r4 = q.questionType("Do you want dinner?");
	
	// q.assertAlt("./data/altQuestions.txt", function(results) {
	// 	console.log(results);
	// });

	// q.assertTag("./data/tagQuestions.txt", function(results) {
	// 	console.log(results);
	// });
	
	// q.assert("./data/500q.txt", function(results) {
	// 	console.log(results);
	// });
	

});
