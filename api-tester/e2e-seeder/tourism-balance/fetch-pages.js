const dns = require('node:dns/promises');
const {fs,path,dir,save,hash}=require('./common');
const {publicIp}=require('../real-expansion/fetch-pages');
async function fetchPage(item){
 const file=path.join(dir,'.cache/pages',item.key+'.json');if(fs.existsSync(file))return {key:item.key,status:'cached'};
 const allowed=new Set(item.allowedHosts||[new URL(item.url).hostname]);let target=item.url;
 for(let n=0;n<4;n++){
  const u=new URL(target);if(u.protocol!=='https:'||u.port||u.username||u.password||!allowed.has(u.hostname))throw Error('Unapproved URL or redirect');
  const ips=await dns.lookup(u.hostname,{all:true});if(ips.some(x=>!publicIp(x.address)))throw Error('Non-public source IP');
  const r=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(25000),headers:{'user-agent':'GoTravel-CatalogResearch/1.0 (https://github.com/namnguyenit/GoTravel)'}});
  if([301,302,303,307,308].includes(r.status)){target=new URL(r.headers.get('location'),u).href;await r.body?.cancel();continue;}
  if(!r.ok||!/text\/html/.test(r.headers.get('content-type')||''))throw Error('Publisher HTTP '+r.status);
  const chunks=[];let length=0;for await(const chunk of r.body){length+=chunk.length;if(length>8e6)throw Error('Page size exceeds 8 MB');chunks.push(chunk);}
  const html=Buffer.concat(chunks).toString('utf8');if(/Bạn đã bị lạc trong đám mây|Access Denied/.test(html))throw Error('Publisher error page');
  save(file,{rawHtml:html,researchCheckedAt:new Date().toISOString(),retrievalKind:'direct_publisher_fetch_after_firecrawl_discovery',metadata:{url:target,sourceURL:item.url,statusCode:r.status,sha256:hash(html)}});return {key:item.key,status:'fetched'};
 }throw Error('Too many redirects');
}
async function main(){const items=JSON.parse(fs.readFileSync(path.join(dir,'page-index.json')));const results=[];let next=0;await Promise.all(Array.from({length:3},async()=>{while(next<items.length){const item=items[next++];try{results.push(await fetchPage(item));}catch(e){results.push({key:item.key,url:item.url,status:'failed',error:e.message});}if(next%10===0)console.log('Fetched '+next+'/'+items.length);}}));save(path.join(dir,'page-fetch-receipt.json'),results);console.log(JSON.stringify({pages:items.length,failed:results.filter(x=>x.status==='failed')}));}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={fetchPage};
