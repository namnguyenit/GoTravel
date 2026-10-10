// Extra photos from the already reviewed official room gallery, after the
// first three candidates proved to be bathroom views rather than bed views.
const {fs,path,dir,save,hash}=require('./common');
const {configure,storePublicImage,manifestPath}=require('../image-store');
const {inspect,hamming}=require('../real-expansion/upload-images');
async function main(){
 if(fs.existsSync(path.join(dir,'receipt.json')))throw Error('A batch journal exists; do not alter its reviewed photographs');
 const lockFile=manifestPath+'.lock',lock=fs.openSync(lockFile,'wx');fs.writeFileSync(lock,String(process.pid));
 try{configure();const stageFile=path.join(dir,'verified-image-allocations.json'),stage=JSON.parse(fs.readFileSync(stageFile)),source=JSON.parse(fs.readFileSync(path.join(dir,'official-catalog.json')));
 const item=source.properties.find(p=>p.sourceId==='nui-than-tai').items.find(x=>x.name==='Deluxe Triple'),a=stage.allocations[item.key];
 const known=[...Object.values(JSON.parse(fs.readFileSync(path.join(dir,'.cache/baseline-images.json')))),...Object.values(stage.allocations).flatMap(x=>x.photos)];
 for(const original of item.images.slice(3)){const url=original.replace(/-\d+x\d+(\.jpg)$/,'$1');if(a.photos.some(x=>x.sourceUrl===url))continue;
 const meta=await inspect(url);if(known.some(x=>x.sha256===meta.sha256||hamming(x.dhash,meta.dhash)<=4)){stage.rejected.push({owner:item.key,sourceUrl:url,reason:'duplicate_or_near_duplicate'});continue;}
 const secureUrl=await storePublicImage(url,{cacheDirectory:meta.cacheDirectory,audit:{state:'ok',hash:meta.sha256}}),e=JSON.parse(fs.readFileSync(manifestPath)).assets[url];
 if(e.state!=='verified')throw Error('Unverified asset');const photo={sourceUrl:url,sourcePage:item.sourcePage,secureUrl,sha256:meta.sha256,dhash:meta.dhash,optimizedSha256:e.optimizedSha256,publicId:e.publicId,width:e.width,height:e.height,verifiedAt:e.verifiedAt,credit:'nuithantai.vn',rights:'Publisher copyright retained; Cloudinary hosting does not transfer copyright'};
 a.photos.push(photo);known.push(photo);save(stageFile,stage);console.log(JSON.stringify({sourceUrl:url,publicId:e.publicId}));
 }
 stage.supplementReason='Deluxe Triple bed photography must be checked alongside bathroom views';save(stageFile,stage);
 }finally{fs.closeSync(lock);fs.unlinkSync(lockFile);}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
