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
print(result)


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
