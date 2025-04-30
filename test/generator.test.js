import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import optimize from "../src/optimizer.js";
import generate from "../src/generator.js";

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim();
}

const fixtures = [
  {
    name: "simplest program",
    source: `raise(0);`,
    expected: dedent`
      console.log(0);
    `,
  },
  {
    name: "variable declaration",
    source: `
      hand x = 5;
      hand y = [];
      raise(x);
    `,
    expected: dedent`
      let x_1 = 5;
      let y_2 = [];
      console.log(x_1);
    `,
  },
  {
    name: "if statement",
    source: `
      hand x = 0;
      if x == 0:
        raise(x);
      FOLD
      raise(1);
    `,
    expected: dedent`
      let x_1 = 0;
      if ((x_1 === 0)) {
        console.log(x_1);
      }
      console.log(1);
    `,
  },
  {
    name: "if statements",
    source: `
      hand x = 0;
      if x == 0:
        raise(x);
      else:
        x = 1;
      FOLD
      raise(2);

      if x > 1:
        x++;
      else if x > 0.1:
        x--;
      else:
        x = 0;
      FOLD
    `,
    expected: dedent`
      let x_1 = 0;
      if ((x_1 === 0)) {
        console.log(x_1);
      } else {
        x_1 = 1;
      }
      console.log(2);

      if ((x_1 > 1)) {
        x_1++;
      } else if ((x_1 > 0.1)) {
        x_1--;
      } else {
        x_1 = 0;
      }
    `,
  },
  {
    name: "while loop",
    source: `
      hand x = 0;
      while x < 3:
        x = x + π;
        x--;
        x++;
        break;
      FOLD
      raise(x);
    `,
    expected: dedent`
      let x_1 = 0;
      while ((x_1 < 3)) {
        x_1 = (x_1 + π);
        x_1--;
        x_1++;
        break;
      }
      console.log(x_1);
    `,
  },
  {
    name: "function declaration",
    source: `
      deal f(x):
        return x;
      FOLD
      hand y = f(5);
      raise(y);
      deal check():
        return;
      FOLD
    `,
    expected: dedent`
      function f_1(x_2) {
        return x_2;
      }
      let y_3 = f_1(5);
      console.log(y_3);
      function check_4() {
        return;
      }
    `,
  },
  {
    name: "for loop statement",
    source: `
      hand x = [0,1,2];
      for i in x:
        raise(i);
      FOLD
    `,
    expected: dedent`
      let x_1 = [0, 1, 2];
      for (let i_2 of x_1) {
        console.log(i_2);
      }
    `,
  },
  {
    name: "for turn(range) statement",
    source: `
      for i in turn(3, 1, -1):
        raise(i);
      FOLD
    `,
    expected: dedent`
      for (let i_1 = 3; i_1 > 1; i_1 += -1) {
        console.log(i_1);
      }
    `,
  },
  {
    name: "unary expressions",
    source: `
    hand a = 2;
    hand b = -a;
    hand c = !a;
    hand e = sqrt(a);
    hand f = sin(a);
    hand g = cos(a);
    hand h = exp(a);
    hand i = ln(a);
    hand j = random(a);
    raise(b);
    raise(c);
    raise(e);
    raise(f);
    raise(g);
    raise(h);
    raise(i);
    raise(j);
  `,
    expected: dedent`
    let a_1 = 2;
    let b_2 = -(a_1);
    let c_3 = !(a_1);
    let e_4 = Math.sqrt(a_1);
    let f_5 = Math.sin(a_1);
    let g_6 = Math.cos(a_1);
    let h_7 = Math.exp(a_1);
    let i_8 = Math.log(a_1);
    let j_9 = ((a=>a[~~(Math.random()*a.length)])(a_1));
    console.log(b_2);
    console.log(c_3);
    console.log(e_4);
    console.log(f_5);
    console.log(g_6);
    console.log(h_7);
    console.log(i_8);
    console.log(j_9);

  `,
  },
  {
    name: "subscript expression",
    source: `
      hand arr = [1,2,3];
      hand first = arr[0];
      raise(first);
    `,
    expected: dedent`
      let arr_1 = [1, 2, 3];
      let first_2 = arr_1[0];
      console.log(first_2);
    `,
  },

  {
    name: "object literal",
    source: `
      hand o = {x:1, y:2};
      raise(o);
    `,
    expected: dedent`
      let o_1 = { x: 1, y: 2 };
      console.log(o_1);
    `,
  },
  {
    name: "bytes operator",
    source: `
      hand t = "hi";
      hand b = bytes(t);
      raise(b);
    `,
    expected: dedent`
      let t_1 = "hi";
      let b_2 = [...Buffer.from(t_1, "utf8")];
      console.log(b_2);
    `,
  },
  {
    name: "member expression",
    source: `
      hand x = {a: 1}; 
      raise(x.a);
    `,
    expected: dedent`
      let x_1 = { a: 1 };
      console.log(x_1.a);
    `,
  },
  {
    name: "codepoints operator",
    source: `
      hand s = "AB";
      hand cp = codepoints(s);
      raise(cp);
    `,
    expected: dedent`
      let s_1 = "AB";
      let cp_2 = [...(s_1)].map(s=>s.codePointAt(0));
      console.log(cp_2);
    `,
  },
  {
    name: "hypot operator",
    source: `
      hand h = hypot(3, 4);
      raise(h);
    `,
    expected: dedent`
      let h_1 = Math.hypot(3,4);
      console.log(h_1);
    `,
  },
];

describe("The Ante code generator", () => {
  for (const fixture of fixtures) {
    it(`produces expected JS output for the ${fixture.name}`, () => {
      const actual = generate(optimize(analyze(parse(fixture.source))));
      assert.deepEqual(actual, fixture.expected);
    });
  }
});
