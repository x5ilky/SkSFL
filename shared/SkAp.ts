// (S)il(k) (A)rgument (P)arser

// #begin_import
import { Ansi } from "./SkTm/An.ts";
// #end_import

// deno-lint-ignore no-namespace
export namespace skap {
    type ParseSettings = {
        customError: (error: string) => void;
    };

    type SkapRequired<T extends SkapArgument> = T & {__required: true};
    type SkapOptional<T extends SkapArgument> = (T extends SkapRequired<infer U> ? U : T) & {__required: false};
    type SkapArgument = 
        SkapString<string> 
      | SkapNumber<string>
      | SkapBoolean<string>
      | SkapPositional<number>
      | SkapRest
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
      : T extends SkapPositional<number> 
      ? string | undefined 
      : T extends SkapRest
      ? string[]
      : T extends SkapNumber<string>
      ? number | undefined
      : T extends SkapBoolean<string>
      ? boolean
      : T extends SkapSubcommand<infer U extends SkapSubcommandShape> ? {commands: {
            [K in keyof U]: SkapInfer<U[K]> | undefined
        }, selected: keyof U} : never;
    type Require<T> = Exclude<T, undefined>;

    /**
     * Creates a SkapCommand instance: e.g.
     * ```ts
     * const shape = skap.command({
     *     speed: skap.number().required(),
     *     foo: skap.boolean()
     * });
     * ```
     * @param shape Shape of the command, similar to zod
     * @returns above
     */
    export function command<T extends SkapCommandShape>(shape: T, description: string = ""): SkapCommand<T> {
        return new SkapCommand(shape, description);
    }
    /**
     * Creates a SkapSubcommand instance: e.g.
     * ```ts
     * skap.command({
     *     subc: skap.subcommand({
     *         build: skap.command({ ... })
     *     })
     * })
     * @param shape Shape of subcommand
     * @returns 
     */
    export function subcommand<T extends SkapSubcommandShape>(shape: T, description: string = ""): SkapSubcommand<T> {
        return new SkapSubcommand(shape, description);
    }
    export function string<T extends string>(name: T): SkapString<T> {
        return new SkapString(name);
    }
    export function number<T extends string>(name: T): SkapNumber<T> {
        return new SkapNumber(name);
    }
    export function boolean<T extends string>(name: T): SkapBoolean<T> {
        return new SkapBoolean(name);
    }
    /**
     * 
     * @param index Order of positional argument
     * @returns SkapPositional instance
     */
    export function positional<T extends number>(index: T): SkapPositional<number> {
        return new SkapPositional(index);
    }
    /**
     * Like {@link SkapPositional} except it gives all the unused positional arguments
     * @returns SkapRest instance
     */
    export function rest(): SkapRest {
        const r = new SkapRest();
        return r;
    }
    class SkapString<T extends string> {
        name: T;
        __default: string | undefined;
        __description: string;
        __required: boolean;
        constructor(name: T, description: string = "", required: boolean = false) {
            this.name = name;
            this.__description = description;
            this.__required = required;

            this.__default = undefined;
        }

        required(): SkapRequired<SkapString<T>> {
            this.__required = true;
            return this as SkapRequired<SkapString<T>>;
        }
        optional(): SkapOptional<this> {
            this.__required = false;
            return this as SkapOptional<this>;
        }
        description(description: string): this {
            this.__description = description;
            return this;
        }
        default(value: string): SkapRequired<this> {
            this.__default = value;
            return  this as SkapRequired<this>;
        }
    }
    class SkapNumber<T extends string> {
        name: T;
        __description: string;
        __default: number | undefined;
        __required: boolean;
        constructor(name: T, description: string = "", required: boolean = false) {
            this.name = name;
            this.__description = description;
            this.__required = required;
            this.__default = 0;
        }

        required(): SkapRequired<SkapNumber<T>> {
            this.__required = true;
            return this as SkapRequired<SkapNumber<T>>;
        }
        optional(): SkapOptional<this> {
            this.__required = false;
            return this as SkapOptional<this>;
        }
        description(description: string): this {
            this.__description = description;
            return this;
        }
        default(value: number): SkapRequired<this> {
            this.__default = value;
            return this as SkapRequired<this>;
        }
    }
    class SkapBoolean<T extends string> {
        name: T;
        __description: string;
        __required: boolean;
        constructor(name: T, description: string = "", required: boolean = false) {
            this.name = name;
            this.__description = description;
            this.__required = required;
        }
        description(description: string): this {
            this.__description = description;
            return this;
        }
    }
    class SkapPositional<T extends number> {
        name: T;
        __description: string;
        __required: boolean;
        constructor(index: T, description: string = "", required: boolean = false) {
            this.name = index;
            this.__description = description;
            this.__required = required;
        }

        required(): SkapRequired<this> {
            this.__required = true;
            return this as SkapRequired<this>;
        }
        optional(): SkapOptional<this> {
            this.__required = false;
            return this as SkapOptional<this>;
        }
        description(description: string): this {
            this.__description = description;
            return this;
        }
    }
    class SkapRest {
        __description: string;
        __required: boolean;
        constructor(description: string = "", required: boolean = false) {
            this.__description = description;
            this.__required = required;
        }

