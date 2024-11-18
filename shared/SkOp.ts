
export class SkOption<T> {
  __v: TOption<T>;
  constructor(v: TOption<T>) {
    this.__v = v;
  }

  is_some(): this is { __v: Some<T> } {
    return this.__v.__op;
  }

  is_none(): this is { __v: None } {
    return !this.__v.__op;
  }

  unwrap(): T {
    return this.expect('Unwrap failed on Option<T>');
  }

  unwrap_or(v: T): T {
    return this.is_some() ? this.__v.val : v;
  }

  expect(msg: string): T {
    if (this.is_none()) {
      throw new Error(msg);
    } else {
      return this.__v.val!;
    }
  }

  run_if_some(cb: (v: T) => void): boolean {
    if (this.is_some()) {
      cb(this.unwrap());
      return true;
    } else {
      return false;
    }
  }
}

export type Some<T> = { __op: true; val: T };
export const makesome = <T>(val: T): Some<T> => ({ __op: true, val });
export const Some = <T>(val: T): SkOption<T> => new SkOption(makesome(val));
export type None = { __op: false; val: null };
export const makenone = <T>(): None => ({ __op: false, val: null });
export const None = <T>(): SkOption<T> => new SkOption<T>(makenone());
export type TOption<T> = Some<T> | None;