// (S)il(k) (S)tring (A)lign

// deno-lint-ignore no-namespace
export namespace ssa {
    export function repeat(count: number, str: string): string {
        return new Array(count).fill(str).join("")
    }
    export function centerHorizontal(max: number, str: string): string {
        if (str.length > max) return str;
        const pad = max - str.length;
        const left = Math.floor(pad/2);
        const right = Math.ceil(pad/2);

        return repeat(left, " ") + str + repeat(right, " ")
    }
    function lineCount(str: string): number {
        return str.split("\n").length;
    }
    function maxWidth(str: string): number {
        return str.split("\n").map(a => a.length).reduce((a, b) => Math.max(a, b), 0);
    }
    export function centerVertical(max: number, str: string): string {
        const pad = max - lineCount(str);
        const top = Math.floor(pad/2);
        const bottom = Math.ceil(pad/2);
        const mw = maxWidth(str);

        return repeat(top, repeat(mw, " ") + "\n") + str.split("\n").map(a => centerHorizontal(mw, a)).join("\n") + repeat(bottom, repeat(mw, " ") + "\n")
    }

    // fn combine_lines(texts: Vec<String>) -> String {
    //     if texts.len() == 0 {
    //         return "".to_string();
    //     }
    //     let max_height = texts.iter().map(|line| line.lines().count()).max().unwrap();
    //     let mut out = vec!["".to_string(); max_height];
    //     for text in texts {
    //         let centered = center_vertically(&text, max_height);
    //         for (i, line) in centered.lines().enumerate() {
    //             out[i].push_str(line);
    //         }
    //     }
    //     out.join("\n")
    // }
    export function combineLines(texts: string[]): string {
        if (texts.length === 0) return "";
        const mh = texts.map(lineCount).reduce((a, b) => Math.max(a, b), 0);
        const out = new Array(mh).fill("");
        for (const t of texts) {
            const centered = centerVertical(mh, t);
            for (let i = 0; i < lineCount(centered); i++) {
                out[i] += centered.split("\n")[i];
            }
        }
        return out.join("\n")
    }
}