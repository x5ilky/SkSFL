
// (S)il(k) (T)ype(s)cript / (R)e(c)onstructor

// #begin_import
import { match, TsToken } from "./base.ts";
// #end_import

export function reconstructMinimize(tokens: TsToken[], withComments: boolean) {
    let out = "";
    for (const token of tokens) {
        match(token, {
            Comment: ({content, multiline}) => {
                if (!withComments) return;
                console.log(content, multiline);
                if (!multiline) out += "\n//" + content + '\n';
                else out += `/*${content}*/`;
            },
            Decorator: ({op}) => out += `@${op} `,
            Identifier: ({op}) => out += op,
            Keyword: ({name}) => out += ` ${name} `,
            Number: ({num}) => out += num + " ",
            Regexp: ({modifiers, value}) => out += `/${value}/${modifiers} `,
            String: ({value}) => out += JSON.stringify(value),
            Symbol: ({op}) => out += op,
            TemplateString: ({inserts, value}) => {
                let o = "";
                for (let i = 0; i < value.length; i++) {
                    // "here: {}"
                    //  01234567
                    const n = inserts.find(a => i === a.location-1);
                    if (value[i] === '$') o += '\\';
                    o += value[i];
                    if (n !== undefined) {
                        o += `\${${reconstructMinimize(n.tokens, withComments)}}`;
                    }
                }
                out += "`" + o + "`";
            }
        })
    }
    return out;
}