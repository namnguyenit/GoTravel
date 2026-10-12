/**
 * Value Object xử lý tiền tệ VND chính xác (Exact Integer VND).
 * Tránh lỗi làm tròn số thực (Floating point issues) bằng BigInt.
 */
export class MoneyVo {
  private readonly valueBigInt: bigint;

  constructor(value: string | number | bigint | null | undefined) {
    if (value === null || value === undefined || value === '') {
      this.valueBigInt = 0n;
    } else if (typeof value === 'bigint') {
      this.valueBigInt = value;
    } else if (typeof value === 'number') {
      this.valueBigInt = BigInt(Math.round(value));
    } else {
      // Chuỗi số - loại bỏ ký tự không phải số hoặc dấu âm
      const sanitized = value.trim().replace(/[^\d-]/g, '');
      if (!sanitized || sanitized === '-') {
        this.valueBigInt = 0n;
      } else {
        try {
          this.valueBigInt = BigInt(sanitized);
        } catch {
          this.valueBigInt = 0n;
        }
      }
    }
  }

  public toBigInt(): bigint {
    return this.valueBigInt;
  }

  public toNumber(): number {
    return Number(this.valueBigInt);
  }

  public toString(): string {
    return this.valueBigInt.toString();
  }

  public add(other: MoneyVo | string | number | bigint): MoneyVo {
    const o = other instanceof MoneyVo ? other : new MoneyVo(other);
    return new MoneyVo(this.valueBigInt + o.toBigInt());
  }

  public subtract(other: MoneyVo | string | number | bigint): MoneyVo {
    const o = other instanceof MoneyVo ? other : new MoneyVo(other);
    return new MoneyVo(this.valueBigInt - o.toBigInt());
  }

  public multiply(quantity: number): MoneyVo {
    return new MoneyVo(this.valueBigInt * BigInt(quantity));
  }

  public isZero(): boolean {
    return this.valueBigInt === 0n;
  }

  public isPositive(): boolean {
    return this.valueBigInt > 0n;
  }

  public isNegative(): boolean {
    return this.valueBigInt < 0n;
  }

  public greaterThan(other: MoneyVo): boolean {
    return this.valueBigInt > other.toBigInt();
  }

  public lessThan(other: MoneyVo): boolean {
    return this.valueBigInt < other.toBigInt();
  }

  public equals(other: MoneyVo): boolean {
    return this.valueBigInt === other.toBigInt();
  }

  /**
   * Định dạng tiền tệ tiếng Việt: e.g. "250.000 ₫"
   */
  public format(): string {
    const isNeg = this.valueBigInt < 0n;
    const absVal = isNeg ? -this.valueBigInt : this.valueBigInt;
    const str = absVal.toString();
    const formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${isNeg ? '-' : ''}${formatted} ₫`;
  }

  public static from(value: string | number | bigint | null | undefined): MoneyVo {
    return new MoneyVo(value);
  }

  public static zero(): MoneyVo {
    return new MoneyVo(0n);
  }
}

export function formatVnd(value: string | number | bigint | null | undefined): string {
  return MoneyVo.from(value).format();
}
