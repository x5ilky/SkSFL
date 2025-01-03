// deno-lint-ignore no-explicit-any
type SkBuilt<I = any, O = any> = (...args: [I]) => O;

// deno-lint-ignore no-explicit-any
type Function<I extends any[], O> = (...args: I) => O;

// exceptions due to no filling in generics for generic functions
// a.k.a no instantiation expressions
// see issues: 
//  * https://github.com/microsoft/TypeScript/issues/57102
//  * https://github.com/microsoft/TypeScript/pull/47607
// deno-lint-ignore no-explicit-any
type Flatten<T extends any[][]> = T[number];
type SkApplySingle<BaseType, F extends SkBuilt> = 
    F extends <T>(value: T) => T[]
      ? BaseType[]
    : F extends <T>(value: T[][]) => T[]
      // deno-lint-ignore no-explicit-any
      ? BaseType extends any[][] ? Flatten<BaseType> : never
    : F extends <T>(value: T[]) => T
      ? BaseType
    : F extends (value: infer I) => infer O
      ? BaseType extends I ? O : never
    : never;
type SkApply<BaseType, F extends SkBuilt[]> = 
    F extends [] 
    ? BaseType
  // deno-lint-ignore no-explicit-any
    : F extends [(value: infer I) => any] 
      ? BaseType extends I ? SkApplySingle<BaseType, F[0]> : never
  // deno-lint-ignore no-explicit-any
    : F extends [(value: infer I) => any, ...infer R extends SkBuilt[]] 
      ? BaseType extends I 
        ? SkApply<SkApplySingle<BaseType, F[0]>, R>
        : never
      : never;


export function apply<T, F extends SkBuilt[]>(
    value: T,
    ...functions: F
): SkApply<T, F> {
    let v = value;
    for (const fn of functions) {
        v = fn(v);
    }
    return v as SkApply<T, F>;
}
// deno-lint-ignore no-explicit-any
export const map = function <T extends any[], F extends SkBuilt[]>(...fns: F)

{
  return (args: T) => args.map(a => apply(a, ...fns));
};
export const ch = {
  add: (offset: number) => (n: number) => n + offset,
  sub: (offset: number) => (n: number) => n - offset,
  mul: (offset: number) => (n: number) => n * offset,
  div: (offset: number) => (n: number) => n / offset,
  powerOf: (toExponent: number) => (n: number) => Math.pow(n, toExponent),
  toPower: (n: number) => (exponent: number) => Math.pow(exponent, n),
  toString: <T extends { toString: () => string; }>(value: T) => value.toString(),

  join: (delimiter: string = "") => <T>(values: T[]) => values.join(delimiter),
  rev: <T>(values: T[]) => values.reverse(),
  repeat: (times: number) => <T>(value: T) => {
    const o: T[] = [];
    for (let i = 0; i < times; i++) {
      o.push(value);
    }
    return o;
  },
  flatten: <T>(values: T[][]) => values.flat() as T[],

  all: <T>(predicate: (value: T) => boolean) => (values: T[]) => values.every(predicate),
  any: <T>(predicate: (value: T) => boolean) => (values: T[]) => values.some(predicate),
  none: <T>(predicate: (value: T) => boolean) => (values: T[]) => values.every(value => !predicate(value)),

  sum: (values: number[]) => values.reduce((a, b) => a + b, 0),
  log: <T>(values: T) => { console.log(values); return values; },
  sortAsc: (values: number[]) => values.toSorted((a, b) => a - b),
  sortDsc: (values: number[]) => values.toSorted((a, b) => b - a),
  sortCustom: <T>(sortFn: (a: T, b: T) => number) => (values: T[]) => values.toSorted(sortFn),
};

export function currify<I, R extends unknown[], O>(fn: (one: I, ...rest: R) => O): (...rest: R) => (one: I) => O {
  return (...rest) => one => fn(one, ...rest);
}