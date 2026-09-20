export class TripPriceVO {
  public static readonly MIN_PRICE = 10000;

  public static validate(price: number): { isValid: boolean; error?: string } {
    if (price === undefined || price === null || isNaN(price)) {
      return {
        isValid: false,
        error: "Giá vé không được để trống.",
      };
    }

    if (!Number.isInteger(price) || price < this.MIN_PRICE) {
      return {
        isValid: false,
        error: `Giá vé cơ bản tối thiểu là ${this.formatVND(this.MIN_PRICE)}.`,
      };
    }

    return { isValid: true };
  }

  public static formatVND(amount: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "0 đ";
    }

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    })
      .format(amount)
      .replace("₫", "đ");
  }
}
