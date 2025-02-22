import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

// Programs expected to be syntactically correct in Ante
const syntaxChecks = [
  ["simplest program", "raise(0);"],
  ["multiple statements", "raise(1);\nraise(2);\nhand x = 5;"],
  ["variable declarations", "hand e = 99 * 1;\nhand z = false;"],
  [
    "function with parameter",
    'deal greet(name):\n    raise("Hello, {name}!");\ngreet("Alice");',
  ],
  [
    "function returning value",
    "deal factorial(n):\n    if n == 0:\n        return 1;\n    else:\n        return n * factorial(n - 1);\nhand result = factorial(5);\nraise(result);",
  ],
  ["for loop", "for hand i in range(3):\n    raise(i);"],
  ["array literal and indexing", "hand arr = [10, 20, 30];\nraise(arr[1]);"],
  [
    "object literal and member access",
    'hand person = {\n    name: "Alice",\n    age: 25\n};\nraise(person.name);',
  ],
  [
    "single-line and multi-line comments",
    "raise(1); // this is a comment\n--\nthis is a\nmulti-line comment\n--\nraise(2);",
  ],
  ["string literal with escapes", 'raise("a\\n\\tbc\\\\de\\"fg");'],
  ["non-Latin identifier", "hand コンパイラ = 100;\nraise(コンパイラ);"],
];

// Programs with syntax errors that the parser should detect in Ante
const syntaxErrors = [
  ["non-letter in an identifier", "hand ab😭c = 2;"],
  ["malformed number", "hand x = 2.;"],
  ["missing colon after function definition", "deal f()\n    raise(1);"],
  ["missing right operand", "raise(5 -);"],
  ["unclosed string literal", 'raise("hello);'],
  ["invalid comment delimiter", "raise(1); /* comment */"],
  ["using braces instead of colon in function", "deal f() { raise(1); }"],
  ["missing semicolon at end of statement", "raise(1)\nhand x = 10;"],
  ["using wrong keyword for function", "def f():\n    raise(1);"],
];

describe("The Ante parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`parses ${scenario}`, () => {
      assert(parse(source).succeeded(), source);
    });
  }
  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern, source);
    });
  }
});
