<img src=./docs/Ante_logo.jpeg width="500" height="500">

## [Ante](https://github.com/EmMDC/Ante-lang)

I got hooked on Balatro, a poker-themed roguelike, and it sparked an idea: what if writing code felt like playing a strategic hand of cards? That’s how Ante was born — a statically typed, gradually checked programming language with a poker-inspired twist. Ante trades traditional syntax for something more playful: you don't declare functions, you deal them; your variables are held in your hand; and when you're done, you FOLD. But behind the fun is a real, expressive language that supports strong math features, union types, private-by-default scoping, and a flexible type system that flows from inference to dynamic fallback. It’s a little unconventional, a little chaotic — and a lot of fun to write.

# [Click Here to go to the Ante Homepage](https://emmdc.github.io/)

## Features

- **Poker-Themed Syntax**: Keywords like `hand`, `deal`, `raise`, and `FOLD` bring poker flair to programming.
- **Static and Gradual Typing**: Type inference with fallback to `any` for dynamic runtime typing.
- **Union Types**: Functions can return multiple types, and types are inferred or annotated.
- **Private by Default**: All variables and functions are scoped privately unless designed otherwise.
- **Rich Math Support**: Built-in functions like `sqrt`, `sin`, `cos`, `ln`, `exp`, `abs`, and constants like `π`.
- **Friendly Errors**: Clear and themed error messages

## Examples

<table>
<tr> <th>Python</th><th>Ante</th><tr>
</tr>
<td>

```Python
def greet(name):
    print(f"Hello, {name}")
greet("Alice")

```

</td>

<td>

````
```ante
deal greet(name: String):
    raise("Hello," name);
FOLD

greet("Alice");

````

</td>
</table>

<table>
<tr> <th>Javascript</th><th>Ante</th><tr>
</tr>
<td>

```JavaScript
for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
        console.log(`i = ${i}, j = ${j}`);
    }
}


```

</td>

<td>

```
for i in turn(1,3,1):
    for j in turn(1,2,1):
        raise("i =", i, ", j =", j);
    FOLD
FOLD

```

</td>
</table>

<table>
<tr> <th>Python</th><th>Ante</th><tr>
</tr>
<td>

```Python
def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n - 1)
result = factorial(5)
raise(result)


```

</td>

<td>

```
hand factorial(n):
    if n == 0:
        return 1;
    else:
        return n * factorial(n - 1);
FOLD
hand result = factorial(5);

raise(result);
```

</td>
</table>

<table>
<tr> <th>JavaScript</th><th>Ante</th><tr>
</tr>
<td>

```JavaScript
const hobbies = ["reading", "cycling", "painting"];
console.log("Hobbies:", hobbies);


```

</td>

<td>

```
hand hobbies = ["reading", "cycling", "painting"];
raise("Hobbies:" hobbies);


```

</td>
</table>

<table>
<tr> <th>JavaScript</th><th>Ante</th><tr>
</tr>
<td>

```JavaScript
let person = { name: "Alice", age: 25, hobbies: ["reading", "cycling", "painting"] };
console.log("Person Info:", person);

```

</td>

<td>

```
hand person = {
    name: "Alice",
    age: 25,
    hobbies: ["reading", "cycling", "painting"]
};
raise("Person Info:",person);


```

</td>
</table>

<table>
<tr> <th>Python</th><th>Ante</th><tr>
</tr>
<td>

```Python
# THis is a Comment

'''
This is
a comment
'''

```

</td>

<td>

```
//This is a comment

$$
This is
a comment
$$
```

</td>
</table>

## Error Examples

Ante provides informative and themed error messages to help identify issues quickly:

- `Identifier x not declared`: Using a variable before declaration.
- `Identifier x already declared`: Re-declaring a variable in the same scope.
- `Can't back out of your all in! (redeclaration of allin(const) variable)`: Attempting to reassign an `all in` (const) variable.
- `Expected a boolean value`: A non-boolean used in a condition (e.g., `if`, `while`).
- `Expression type mismatch: int vs boolean`: Operands or return types with incompatible types.
- `Return type annotation mismatch: expected int|string but found boolean`: Function return does not match its declared type.
- `Recursive function 'foo' requires an explicit return type annotation`: Recursive function lacks a return type.
- `Recursive function 'foo' requires type annotations for parameter(s): x, y`: Recursive function parameters are missing type annotations.
- `Step size must be non-zero`: `turn` loop step argument is zero.
- `TurnCall requires exactly three parameters`: Invalid number of arguments in a `turn()` loop.
- `Functions cannot appear in this context`: A function used where only values are allowed.
- `Expected a function call on a function identifier`: Attempting to call a non-function.
- `Break statement must be inside a loop`: Misplaced `break` outside of loops.
- `Return statement must be inside a function`: Misplaced `return` outside of functions.
- `Cannot subscript a value of type int`: Using array indexing on a non-indexable type.

## Typing System

Ante uses **static typing** with a **gradual typing** mechanism to balance type safety and developer flexibility. Here's how the typing pipeline works:

1. **Type Annotations**: If a variable or function includes a type annotation, Ante uses it directly.
2. **Type Inference**: If no annotation is found, Ante attempts to infer the type from context (e.g., from initial assignments or return values).
3. **Fallback to `Any`**: If a type cannot be inferred, Ante assigns the `Any` type, allowing dynamic typing and deferring checks to runtime.

### Special Rules for Recursion

Recursive functions must include:

- A **return type annotation**
- **Type annotations for all parameters**

This ensures the compiler can correctly analyze the function without infinite fallback attempts.

## Available Types

Ante supports the following primitive and special types:

- `Int`: Integer numbers
- `Float`: Floating-point numbers
- `Bool`: Boolean values (`true` or `false`)
- `String`: Text values
- `Any`: Dynamic type for runtime checking
- `Int | String` (or similar): Union types combining multiple types
- `Array<Type>`: Arrays containing a specific type
- `FunctionType([paramTypes], returnType)`: Function signatures

# [Click Here to go to the Ante Homepage](https://github.com/EmMDC/Ante-Lang/blob/main/src/ante.ohm)
