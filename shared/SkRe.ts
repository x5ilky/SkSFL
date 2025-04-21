// (S)il(k) (R)ust-like (E)nums

// deno-lint-ignore no-namespace
export namespace skre {
    type Empty = [];
    type UnionLike = Schema[];
    type ObjectLike = { [k: string]: Schema[] }
    type SpecSingle = Empty | UnionLike | ObjectLike
    type Schema = String;

    type AllValueUnion<T> = 
        Valuify<T[keyof T], keyof T>;

    type MapVU<T, K> = T extends (infer R)[] ? Valuify<R, K>[] : never;

    type Transform<T> = {
        [k in keyof T]: Functionify<T[k], k>
    } & {
        match: (v: AllValueUnion<T>, k: keyof T, f: { [k in keyof T]: FunctionifyEmpty<T[k], k> }) => boolean
    };
    type Infer<T> = 
        T extends Empty 
            ? never
        : T extends UnionLike
            ? InferUnion<T>
        : T extends ObjectLike
            ? InferObject<T>
        : never;
    type InferObject<T> = { [k in keyof T]: InferSingle<T> };
    type InferUnion<T> = 
        T extends [] ? []
        : T extends [infer T] ? [InferSingle<T>]
        : T extends [infer D, ...infer Tail] ? [InferSingle<D>, ...InferUnion<Tail>]
        : never
    type InferSingle<T> = T extends String ? string : never;

    type Functionify<T, K> = 
        T extends Empty ? () => Valuify<Record<string, never>, K>
        : T extends UnionLike ? (...args: InferUnion<T>) => Valuify<Infer<T>, K>
        : T extends InferObject<T> ? (arg: InferObject<T>) => Valuify<Infer<T>, K>
        : never;
    type FunctionifyEmpty<T, K> = 
        T extends Empty ? () => void
        : T extends UnionLike ? (...args: InferUnion<T>) => void
        : T extends InferObject<T> ? (arg: InferObject<T>) => void
        : never;
    type Valuify<T, K> = { __key: K } & Infer<T>;

    export class String {

    }

    export function string() {
        return new String();
    }

    export function enumeration<T extends { [k: string]: SpecSingle }>(spec: T): Transform<T> {
        return spec as unknown as Transform<T> 
    }
}