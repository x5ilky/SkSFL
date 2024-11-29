// (S)il(k) (T)ype(s)cript / (T)oke(n)iser

// #begin_import
import {
    TsToken,
    TsToken$Comment,
    TsToken$Decorator as _,
    TsToken$Identifier,
    TsToken$Keyword,
    TsToken$Number,
    TsToken$Regexp as __,
    TsToken$String,
    TsToken$Symbol,
    TsToken$TemplateString,
    TsToken$Regexp,
} from "./base.ts";
// #end_import

export class TSLexer {
    buffer: string[];
    start: number;
    end: number;
    tokens: TsToken[];
    readonly original: string;

    constructor(buffer: string, tokens?: string[]) {
        this.buffer = tokens ?? buffer.split("");
        this.original = buffer;
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

    errorAt(at: number, error: string) {
        let ln = 0;
        for (let i = 0; i < at; i++) if (this.original[i] === '\n') ln++;
        
        console.log(`at: ${this.original.split("\n")[ln]}`);
        console.log(`${error}`);
        throw new Error();
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
            this.lexString(char, false);
        } else if (char === "`") {
            this.lexString(char, true);
        } else this.errorAt(this.end, `unknown char at ${this.end}: ` + JSON.stringify(char));
    }
    private lexString(char: string, template: boolean) {
        let buffer = "";
        const inserts = [];
        while (true) {
            const c = this.eat();
            if (c === undefined) this.errorAt(this.end, "string not ended");
            else if (c === char) break;
            else if (c === "\\") {
                buffer += this.getEscape();
            } else { 
                if (template) {
                    if (c === "$") {
                        if (this.peek() === "{") {
                            // template
                            this.eat();

                            const miniLexer = new TSLexer(this.original, this.buffer);
                            miniLexer.end = this.end;
                            miniLexer.start = this.start;
                            let depth = 1;
                            while (depth) {
                                if (miniLexer.buffer.length === 0) {
                                    this.errorAt(this.end, "string template not ended");
                                }
                                if (miniLexer.peek() === "}") depth--;
                                if (depth === 0) {
                                    miniLexer.eat();
                                    break;
                                }
                                miniLexer.lexOne();
                                miniLexer.start = miniLexer.end;
                            }
                            this.buffer = miniLexer.buffer;
                            this.end = miniLexer.end;
                            this.start = miniLexer.start;
                            inserts.push({
                                location: buffer.length,
                                tokens: miniLexer.tokens,
                            });
                            continue;
                        }
                    }
                } 
                buffer += c;
            }
        }

        if (template) {
            this.tokens.push(
                TsToken$TemplateString(this.start, this.end, { value: buffer, inserts }),
            );
        } else this.tokens.push(TsToken$String(this.start, this.end, { value: buffer }));
    }
    private getEscape() {
        const escape = this.eat();
        if (escape === "n") return "\n";
        else if (escape === "r") return "\r";
        else if (escape === "t") return "\t";
        else if (escape === "v") return "\v";
        else if (escape === "f") return "\f";
        else if (escape === "\\") return "\\";
        else if (escape === "0") return "\0";
        else if (escape === "c") {
            const code = this.eat();
            return String.fromCharCode(code!.charCodeAt(0) % 32);
        } else if (/[\^$\.*+?()[\]{}|\/`]/.test(escape!)) {
            return escape;
        } else if (escape === "x") {
            const char1 = this.eat()!;
            const char2 = this.eat()!;
            return String.fromCharCode(parseInt(char1 + char2, 16));
        } else if (escape === "u") {
            const char1 = this.eat()!;
            if (char1 === "{") {
                let b = "";
                let c;
                while ((c = this.eat()) !== "}") {
                    b += c;
                }
                return String.fromCharCode(parseInt(b, 16));
            } else {
                const char2 = this.eat()!;
                const char3 = this.eat()!;
                const char4 = this.eat()!;

                return String.fromCharCode(
                    parseInt(char1 + char2 + char3 + char4, 16),
                );
            }
        } else this.errorAt(this.end, `Invalid escape: \\${escape}`);
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
            case `of`:
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
            case `infer`:
            case `is`:
                this.tokens.push(TsToken$Keyword(this.start, this.end, { name: buffer }));
                break;
            default:
                this.tokens.push(TsToken$Identifier(this.start, this.end, { op: buffer }));
                break;
        }
    }
    private validOperator(s: string): boolean {
        switch (s) {
            case "+":
            case "-":
            case "*":
            case "/":
            case "%":
            case "&":
            case "^":
            case "|":
            case "!":
            case "~":
            case "<":
            case ">":
            case "{":
            case "}":
            case "[":
            case "]":
            case "(":
            case ")":
            case "=":
            case "+=":
            case "-=":
            case "*=":
            case "/=":
            case "%=":
            case "&=":
            case "^=":
            case "|=":
            case "!=":
            case "~=":
            case "<=":
            case ">=":
            case "==":
            case "===":
            case "&&":
            case "||":
            case "&&=":
            case "||=":
            case "??":
            case "??=":
            case "?":
            case ":":
            case ",":
            case ";":
            case ".":
                return true;
            default:
                return false;
        }
    }

    private lexNumber(char: string) {
        if (char === "0") {
            // check if hex or binary
            if (this.peek() === "b") {
                // binary
                let buffer = "0b";
                while (true) {
                    if (this.peek() === "1" || this.peek() === "0") {
                        buffer += this.eat();
                    } else break;
                }
                this.tokens.push(TsToken$Number(this.start, this.end, { num: buffer }));
                return;
            } else if (this.peek() === "x") {
                // binary
                let buffer = "0x";
                while (true) {
                    if (/[0-9a-fA-F]/.test(char)) buffer += this.eat();
                    else break;
                }
                this.tokens.push(TsToken$Number(this.start, this.end, { num: buffer }));
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
                if (period) this.errorAt(this.end, "more than one period in a number");
                buffer += c;
                period = true;
            } else if ("e" === c) {
                if (e) this.errorAt(this.end, "more than one exponential in a number");
                e = true;
                buffer += c;
            } else {
                break;
            }
            this.eat();
        }
        this.tokens.push(TsToken$Number(this.start, this.end, { num: buffer }));
    }
    private lexRegexp() {
        let chars = "";
        while (true) {
            const c = this.eat();
            if (c === undefined) this.errorAt(this.end, "no ended regexp");
            if (c === '/') break;
            if (c === '\\') {
                chars += '\\';
                chars += this.eat();
            } else chars += c;
        }
        let modifiers = "";
        let c;
        while (/[a-z]/.test(c = this.eat()!)) {
            modifiers += c;
        }
        this.buffer.splice(0, 0, c);
        this.tokens.push(TsToken$Regexp(this.start, this.end, {modifiers, value: chars}))
    }

    private lexSymbol(char: string) {
        let op = char;
        if (char === "/" && this.peek() === "/") {
            this.eat();
            return this.singleLineComment();
        }
        if (char === "/" && this.peek() === "*") {
            this.eat();
            return this.multiLineComment();
        }
        if (char === "/" && !["Identifier", "Regexp", "String", "Number"].includes(this.tokens[this.tokens.length-1].__type)) {
            if (this.peek() !== '=') {
                // make sure it isnt operator
                this.lexRegexp();
                return;
            }
        }
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
            this.tokens.push(TsToken$Symbol(this.start, this.end, { op }));
        } else {
            this.errorAt(this.end, `Invalid operator: ${op}`);
        }
    }
    private singleLineComment() {
        let buffer = "";
        let c;
        while ((c = this.eat()) !== "\n") {
            buffer += c;
        }
        this.tokens.push(
            TsToken$Comment(this.start, this.end, { multiline: false, content: buffer }),
        );
    }
    private multiLineComment() {
        let buffer = "";
        let c;
        while (true) {
            c = this.eat();
            if (c === "*") {
                // check if next line is /
                if (this.peek() === "/") {
                    this.eat();
                    break;
                }
            }
            buffer += c;
        }
        this.tokens.push(
            TsToken$Comment(this.start, this.end, { multiline: true, content: buffer }),
        );
    }

    private eat(): string | undefined {
        this.end++;
        return this.buffer.shift();
    }
    private peek(): string | undefined {
        return this.buffer?.[0];
    }
}
