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
  function findAllReturns(statements) {
    const returns = [];
    for (const stmt of statements) {
      if (stmt.kind === "ReturnStatement") {
        returns.push(stmt);
      } else if (stmt.kind === "IfStatement") {
        returns.push(...findAllReturns(stmt.consequent));
        if (Array.isArray(stmt.alternate)) {
          returns.push(...findAllReturns(stmt.alternate));
        } else if (stmt.alternate) {
          returns.push(...findAllReturns([stmt.alternate]));
        }
      } else if (stmt.kind === "ShortIfStatement") {
        returns.push(...findAllReturns(stmt.consequent));
      } else if (
        stmt.kind === "WhileStatement" ||
        stmt.kind === "ForStatement" ||
        stmt.kind === "ForTurnStatement"
      ) {
        returns.push(...findAllReturns(stmt.body));
      }
    }
    return returns;
  }

  function checkIsBoolean(entity, at) {
    check(entity.type === core.booleanType, "Expected a boolean value", at);
  }
  function checkIsMutable(entity, at) {
    if (!entity.mutable) {
      if (entity.allIn) {
        throw new Error(
          "Can't back out of your all in!(redeclaration of allin(const) variable)"
        );
      }
      throw new Error(`${entity.name} is read only`);
    }
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
  function checkIsNum(entity, at, customMsg) {
    check(
      entity.type === core.intType || entity.type === core.floatType,
      customMsg || "Expected a float or int value",
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

  // Flatten a mix of primitive types and UnionType objects into a flat array of unique types
  function flattenUnion(types) {
    const seen = new Set();
    function recur(t) {
      // If this is a UnionType, recurse into its .types array
      if (t && t.kind === "UnionType" && Array.isArray(t.types)) {
        t.types.forEach(recur);
      } else {
        // Primitive types are just strings (e.g. "int", "string")
        seen.add(t);
      }
    }
    types.forEach(recur);
    return Array.from(seen);
  }

  let loopDepth = 0;
  let funDepth = 0;
  const analyzer = match.matcher.grammar
    .createSemantics()
    .addOperation("analyze", {
      Program(statements) {
        // Build a program using analyzed statements
        return core.program(statements.children.map((s) => s.analyze()));
      },
      Statement(stmt) {
        return stmt.analyze();
      },
      //this if for hand variable declaration
      VarDecl(_hand, id, _eq, init, _semi) {
        checkNotAlreadyDeclared(id, { at: id });
        const initializer = init.analyze();
        const variable = core.variable(id.sourceString, true, initializer.type);
        context.add(id.sourceString, variable);
        return core.variableDeclaration(variable, initializer);
      },
      //same as const variable declaration
      AllInVarDecl(_all_in, id, _eq, init, _semi) {
        checkNotAlreadyDeclared(id, { at: id });
        const initializer = init.analyze();
        const variable = core.variable(
          id.sourceString,
          false,
          initializer.type
        );
        // Mark the variable as an "all in" variable.
        variable.allIn = true;
        context.add(id.sourceString, variable);
        return core.variableDeclaration(variable, initializer);
      },
      // --- In analyzer.js, replace your existing FunDecl semantic action with the block below. ---
      FunDecl(
        _deal,
        id,
        paramsNode,
        returnAnnotIter,
        _colon,
        statementsNode,
        _fold
      ) {
        // 1. Ensure function isn’t already declared
        checkNotAlreadyDeclared(id, { at: id });

        // 2. Parse parameters
        const parameters = paramsNode.analyze();

        // 3. Pre‐analyze optional return annotation
        const annotatedType =
          returnAnnotIter.children.length > 0
            ? returnAnnotIter.children[0].analyze()
            : null;

        // 4. Create the Function entity early (for recursion) and assign its type
        const fun = core.fun(id.sourceString, parameters, null);
        fun.type = core.functionType(
          parameters.map((p) => p.type),
          annotatedType ?? core.anyType
        );
        context.add(id.sourceString, fun);

        // 5. Enter new child context for body
        const parentContext = context;
        funDepth++;
        context = parentContext.newChildContext();
        parameters.forEach((p) => context.add(p.name, p));

        // Prevent duplicate param names
        const seen = new Set();
        for (const param of parameters) {
          if (seen.has(param.name)) {
            throw new Error(`Duplicate parameter name: ${param.name}`);
          }
          seen.add(param.name);
        }

        try {
          // 6. Analyze the function body statements
          const body = statementsNode.children.map((s) => s.analyze());
          fun.body = body;

          // 7. NEW: detect recursion by scanning the raw body text
          const bodyText = statementsNode.sourceString;
          const isRecursive = bodyText.includes(id.sourceString + "(");
          if (isRecursive) {
            if (!annotatedType) {
              throw new Error(
                `Recursive function '${id.sourceString}' requires an explicit return type annotation`
              );
            }
            const missing = parameters
              .filter((p) => p.type === core.anyType)
              .map((p) => p.name);
            if (missing.length) {
              throw new Error(
                `Recursive function '${
                  id.sourceString
                }' requires type annotations for parameter(s): ${missing.join(
                  ", "
                )}`
              );
            }
          }

          // 8. Collect all returned expressions
          const returnExpressions = findAllReturns(body).map(
            (s) => s.expression
          );

          // 9. Enforce return‐type annotation if given
          if (annotatedType) {
            const allowed = flattenUnion([annotatedType]);
            returnExpressions.forEach((expr) => {
              if (!allowed.includes(expr.type)) {
                throw new Error(
                  `Return type annotation mismatch: expected ${allowed.join(
                    "|"
                  )} but found ${expr.type}`
                );
              }
            });
            // fun.type.returnType remains the annotatedType

            // 10. Otherwise, fall back to inference
          } else if (returnExpressions.length > 0) {
            const allTypes = returnExpressions.map((e) => e.type);
            const uniqueTypes = [...new Set(allTypes)];

            let inferredType;
            if (uniqueTypes.length === 1) {
              inferredType = uniqueTypes[0];
            } else if (uniqueTypes.length <= 3) {
              inferredType = core.unionType(uniqueTypes);
            } else {
              inferredType = core.anyType;
            }

            fun.type.returnType = inferredType;
          }
        } finally {
          // 11. Exit function scope
          funDepth--;
          context = parentContext;
        }

        // 12. Build and return the function declaration node
        return core.functionDeclaration(fun);
      },

      // Unwrap parameter list manually
      Params(_open, list, _close) {
        return list.asIteration().children.map((p) => p.analyze());
      },

      // Parameter with optional type annotation
      Param(id, typeAnnotIter) {
        const paramType =
          typeAnnotIter.children.length > 0
            ? typeAnnotIter.children[0].analyze()
            : core.anyType;
        return core.variable(id.sourceString, false, paramType);
      },

      // ReturnAnnot holds a Type node
      ReturnAnnot(_arrow, typeNode) {
        return typeNode.analyze();
      },

      // TypeAnnot unwraps to the Type node
      TypeAnnot(_colon, typeNode) {
        return typeNode.analyze();
      },

      TypeUnion(first, _bars, rest) {
        const types = [
          first.analyze(),
          ...rest.children.map((c) => c.analyze()),
        ];
        const unique = [...new Set(types)];
        return unique.length === 1 ? unique[0] : core.unionType(unique);
      },

      // Provide a semantic action for Type to avoid needing a generic _terminal
      Type(typeToken) {
        switch (typeToken.sourceString) {
          case "Int":
            return core.intType;
          case "Float":
            return core.floatType;
          case "Bool":
            return core.booleanType;
          case "String":
            return core.stringType;
          case "Any":
            return core.anyType;
        }
      },

      Statement_bump(exp, op, _semi) {
        // Increment or decrement operation on a mutable target
        const target = exp.analyze();
        checkIsNum(target, op, `Cannot bump a variable of type ${target.type}`);
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
      IfStmt_ifelse(
        _if,
        exp,
        _colon,
        statements,
        _else,
        _colon2,
        elseStatements,
        _fold
      ) {
        const condition = exp.analyze();
        checkIsBoolean(condition, _if);
        const consequent = statements.children.map((s) => s.analyze());
        const alternate = elseStatements.children.map((s) => s.analyze());
        return core.ifStatement(condition, consequent, alternate);
      },
      IfStmt_elsif(_if, exp, _colon, statements, _else, ifstmt) {
        const condition = exp.analyze();
        checkIsBoolean(condition, _if);
        const consequent = statements.children.map((s) => s.analyze());
        return core.ifStatement(condition, consequent, ifstmt.analyze());
      },
      IfStmt_short(_if, exp, _colon, statements, _fold) {
        const condition = exp.analyze();
        checkIsBoolean(condition, _if);
        const body = statements.children.map((s) => s.analyze());
        return core.shortIfStatement(condition, body);
      },
      LoopStmt_while(_while, exp, _colon, statements, _fold) {
        const condition = exp.analyze();
        checkIsBoolean(condition, _while);
        loopDepth++;
        const body = statements.children.map((s) => s.analyze());
        loopDepth--;
        return core.whileStatement(condition, body);
      },
      LoopStmt_range(_for, id, _in, turnCall, _colon, statements, _fold) {
        // Handle a for-range loop, setting up a new child context for loop variable
        const iterator = core.variable(id.sourceString, true);
        const parentContext = context;
        context = parentContext.newChildContext();
        context.add(id.sourceString, iterator);
        loopDepth++;
        const body = statements.children.map((s) => s.analyze());
        loopDepth--;
        context = parentContext;
        const turnCallResult = turnCall.analyze();
        return core.forTurnStatement(
          iterator,
          turnCallResult.low,
          turnCallResult.op,
          turnCallResult.high,
          turnCallResult.step,
          body
        );
      },
      LoopStmt_collection(_for, id, _in, exp, _colon, statements, _fold) {
        const iterator = core.variable(id.sourceString, true);
        const collection = exp.analyze();
        const parentContext = context;
        context = parentContext.newChildContext();
        context.add(id.sourceString, iterator);
        loopDepth++;
        const body = statements.children.map((s) => s.analyze());
        loopDepth--;
        context = parentContext;
        return core.forStatement(iterator, collection, body);
      },
      TurnCall(_turn, _open, args, _close) {
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
        if (stepValue === 0n || stepValue === 0.0) {
          throw new Error("Step size must be non-zero");
        }
        return {
          low: start,
          op: stepValue < 0 ? ">" : "<",
          high: end,
          step: stepValue,
        };
      },
      Exp_compare(exp, op, exp2) {
        const left = exp.analyze();
        const right = exp2.analyze();
        checkSameExp(left, right, op);
        return core.binary(op.sourceString, left, right, core.booleanType);
      },
      Exp_or_or(left, _op, right) {
        const x = left.analyze();
        const y = right.analyze();
        checkIsBoolean(x, _op);
        checkIsBoolean(y, _op);
        return core.binary("or", x, y, core.booleanType);
      },
      Exp_and_and(left, _op, right) {
        const x = left.analyze();
        const y = right.analyze();
        checkIsBoolean(x, _op);
        checkIsBoolean(y, _op);
        return core.binary("and", x, y, core.booleanType);
      },

      Exp_add_add(exp, op, exp2) {
        const left = exp.analyze();
        const right = exp2.analyze();
        checkNotFunction(left, op);
        checkNotFunction(right, op);
        checkSameExp(left, right, op);
        const resultType = promoteType(left.type, right.type);
        return core.binary(op.sourceString, left, right, resultType);
      },
      Exp_mul_multiply(exp, op, exp2) {
        const left = exp.analyze();
        const right = exp2.analyze();
        checkNotFunction(left, op);
        checkNotFunction(right, op);
        checkSameExp(left, right, op);
        const resultType = promoteType(left.type, right.type);

        switch (op.sourceString) {
          case "%%":
            return core.binary("%%", left, right, resultType);

          case "/": {
            return core.binary("/", left, right, resultType);
          }
          case "*": {
            return core.binary("*", left, right, resultType);
          }

          case "%": {
            return core.binary("%", left, right, resultType);
          }
        }
      },

      Exp_power_power(exp, _op, exp2) {
        const left = exp.analyze();
        const right = exp2.analyze();
        checkNotFunction(left, _op);
        checkNotFunction(right, _op);
        checkSameExp(left, right, _op);
        const resultType = promoteType(left.type, right.type);
        return core.binary("**", left, right, resultType);
      },
      Exp_unary_unary(op, exp) {
        const operand = exp.analyze();
        return core.unary(op.sourceString, operand, operand.type);
      },
      Exp_postfix_call(exp, _open, list, _close) {
        const callee = exp.analyze();
        const args = list.asIteration().children.map((x) => x.analyze());
        if (callee.name === "raise") {
          // No argument count check for raise
          checkIsFunction(callee, _open);
          return core.functionCall(callee, args);
        }

        if (
          callee.intrinsic &&
          [
            "sqrt",
            "sin",
            "cos",
            "exp",
            "ln",
            "hypot",
            "max",
            "min",
            "abs",
          ].includes(callee.name)
        ) {
          args.forEach((arg) => {
            checkIsNum(arg, _open);
          });
        }
        checkIsFunction(callee, _open);
        checkArgumentCount(args, callee, _open);
        return core.functionCall(callee, args);
      },
      Exp_postfix_subscript(exp, _open, index, _close) {
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
      Exp_postfix_member(exp, _dot, id) {
        return core.memberExpression(exp.analyze(), _dot.sourceString, {
          name: id.sourceString,
        });
      },
      Exp_primary_arrayexp(_open, list, _close) {
        const children = list.asIteration().children;
        return children.length === 0
          ? core.emptyArray(core.anyType)
          : core.arrayExpression(children.map((x) => x.analyze()));
      },
      Exp_primary_parens(_open, exp, _close) {
        return exp.analyze();
      },
      true(_) {
        return true;
      },
      false(_) {
        return false;
      },
      floatlit(digits, _dot, _fractional, _e, _sign, _exponent) {
        return {
          kind: "FloatLiteral",
          value: Number(this.sourceString),
          type: core.floatType,
        };
      },
      intlit(_) {
        return {
          kind: "IntLiteral",
          value: BigInt(this.sourceString),
          type: core.intType,
        };
      },
      stringlit(_open, chars, _close) {
        return {
          kind: "StringLiteral",
          value: this.sourceString.slice(1, -1),
          type: core.stringType,
        };
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
