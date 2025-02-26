// (S)il(k) (V)e(c)tor

export class Vector<T> extends Array<T> {
    windows(length: number): Vector<Vector<T>> {
        const out = new Vector<Vector<T>>();
        for (let i = 0; i <= this.length - length; i++) {
            const v = new Vector<T>();
            for (let j = 0; j < length; j++) v.push(this[i + j]);
            out.push(v);
        }
        return out;
    }
}