// http://cogcomp.cs.illinois.edu/Data/QA/QC/definition.html

var ra = require("./lib/ruleClassify.js");

new ra(function(q) {
	// var x = q.classify("When will mike be home?");
	// console.log(x)	
	q.assert("./data/500q.txt", function(results) {
		console.log(results);
	});

});
