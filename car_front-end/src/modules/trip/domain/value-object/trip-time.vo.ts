export interface TripTimeValidationResult {
  isValid: boolean;
  departureError?: string;
  arrivalError?: string;
  durationMinutes?: number;
}

export class TripTimeVO {
  public static validate(
    departureTime: string,
    arrivalTime: string
  ): TripTimeValidationResult {
    if (!departureTime) {
      return {
        isValid: false,
        departureError: "Thời gian xuất bến không được để trống.",
      };
    }

    if (!arrivalTime) {
      return {
        isValid: false,
        arrivalError: "Thời gian đến dự kiến không được để trống.",
      };
    }

    const departureDate = new Date(departureTime);
    const arrivalDate = new Date(arrivalTime);

    if (isNaN(departureDate.getTime())) {
      return {
        isValid: false,
        departureError: "Thời gian xuất bến không hợp lệ.",
      };
    }

    if (isNaN(arrivalDate.getTime())) {
      return {
        isValid: false,
        arrivalError: "Thời gian đến dự kiến không hợp lệ.",
      };
    }

    const now = new Date();
    if (departureDate.getTime() <= now.getTime()) {
      return {
        isValid: false,
        departureError: "Thời gian xuất bến phải là thời điểm trong tương lai.",
      };
    }

    if (arrivalDate.getTime() <= departureDate.getTime()) {
      return {
        isValid: false,
        arrivalError: "Thời gian đến dự kiến phải sau thời gian xuất bến.",
      };
    }

    const durationMs = arrivalDate.getTime() - departureDate.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    if (durationMinutes < 15) {
      return {
        isValid: false,
        arrivalError:
          "Thời gian di chuyển dự kiến tối thiểu phải từ 15 phút trở lên.",
        durationMinutes,
      };
    }

    return {
      isValid: true,
      durationMinutes,
    };
  }

  public static formatDuration(
    departureTime: string,
    arrivalTime: string
  ): string {
    const departureDate = new Date(departureTime);
    const arrivalDate = new Date(arrivalTime);

    if (isNaN(departureDate.getTime()) || isNaN(arrivalDate.getTime())) {
      return "N/A";
    }

    const durationMs = arrivalDate.getTime() - departureDate.getTime();
    if (durationMs <= 0) return "0 phút";

    const totalMinutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} phút`;
    }

    if (minutes === 0) {
      return `${hours} giờ`;
    }

    return `${hours} giờ ${minutes} phút`;
  }

  public static formatDateTime(isoString: string): string {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;

      const time = date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const day = date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      return `${time}, ${day}`;
    } catch {
      return isoString;
    }
  }

  public static formatTime(isoString: string): string {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;

      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  }

  public static formatDate(isoString: string): string {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;

      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  }
}
