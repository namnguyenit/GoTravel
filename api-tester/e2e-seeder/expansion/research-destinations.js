// Read public place facts and licensed image metadata; no database writes.
const fs=require('node:fs');const path=require('node:path');
const out=path.join(__dirname,'research.json');const wait=ms=>new Promise(r=>setTimeout(r,ms));
const headers={'user-agent':'GoTravel-SeedResearch/1.0 (educational travel demo; https://github.com/namnguyenit/GoTravel)'};
const clean=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
async function api(host,params){const url=new URL('/w/api.php',host);for(const[k,v]of Object.entries({...params,format:'json',formatversion:2}))url.searchParams.set(k,v);for(let attempt=0;attempt<3;attempt++){await wait(350);try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(data.error)throw Error(data.error.info);return data;}catch(e){if(attempt===2)throw e;await wait(1500*(attempt+1));}}}
const roots=['Thể loại:Điểm tham quan ở Việt Nam','Thể loại:Di tích tại Việt Nam','Thể loại:Danh lam thắng cảnh Việt Nam','Thể loại:Vườn quốc gia Việt Nam','Thể loại:Bãi biển Việt Nam','Thể loại:Chùa tại Việt Nam','Thể loại:Bảo tàng tại Việt Nam','Thể loại:Công viên tại Việt Nam'];
async function main(){let existing=fs.existsSync(out)?JSON.parse(fs.readFileSync(out)):null;if(existing?.pages?.length>=200&&existing?.complete){console.log('Using completed research cache');return;}
 const queue=roots.map(title=>({title,depth:0})),seen=new Set(),pages=new Map();let processed=0;
 while(queue.length&&processed<110){const item=queue.shift();if(seen.has(item.title))continue;seen.add(item.title);let data;try{data=await api('https://vi.wikipedia.org',{action:'query',list:'categorymembers',cmtitle:item.title,cmlimit:500,cmtype:'page|subcat'});}catch(e){console.log('Category unavailable: '+item.title);continue;}processed++;
  for(const member of data.query?.categorymembers||[]){if(member.ns===0&&!/^(Danh sách|Du lịch |Lễ hội|Lịch sử|Di tích |Địa lý|Văn hóa|Tôn giáo)/i.test(member.title))pages.set(member.pageid,{pageId:member.pageid,title:member.title,category:item.title});else if(member.ns===14&&item.depth<3&&!/năm|thế kỷ|theo loại|công ty|doanh nghiệp|tổ chức/i.test(member.title))queue.push({title:member.title,depth:item.depth+1});}
  if(processed%15===0)console.log(`Research: ${processed} categories, ${pages.size} place pages`);
 }
 const details=[];const all=[...pages.values()];
 for(let i=0;i<all.length;i+=40){const batch=all.slice(i,i+40);const data=await api('https://vi.wikipedia.org',{action:'query',pageids:batch.map(x=>x.pageId).join('|'),prop:'coordinates|pageimages|pageprops|info',coprimary:'primary',colimit:'max',piprop:'original|thumbnail',pithumbsize:1600,inprop:'url'});
  for(const p of data.query?.pages||[]){const coord=p.coordinates?.[0];const img=p.original?.source;if(!coord||!img||coord.lat<8||coord.lat>24||coord.lon<102||coord.lon>111||/\.(svg|gif|tiff?)(\?|$)/i.test(img))continue;const meta=pages.get(p.pageid);details.push({...meta,title:p.title,latitude:coord.lat,longitude:coord.lon,wikidataId:p.pageprops?.wikibase_item||null,wikipediaUrl:p.fullurl,imageSource:img,imageThumbnail:p.thumbnail?.source||null});}
  if(i%200===0)console.log(`Coordinate/image facts: ${Math.min(i+40,all.length)}/${all.length}, usable ${details.length}`);
 }
 const result={schemaVersion:1,retrievedAt:new Date().toISOString(),categories:seen.size,pageCount:pages.size,pages:details,complete:true,sources:['https://vi.wikipedia.org/w/api.php','https://commons.wikimedia.org/w/api.php'],googleMaps:'Public Maps search URLs will be generated from source facts; no Google photos/reviews are copied'};fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({researchPages:details.length,output:out}));}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={api,clean};
