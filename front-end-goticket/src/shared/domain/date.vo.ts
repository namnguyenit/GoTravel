/**
 * Tiện ích xử lý Ngày/Giờ theo múi giờ Việt Nam (+07:00 - Asia/Ho_Chi_Minh)
 * Xử lý chính xác cả chuỗi UTC (ISO 8601 có 'Z') và Spring LocalDateTime không có offset.
 */

export class DateVo {
  private readonly date: Date;

  constructor(input: string | number | Date | null | undefined) {
    if (!input) {
      this.date = new Date();
      return;
    }

    if (input instanceof Date) {
      this.date = input;
    } else if (typeof input === 'number') {
      this.date = new Date(input);
    } else {
      const str = input.trim();
      // Nếu là chuỗi ISO chuẩn có Z hoặc offset +07:00
      if (str.includes('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
        this.date = new Date(str);
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
        // Spring LocalDateTime không có timezone: chuẩn hóa thành múi giờ Việt Nam (+07:00)
        this.date = new Date(`${str}+07:00`);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        // Chỉ có ngày
        this.date = new Date(`${str}T00:00:00+07:00`);
      } else {
        this.date = new Date(str);
      }
    }
  }

  public toDate(): Date {
    return this.date;
  }

  public getTime(): number {
    return this.date.getTime();
  }

  public isValid(): boolean {
    return !isNaN(this.date.getTime());
  }

  /**
   * Định dạng giờ:phút theo VN: e.g. "07:30"
   */
  public formatTime(): string {
    if (!this.isValid()) return '--:--';
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(this.date);
  }

  /**
   * Định dạng ngày: e.g. "Thứ Hai, 12/10/2026" hoặc "12/10/2026"
   */
  public formatDate(includeWeekday = false): string {
    if (!this.isValid()) return '--/--/----';
    if (includeWeekday) {
      return new Intl.DateTimeFormat('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(this.date);
    }
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(this.date);
  }

  /**
   * Định dạng ngày và giờ: e.g. "07:30 - 12/10/2026"
   */
  public formatDateTime(): string {
    if (!this.isValid()) return '--:-- --/--/----';
    return `${this.formatTime()} · ${this.formatDate()}`;
  }

  /**
   * Định dạng sang chuẩn ISO YYYY-MM-DD cho query params
   */
  public toDateString(): string {
    if (!this.isValid()) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(this.date);
    return parts; // Format YYYY-MM-DD
  }

  /**
   * Tính số giây còn lại từ hiện tại tới mốc thời gian này
   */
  public secondsUntil(): number {
    const diff = Math.floor((this.date.getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }

  /**
   * Định dạng đếm ngược e.g. "14:45"
   */
  public formatCountdown(): string {
    const secs = this.secondsUntil();
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  }

  public isPast(): boolean {
    return this.date.getTime() < Date.now();
  }

  public static from(input: string | number | Date | null | undefined): DateVo {
    return new DateVo(input);
  }

  public static parse(input: string | number | Date | null | undefined): DateVo {
    return new DateVo(input);
  }

  public static parseLocalDateTime(input: string | number | Date | null | undefined): Date {
    return new DateVo(input).toDate();
  }

  public static formatVietnamDateTime(input: string | number | Date | null | undefined): string {
    return new DateVo(input).formatDateTime();
  }

  public static formatVietnamDate(input: string | number | Date | null | undefined, includeWeekday = false): string {
    return new DateVo(input).formatDate(includeWeekday);
  }

  public static formatVietnamTime(input: string | number | Date | null | undefined): string {
    return new DateVo(input).formatTime();
  }

  public static now(): DateVo {
    return new DateVo(new Date());
  }

  public static today(): string {
    return DateVo.now().toDateString();
  }
}

export function formatVietnamTime(input: string | number | Date | null | undefined): string {
  return DateVo.from(input).formatTime();
}

export function formatVietnamDate(input: string | number | Date | null | undefined, includeWeekday = false): string {
  return DateVo.from(input).formatDate(includeWeekday);
}

export function formatVietnamDateTime(input: string | number | Date | null | undefined): string {
  return DateVo.from(input).formatDateTime();
}
