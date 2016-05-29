"use strict";
(function (global) {
  var bigInt = global.bigInt;
  if (!bigInt) {
    alert("require bigInt http://peterolson.github.com/BigInteger.js/BigInteger.min.js");
  }
  function Parser(source) {
    this.index = 0;
    this.line = 0;
    this.lineStart = 0;
    this.input = source;
  }

  function ParserException(line, column, message) {
    this.line = line;
    this.column = column;
    this.message = message;
  }

  ParserException.prototype.toString = function () {
    return "[" + this.line + ":" + this.column + "] " + this.message;
  };

  function EvaluationException(node, message, ctx) {
    this.node = node;
    this.message = message;
    this.ctx = new RuntimeContext(ctx);
  }

  EvaluationException.prototype.toString = function () {
    return "[" + this.node.start.line + ":" + this.node.start.column + "] " + this.message;
  };

  Parser.prototype.parse = function () {
    var expr = this.parseExpr();
    this.consumeWs();
    if (this.index < this.input.length) {
      throw this.parserError("Expecting EOF");
    }
    return expr;
  };

  Parser.prototype.parseExpr = function () {
    if (this.index >= this.input.length) throw this.parserError("Unexpected EOF");
    this.consumeWs();
    var ch = this.input[this.index];
    var markLoc = this.startMarkLoc();
    switch (ch) {
      case '(':
      {
        this.index++;
        var a = this.parseExpr();
        var b = this.parseExpr();
        this.consumeWs();
        if (this.input[this.index] != ')') {
          throw this.parserError("Expects ')'");
        }
        this.index++;
        return markLoc(["Apply", a, b]);
      }
      case '\\':
      {
        this.index++;
        var name = this.consumeName();
        this.consumeWs();
        if (this.input[this.index] != '.') {
          throw this.parserError("Expects '.'");
        }
        this.index++;
        var body = this.parseExpr();
        return markLoc(["Lambda", name, body]);
      }
      default:
        if ('0' <= ch && ch <= '9') {
          return markLoc(["Num", this.consumeNum()]);
        }
        if ('a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || '_' == ch) {
          return markLoc(["Ident", this.consumeName()]);
        }
    }
    throw this.parserError("Expects expression");
  };

  Parser.prototype.loc = function () {
    return {
      line: this.line,
      column: this.index - this.lineStart
    };
  };

  Parser.prototype.startMarkLoc = function () {
    var start = this.loc();
    return function (node) {
      node.start = start;
      node.end = this.loc();
      return node;
    }.bind(this);
  };

  Parser.prototype.consumeWs = function () {
    var ch;
    while (this.index < this.input.length) {
      ch = this.input[this.index];
      if (ch == ' ' || ch == '\t') {
        this.index++;
      } else if (ch == '\n') {
        this.index++;
        this.line++;
        this.lineStart = this.index;
      } else if (ch == '\r') {
        this.index++;
        this.line++;
        if (this.input[this.index] == '\n') {
          this.index++;
        }
        this.lineStart = this.index;
      } else {
        break;
      }
    }
  };

  Parser.prototype.consumeNum = function () {
    this.consumeWs();
    var sb = "", ch;
    while (this.index < this.input.length) {
      ch = this.input[this.index];
      if ('0' <= ch && ch <= '9') {
        sb += ch;
        this.index++;
      } else {
        break;
      }
    }
    return bigInt(sb);
  };

  Parser.prototype.consumeName = function () {
    this.consumeWs();
    var sb = "", ch;
    {
      ch = this.input[this.index];
      if ('a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || '_' == ch) {
        sb += ch;
        this.index++;
      } else {
        throw this.parserError("Unexpected '" + ch + "'");
      }
    }
    while (this.index < this.input.length) {
      ch = this.input[this.index];
      if ('0' <= ch && ch <= '9' || 'a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || '_' == ch) {
        sb += ch;
        this.index++;
      } else {
        break;
      }
    }
    return sb.toString();
  };

  Parser.prototype.parserError = function (message) {
    return new ParserException(this.line, this.index - this.lineStart, message);
  };

  function RuntimeContext(ctx) {
    this.bound = Object.create(null);
    this.counter = [0];
    var key;
    if (ctx) {
      for (key in ctx.bound) {
        this.bound[key] = ctx.bound[key];
      }
      this.counter = ctx.counter;
    } else {
      for (key in RuntimeContext.PREDEFINED) {
        if ({}.hasOwnProperty.call(RuntimeContext.PREDEFINED, key)) {
          this.bound[key] = RuntimeContext.PREDEFINED[key];
        }
      }
    }
  }

  RuntimeContext.prototype.get = function (name) {
    return this.bound["$" + name];
  };

  function render(expr, bound) {
    switch (expr[0]) {
      case "Apply":
        return "(" + render(expr[1]) + " " + render(expr[2]) + ")";
      case "Lambda":
        return "\\" + expr[1] + ". " + render(expr[2]);
      case "Num":
        return expr[1] + "";
      case "Ident":
        return expr[1];
    }
  }

  RuntimeContext.prototype.evaluate = function (expr) {
    switch (expr[0]) {
      case "Apply":
        this.counter[0]++;
        if (this.counter[0] > RuntimeContext.LIMIT) {
          throw new EvaluationException(expr, "Time Limit Exceeded", this);
        }
        var v1 = this.evaluate(expr[1]);
        if (typeof v1 === "function") {
          var arg = this.evaluate(expr[2]);
          try {
            return v1.call(this, arg);
          } catch (e) {
            e.node = e.node || expr[2];
            throw e;
          }
        }
        throw new EvaluationException(expr, "Trying to call non-function", this);
      case "Lambda":
        return function (ctx, name, body) {
          ctx = new RuntimeContext(ctx);
          var func = function (arg) {
            return ctx.evaluateWith(name, arg, body);
          };
          func.toString = function () {
            var text = render(expr);
            func.toString = function () {
              return text;
            };
            return text;
          };
          return func;
        }(this, expr[1], expr[2]);
      case "Num":
        return expr[1];
      case "Ident":
        if ("$" + expr[1] in this.bound) {
          return this.bound["$" + expr[1]];
        } else {
          throw new EvaluationException(expr, "Unbound name '" + expr[1] + "'", this);
        }
    }
  };

  RuntimeContext.prototype.evaluateWith = function (name, arg, body) {
    this.bound["$" + name] = arg;
    try {
      return this.evaluate(body);
    } finally {
      delete this.bound["$" + name];
    }
  };

  RuntimeContext.prototype.assertNumber = function (e) {
    if (!bigInt.isInstance(e)) {
      throw new EvaluationException(null, "TypeError: expecting number", this);
    }
  };

  RuntimeContext.prototype.assertBool = function (e) {
    if (typeof e !== 'boolean') {
      throw new EvaluationException(null, "TypeError: expecting boolean", this);
    }
  };

  RuntimeContext.prototype.assertFunc = function (e) {
    if (typeof e !== 'function') {
      throw new EvaluationException(null, "TypeError: expecting function", this);
    }
  };

  RuntimeContext.LIMIT = 500000;

  RuntimeContext.PREDEFINED = Object.create(null);
  RuntimeContext.PREDEFINED["$true"] = true;
  RuntimeContext.PREDEFINED["$false"] = false;
  RuntimeContext.PREDEFINED["$add"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.add(b);
    };
  };
  RuntimeContext.PREDEFINED["$add"].toString = function () {
    return "add";
  };
  RuntimeContext.PREDEFINED["$sub"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.subtract(b);
    };
  };
  RuntimeContext.PREDEFINED["$sub"].toString = function () {
    return "sub";
  };
  RuntimeContext.PREDEFINED["$mul"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.multiply(b);
    };
  };
  RuntimeContext.PREDEFINED["$mul"].toString = function () {
    return "mul";
  };
  RuntimeContext.PREDEFINED["$div"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.divide(b);
    };
  };
  RuntimeContext.PREDEFINED["$div"].toString = function () {
    return "div";
  };
  RuntimeContext.PREDEFINED["$rem"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.remainder(b);
    };
  };
  RuntimeContext.PREDEFINED["$rem"].toString = function () {
    return "rem";
  };
  RuntimeContext.PREDEFINED["$lt"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.lesser(b);
    };
  };
  RuntimeContext.PREDEFINED["$lt"].toString = function () {
    return "lt";
  };
  RuntimeContext.PREDEFINED["$lte"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.lesserOrEquals(b);
    };
  };
  RuntimeContext.PREDEFINED["$lte"].toString = function () {
    return "lte";
  };
  RuntimeContext.PREDEFINED["$gt"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.greater(b);
    };
  };
  RuntimeContext.PREDEFINED["$gt"].toString = function () {
    return "gt";
  };
  RuntimeContext.PREDEFINED["$gte"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.greaterOrEquals(b);
    };
  };
  RuntimeContext.PREDEFINED["$gte"].toString = function () {
    return "gte";
  };
  RuntimeContext.PREDEFINED["$eq"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.equals(b);
    };
  };
  RuntimeContext.PREDEFINED["$eq"].toString = function () {
    return "eq";
  };
  RuntimeContext.PREDEFINED["$neq"] = function (a) {
    this.assertNumber(a); return function (b) {
      this.assertNumber(b); return a.notEquals(b);
    };
  };
  RuntimeContext.PREDEFINED["$neq"].toString = function () {
    return "neq";
  };
  RuntimeContext.PREDEFINED["$and"] = function (a) {
    this.assertBool(a); return function (b) {
      this.assertBool(b); return (a && b);
    };
  };
  RuntimeContext.PREDEFINED["$and"].toString = function () {
    return "and";
  };
  RuntimeContext.PREDEFINED["$or"] = function (a) {
    this.assertBool(a); return function (b) {
      this.assertBool(b); return (a || b);
    };
  };
  RuntimeContext.PREDEFINED["$or"].toString = function () {
    return "or";
  };
  RuntimeContext.PREDEFINED["$not"] = function (a) {
    this.assertBool(a); return (!a);
  };
  RuntimeContext.PREDEFINED["$not"].toString = function () {
    return "not";
  };
  RuntimeContext.PREDEFINED["$cond"] = function (a) {
    this.assertBool(a); return function (b) {
      this.assertFunc(b); return function (c) {
        this.assertFunc(b); return a ? b(false) : c(false);
      };
    };
  };
  RuntimeContext.PREDEFINED["$cond"].toString = function () {
    return "cond";
  };

  global.lambda = {
    Parser: Parser,
    RuntimeContext: RuntimeContext
  };
})(this);
