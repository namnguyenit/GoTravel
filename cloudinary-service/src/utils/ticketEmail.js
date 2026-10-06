import QRCode from "qrcode";
import { renderTicketEmail } from "./emailTemplates.js";

// Embed a locally encoded image so opening an email does not disclose order codes
// to a third party QR service. Use the same displayed order code as the website.
export const buildTicketEmail = async (payload) => {
    const code = String(payload.orderNumber || "").trim() || String(payload.orderId || "").trim();
    if (!code || code.length > 256) throw new Error("INVALID_ORDER_CODE");
    const png = await QRCode.toBuffer(code, {
        type: "png", width: 256, margin: 4, errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#FFFFFF" },
    });
    return {
        ...renderTicketEmail({ ...payload, orderNumber: code, qrImageUrl: "cid:gotravel-order-qr" }),
        attachments: [{
            filename: "ma-don-hang.png", content: png, contentType: "image/png",
            cid: "gotravel-order-qr", contentDisposition: "inline",
        }],
    };
};
