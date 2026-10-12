import express from "express";
import { emailHealth, sendTransportEmail, sendForgotPasswordEmail, sendRefundEmail, sendTicketEmail } from "../controllers/email.controller.js";
import { verifyInternalToken } from "../middlewares/internal-token.middleware.js";

const router = express.Router();

router.get("/health", emailHealth);
router.use(verifyInternalToken);
router.post("/forgot-password", sendForgotPasswordEmail);
router.post("/transport", sendTransportEmail);
router.post("/ticket", sendTicketEmail);
router.post("/refund", sendRefundEmail);

export default router;
