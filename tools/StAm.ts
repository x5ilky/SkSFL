// (S)ilk (T)ool (Am)algamate
import modulesIndex from '../modules.json' with { type: 'json' };

import * as path from 'jsr:@std/path';

import { skap } from "../shared/SkAp.ts";
import { Logger } from "../shared/SkLg.ts";
import { TSLexer } from "../shared/SkTs/Tk.ts";
import { reconstructMinimize } from "../shared/SkTs/Rc.ts"

const logger = new Logger({});

const shape = skap.command({
    subc: skap.subcommand({
        build: skap.command({
            modules: skap.rest(),
            runtime: skap.string("-r"),
            outFile: skap.string("-o"),
            help: skap.boolean("--help"),
            minify: skap.boolean("-M"),
            minifyRemoveComments: skap.boolean("-Mc")
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
                    out += "\n" + (await Deno.readTextFile(path.join(import.meta.dirname!, "../", file[runtime]!))).replace(/\/\/\s+#begin_import.*\/\/\s+#end_import/gs, '') + "\n";
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