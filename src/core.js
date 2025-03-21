//used mix of cassowary, bella, and carlos for help
export function program(statements) {
  return { kind: "Program", statements };
}

export function variableDeclaration(variable, initializer) {
  return { kind: "VariableDeclaration", variable, initializer };
}

export function variable(
  name,
  mutable = false,
  type = anyType,
  isPrivate = true,
  value = undefined
) {
  return { kind: "Variable", name, mutable, type, private: isPrivate, value };
}

export const booleanType = "boolean";
export const intType = "int";
export const floatType = "float";
export const stringType = "string";
export const anyType = "any";

// Function definitions
export function functionDeclaration(fun) {
  return { kind: "FunctionDeclaration", fun };
}

export function fun(name, params, body, type = anyType, isPrivate = true) {
  return { kind: "Function", name, params, body, type, private: isPrivate };
}

export function intrinsicFunction(name, type) {
  return { kind: "Function", name, type, intrinsic: true };
}

// Type constructors (for internal use)
export function arrayType(baseType) {
  return { kind: "ArrayType", baseType };
}

export function functionType(paramTypes, returnType) {
  return { kind: "FunctionType", paramTypes, returnType };
}

export function increment(variable) {
  return { kind: "Increment", variable };
}

export function decrement(variable) {
  return { kind: "Decrement", variable };
}

export function assignment(target, source) {
  return { kind: "Assignment", target, source };
}

export function breakStatement() {
  return { kind: "BreakStatement" };
}

export function returnStatement(expression) {
  return { kind: "ReturnStatement", expression };
}

export function shortReturnStatement() {
  return { kind: "ShortReturnStatement" };
}

//loop statements
export function ifStatement(test, consequent, alternate) {
  return { kind: "IfStatement", test, consequent, alternate };
}

export function shortIfStatement(test, consequent) {
  return { kind: "ShortIfStatement", test, consequent };
}

export function whileStatement(test, body) {
  return { kind: "WhileStatement", test, body };
}

export function forTurnStatement(
  variable,
  lower,
  direction,
  upper,
  step,
  body
) {
  return {
    kind: "ForTurnStatement",
    variable,
    lower,
    direction,
    upper,
    step,
    body,
  };
}

export function forStatement(iterator, collection, body) {
  return { kind: "ForStatement", iterator, collection, body };
}

export function binary(op, left, right, type = anyType) {
  return { kind: "BinaryExpression", op, left, right, type };
}

export function unary(op, operand, type = anyType) {
  return { kind: "UnaryExpression", op, operand, type };
}

export function subscript(array, index) {
  return {
    kind: "SubscriptExpression",
    array,
    index,
    type: array.type.baseType,
    mutable: array.mutable,
  };
}

export function arrayExpression(elements) {
  return {
    kind: "ArrayExpression",
    elements,
    type: arrayType(elements[0].type),
  };
}

export function emptyArray(elementType = anyType) {
  return { kind: "EmptyArray", type: arrayType(elementType) };
}

export function memberExpression(object, op, field) {
  return { kind: "MemberExpression", object, op, field, type: field.type };
}

export function functionCall(callee, args) {
  if (callee.intrinsic) {
    if (callee.type.paramTypes.length === 1) {
      return unary(callee.name, args[0], callee.type.returnType);
    } else {
      return binary(callee.name, args[0], args[1], callee.type.returnType);
    }
  }
  return { kind: "FunctionCall", callee, args, type: callee.type.returnType };
}

export function raiseStatement(expression) {
  return { kind: "RaiseStatement", expression };
}
// --- Standard Library ---
// These definitions use intrinsic functions to supply built-in math operations.
const floatToFloatType = functionType([floatType], floatType);
const floatFloatToFloatType = functionType([floatType, floatType], floatType);
const stringToIntsType = functionType([stringType], arrayType(intType));

export const standardLibrary = Object.freeze({
  // Built-in types
  int: intType,
  float: floatType,
  boolean: booleanType,
  string: stringType,
  any: anyType,

  // Mathematical constants and functions
  π: variable("π", false, floatType, true),
  E: variable("E", false, floatType, true),
  sqrt: intrinsicFunction("sqrt", floatToFloatType),
  sin: intrinsicFunction("sin", floatToFloatType),
  cos: intrinsicFunction("cos", floatToFloatType),
  exp: intrinsicFunction("exp", floatToFloatType),
  ln: intrinsicFunction("ln", floatToFloatType),
  hypot: intrinsicFunction("hypot", floatFloatToFloatType),
  bytes: intrinsicFunction("bytes", stringToIntsType),
  codepoints: intrinsicFunction("codepoints", stringToIntsType),
  max: intrinsicFunction("max", floatFloatToFloatType),
  min: intrinsicFunction("min", floatFloatToFloatType),
  abs: intrinsicFunction("abs", floatToFloatType),
});

// Extend JavaScript primitives with type properties for static typing
