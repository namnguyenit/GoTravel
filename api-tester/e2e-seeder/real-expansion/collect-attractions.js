// Real named places; open licensed photographs, with sources retained.
const fs=require('node:fs'),path=require('node:path');
const {api,clean}=require('../real-catalog/research');
const {dir,save,fold}=require('./helpers');
const {canonical,aliases}=require('../balanced/provinces');
const illustration=s=>/\bmap\b|logo|\bflag\b|diagram|poster|coat.of.arms|locator|bản đồ|sơ đồ|sketch|illustration|reconstruction/i.test(s.replaceAll('_',' '));
async function main(){
const input=JSON.parse(fs.readFileSync(path.join(dir,'attraction-candidates.json')));
const old=JSON.parse(fs.readFileSync(path.join(dir,'../real-catalog/real-attractions.json'))).attractions;
const result={schemaVersion:1,startedAt:new Date().toISOString(),attractions:[],rejected:[]};
const candidates=Object.entries(input).flatMap(([province,titles])=>titles.map(title=>({province,title})));
for(let offset=0;offset<candidates.length;offset+=15){
const group=candidates.slice(offset,offset+15);
const v=await api('https://vi.wikipedia.org',{action:'query',titles:group.map(x=>x.title).join('|'),redirects:1,prop:'coordinates|pageimages|pageprops|info|images|extracts',coprimary:'primary',colimit:'max',piprop:'original',inprop:'url',imlimit:50,exintro:1,explaintext:1,exchars:1400});
const redirect=new Map((v.query.redirects||[]).map(x=>[x.from,x.to]));const normalization=new Map((v.query.normalized||[]).map(x=>[x.from,x.to]));
const pages=v.query.pages||[];const ids=pages.map(p=>p.pageprops?.wikibase_item).filter(Boolean);
const entities=ids.length?(await api('https://www.wikidata.org',{action:'wbgetentities',ids:ids.join('|'),props:'labels|claims',languages:'vi|en'})).entities:{};
const pending=[];
for(const candidate of group){let title=normalization.get(candidate.title)||candidate.title;title=redirect.get(title)||title;
const p=pages.find(p=>p.title===title),e=entities[p?.pageprops?.wikibase_item];
if(!p||p.missing){result.rejected.push({...candidate,reason:'No matching Wikipedia entity'});continue;}
if(old.some(x=>x.sourceUrl===p.fullurl||fold(x.name)===fold(p.title))){result.rejected.push({...candidate,reason:'Already imported place'});continue;}
const earth=(e?.claims?.P625||[]).filter(x=>x.rank!=='deprecated'&&x.mainsnak.datavalue?.value?.globe?.endsWith('/Q2'));
const c=p.coordinates?.[0]||earth.find(x=>x.rank==='preferred')?.mainsnak.datavalue.value||earth[0]?.mainsnak.datavalue?.value;
const latitude=c?.lat??c?.latitude,longitude=c?.lon??c?.longitude;
if(!(latitude>=8&&latitude<=24&&longitude>=102&&longitude<=110.8)){result.rejected.push({...candidate,reason:'No independently sourced Vietnam coordinate'});continue;}
// Reject broad provinces/districts and articles which describe another province.
const intro=clean(p.extract);const provinceMatches=Object.keys(aliases).filter(x=>new RegExp('(?:tỉnh|thành phố)\\s+'+x.replace(/[.*+?^\$()|[\]{}]/g,'\\$&'),'i').test(intro)).map(canonical);
if(provinceMatches.length&&!provinceMatches.includes(candidate.province)){result.rejected.push({...candidate,reason:'Province conflict with source introduction',sourceTitle:p.title,reportedProvinces:provinceMatches});continue;}
const fileTitles=new Set();
if(p.original?.source){const url=new URL(p.original.source);if(url.hostname==='upload.wikimedia.org')fileTitles.add('File:'+decodeURIComponent(url.pathname.split('/').pop()));}
for(const x of e?.claims?.P18||[]){if(x.rank!=='deprecated'&&x.mainsnak.datavalue?.value)fileTitles.add('File:'+x.mainsnak.datavalue.value);}
for(const x of p.images||[]){if(!illustration(x.title)&&/\.(?:jpe?g|png|webp)$/i.test(x.title))fileTitles.add(x.title.replace(/^Tập tin:/,'File:'));}
pending.push({...candidate,name:p.title,sourceId:'real-place:'+p.fullurl,sourceUrl:p.fullurl,wikidataId:e?.id,latitude,longitude,provinceBasis:'reviewed_named_place_with_source_introduction_and_2025_mapping',coordinateBasis:p.coordinates?.[0]?'Wikipedia_primary_coordinate':'Wikidata_P625_earth_coordinate',sourceSummary:intro,fileTitles:[...fileTitles].filter(x=>!illustration(x)).slice(0,8),checkedAt:new Date().toISOString(),offerKind:'REAL_PLACE_WITH_SIMULATED_HOST_TEST_OFFER'});
}
const files=[...new Set(pending.flatMap(p=>p.fileTitles))],metadata={};
for(let j=0;j<files.length;j+=30){const x=await api('https://commons.wikimedia.org',{action:'query',titles:files.slice(j,j+30).join('|'),prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:1600});
for(const p of x.query?.pages||[]){const info=p.imageinfo?.[0];if(!info)continue;const get=k=>clean(info.extmetadata?.[k]?.value);const license=get('LicenseShortName');if(!/^(CC BY(?:-SA)? [1-4]\.0|CC0|Public domain)$/i.test(license)||Math.min(info.width,info.height)<360||illustration(p.title+' '+get('ImageDescription'))||! /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(info.url))continue;
metadata[fold(p.title.replace(/^File:/,''))]={fileTitle:p.title,sourceUrl:info.url,downloadUrl:info.thumburl||info.url,sourcePage:info.descriptionurl,author:get('Artist'),credit:get('Credit'),license,licenseUrl:get('LicenseUrl'),description:get('ImageDescription'),width:info.width,height:info.height};
}}
for(const p of pending){const photos=p.fileTitles.map(t=>metadata[fold(t.replace(/^File:/,''))]).filter(Boolean);if(!photos.length){result.rejected.push({name:p.name,province:p.province,reason:'No eligible place photograph with open licence'});continue;}result.attractions.push({...p,fileTitles:undefined,photos});}
save(path.join(dir,'real-attractions.json'),result);console.log(JSON.stringify({processed:Math.min(offset+15,candidates.length),total:candidates.length,accepted:result.attractions.length,rejected:result.rejected.length}));
}
result.completedAt=new Date().toISOString();save(path.join(dir,'real-attractions.json'),result);
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
