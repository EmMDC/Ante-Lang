import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import {
  program,
  variableDeclaration,
  variable,
  binary,
  floatType,
} from "../src/core.js";

const semanticChecks = [
  ["simplest program", "raise(0);"],
  ["all in (const) variable declaration", "all in x = 1; hand y = 2 * x;"],
  ["no-arg raise", "raise();"],
  [
    "float annotation",
    "deal f(x: Float):\n  return x + 1;\nFOLD\nhand x = 1.0;",
  ],
  [
    "fallback-to-anyType for too-complex union",
    `
deal baz(x):
    if x == 0:
        return 1;
    FOLD
    if x == 1:
        return 2.2;
    FOLD
    if x == 2:
        return "three";
    FOLD
    if x == 3:
        return false;
    FOLD
    return 4;
FOLD

hand w = baz(3);
raise(w);
`,
  ],
  [" any annotation", "deal f(x: Any):\n  return x + 1;\nFOLD\nhand x = 1.0;"],
  ["adding floats to integers", "raise(1 + 2.2);\n  raise(1.1 + 2);"],
  ["floor division", "raise(1 %% 2);"],
  [
    "factorial function",
    "deal factorial(n: Int) -> Int:\n  if n == 0:\n    return 1;\n  else:\n    return n * factorial(n - 1);\nFOLD\nFOLD\nhand result = factorial(5);\nraise(result);",
  ],
  [
    "return inside a while loop",
    `
deal foo(x):
    // return buried in a while
    while x > 0:
        return x;
    FOLD
    // also a return after the loop
    return 0;
FOLD

hand r = foo(5);
raise(r);
`,
  ],

  [
    "Matching Annotation",
    "deal add(x: Int, y: Int) -> Int:\n return x + y;\nFOLD",
  ],
  [
    "return inside single-statement else-if",
    `
deal foo(x):
    if x == 0:
        return "zero";
    else if x > 0:
        return 1;
    FOLD
    return "fallback";
FOLD

hand v = foo(2);
raise(v);
`,
  ],
  ["type annotation", "deal f(x: Int):\n  return x + 1;\nFOLD\nhand x = f(1);"],
  ["arithmetic", "hand x = 1; raise(2 * 3 + 5 ** -3 / 2 - 5 % 8);"],
  ["nested arrays", "hand x = [1, [2, 3], 4];"],
  ["negation", "hand x = false;\nif !x:\n  raise(1);\nFOLD"],
  ["concatation", 'raise("hello" + ", " + "world");'],
  ["variables can be printed", "hand x = 1;\nraise(x);"],
  ["initialize variable with empty array", "hand x = [];"],
  ["objecy and member access", "hand x = {a: 1}; raise(x.a);"],
  ["break statement", "while true:\n  if 1 == 1:\n    break;\n  FOLD\nFOLD"],
  ["short return statement", "deal f(x):\n if x == 2:\n return;\n FOLD\nFOLD"],
  [
    "variable function",
    "deal f(a,b):\n  return a + b;\nFOLD\nhand x = f(1,2); raise(x);",
  ],
  ["and expression", "raise(true and false);"],
  ["or expression", "raise(true or false);"],
  ["for in loop", "hand x = [0,1,2];\nfor i in x:\n  raise(i);\nFOLD"],
  [
    "for in loop with  positive turn",
    "for i in turn(1, 3, 2):\n  raise(i);\nFOLD",
  ],
  [
    "for in loop with negative turn",
    "for i in turn(3, 1, -1):\n  raise(i);\nFOLD",
  ],
  [
    "for in loop with ternary step",
    "for i in turn(1, 3, 1+1):\n raise(i);\nFOLD",
  ],
  ["increment and decrement", "hand x = 10; x--; x++;"],
  ["call of assigned functions", 'deal f(x):\n  raise("hello");\nFOLD\nf(1);'],
  [
    "if else statement",
    "hand x = 10;\nif x > 5:\n  x = x - 1;\nelse:\n x = x + 1;\nFOLD",
  ],
  ["assign to array element", "hand a = [1,2,3]; a[1] = 100;"],
  ["subscripted string", 'hand x = "hello";\nraise(x[0]);'],
  [
    "else if statement",
    "hand x = 10;\nif x > 5:\n  x = x - 1;\nelse if x < 2:\n x = x + 1;\nFOLD",
  ],
  [
    "If-Elsif-Else Chain",
    "hand y = 0;\nif y > 0:\n y = y * 2;\nelse:\n if y == 0:\n y = 100;\nelse:\n   y = -100;\n  FOLD\nFOLD",
  ],
  ["while statement", "while true:\n    raise(1);\nFOLD"],
  ["if statement", "hand x  = 2;\nif x == 2:\n    raise(1);\nFOLD"],
  ["variables can be reassigned", "hand x = 1;\nx = x * 5 / ((-3) + x);"],
  ["built-in cos", "raise(cos(93.999));"],
  ["built-in sin", "raise(sin(1) + 1);"],
  ["built-in max", "raise(max(1, 2));"],
  ["built-in min", "raise(min(1, 2));"],
  ["built-in abs", "raise(abs(-1));"],
  [
    "adding results of functions",
    "deal f(x):\n  return x + 1;\nFOLD\nraise(f(1) + f(2));",
  ],
  [
    "several nested identifiers",
    "raise(ln(sqrt(sin(cos(hypot(π, 1) + exp(5.5E2))))));",
  ],
  ["multiple arg raise", "raise(1, 2, 3);"],
  [
    "annotation without returns",
    "deal noReturn(x: Bool) -> Bool:\n  hand y = x;\nFOLD",
  ],
  ["adding varaibles", "hand x = 1;\nhand y = 2;\nraise(x + y);"],
  [
    "annotation with matching return",
    "deal match(x: String) -> String:\n  return x;\nFOLD",
  ],
  [
    "union annotation matching returns",
    'deal foo(x: Int) -> Int|String:\n  if x > 0:\n    return 12;\n  FOLD\n  return "hello";\nFOLD',
  ],
];

