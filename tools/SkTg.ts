// (S)il(k) (T)ype (G)enerator
/*
--- Example Syntax ---

renum ReportType<T> {
    Foo { test: $[ string ]$ }
    Bar { boo: $[ T ]$ } 
}

// generates

type $$SkTgExtends<T, U extends T> = U;
function match<T extends {__type: string, value: any}>(value: T, matchFor: { [k in T["__type"]]: (value: $$SkTgExtends<T, {__type: k}>) => void } ) {
    ...
}

type ReportType<T> = 
    ReportType$Foo | ReportType$Bar

type ReportType$Foo = { __type: "Foo", value: {
    test: string
}};
type ReportType$Bar = { __type: "Bar", value: {
    test: string
}}

const ReportType$Foo = (value: ReportType$Foo["value"]) => { ... }
const ReportType$Bar = (value: ReportType$Bar["value"]) => { ... }
*/

import { skap } from "../shared/SkAp.ts"

const shape = skap.command({
    subc: skap.subcommand({
        build: skap.command({
            inputFile: skap.string("-i").required(),
            outputFile: skap.string("-o").required(),
        })
    }).required()
})

const cmd = shape.parse(Deno.args);

if (cmd.subc.selected === "build") {
    const {
        inputFile,
        outputFile
    } = cmd.subc.commands.build!;

    const input = await Deno.readFile(inputFile);

    
}
