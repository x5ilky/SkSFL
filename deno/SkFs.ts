export const skfs = {
    readTextFileSync (path: string) {
        return Deno.readTextFileSync(path);
    },
    readTextFile (path: string) {
        return Deno.readTextFile(path);
    },
    readBinarySync (path: string): Uint8Array {
        const a = Deno.readFileSync(path);
        return a;
    },
    readBinary (path: string): Promise<Uint8Array> {
        return Deno.readFile(path);
    },
    readDirSync (path: string): string[] {
        const paths: string[] = [];
        for (const p of Deno.readDirSync(path)) {
            paths.push(p.name);
        }
        return paths;
    },
    async readDir (path: string): Promise<string[]> {
        const paths: string[] = [];
        for await (const p of Deno.readDir(path)) {
            paths.push(p.name);
        }
        return paths;
    },
    writeTextFileSync (path: string, data: string) {
        Deno.writeTextFileSync(path, data)
    },
    async writeTextFile (path: string, data: string) {
        await Deno.writeTextFile(path, data);
    },
    writeBinarySync (path: string, bytes: Uint8Array) {
        Deno.writeFileSync(path, bytes);
    },
    async writeBinary (path: string, bytes: Uint8Array) {
        await Deno.writeFile(path, bytes)
    },
}