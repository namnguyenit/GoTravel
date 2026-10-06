// Local visual evidence; originals and public delivery images are never edited.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const {dir,sha}=require('./helpers');const sharp=createRequire(path.resolve(dir,'../../../cloudinary-service/package.json'))('sharp');
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function main(){const s=JSON.parse(fs.readFileSync(path.join(dir,'verified-image-allocations.json'))),groups=Object.values(s.allocations).filter(g=>g.photos.length);const out=path.join(dir,'.cache','review');fs.mkdirSync(out,{recursive:true});
 for(let start=0;start<groups.length;start+=30){const batch=groups.slice(start,start+30),layers=[];let n=0;
  for(const g of batch){const p=g.photos[0],file=path.join(dir,'.cache','photographs',sha(p.sourceUrl));let b;if(fs.existsSync(file))b=fs.readFileSync(file);else{const r=await fetch(p.secureUrl,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Review fetch failed');b=Buffer.from(await r.arrayBuffer());}
   const x=(n%5)*280,y=Math.floor(n/5)*220;layers.push({input:await sharp(b).rotate().resize(278,175,{fit:'inside'}).toBuffer(),left:x,top:y});
   const label=String(start+n+1)+' '+g.kind+' '+g.name;const svg='<svg width="280" height="44"><rect width="280" height="44" fill="white"/><text x="4" y="15" font-size="12" font-family="sans-serif">'+esc(label.slice(0,42))+'</text><text x="4" y="32" font-size="12" font-family="sans-serif">'+esc(label.slice(42,84))+'</text></svg>';layers.push({input:Buffer.from(svg),left:x,top:y+175});n++;
  }
  await sharp({create:{width:1400,height:Math.ceil(batch.length/5)*220,channels:3,background:'#eee'}}).composite(layers).jpeg({quality:85}).toFile(path.join(out,'sheet-'+(start/30+1)+'.jpg'));
 }console.log(JSON.stringify({groups:groups.length,sheets:Math.ceil(groups.length/30),directory:out}));}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
