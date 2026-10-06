const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const req=createRequire(path.resolve(__dirname,'../real-catalog/package.json'));
const {load}=req('cheerio');
const {save}=require('../real-catalog/research');
const dir=__dirname,cache=path.join(dir,'.cache','pages');
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function page(key){const v=JSON.parse(fs.readFileSync(path.join(cache,key+'.json')));return {v,$:load(v.rawHtml||v.html),url:v.metadata?.url||v.metadata?.sourceURL,checkedAt:v.researchCheckedAt||v.metadata?.cachedAt||new Date().toISOString()};}
function imgUrl(value,url){try{let s=new URL(value,url).href;if(!/^https:\/\//.test(s)||! /\.(jpe?g|png|webp)(\?|$)/i.test(s)||/logo|icon|flag|badge|placeholder|transparent|\.(svg|gif)/i.test(s))return null;return s;}catch{return null;}}
function images(d,box){const {$,url}=d;const out=[];
for(const e of box.find('img').addBack('img').toArray()){const q=$(e);if(/logo|icon|flag/i.test(q.attr('alt')||''))continue;const set=(q.attr('data-srcset')||q.attr('srcset')||'').split(',').map(x=>x.trim().split(/\s+/)).filter(x=>x[0]&&/^\d+w$/.test(x[1]||'')).sort((a,b)=>parseInt(b[1])-parseInt(a[1]));const raw=set[0]?.[0]||q.attr('data-lazy-src')||q.attr('data-src')||q.attr('data-original')||q.attr('src');const u=raw&&imgUrl(raw,url);if(u)out.push(u);}
for(const e of box.find('[style],[data-bg],[data-background-image],[data-background]').addBack('[style],[data-bg],[data-background-image],[data-background]').toArray()){const q=$(e);for(const raw of [(q.attr('style')||'').match(/url\(["']?([^"')]+)["']?\)/)?.[1],q.attr('data-bg'),q.attr('data-background-image'),q.attr('data-background')]){const u=raw&&imgUrl(raw,url);if(u)out.push(u);}}
const html=d.v.rawHtml||d.v.html||'';
for(const e of box.find('[id]').addBack('[id]').toArray()){const id=$(e).attr('id');if(!/^banner-\d+$/.test(id||''))continue;const re=new RegExp('#'+id+' \\.bg[^}]*background-image:\\s*url\\(["\']?([^"\')]+)','g');let m;while((m=re.exec(html))){const u=imgUrl(m[1],url);if(u)out.push(u);}}
return [...new Set(out)];}
function linkCards(d,pattern){const {$,url,checkedAt}=d,out=[];
for(const e of $('a[href]').toArray()){const a=$(e),href=a.attr('href');if(!pattern.test(href))continue;let target;try{target=new URL(href,url).href;}catch{continue;}if(new URL(target).hostname!==new URL(url).hostname)continue;
const peers=$('a[href]').filter((_,x)=>$(x).attr('href')===href);
const box=a.find('img').length?a:a.parent();
const pics=images(d,box);const name=clean(peers.map((_,x)=>$(x).text()).get().find(x=>x.trim()&&!/^(read more|see more|xem thêm|chi tiết|book now|đặt phòng)$/i.test(x.trim()))||box.find('img').first().attr('alt')||'');
if(!name||name.length>120||!pics.length||out.some(x=>x.sourcePage===target)||!/(?:room|phòng|deluxe|suite|superior|standard|family|bungalow|twin|double|triple|tripple|vip|king|queen)/i.test(name))continue;
out.push({name,sourcePage:target,sourceBindingPage:url,images:pics,areaSquareMeters:null,amenities:[],checkedAt,sourceVerification:'named_publisher_card_binds_photograph_to_item'});
}return out;}
function headingCards(d,selector,kind='STAY'){const {$,url,checkedAt}=d,out=[];for(const e of $(selector).toArray()){const h=$(e),name=clean(h.text());if(!name||name.length>100||out.some(x=>fold(x.name)===fold(name)))continue;const parents=h.parents().filter((_,p)=>$(p).find(selector).length===1&&images(d,$(p)).length);const box=parents.first();if(!box.length)continue;const text=clean(box.text());out.push({name,sourcePage:url,images:images(d,box),areaSquareMeters:Number(text.match(/([\d,.]+)\s*m[²2]/)?.[1]?.replace(',','.'))||null,amenities:[],checkedAt,sourceVerification:'named_publisher_heading_binds_photograph_to_item'});}return out;}
module.exports={dir,cache,fold,clean,sha,page,images,imgUrl,linkCards,headingCards,save};
