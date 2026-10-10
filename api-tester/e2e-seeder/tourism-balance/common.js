const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { load } = createRequire(path.resolve(__dirname, '../real-catalog/package.json'))('cheerio');
const { save } = require('../real-catalog/research');
const dir = __dirname;
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
// A separate UUID namespace keeps previous committed seed batches immutable.
function id(key) { const b = Buffer.from(hash('gotravel-tourism-balance-2026-10-09:' + key).slice(0,32), 'hex'); b[6]=(b[6]&15)|80; b[8]=(b[8]&63)|128; const s=b.toString('hex'); return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`; }
function page(key) { const data=JSON.parse(fs.readFileSync(path.join(dir,'.cache/pages',key+'.json'))); return { data, $:load(data.rawHtml || data.html), url:data.metadata?.url || data.metadata?.sourceURL, checkedAt:data.researchCheckedAt || data.metadata?.cachedAt || new Date().toISOString() }; }
function image(raw, base) {
 try { let u = new URL(raw,base); if(u.pathname==='/_next/image' && u.searchParams.has('url'))u=new URL(u.searchParams.get('url'),u.origin);
 if(u.protocol!=='https:' || u.username || u.password || u.port || !/\.(jpe?g|png|webp)(\?|$)/i.test(u.href) || /logo|icon|flag|badge|placeholder|paralax|_48color|ic-slide|og-image|production_style|map-pin/i.test(u.href))return null;
 return u.href; } catch { return null; }
}
function images(d, box) { const out=[]; for(const e of box.find('img').addBack('img').toArray()) { const q=d.$(e); const raw=q.attr('data-lazy-src')||q.attr('data-src')||q.attr('src'); const u=image(raw,d.url);if(u)out.push(u); } for(const e of box.find('[style]').addBack('[style]').toArray()){const raw=(d.$(e).attr('style')||'').match(/url\(["']?([^"')]+)/)?.[1];const u=raw&&image(raw,d.url);if(u)out.push(u);}return [...new Set(out)]; }
module.exports={fs,path,dir,save,hash,fold,clean,id,page,image,images};
