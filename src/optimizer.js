import * as core from "./core.js";

export default function optimize(node) {
  return optimizers?.[node.kind]?.(node) ?? node;
}

const optimizers = {
  // Optimize BinaryExpression nodes
  BinaryExpression(node) {
    const left = optimize(node.left);
    const right = optimize(node.right);

    // Number constant folding
    if (typeof left === "number" && typeof right === "number") {
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "**":
          return left ** right;
        case "<":
          return left < right;
        case "<=":
          return left <= right;
        case "==":
          return left === right;
        case "!=":
          return left !== right;
        case ">=":
          return left >= right;
        case ">":
          return left > right;
      }
    }

    if (typeof left === "bigint" && typeof right === "bigint") {
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "**":
          return left ** right;
        case "<":
          return left < right;
        case "<=":
          return left <= right;
        case "==":
          return left === right;
        case "!=":
          return left !== right;
        case ">=":
          return left >= right;
        case ">":
          return left > right;
      }
    }

    return node;
  },
};
