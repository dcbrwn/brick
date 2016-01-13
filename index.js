'use strict';

var fs = require('fs');

var grammar = require('./grammar.js');
var interpreter = require('./interpreter.js');

fs.readFile(process.argv[2], (err, data) => {
  let tree = grammar.parse(data.toString());
  let result = interpreter.evalProgram(tree);
  console.log(result);
  process.exit(0);
});

