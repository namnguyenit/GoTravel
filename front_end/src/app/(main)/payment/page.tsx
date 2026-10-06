"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { openPaymentPortal } from "@/shared/payment-portal";

function PaymentContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const started = useRef(false);
  const [error, setError] = useState("");
  const launch = async () => {
    if (!orderId) { setError("Không tìm thấy mã đơn hàng."); return; }
    setError("");
    try { await openPaymentPortal(orderId); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Không mở được GoPay."); }
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void launch();
    // This route is a compatibility handoff for bookmarked order payment links.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="mx-auto max-w-md px-4 pb-12 pt-28 text-center">
    <h1 className="mb-4 text-2xl font-bold">Thanh toán qua GoPay</h1>
    {error ? <><p className="mb-4 text-red-600">{error}</p><button onClick={launch} className="rounded-xl bg-rose-500 px-6 py-3 font-semibold text-white">Thử lại</button></> : <p>Đang mở GoPay...</p>}
    <Link href="/" className="mt-6 block underline">Về GoTravel</Link>
  </div>;
}
export default function PaymentPage() {
  return <Suspense fallback={<p className="pt-28 text-center">Đang tải...</p>}><PaymentContent /></Suspense>;
}
