const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const {dir,save}=require('./helpers');const sharp=createRequire(path.resolve(dir,'../../../cloudinary-service/package.json'))('sharp');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const active=require('./active-image-baseline.json').records;const urls=[...new Set(active.flatMap(r=>[r.thumbnail_url,...(r.gallery_urls||[])]).filter(Boolean))];
 const previous=require('../real-catalog/verified-image-allocations.json');const known=new Map(Object.values(previous.allocations).flatMap(g=>g.photos.map(p=>[p.secureUrl,p])));
 const cache=path.join(dir,'.cache','baseline-images.json');let output=fs.existsSync(cache)?JSON.parse(fs.readFileSync(cache)):{};let next=0;
 async function worker(){while(next<urls.length){const url=urls[next++];if(output[url])continue;const k=known.get(url);if(k){output[url]={sha256:k.sha256,optimizedSha256:k.optimizedSha256,dhash:k.dhash};continue;}
  if(!url.startsWith('https://res.cloudinary.com/p1kxfhlw/image/upload/'))throw Error('Baseline has an unowned image');
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Baseline delivery '+r.status);const b=Buffer.from(await r.arrayBuffer());const p=await sharp(b,{limitInputPixels:60e6}).rotate().resize(9,8,{fit:'fill'}).greyscale().raw().toBuffer();let d=0n;for(let y=0;y<8;y++)for(let x=0;x<8;x++)d=(d<<1n)|(p[y*9+x]>p[y*9+x+1]?1n:0n);output[url]={optimizedSha256:sha(b),dhash:d.toString(16).padStart(16,'0')};save(cache,output);
 }}
 await Promise.all(Array.from({length:6},worker));save(cache,output);console.log(JSON.stringify({activeRecords:active.length,uniqueImages:urls.length,fingerprints:Object.keys(output).length}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
