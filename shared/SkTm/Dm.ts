// (S)il(k) (T)er(m)inal / DM

// #begin_import
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

if (import.meta.main) {
    const w = new ManualWindow(80, 20);

    let i = 0;
    let prevTime = performance.now();
    while (true) {
        const dt = performance.now() - prevTime;
        prevTime = performance.now();
        console.log(`\x1b[H${w.render()}\x1b[H`)
        const fps = (1000 / dt).toFixed(2) + "FPS";
        for (let k = 0; k < fps.length; k++) {
            const element = fps[k];
            w.placeChar(k, 0, new Cell(element, new Color(0, 0, 0), new Color(255, 255, 255), CellStyling.None));
        }

        
        i++;
    }
}