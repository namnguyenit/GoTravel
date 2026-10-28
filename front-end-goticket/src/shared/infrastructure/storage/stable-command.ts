// Persist one request identity across network failures and page reloads.
// A different payload must never reuse an unresolved command's identity.
export function stableCommand(scope: string, payload: unknown): string {
  const key = `goticket:command:${scope}`;
  const fingerprint = JSON.stringify(payload);
  const stored = sessionStorage.getItem(key);
  if (stored) {
    const command = JSON.parse(stored) as { id: string; fingerprint: string };
    if (command.fingerprint !== fingerprint) {
      throw new Error('Yêu cầu trước chưa xác định được kết quả. Vui lòng thử lại với đúng thông tin đã gửi hoặc kiểm tra danh sách đơn trước khi đặt khác.');
    }
    return command.id;
  }
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, JSON.stringify({ id, fingerprint }));
  return id;
}

export function clearStableCommand(scope: string): void {
  sessionStorage.removeItem(`goticket:command:${scope}`);
}

export function completeStableCommand(scope: string, commandId: string): void {
  const stored = sessionStorage.getItem(`goticket:command:${scope}`);
  if (stored && JSON.parse(stored).id === commandId) clearStableCommand(scope);
}
