export class Result {
    constructor(is_ok, value) {
        this._is_ok = is_ok;
        this.value = value;
    }

    is_ok() {
        return this._is_ok;
    }
    is_err() {
        return !this._is_ok;
    }
    unwrap() {
        if (this._is_ok) {
            return this.value;
        } else {
            throw new Error(this.value);
        }
    }
    unwrap_err() {
        if (!this._is_ok) {
            return this.value;
        } else {
            throw new Error("Result is ok, cannot unwrap error");
        }
    }
}

export const ok = (value) => new Result(true, value)
export const err = (value) => new Result(false, value)