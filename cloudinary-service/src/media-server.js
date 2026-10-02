import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mediaRoutes from "./routes/media.routes.js";
import emailRoutes from "./routes/email.routes.js";
import { ERROR_CODES } from "./constants/error_code.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());



app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/communications/email', emailRoutes);
app.use((err, req, res, next) => {
    const code = err.code || err.message;
    const def = ERROR_CODES[code] || ERROR_CODES.INTERNAL_ERROR;

    console.error('[Media Error]', err.stack);
    return res.status(def.status).json({
        success: false,
        status: def.status,
        message: def.message || err.message,
        code: def.errorCode || code || "INTERNAL_ERROR",
        errorCode: def.errorCode,
        data: null
    });
});

const PORT = process.env.MEDIA_PORT || 5001;
const HOST = process.env.MEDIA_BIND_HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
    console.log(`🖼️ Media Service chạy tại: http://${HOST}:${PORT}`);
});
