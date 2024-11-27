// (S)il(k) (An)si

export const Ansi = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    italic: "\x1b[3m",
    underline: "\x1b[4m",
    inverse: "\x1b[7m",
    hidden: "\x1b[8m",
    strikethrough: "\x1b[9m",
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    grey: "\x1b[90m",
    blackBright: "\x1b[90m",
    redBright: "\x1b[91m",
    greenBright: "\x1b[92m",
    yellowBright: "\x1b[93m",
    blueBright: "\x1b[94m",
    magentaBright: "\x1b[95m",
    cyanBright: "\x1b[96m",
    whiteBright: "\x1b[97m",
    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m",
    bgGray: "\x1b[100m",
    bgGrey: "\x1b[100m",
    bgBlackBright: "\x1b[100m",
    bgRedBright: "\x1b[101m",
    bgGreenBright: "\x1b[102m",
    bgYellowBright: "\x1b[103m",
    bgBlueBright: "\x1b[104m",
    bgMagentaBright: "\x1b[105m",
    bgCyanBright: "\x1b[106m",
    bgWhiteBright: "\x1b[107m",

    // 24-bit
    rgb: (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`,
    bgRgb: (r: number, g: number, b: number) => `\x1b[48;2;${r};${g};${b}m`,
    
    rgbHex: (_hex: string) => "",
    bgRgbHex: (_hex: string) => "",

    cursor: {
        // Move the cursor up by n lines
        moveUp: (n: number) => `\x1b[${n}A`,
    
        // Move the cursor down by n lines
        moveDown: (n: number) => `\x1b[${n}B`,
    
        // Move the cursor forward by n columns
        moveForward: (n: number) => `\x1b[${n}C`,
    
        // Move the cursor backward by n columns
        moveBackward: (n: number) => `\x1b[${n}D`,
    
        // Move the cursor to a specific position (row, column)
        moveTo: (row: number, col: number) => `\x1b[${row};${col}H`,
    
        // Save the current cursor position
        savePosition: () => `\x1b[s`,
    
        // Restore the saved cursor position
        restorePosition: () => `\x1b[u`,
    
        // Clear the screen and move the cursor to the top-left
        clearScreen: () => `\x1b[2J`,
    
        // Clear the current line from the cursor to the end
        clearLineToEnd: () => `\x1b[0K`,
    
        // Clear the current line from the cursor to the beginning
        clearLineToStart: () => `\x1b[1K`,
    
        // Clear the entire current line
        clearLine: () => `\x1b[2K`,
    }
}

Ansi.rgbHex = (hex: string) => Ansi.rgb(...hexToRgb(hex));
Ansi.bgRgbHex = (hex: string) => Ansi.bgRgb(...hexToRgb(hex));

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
    return <const>[
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ]
}