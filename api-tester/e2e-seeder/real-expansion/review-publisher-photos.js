// Manual visual decisions from local contact sheets. Run after staging stops.
const fs=require('node:fs'),path=require('node:path');const H=require('./helpers');
function main(){
 const stageFile=path.join(H.dir,'verified-image-allocations.json'),stage=JSON.parse(fs.readFileSync(stageFile));if(stage.status==='in_progress')throw Error('Wait for the image writer to finish');
 const file=path.join(H.dir,'official-establishments.json'),input=JSON.parse(fs.readFileSync(file));
 const removed=[];
 const bad=(property,url)=>
  (property==='publisher:konklor'&&/168965113864b607c24c0d5/.test(url))||
  (property==='publisher:diamondstarbentre'&&/\/service\/07_2020\/slide\.jpg/.test(url))||
  (property==='publisher:ninhkieu'&&(/_gallery_ninh-kieu-riverside-hotel-can-tho-exterior|_room__j7a6624/.test(url)))||
  /(?:[-_\/]map[-_.]|journey-7-days?[-_]map|loop-7[^/]*map)/i.test(url);
 for(const h of input.establishments){h.images=h.images.filter(u=>!bad(h.sourceId,u));for(const r of [...h.rooms,...h.services,...h.experiences])r.images=r.images.filter(u=>!bad(h.sourceId,u));}
 const lila=input.establishments.find(h=>h.sourceId==='publisher:lila');const tour=lila.experiences.find(e=>/^7 Days/.test(e.name));tour.images=H.images(H.page('lila-detail-4'),H.page('lila-detail-4').$('body')).filter(u=>/\/uploads\/2024\/10\/(?:Ban-Gioc-Waterfall|Ba-Be|Ngoc-Con|Lo-Lo-1|Khau-Lan-Waterfall)/.test(u));
 if(!lila.rooms.length){const d=H.page('lila-detail-5'),photos=H.images(d,d.$('body'));for(const [name,regex,bedQuantity,maxGuests]of [['Phòng riêng',/lila-hostel4-scaled/,2,2],['Giường phòng dorm',/lila-hostel[68]-scaled/,1,1]])lila.rooms.push({name,sourcePage:d.url,sourceBindingPage:d.url,images:photos.filter(u=>regex.test(u)),bedType:'single',bedQuantity,maxGuests,amenities:[],checkedAt:d.checkedAt,sourceVerification:'publisher explicitly describes private rooms and dorms; exact room photographs visually differentiated'});}
 for(const a of Object.values(stage.allocations)){a.photos=a.photos.filter(p=>{if(!bad(a.propertyId,p.sourceUrl))return true;removed.push({owner:a.id,sourceUrl:p.sourceUrl,reason:'Manual visual review: logo, map, irrelevant décor/pool or lobby used as room image'});return false;});
  if(a.propertyId==='publisher:lila'&&a.kind==='EXP'&&/^7 Days/.test(a.name))a.photos=a.photos.filter(p=>tour.images.includes(p.sourceUrl));
  if(a.kind==='STAY'&&/Phú Cường.*Superior City View/.test(a.name))a.photos.sort((a,b)=>Number(/DSC_2793/.test(a.sourceUrl))-Number(/DSC_2793/.test(b.sourceUrl)));
  if(a.kind==='STAY'&&/Executive Superior City View Twin/.test(a.name))a.photos.sort((a,b)=>Number(/rv2-2/.test(a.sourceUrl))-Number(/rv2-2/.test(b.sourceUrl)));
  if(a.kind==='STAY'&&/Double Lakeview Bungalow/.test(a.name))a.photos.sort((a,b)=>Number(/lakeview-4/.test(a.sourceUrl))-Number(/lakeview-4/.test(b.sourceUrl)));
 }
 stage.visualRejections=(stage.visualRejections||[]).concat(removed);stage.visualReviewAt=new Date().toISOString();H.save(file,input);H.save(stageFile,stage);console.log(JSON.stringify({visuallyRejected:removed.length}));
}
if(require.main===module)main();
