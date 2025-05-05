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
  ["adding floats to integers", "raise(1 + 2.2);\n  raise(1.1 + 2);"],
  ["floor division", "raise(1 %% 2);"],
  [
    "factorial function",
    "deal factorial(n):\n  if n == 0:\n    return 1;\n  else:\n    return n * factorial(n - 1);\nFOLD\nFOLD\nhand result = factorial(5);\nraise(result);",
  ],
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
    "raise ln(sqrt(sin(cos(hypot(π, 1) + exp(5.5E2)))));",
  ],
  ["adding varaibles", "hand x = 1;\nhand y = 2;\nraise(x + y);"],
];

const semanticErrors = [
  [
    "function call with wrong number of arguments",
    "raise(sin(1, 2));",
    /1 argument\(s\) required but 2 passed/,
  ],
  [
    "incremmenting a string",
    'hand x = "hello"; x++;',
    /Cannot bump a variable of type string/,
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
