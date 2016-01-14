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

function getBindingValue(name, context) {
  while (context) {
    if (typeof context.bindings[name] !== 'undefined') {
      return context.bindings[name];
    }
    context = context.parent;
  }
}

function populateBindings(expr, context) {
  expr.data.forEach((token) => {
    if (token.type === 'symbol') {
      token.atom = getBindingValue(token.data, context);
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

function evalToken(token, context) {
  switch (token.type) {
    case 'expression':
      return evalExpression(token, context);
    case 'symbol':
      return token.atom;
    case 'block':
      token.context = createContext(context);
      token.meta = {};
      return token;
    case 'number':
    case 'string':
      return token;
    default:
      throw new Error('Invalid token');
  }
}

function evalExpression(expr, context, blockParams) {
  if (!context) {
    throw new Error('Invalid context');
  }

  populateBindings(expr, context);
  let compiled = compileExpression(expr, context);
  let form = evalToken(compiled.data[0]);

  if (compiled.data.length === 1 && ['block', 'native'].indexOf(form.type) === -1) {
    return form;
  }

  let params = compiled.data.slice(1);

  form.meta = form.meta || {};

  if (!form.meta.special) {
    params = params.map((param) => evalToken(param, context));
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
  let expressions = block.data;
  let result;

  expressions.forEach((expr) => {
    result = evalExpression(expr, block.context, params);
  });

  return result;
}

module.exports = {
  eval: evalBlock,
};
