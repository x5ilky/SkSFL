type EZPScanner<T, O> = (ezp: EZP<T, O>) => O;
type TargetRule<TokenType, NodeType> = {
  target: string;
  scanner: EZPScanner<TokenType, NodeType>;
};
export class EZPError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
export class EZP<TokenType, NodeType> {
    tokens: TokenType[];
    output: NodeType[];
    targetRules: TargetRule<TokenType, NodeType>[];

    
    constructor(tokens: TokenType[], private getLoc?: (token: TokenType) => [string, number, number]) {
        this.tokens = tokens;
        this.output = [];
        this.targetRules = [];
    }

    addRule(target: string, scanner: EZPScanner<TokenType, NodeType>): TargetRule<TokenType, NodeType> {
        let v;
        this.targetRules.push(v = {
            target,
            scanner
        });
        return v;
    }

    instantiateRule<I extends TokenType, O extends NodeType>(target: string, scanner: EZPScanner<I, O>): TargetRule<I, O> {
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
                return new Error(message);
            }
        }
        return this.output;
    }
    parseOnce() {
        // deno-lint-ignore no-explicit-any
        const errors: any[] = [];
        for (const r of this.targetRules) {
            try {
                this.expectRule(r);
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
    expect<O extends TokenType>(pred: (token: TokenType) => boolean): O {
        if (this.tokens.length === 0) throw new EZPError("Not enough elements");
        let t;
        if (!pred(t = this.tokens.shift()!)) throw new EZPError("mismatch")
        return t as O;
    }
    expectOrTerm<O extends TokenType>(error: string, pred: (token: TokenType) => boolean): O {
        if (this.tokens.length === 0) throw new Error(error);
        let t;
        if (!pred(t = this.tokens.shift()!)) throw new Error(error);
        return t as O;
    }
    expectRule<O extends NodeType>(rule: TargetRule<TokenType, O>): O {
        const prevTokens = structuredClone(this.tokens);
        const prevNodes = structuredClone(this.output);
        try {
            const ezp = new EZP<TokenType, O>(this.tokens, this.getLoc);
            const value = rule.scanner(ezp) as O;
            this.output.push(value);
            this.tokens = ezp.tokens;
            return value;
        } catch (e) {
            if (e instanceof EZPError) {
                this.tokens = prevTokens;
                this.output = prevNodes;
                let errMsg = `Expected rule ${rule.target}:\n${e.message}`;
                if (this.getLoc !== undefined) {
                    const [fp, ln, col] = this.getLoc(this.tokens[0]);
                    errMsg = `At ${fp}:${ln}:${col}: ${errMsg}`
                }
                throw new EZPError(errMsg);
            } 
            throw e;
        }
    }
    expectRuleOrTerm<O extends NodeType>(error: string, rule: TargetRule<TokenType, O>): O {
        try {
            const ezp = new EZP<TokenType, O>(this.tokens, this.getLoc);
            const value = rule.scanner(ezp) as O;
            this.output.push(value);
            this.tokens = ezp.tokens;
            return value;
        } catch (e) {
            let errMsg = error;
            if (this.getLoc !== undefined && this.tokens.length) {
                const [fp, ln, col] = this.getLoc(this.tokens[0]);
                errMsg = `At ${fp}:${ln}:${col}: ${errMsg}`
            }
            throw new Error(errMsg + "\n" + (e as Error)?.message);
        }
    }
    getFirstThatWorks<O extends NodeType>(...rules: TargetRule<TokenType, O>[]): O {
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
    getFirstThatWorksOrTerm<O extends NodeType>(error: string, ...rules: TargetRule<TokenType, O>[]): O {
        const errors = [];
        for (const r of rules) {
            try {
                const v = this.expectRule(r) as O;
                return v;
            } catch (e) {
                // nothing
                errors.push(e)
            }
        }
        throw new Error(error + errors)
    }

    tryRule<O extends NodeType>(rule: TargetRule<TokenType, O>): O | null {
        const prevTokens = structuredClone(this.tokens);
        const prevNodes = structuredClone(this.output);
        try {
            const ezp = new EZP<TokenType, O>(this.tokens, this.getLoc);
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