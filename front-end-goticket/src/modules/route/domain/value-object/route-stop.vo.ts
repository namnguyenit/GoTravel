export interface RouteStopInputItem {
  name: string;
  order: number;
}

export class RouteStopVO {
  public static validateStopName(name: string): string | null {
    if (!name || !name.trim()) {
      return "Tên điểm dừng không được để trống.";
    }
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
      return "Tên điểm dừng phải có độ dài từ 3 đến 100 ký tự.";
    }
    return null;
  }

  public static validateStopsList(stops: RouteStopInputItem[]): {
    isValid: boolean;
    error: string | null;
  } {
    if (!stops || !Array.isArray(stops) || stops.length < 2) {
      return {
        isValid: false,
        error:
          "Tuyến đường phải có tối thiểu 2 điểm dừng (1 điểm đón đầu tuyến và 1 điểm trả cuối tuyến).",
      };
    }

    const orderSet = new Set<number>();
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const nameError = this.validateStopName(stop.name);
      if (nameError) {
        return {
          isValid: false,
          error: `Điểm dừng #${i + 1}: ${nameError}`,
        };
      }

      if (typeof stop.order !== "number" || stop.order < 0) {
        return {
          isValid: false,
          error: `Thứ tự điểm dừng #${i + 1} phải là số nguyên không âm.`,
        };
      }

      if (orderSet.has(stop.order)) {
        return {
          isValid: false,
          error: `Thứ tự điểm dừng (order: ${stop.order}) bị trùng lặp.`,
        };
      }
      orderSet.add(stop.order);
    }

    return { isValid: true, error: null };
  }
}
