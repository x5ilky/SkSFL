type SkFn<B extends any[], I, O> = Function<
    B,
    Function<[I], O>
>;
type SkBuilt<I, O> = Function<[I], O>;

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
type SkApplyArgs<F extends SkBuilt<any, any>[]> = 
    F extends []
    ? never
    : F extends [SkBuilt<infer I, any>]
      ? I
    : F extends [SkBuilt<infer I, infer O>, ...infer R extends SkBuilt<any, any>[]]
      ? O extends SkApplyArgs<R>
        ? I
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
export function map<T, F extends SkBuilt<any, any>[]>(
    value: T[],
    ...functions: F
): SkApply<T, F>[] {
    return value.map(a => apply(a, ...functions)) as SkApply<T, F>[];
}

export const add: SkFn<[number], number, number> = (offset: number) => (n: number) => n + offset;
export const sub: SkFn<[number], number, number> = (offset: number) => (n: number) => n - offset;
export const mul: SkFn<[number], number, number> = (offset: number) => (n: number) => n * offset;
export const div: SkFn<[number], number, number> = (offset: number) => (n: number) => n / offset;
export const powerOf: SkFn<[number], number, number> = (toExponent: number) => (n: number) => Math.pow(n, toExponent)
export const toPower: SkFn<[number], number, number> = (n: number) => (exponent: number) => Math.pow(exponent, n)
export const toString: SkBuilt<any, string> = <T extends { toString: () => string; }>(value: T) => value.toString()