import { platformUrls } from "@/shared/platform-domains";

export async function openPaymentPortal(orderId: string) {
  const portalBase = platformUrls(window.location.hostname).payment;
  const response = await fetch(new URL("/launch", portalBase), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || typeof result?.url !== "string") {
    throw new Error(result?.message || "Không mở được trang thanh toán. Vui lòng thử lại.");
  }
  const destination = new URL(result.url, portalBase);
  if (destination.origin !== new URL(portalBase).origin || destination.pathname !== "/pay") {
    throw new Error("Địa chỉ thanh toán không hợp lệ.");
  }
  window.location.assign(destination.href);
}
