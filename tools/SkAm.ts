import modulesIndex from '../modules.json' with { type: 'json' };

import * as path from 'jsr:@std/path';

function usage() {
    console.log('-- SkAm');
    console.log('SUBCOMMANDS:');
    console.log('  SkAm.ts build [options]');
    console.log('    Builds the specified modules');
    console.log('    Required options:');
    console.log('      -m, --modules <modules>');
    console.log('        The modules to build');
    console.log('    Optional options:');
    console.log('      -r, --runtime <runtime>');
    console.log('        The runtime to build for');
    console.log('        Valid values: deno, node');
    console.log('      -o, --output <path>');
    console.log('        The path to output the built modules');
    Deno.exit(1);
}

const args = Deno.args;
async function main() {
    const subc = args[0];
    if (!subc) usage();
    if (subc === 'build') {
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

        while (args.length > 0) {
            const arg = args.shift();
            if (arg === '-m' || arg === '--modules') {
                while (args.length > 0 && args[0][0] !== '-') {
                    addModule(args.shift()!);
                }
            } else if (arg === '-r' || arg === '--runtime') {
                if (runtime !== "deno" && runtime !== "node") {
                    console.error(`[SkAm] Invalid runtime: ${runtime}`);
                    usage();
                }
                runtime = args.shift()! as "deno" | "node";
            } else if (arg === '-o' || arg === '--output') {
                output = args.shift()!;
            }
        }
        console.log(`[SkAm] Modules: ${modules.join(', ')}`);
        console.log(`[SkAm] Runtime: ${runtime}`);
        console.log(`[SkAm] Output File: ${output}`);

        let out = `
/**
 * SkSFL amalgamate file
 * GitHub: https://github.com/x5ilky/SkSFL
 * Created: ${new Date().toTimeString()}
 * Modules: ${modules.join(", ")}
 * 
 * Created without care by x5ilky
 */`;
        for (const module of modules) {
            if (module in modulesIndex) {
                const file = modulesIndex[module as keyof typeof modulesIndex];
                if (runtime in file) {
                    out += (await Deno.readTextFile(path.join(import.meta.dirname!, "../", file[runtime]!))).replace(/\/\/\s+#begin_import.*\/\/\s+#end_import/gs, '');
                } else {
                    console.error(`[SkAm] Module ${module} not found for runtime ${runtime}`);
                }
            } else {
                console.error(`[SkAm] Module ${module} not found`);
            }
        }
        
        console.log(`[SkAm] Writing to ${output}`);
        await Deno.writeTextFile(output, out);
    } else {
        console.log(`[SkAm] Unknown subcommand: ${subc}`);
        usage();
    }
}

if (import.meta.main) await main();