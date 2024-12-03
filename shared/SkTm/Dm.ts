// (S)il(k) (T)er(m)inal / DM

// #begin_import
import { None, Some, type SkOption } from "../SkOp.ts";
import { Ansi } from "./An.ts"
// #end_import

export enum CellStyling {
    None = 0,
    Bold = 1 << 0,
    Underline = 1 << 1,
    Strikethrough = 1 << 2,
    Italic = 1 << 3,
}
function CellStylingToAnsi (styling: CellStyling) {
    let out = "";
    if (styling & CellStyling.Bold) {
        out += Ansi.bold;
    }
    if (styling & CellStyling.Italic) {
        out += Ansi.italic;
    }
    if (styling & CellStyling.Underline) {
        out += Ansi.underline;
    }
    if (styling & CellStyling.Strikethrough) {
        out += Ansi.strikethrough;
    }
    return out;
}
export class Color {
    constructor(
        public r: number,
        public g: number,
        public b: number,
    ) {};

    asAnsiFG() {
        return Ansi.rgb(this.r, this.g, this.b);
    }
    asAnsiBG() {
        return Ansi.bgRgb(this.r, this.g, this.b);
    }
    equals(other: Color) {
        return this.r == other.r && this.g === other.g && this.b === other.b;
    }
}
export class Cell {
    constructor(
        public char: string,
        public fg: Color,
        public bg: Color,
        public styles: CellStyling,
    ) {

    }

    asString() {
        return `${this.fg.asAnsiFG()}${this.bg.asAnsiBG()}${CellStylingToAnsi(this.styles)}${this.char}${Ansi.reset}`;
    }
    sameStyle(other: Cell) {
        return this.bg === other.bg && this.fg === other.fg && this.styles === other.styles;
    }
}
export class Buffer {
    width: number;
    height: number;
    cells: Cell[][];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.cells = [];
        this.clearCells();
    }
    clearCells() {
        this.cells = [];
        for (let i = 0; i < this.height; i++) {
            const row = [];
            for (let j = 0; j < this.width; j++) {
                row.push(new Cell(" ", new Color(255, 255, 255), new Color(0, 0, 0), CellStyling.None))
            }
            this.cells.push(row);
        }
    }
    render() {
        let out = "";
        // dirty hack
        let previousCell: Cell = <Cell><unknown>undefined;
        for (const row of this.cells) {
            for (const cell of row) {
                if (previousCell === undefined || (previousCell !== undefined && !previousCell.sameStyle(cell))) {
                    if (previousCell === undefined) {
                        out += `${cell.fg.asAnsiFG()}${cell.bg.asAnsiBG()}${CellStylingToAnsi(cell.styles)}`;
                    } else {
                        if (!cell.fg.equals(previousCell.fg)) {
                            out += `${cell.fg.asAnsiFG()}`;
                        }
                        if (!cell.bg.equals(previousCell.bg)) {
                            out += `${cell.bg.asAnsiBG()}`;
                        }
                        if (cell.styles !== previousCell.styles) {
                            out += `${CellStylingToAnsi(cell.styles)}`;
                        }
                    }
                    previousCell = cell;
                    
                } 
                out += cell.char;
            }
            out += "\n";
        }
        out += Ansi.reset;
        return out;
    }
}
export abstract class Window {
    width: number;
    height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }


    abstract render(): string;
}
export class ManualWindow extends Window {
    buffer: Buffer;
    constructor(
        width: number,
        height: number
    ) {
        super(width, height);
        this.buffer = new Buffer(width, height);
    }

    override render(): string {
        return this.buffer.render();
    }

    placeChar(x: number, y: number, cell: Cell) {
        this.buffer.cells[y][x] = cell;
    }
}
class AnsiUtil {
    static async stdoutWrite(str: string) {
        await Deno.stdout.write(new TextEncoder().encode(str));
    }
    static setRaw() {
        Deno.stdin.setRaw(true);
    }

    static async getCursorPosition(): Promise<SkOption<[number, number]>> {
        const buffer = new Uint8Array(1024);
        await AnsiUtil.stdoutWrite("\x1b[6n");
        const n = await Deno.stdin.read(buffer);

        if (n === null)
            return None();
        else {
            const result = new TextDecoder().decode(buffer.subarray(0, n));
            const mid = result.slice(2, -1).split(";");
            return Some([parseInt(mid[0]), parseInt(mid[1])]);
        }
    }
}

export class InputManager {
    static __singleton: InputManager;
    listeners: ((s: string) => void)[];

    constructor() {
        this.listeners = [];
        this.queueItUp();
    }
    static getInstance() {
        if (InputManager?.__singleton !== undefined) {
            return InputManager.__singleton;
        } else return this.__singleton = new InputManager();
    }
    async queueItUp() {
        for await (const v of Deno.stdin.readable) {
            const s = new TextDecoder().decode(v);
            this.listeners.forEach(a => {
                a(s);
            });
        }
    }
}
const timeout = (ms: number) => new Promise<void>(res => setTimeout(() => res(), ms))

if (import.meta.main) {
    AnsiUtil.setRaw();
    const im = InputManager.getInstance();
    im.listeners.push(v => console.log(JSON.stringify(v)));
    im.listeners.push(v => {
        if (v === "q") Deno.exit(0);
    })
    while (true) {
        await timeout(1000);
        console.log("second");
    }
}