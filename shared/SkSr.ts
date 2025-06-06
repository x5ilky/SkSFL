// deno-lint-ignore-file no-explicit-any

type SkValueType = "small" | "map" | "array" | "object" | "null";
export class SkSerializer {
    objmap: Map<any, { type: SkValueType, key: number }>;
    valuemap: Map<any, number>;
    keymap: Map<string, number>;
    special: Map<number, number>;
    buffer: Uint8Array;
    counter: number;
    position: number;

    constructor() {
        this.objmap = new Map();
        this.valuemap = new Map();
        this.keymap = new Map();
        this.special = new Map();
        this.buffer = null as unknown as Uint8Array;
        this.counter = 0;
        this.position = 0;
    }

    private bind(obj: any) {
        this.objmap.set(obj, { type: "small", key: this.counter });
        return this.counter++;
    }
    private bindKey(key: string) {
        if (this.keymap.has(key)) return this.keymap.get(key)!;
        this.keymap.set(key, this.counter);
        return this.counter++;
    }
    private bindObj(object: any, custom: (v: any) => any) {
        const obj = custom(object);
        if (typeof obj === "string") return this.bind(obj);
        if (typeof obj === "boolean") return this.bind(obj);
        if (typeof obj === "number") return this.bind(obj);
        if (typeof obj === "symbol") return this.bind(obj);
        if (typeof obj === "undefined") return this.bind(obj);
        if (obj === null) {
            const c = this.counter++;
            this.objmap.set(null, {
                type: "null",
                key: c
            });
        }
        if (typeof obj === "object") {
            const c = this.counter++
            if (obj instanceof Map) {
                const o: any = {};
                for (const [k, v] of obj) {
                    const nk = this.bindKey(k);
                    const ok = v;
                    if (this.valuemap.has(ok)) 
                        o[nk] = this.valuemap.get(ok);
                    else if (this.objmap.has(ok))
                        o[nk] = this.objmap.get(ok)
                    else
                        o[nk] = this.bindObj(ok, custom);
                }
                this.objmap.set(o, {
                    type: "map",
                    key: c
                });
                return c;
            } 
            if (obj instanceof Array) {
                this.special.set(c, 2);
                const o: number[] = [];
                for (const v of obj) {
                    const ok = v;
                    if (this.valuemap.has(ok)) 
                        o.push(this.valuemap.get(ok)!)
                    else if (this.objmap.has(ok))
                        o.push(this.objmap.get(ok)!.key)
                    else
                        o.push(this.bindObj(ok, custom))
                }
                this.objmap.set(o, {
                    type: "array",
                    key: c
                });
                return c;
            } 
            this.valuemap.set(obj, c);
            const o: any = {};
            for (const k in obj) {
                const nk = this.bindKey(k);
                const ok = obj[k];
                if (this.valuemap.has(ok)) 
                    o[nk] = this.valuemap.get(ok);
                else if (this.objmap.has(ok))
                    o[nk] = this.objmap.get(ok)?.key
                else
                    o[nk] = this.bindObj(ok, custom);
            }
            this.objmap.set(o, {
                key: c,
                type: "object"
            });
            return c;
        };
        if (typeof obj === "bigint") return this.bind(obj);
        if (typeof obj === "function")
            throw new Error(`Cannot serialize functions`);
        throw new Error(`Cannot serialize`);
    }
    private strToArr(s: string): number[] {
        const te = new TextEncoder();
        return Array.from(te.encode(s));
    }
    serialize(obj: any, custom?: (v: any) => any) {
        this.keymap.clear();
        this.objmap.clear();
        this.valuemap.clear();
        let out = this.strToArr("SkSr");
        const o = this.bindObj(obj, custom ?? ((v) => v));
        out = [...out, ...this.numToChar(o), ...this.numToChar(this.objmap.size)];
        for (const [m, i] of this.objmap) {
            out = [...out, ...this.numToChar(i.key)];
            switch (i.type) {
                case "small": {
                    switch (typeof m) {
                        case "string": out = [...out, `1`.charCodeAt(0)]; break;
                        case "number": {
                            if (Number.isInteger(m) && m < 0xffffffff) {
                                out = [...out, `2`.charCodeAt(0)];
                            } else {
                                out = [...out, `8`.charCodeAt(0)];
                            }
                        } break;
                        case "bigint": out = [...out, `3`.charCodeAt(0)]; break;
                        case "boolean": out = [...out, `4`.charCodeAt(0)]; break;
                        case "symbol": out = [...out, `5`.charCodeAt(0)]; break;
                        case "undefined": out = [...out, `6`.charCodeAt(0)]; break;
                    }
                } break;
                case "object":
                    out = [...out, `7`.charCodeAt(0)]; 
                break;
                case "map":
                    out = [...out, `m`.charCodeAt(0)];
                break;
                case "array":
                    out = [...out, `a`.charCodeAt(0)];
                break;
                case "null":
                    out = [...out, `9`.charCodeAt(0)];
                break;
            }
            switch (i.type) {
                case "small": {
                    switch (typeof m) {
                        case "symbol":
                        case "bigint":
                        case "string": {
                            out = [...out, ...this.numToChar(this.strToArr(m.toString()).length), ...this.strToArr(m.toString())];
                        } break;
                        case "number": {
                            if (Number.isInteger(m) && m < 0xffffffff) {
                                out = [...out, ...this.numToChar(m)];
                            } else {
                                out = [...out, ...this.numToChar(this.strToArr(m.toString()).length), ...this.strToArr(m.toString())];;
                            }
                        } break;
                        case "boolean": {
                            out = [...out, ...this.numToChar(+m)];
                        } break;
                        case "undefined":
                        case "function":
                            break;
                    }
                } break;
                case "array": {
                    out = [...out, ...this.numToChar(m.length)]
                    for (const v of m) {
                        out = [...out, ...this.numToChar(v)];
                    }
                } break;
                case "map": {
                    const keys = Object.keys(m);
                    out = [...out, ...this.numToChar(keys.length)]
                    for (const key of keys) {
                        out = [...out, ...this.numToChar(parseInt(key)), ...this.numToChar(m[key])];
                    }
                } break;
                case "object": { 
                    if (m !== null) {
                        const keys = Object.keys(m);
                        out = [...out, ...this.numToChar(keys.length)];
                        for (const key of keys) {
                            out = [...out, ...this.numToChar(parseInt(key)), ...this.numToChar(m[key])];
                        }
                    }
                } break;
            }
        }
        out = [...out, ...this.numToChar(this.keymap.size)]
        for (const [m, i] of this.keymap) {
            out = [...out, ...this.numToChar(i), ...this.numToChar(this.strToArr(m).length), ...this.strToArr(m)];
        }
        return Uint8Array.from(out);
    }

