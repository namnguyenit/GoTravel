const crypto=require('node:crypto');
const namespace='gotravel-real-expansion-2026-10-05-v2';
function id(key){const h=crypto.createHash('sha256').update(namespace+':'+key).digest('hex').slice(0,32).split('');h[12]='5';h[16]='8';const v=h.join('');return [v.slice(0,8),v.slice(8,12),v.slice(12,16),v.slice(16,20),v.slice(20)].join('-');}
module.exports={id,namespace};
