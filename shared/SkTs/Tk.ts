// (S)il(k) (T)ype(s)cript / (T)oke(n)iser

//#begin_import
import { TsToken, TsToken$Comment, TsToken$Decorator as _, TsToken$Identifier, TsToken$Keyword, TsToken$Number, TsToken$Regexp as __, TsToken$String, TsToken$Symbol, TsToken$TemplateString } from "./base.ts";
//#end_import


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
            this.lexString(char, false)
        }
        else console.error("unknown char: " + JSON.stringify(char))
    }
    private lexString(char: string, template: boolean) {
        let buffer = "";
        const inserts = [];
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
                else if (escape === '\\') buffer += "\\";
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
            } else if (template) {
                if (c === '$') {
                    if (this.peek() === '{') {
                        // template
                        this.eat();

                        const miniLexer = new TSLexer(this.buffer.join(""));
                        miniLexer.end = this.end;
                        miniLexer.start = this.start;
                        let depth = 1;
                        while (depth) {
                            if (miniLexer.buffer.length === 0) throw new Error("string template not ended");
                            if (miniLexer.peek() === '}') depth--;
                            miniLexer.lexOne();
                        }
                        this.buffer = miniLexer.buffer;
                        this.end = miniLexer.end;
                        this.start = miniLexer.start;
                        inserts.push({
                            location: buffer.length,
                            tokens: miniLexer.tokens
                        });
                    }
                }
            } else buffer += c;
        }
        
        if (template) this.tokens.push(TsToken$TemplateString({ value: buffer, inserts }))
        else          this.tokens.push(TsToken$String({ value: buffer }))
    }
    private lexWord(char: string) {
        let buffer = char;
        while (/[a-zA-Z_$]/.test(this.peek() ?? "")) buffer += this.eat();

        switch (buffer) {
            case `if`:
            case `else`:
            case `switch`:
            case `case`:
            case `default`:
            case `for`:
            case `while`:
            case `do`:
            case `break`:
            case `continue`:
            case `return`:
            case `throw`:
            case `try`:
            case `catch`:
            case `finally`:
            case `var`:
            case `let`:
            case `const`:
            case `function`:
            case `class`:
            case `extends`:
            case `constructor`:
            case `super`:
            case `this`:
            case `async`:
            case `await`:
            case `typeof`:
            case `instanceof`:
            case `new`:
            case `delete`:
            case `void`:
            case `in`:
            case `true`:
            case `false`:
            case `null`:
            case `undefined`:
            case `NaN`:
            case `Infinity`:
            case `export`:
            case `import`:
            case `type`:
            case `interface`:
            case `implements`:
            case `readonly`:
            case `keyof`:
            case `declare`:
            case `namespace`:
            case `abstract`:
            case `enum`:
            case `public`:
            case `private`:
            case `protected`:
            case `as`:
            case `any`:
            case `never`:
            case `unknown`:
            case `bigint`:
            case `symbol`:
            case `unique`:
            case `static`:
            case `override`:
            case `from`:
            case `asserts`:
            case `is`:
                this.tokens.push(TsToken$Keyword({ name: buffer }));
                break;
            default:
                this.tokens.push(TsToken$Identifier({op: buffer}))
                break;
        }

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
        if (char === '/' && this.peek() === '/') { this.eat(); return this.singleLineComment(); }
        if (char === '/' && this.peek() === '*') { this.eat(); return this.multiLineComment(); }
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
    private singleLineComment() {
        let buffer = "";
        let c;
        while ((c = this.eat()) !== '\n') {
            buffer += c;
        }
        this.tokens.push(TsToken$Comment({ multiline: false, content: buffer }));
    }
    private multiLineComment() {
        let buffer = "";
        let c;
        while (true) {
            c = this.eat();
            if (c === '*') {
                // check if next line is /
                if (this.peek() === '/') {
                    this.eat();
                    break;
                }
            }
            buffer += c;
        }
        this.tokens.push(TsToken$Comment({ multiline: false, content: buffer }));
    }


    private eat(): string | undefined {
        this.end++;
        return this.buffer.shift();
    }
    private peek(): string | undefined {
        return this.buffer?.[0];
    }
}