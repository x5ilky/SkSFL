// (S)il(k) (T)ype(s)cript (T)o(k)eniser

// deno-lint-ignore no-explicit-any
export function match<T extends {__type: string, value: any}>(value: T, matchFor: { [k in T["__type"]]: (value: Extract<T, {__type: k}>["value"]) => void } ) {
    if (value.__type in matchFor) {
        matchFor[value.__type as T["__type"]](value.value)
    }
}
export type TsToken$Symbol = { __type: "Symbol", value: { op: string }};
export const TsToken$Symbol = (value: TsToken$Symbol["value"]): TsToken => { return {__type: "Symbol", value} };
export type TsToken$Identifier = { __type: "Identifier", value: { op: string }};
export const TsToken$Identifier = (value: TsToken$Identifier["value"]): TsToken => { return {__type: "Identifier", value} };
export type TsToken$Decorator = { __type: "Decorator", value: { op: string }};
export const TsToken$Decorator = (value: TsToken$Decorator["value"]): TsToken => { return {__type: "Decorator", value} };
export type TsToken$String = { __type: "String", value: { value: string }};
export const TsToken$String = (value: TsToken$String["value"]): TsToken => { return {__type: "String", value} };
export type TsToken$Number = { __type: "Number", value: { num: string }};
export const TsToken$Number = (value: TsToken$Number["value"]): TsToken => { return {__type: "Number", value} };
export type TsToken$Keyword = { __type: "Keyword", value: { name: string }};
export const TsToken$Keyword = (value: TsToken$Keyword["value"]): TsToken => { return {__type: "Keyword", value} };
export type TsToken$Regexp = { __type: "Regexp", value: { value: string, modifiers: string }};
export const TsToken$Regexp = (value: TsToken$Regexp["value"]): TsToken => { return {__type: "Regexp", value} };
export type TsToken = TsToken$Symbol | TsToken$Identifier | TsToken$Decorator | TsToken$String | TsToken$Number | TsToken$Keyword | TsToken$Regexp;


export class TSLexer {
    buffer: string[];
    start: number;
    end: number;
    tokens: TsToken[];

    constructor(buffer: string) {
        this.buffer = buffer.split("");
        this.start = 0;
        this.end = 0;
        this.tokens = [];
    }

    lex() {
        while (this.buffer.length) {
            this.lexOne();
            this.start = this.end;
        }
        return this.tokens;
    }

    private lexOne() {
        const char = this.eat()!;
        if (/\s/.test(char)) return;
        else if (this.validOperator(char)) this.lexSymbol(char);
        else if (/[0-9]/.test(char)) {
            this.lexNumber(char);
        } else if (/[a-zA-Z_\$]/.test(char)) {
            this.lexWord(char);
        } else if (char === '"' || char === "'") {
            this.lexString(char)
        }
        else console.error("unknown char: " + JSON.stringify(char))
    }
    private lexString(char: string) {
        let buffer = "";
        while (true) {
            const c = this.eat();
            if (c === undefined) throw new Error("string not ended");
            else if (c === char) break;
            else if (c === '\\') {
                const escape = this.eat();
                if (escape === 'n') buffer += "\n";
                else if (escape === 'r') buffer += "\r";
                else if (escape === 't') buffer += "\t";
                else if (escape === 'v') buffer += "\v";
                else if (escape === 'f') buffer += "\f";
                else if (escape === '0') buffer += "\0";
                else if (escape === 'c') {
                    const code = this.eat();
                    buffer += String.fromCharCode(code!.charCodeAt(0) % 32);
                } else if (/[\^$\.*+?()[\]{}|\/]/.test(escape!)) {
                    buffer += escape;
                } else if (escape === 'x') {
                    const char1 = this.eat()!;
                    const char2 = this.eat()!;
                    buffer += String.fromCharCode(parseInt(char1 + char2, 16));
                } else if (escape === 'u') {
                    const char1 = this.eat()!;
                    if (char1 === '{') {
                        let b = "";
                        let c;
                        while ((c = this.eat()) !== '}') {
                            b += c;
                        }
                        buffer += String.fromCharCode(parseInt(b, 16));
                    } else {
                        const char2 = this.eat()!;
                        const char3 = this.eat()!;
                        const char4 = this.eat()!;

                        buffer += String.fromCharCode(parseInt(char1 + char2 + char3 + char4, 16));
                    }
                } else throw new Error(`Invalid escape: \\${escape}`) 
            } else buffer += c;
        }
        this.tokens.push(TsToken$String({ value: buffer }))
    }
    private lexWord(char: string) {
        let buffer = char;
        while (/[a-zA-Z_$]/.test(this.peek() ?? "")) buffer += this.eat();
        this.tokens.push(TsToken$Identifier({op: buffer}))
    }
    private validOperator(s: string): boolean {
        switch (s) {
            case '+': case '-': case '*': case '/': case '%': case '&': case '^': case '|': case '!': case '~': case '<': case '>': case '{': case '}': case '[': case ']': case '(': case ')': case '=': case '+=': case '-=': case '*=': case '/=': case '%=': case '&=': case '^=': case '|=': case '!=': case '~=': case '<=': case '>=': case '==': case '===': case '&&': case '||': case '&&=': case '||=': case '??': case '??=': case '?': case ':': case ',': case ';': case '.':
                return true;
            default:
                return false;
        }
    }        

    private lexNumber(char: string) {
        if (char === '0') {
            // check if hex or binary
            if (this.peek() === 'b') {
                // binary
                let buffer = "0b";
                while (true) {
                    if (this.peek() === "1" || this.peek() === "0") buffer += this.eat();
                    else break;
                }
                this.tokens.push(TsToken$Number({ num: buffer }))
                return;
            } else if (this.peek() === 'x') {
                // binary
                let buffer = "0x";
                while (true) {
                    if (/[0-9a-fA-F]/.test(char)) buffer += this.eat();
                    else break;
                }
                this.tokens.push(TsToken$Number({ num: buffer }))
                return;
            }
        } 
        let period = false;
        let e = false;
        let buffer = char.toString();
        while (true) {
            const c = this.peek();
            if (c === undefined) break;
            else if (/[0-9]/.test(c)) buffer += c;
            else if ("." === c) {
                if (period) throw new Error("more than one period in a number");
                buffer += c;
                period = true;
            }
            else if ("e" === c) {
                if (e) throw new Error("more than one exponential in a number");
                e = true;
                buffer += c;
            } else {
                break;
            }
            this.eat();
        }
        this.tokens.push(TsToken$Number({ num: buffer }))
        
    }


    private lexSymbol(char: string) {
        let op = char;
        while (true) {
            if (this.peek() === undefined) {
                break;
            }
            if (this.validOperator(op + this.peek()!)) {
                op += this.eat()!;
            } else {
                break;
            }
        }
        if (this.validOperator(op)) {
            this.tokens.push(TsToken$Symbol({ op }));
        } else {
            throw new Error(`Invalid operator: ${op}`);
        }
    }


    private eat(): string | undefined {
        this.end++;
        return this.buffer.shift();
    }
    private peek(): string | undefined {
        return this.buffer?.[0];
    }
}