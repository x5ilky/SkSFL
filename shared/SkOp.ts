
export abstract class SkError {
  public get stack() : string | undefined {
    const err = new Error();
    return err.stack;
  };
  public abstract get name() : string;
  public abstract get description() : string;
}

export class SkResultError extends SkError {
  constructor(public msg: string){ 
    super()
  }
  public override get name(): string {
    return "SkResultError"
  }

  public override get description(): string {
    return "Tried to unwrap SkResult<T>\n" + this.msg
  }
}
export class SkResult<T, E extends SkError> {
  __v: TResult<T, E>;
  constructor(v: TResult<T, E>) {
    this.__v = v;
  }

  is_ok(): this is { __v: Ok<T> } {
    return this.__v.__op;
  }

  is_ok_and(pred: (v: T) => boolean): this is { __v: Ok<T> } {
    if (this.is_ok() && pred(this.unwrap())) return true;
    return false;
  }

  is_err(): this is { __v: Err<E> } {
    return !this.__v.__op;
  }

  is_err_and(pred: (v: E) => boolean): this is { __v: Err<E> } {
    if (this.is_err() && pred(this.unwrap_err())) return true;
    return false;
  }

  unwrap(): T {
    if (this.is_err()) {
      throw this.__v.val;
    }
    if (this.is_ok()) return this.__v.val;
    throw new SkResultError("");
  }

  unwrap_or(v: T): T {
    return this.is_ok() ? this.__v.val : v;
  }

  unwrap_err(): E {
    if (this.is_ok()) {
      throw new SkResultError("got ok value on unwrap_err");
    }
    if (this.is_err()) return this.__v.val;
    throw new SkResultError("Unreachable");
  }

  expect(msg: string): T {
    if (this.is_err()) {
      throw new SkResultError(msg);
    } else if (this.is_ok()) {
      return this.__v.val;
    }
    throw new Error("Unreachable");
  }

  run_if_some(cb: (v: T) => void): boolean {
    if (this.is_ok()) {
      cb(this.unwrap());
      return true;
    } else {
      return false;
    }
  }
}
export class SkOption<T> extends SkResult<T, SkResultError> {
  constructor(value: TOption<T>) {
    super(value);
  }

  is_some(): this is {__v: Ok<T>} {
    return this.is_ok()
  }
  is_some_and(pred: (v: T) => boolean): this is {__v: Ok<T>} {
    return this.is_ok_and(pred);
  }
  is_none(): this is {__v: Err<SkResultError>} {
    return this.is_err()
  }
}

export type Ok<T> = { __op: true; val: T };
const makeok = <T>(val: T): Ok<T> => ({ __op: true, val });
export const Ok = <T, E extends SkError>(val: T): SkResult<T, E> => new SkResult<T, E>(makeok(val));
export type Err<E extends SkError> = { __op: false; val: E };
const makeerr = <E extends SkError>(error: E): Err<E> => ({ __op: false, val: error });
export const Err = <T, E extends SkError>(error: E): SkResult<T, E> => new SkResult<T, E>(makeerr(error));

export type Some<T> = Ok<T>;
export type None = Err<SkResultError>;
export const Some = <T>(val: T) => new SkOption<T>({__op: true, val});
export const None = <T>() => new SkOption<T>({__op: false, val: new SkResultError("")});
type TOption<T> = Some<T> | None;
type TResult<T, E extends SkError> = Ok<T> | Err<E>;