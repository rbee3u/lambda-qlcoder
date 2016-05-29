/* Example definition of a simple mode that understands a subset of
 * JavaScript:
 */

CodeMirror.defineMode("lambda", function (_config, modeConfig) {
  function switchState(source, setState, f) {
    setState(f);
    return f(source, setState);
  }

  var whiteCharRE = /[ \t\v\f]/; // newlines are handled in tokenizer
  var idRE = /[a-zA-Z0-9_]/;

  function normal(source, setState) {
    if (source.eatWhile(whiteCharRE)) {
      return null;
    }

    var ch = source.next();
    if (ch === '\\') {
      return "operator";
    } else if (ch === '.') {
      return "operator";
    } else if (ch === '(') {
      return "operator";
    } else if (ch === ')') {
      return "operator";
    } else if (ch === '\\') {
      return "operator";
    } else if (ch === '(') {
      return "operator";
    } else if ('0' <= ch && ch <= '9') {
      return "number";
    } else if ('a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || '_' == ch) {
      source.eatWhile(idRE);
      return "variable";
    }
    return "error";
  }

  function ident(source, setState) {

  }

  var wellKnownWords = {
    "add": "keyword",
    "sub": "keyword",
    "mul": "keyword",
    "div": "keyword",
    "less": "keyword",
    "cond": "keyword",
    "true": "keyword atom",
    "false": "keyword atom"
  };

  return {
    startState: function () {
      return {f: normal};
    },
    copyState: function (s) {
      return {f: s.f};
    },

    token: function (stream, state) {
      var t = state.f(stream, function (s) {
        state.f = s;
      });
      var w = stream.current();
      return wellKnownWords.hasOwnProperty(w) ? wellKnownWords[w] : t;
    },

    closeBrackets: {pairs: "()"}
  };
});


CodeMirror.registerHelper("lint", "lambda", function(text) {
  var found = [];
  if (!window.lambda) return found;
  var parser = new lambda.Parser(text);

  try {
    var expr = parser.parse()
  } catch (e) {
    found.push({
      from: CodeMirror.Pos(e.line, e.column),
      to: CodeMirror.Pos(e.line, e.column + 1),
      message: e.message
    });
    return found;
  }

  try {
    new lambda.RuntimeContext().evaluate(expr);
  } catch (e) {
    found.push({
      from: CodeMirror.Pos(e.node.start.line, e.node.start.column),
      to: CodeMirror.Pos(e.node.end.line, e.node.end.column),
      message: e.message + "\nBound values:\n" + Object.keys(e.ctx.bound).filter(function (key) {
        return !{}.hasOwnProperty.call(lambda.RuntimeContext.PREDEFINED, key);
      }).map(function (key) {
        return key.slice(1) + " = " + e.ctx.bound[key].toString();
      }).join("\n")
    });
  }

  return found;
});

