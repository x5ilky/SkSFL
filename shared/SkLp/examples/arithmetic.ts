import { EZP } from "../SkLp.ts";
import { type TsToken, type TsToken$Number } from "../../SkTs/base.ts";
import { TSLexer } from "../../SkTs/Tk.ts";

const tokens = new TSLexer(
    Deno.readTextFileSync(
        Deno.args.shift() ?? "./examples/arithmetic-test.txt",
    ),
).lex();

const ezp = new EZP<TsToken, {type: "number", num: number} | {type: string}>(tokens, {});
const valueRule = ezp.addRule("value", (ezp) => {
    const literal = ezp.addRule("number", (ezp) => {
        if (ezp.doesNext((t) => t.__type === "Symbol" && t.value.op === "(")) {
            const _bracket = ezp.expect((_) => true);
            const value = ezp.expectRule(valueRule);
            const _endBracket = ezp.expect((a) =>
                a.__type === "Symbol" && a.value.op === ")"
            );
            return {
                type: "grouping",
                value: value,
            };
        }
        const num = ezp.expect((a) => a.__type === "Number");
        return {
            num: num.value.num,
            type: "number",
        };
    });

    const factor = ezp.addRule("value * value", (ezp) => {
        const num = ezp.expectRule(literal);
        return ezp.thisOrIf(
            num,
            (token) => token.__type === "Symbol" && token.value.op === "*",
            (_token) => {
                const other = ezp.expectRule(factor);
                return {
                    type: "mul",
                    left: num,
                    right: other,
                };
            },
        );
    });
    const term = ezp.addRule("value + value", (ezp) => {
        const num = ezp.expectRule(factor);
        return ezp.thisOrIf(
            num,
            (token) => token.__type === "Symbol" && token.value.op === "+",
            (_token) => {
                const other = ezp.expectRule(term);
                return {
                    type: "add",
                    left: num,
                    right: other,
                };
            },
        );
    });

    return ezp.getFirstThatWorks(term);
});

const nodes = ezp.parse();
console.log(nodes);