        description(description: string): this {
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
            let rest = 0;
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
                if (shape[argName] instanceof SkapRest) {
                    if (subcs) {
                        throw new Error("SkAp: Cannot have subcommands and rest arguments due to confusion")
                    }
                    rest++;
                    if (rest > 1) {
                        throw new Error("SkAp: Only one rest argument is allowed")
                    }
                }
            }
        }

        private emptyBase(): Partial<SkapInfer<this>> {
            // deno-lint-ignore no-explicit-any
            const out: any = {};
            for (const argName in this.shape) {
                if (this.shape[argName] instanceof SkapString) {
                    out[argName] = this.shape[argName].__default;
                } else if (this.shape[argName] instanceof SkapNumber) {
                    out[argName] = this.shape[argName].__default;
                } else if (this.shape[argName] instanceof SkapSubcommand) {
                    // deno-lint-ignore no-explicit-any
                    const commands: any = {};
                    for (const subcommandName in this.shape[argName].shape) {
                        commands[subcommandName] = this.shape[argName].shape[subcommandName].emptyBase();
                    }
                    out[argName] = {selected: undefined, commands: commands};
                } else if (this.shape[argName] instanceof SkapBoolean) {
                    out[argName] = false;
                } else if (this.shape[argName] instanceof SkapPositional) {
                    out[argName] = undefined;
                } else if (this.shape[argName] instanceof SkapRest) {
                    out[argName] = [];
                }
            }
            return out;
        }
        private parseBase(args: string[], settings: ParseSettings): [SkapInfer<this>, string[]] {
            // deno-lint-ignore no-explicit-any
            const out: any = this.emptyBase();

            const positional = Object.entries(this.shape).filter(([a, b]) => b instanceof SkapPositional).toSorted(([_n, a], [_, b]) => (a as SkapPositional<number>).name - (b as SkapPositional<number>).name);
            const rest = Object.entries(this.shape).find(([b, a]) => a instanceof SkapRest);

            while (args.length) {
                const arg = args.shift();
                let did = false;
                for (const argName in this.shape) {
                    const argShape = this.shape[argName];
                    if (argShape instanceof SkapString) {
                        if (arg == argShape.name) {
                            out[argName] = args.shift();
                            did = true;
                        }
                    } else if (argShape instanceof SkapNumber) {
                        if (arg == argShape.name) {
                            try {
                                out[argName] = Number(args.shift());
                                did = true;
                            } catch (e) {
                                settings.customError!(`Invalid number argument ${argShape.name}`);
                            }
                        }
                    } else if (argShape instanceof SkapSubcommand) {
                        for (const subcommandName in argShape.shape) {
                            if (arg == subcommandName) {
                                const [subcommandOut, subcommandRest] = argShape.shape[subcommandName].parseBase(args, settings);
                                // deno-lint-ignore no-explicit-any
                                const o: any = {};
                                o[subcommandName] = subcommandOut;
                                out[argName] = {selected: subcommandName, commands: o};
                                args = subcommandRest;
                                break;
                            }
                        }
                        did = true;
                    } else if (argShape instanceof SkapBoolean) {
                        if (arg == argShape.name) {
                            out[argName] = true;
                            did = true;
                        }
                    }
                }
                if (!did) {
                    // check for positionals
                    if (positional.length) {
                        const [argName, _argShape] = positional.shift()!;
                        out[argName] = arg;
                    } else if (rest !== undefined) {
                        out[rest[0]].push(arg);
                    }
                    else {
                        settings.customError(`Too many arguments\n${this.usage()}`)
                    }
                }
            }
            

            for (const argName in this.shape) {
                const argShape = this.shape[argName];
                if (argShape instanceof SkapString) {
                    if (out[argName] === undefined && argShape.__required) {
                        settings.customError!(`Missing required string argument ${argShape.name}\n${this.usage()}`);
                    }
                } else if (argShape instanceof SkapNumber) {
                    if (out[argName] === undefined && argShape.__required) {
                        settings.customError!(`Missing required number argument ${argShape.name}\n${this.usage()}`);
                    }
                } else if (argShape instanceof SkapSubcommand) {
                    if (out[argName].selected === undefined && argShape.__required) {
                        settings.customError!(`Missing required subcommand for ${argName}\n${this.usage()}`);
                    }
                } else if (argShape instanceof SkapBoolean) {
                    // pass
                } else if (argShape instanceof SkapPositional) {
                    if (out[argName] === undefined && argShape.__required) {
                        settings.customError!(`Missing required positional argument for ${argName}\n${this.usage()}`);
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
                } else if (argShape instanceof SkapPositional) {
                    out += `${Ansi.reset}${Ansi.italic} <${argName}>`
                } else if (argShape instanceof SkapRest) {
                    out += `${Ansi.reset}${Ansi.underline} <...${argName}>`
                }
            }
            out += `${Ansi.reset}\n`;
            return out;
        }
        usage(previous: string = "program"): string {
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
                    } else if (this.shape[arg] instanceof SkapBoolean) {
                        out += `  ${Ansi.bold}${this.shape[arg].name}${Ansi.reset}`;
                    } else if (this.shape[arg] instanceof SkapPositional) {
                        out += `  ${Ansi.bold}<${arg}>${Ansi.reset}`
                    } else if (this.shape[arg] instanceof SkapRest) {
                        out += `  ${Ansi.bold}<...${arg}>${Ansi.reset}`;
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

        description(description: string): this {
            this.__description = description;
            return this;
        }
    }
}