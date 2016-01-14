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

registerFunction('+', { infix: true, priority: 6 }, function(a, b) {
  return {
    type: 'number',
    data: a.data + b.data,
  };
});

registerFunction('*', { infix: true, priority: 5 }, function(a, b) {
  return {
    type: 'number',
    data: a.data * b.data,
  };
});

registerFunction('>', { infix: true, priority: 8 }, function(a, b) {
  return {
    type: 'number',
    data: a.data > b.data,
  };
});

registerFunction('define', { special: true }, function(symbol, value) {
  const evaluated = interpreter.evalToken(this.context, value);
  interpreter.setBindingValue(this.context, symbol.data, evaluated);
});

registerFunction('=', { infix: true, priority: 15, special: true }, function(symbol, value) {
  const name = symbol.data;
  const context = interpreter.getBindingContext(this.context, name);
  const evaluated = interpreter.evalToken(this.context, value);

  if (context) {
    interpreter.setBindingValue(context, name, evaluated);
  }
});

registerFunction('==', { infix: true, priority: 15 }, function(a, b) {
  return {
    type: 'number',
    data: +(a.data === b.data),
  };
});

registerFunction('in', { special: true }, function() {
  for (let i = 0, len = arguments.length; i < len; i += 1) {
    let symbol = arguments[i];
    interpreter.setBindingValue(this.context, symbol.data, this.params[i]);
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

registerFunction('print', null, function() {
  console.log(arguments);
});
