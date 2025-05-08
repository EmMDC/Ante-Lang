import { describe, it } from "node:test";
import assert from "node:assert/strict";
import optimize from "../src/optimizer.js";
import * as core from "../src/core.js";

const tests = [
  ["folds +", core.binary("+", 5, 8), 13],
  ["folds -", core.binary("-", 5, 8), -3],
  ["folds +", core.binary("+", 5n, 8n), 13n],
  ["folds -", core.binary("-", 5n, 8n), -3n],
  ["folds *", core.binary("*", 5, 8), 40],
  ["folds /", core.binary("/", 5, 8), 0.625],
  ["folds **", core.binary("**", 5, 8), 390625],
  ["folds <", core.binary("<", 5, 8), true],
  ["folds <=", core.binary("<=", 5, 8), true],
  ["folds ==", core.binary("==", 5, 8), false],
  ["folds !=", core.binary("!=", 5, 8), true],
  ["folds >=", core.binary(">=", 5, 8), false],
  ["folds >", core.binary(">", 5, 8), false],
  ["folds * (bigint)", core.binary("*", 5n, 8n), 40n],
  ["folds / (bigint)", core.binary("/", 5n, 8n), 0n],
  ["folds ** (bigint)", core.binary("**", 2n, 3n), 8n],
  ["folds < (bigint)", core.binary("<", 5n, 8n), true],
  ["folds <= (bigint)", core.binary("<=", 5n, 5n), true],
  ["folds == (bigint)", core.binary("==", 5n, 5n), true],
  ["folds != (bigint)", core.binary("!=", 5n, 5n), false],
  ["folds >= (bigint)", core.binary(">=", 8n, 5n), true],
  ["folds > (bigint)", core.binary(">", 8n, 5n), true],
  (() => {
    const node = core.binary("%", 5, 8);
    return ["fallback % (binary)", node, node];
  })(),
];

describe("The optimizer", () => {
  for (const [scenario, before, after] of tests) {
    it(`${scenario}`, () => {
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
