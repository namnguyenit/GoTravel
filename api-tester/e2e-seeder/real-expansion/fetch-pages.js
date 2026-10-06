const fs=require('node:fs'),path=require('node:path'),dns=require('node:dns/promises'),net=require('node:net');
const {dir,cache,save}=require('./helpers');
function publicIp(a){if(net.isIP(a)===4){const p=a.split('.').map(Number);return !(p[0]===0||p[0]===10||p[0]===127||p[0]>=224||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127));}return !/^(::1$|::$|f[cd]|fe[89ab]|::ffff:)/i.test(a);}
async function fetchPage(item){const file=path.join(cache,item.key+'.json');if(fs.existsSync(file))return {key:item.key,status:'cached'};
 const allowed=new Set(item.allowedHosts||[new URL(item.url).hostname]);let target=item.url;const signal=AbortSignal.timeout(25000);
 for(let i=0;i<5;i++){const u=new URL(target);if(u.protocol!=='https:'||!allowed.has(u.hostname)||u.username||u.password||u.port)throw Error('Unapproved page URL/redirect');const ips=await dns.lookup(u.hostname,{all:true});if(!ips.length||ips.some(x=>!publicIp(x.address)))throw Error('Non-public source address');
 const r=await fetch(target,{redirect:'manual',signal,headers:{'user-agent':'GoTravel-CatalogResearch/1.0 (https://github.com/namnguyenit/GoTravel)',accept:'text/html'}});
 if([301,302,303,307,308].includes(r.status)){target=new URL(r.headers.get('location'),target).href;await r.body?.cancel();continue;}
 if(!r.ok)throw Error('HTTP '+r.status);if(!/text\/html/i.test(r.headers.get('content-type')||''))throw Error('Not HTML');
 let size=0;const chunks=[];for await(const x of r.body){size+=x.length;if(size>8e6)throw Error('Page exceeds 8MB');chunks.push(x);}
 const rawHtml=Buffer.concat(chunks).toString('utf8');if(rawHtml.length<600||/^[\s\S]{0,500}(?:Internal Server Error|Access Denied)/i.test(rawHtml))throw Error('Error/challenge page');
 save(file,{rawHtml,researchCheckedAt:new Date().toISOString(),retrievalKind:'direct_public_publisher_fetch',metadata:{sourceURL:item.url,url:target,statusCode:200}});return {key:item.key,status:'fetched',bytes:size};
 }throw Error('Redirect limit');
}
async function main(){fs.mkdirSync(cache,{recursive:true});const index=process.argv[2]||'page-index.json';if(!/^page-index(?:-\d+)?\.json$/.test(index))throw Error('Use a reviewed page index');const items=JSON.parse(fs.readFileSync(path.join(dir,index)));let next=0;const results=[];
 await Promise.all(Array.from({length:3},async()=>{while(next<items.length){const item=items[next++];try{const r=await fetchPage(item);results.push(r);console.log(JSON.stringify(r));}catch(e){const r={key:item.key,url:item.url,status:'failed',error:e.message};results.push(r);console.log(JSON.stringify(r));}await new Promise(r=>setTimeout(r,350));}}));
 save(path.join(dir,index.replace('page-index','page-fetch-receipt')),{completedAt:new Date().toISOString(),results});
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={fetchPage,publicIp};
