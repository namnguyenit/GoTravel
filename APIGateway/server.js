import 'dotenv/config';

import app from './src/app.js'

const PORT = process.env.GATEWAY_PORT || 5555;
const HOST = process.env.GATEWAY_BIND_HOST || '127.0.0.1';

app.listen(PORT,HOST,()=>{
    console.log(`API gateway đang hoạt động tại ${HOST}:${PORT}`);
})
