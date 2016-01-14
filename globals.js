'use strict';

const interpreter = require('./interpreter');

const rootContext = module.exports = {
  bindings: {},
};

function registerFunction(name, meta, func) {
  rootContext.bindings[name] = {
    type: 'native',
    meta: meta,
    data: func,
  };
}

registerFunction('+', { infix: true, priority: 4 }, function(a, b) {
  return {
    type: 'number',
    data: a.data + b.data,
  };
});

registerFunction('*', { infix: true, priority: 4 }, function(a, b) {
  return {
    type: 'number',
    data: a.data * b.data,
  };
});

registerFunction('>', { infix: true, priority: 4 }, function(a, b) {
  return {
    type: 'number',
    data: a.data > b.data,
  };
});

registerFunction('def', { special: true }, function(symbol, value) {
  this.context.bindings[symbol.data] = evalToken(value, this.context);
});

registerFunction('in', { special: true }, function() {
  for (let i = 0, len = arguments.length; i < len; i += 1) {
    let symbol = arguments[i];
    this.context.bindings[symbol.data] = this.params[i];
  }
});

registerFunction('set-atom-metadata', null, function(atom, key, value) {
  atom.meta[key.data] = value.data;
  return atom;
});

registerFunction('cond', null, function() {
  for (let i = 0, len = arguments.length; i < len; i += 2) {
    if (arguments[i].data) {
      return interpreter.eval(arguments[i + 1]);
    }
  }
});
