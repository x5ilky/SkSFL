type SkFn<B extends any[], I, O> = Function<
    B,
    Function<[I], O>
>;
type SkBuilt<I, O> = <T extends I>(...args: [I]) => O;

type Function<I extends any[], O> = (...args: I) => O;

type SkApply<T, F extends SkBuilt<any, any>[]> = 
    F extends [] 
    ? T
    : F extends [SkBuilt<infer I, infer O>] 
      ? T extends I ? O
      : never
    : F extends [SkBuilt<infer I, infer O>, ...infer R extends SkBuilt<any, any>[]] 
      ? T extends I 
        ? SkApply<O, R>
        : never
      : never;

export function apply<T, F extends SkBuilt<any, any>[]>(
    value: T,
    ...functions: F
): SkApply<T, F> {
    let v = value;
    for (const fn of functions) {
        v = fn(v);
    }
    return v as SkApply<T, F>;
}
export const map = function <T extends any[], F extends SkBuilt<any, any>[]>(...fns: F)
 //: <T>(args: T[]) => SkApply<T, F>[] 
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
};

const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const transform = apply(
  nums,
  ch.repeat(2),
)
const transform2 = apply(
  ch.flatten,
  map(ch.add(5), ch.mul(2), ch.toString),
  ch.rev,
  ch.join(", ")
)
console.log(transform)