// (S)il(k) (Ar)ray Tools

export function arrzip<T, U>(a: T[], n: U[]): [T, U][] {
    const max = Math.max(a.length, n.length);
    const out: [T, U][] = [];
    for (let i = 0; i < max; i++) {
        out.push([a?.[i], n?.[i]])
    }
    return out
}

export function arreq<T, U>(a: T[], b: U[], eq: (a: T, b: U) => boolean) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (!eq(a[i], b[i])) return false;
    }
    return true;
}