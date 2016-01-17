'use strict';

const fs = require('fs');

const grammar = require('./grammar.js');
const interpreter = require('./interpreter');
const globals = require('./globals');

function evalProgram(tree, options) {
  return interpreter.eval({
    type: 'block',
    data: tree,
    parentContext: require('./globals'),
  });
}

fs.readFile(process.argv[2], (err, data) => {
  let tree = grammar.parse(data.toString());
  let result = evalProgram(tree);
  console.log(result);
  process.exit(0);
});
