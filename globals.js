'use strict';

const interpreter = require('./interpreter');

const rootContext = module.exports = {
  bindings: {},
};

function registerFunction(name, meta, func) {
  rootContext.bindings[name] = {
    type: 'native',
    meta: meta || {},
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

registerFunction('operator', { special: true }, function(priority, block) {
  const evaluated = interpreter.evalToken(this.context, block);
  evaluated.meta.infix = true;
  evaluated.meta.priority = priority;
  return evaluated;
});

registerFunction('special', { special: true }, function(block) {
  const evaluated = interpreter.evalToken(this.context, block);
  evaluated.meta.special = true;
  return evaluated;
});

registerFunction('eval', { special: true }, function(value) {
  return interpreter.evalToken(this.context, value);
});

registerFunction('let', { special: true }, function(symbol, value) {
  const evaluated = interpreter.evalToken(this.context, value);
  interpreter.setBindingValue(this.context, symbol.data, evaluated);
});

registerFunction('in', { special: true }, function() {
  for (let i = 0, len = arguments.length; i < len; i += 1) {
    let symbol = arguments[i];
    interpreter.setBindingValue(this.context, symbol.data, this.params[i]);
  }
});

registerFunction('cond', null, function() {
  for (let i = 0, len = arguments.length; i < len; i += 2) {
    if (arguments[i].data) {
      return interpreter.eval(arguments[i + 1]);
    }
  }
});

registerFunction('print', null, function() {
  console.log.apply(console, arguments);
});
