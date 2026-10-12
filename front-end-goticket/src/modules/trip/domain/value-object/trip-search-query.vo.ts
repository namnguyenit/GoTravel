export interface TripSearchCriteria {
  origin: string;
  destination: string;
  departureDate: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  operatorId?: string;
  timeRange?: string; // 'EARLY_MORNING' | 'MORNING' | 'AFTERNOON' | 'EVENING'
  sortBy?: "departureTime" | "pricePerSeat";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface SearchValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class TripSearchQueryVO {
  public static validate(
    criteria: Partial<TripSearchCriteria>
  ): SearchValidationResult {
    const errors: Record<string, string> = {};

    // 1. Validate Origin
    if (!criteria.origin || criteria.origin.trim().length === 0) {
      errors.origin = "Vui lòng nhập hoặc chọn điểm xuất phát.";
    } else if (criteria.origin.trim().length < 2) {
      errors.origin = "Điểm xuất phát phải có ít nhất 2 ký tự.";
    }

    // 2. Validate Destination
    if (!criteria.destination || criteria.destination.trim().length === 0) {
      errors.destination = "Vui lòng nhập hoặc chọn điểm đến.";
    } else if (criteria.destination.trim().length < 2) {
      errors.destination = "Điểm đến phải có ít nhất 2 ký tự.";
    }

    // 3. Validate Origin !== Destination
    if (
      criteria.origin &&
      criteria.destination &&
      criteria.origin.trim().toLowerCase() ===
        criteria.destination.trim().toLowerCase()
    ) {
      errors.match = "Điểm xuất phát và điểm đến không được trùng nhau.";
    }

    // 4. Validate Departure Date
    if (!criteria.departureDate || criteria.departureDate.trim().length === 0) {
      errors.departureDate = "Vui lòng chọn ngày khởi hành.";
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(criteria.departureDate.trim())) {
        errors.departureDate = "Ngày khởi hành phải có định dạng YYYY-MM-DD.";
      } else {
        const todayStr = new Date(
          Date.now() - new Date().getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 10);
        if (criteria.departureDate < todayStr) {
          errors.departureDate = "Ngày khởi hành không được ở trong quá khứ.";
        }
      }
    }

    // 5. Validate Price Range if provided
    if (
      criteria.minPrice !== undefined &&
      criteria.maxPrice !== undefined &&
      criteria.minPrice > criteria.maxPrice
    ) {
      errors.price = "Giá tối thiểu không được lớn hơn giá tối đa.";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  public static getTodayDateString(): string {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  public static getTomorrowDateString(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }
}
