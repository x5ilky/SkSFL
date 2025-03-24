// (S)il(k) (D)ata(b)ase


// #begin_import
import { skfs } from "../deno/SkAgnostic.ts";
import { SkSerializer } from "./SkSr.ts";
// #end_import

export class Database<T> {
    value: T;
    constructor(private path: string, private initialValue?: T) {
        this.value = null as unknown as T;
        this.load();
        skfs.onExit(async () => {
            const ser = new SkSerializer();
            await skfs.writeTextFile(path, ser.serialize(this.value));
        });
    }

    load() {
        try {
            const ser = new SkSerializer();
            this.value = ser.deserialize(skfs.readTextFileSync(this.path));
        } catch {
            if (this.initialValue === undefined) throw new Error(`No initial value found and database is aso not found`)
            this.value = this.initialValue;
            const ser = new SkSerializer();
            skfs.writeTextFileSync(this.path, ser.serialize(this.value));
        }
    }
}