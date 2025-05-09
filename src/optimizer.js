import * as core from "./core.js";

// optimizations:
//   - assignments to self (x = x) turn into no-ops
//   - constant folding
//   - some strength reductions (+0, -0, *0, *1, etc.)
//   - turn references to built-ins true and false to be literals
//   - remove all disjuncts in or list after literal true
//   - remove all conjuncts in and list after literal false
//   - while-false becomes a no-op
//   - for-loop over empty array is a no-op
//   - for-loop with low > high is a no-op
//   - if-true and if-false reduce to only the taken arm

export default function optimize(node) {
  return optimizers?.[node.kind]?.(node) ?? node;
}

const isZero = (n) => n === 0 || n === 0n;
const isOne = (n) => n === 1 || n === 1n;

const arithmeticOps = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
  "**": (a, b) => a ** b,
  "%": (a, b) => a % b,
  "%%": (a, b) => {
    if (typeof a === "bigint" && typeof b === "bigint") {
      return a / b;
    }
    return Math.floor(Number(a) / Number(b));
  },
};

const comparisonOps = {
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  "==": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  ">=": (a, b) => a >= b,
  ">": (a, b) => a > b,
};

const optimizers = {
  Program(p) {
    p.statements = p.statements.flatMap(optimize);
    return p;
  },
  VariableDeclaration(node) {
    const init = optimize(node.initializer);
    node.initializer = init;
    return node;
  },
  FunctionDeclaration(d) {
    d.fun = optimize(d.fun);
    return d;
  },
  Function(f) {
    if (f.body) f.body = f.body.flatMap(optimize);
    return f;
  },
  Increment(s) {
    s.variable = optimize(s.variable);
    return s;
  },
  Decrement(s) {
    s.variable = optimize(s.variable);
    return s;
  },
  Assignment(s) {
    s.source = optimize(s.source);
    s.target = optimize(s.target);
    if (s.source === s.target) {
      return [];
    }
    return s;
  },
  BreakStatement(s) {
    return s;
  },
  ReturnStatement(s) {
    s.expression = optimize(s.expression);
    return s;
  },
  ShortReturnStatement(s) {
    return s;
  },
  WhileStatement(s) {
    s.test = optimize(s.test);
    if (s.test === false) {
      // while false is a no-op
      return [];
    }
    s.body = s.body.flatMap(optimize);
    return s;
  },
  UnaryExpression(node) {
    const operand = optimize(node.operand);
    const op = node.op;
    // constant folding for negation
    if (
      op === "-" &&
      (operand.kind === "IntLiteral" || operand.kind === "FloatLiteral")
    ) {
      const value = operand.value;
      const negatedValue = -value;
      return {
        kind: operand.kind,
        value: negatedValue,
        type: operand.kind === "IntLiteral" ? core.intType : core.floatType,
      };
    }
    return { ...node, operand };
  },
  IfStatement(s) {
    s.test = optimize(s.test);
    s.consequent = s.consequent.flatMap(optimize);
    if (s.alternate?.kind?.endsWith?.("IfStatement")) {
      s.alternate = optimize(s.alternate);
    } else {
      s.alternate = s.alternate.flatMap(optimize);
    }
    if (s.test.constructor === Boolean) {
      return s.test ? s.consequent : s.alternate;
    }
    return s;
  },
  ShortIfStatement(s) {
    s.test = optimize(s.test);
    s.consequent = s.consequent.flatMap(optimize);
    if (s.test.constructor === Boolean) {
      return s.test ? s.consequent : [];
    }
    return s;
  },
  ForStatement(s) {
    s.iterator = optimize(s.iterator);
    s.collection = optimize(s.collection);
    s.body = s.body.flatMap(optimize);
    if (s.collection?.kind === "EmptyArray") {
      return [];
    }
    return s;
  },

  BinaryExpression(node) {
    // identity removal for and/or
    if (node.op === "and") {
      if (node.left === false) return node.left;
      if (node.right === false) return node.right;
      if (node.left === true) return node.right;
      if (node.right === true) return node.left;
    } else if (node.op === "or") {
      if (node.left === true) return node.left;
      if (node.right === true) return node.right;
      if (node.left === false) return node.right;
      if (node.right === false) return node.left;
    }
    const left = optimize(node.left);
    const right = optimize(node.right);
    const op = node.op;
    const leftIsNumericLiteral =
      left.kind === "IntLiteral" || left.kind === "FloatLiteral";
    const rightIsNumericLiteral =
      right.kind === "IntLiteral" || right.kind === "FloatLiteral";
    const lval = leftIsNumericLiteral ? left.value : undefined;
    const rval = rightIsNumericLiteral ? right.value : undefined;

    // left constant optimizations
    if (
      leftIsNumericLiteral &&
      (typeof lval === "bigint" || typeof lval === "number")
    ) {
      if (isZero(lval) && op === "+") return right;
      if (isOne(lval) && op === "*") return right;
      if (isZero(lval) && op === "-") return core.unary("-", right);
      if (isOne(lval) && op === "**")
        return { kind: "IntLiteral", value: 1n, type: core.intType };
      if (isZero(lval) && op === "*") return left;
      if (isZero(lval) && op === "/") return left;
    }

    // right constant optimizations
    if (
      rightIsNumericLiteral &&
      (typeof rval === "bigint" || typeof rval === "number")
    ) {
      if (isZero(rval) && op === "+") return left;
      if (isOne(rval) && op === "*") return left;
      if (isOne(rval) && op === "/") return left;
      if (isZero(rval) && op === "-") return left;
      if (isZero(rval) && op === "*")
        return { kind: "IntLiteral", value: 0n, type: core.intType };
      if (isZero(rval) && op === "**")
        return { kind: "IntLiteral", value: 1n, type: core.intType };
      if (isOne(rval) && op === "**") return left;
    }

    // constant folding for numeric literals
    if (leftIsNumericLiteral && rightIsNumericLiteral) {
      const isInt = left.kind === "IntLiteral";
      const resultType = isInt ? "int" : "float";
      if (arithmeticOps[op]) {
        return {
          kind: left.kind,
          value: arithmeticOps[op](lval, rval),
          type: resultType,
        };
      }
      if (comparisonOps[op]) {
        return {
          kind: "BoolLiteral",
          value: comparisonOps[op](lval, rval),
          type: "boolean",
        };
      }
    }

    return { ...node, left, right };
  },
  ForTurnStatement(s) {
    s.iterator = optimize(s.iterator);
    s.lower = optimize(s.lower);
    s.upper = optimize(s.upper);
    s.step = optimize(s.step);
    s.body = s.body.flatMap(optimize);
    const isLiteral = (v) =>
      (v && typeof v === "object") ||
      typeof v === "number" ||
      typeof v === "bigint";
    if (isLiteral(s.lower) && isLiteral(s.upper) && isLiteral(s.step)) {
      const lowerVal =
        typeof s.lower === "object" && s.lower.value !== undefined
          ? s.lower.value
          : s.lower;
      const upperVal =
        typeof s.upper === "object" && s.upper.value !== undefined
          ? s.upper.value
          : s.upper;
      const stepVal =
        typeof s.step === "object" && s.step.value !== undefined
          ? s.step.value
          : s.step;
      if (
        (stepVal > 0 && lowerVal > upperVal) ||
        (stepVal < 0 && lowerVal < upperVal)
      ) {
        return [];
      }
    }
    return s;
  },
  SubscriptExpression(e) {
    e.array = optimize(e.array);
    e.index = optimize(e.index);
    return e;
  },
  ArrayExpression(e) {
    e.elements = e.elements.map(optimize);
    return e;
  },

  FunctionCall(c) {
    // cannot optimize callee as that breaks everything

    c.args = c.args.map(optimize);
    return c;
  },
  MemberExpression(e) {
    e.object = optimize(e.object);
    return e;
  },
  Variable(node) {
    if (node.name === "true") {
      return { kind: "BoolLiteral", value: true, type: "boolean" };
    } else if (node.name === "false") {
      return { kind: "BoolLiteral", value: false, type: "boolean" };
    }
    return node;
  },
};
