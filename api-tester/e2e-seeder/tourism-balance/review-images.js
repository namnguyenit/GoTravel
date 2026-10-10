const {createRequire}=require('node:module');
const {fs,path,dir,hash,save}=require('./common');
const sharp=createRequire(path.resolve(dir,'../../../cloudinary-service/package.json'))('sharp');
const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function main(){
 const stage=JSON.parse(fs.readFileSync(path.join(dir,'verified-image-allocations.json')));
 const out=path.join(dir,'.cache/review-sheets');fs.mkdirSync(out,{recursive:true});
 const photos=Object.values(stage.allocations).flatMap(a=>a.photos.map(p=>({...p,owner:a.id,name:a.name})));
 save(path.join(out,'index.json'),photos.map((p,i)=>({index:i+1,...p})));
 for(let start=0;start<photos.length;start+=36){const part=photos.slice(start,start+36),composite=[];
  for(let n=0;n<part.length;n++){const p=part[n],x=n%6*280,y=Math.floor(n/6)*218;
   const source=path.resolve(dir,'../real-expansion/.cache/photographs',hash(p.sourceUrl));
   const thumb=await sharp(source).resize(276,168,{fit:'contain',background:'#eeeeee'}).jpeg().toBuffer();
   const label=`${start+n+1} ${p.name.replace(/^(VinWonders|Sun World) /,'').slice(0,78)}`;
   const words=[label.slice(0,40),label.slice(40,80)];
   const svg=Buffer.from(`<svg width="280" height="50"><rect width="280" height="50" fill="white"/><g font-family="DejaVu Sans" font-size="12" fill="black"><text x="4" y="17">${escape(words[0])}</text><text x="4" y="35">${escape(words[1])}</text></g></svg>`);
   composite.push({input:thumb,left:x,top:y},{input:svg,left:x,top:y+168});
  }
  const target=path.join(out,`sheet-${String(start/36+1).padStart(2,'0')}.jpg`);
  await sharp({create:{width:1680,height:Math.ceil(part.length/6)*218,channels:3,background:'white'}}).composite(composite).jpeg({quality:86}).toFile(target);
  console.log(target);
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
