// #begin_import
import { Ansi } from "./SkTm/An.ts";
// #end_import


export type LoggerTag = {
    name: string,
    color: [number, number, number],
    priority: number
}
export type LoggerConfig = {
    prefixTags: LoggerTag[];
    suffixTags: LoggerTag[];
    levels: {[level: number]: LoggerTag};
    
    tagPrefix: string;
    tagSuffix: string;

    startTag: LoggerTag;
    endTag: LoggerTag;

    hideThreshold: number;
}

export class Logger {
    config: LoggerConfig;
    maxTagLengths: number[];
    constructor(config: Partial<LoggerConfig>) {
        this.config = config as LoggerConfig;
        this.config.hideThreshold ??= 0;
        this.config.levels ??= {
            0: {color: [77, 183, 53], name: "DEBUG", priority: 0},
            10: {color: [54, 219, 180], name: "INFO", priority: 10},
            20: {color: [219, 158, 54], name: "WARN", priority: 20},
            30: {color: [219, 54, 54], name: "ERROR", priority: 30}
        };
        this.config.tagPrefix ??= "[";
        this.config.tagSuffix ??= "]";

        this.config.startTag ??= {
            color: [219, 197, 54],
            name: "START",
            priority: -10
        };
        this.config.endTag ??= {
            color: [82, 219, 54],
            name: "END",
            priority: -10
        };
        this.maxTagLengths = [];
    }

    // deno-lint-ignore no-explicit-any
    printWithTags(tags: LoggerTag[], ...args: any[]) {
        const tag = (a: LoggerTag, index: number) => {
            let raw = `${this.config.tagPrefix}${a.name}${this.config.tagSuffix}`;
            if (this.maxTagLengths[index] === undefined || raw.length > this.maxTagLengths[index]) {
                this.maxTagLengths[index] = raw.length;
            }
            raw = raw.padEnd(this.maxTagLengths[index], " ");;
            return `${Ansi.rgb(a.color[0], a.color[1], a.color[2])}${raw}${Ansi.reset}`;
        }
        console.log(`${tags.map((a, i) => tag(a, i).padStart(this.maxTagLengths[i], "#")).join(' ')} ${args.join(' ')}`);
    }

    // deno-lint-ignore no-explicit-any
    info(...args: any[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![10]
            ],
            ...args
        );
    }

    // deno-lint-ignore no-explicit-any
    debug(...args: any[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![0]
            ],
            ...args
        );
    }

    // deno-lint-ignore no-explicit-any
    warn(...args: any[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![20]
            ],
            ...args
        );
    }

    // deno-lint-ignore no-explicit-any
    error(...args: any[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![30]
            ],
            ...args
        );
    }

    // deno-lint-ignore no-explicit-any
    log(level: number, ...args: any[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![level]
            ],
            ...args
        );
    }

    start(level: number, ...args: string[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![level],
                this.config.startTag!
            ],
            ...args
        );
    }
    end(level: number, ...args: string[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![level],
                this.config.endTag!
            ],
            ...args
        );
    }
}

export const LogLevel = {
    DEBUG: 0,
    INFO: 10,
    WARN: 20,
    ERROR: 30
};