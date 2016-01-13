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
  let operators = [];
  let operands = [];

  function flush(priority) {
    while (operators.length > 0) {
      if (priority && priority < last(operators).atom.meta.priority) {
        break;
      }

      operands.push({
        type: 'expression',
        data: [
          operators.pop(),
          operands.pop(),
          operands.pop(),
        ],
      });
    }
  }

  tokens.forEach((token) => {
    if (token.atom && token.atom.meta && token.atom.meta.infix) {
      flush(token.atom.meta.priority);
      operators.push(token);
    } else {
      operands.push(token);
    }
  });

  flush();

  return operands.length === 1
    ? operands[0]
    : {
      type: 'expression',
      location: expr.location,
      data: operands,
    };
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

const rootContext = {
  bindings: {
    '+': {
      type: 'native',
      meta: {
        infix: true,
        priority: 2,
      },
      data(a, b) {
        return {
          type: 'number',
          data: a.data + b.data,
        };
      },
    },
    '*': {
      type: 'native',
      meta: {
        infix: true,
        priority: 1,
      },
      data(a, b) {
        return {
          type: 'number',
          data: a.data * b.data,
        };
      },
    },
    '>': {
      type: 'native',
      meta: {
        infix: true,
        priority: 10,
      },
      data(a, b) {
        return {
          type: 'number',
          data: a.data > b.data,
        };
      },
    },
    'def': {
      type: 'native',
      meta: {
        special: true,
      },
      data(symbol, value) {
        this.context.bindings[symbol.data] = evalToken(value, this.context);
      },
    },
    'in': {
      type: 'native',
      meta: {
        special: true,
      },
      data() {
        for (let i = 0, len = arguments.length; i < len; i += 1) {
          let symbol = arguments[i];
          this.context.bindings[symbol.data] = this.params[i];
        }
      },
    },
    'lang.setAtomMetadata': {
      type: 'native',
      data(atom, key, value) {
        atom.meta[key.data] = value.data;
        return atom;
      },
    },
    'cond': {
      type: 'native',
      data() {
        for (let i = 0, len = arguments.length; i < len; i += 2) {
          console.log(arguments[i]);
          if (arguments[i].data) {
            return evalBlock(arguments[i + 1]);
          }
        }
      },
    },
    'return': {
      type: 'native',
      data(value) {
        return value;
      },
    }
  },
};

function evalProgram(tree, options) {
  return evalBlock({
    type: 'block',
    data: tree,
    context: rootContext,
  });
}

module.exports = {
  evalProgram,
};
