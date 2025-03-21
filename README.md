<img src=./docs/Ante_logo.jpeg width="500" height="500">

## [Ante](https://github.com/EmMDC/Ante-lang)

I recently started playing balatro, and it has become an addiction of mine. I sleep, thinking about the best combinations to get the highest scores possible. This has led me to combine my current obsession with this assignment and the creation of Ante! Ante is a playing card/poker-themed programming language designed to bring a little fun to your coding. It’s a language that combines the flexibility and power of Python and JavaScript with a poker-inspired syntax that’s meant to be playful, yet functional thus there is a mix of standard
terminology and poker inspired terminology.

# [Click Here to go to the Ante Homepage](https://emmdc.github.io/)

## Features

- Playing Card Terminology
- Uses JavaScript and Python syntax Structure
- Fun yet clear error Handling
- Static Typing
- Private by Default
- Built in math functions

## Examples

<table>
<tr> <th>Python</th><th>Ante</th><tr>
</tr>
<td>

```Python
def greet(name):
    print(f"Hello, {name}!")
greet("Alice")

```

</td>

<td>

```
deal greet(name):
    raise("Hello, {name}!");
greet("Alice");

```

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
for hand i in range(3):
    for hand j in range(2):
        raise("i = {i}, j = {j}!");


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
console.log("Hobbies:");


```

</td>

<td>

```
hand hobbies = ["reading", "cycling", "painting"];
raise("Hobbies:");


```

</td>
</table>

<table>
<tr> <th>JavaScript</th><th>Ante</th><tr>
</tr>
<td>

```JavaScript
const person = { name: "Alice", age: 25, hobbies: ["reading", "cycling", "painting"] };
console.log("Person Info:");

```

</td>

<td>

```
hand person = {
    name: "Alice",
    age: 25,
    hobbies: ["reading", "cycling", "painting"]
};
raise("Person Info:");


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

--
This is
a comment
--
```

</td>
</table>

# Static Errors in analyzer.js

- **Identifier Already Declared:**  
  Thrown when attempting to declare an identifier that already exists.  
  _Message:_ `"Identifier [identifier] already declared"`

- **Identifier Not Declared:**  
  Thrown when referencing an identifier that hasn’t been declared.  
  _Message:_ `"Identifier [name] not declared"`

- **Expected Function Call on a Function Identifier:**  
  Thrown when a function call is attempted on an identifier that isn’t a function.  
  _Message:_ `"Expected a function call on a function identifier"`

- **Expected Boolean Value:**  
  Thrown when a boolean value is expected (for example, in conditional expressions).  
  _Message:_ `"Expected a boolean value"`

- **Read-Only Variable Mutation:**  
  Thrown when trying to modify a variable that is read only.  
  _Message:_ `"[variable name] is read only"`

- **Functions in an Invalid Context:**  
  Thrown when a function appears in a context where it is not allowed.  
  _Message:_ `"Functions cannot appear in this context"`

- **Expression Type Mismatch:**  
  Thrown when the types of two expressions do not match (with allowances for int/float conversion and any type).  
  _Message:_ `"Expression type mismatch: [type1] vs [type2]"`

- **Argument Count Mismatch:**  
  Thrown when the number of arguments in a function call does not match the number expected by the function.  
  _Message:_ `"[paramCount] argument(s) required but [argCount] passed"`

- **Break Statement Outside Loop:**  
  Thrown when a break statement is used outside the context of a loop.  
  _Message:_ `"Break statement must be inside a loop"`

- **Return Statement Outside Function:**  
  Thrown when a return (or short return) statement is used outside of a function.  
  _Message:_ `"Return statement must be inside a function"`

- **Duplicate Parameter Name in Function Declaration:**  
  Thrown when a function declaration contains more than one parameter with the same name.  
  _Message:_ `"Duplicate parameter name: [name]"`

- **TurnCall Parameter Count Error:**  
  Thrown when a TurnCall operation does not receive exactly three parameters.  
  _Message:_ `"TurnCall requires exactly three parameters"`

- **TurnCall Step Size Error:**  
  Thrown when the step value in a TurnCall operation is zero.  
  _Message:_ `"Step size must be non-zero"`
