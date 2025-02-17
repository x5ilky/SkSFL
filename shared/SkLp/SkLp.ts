type EZPScanner<T, O, V = O> = (ezp: EZP<T, O>) => V;
export type EZPRule<TokenType, NodeType, V = NodeType> = {
  target: string;
  scanner: EZPScanner<TokenType, NodeType, V>;
};
export class EZPError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
type ApplyTypePredicate<T, E> = (T extends (value: E) => value is (infer R extends E) ? R : E) ;

class Iterray<T> {
    values: T[]
    iterator: number

    constructor(values: T[]) {
        this.values = values;
        this.iterator = 0;
    }

    hasItems(): boolean {
        return this.iterator < this.values.length
    }

    peek(): T {
        return this.values[this.iterator]
    }

    shift(): T {
        return this.values[this.iterator++]
    }

    push(value: T) {
        this.values.push(value)
    }
}

export class EZP<TokenType, NodeType> {
    tokens: Iterray<TokenType>;
    output: Iterray<NodeType>;
    targetRules: EZPRule<TokenType, NodeType>[];
    last: TokenType;

    
    constructor(tokens: TokenType[] | Iterray<TokenType>, private options: {
        getLoc?: (token: TokenType) => [string, number, number],
        customError?: (error: string, token: TokenType) => Error
    }) {
        this.tokens = tokens instanceof Iterray ? tokens : new Iterray(tokens);
        this.output = new Iterray([]);
        this.targetRules = [];
        this.last = this.tokens.values[0];
        this.options.customError ??= (error) => new Error(error);
    }

    addRule(target: string, scanner: EZPScanner<TokenType, NodeType>): EZPRule<TokenType, NodeType> {
        let v;
        this.targetRules.push(v = {
            target,
            scanner
        });
        return v;
    }

    instantiateRule<I extends TokenType, O extends NodeType>(target: string, scanner: EZPScanner<I, O>): EZPRule<I, O> {
        return {
            target,
            scanner
        }
    }

    instantiateHelper<I extends TokenType, O>(target: string, scanner: EZPScanner<I, NodeType, O>): EZPRule<I, NodeType, O> {
        return {
            target,
            scanner
        }
    }
    
    parse() {
        while (this.tokens.hasItems()) {
            const err = this.parseOnce();
            if (err !== true) {
                let message = `Failed to parse, expected:\n`;
                for (const r of this.targetRules) {
                    message += `  ${r.target}\n`;
                }
                message += err.map(a => a.message + "\n").join("");
                message += `But instead got ${JSON.stringify(this.peek())}`;
                return this.options.customError!(message, this.peek());
            }
        }
        return this.output.values;
    }
    parseOnce() {
        // deno-lint-ignore no-explicit-any
        const errors: any[] = [];
        for (const r of this.targetRules) {
            try {
                this.output.push(this.expectRule(r));
                return true;
            } catch (e) {
                // pass
                errors.push(e)
            }
        }
        return errors
    }
    /**
     * Eats the first token
     * !!! ONLY USE THIS FUNCTION IF YOU ARE SURE THERE IS A TOKEN
     * @returns The first token in the stream
     */
    consume(): TokenType {
        return this.tokens.shift()!;
    }
    peek(): TokenType {
        return this.tokens.peek();
    }
    peekAnd(test: (t: TokenType) => boolean) {
        return this.peek() !== undefined && test(this.peek());
    }
    expect<O extends TokenType, F extends (token: TokenType) => unknown>(pred: F): ApplyTypePredicate<F, O> {
        if (!this.tokens.hasItems()) throw new EZPError("Not enough elements");
        let t;
        if (!pred(t = this.tokens.shift()!)) throw new EZPError("mismatch")
        return t as ApplyTypePredicate<F, O>;
    }
    expectOrTerm<O extends TokenType, F extends (token: TokenType) => unknown>(error: string, pred: F): ApplyTypePredicate<F, O> {
        if (!this.tokens.hasItems()) throw this.options.customError!(error, this.last);
        let t;
        if (!pred(t = this.tokens.shift()!)) throw this.options.customError!(error, this.last);
        return t as ApplyTypePredicate<F, O>;
    }
    expectRule<O extends NodeType, V = O>(rule: EZPRule<TokenType, O, V>): V {
        const prevTokens = this.tokens.iterator;
        const prevNodes = this.output.iterator;
        try {
            const ezp = new EZP<TokenType, O>(this.tokens, this.options);
            const value = rule.scanner(ezp) as V;
            this.tokens = ezp.tokens;
            return value;
        } catch (e) {
            if (e instanceof EZPError) {
                this.tokens.iterator = prevTokens;
                this.output.iterator = prevNodes;
                this.output.values = this.output.values.slice(0, prevNodes);
                let errMsg = `Expected rule ${rule.target}:\n${e.message}`;
                if (this.options.getLoc !== undefined) {
                    const [fp, ln, col] = this.options.getLoc(this.tokens.peek());
                    errMsg = `At ${fp}:${ln}:${col}: ${errMsg}`
                }
                throw new EZPError(errMsg);
            } 
            throw e;
        }
    }
    
    expectRuleOrTerm<O extends NodeType, V>(error: string, rule: EZPRule<TokenType, O, V>): V {
        try {
            const ezp = new EZP<TokenType, O>(this.tokens, this.options);
            const value = rule.scanner(ezp) as V;
            this.tokens = ezp.tokens;
            return value;
        } catch (e) {
            let errMsg = error;
            if (this.options.getLoc !== undefined && this.tokens.hasItems()) {
                const [fp, ln, col] = this.options.getLoc(this.tokens.peek());
                errMsg = `At ${fp}:${ln}:${col}: ${errMsg}`
            }
            throw this.options.customError!(errMsg + "\n" + (e as Error)?.message, this.tokens.peek());
        }
    }
    getFirstThatWorks<O extends NodeType>(...rules: EZPRule<TokenType, O>[]): O {
        for (const r of rules) {
            try {
                const v = this.expectRule(r) as O;
                return v;
            } catch {
                // nothing
            }
        }
        throw new EZPError("None worked")
    }
    getFirstThatWorksOrTerm<O extends NodeType>(error: string, ...rules: EZPRule<TokenType, O>[]): O {
        const errors = [];
        for (const r of rules) {
            try {
                const v = this.expectRule(r) as O;
                return v;
            } catch (e) {
                // nothing
                if (e instanceof Error && !(e instanceof EZPError)) {
                    errors.push(e)
                }
            }
        }
        throw this.options.customError!(error + errors, this.tokens.peek());
    }

    tryRule<O extends NodeType>(rule: EZPRule<TokenType, O>): O | null {
        const prevTokens = this.tokens.iterator;
        const prevNodes = this.output.iterator;
        try {
            const ezp = new EZP<TokenType, O>(this.tokens, this.options);
            const value = rule.scanner(ezp) as O;
            this.output.push(value);
            this.tokens = ezp.tokens;
            return value;
        } catch {
            this.tokens.iterator = prevTokens;
            this.output.iterator = prevNodes;
            this.output.values = this.output.values.slice(0, prevNodes)
            return null;
        }
    }
    thisOrIf<O extends NodeType>(value: O, pred: (token: TokenType) => boolean, cb: (token: TokenType) => O): O {
        if (this.tokens.hasItems() && pred(this.tokens.peek())) {
            return cb(this.tokens.shift()!);
        }
        return value;
    }
    
    doesNext(pred: (token: TokenType) => boolean): boolean {
        return this.tokens.hasItems() ? pred(this.tokens.peek()) : false;
    }
}