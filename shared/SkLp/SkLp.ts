type EZPScanner<T, O> = (ezp: EZP<T, O>) => O;
type TargetRule<TokenType, NodeType> = {
  target: string;
  scanner: EZPScanner<TokenType, NodeType>;
};

export class EZP<TokenType, NodeType> {
    tokens: TokenType[];
    output: NodeType[];
    targetRules: TargetRule<TokenType, NodeType>[]
    
    constructor(tokens: TokenType[]) {
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

    instantiateRule(target: string, scanner: EZPScanner<TokenType, NodeType>): TargetRule<TokenType, NodeType> {
        return {
            target,
            scanner
        }
    }
    
    parse() {
        while (this.tokens.length) {
            if (!this.parseOnce()) {
                let message = `Failed to parse, expected:\n`;
                for (const r of this.targetRules) {
                    message += `  ${r.target}\n`;
                }
                message += `But instead got ${JSON.stringify(this.tokens[0])}`;
                return new Error(message);
            }
        }
        return this.output;
    }
    parseOnce() {
        for (const r of this.targetRules) {
            try {
                this.expectRule(r);
                return true;
            } catch {
                // pass
            }
        }
        return false
    }
    /**
     * Eats the first token
     * !!! ONLY USE THIS FUNCTION IF YOU ARE SURE THERE IS A TOKEN
     * @returns The first token in the stream
     */
    consume(): TokenType {
        return this.tokens.shift()!;
    }
    expect<O extends TokenType>(pred: (token: TokenType) => boolean): O {
        if (this.tokens.length === 0) throw new Error("Not enough elements");
        let t;
        if (!pred(t = this.tokens.shift()!)) throw new Error("mismatch")
        return t as O;
    }
    expectRule<O extends NodeType>(rule: TargetRule<TokenType, NodeType>): O {
        const prevTokens = structuredClone(this.tokens);
        const prevNodes = structuredClone(this.output);
        try {
            const ezp = new EZP<TokenType, NodeType>(this.tokens);
            const value = rule.scanner(ezp) as O;
            this.output.push(value);
            this.tokens = ezp.tokens;
            return value;
        } catch (e) {
            this.tokens = prevTokens;
            this.output = prevNodes;
            throw e;
        }
    }
    tryRule<O extends NodeType>(rule: TargetRule<TokenType, O>): O | null {
        const prevTokens = structuredClone(this.tokens);
        const prevNodes = structuredClone(this.output);
        try {
            const ezp = new EZP<TokenType, O>(this.tokens);
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
    giveLastThatWorks<O extends NodeType>(...rules: TargetRule<TokenType, NodeType>[]): O {
        let works: O | undefined = undefined;
        for (const r of rules) {
            try {
                const v = this.expectRule(r) as O;
                works = v;
            } catch {
                // nothing
            }
        }
        if (works === undefined)
            throw new Error(`no branches matched: ${rules.map(a => a.target).join(", ")}`)
        return works;
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