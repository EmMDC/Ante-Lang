import { standardLibrary } from "./core.js";

export default function generate(program) {
  let output = [];

  const targetName = ((mapping) => {
    return (entity) => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1);
      }
      return `${entity.name}_${mapping.get(entity)}`;
    };
  })(new Map());

  const gen = (node) => generators?.[node?.kind]?.(node) ?? node;

  //helper for function calls
  function emitCalls(stmts) {
    for (const stmt of stmts) {
      const code = gen(stmt);
      if (stmt.kind === "FunctionCall" && code) {
        output.push(`${code};`);
      }
    }
  }

  const generators = {
    Program(p) {
      emitCalls(p.statements);
    },

    IntLiteral: (node) => node.value.toString(),
    FloatLiteral: (node) => node.value.toString(),
    StringLiteral: (node) => `"${node.value}"`,
    BoolLiteral: (node) => node.value.toString(),

    FunctionDeclaration(d) {
      output.push(
        `function ${gen(d.fun)}(${d.fun.params.map(gen).join(", ")}) {`
      );
      emitCalls(d.fun.body);
      output.push("}");
    },

    VariableDeclaration(d) {
      const init = gen(d.initializer);
      const decl = d.variable.allIn ? "const" : "let";
      output.push(`${decl} ${gen(d.variable)} = ${init};`);
    },
    Variable(v) {
      if (v === standardLibrary.π) return "Math.PI";
      return targetName(v);
    },

    EmptyArray() {
      return "[]";
    },

    ArrayExpression(node) {
      return `[${node.elements.map(gen).join(", ")}]`;
    },

    FunctionCall(n) {
      const callExpression = `${gen(n.callee)}(${n.args.map(gen).join(", ")})`;
      if (n.callee.name === "raise") {
        output.push(`console.log(${n.args.map(gen).join(", ")});`);
        return "";
      }
      return callExpression;
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
      emitCalls(s.body);
      output.push("}");
    },
    IfStatement(s) {
      const start = `if (${gen(s.test)}) {`;
      output.push(start);
      s.consequent.forEach(gen);
      if (s.alternate?.kind?.endsWith?.("IfStatement")) {
        const altBuffer = [];
        const oldOutput = output;
        output = altBuffer;
        gen(s.alternate);
        const altLine = altBuffer.join("\n").trim();
        output = oldOutput;
        output.push(`} else ${altLine}`);
      } else if (Array.isArray(s.alternate)) {
        output.push("} else {");
        s.alternate.forEach(gen);
        output.push("}");
      }
    },
    ShortIfStatement(s) {
      output.push(`if (${gen(s.test)}) {`);
      emitCalls(s.consequent);
      output.push("}");
    },
    ForStatement(s) {
      output.push(`for (let ${gen(s.iterator)} of ${gen(s.collection)}) {`);
      emitCalls(s.body);
      output.push("}");
    },

    ForTurnStatement(s) {
      const varName = gen(s.iterator);
      output.push(
        `for (let ${varName} = ${gen(s.lower)}; ${varName} ${s.direction} ${gen(
          s.upper
        )}; ${varName} += ${gen(s.step)}) {`
      );
      emitCalls(s.body);
      output.push("}");
    },

    Function(f) {
      return targetName(f);
    },
    BinaryExpression(e) {
      if (e.op === "hypot")
        return `Math.hypot(${gen(e.left)}, ${gen(e.right)})`;
      const op =
        { "==": "===", "!=": "!==", or: "||", and: "&&" }[e.op] ?? e.op;
      return `(${gen(e.left)} ${op} ${gen(e.right)})`;
    },

    UnaryExpression(e) {
      const operand = gen(e.operand);
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
  };
  gen(program);
  return output.join("\n");
}
