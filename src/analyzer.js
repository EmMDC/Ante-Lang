import * as core from "./core.js";

// Represents a scope for variables and functions
class Context {
  constructor({ parent, locals = {} } = {}) {
    this.parent = parent;
    this.locals = new Map(Object.entries(locals));
  }
  add(name, entity) {
    this.locals.set(name, entity);
  }
  has(name) {
    return this.locals.has(name);
  }
  lookup(name) {
    return (
      this.locals.get(name) ||
      (this.parent ? this.parent.lookup(name) : undefined)
    );
  }
  newChildContext() {
    return new Context({ parent: this });
  }
}

export default function analyze(match) {
  // Create a new context with the standard library from core
  let context = new Context({ locals: core.standardLibrary });

  // Helper to check a condition; throws an error if condition fails
  function check(condition, message, at) {
    if (!condition) {
      const prefix = at.at?.source?.getLineAndColumnMessage
        ? at.at.source.getLineAndColumnMessage()
        : "";
      throw new Error(`${prefix}${message}`);
    }
  }
  function checkNotAlreadyDeclared(idNode, at) {
    check(
      !context.has(idNode.sourceString),
      `Identifier ${idNode.sourceString} already declared`,
      at
    );
  }
  function checkDeclared(entity, name, at) {
    check(entity, `Identifier ${name} not declared`, at);
  }
  function checkIsFunction(entity, at) {
    check(
      entity && entity.kind === "Function",
      "Expected a function call on a function identifier",
      at
    );
  }
  function checkIsBoolean(entity, at) {
    check(entity.type === core.booleanType, "Expected a boolean value", at);
  }
  function checkIsMutable(entity, at) {
    check(entity.mutable, `${entity.name} is read only`, at);
  }
  function checkNotFunction(entity, at) {
    if (entity && entity.kind === "Function") {
      throw new Error("Functions cannot appear in this context");
    }
  }
  function checkSameExp(exp1, exp2, at) {
    check(
      exp1.type === exp2.type ||
        (exp1.type === core.intType && exp2.type === core.floatType) ||
        (exp1.type === core.floatType && exp2.type === core.intType) ||
        exp1.type === core.anyType ||
        exp2.type === core.anyType,
      `Expression type mismatch: ${exp1.type} vs ${exp2.type}`,
      at
    );
  }
  function promoteType(type1, type2) {
    if (type1 === type2) return type1;
    if (
      (type1 === core.intType && type2 === core.floatType) ||
      (type1 === core.floatType && type2 === core.intType)
    ) {
      return core.floatType;
    }
  }
  function checkArgumentCount(args, callee, at) {
    const argCount = args.length;
    const paramCount = callee.intrinsic
      ? callee.type.paramTypes.length
      : callee.params.length;
    check(
      argCount === paramCount,
      `${paramCount} argument(s) required but ${argCount} passed`,
      at
    );
  }

  let loopDepth = 0;
  let funDepth = 0;
  const analyzer = match.matcher.grammar
    .createSemantics()
    .addOperation("analyze", {
      _iter(...children) {
        return children.map((child) => child.analyze());
      },
      Program(statements) {
        // Build a program using analyzed statements
        return core.program(statements.children.map((s) => s.analyze()));
      },
      Statement(stmt) {
        return stmt.analyze();
      },
      VarDecl(_hand, id, _eq, init, _semi) {
        // Variable declaration: check for duplicate and add variable to context
        checkNotAlreadyDeclared(id, { at: id });
        const initializer = init.analyze();
        const variable = core.variable(id.sourceString, true, initializer.type);
        context.add(id.sourceString, variable);
        return core.variableDeclaration(variable, initializer);
      },
      FunDecl(_deal, id, params, _colon, block) {
        // Function declaration: check for duplicates and set up new context
        checkNotAlreadyDeclared(id, { at: id });
        const parentContext = context;
        const parameters = params.analyze();
        const seen = new Set();
        for (const param of parameters) {
          if (seen.has(param.name)) {
            throw new Error(`Duplicate parameter name: ${param.name}`);
          }
          seen.add(param.name);
        }
        const fun = core.fun(id.sourceString, parameters, null);
        parentContext.add(id.sourceString, fun);
        context = parentContext.newChildContext();
        parameters.forEach((param) => context.add(param.name, param));
        funDepth++;
        try {
          const body = block.analyze();
          fun.body = body;
          let returnType = core.anyType;
          for (const stmt of body) {
            if (stmt.kind === "ReturnStatement") {
              returnType = stmt.expression.type;
              break;
            }
          }
          // Assign proper function type using core.functionType
          fun.type = core.functionType(
            parameters.map((param) => param.type),
            returnType
          );
        } finally {
          funDepth--;
          context = parentContext;
        }
        return core.functionDeclaration(fun);
      },

      Params(_open, list, _close) {
        return list.asIteration().children.map((child) => child.analyze());
      },
      Param(id) {
        return core.variable(id.sourceString, false);
      },
      Block(statements) {
        return statements.children.map((s) => s.analyze());
      },
      Statement_bump(exp, op, _semi) {
        // Increment or decrement operation on a mutable target
        const target = exp.analyze();
        checkIsMutable(target, op);
        return op.sourceString === "++"
          ? core.increment(target)
          : core.decrement(target);
      },
      Statement_assign(exp1, _eq, exp2, _semi) {
        const target = exp1.analyze();
        checkIsMutable(target, _eq);
        return core.assignment(target, exp2.analyze());
      },
      Statement_call(expCall, _semi) {
        return expCall.analyze();
      },
      Statement_raise(_raise, exp, _semi) {
        return core.raiseStatement(exp.analyze());
      },
      Statement_break(_break, _semi) {
        if (loopDepth === 0) {
          throw new Error("Break statement must be inside a loop");
        }
        return core.breakStatement();
      },
      Statement_return(_return, exp, _semi) {
        if (funDepth === 0) {
          throw new Error("Return statement must be inside a function");
        }
        return core.returnStatement(exp.analyze());
      },
      Statement_shortreturn(_return, _semi) {
        if (funDepth === 0) {
          throw new Error("Return statement must be inside a function");
        }
        return core.shortReturnStatement();
      },
      IfStmt_long(_if, exp, _colon, block1, _else, _colon2, block2) {
        const condition = exp.analyze();
        checkIsBoolean(condition, _if);
        return core.ifStatement(condition, block1.analyze(), block2.analyze());
      },
      IfStmt_elsif(_if, exp, _colon, block, _else, ifstmt) {
        const condition = exp.analyze();
        checkIsBoolean(condition, _if);
        return core.ifStatement(condition, block.analyze(), ifstmt.analyze());
      },
      IfStmt_short(_if, exp, _colon, block) {
        const condition = exp.analyze();
        checkIsBoolean(condition, _if);
        return core.shortIfStatement(condition, block.analyze());
      },
      LoopStmt_while(_while, exp, _colon, block) {
        loopDepth++;
        const result = core.whileStatement(exp.analyze(), block.analyze());
        loopDepth--;
        return result;
      },
      LoopStmt_range(_for, id, _in, turnCall, _colon, block) {
        // Handle a for-range loop, setting up a new child context for loop variable
        const variable = core.variable(id.sourceString, true);
        const parentContext = context;
        context = parentContext.newChildContext();
        context.add(id.sourceString, variable);
        loopDepth++;
        const body = block.analyze();
        loopDepth--;
        context = parentContext;
        const turnCallResult = turnCall.analyze();
        return core.forTurnStatement(
          variable,
          turnCallResult.low,
          turnCallResult.op,
          turnCallResult.high,
          turnCallResult.step,
          body
        );
      },
      LoopStmt_collection(_for, id, _in, exp, _colon, block) {
        // For-each loop over a collection
        const variable = core.variable(id.sourceString, true);
        const collection = exp.analyze();
        const parentContext = context;
        context = parentContext.newChildContext();
        context.add(id.sourceString, variable);
        loopDepth++;
        const body = block.analyze();
        loopDepth--;
        context = parentContext;
        return core.forStatement(variable, collection, body);
      },
      TurnCall(_turn, _open, args, _close) {
        // Ensure exactly three arguments for turnCall
        const argNodes = args.asIteration().children;
        if (argNodes.length !== 3) {
          throw new Error("TurnCall requires exactly three parameters");
        }
        const start = argNodes[0].analyze();
        const end = argNodes[1].analyze();
        const step = argNodes[2].analyze();
        let stepValue = step.value !== undefined ? step.value : step;
        if (
          step.kind === "UnaryExpression" &&
          step.op === "-" &&
          step.operand.value !== undefined
        ) {
          stepValue = -step.operand.value;
        }
        if (stepValue === 0) {
          throw new Error("Step size must be non-zero");
        }
        return {
          low: start,
          op: stepValue < 0 ? ">" : "<",
          high: end,
          step: step,
        };
      },
      Exp(exp) {
        return exp.analyze();
      },
      Exp_or(left, _op, right) {
        const x = left.analyze();
        const y = right.analyze();
        return core.binary("or", x, y, core.booleanType);
      },
      Exp_and(left, _op, right) {
        const x = left.analyze();
        const y = right.analyze();
        return core.binary("and", x, y, core.booleanType);
      },
      Exp_compare(exp, op, exp2) {
        return core.binary(
          op.sourceString,
          exp.analyze(),
          exp2.analyze(),
          core.booleanType
        );
      },
      Exp_add(exp, op, exp2) {
        const left = exp.analyze();

        const right = exp2.analyze();
        checkNotFunction(left, op);
        checkNotFunction(right, op);
        checkSameExp(left, right, op);
        const resultType = promoteType(left.type, right.type);
        return core.binary(op.sourceString, left, right, resultType);
      },
      Exp_multiply(exp, op, exp2) {
        const left = exp.analyze();
        const right = exp2.analyze();
        checkNotFunction(left, op);
        checkNotFunction(right, op);
        checkSameExp(left, right, op);
        const resultType = promoteType(left.type, right.type);
        return core.binary(op.sourceString, left, right, resultType);
      },
      Exp_power(exp, _op, exp2) {
        const left = exp.analyze();
        const right = exp2.analyze();
        checkNotFunction(left, _op);
        checkNotFunction(right, _op);
        checkSameExp(left, right, _op);
        const resultType = promoteType(left.type, right.type);
        return core.binary("**", left, right, resultType);
      },
      Exp_unary(op, exp) {
        const operand = exp.analyze();
        return core.unary(op.sourceString, operand, operand.type);
      },
      Exp_call(exp, _open, list, _close) {
        const callee = exp.analyze();
        const args = list.asIteration().children.map((x) => x.analyze());
        checkIsFunction(callee, _open);
        checkArgumentCount(args, callee, _open);
        return core.functionCall(callee, args);
      },
      Exp_subscript(exp, _open, index, _close) {
        const arrayEntity = exp.analyze();
        if (
          arrayEntity.type === core.booleanType ||
          arrayEntity.type === core.intType ||
          arrayEntity.type === core.floatType
        ) {
          throw new Error(
            "Cannot subscript a value of type " + arrayEntity.type
          );
        }
        return core.subscript(arrayEntity, index.analyze());
      },
      Exp_member(exp, _dot, id) {
        return core.memberExpression(exp.analyze(), _dot.sourceString, {
          name: id.sourceString,
        });
      },
      Exp_arrayexp(_open, list, _close) {
        const children = list.asIteration().children;
        return children.length === 0
          ? core.emptyArray(core.anyType)
          : core.arrayExpression(children.map((x) => x.analyze()));
      },
      Exp_parens(_open, exp, _close) {
        return exp.analyze();
      },
      true(_) {
        return { value: true, type: core.booleanType };
      },
      false(_) {
        return { value: false, type: core.booleanType };
      },
      floatlit(digits, _dot, _fractional, _e, _sign, _exponent) {
        return { value: Number(this.sourceString), type: core.floatType };
      },
      intlit(_) {
        return { value: Number(this.sourceString), type: core.intType };
      },
      stringlit(_open, chars, _close) {
        return { value: this.sourceString.slice(1, -1), type: core.stringType };
      },
      Object(_open, list, _close) {
        return {
          kind: "ObjectExpression",
          members: list.asIteration().children.map((m) => m.analyze()),
        };
      },
      Member(id, _colon, exp) {
        return { key: id.sourceString, value: exp.analyze() };
      },
      id(_first, _next) {
        const entity = context.lookup(this.sourceString);
        checkDeclared(entity, this.sourceString, this);
        return entity;
      },
    });
  return analyzer(match).analyze();
}
