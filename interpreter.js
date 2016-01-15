'use strict';

function last(array) {
  return array[array.length - 1];
}

function createContext(parent) {
  return {
    bindings: [],
    parent: parent,
  };
}

function getBindingValue(startContext, name) {
  let context = startContext;
  while (context) {
    if (typeof context.bindings[name] !== 'undefined') {
      return context.bindings[name];
    }
    context = context.parent;
  }
}

function getBindingContext(startContext, name) {
  let context = startContext;
  while (context) {
    if (typeof context.bindings[name] !== 'undefined') {
      return context;
    }
    context = context.parent;
  }
}

function setBindingValue(context, name, value) {
  context.bindings[name] = value;
}

function populateBindings(context, expr) {
  expr.data.forEach((token) => {
    if (token.type === 'symbol') {
      token.atom = getBindingValue(context, token.data);
    }
  });
}

function compileExpression(expr) {
  let tokens = expr.data;
  let isSimple = true;
  let operators = [];
  let operands = [];

  function flush(priority) {
    while (operators.length > 0) {
      if (priority && priority < last(operators).atom.meta.priority) {
        break;
      }

      let form = operators.pop();
      let param2 = operands.pop();
      let param1 = operands.pop();

      operands.push({
        type: 'expression',
        data: [ form, param1, param2 ],
      });
    }
  }

  tokens.forEach((token) => {
    if (token.atom && token.atom.meta && token.atom.meta.infix) {
      isSimple = false;
      flush(token.atom.meta.priority);
      operators.push(token);
    } else {
      operands.push(token);
    }
  });

  flush();

  return isSimple ? expr : operands[0];
}

function evalToken(context, token) {
  switch (token.type) {
    case 'expression':
      return evalExpression(context, token);
    case 'symbol':
      return token.atom;
    case 'block':
      token.parentContext = context;
      return token;
    case 'number':
    case 'string':
      return token;
    default:
      throw new Error('Invalid token');
  }
}

function evalExpression(context, expr, blockParams) {
  if (!context) {
    throw new Error('Invalid context');
  }

  populateBindings(context, expr);
  let compiled = compileExpression(expr, context);
  let form = evalToken(context, compiled.data[0]);

  if (compiled.data.length === 1 && ['block', 'native'].indexOf(form.type) === -1) {
    return form;
  }

  let params = compiled.data.slice(1);

  if (!form.meta.special) {
    params = params.map((param) => evalToken(context, param));
  }

  if (form.type === 'block') {
    return evalBlock(form, params);
  } else if (form.type === 'native') {
    return form.data.apply({
      context: context,
      params: blockParams,
    }, params);
  } else {
    throw new Error('Invalid form type');
  }
}

function evalBlock(block, params) {
  const expressions = block.data;
  const context = createContext(block.parentContext);
  let result;

  expressions.forEach((expr) => {
    result = evalExpression(context, expr, params);
  });

  return result;
}

module.exports = {
  eval: evalBlock,
  evalToken,
  getBindingValue,
  setBindingValue,
  getBindingContext,
};
