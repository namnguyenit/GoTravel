/** Vietnam has no daylight-saving transitions. Database timestamps are UTC. */
export function vietnamDayBounds(day: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Ngày không hợp lệ');
  const midnightUtc = new Date(day + 'T00:00:00.000Z');
  if (
    Number.isNaN(midnightUtc.getTime()) ||
    midnightUtc.toISOString().slice(0, 10) !== day
  ) {
    throw new Error('Ngày không hợp lệ');
  }
  const start = new Date(midnightUtc.getTime() - 7 * 60 * 60_000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60_000 - 1) };
}

export function vietnamToday(): string {
  return new Date(Date.now() + 7 * 60 * 60_000).toISOString().slice(0, 10);
}
