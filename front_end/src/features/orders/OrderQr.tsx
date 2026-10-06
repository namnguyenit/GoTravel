"use client";

import { QRCodeSVG } from "qrcode.react";

export default function OrderQr({ code }: { code: string }) {
  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-2"
      data-order-qr
    >
      <QRCodeSVG
        value={code}
        size={180}
        level="M"
        marginSize={4}
        fgColor="#000000"
        bgColor="#FFFFFF"
        title={`Mã đơn hàng ${code}`}
        role="img"
      />
    </div>
  );
}
