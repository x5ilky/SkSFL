// deno-lint-ignore-file no-explicit-any
// (S)il(k) (R)ust-like (E)nums

// deno-lint-ignore no-namespace
export namespace skre {
    type Empty = [];
    type UnionLike = Schema[];
    type ObjectLike = { [k: string]: Schema }
    type SpecSingle = Empty | UnionLike | ObjectLike
    type Schema = Base;

    type AllValueUnion<T> =
        Valuify<T[keyof T], keyof T>;

    type Transform<T> = {
        [k in keyof T]: Functionify<T[k], k>
    } & {
        match: MatchFunction<T>
    };

    type MatchFunction<T> = (v: AllValueUnion<T>, f: { [k in keyof T]?: FunctionifyEmpty<T[k], k> }) => boolean;
    type Infer<T> =
        T extends Empty
        // deno-lint-ignore ban-types
        ? {}
        : T extends UnionLike
        ? InferUnion<T>
        : T extends ObjectLike
        ? InferObject<T>
        : never;
    export type InferObject<T> = { [k in keyof T]: InferSingle<T[k]> };
    type InferUnion<T> =
        T extends [] ? []
        : T extends [infer T] ? [InferSingle<T>]
        : T extends [infer D, ...infer Tail] ? [InferSingle<D>, ...InferUnion<Tail>]
        : never
    export type InferSingle<T> = 
        T extends skre.Number ? number
        : T extends skre.String ? string 
        : T extends skre.Arr<infer R> ? InferSingle<R>[]
        : T extends skre.Custom<infer R> ? R
        : T extends skre.Object<infer R> ? { [k in keyof R]: InferSingle<R[k]> }
        : never;

    type Functionify<T, K> =
        T extends Empty ? () => Valuify<Record<string, never>, K>
        : T extends UnionLike ? (...args: InferUnion<T>) => Valuify<Infer<T>, K>
        : T extends ObjectLike ? (arg: InferObject<T>) => Valuify<Infer<T>, K>
        : never;
    type FunctionifyEmpty<T, K> =
        T extends Empty ? () => void
        : T extends UnionLike ? (...args: InferUnion<T>) => void
        : T extends ObjectLike ? (arg: InferObject<T>) => void
        : never;
    type Valuify<T, K> = { readonly __skre_tagged_key: K } & Infer<T>;

    abstract class Base {}
    export class String extends Base {
        readonly __tag = <const>"string"
    }
    export class Number extends Base {
        readonly __tag = <const>"number"
    }
    export class Arr<T extends Base> extends Base {
        readonly __tag = <const>"arr"
        constructor(v: T) { super(); }
    }
    export class Custom<T> extends Base {
        readonly __tag = <const>"custom"
    }

    export class Object<T extends { [k: string]: Base }> extends Base {
        readonly __tag = <const>"object"
    }

    export function string() {
        return new String();
    }
    export function number() {
        return new Number();
    }
    export function array(t: Base) {
        return new Arr(t);
    }
    export function custom<T>() {
        return new Custom<T>();
    }
    export function object<T extends { [k: string]: Base }>(v: T) {
        return new Object<T>();
    }

    export function enumeration<T extends { [k: string]: SpecSingle }>(spec: T): Transform<T> {
        const out: any = {};
        for (const key in spec) {
            const specS = spec[key];
            if (Array.isArray(specS)) {
                // empty or tuple type
                if (specS.length === 0) out[key] = () => ({ __skre_tagged_key: key });
                else {
                    out[key] = (...args: any[]) => {
                        const o: any = [];
                        o["__skre_tagged_key"] = key;
                        if (args.length !== specS.length) throw new Error(`Enum ${key}, mismatched tuple argument count`);
                        for (let i = 0; i < specS.length; i++) {
                            const t = args[i];
                            o[i] = t;
                        }
                        return o;
                    }
                }
            } else {
                // object like
                out[key] = (v: any) => {
                    const o: any = {};
                    o["__skre_tagged_key"] = key;
                    for (const k in specS) {
                        if (!(k in v)) {
                            throw new Error(`Enum ${key}, expected required struct member ${k}`);
                        }
                        o[k] = v[k];
                    }
                    return o;
                }
            }
        }
        const match: MatchFunction<T> = (v, f) => {
            if (Array.isArray(v)) {
                if (v.length === 0) { if (v.__skre_tagged_key in f) return (f[v.__skre_tagged_key] as any)(), true; }
                else { if (v.__skre_tagged_key in f) return (f[v.__skre_tagged_key] as any)(...v), true; }
            }
            if (typeof v === "object") { 
                if (v.__skre_tagged_key in f) return (f[v.__skre_tagged_key] as any)(v), true;
            }
            return false;
        }
        out.match = match;
        return out
    }
}