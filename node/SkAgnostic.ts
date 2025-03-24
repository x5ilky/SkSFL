import fs from "fs";
import process from "process";
export const skfs = {
    readTextFileSync (path: string) {
        return fs.readFileSync(path, "utf8");
    },
    readTextFile (path: string) {
        return new Promise<string>(res => {
            fs.readFile(path, {
                encoding: "utf8"
            }, (err, data) => {
                if (err) throw err;
                res(data);
            });
        })
    },
    readBinarySync (path: string): Uint8Array {
        const a = Uint8Array.from(fs.readFileSync(path));
        return a;
    },
    async readBinary (path: string): Promise<Uint8Array> {
        return Uint8Array.from(await skfs.readTextFile(path));
    },
    readDirSync (path: string): string[] {
        return fs.readdirSync(path);
    },
    readDir (path: string): Promise<string[]> {
        return new Promise<string[]>(res => {
            fs.readdir(path, (err, files) => {
                if (err) throw err;
                res(files);
            })
        })
    },
    writeTextFileSync (path: string, data: string) {
        fs.writeFileSync(path, data)
    },
    writeTextFile (path: string, data: string) {
        return new Promise<void>(res => {
            fs.writeFile(path, data, () => {
                res()
            });
        })
    },
    writeBinarySync (path: string, bytes: Uint8Array) {
        fs.writeFileSync(path, bytes);
    },
    writeBinary (path: string, bytes: Uint8Array) {
        return new Promise<void>(res => {
            fs.writeFile(path, bytes, () => {
                res()
            });
        })
    },

    onExit(cb: (exitCode: number) => void) {
        process.on("exit", (e) => {
            cb(e);
        })
    }
}