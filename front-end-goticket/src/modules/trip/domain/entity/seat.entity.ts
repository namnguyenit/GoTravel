export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';
export type SeatClass = 'STANDARD' | 'VIP' | 'LUXURY';
export type SeatType = 'SEAT' | 'SLEEPER' | 'LIMOUSINE';

export interface SeatProps {
  id: string;
  seatId: string;
  code: string;
  deck: number;
  row: number;
  column: number;
  seatClass: SeatClass | string;
  seatType: SeatType | string;
  priceVnd: string | number;
  status: SeatStatus;
}

export class SeatEntity {
  private readonly props: SeatProps;

  constructor(props: SeatProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id || this.props.seatId;
  }

  get seatId(): string {
    return this.props.seatId || this.props.id;
  }

  get code(): string {
    return this.props.code;
  }

  get deck(): number {
    return this.props.deck || 1;
  }

  get row(): number {
    return this.props.row;
  }

  get column(): number {
    return this.props.column;
  }

  get seatClass(): string {
    return this.props.seatClass || 'STANDARD';
  }

  get seatType(): string {
    return this.props.seatType || 'SLEEPER';
  }

  get priceVnd(): string {
    return String(this.props.priceVnd);
  }

  get status(): SeatStatus {
    return this.props.status;
  }

  public isAvailable(): boolean {
    return this.props.status === 'AVAILABLE';
  }

  public isHeld(): boolean {
    return this.props.status === 'HELD';
  }

  public isSold(): boolean {
    return this.props.status === 'SOLD';
  }

  public isBlocked(): boolean {
    return this.props.status === 'BLOCKED';
  }

  public getAccessibleLabel(isSelected: boolean): string {
    const statusText = isSelected
      ? 'Đang chọn'
      : this.isAvailable()
      ? 'Trống'
      : this.isHeld()
      ? 'Đang giữ chỗ'
      : this.isSold()
      ? 'Đã bán'
      : 'Đã khóa';
    const priceText = Number(this.props.priceVnd).toLocaleString('vi-VN') + ' đồng';
    return `Ghế ${this.props.code}, tầng ${this.deck}, ${statusText}, giá ${priceText}`;
  }

  static fromApiResponse(raw: any): SeatEntity {
    return new SeatEntity({
      id: raw.id || raw.seatId || '',
      seatId: raw.seatId || raw.id || '',
      code: raw.code || raw.seatCode || '',
      deck: Number(raw.level ?? raw.deck ?? 1),
      row: raw.row !== undefined && raw.row !== null && !isNaN(Number(raw.row)) ? Number(raw.row) : 0,
      column: raw.column !== undefined && raw.column !== null && !isNaN(Number(raw.column)) ? Number(raw.column) : 0,
      seatClass: raw.seatClass || 'STANDARD',
      seatType: raw.seatType || 'SLEEPER',
      priceVnd: raw.priceVnd ?? raw.price ?? 0,
      status: (raw.status as SeatStatus) || 'AVAILABLE',
    });
  }
}
