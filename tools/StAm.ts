// (S)ilk (T)ool (Am)algamate
import modulesIndex from '../modules.json' with { type: 'json' };

import * as path from 'jsr:@std/path';

import { skap } from "../shared/SkAp.ts";
import { Logger } from "../shared/SkLg.ts";
import { TSLexer } from "../shared/SkTs/Tk.ts";
import { reconstructMinimize } from "../shared/SkTs/Rc.ts"

const logger = new Logger({});
const HOME = Deno.env.get("HOME") ?? (Deno.env.get("HOMEDRIVE")! + Deno.env.get("HOMEPATH")!);
if (HOME === undefined) {
    logger.error(`Can't find a HOME env variable to make config files at.`)
    logger.error(`Please rerun with a hardcoded HOME value`);
    Deno.exit(1);
}

let libraryPath = "";
try {
    const config = JSON.parse(Deno.readTextFileSync(path.join(HOME, ".stam.json")));
    libraryPath = config?.libraryPath;
    if (libraryPath === "" || libraryPath === undefined) {
        logger.error("Expected 'libraryPath' in config json file!");
        Deno.exit(1);
    }
} catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
        throw err;
    }
    logger.error(`File does not exist! A file with empty libraryPath has been automatically created at "${path.join(HOME, ".stam.json")}"`);
    Deno.writeTextFileSync(path.join(HOME, ".stam.json"), `{ "libraryPath": "" }`);
    Deno.exit(1);
}

const shape = skap.command({
    subc: skap.subcommand({
        build: skap.command({
            modules: skap.rest().description("modules to add to your bundle"),
            runtime: skap.string("-r").description("which runtime to build for (deno, node)"),
            outFile: skap.string("-o").description("output file path"),
            help: skap.boolean("--help").description("display this message"),
            minify: skap.boolean("-M").description("do a (very bad) minification of your files"),
            minifyRemoveComments: skap.boolean("-Mc").description("minification and remove comments (might be broken)")
        })
    }).required()
})

const cmd = shape.parse(Deno.args, {
    customError: (message) => logger.error(message)
});
async function main() {
    if (cmd.subc.selected === 'build') {
        if (cmd.subc.commands.build!.help) {
            console.log(shape.shape.subc.shape.build.usage());

            Deno.exit(0);
        }
        const modules: string[] = [];
        let runtime: "deno" | "node" = "deno";
        let output = "./SkOutput.ts";

        const addModule = function (module: string) {
            if (modules.includes(module)) return;
            modules.splice(modules.findIndex(m => m === module), 0, module);
            if (!(module in modulesIndex)) {
                console.error(`[SkAm] error: no module called ${module}`);
                Deno.exit(1);
            }
            if (modulesIndex[module as keyof typeof modulesIndex].dependencies.length > 0) {
                for (const dep of modulesIndex[module as keyof typeof modulesIndex].dependencies) {
                    console.log(`[SkAm] Adding dependency ${dep} due to module ${module}`);
                    addModule(dep);
                }
            }
        }

        const subc = cmd.subc.commands.build!;
        for (const module of subc.modules) {
            addModule(module);
        }
        if (subc.runtime !== undefined && subc.runtime !== "deno" && subc.runtime !== "node") {
            console.error(`[SkAm] Invalid runtime: ${runtime}`);
            console.error(shape.usage());
            Deno.exit(1);
        } else if (subc.runtime !== undefined) runtime = subc.runtime;
        if (subc.outFile !== undefined) output = subc.outFile;
        
        console.log(`[SkAm] Modules: ${modules.join(', ')}`);
        console.log(`[SkAm] Runtime: ${runtime}`);
        console.log(`[SkAm] Output File: ${output}`);
        if (subc.minify) console.log(`[SkAm] Minification: true`);

        const START_COMMENT = 
`/**
 * SkSFL amalgamate file
 * GitHub: https://github.com/x5ilky/SkSFL
 * Created: ${new Date().toTimeString()}
 * Modules: ${modules.join(", ")}
 * 
 * Created without care by x5ilky
 */
`;
        let out = "";
        for (const module of modules) {
            if (module in modulesIndex) {
                const file = modulesIndex[module as keyof typeof modulesIndex];
                if (runtime in file) {
                    out += "\n" + (await Deno.readTextFile(path.join(libraryPath, file[runtime]!))).replace(/\/\/\s+#begin_import.*\/\/\s+#end_import/gs, '') + "\n";
                } else {
                    console.error(`[SkAm] Module ${module} not found for runtime ${runtime}`);
                }
            } else {
                console.error(`[SkAm] Module ${module} not found`);
            }
        }
        
        console.log(`[SkAm] Writing to ${output}`);

        if (subc.minify) {
            const lexer = new TSLexer(out);
            out = reconstructMinimize(lexer.lex(), !subc.minifyRemoveComments)
        }
        await Deno.writeTextFile(output, START_COMMENT + out);
    }
}

if (import.meta.main) await main();