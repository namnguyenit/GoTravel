const {fs,path,dir,save,hash}=require('./common');
const {createRequire}=require('node:module');
const sharp=createRequire(path.resolve(dir,'../../../cloudinary-service/package.json'))('sharp');
function dhash(p){let d=0n;for(let y=0;y<8;y++)for(let x=0;x<8;x++)d=(d<<1n)|(p[y*9+x]>p[y*9+x+1]?1n:0n);return d.toString(16).padStart(16,'0');}
async function main(){const records=require('./active-image-baseline.json').records,urls=[...new Set(records.flatMap(x=>[x.thumbnail_url,...x.gallery_urls]).filter(Boolean))],known={};
 for(const file of ['../real-expansion/.cache/baseline-images.json','../real-catalog/verified-image-allocations.json','../real-expansion/verified-image-allocations.json']){const d=JSON.parse(fs.readFileSync(path.join(dir,file)));if(d.allocations)for(const group of Object.values(d.allocations))for(const p of group.photos)known[p.secureUrl]={sha256:p.sha256,optimizedSha256:p.optimizedSha256,dhash:p.dhash};else Object.assign(known,d);}
 const file=path.join(dir,'.cache/baseline-images.json');const out=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{};let next=0;
 await Promise.all(Array.from({length:5},async()=>{while(next<urls.length){const url=urls[next++];if(out[url])continue;if(known[url]?.dhash){out[url]=known[url];continue;}const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Baseline delivery HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());const p=await sharp(b).rotate().resize(9,8,{fit:'fill'}).greyscale().raw().toBuffer();out[url]={optimizedSha256:hash(b),dhash:dhash(p)};save(file,out);}}));save(file,out);console.log(JSON.stringify({records:records.length,uniqueImages:urls.length,fingerprints:Object.keys(out).length}));}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={dhash};
