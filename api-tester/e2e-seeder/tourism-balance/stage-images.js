const {fs,path,dir,save,hash}=require('./common');
const {configure,storePublicImage,manifestPath}=require('../image-store');
const {inspect,hamming}=require('../real-expansion/upload-images');
const stageFile=path.join(dir,'verified-image-allocations.json');
async function main(){
 if(fs.existsSync(path.join(dir,'receipt.json')))throw Error('A batch journal exists; committed/recoverable source and image checksums must remain frozen');
 const lockFile=manifestPath+'.lock';if(fs.existsSync(lockFile)){const pid=Number(fs.readFileSync(lockFile,'utf8'));try{process.kill(pid,0);throw Error('Another image writer is running');}catch(e){if(e.code!=='ESRCH')throw e;fs.unlinkSync(lockFile);}}
 const lock=fs.openSync(lockFile,'wx');fs.writeFileSync(lock,String(process.pid));
 try{configure();const raw=fs.readFileSync(path.join(dir,'official-catalog.json'));const source=JSON.parse(raw);
 const stage=fs.existsSync(stageFile)?JSON.parse(fs.readFileSync(stageFile)):{schemaVersion:1,sourceSha256:hash(raw),allocations:{},failures:[],rejected:[],status:'staging'};
 if(stage.sourceSha256!==hash(raw))throw Error('Research changed after staging; review the source change before resuming');
 const groups=source.properties.flatMap(p=>[...(p.complexKind==='MOBILE_PROVIDER'?[]:[{id:p.sourceId,name:p.name,sourcePage:p.sourceUrl,publisher:p.publisher,images:p.images,kind:'COMPLEX',target:1}]),...p.items.map(x=>({id:x.key,name:p.name+' — '+x.name,sourcePage:x.sourcePage,publisher:p.publisher,kind:x.kind,images:x.images,target:x.kind==='STAY'?3:x.images.length>=2?2:1}))]);
 if(groups.length>400)throw Error('Unexpected research expansion');
 const known=Object.entries(JSON.parse(fs.readFileSync(path.join(dir,'.cache/baseline-images.json')))).map(([url,p])=>({...p,owner:'existing:'+url}));for(const a of Object.values(stage.allocations))for(const p of a.photos)known.push({...p,owner:a.id});
 let next=0,uploaded=Object.values(stage.allocations).reduce((n,g)=>n+g.photos.length,0);stage.status='staging';
 save(stageFile,stage);
 async function worker(){while(next<groups.length){const g=groups[next++];const a=stage.allocations[g.id]||={id:g.id,name:g.name,kind:g.kind,photos:[]};if(a.photos.length>=g.target)continue;
  const candidates=[...new Set(g.images.flatMap(u=>/-\d{2,4}x\d{2,4}\.(jpg|png|webp)/i.test(u)?[u.replace(/-\d{2,4}x\d{2,4}(\.(?:jpg|png|webp))/i,'$1'),u]:[u]))];
  for(const url of candidates.slice(0,12)){if(a.photos.length>=g.target)break;if(a.photos.some(p=>p.sourceUrl===url)||stage.rejected.some(p=>p.owner===g.id&&p.sourceUrl===url))continue;
   let reservation;try{const meta=await inspect(url);const dup=known.find(p=>p.sha256===meta.sha256||hamming(p.dhash,meta.dhash)<=4);if(dup){stage.rejected.push({owner:g.id,sourceUrl:url,reason:'duplicate_or_near_duplicate',otherOwner:dup.owner});save(stageFile,stage);continue;}
    reservation={...meta,owner:g.id};known.push(reservation);
    const secureUrl=await storePublicImage(url,{cacheDirectory:meta.cacheDirectory,audit:{state:'ok',hash:meta.sha256}});const entry=JSON.parse(fs.readFileSync(manifestPath)).assets[url];if(entry.state!=='verified')throw Error('Unverified Cloudinary asset');
    const photo={sourceUrl:url,sourcePage:g.sourcePage,secureUrl,sha256:meta.sha256,dhash:meta.dhash,optimizedSha256:entry.optimizedSha256,publicId:entry.publicId,width:entry.width,height:entry.height,verifiedAt:entry.verifiedAt,credit:g.publisher,rights:'Publisher copyright retained; Cloudinary hosting does not transfer copyright'};a.photos.push(photo);Object.assign(reservation,photo);uploaded++;stage.failures=stage.failures.filter(p=>!(p.owner===g.id&&p.sourceUrl===url));save(stageFile,stage);
   }catch(e){if(reservation)known.splice(known.indexOf(reservation),1);stage.failures=stage.failures.filter(p=>!(p.owner===g.id&&p.sourceUrl===url));stage.failures.push({owner:g.id,sourceUrl:url,error:e.message});save(stageFile,stage);if(/quota|credit|limit exceeded|not configured|HTTP (401|403)/i.test(e.message)&&!e.message.startsWith('Publisher image'))throw e;}
  }if(next%10===0)console.log(JSON.stringify({groups:next,total:groups.length,verified:uploaded}));
 }}
 const r=await Promise.allSettled(Array.from({length:3},worker));for(const x of r)if(x.status==='rejected')throw x.reason;
 stage.status='staged_requires_visual_review';stage.completedAt=new Date().toISOString();save(stageFile,stage);console.log(JSON.stringify({groups:groups.length,withPhotos:Object.values(stage.allocations).filter(x=>x.photos.length).length,photographs:uploaded,duplicates:stage.rejected.length,failures:stage.failures.length}));
 }finally{fs.closeSync(lock);fs.unlinkSync(lockFile);}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
