import { standardLibrary } from "./core.js";

export default function generate(program) {
  const output = [];

  const targetName = ((mapping) => {
    return (entity) => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1);
      }
      return `${entity.name}_${mapping.get(entity)}`;
    };
  })(new Map());

  const gen = (node) => generators?.[node?.kind]?.(node) ?? node;

  const generators = {
    Program(p) {
      p.statements.forEach(gen);
    },

    IntLiteral: (node) => node.value.toString(),
    FloatLiteral: (node) => node.value.toString(),
    StringLiteral: (node) => `"${node.value}"`,

    FunctionDeclaration(d) {
      output.push(
        `function ${gen(d.fun)}(${d.fun.params.map(gen).join(", ")}) {`
      );
      d.fun.body.forEach(gen);
      output.push("}");
    },

    VariableDeclaration(d) {
      if (d.variable.allIn) {
        output.push(`const ${gen(d.variable)} = ${gen(d.initializer)};`);
      } else {
        output.push(`let ${gen(d.variable)} = ${gen(d.initializer)};`);
      }
    },
    Variable(v) {
      if (standardLibrary[v.name] === v) return v.name;
      return targetName(v);
    },

    EmptyArray() {
      return "[]";
    },

    ArrayExpression(node) {
      return `[${node.elements.map(gen).join(", ")}]`;
    },

    FunctionCall(n) {
      // Handle raise function specially
      if (n.callee.name === "raise") {
        output.push(`console.log(${n.args.map(gen).join(", ")});`);
        return "";
      }
      return `${gen(n.callee)}(${n.args.map(gen).join(", ")})`;
    },

    BreakStatement() {
      output.push("break;");
    },

    Assignment(s) {
      output.push(`${gen(s.target)} = ${gen(s.source)};`);
    },
    Increment(s) {
      output.push(`${gen(s.variable)}++;`);
    },
    Decrement(s) {
      output.push(`${gen(s.variable)}--;`);
    },

    ReturnStatement(node) {
      output.push(`return ${gen(node.expression)};`);
    },
    ShortReturnStatement() {
      output.push("return;");
    },

    WhileStatement(s) {
      output.push(`while (${gen(s.test)}) {`);
      s.body.forEach(gen);
      output.push("}");
    },
    IfStatement(s) {
      output.push(`if (${gen(s.test)}) {`);
      s.consequent.forEach(gen);

      const generateElse = (node) => {
        if (Array.isArray(node)) {
          output.push("} else {");
          node.forEach(gen);
          output.push("}");
        } else {
          output.push(`} else if (${gen(node.test)}) {`);
          node.consequent.forEach(gen);

          generateElse(node.alternate);
        }
      };

      generateElse(s.alternate);
    },
    ShortIfStatement(s) {
      output.push(`if (${gen(s.test)}) {`);
      s.consequent.forEach(gen);
      output.push("}");
    },

    ForStatement(s) {
      output.push(`for (let ${gen(s.iterator)} of ${gen(s.collection)}) {`);
      s.body.forEach(gen);
      output.push("}");
    },

    ForTurnStatement(s) {
      const varName = gen(s.iterator);
      const start = gen(s.lower);
      const condition = `${varName} ${s.direction} ${gen(s.upper)}`;
      const step = gen(s.step);
      output.push(
        `for (let ${varName} = ${start}; ${condition}; ${varName} += ${step}) {`
      );
      s.body.forEach(gen);
      output.push("}");
    },

    Function(f) {
      return targetName(f);
    },
    BinaryExpression(e) {
      if (e.op === "hypot")
        return `Math.hypot(${gen(e.left)}, ${gen(e.right)})`;

      if (e.op === "%%") return `Math.floor(${gen(e.left)} / ${gen(e.right)})`;

      if (e.op === "%") return `(${gen(e.left)} % ${gen(e.right)})`;

      const op =
        { "==": "===", "!=": "!==", or: "||", and: "&&" }[e.op] ?? e.op;
      return `(${gen(e.left)} ${op} ${gen(e.right)})`;
    },

    UnaryExpression(e) {
      const operand = gen(e.operand);
      // No need to handle raise here since it's handled in FunctionCall
      if (e.op === "random")
        return `((a=>a[~~(Math.random()*a.length)])(${operand}))`;
      if (e.op === "codepoints")
        return `[...(${operand})].map(s=>s.codePointAt(0))`;
      if (e.op === "bytes") return `[...Buffer.from(${operand}, "utf8")]`;
      if (e.op === "sqrt") return `Math.sqrt(${operand})`;
      if (e.op === "sin") return `Math.sin(${operand})`;
      if (e.op === "cos") return `Math.cos(${operand})`;
      if (e.op === "exp") return `Math.exp(${operand})`;
      if (e.op === "ln") return `Math.log(${operand})`;
      if (e.op === "abs") return `Math.abs(${operand})`;
      return `${e.op}(${operand})`;
    },
    MemberExpression(e) {
      return `${gen(e.object)}.${e.field.name}`;
    },
    SubscriptExpression(e) {
      return `${gen(e.array)}[${gen(e.index)}]`;
    },
    ObjectExpression(e) {
      const members = e.members.map((m) => `${m.key}: ${gen(m.value)}`);
      return `{ ${members.join(", ")} }`;
    },
    // Removing the Raise function since we handle it in FunctionCall now
  };
  gen(program);
  return output.join("\n");
}
