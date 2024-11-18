"use strict";
// (S)il(k) (A)rgument (P)arser

// #begin_import
import { Ansi } from "../shared/SkAn.ts";
// #end_import

// deno-lint-ignore no-namespace
export namespace skap {
    type ParseSettings = {
        customError: (error: string) => void;
    }

    type SkapRequired<T extends SkapArgument> = T & {__required: true};
    type SkapOptional<T extends SkapArgument> = (T extends SkapRequired<infer U> ? U : T) & {__required: false};
    type SkapArgument = 
        SkapString<string> 
      | SkapNumber<string>
      | SkapSubcommand<SkapSubcommandShape>;
    function isSkapArgument(arg: SkapArgument): arg is SkapArgument {
        return arg instanceof SkapString || arg instanceof SkapNumber || arg instanceof SkapSubcommand;
    }
    function isNotSkapSubcommand<T extends SkapArgument>(arg: T): arg is Exclude<T, SkapSubcommand<SkapSubcommandShape>> {
        return !(arg instanceof SkapSubcommand);
    }
    type SkapCommandShape = {[name: string]: SkapArgument};
    type SkapSubcommandShape = {[name: string]: SkapCommand<SkapCommandShape>};

    export type SkapInfer<T extends SkapCommand<SkapCommandShape>> = {
        [K in keyof T["shape"]]: 
            T["shape"][K] extends SkapArgument
          ? SkapInferArgument<T["shape"][K]>
          : never
    };
    type SkapInferArgument<T extends SkapArgument> = 
        T extends SkapRequired<infer U extends SkapArgument>
      ? Require<SkapInferArgument<U>>
      : T extends SkapString<string> 
      ? string | undefined 
      : T extends SkapNumber<string>
      ? number | undefined
      : T extends SkapSubcommand<infer U extends SkapSubcommandShape> ? {commands: {
            [K in keyof U]: SkapInfer<U[K]> | undefined
        }, selected: keyof U} : never;
    type Require<T> = Exclude<T, undefined>;

    export function command<T extends SkapCommandShape>(shape: T, description: string = ""): SkapCommand<T> {
        return new SkapCommand(shape, description);
    }
    export function subcommand<T extends SkapSubcommandShape>(shape: T, description: string = ""): SkapSubcommand<T> {
        return new SkapSubcommand(shape, description);
    }
    export function string<T extends string>(name: T): SkapString<T> {
        return new SkapString(name);
    }
    export function number<T extends string>(name: T): SkapNumber<T> {
        return new SkapNumber(name);
    }
    class SkapString<T extends string> {
        name: T;
        __description: string;
        __required: boolean;
        constructor(name: T, description: string = "", required: boolean = false) {
            this.name = name;
            this.__description = description;
            this.__required = required;
        }

        required(): SkapRequired<SkapString<T>> {
            this.__required = true;
            return this as SkapRequired<SkapString<T>>;
        }
        optional(): SkapOptional<this> {
            this.__required = false;
            return this as SkapOptional<this>;
        }
        description(description: string): SkapString<T> {
            this.__description = description;
            return this;
        }
    }
    class SkapNumber<T extends string> {
        name: T;
        __description: string;
        __required: boolean;
        constructor(name: T, description: string = "", required: boolean = false) {
            this.name = name;
            this.__description = description;
            this.__required = required;
        }

        required(): SkapRequired<SkapNumber<T>> {
            this.__required = true;
            return this as SkapRequired<SkapNumber<T>>;
        }
        optional(): SkapOptional<SkapNumber<T>> {
            this.__required = false;
            return this as SkapOptional<SkapNumber<T>>;
        }
        description(description: string): SkapNumber<T> {
            this.__description = description;
            return this;
        }
    }
    class SkapSubcommand<T extends SkapSubcommandShape = SkapSubcommandShape> {
        shape: T;
        __description: string;
        __required: boolean;
        constructor(shape: T, description: string = "", required: boolean = false) {
            this.shape = shape;
            this.__description = description;
            this.__required = required;
        }
        required(): SkapRequired<SkapSubcommand<T>> {
            this.__required = true;
            return this as SkapRequired<SkapSubcommand<T>>;
        }
        optional(): SkapOptional<SkapSubcommand<T>> {
            this.__required = false;
            return this as SkapOptional<SkapSubcommand<T>>;
        }
    }
    class SkapCommand<T extends SkapCommandShape> {
        shape: T;
        __description: string;
        constructor(shape: T, description: string) {
            SkapCommand.check(shape);
            this.shape = shape;
            this.__description = description;
        }
        static check(shape: SkapCommandShape) {
            let subcs = 0;
            for (const argName in shape) {
                if (shape[argName] instanceof SkapSubcommand) {
                    subcs++;
                    if (subcs > 1) {
                        throw new Error("SkAp: Only one subcommand is allowed");
                    }
                    for (const subcommandName in shape[argName].shape) {
                        SkapCommand.check(shape[argName].shape[subcommandName].shape);
                    }
                }
            }
        }

