import 'dotenv/config';

import app from './src/app.js'

for (const name of ['INTERNAL_SERVICE_TOKEN', 'CSRF_SECRET']) {
    if (!process.env[name]) throw new Error(`${name} is required to start the Gateway`);
}
if (Buffer.byteLength(process.env.CSRF_SECRET) < 32) {
    throw new Error('CSRF_SECRET must contain at least 32 bytes');
}

const PORT = process.env.GATEWAY_PORT || 5555;
const HOST = process.env.GATEWAY_BIND_HOST || '0.0.0.0';

app.listen(PORT,HOST,()=>{
    console.log(`API gateway đang hoạt động tại ${HOST}:${PORT}`);
})
