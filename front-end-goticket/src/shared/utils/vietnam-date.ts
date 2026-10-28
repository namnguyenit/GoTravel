/** A schedule day is always a Vietnam calendar day, regardless of the browser's zone. */
export function vietnamDate(value: string | number | Date = Date.now()): string {
  const date = new Date(value);
  return new Date(date.getTime() + 7 * 60 * 60_000).toISOString().slice(0, 10);
}