        private emptyBase(): Partial<SkapInfer<this>> {
            // deno-lint-ignore no-explicit-any
            const out: any = {};
            for (const argName in this.shape) {
                if (this.shape[argName] instanceof SkapString) {
                    out[argName] = undefined;
                } else if (this.shape[argName] instanceof SkapNumber) {
                    out[argName] = undefined;
                } else if (this.shape[argName] instanceof SkapSubcommand) {
                    // deno-lint-ignore no-explicit-any
                    const commands: any = {};
                    for (const subcommandName in this.shape[argName].shape) {
                        commands[subcommandName] = this.shape[argName].shape[subcommandName].emptyBase();
                    }
                    out[argName] = {selected: undefined, commands: commands};
                }
            }
            return out;
        }
        private parseBase(args: string[], settings: ParseSettings): [SkapInfer<this>, string[]] {
            // deno-lint-ignore no-explicit-any
            const out: any = this.emptyBase();

            while (args.length > 0) {
                const arg = args.shift();
                for (const argName in this.shape) {
                    const argShape = this.shape[argName];
                    if (argShape instanceof SkapString) {
                        if (arg == argShape.name) {
                            out[argName] = args.shift();
                        }
                    } else if (argShape instanceof SkapNumber) {
                        if (arg == argShape.name) {
                            try {
                                out[argName] = Number(args.shift());
                            } catch (e) {
                                settings.customError!(`Invalid number argument ${argShape.name}`);
                            }
                        }
                    } else if (argShape instanceof SkapSubcommand) {
                        for (const subcommandName in argShape.shape) {
                            if (arg == subcommandName) {
                                const [subcommandOut, subcommandRest] = argShape.shape[subcommandName].parseBase(args, settings);
                                out[argName] = {selected: subcommandName, commands: subcommandOut};
                                args = subcommandRest;
                                break;
                            }
                        }
                    }
                }
            }

            for (const argName in this.shape) {
                const argShape = this.shape[argName];
                if (argShape instanceof SkapString) {
                    if (out[argName] === undefined && argShape.__required) {
                        settings.customError!(`Missing required string argument ${argShape.name}`);
                    }
                } else if (argShape instanceof SkapNumber) {
                    if (out[argName] === undefined && argShape.__required) {
                        settings.customError!(`Missing required number argument ${argShape.name}`);
                    }
                } else if (argShape instanceof SkapSubcommand) {
                    if (out[argName].selected === undefined && argShape.__required) {
                        settings.customError!(`Missing required subcommand for ${argName}\n${this.usage()}`);
                    }
                }
            }

            return [out as SkapInfer<this>, args];
        }
        parse(args: string[], settings: Partial<ParseSettings> = {

        }): SkapInfer<this> {
            if (settings.customError === undefined) {
                settings.customError = (error) => {
                    throw new Error(error);
                }
            }
            return this.parseBase(args, settings as ParseSettings)[0];
        }

        syntax(): string {
            let out = `${Ansi.italic}`;
            for (const argName in this.shape) {
                const argShape = this.shape[argName];
                if (argShape instanceof SkapString) {
                    if (!out.includes(" [options]")) {
                        out += ` [options]`;
                    }
                } else if (argShape instanceof SkapSubcommand) {
                    out += `${Ansi.reset}${Ansi.bold} <subcommand>`;
                }
            }
            out += `${Ansi.reset}\n`;
            return out;
        }
        usage(previous: string = import.meta.filename ?? import.meta.url): string {
            let out = previous + this.syntax();
            const args = Object.keys(this.shape).filter(a => isNotSkapSubcommand(this.shape[a]));
            if (args.length > 0) {
                out += `${Ansi.blue}ARGUMENTS:\n${Ansi.reset}`;
                for (const arg of args) {
                    out += `${Ansi.reset}`;
                    if (this.shape[arg] instanceof SkapString) {
                        out += `  ${Ansi.bold}${this.shape[arg].name}${Ansi.reset} <string>`;
                    } else if (this.shape[arg] instanceof SkapNumber) {
                        out += `  ${Ansi.bold}${this.shape[arg].name}${Ansi.reset} <number>`;
                    }
                    if (this.shape[arg].__required) {
                        out += `${Ansi.red} (required)`;
                    } else {
                        out += `${Ansi.green} (optional)`;
                    }
                    if (this.shape[arg].__description) {
                        out += `\n${Ansi.reset}${Ansi.gray}    ${Ansi.italic}${this.shape[arg].__description}`;
                    }
                    out += `${Ansi.reset}\n`;
                }
            }
            const subcs = Object.keys(this.shape).filter(a => this.shape[a] instanceof SkapSubcommand);
            if (subcs.length > 0) {
                out += "SUBCOMMANDS:\n";
                for (const subc of subcs) {
                    const shape = this.shape[subc];
                    if (shape instanceof SkapSubcommand) {
                        for (const subcommand in shape.shape) {
                            out += `  ${subcommand}${shape.shape[subcommand].syntax()}\n`;
                        }
                    }
                }
            }
            return out;
        }
    }
}

// example api

const command = skap.command({
    output: skap.string("-d").optional(),
    number: skap.number("-n").optional().description("test number output"),
    subc: skap.subcommand({
        build: skap.command({
            file: skap.string("-f").required()
        })
    }).required(),
});
const result = command.parse(Deno.args, {
    customError: (error) => {
        console.error(error);
        Deno.exit(1);
    }
});
console.log(result);
console.log(command.usage());
