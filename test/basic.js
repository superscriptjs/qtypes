

var ra = require("./lib/ruleClassify.js");

new ra(function(q) {
	q.assert("./data/500q.txt", function(results) {
		console.log(results);
	});
});
