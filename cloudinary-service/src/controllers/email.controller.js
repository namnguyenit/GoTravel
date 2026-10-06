import { createTransporter, getDefaultSender, isSmtpConfigured, smtpConfig } from "../configs/smtp.config.js";
import { renderForgotPasswordEmail, renderRefundEmail } from "../utils/emailTemplates.js";
import { buildTicketEmail } from "../utils/ticketEmail.js";

const success = (res, message, data = null) => res.status(200).json({
    success: true,
    status: 200,
    code: "SUCCESS",
    message,
    data,
});

const badRequest = (res, message, code = "BAD_REQUEST") => res.status(400).json({
    success: false,
    status: 400,
    code,
    message,
    data: null,
});

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
        from: getDefaultSender(),
        to,
        subject,
        html,
        attachments,
    });

    return {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
    };
};

export const emailHealth = (req, res) => success(res, "Email service is running", {
    configured: isSmtpConfigured(),
    host: smtpConfig.host || null,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    fromEmail: smtpConfig.fromEmail || null,
});

export const sendForgotPasswordEmail = async (req, res, next) => {
    try {
        const { to, name, otp, resetUrl, expiresMinutes } = req.body || {};

        if (!to) {
            return badRequest(res, "Email người nhận là bắt buộc", "EMAIL_REQUIRED");
        }

        if (!otp && !resetUrl) {
            return badRequest(res, "Cần có OTP hoặc resetUrl để gửi email quên mật khẩu", "RESET_PAYLOAD_REQUIRED");
        }

        const template = renderForgotPasswordEmail({ name, otp, resetUrl, expiresMinutes });
        const result = await sendEmail({ to, ...template });

        return success(res, "Đã gửi email đặt lại mật khẩu", result);
    } catch (error) {
        return next(error);
    }
};

export const sendTicketEmail = async (req, res, next) => {
    try {
        const payload = req.body || {};

        if (!payload.to) {
            return badRequest(res, "Email người nhận là bắt buộc", "EMAIL_REQUIRED");
        }

        if (!payload.orderId && !payload.orderNumber) {
            return badRequest(res, "Thiếu mã đơn hàng để gửi vé điện tử", "ORDER_REQUIRED");
        }

        const template = await buildTicketEmail(payload);
        const result = await sendEmail({ to: payload.to, ...template });

        return success(res, "Đã gửi email vé điện tử", result);
    } catch (error) {
        return next(error);
    }
};

export const sendRefundEmail = async (req, res, next) => {
    try {
        const payload = req.body || {};

        if (!payload.to) {
            return badRequest(res, "Email người nhận là bắt buộc", "EMAIL_REQUIRED");
        }

        if (!payload.orderId && !payload.orderNumber) {
            return badRequest(res, "Thiếu mã đơn hàng để gửi email hoàn tiền", "ORDER_REQUIRED");
        }

        const template = renderRefundEmail(payload);
        const result = await sendEmail({ to: payload.to, ...template });

        return success(res, "Đã gửi email thông báo hoàn tiền", result);
    } catch (error) {
        return next(error);
    }
};
