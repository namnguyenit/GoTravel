import QRCode from "qrcode";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const amount = (value) => {
    const text = String(value ?? "0");
    if (!/^\d+(?:\.0+)?$/.test(text)) throw new Error("INVALID_VND_AMOUNT");
    return BigInt(text.split(".")[0]);
};
const money = (value) => `${amount(value).toLocaleString("vi-VN")} đ`;

export async function buildTransportEmail(payload) {
    if (!/^[0-9a-f-]{36}$/i.test(String(payload.eventId || "")) ||
        !["TICKET", "CANCELLED", "REFUNDED", "EXCHANGE", "AMENDMENT"].includes(payload.kind) ||
        !Array.isArray(payload.tickets) || payload.tickets.length > 10) throw new Error("INVALID_TRANSPORT_EMAIL");
    const titles = { AMENDMENT: "Thông tin vé đã được cập nhật", TICKET: "Vé xe của bạn", CANCELLED: "Vé xe đã hủy",
        REFUNDED: "Đã xác nhận hoàn tiền vé xe", EXCHANGE: "Yêu cầu đổi vé đã được ghi nhận" };
    let orderUrl;
    try { orderUrl = new URL(payload.orderUrl); } catch { throw new Error("INVALID_ORDER_URL"); }
    if (!["https:", "http:"].includes(orderUrl.protocol)) throw new Error("INVALID_ORDER_URL");
    const attachments = [];
    const rows = [];
    for (const [index, ticket] of payload.tickets.entries()) {
        let qr = "";
        if (payload.kind === "TICKET") {
            if (!ticket.checkInToken || ticket.checkInToken.length > 1024) throw new Error("INVALID_TICKET_TOKEN");
            const cid = `gocar-ticket-${index}`;
            attachments.push({ filename: `ve-${index + 1}.png`, contentType: "image/png", cid,
                contentDisposition: "inline", content: await QRCode.toBuffer(ticket.checkInToken,
                    { type: "png", width: 256, margin: 3, errorCorrectionLevel: "M" }) });
            qr = `<p><img src="cid:${cid}" width="180" height="180" alt="Mã lên xe của ${escape(ticket.passengerName)}"></p>`;
        }
        rows.push(`<section style="padding:16px 0;border-bottom:1px solid #ddd"><strong>${escape(ticket.routeTitle)}</strong>
            <p>${escape(ticket.passengerName)} · Ghế ${escape(ticket.seatCode)}</p>
            ${ticket.fareAmount != null ? `<p>Giá vé: ${escape(money(ticket.fareAmount))}</p>` : ""}
            <p>Khởi hành: ${escape(String(ticket.departureAt || "").replace("T", " "))} (giờ Việt Nam)</p>${qr}</section>`);
    }
    const status = payload.kind === "CANCELLED" ? (amount(payload.refundAmount) > 0n ? "Vé đã mất hiệu lực. Yêu cầu hoàn tiền đang được xử lý; thông báo này chưa xác nhận tiền đã về tài khoản." : "Vé đã mất hiệu lực. Không phát sinh khoản hoàn theo chính sách áp dụng.")
        : payload.kind === "REFUNDED" ? `Đã ghi nhận chứng từ hoàn ${escape(money(payload.refundAmount))}.`
        : payload.kind === "EXCHANGE" ? "Bạn có thể xem tiến độ đổi vé và hoàn tiền trong đơn hàng."
        : payload.kind === "AMENDMENT" ? "Thông tin hành khách hoặc điểm đón trả đã được cập nhật. Bạn có thể xem vé hiện tại trong đơn hàng."
        : "Đưa mã QR của từng hành khách cho nhân viên khi lên xe. Không chia sẻ mã vé với người khác.";
    return { subject: `${titles[payload.kind]} · ${String(payload.orderNumber || "").replace(/[\r\n]/g, "")}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937;line-height:1.6">
        <h2>GoCar</h2><h1 style="font-size:22px">${escape(titles[payload.kind])}</h1>
        <p>Chào ${escape(payload.customerName)},</p><p>${status}</p>
        <p>Mã đơn: <strong>${escape(payload.orderNumber)}</strong></p><p>Giá trị đơn ban đầu: ${escape(money(payload.totalAmount))}</p>
        ${payload.reason ? `<p>${escape(payload.reason)}</p>` : ""}${rows.join("")}
        <p><a href="${escape(orderUrl.toString())}">Xem đơn hàng</a></p></div>`, attachments,
        messageId: `<gocar-${payload.eventId}@notifications.gotravel.local>` };
}
