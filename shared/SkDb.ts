// (S)il(k) (D)ata(b)ase


// #begin_import
import { skfs } from "../deno/SkAgnostic.ts";
import { Logger } from "./SkLg.ts";
import { SkSerializer } from "./SkSr.ts";
// #end_import

export class Database<T> {
    value: T;
    constructor(private path: string, private options: {
        initialValue?: T,
        logger?: Logger,
        timer?: number
    }, private custom?: (v: any) => any) {
        this.value = null as unknown as T;
        this.load();
        skfs.onExit(async () => {
            await this.write.bind(this)();
        });
        setInterval(async () => {
            await this.write();
        }, 1000*60*(options.timer ?? 10));
    }

    async write() {
        const ser = new SkSerializer();
        await skfs.writeBinary(this.path, ser.serialize(this.value, this.custom?.bind(this)));
        if (this.options.logger !== undefined) this.options.logger.info(`Wrote data to database file`)
    }
    load() {
        try {
            if (this.options.logger !== undefined) this.options.logger.info(`Trying to load`)
            const ser = new SkSerializer();
            this.value = ser.deserialize(skfs.readBinarySync(this.path), this.custom?.bind(this));
            if (this.options.logger !== undefined) this.options.logger.info(`Loaded database data`)
        } catch {
            if (this.options.initialValue === undefined) throw new Error(`No initial value found and database is aso not found`)
            this.value = this.options.initialValue;
            const ser = new SkSerializer();
            skfs.writeBinarySync(this.path, ser.serialize(this.value, this.custom?.bind(this)));
            if (this.options.logger !== undefined) this.options.logger.info(`Failed to read database file, creating file with default value`)
        }
    }
}