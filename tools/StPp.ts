// (S)ilk (T)ool (P)re(p)rocessor

import * as path from "jsr:@std/path";
import { reconstructMinimize } from "../shared/SkTs/Rc.ts";
import { skap } from "../shared/SkAp.ts";
import { TsToken, TsToken$Identifier, TsToken$String, TsToken$Symbol } from "../shared/SkTs/base.ts";
import { TSLexer } from "../shared/SkTs/Tk.ts";
import { Logger } from "../shared/SkLg.ts";

const logger = new Logger({
    prefixTags: [{
        priority: -10,
        color: [64, 12, 245],
        name: "StPp"
    }]
});
const shape = skap.command({
    files: skap.rest(),
    experimental: skap.boolean("-I_UNDERSTAND_THIS_IS_EXPERIMENTAL_AND_SHOULDNT_BE_USED"),
    replace: skap.boolean("-R")
});

const cmd = shape.parse(Deno.args);


const state: {[name: string]: string} = {};
function preprocess(tokens: TsToken[]): TsToken[] {
    let i;
    const ifStack = [true];
    const out = [];
    for (i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        logger.debug(JSON.stringify(t));
        if (ifStack[ifStack.length-1]) out.push(t);
        if (t.__type === "Comment") {
            logger.debug("parsing")
            const parsed = parseComment(t.value.content);
            if ("include_str" in parsed) {
                const str = JSON.stringify(Deno.readTextFileSync(parsed["include_str"].value));
                const constToken = tokens[++i];
                if (constToken.__type === "Keyword" && constToken.value.name === "const") {
                    const name = tokens[++i];
                    const equals = tokens[++i];
                    const s = tokens[++i];
                    if (name.__type !== "Identifier" || equals.__type !== "Symbol" || s.__type !== "String") {
                        logger.error("#include_str can only be followed with syntax like this:")
                        logger.error("`const K = \"\";");
                        Deno.exit(0);
                    }
                    out.push(constToken, name, equals, );
                    out.push(TsToken$String(s.start, s.end, { value: str.slice(1, -1) }))

                } else {
                    logger.error("#include_str can only be used when immediately following a const");
                    logger.error("if you want to export the const, make a new variable and export the one following the preprocessor tag");
                    Deno.exit(0);
                }
                
            }
            else if ("include_str_base64" in parsed) {
                const str = btoa(String.fromCharCode.apply(null, [...Deno.readFileSync(parsed["include_str_base64"].value)]));
                
                const constToken = tokens[++i];
                if (constToken.__type === "Keyword" && constToken.value.name === "const") {
                    const name = tokens[++i];
                    const equals = tokens[++i];
                    const s = tokens[++i];
                    if (name.__type !== "Identifier" || equals.__type !== "Symbol" || s.__type !== "String") {
                        logger.error("#include_str_base64 can only be followed with syntax like this:")
                        logger.error("`const K = \"\";");
                        Deno.exit(0);
                    }
                    out.push(constToken, name, equals, );
                    out.push(
                        TsToken$Identifier(s.start, s.start, { op: "atob" }), 
                        TsToken$Symbol(s.start, s.start, { op: "("}),
                        TsToken$String(s.start, s.end, { value: str }),
                        TsToken$Symbol(s.start, s.start, { op: ")"}),
                    )

                } else {
                    logger.error("#include_str_base64 can only be used when immediately following a const");
                    logger.error("if you want to export the const, make a new variable and export the one following the preprocessor tag");
                    Deno.exit(0);
                }
            }
            else if ("define" in parsed) {
                const {key, value} = parsed["define"]
                state[key] = value;
            }
            else if ("if" in parsed) {
                const { value } = parsed["if"];
                console.log(`Transcepting`);
                const v = reconstructMinimize(transcept(value), true);
                console.log(`Interpreting: ${v}`);
                const accept = eval(v); 
                ifStack.push(accept);
            }
            else if ("endif" in parsed) {
                ifStack.pop();
            }
        }
    }

    return out;
}
function transcept(str: string) {
    const lexer = new TSLexer(str);
    const tokens = lexer.lex();
    const out: TsToken[] = [];
    
    const replacements = Object.keys(state);

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.__type === "Identifier") {
            if (replacements.includes(token.value.op)) {
                const minilexer = new TSLexer(state[token.value.op]);
                out.push(...minilexer.lex());
                continue;
            }
        } 
        out.push(token);
    }

    return out;
}
function parseComment(str: string) {
    const out: {[k: string]: {key: string, value: string}} = {};
    //#format=like_this
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '#') {
            // get tag
            i++;
            const o = {key: "", value: ""};
            let tag = "";
            while (true) {
                const c = str[i];
                if (c === ":" || c === "=" || c === undefined) { 
                    break;
                }
                tag += c;
                i++;
            }
            if (str[i] === ":") 
                i++;
                while (true) {
                    const c = str?.[i];
                    if (c === "=" || c === undefined) { 
                        break;
                    }
                    o.key += c;
                    i++;
                }
            let content = "";
            if (str[i] === "=") while (true) {
                const c = str[++i];
                if (c === undefined) break;
                if (c === " ") content += c;
                else if (/\s/.test(c)) break;
                else if (c === "\\") {
                    const escape = str[++i];
                    if (escape === "n") content += "\n";
                    else if (escape === "r") content += "\r";
                    else if (escape === "t") content += "\t";
                    else if (escape === "v") content += "\v";
                    else if (escape === "f") content += "\f";
                    else if (escape === " ") content += " ";
                    else if (escape === "\\") content += "\\";
                    else if (escape === "0") content += "\0";
                    else if (escape === "c") {
                        const code = str[++i];
                        content += String.fromCharCode(code!.charCodeAt(0) % 32);
                    } else if (/[\^$\.*+?()[\]{}|\/`]/.test(escape!)) {
                        content += escape;
                    } else if (escape === "x") {
                        const char1 = str[++i]!;
                        const char2 = str[++i]!;
                        content += String.fromCharCode(parseInt(char1 + char2, 16));
                    } else if (escape === "u") {
                        const char1 = str[++i]!;
                        if (char1 === "{") {
                            let b = "";
                            let c;
                            while ((c = str[++i]) !== "}") {
                                b += c;
                            }
                            content += String.fromCharCode(parseInt(b, 16));
                        } else {
                            const char2 = str[++i]!;
                            const char3 = str[++i]!;
                            const char4 = str[++i]!;

                            content += String.fromCharCode(
                                parseInt(char1 + char2 + char3 + char4, 16),
                            );
                        }
                    } else throw new Error(`Invalid escape: \\${escape}\nIn: ${str}`);
                } else content += c;
            }
            o.value = content;
            out[tag] = o;
        }
    }
    return out;
}

if (cmd.experimental)
    for (const fp of cmd.files) {
        logger.debug("Starting read...")
        const text = await Deno.readTextFile(fp);
        logger.debug("Lexing...")
        const lexer = new TSLexer(text);
        let outPath = path.parse(fp).name + ".pp" + path.parse(fp).ext;
        if (cmd.replace) {
            outPath = fp;
        }
        await Deno.writeTextFile(outPath, reconstructMinimize(preprocess(lexer.lex()), true));
    }
else {
    logger.error("This tool is STILL EXPERIMENTAL");
    logger.error("if you still want to use it, use the -I_UNDERSTAND_THIS_IS_EXPERIMENTAL_AND_SHOULDNT_BE_USED flag");
    Deno.exit(1);
}