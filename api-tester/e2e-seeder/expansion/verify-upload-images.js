// One process owns the image manifest. This does not write business databases.
const fs=require('node:fs'),path=require('node:path');
const {verifyAsset,storePublicImage,manifestPath,configure}=require('../image-store');
const output=path.join(__dirname,'image-audit.json');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){configure();const audit=fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):{startedAt:new Date().toISOString(),existing:[],newImages:[],failures:[]};
 const entries=Object.values(JSON.parse(fs.readFileSync(manifestPath)).assets);
 for(let i=0;!process.argv.includes('--new-only')&&i<entries.length;i++){const entry=entries[i];try{await verifyAsset(entry);audit.existing.push({url:entry.secureUrl,state:'ok',sha256:entry.optimizedSha256});}catch(e){audit.failures.push({source:entry.sourceUrl,error:e.message});try{await storePublicImage(entry.sourceUrl,{cacheDirectory:'/tmp/gotravel-media-audit/cache',audit:{state:'ok',hash:entry.sourceSha256}});audit.existing.push({url:entry.secureUrl,state:'repaired'});}catch(repair){throw Error('Existing asset could not be repaired: '+repair.message);}}if(i%25===0)console.log(`Existing images: ${i+1}/${entries.length}`);fs.writeFileSync(output,JSON.stringify(audit,null,2)+'\n');}
 const filename=path.join(__dirname,'destinations.json');const data=JSON.parse(fs.readFileSync(filename));
 for(let i=0;i<data.destinations.length;i++){const place=data.destinations[i];const source=place.image.downloadUrl;let last; if(place.image.secureUrl)continue;
  for(let attempt=0;attempt<4;attempt++){try{place.image.secureUrl=await storePublicImage(source);last=null;break;}catch(e){last=e;console.log(`Retry image ${i+1}: ${e.message}`);await wait(10000*(attempt+1));}}
  if(last){try{place.image.secureUrl=await storePublicImage(place.image.sourceUrl);}catch(e){audit.failures.push({place:place.title,source,error:e.message});fs.writeFileSync(output,JSON.stringify(audit,null,2)+'\n');throw e;}}
  place.image.derivative='Resized and converted to WebP; source photograph license retained';
  audit.newImages.push({place:place.title,url:place.image.secureUrl,author:place.image.author,license:place.image.license,sourcePage:place.image.sourcePage});
  fs.writeFileSync(filename,JSON.stringify(data,null,2)+'\n');fs.writeFileSync(output,JSON.stringify(audit,null,2)+'\n');console.log(`New destination image ${i+1}/100: ${place.title}`);await wait(3000);
 }
 audit.completedAt=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({verifiedExisting:audit.existing.length,newPhotos:audit.newImages.length,failures:audit.failures.length}));
}main().catch(e=>{console.error(e.message);process.exitCode=1;});
