var ra = require("../lib/ruleClassify.js");

new ra(function(q) {
	
	q.classify("How many steps from here to Alaska?");

	q.assert("./data/500q.txt", function(results) {
		console.log(results);
	});
});
