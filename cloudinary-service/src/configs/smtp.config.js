import "dotenv/config";
import nodemailer from "nodemailer";

const toBoolean = (value, fallback = false) => {
    if (value === undefined || value === null || value === "") return fallback;
    return String(value).trim().toLowerCase() === "true";
};

const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: toNumber(process.env.SMTP_PORT, 587),
    secure: toBoolean(process.env.SMTP_SECURE, String(process.env.SMTP_PORT) === "465"),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME || "GoTravel",
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
};

export const isSmtpConfigured = () =>
    Boolean(smtpConfig.host && smtpConfig.port && smtpConfig.fromEmail && smtpConfig.user && smtpConfig.pass);

export const createTransporter = () => {
    if (!isSmtpConfigured()) {
        throw new Error("SMTP_NOT_CONFIGURED");
    }

    return nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
        },
    });
};

export const getDefaultSender = () => `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`;
