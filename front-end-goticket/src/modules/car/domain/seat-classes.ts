export type SeatClassOption = { code: string; label: string };
export const DEFAULT_SEAT_CLASSES: SeatClassOption[] = [
  { code: 'STANDARD', label: 'Tiêu chuẩn' },
  { code: 'VIP', label: 'VIP' },
  { code: 'LUXURY', label: 'Cao cấp' },
];
export const seatClassLabel = (code: string) => DEFAULT_SEAT_CLASSES.find(s => s.code === code)?.label ?? code;
