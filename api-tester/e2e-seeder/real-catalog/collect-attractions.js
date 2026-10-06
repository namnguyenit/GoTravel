// Real places and licensed photographs. Virtual seed hosts supply test offers;
// this does not assert a real tour operator, a ticket contract or live schedules.
const fs=require('node:fs'),path=require('node:path');const {api,clean,save}=require('./research');
const {canonical}=require('../balanced/provinces');const dir=__dirname;
const illustration=title=>/(?:\bmap\b|\blogo\b|\bflag\b|\bdiagram\b|\bposter\b|coat of arms|locator|bản đồ)/i.test(title.replaceAll('_',' '));
const extra={
 'An Giang':['Rừng tràm Trà Sư','Miếu Bà Chúa Xứ Núi Sam','Vườn quốc gia Phú Quốc'],
 'Đồng Tháp':['Vườn quốc gia Tràm Chim','Chùa Vĩnh Tràng','Gò Tháp'],
 'Hà Tĩnh':['Ngã ba Đồng Lộc','Chùa Hương Tích','Khu lưu niệm Nguyễn Du'],
 'Hải Phòng':['Vườn quốc gia Cát Bà','Cát Bà','Đồ Sơn'],
 'Lai Châu':['Đèo Ô Quy Hồ','Động Tiên Sơn (Lai Châu)','Sìn Hồ'],
 'Lạng Sơn':['Động Tam Thanh','Ải Chi Lăng','Đền Kỳ Cùng']
};
async function photos(fileTitle){const v=await api('https://commons.wikimedia.org',{action:'query',titles:fileTitle,prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:1600});const p=v.query?.pages?.[0],i=p?.imageinfo?.[0];if(!i)return[];
 if(illustration(p.title))return[];
 const get=k=>clean(i.extmetadata?.[k]?.value);const license=get('LicenseShortName');
 if(!/^(CC BY(?:-SA)? [1-4]\.0|CC0|Public domain)$/i.test(license)||Math.min(i.width,i.height)<360||! /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(i.url))return[];
 return[{fileTitle:p.title,sourceUrl:i.url,downloadUrl:i.thumburl||i.url,sourcePage:i.descriptionurl,author:get('Artist'),credit:get('Credit'),license,licenseUrl:get('LicenseUrl'),description:get('ImageDescription'),width:i.width,height:i.height}];
}
async function main(){
 const old=JSON.parse(fs.readFileSync(path.join(dir,'../expansion/destinations.json'))).destinations;
 const out=path.join(dir,'real-attractions.json');const result=fs.existsSync(out)?JSON.parse(fs.readFileSync(out)):{schemaVersion:1,attractions:[],rejected:[],startedAt:new Date().toISOString()};
 result.attractions=result.attractions.filter(x=>{if(x.photos.some(p=>illustration(p.fileTitle))){result.rejected.push({name:x.name,reason:'Illustration or map is not a photograph of the place'});return false;}return true;});
 const candidates=old.map(x=>({name:x.title,province:canonical(x.province),latitude:x.latitude,longitude:x.longitude,sourceUrl:x.wikipediaUrl,fileTitle:x.image.fileTitle,existingLandmark:true}));
 const supplemental=[['Đồng Tháp','Vĩnh Tràng Temple','Chùa Vĩnh Tràng'],['Đồng Tháp','Tràm Chim National Park','Vườn quốc gia Tràm Chim'],['Hải Phòng','Cat Ba Island','Đảo Cát Bà']];
 for(const [province,title,name]of supplemental){const v=await api('https://en.wikipedia.org',{action:'query',titles:title,redirects:1,prop:'coordinates|pageimages|info',coprimary:'primary',colimit:'max',piprop:'original',inprop:'url'});const p=v.query?.pages?.[0],c=p?.coordinates?.[0],src=p?.original?.source;if(c&&src)candidates.push({name,province,latitude:c.lat,longitude:c.lon,sourceUrl:p.fullurl,fileTitle:'File:'+decodeURIComponent(new URL(src).pathname.split('/').pop()),provinceBasis:'reviewed_real_place'});}
 const commons=JSON.parse(fs.readFileSync(path.join(dir,'research.json')));const gw=commons.categories.find(x=>x.title==='Category:Grand World Phú Quốc');
 if(gw?.coordinates?.[0]){const file=gw.files.find(x=>commons.images[x]?.eligible&&!/logo|map|plan|poster/i.test(x));if(file)candidates.push({name:'Grand World Phú Quốc',province:'An Giang',latitude:gw.coordinates[0].lat,longitude:gw.coordinates[0].lon,sourceUrl:gw.sourcePage,fileTitle:file,provinceBasis:'reviewed_Phu_Quoc_current_An_Giang'});}
 for(const [province,names]of Object.entries(extra))for(const name of names){const v=await api('https://vi.wikipedia.org',{action:'query',titles:name,redirects:1,prop:'coordinates|pageimages|info',coprimary:'primary',colimit:'max',piprop:'original',inprop:'url'});const p=v.query?.pages?.[0],c=p?.coordinates?.[0],image=p?.original?.source;
  if(!c||!image){result.rejected.push({name,province,reason:'no property-specific source coordinates or photograph'});continue;}
  const filename=decodeURIComponent(new URL(image).pathname.split('/').pop());candidates.push({name:p.title,province,latitude:c.lat,longitude:c.lon,sourceUrl:p.fullurl,fileTitle:'File:'+filename,provinceBasis:'reviewed_named_place_in_province_with_2025_mapping'});
 }
 // Keep at most six distinct places per province. No variants of the same venue.
 const count={};const seen=new Set();
 for(const p of candidates){if(seen.has(p.sourceUrl)||(count[p.province]||0)>=6)continue;seen.add(p.sourceUrl);
  const sourceId='real-place:'+p.sourceUrl;let known=result.attractions.find(x=>x.sourceId===sourceId);
  if(!known){try{const xs=await photos(p.fileTitle);if(!xs.length){result.rejected.push({...p,reason:'no eligible licensed photograph'});continue;}known={...p,sourceId,photos:xs,checkedAt:new Date().toISOString(),offerKind:'REAL_PLACE_WITH_SIMULATED_HOST_TEST_OFFER',operatorVerification:'not_claimed',durationMinutes:120};result.attractions.push(known);}catch(e){result.rejected.push({name:p.name,reason:e.message});}}
  if(known)count[p.province]=(count[p.province]||0)+1;save(out,result);
 }
 result.completedAt=new Date().toISOString();save(out,result);console.log(JSON.stringify({places:result.attractions.length,provinces:Object.keys(count).length,counts:count,rejected:result.rejected.length}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
