// One process owns cloudinary-images.json. Upload staging is independent of DB apply.
const fs = require('node:fs'), path = require('node:path');
const { createHash } = require('node:crypto'), { createRequire } = require('node:module');
const { save } = require('./research');
const { storePublicImage, configure, manifestPath } = require('../image-store');
const mediaRequire = createRequire(path.resolve(__dirname, '../../../cloudinary-service/package.json'));
const sharp = mediaRequire('sharp');
const dir = __dirname;
const stagePath = path.join(dir, 'verified-image-allocations.json');
const hash = x => createHash('sha256').update(x).digest('hex');
const approvedHosts=new Set(require('./approved-image-hosts.json'));
// Reuse an owned, verified copy of the exact Commons file, rather than asking
// Wikimedia to render another thumbnail of a photograph already migrated.
function commonsFile(source){const u=new URL(source);if(!['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname))return null;const xs=u.pathname.split('/');return decodeURIComponent(u.pathname.includes('/thumb/')?xs.at(-2):xs.at(-1));}
function ownedCommonsCopy(source){const file=commonsFile(source);if(!file)return null;const m=JSON.parse(fs.readFileSync(manifestPath));return Object.values(m.assets).find(e=>e.state==='verified'&&commonsFile(e.sourceUrl)===file&&e.secureUrl.startsWith('https://res.cloudinary.com/'+m.cloudName+'/image/upload/'));}
let commonsQueue=Promise.resolve();
async function fetchPublisher(u){const run=async()=>{for(let attempt=0;attempt<2;attempt++){const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(25000),headers:{'user-agent':'GoTravel-CatalogResearch/1.0 (https://gostay.nonnet123.io.vn/)'}});if(r.status!==429)return r;await r.body?.cancel();if(attempt===1)throw Error('Publisher image HTTP 429');const h=r.headers.get('retry-after');const ms=/^\d+$/.test(h||'')?Number(h)*1000:Date.parse(h)-Date.now();const delay=Number.isFinite(ms)&&ms>0?Math.min(ms,60000):15000;console.log('Publisher rate limit; retrying after '+Math.ceil(delay/1000)+' seconds');await new Promise(resolve=>setTimeout(resolve,delay));}};if(!commonsFile(u.href))return run();const task=commonsQueue.then(async()=>{await new Promise(resolve=>setTimeout(resolve,1500));return run();});commonsQueue=task.catch(()=>{});return task;}
function hamming(a,b) { let n=BigInt('0x'+a)^BigInt('0x'+b),k=0;while(n){n&=n-1n;k++;}return k; }
async function inspect(source) {
  const u = new URL(source);
  if (u.protocol!=='https:' || !approvedHosts.has(u.hostname) || u.username || u.password || u.port) throw Error('Source is not a verified publisher URL');
  const cache = path.join(dir,'.cache','photographs'); fs.mkdirSync(cache,{recursive:true}); const file=path.join(cache,hash(source));
  let bytes;
  let reusedEntry=ownedCommonsCopy(source);
  if(fs.existsSync(file)) bytes=fs.readFileSync(file);
  else if(reusedEntry){const r=await fetch(reusedEntry.secureUrl,{redirect:'error',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Owned Cloudinary delivery HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(hash(bytes)!==reusedEntry.optimizedSha256)throw Error('Owned Cloudinary checksum mismatch');}
  else {
    const r=await fetchPublisher(u);
    if(!r.ok || !r.headers.get('content-type')?.startsWith('image/'))throw Error('Publisher image HTTP '+r.status);
    const chunks=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>32*1024*1024)throw Error('Photograph exceeds 32 MiB');chunks.push(chunk);}bytes=Buffer.concat(chunks);fs.writeFileSync(file,bytes);
  }
  const decoder=sharp(bytes,{limitInputPixels:60e6,failOn:'warning'}), m=await decoder.metadata();
  if(!['jpeg','png','webp'].includes(m.format) || (m.pages||1)>1 || Math.min(m.width,m.height)<360)throw Error('Not a full-size static photograph');
  const p=await sharp(bytes).rotate().resize(9,8,{fit:'fill'}).greyscale().raw().toBuffer();let d=0n;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)d=(d<<1n)|(p[y*9+x]>p[y*9+x+1]?1n:0n);
  return {sha256:reusedEntry?reusedEntry.sourceSha256:hash(bytes),dhash:d.toString(16).padStart(16,'0'),width:m.width,height:m.height,cacheDirectory:cache,reusedEntry};
}
async function main(){
  const lockFile=path.join(dir,'.upload.lock');
  let lock;
  try{lock=fs.openSync(lockFile,'wx');fs.writeFileSync(lock,String(process.pid));}catch{throw Error('An image staging writer already owns .upload.lock; inspect its process before resuming');}
  try {
  configure();const input=JSON.parse(fs.readFileSync(path.join(dir,'official-establishments.json')));
  const stage=fs.existsSync(stagePath)?JSON.parse(fs.readFileSync(stagePath)):{schemaVersion:1,startedAt:new Date().toISOString(),allocations:{},rejected:[],failures:[],status:'in_progress'};
  const groups=[];
  for(const h of input.establishments){groups.push({id:h.sourceId,propertyId:h.sourceId,kind:'COMPLEX',name:h.name,sourcePage:h.sourceUrl,credit:h.sourcePublisher,images:h.images,target:2});for(const r of h.rooms)groups.push({id:h.sourceId+':room:'+hash(r.name).slice(0,16),propertyId:h.sourceId,kind:'STAY',name:h.name+' — '+r.name,sourcePage:r.sourcePage||h.sourceUrl,credit:h.sourcePublisher,images:r.images,target:3});for(const s of h.services)groups.push({id:h.sourceId+':service:'+hash(s.name).slice(0,16),propertyId:h.sourceId,kind:'SVC',name:s.name+' — '+h.name,sourcePage:s.sourcePage||h.sourceUrl,credit:h.sourcePublisher,images:s.images,target:3});for(const e of h.experiences||[])groups.push({id:h.sourceId+':experience:'+hash(e.name).slice(0,16),propertyId:h.sourceId,kind:'EXP',name:e.name,sourcePage:e.sourcePage,credit:h.sourcePublisher,images:e.images,target:3});}
  const attractionFile=path.join(dir,'real-attractions.json');if(fs.existsSync(attractionFile))for(const e of JSON.parse(fs.readFileSync(attractionFile)).attractions)groups.push({id:e.sourceId,propertyId:e.sourceId,kind:'EXP',name:e.name,sourcePage:e.sourceUrl,credit:e.photos[0]?.author,rights:e.photos[0]?.license,images:e.photos.map(x=>x.downloadUrl),target:3});
  // Bound upload work independently of an unexpected publisher gallery expansion.
  if(groups.length>850)throw Error('More than 850 item groups; inspect the source growth before upload');
  stage.status='in_progress';save(stagePath,stage);
  let uploaded=Object.values(stage.allocations).reduce((s,x)=>s+x.photos.length,0);
  const existing=Object.values(stage.allocations).flatMap(x=>x.photos.map(p=>({...p,owner:x.id})));
  let nextGroup=0;
  async function worker(){while(nextGroup<groups.length){const i=nextGroup++;
    const g=groups[i];const a=stage.allocations[g.id] ||= {...g,images:undefined,photos:[]};if(a.photos.length>=g.target)continue;
    for(const source of g.images){if(a.photos.length>=g.target)break;if(a.photos.some(p=>p.sourceUrl===source)||stage.rejected.some(x=>x.owner===g.id&&x.sourceUrl===source))continue;
      let meta,reservation;
      try{meta=await inspect(source);const dup=existing.find(p=>p.sha256===meta.sha256||hamming(p.dhash,meta.dhash)<=4);
        if(dup){stage.rejected.push({owner:g.id,sourceUrl:source,reason:'content_duplicate_or_near_duplicate',otherOwner:dup.owner});save(stagePath,stage);continue;}
        if(existing.length>=1500)throw Error('The 1500-photo staging bound was reached');
        reservation={...meta,owner:g.id,sourceUrl:source};existing.push(reservation);
        const secureUrl=meta.reusedEntry?.secureUrl||await storePublicImage(source,{cacheDirectory:meta.cacheDirectory,audit:{state:'ok',hash:meta.sha256}});
        const manifest=JSON.parse(fs.readFileSync(manifestPath)),entry=meta.reusedEntry||manifest.assets[source];
        if(entry?.state!=='verified')throw Error('Cloudinary delivery did not pass verification');
        const p={sourceUrl:source,sourcePage:g.sourcePage,secureUrl,sha256:meta.sha256,dhash:meta.dhash,optimizedSha256:entry.optimizedSha256,publicId:entry.publicId,width:entry.width,height:entry.height,verifiedAt:entry.verifiedAt,rights:g.rights||'Publisher copyright retained; delivery hosting does not transfer copyright',credit:g.credit};
        a.photos.push(p);Object.assign(reservation,p);uploaded++;stage.failures=stage.failures.filter(x=>!(x.owner===g.id&&x.sourceUrl===source));save(stagePath,stage);
      }catch(e){if(reservation)existing.splice(existing.indexOf(reservation),1);stage.failures=stage.failures.filter(x=>!(x.owner===g.id&&x.sourceUrl===source));stage.failures.push({owner:g.id,sourceUrl:source,error:e.message});save(stagePath,stage);if(/1500-photo|quota|credit|limit exceeded/i.test(e.message)||(/401|403/.test(e.message)&&!e.message.startsWith('Publisher image HTTP'))){nextGroup=groups.length;throw e;}}
    }
    if(i%10===0)console.log('Image groups '+(i+1)+'/'+groups.length+', verified photographs '+uploaded);
  }}
  const workers=await Promise.allSettled(Array.from({length:3},()=>worker()));for(const r of workers)if(r.status==='rejected')throw r.reason;
  stage.status=stage.failures.length?'staged_with_source_failures':'staged';stage.finishedAt=new Date().toISOString();save(stagePath,stage);
  console.log(JSON.stringify({groups:groups.length,groupsWithPhotos:Object.values(stage.allocations).filter(x=>x.photos.length).length,verifiedPhotographs:uploaded,rejectedDuplicates:stage.rejected.length,failures:stage.failures.length}));
  }finally{fs.closeSync(lock);fs.unlinkSync(lockFile);}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={hamming,inspect};
