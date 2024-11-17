export type LoggerTag = {
    name: string,
    color: [number, number, number]
}
export type LoggerConfig = {
    prefixTags?: LoggerTag[];

    levels?: {[level: number]: LoggerTag};
    
    tagPrefix?: string;
    tagSuffix?: string;
}

export class Logger {
    config: LoggerConfig;
    constructor(config: LoggerConfig) {
        this.config = config;
        this.config.levels ??= {
            0: {color: [77, 183, 53], name: "DEBUG"},
            1: {color: [229, 68, 5], name: "INFO"},
            2: {color: [214, 36, 0], name: "WARN"},
            3: {color: [183, 359, 0], name: "ERROR"}
        };
        this.config.tagPrefix ??= "[";
        this.config.tagSuffix ??= "]";
    }

    printWithTags(tags: LoggerTag[], ...args: string[]) {
        console.log(`${tags.map((a) => `\x1b[38;2;${a.color[0]};${a.color[1]};${a.color[2]}m${this.config.tagPrefix}${a.name}${this.config.tagSuffix}\x1b[0m`).join(' ')} ${args.join(' ')}`);
    }

    info(...args: string[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![1]
            ],
            ...args
        )
    }

    debug(...args: string[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![0]
            ],
            ...args
        )
    }

    warn(...args: string[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![2]
            ],
            ...args
        )
    }

    error(...args: string[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![3]
            ],
            ...args
        )
    }

    log(level: number, ...args: string[]) {
        this.printWithTags(
            [
                ...(this.config.prefixTags ?? []),
                this.config.levels![level]
            ],
            ...args
        )
    }
}

export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
}

const log = new Logger({});

log.info('Hello, world!');
