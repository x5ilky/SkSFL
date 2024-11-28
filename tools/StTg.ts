// (S)ilk (T)ool (T)ype (G)enerator
/*
--- Example Syntax ---

renum ReportType<T, E> do
    Foo ${ test: string }$
    Bar ${ boo: T }$
end

// generates

type $$SkTgExtends<T, U extends T> = U;
function match<T extends {__type: string, value: any}>(value: T, matchFor: { [k in T["__type"]]: (value: $$SkTgExtends<T, {__type: k}>) => void } ) {
    ...
}

type ReportType<T> = 
    ReportType$Foo<T> | ReportType$Bar<T>

type ReportType$Foo<T> = { __type: "Foo", value: {
    test: string
}};
type ReportType$Bar<T> = { __type: "Bar", value: {
    boo: T
}}

const ReportType$Foo = (value: ReportType$Foo["value"]) => { ... }
const ReportType$Bar = (value: ReportType$Bar["value"]) => { ... }
*/

import { skap } from "../shared/SkAp.ts"

const shape = skap.command({
    subc: skap.subcommand({
        build: skap.command({
            inputFile: skap.string("-i").required().description("input path"),
            outputFile: skap.string("-o").required().description("output path"),
            doExport: skap.boolean("-e").description("whether to export types")
        })
    }).required()
})

const cmd = shape.parse(Deno.args, {
    customError: (e) => {
        console.error(e);
        Deno.exit(1);
    }
});

const renumRegex = /renum\s+(\w+)(<?([\w\s,]+?)>?)\s+do(.*?)end/gms;
const renumInner = /(\w+)\s+\${(.*?)}\$/gms;

if (cmd.subc.selected === "build") {
    const {
        inputFile,
        outputFile,
        doExport
    } = cmd.subc.commands.build!;

    const exp = doExport ? "export " : "";

    let out = `
// deno-lint-ignore no-explicit-any
${exp}function match<T extends {__type: string, value: any}>(value: T, matchFor: { [k in T["__type"]]: (value: Extract<T, {__type: k}>["value"]) => void } ) {
    if (value.__type in matchFor) {
        matchFor[value.__type as T["__type"]](value.value)
    }
}
`;

    const input = await Deno.readTextFile(inputFile);

    for (const renumMatch of input.matchAll(renumRegex)) {
        const [
            _total,
            name,
            genericTotal,
            _generics,
            body
        ] = renumMatch;

        let totalType = `${exp}type ${name}${genericTotal} = `;
        const types = [];
        
        for (const inner of body.matchAll(renumInner)) {
            const [
                _total,
                ename,
                ebody
            ] = inner;

            out += `${exp}type ${name}$${ename}${genericTotal} = { __type: ${JSON.stringify(ename)}, value: {${ebody}}};\n`;
            out += `${exp}const ${name}$${ename} = ${genericTotal}(value: ${name}$${ename}${genericTotal}["value"]): ${name}${genericTotal} => { return {__type: ${JSON.stringify(ename)}, value} };\n`
            types.push(`${name}$${ename}${genericTotal}`);

        }
        totalType += types.join(" | ");
        totalType += ";\n"
        out += totalType;
    }

    await Deno.writeTextFile(outputFile, out);
}
