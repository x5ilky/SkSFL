type EZPScanner<T, O> = (ezp: EZP<T, O>) => O;
export class EZP<TokenType, NodeType> {
    tokens: TokenType[];
    output: NodeType[];
    rules: {target: string, scanner: EZPScanner<TokenType, NodeType>}[]
    
    constructor(tokens: TokenType[]) {
        this.tokens = tokens;
        this.output = [];
        this.rules = [];
    }

    addRule(target: string, scanner: EZPScanner<TokenType, NodeType>) {
        let v;
        this.rules.push(v = {
            target,
            scanner
        });
        return v;
    }
    
    parse() {
        while (this.tokens.length) {
            if (!this.parseOnce()) {
                let message = `Failed to parse, expected:\n`;
                for (const r of this.rules) {
                    message += `  ${r.target}\n`;
                }
                message += `But instead got ${JSON.stringify(this.tokens[0])}`;
                return new Error(message);
            }
        }
        return this.output;
    }
    parseOnce() {
        for (const r of this.rules) {
            console.log(`Trying out rule ${r.target}`, this.tokens)
            try {
                this.expectRule(r);
                return true;
            } catch {
                // pass
            }
        }
        return false
    }
    expect<O extends TokenType>(pred: (token: TokenType) => boolean): O {
        if (this.tokens.length === 0) throw new Error("Not enough elements");
        let t;
        if (!pred(t = this.tokens.shift()!)) throw new Error("mismatch")
        return t as O;
    }
    expectRule<O extends NodeType>(rule: this["rules"][number]): O {
        const prevTokens = structuredClone(this.tokens);
        const prevNodes = structuredClone(this.output);
        try {
            const ezp = new EZP<TokenType, NodeType>(this.tokens);
            const value = rule.scanner(ezp) as O;
            this.output.push(value);
            return value;
        } catch (e) {
            this.tokens = prevTokens;
            this.output = prevNodes;
            throw e;
        }
    }
    giveLastThatWorks<O extends NodeType>(...rules: this["rules"]): O {
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
    hasNext<O extends TokenType>(value: O, pred: (token: TokenType) => boolean, cb: (token: TokenType) => O): O {
        if (this.tokens.length && pred(this.tokens[0])) {
            return cb(this.tokens.shift()!);
        }
        return value;
    }
    doesNext(pred: (token: TokenType) => boolean): boolean {
        return this.tokens.length ? pred(this.tokens[0]) : false;
    }
}