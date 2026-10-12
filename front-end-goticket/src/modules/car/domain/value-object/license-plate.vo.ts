export class LicensePlateVO {
  // Regex hỗ trợ định dạng biển số xe Việt Nam (VD: 51B-123.45, 29B-12345, 43B-012.34)
  public static readonly REGEX = /^[0-9]{2}[A-Z]{1,2}-[0-9]{3,5}(\.[0-9]{2})?$/;

  public static isValid(plate: string): boolean {
    if (!plate || typeof plate !== "string") return false;
    const trimmed = plate.trim().toUpperCase();
    return this.REGEX.test(trimmed);
  }

  public static normalize(plate: string): string {
    if (!plate) return "";
    return plate.trim().toUpperCase();
  }

  public static getValidationError(plate: string): string | null {
    if (!plate || !plate.trim()) {
      return "Vui lòng nhập biển số xe.";
    }
    const normalized = this.normalize(plate);
    if (!this.isValid(normalized)) {
      return `Biển số xe "${plate}" không đúng định dạng biển số xe Việt Nam (VD: 51B-123.45, 29B-98765, 43B-012.34).`;
    }
    return null;
  }
}
