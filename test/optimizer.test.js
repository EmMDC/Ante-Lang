import { describe, it } from "node:test";
import assert from "node:assert/strict";
import optimize from "../src/optimizer.js";
import * as core from "../src/core.js";

//  literal builders
const lit = (kind, value, type) => ({ kind, value, type });
const I = (v) => lit("IntLiteral", v, core.intType);
const F = (v) => lit("FloatLiteral", v, core.floatType);
const B = (v) => lit("BoolLiteral", v, core.booleanType);
const BIN = (op, left, right, type = left.type) =>
  core.binary(op, left, right, type);

//  carlos shorthands
const x = core.variable("x", true, core.floatType);
const xpp = core.increment(x);
const program = core.program;
const or = (...ds) => ds.reduce((a, b) => core.binary("or", a, b));
const and = (...ds) => ds.reduce((a, b) => core.binary("and", a, b));
const less = (a, b) => core.binary("<", a, b);
const xmm = core.decrement(x);
const emptyArray = core.emptyArray(core.intType);

const tests = [
  ["folds +", BIN("+", I(5n), I(8n)), I(13n)],
  ["folds %", BIN("%", I(8n), I(3n)), I(2n)],
  ["folds %%", BIN("%%", I(9n), I(6n)), I(1n)],
  ["folds %% of int and float", BIN("%%", I(9.0), I(6n)), I(1.0)],
  ["folds -", BIN("-", I(5n), I(8n)), I(-3n)],
  ["folds *", BIN("*", I(5n), I(8n)), I(40n)],
  ["folds /", BIN("/", F(5), F(8)), F(0.625)],
  ["folds **", BIN("**", I(5n), I(8n)), I(390625n)],
  ["folds <", BIN("<", I(5n), I(8n), core.booleanType), B(true)],
  ["folds <=", BIN("<=", I(5n), I(8n), core.booleanType), B(true)],
  ["folds ==", BIN("==", I(5n), I(8n), core.booleanType), B(false)],
  ["folds !=", BIN("!=", I(5n), I(8n), core.booleanType), B(true)],
  ["folds == (bigint)", BIN("==", I(5n), I(5n), core.booleanType), B(true)],
  ["folds != (bigint)", BIN("!=", I(5n), I(5n), core.booleanType), B(false)],
  ["folds >= (bigint)", BIN(">=", I(8n), I(5n), core.booleanType), B(true)],
  ["folds > (bigint)", BIN(">", I(8n), I(5n), core.booleanType), B(true)],
  ["strength x + 0 ⇒ x", BIN("+", x, I(0n)), x],
  ["strength 0 + x ⇒ x", BIN("+", I(0n), x), x],
  ["strength x - 0 ⇒ x", BIN("-", x, I(0n)), x],
  ["strength 0 - x ⇒ -x", BIN("-", I(0n), x), core.unary("-", x)],
  ["strength x * 1 ⇒ x", BIN("*", x, I(1n)), x],
  ["strength 1 * x ⇒ x", BIN("*", I(1n), x), x],
  ["strength x * 0 ⇒ 0", BIN("*", x, I(0n)), I(0n)],
  ["strength 0 * x ⇒ 0", BIN("*", I(0n), x), I(0n)],
  ["strength x / 1 ⇒ x", BIN("/", x, I(1n)), x],
  ["strength 0 / x ⇒ 0", BIN("/", I(0n), x), I(0n)],
  ["strength 1 ** x ⇒ 1", BIN("**", I(1n), x), I(1n)],
  ["strength x ** 0 ⇒ 1", BIN("**", x, I(0n)), I(1n)],
  ["strength x ** 1 ⇒ x", BIN("**", x, I(1n)), x],
  (() => {
    const node = core.binary("%", 5, 8, core.intType);
    return ["fallback % (binary)", node, node];
  })(),
  [
    "removes x=x at beginning",
    program([core.assignment(x, x), xpp]),
    program([xpp]),
  ],
  ["removes x=x at end", program([xpp, core.assignment(x, x)]), program([xpp])],
  ["folds negation", core.unary("-", I(8n)), I(-8n)],
  ["folds negation of float", core.unary("-", F(8.0)), F(-8.0)],
  [
    "removes left true from and",
    and(true, less(I(4n), I(1n))),
    less(I(4n), I(1n)),
  ],
  [
    "removes right true from and",
    and(less(I(4n), I(1n)), true),
    less(I(4n), I(1n)),
  ],
  ["removes left false from and", and(false, less(I(4n), I(1n))), false],
  ["removes right false from and", and(less(I(4n), I(1n)), false), false],
  [
    "removes left false from or",
    or(false, less(I(4n), I(1n))),
    less(I(4n), I(1n)),
  ],
  [
    "removes right false from or",
    or(less(I(4n), I(1n)), false),
    less(I(4n), I(1n)),
  ],
  ["removes left true from or", or(true, less(I(4n), I(1n))), true],
  ["removes right true from or", or(less(I(4n), I(1n)), true), true],
  [
    "optimizes while-false",
    program([core.whileStatement(false, [xpp])]),
    program([]),
  ],
  ["optimizes if-true", core.ifStatement(true, [xpp], []), [xpp]],
  ["optimizes if-false", core.ifStatement(false, [], [xpp]), [xpp]],
  ["optimizes short-if-true", core.shortIfStatement(true, [xmm]), [xmm]],
  ["optimizes short-if-false", core.shortIfStatement(false, [xpp]), []],
  ["optimizes for-empty-array", core.forStatement(x, emptyArray, [xpp]), []],
  ["optimizes for-range", core.forTurnStatement(x, 5, "", 3, 1, [xpp]), []],
  [
    "preserves for-range with raw numbers",
    core.forTurnStatement(x, 1, ".", 5, 2, [xpp]),
    core.forTurnStatement(x, 1, ".", 5, 2, [xpp]),
  ],
  [
    "preserves for-range with AST literal nodes",
    core.forTurnStatement(x, I(1n), ".", I(5n), I(2n), [xpp]),
    core.forTurnStatement(x, I(1n), ".", I(5n), I(2n), [xpp]),
  ],
  [
    "optimizes AST-literal for-range no-run",
    core.forTurnStatement(x, I(5n), ".", I(3n), I(1n), [xpp]),
    [],
  ],
  [
    "literalizes variable true",
    core.variable("true", true, core.booleanType),
    B(true),
  ],
  [
    "literalizes variable false",
    core.variable("false", true, core.booleanType),
    B(false),
  ],
];

describe("The optimizer", () => {
  for (const [scenario, before, after] of tests) {
    it(scenario, () => {
      assert.deepEqual(optimize(before), after);
    });
  }
});

describe("fallback behavior", () => {
  it("returns the exact same node when no optimizer is defined for its kind", () => {
    const dummy = { kind: "NoSuchKind", foo: 123 };
    const result = optimize(dummy);
    assert.strictEqual(result, dummy);
  });
});