    private numToChar(num: number): number[] {
        return [(num & 0xFF000000) >> 6, (num & 0x00FF0000) >> 4, (num & 0x0000FF00) >> 2, (num & 0x000000FF)];
    }

    bufferSlice(num: number): Uint8Array {
        this.position += num;
        return this.buffer.slice(num);
    }
    deserialize<T>(str: Uint8Array, custom?: (v: any) => any): T {
        this.position = 0;
        const keymap = new Map<string, string>();
        const objmap = new Map<number, { type: SkValueType, value: any }>();
        
        const MAGIC_NUMBER = "SkSr";
        if (Array.from(str.slice(0, 4)).map(a => String.fromCharCode(a)).join("") !== MAGIC_NUMBER) throw new Error(`Invalid SkSr string, invalid magic number, position: ${this.position}`);
        this.buffer = str.slice(4);
        this.position += 4;
        const initialId = this.extractNumber();
        const objmapCount = this.extractNumber();        
        for (let i = 0; i < objmapCount; i++) {
            const id = this.extractNumber();
            const type = String.fromCharCode(this.buffer[0]);
            this.buffer = this.bufferSlice(1);
            switch (type) {
                case "1": { // string
                    const length = this.extractNumber();
                    const buf = Array.from(this.buffer.slice(0, length)).map(a => String.fromCharCode(a)).join("");
                    this.buffer = this.bufferSlice(length);
                    objmap.set(id, {type: "small", value: buf});
                } break;
                case "2": { // integer
                    const value = this.extractNumber();
                    objmap.set(id, {type: "small", value});
                } break;
                case "3": { // bigint
                    const length = this.extractNumber();
                    const buf = Array.from(this.buffer.slice(0, length)).map(a => String.fromCharCode(a)).join("");
                    this.buffer = this.bufferSlice(length);
                    objmap.set(id, {type: "small", value: BigInt(buf)});
                } break;
                case "4": { // boolean
                    const value = this.extractNumber();
                    objmap.set(id, {type: "small", value: value === 1});
                } break;
                case "5": { // symbol
                    const length = this.extractNumber();
                    const buf = Array.from(this.buffer.slice(0, length)).map(a => String.fromCharCode(a)).join("");
                    this.buffer = this.bufferSlice(length);
                    objmap.set(id, {type: "small", value: Symbol.for(buf)});
                } break;
                case "6": { // undefined
                    objmap.set(id, {type: "small", value: undefined});
                } break;
                case "a": {
                    const length = this.extractNumber();
                    const o = [];
                    for (let i = 0; i < length; i++) {
                        o.push(this.extractNumber());
                    }
                    objmap.set(id, {
                        type: "array",
                        value: o
                    });
                } break;
                case "7": { // object
                    const keys = this.extractNumber();
                    const o = {} as any;
                    for (let i = 0; i < keys; i++) {
                        const key = this.extractNumber();
                        const reference = this.extractNumber();
                        o[key] = reference;
                    }
                    objmap.set(id, {
                        type: "object",
                        value: o
                    });
                } break;
                case "m": { // Map
                    const keys = this.extractNumber();
                    const o = {} as any;
                    for (let i = 0; i < keys; i++) {
                        const key = this.extractNumber();
                        const reference = this.extractNumber();
                        o[key] = reference
                    }
                    objmap.set(id, {
                        type: "map",
                        value: o
                    });
                } break;
                case "8": {
                    const length = this.extractNumber();
                    const buf = Array.from(this.buffer.slice(0, length)).map(a => String.fromCharCode(a)).join("");
                    this.buffer = this.bufferSlice(length);
                    objmap.set(id, {type: "small", value: parseFloat(buf)});
                } break;
                case "9": { // null
                    objmap.set(id, {type: "small", value: null});
                } break;
                default: {
                    throw new Error(`Unknown data type: ${type}, position: 0x${this.position.toString(16)}`)
                }
            }
        }
        const keymapCount = this.extractNumber();
        for (let i = 0; i < keymapCount; i++) {
            const id = this.extractNumber();
            const length = this.extractNumber();
            const buf = Array.from(this.buffer.slice(0, length)).map(a => String.fromCharCode(a)).join("");
            this.buffer = this.bufferSlice(length);
            keymap.set(id.toString(), buf);
        }

        // export
        const deser = custom ?? ((v) => v);
        const values = {} as any;
        const exp = function (objref: number): any {
            const v = objmap.get(objref);
            if (v === undefined) return v;
            switch (v.type) {
                case "small": {
                    return v.value
                }
                case "map": {
                    if (objref in values) return values[objref];

                    const o = {} as any;
                    values[objref] = o;
                    for (const k in v.value) {
                        const key = keymap.get(k)!;
                        if (key === undefined) throw new Error(`malformed sksr file`)
                        const value = exp(v.value[k]);
                        o[key] = value;
                    }
                    return new Map(Object.entries(o));         
                }
                case "array": {
                    const v2 = v.value.map((a: number) => exp(a));
                    values[objref] = v2;
                    return v2;
                }
                case "null": return null;

                case "object": {
                    if (objref in values) return values[objref];

                    const o = {} as any;
                    values[objref] = o;
                    for (const k in v.value) {
                        const key = keymap.get(k)!;
                        if (key === undefined) throw new Error(`malformed sksr file`)
                        const value = exp(v.value[k]);
                        o[key] = value;
                    }
                    values[objref] = deser(o);

                    return deser(o);
                }
            }
        };

        return exp(initialId) as T;
    }
    private extractNumber(): number {
        const v = (this.buffer[0] << 6) + (this.buffer[1] << 4) + (this.buffer[2] << 2) + (this.buffer[3]);
        this.buffer = this.buffer.slice(4);
        this.position += 4;
        return v;
    }
}