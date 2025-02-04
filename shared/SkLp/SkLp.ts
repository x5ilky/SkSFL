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

export class EZP<TokenType, NodeType> {
    tokens: TokenType[];
    output: NodeType[];
    targetRules: EZPRule<TokenType, NodeType>[];
    last: TokenType;

    
    constructor(tokens: TokenType[], private options: {
        getLoc?: (token: TokenType) => [string, number, number],
        customError?: (error: string, token: TokenType) => Error
    }) {
        this.tokens = tokens;
        this.output = [];
        this.targetRules = [];
        this.last = tokens[0];
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
        while (this.tokens.length) {
            const err = this.parseOnce();
            if (err !== true) {
                let message = `Failed to parse, expected:\n`;
                for (const r of this.targetRules) {
                    message += `  ${r.target}\n`;
                }
                message += err.map(a => a.message + "\n").join("");
                message += `But instead got ${JSON.stringify(this.tokens[0])}`;
                return this.options.customError!(message, this.tokens[0]);
            }
        }
        return this.output;
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
        return this.tokens[0];
    }
    peekAnd(test: (t: TokenType) => boolean) {
        return this.peek() !== undefined && test(this.peek());
    }
    expect<O extends TokenType, F extends (token: TokenType) => unknown>(pred: F): ApplyTypePredicate<F, O> {
        if (this.tokens.length === 0) throw new EZPError("Not enough elements");
        let t;
        if (!pred(t = this.tokens.shift()!)) throw new EZPError("mismatch")
        return t as ApplyTypePredicate<F, O>;
    }
    expectOrTerm<O extends TokenType, F extends (token: TokenType) => unknown>(error: string, pred: F): ApplyTypePredicate<F, O> {
        if (this.tokens.length === 0) throw this.options.customError!(error, this.last);
        let t;
        if (!pred(t = this.tokens.shift()!)) throw this.options.customError!(error, this.last);
        return t as ApplyTypePredicate<F, O>;
    }
    expectRule<O extends NodeType, V = O>(rule: EZPRule<TokenType, O, V>): V {
        const prevTokens = structuredClone(this.tokens);
        const prevNodes = structuredClone(this.output);
        try {
            const ezp = new EZP<TokenType, O>(this.tokens, this.options);
            const value = rule.scanner(ezp) as V;
            this.tokens = ezp.tokens;
            return value;
        } catch (e) {
            if (e instanceof EZPError) {
                this.tokens = prevTokens;
                this.output = prevNodes;
                let errMsg = `Expected rule ${rule.target}:\n${e.message}`;
                if (this.options.getLoc !== undefined) {
                    const [fp, ln, col] = this.options.getLoc(this.tokens[0]);
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
            if (this.options.getLoc !== undefined && this.tokens.length) {
                const [fp, ln, col] = this.options.getLoc(this.tokens[0]);
                errMsg = `At ${fp}:${ln}:${col}: ${errMsg}`
            }
            throw this.options.customError!(errMsg + "\n" + (e as Error)?.message, this.tokens[0]);
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
        throw this.options.customError!(error + errors, this.tokens[0]);
    }

    tryRule<O extends NodeType>(rule: EZPRule<TokenType, O>): O | null {
        const prevTokens = structuredClone(this.tokens);
        const prevNodes = structuredClone(this.output);
        try {
            const ezp = new EZP<TokenType, O>(this.tokens, this.options);
            const value = rule.scanner(ezp) as O;
            this.output.push(value);
            this.tokens = ezp.tokens;
            return value;
        } catch {
            this.tokens = prevTokens;
            this.output = prevNodes;
            return null;
        }
    }
    thisOrIf<O extends NodeType>(value: O, pred: (token: TokenType) => boolean, cb: (token: TokenType) => O): O {
        if (this.tokens.length && pred(this.tokens[0])) {
            return cb(this.tokens.shift()!);
        }
        return value;
    }
    
    doesNext(pred: (token: TokenType) => boolean): boolean {
        return this.tokens.length ? pred(this.tokens[0]) : false;
    }
}