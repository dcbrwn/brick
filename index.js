'use strict';

var fs = require('fs');

var parser = require('./parser.js');
var interpreter = require('./interpreter.js');

fs.readFile(process.argv[2], (err, data) => {
	let tree = parser.parse(data.toString());
	let result = interpreter.evalProgram(tree);
	console.log(result);
	process.exit(0);
});

