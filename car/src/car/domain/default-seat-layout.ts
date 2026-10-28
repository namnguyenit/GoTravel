/** Coordinates restart on each deck; codes stay unique across the vehicle. */
export function defaultSeatLayout(total: number, lower: number, seatClass = 'STANDARD', columns = 3) {
  return Array.from({ length: total }, (_, index) => {
    const level = index < lower ? 1 : 2;
    const position = level === 1 ? index : index - lower;
    return {
      code: `${level === 1 ? 'A' : 'B'}${String(position + 1).padStart(2, '0')}`,
      level, seatClass, row: Math.floor(position / columns), column: position % columns,
    };
  });
}