const semanticErrors = [
  [
    "recursive function with no param type annotation",
    "deal factorial(n) -> Int:\n  if n == 0:\n    return 1;\n  else:\n    return n * factorial(n - 1);\nFOLD\nFOLD\nhand result = factorial(5);\nraise(result);",
    /Error: Recursive function 'factorial' requires type annotations for parameter\(s\): n/,
  ],
  [
    "recursive function with no return type annotation",
    "deal factorial(n:Int):\n  if n == 0:\n    return 1;\n  else:\n    return n * factorial(n - 1);\nFOLD\nFOLD\nhand result = factorial(5);\nraise(result);",
    /Error: Recursive function 'factorial' requires an explicit return type annotation/,
  ],
  [
    "function call with wrong number of arguments",
    "raise(sin(1, 2));",
    /1 argument\(s\) required but 2 passed/,
  ],
  [
    "user function wrong arg count",
    "deal f(a, b):\n  return a;\nFOLD\nf(1);",
    /2 argument\(s\) required but 1 passed/,
  ],
  [
    "incremmenting a string",
    'hand x = "hello"; x++;',
    /Cannot bump a variable of type string/,
  ],
  [
    "return annotation mismatch",
    "deal bad(x: Int) -> String:\n  return x;\nFOLD",
    /Return type annotation mismatch: expected string but found int/,
  ],
  [
    "union annotation mismatch with bool",
    "deal bad(x: Bool) -> Int|String:\n  return x;\nFOLD",
    /Return type annotation mismatch: expected int\|string but found boolean/,
  ],
  [
    "union annotation mismatch with float",
    "deal bad() -> Int|String:\n  return 1.5;\nFOLD",
    /Return type annotation mismatch: expected int\|string but found float/,
  ],
  [
    "redeclaring all in variable",
    "all in x = 1;\nx = 2;",
    /Can't back out of your all in!\s*\(redeclaration of allin\(const\) variable\)/,
  ],
  [
    "adding impossible types",
    "raise(1 + true);",
    /Expression type mismatch: int vs boolean/,
  ],
  [
    "adding impossible types",
    "hand x = 2;\nhand y = false;\nraise(x + y);",
    /Expression type mismatch: int vs boolean/,
  ],
  ["non-boolean condition", "if 1:\n  raise(1);\nFOLD", /Expected a boolean/],
  ["using undeclared identifier", "raise(x);", /Identifier x not declared/],
  [
    "too few arguments in turn",
    "for i in turn(1, 3):\n  raise(i);\nFOLD",
    /TurnCall requires exactly three parameters/,
  ],
  [
    "using step of size 0",
    "for i in turn(1, 3, 0):\n  raise(i);\nFOLD",
    /Step size must be non-zero/,
  ],
  [
    "variable used as function",
    "hand x = 1;\nx(2);",
    /Expected a function call on a function identifier/,
  ],
  [
    "subscripted int",
    "hand x = 1;\nraise(x[0]);",
    /Cannot subscript a value of type int/,
  ],
  [
    "subscripted bool",
    "hand x = false;\nraise(x[0]);",
    /Cannot subscript a value of type bool/,
  ],
  [
    "subscripted float",
    "hand x = 1.0;\nraise(x[0]);",
    /Cannot subscript a value of type float/,
  ],
  [
    "function used as variable",
    "raise(sin + 1);",
    /Functions cannot appear in this context/,
  ],
  [
    "re-declared identifier",
    "hand x = 1;\nhand x = 2;",
    /Identifier x already declared/,
  ],
  ["attempt to assign to read-only variable", "π = 3;", /π is read only/],
  [
    "too few arguments on built in function",
    "raise(sin());",
    /1 argument\(s\) required but 0 passed/,
  ],
  [
    "too many arguments on built in function",
    "raise(sin(5, 10));",
    /1 argument\(s\) required but 2 passed/,
  ],
  ["improper use of break", "break;", /Break statement must be inside a loop/],
  [
    "improper use of short return",
    "return;",
    /Return statement must be inside a function/,
  ],
  [
    "improper use of long return",
    "hand x = 1;\nreturn x;",
    /Return statement must be inside a function/,
  ],
  [
    "duplicate parameter",
    "deal f(x, x):\n  raise(x);\nFOLD",
    /Duplicate parameter name: x/,
  ],
];

describe("The Ante analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)), source);
    });
  }

  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern, source);
    });
  }

  it("produces the expected representation", () => {
    assert.deepEqual(
      analyze(parse("hand x = π + 2.2;")),
      program([
        variableDeclaration(
          variable("x", true, floatType),
          binary(
            "+",
            variable("π", false, floatType),
            { kind: "FloatLiteral", type: floatType, value: 2.2 },
            floatType
          )
        ),
      ])
    );
  });
});
