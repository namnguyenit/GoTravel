const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {id}=require('./stable-id'),{save}=require('../real-catalog/research');const {provinces}=require('../balanced/provinces');
const dir=__dirname,batchId='gotravel-real-expansion-2026-10-05-v2';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const note='Tài khoản quản lý trên GoTravel là tài khoản giả lập. Giá, sức chứa đặt và lịch trên GoTravel phục vụ kiểm thử; chưa phải báo giá, tồn phòng hay xác nhận đặt chỗ của cơ sở. Thông tin chưa được cơ sở công bố cần xác nhận trực tiếp trước khi sử dụng thực tế.';
function main(){
 const source=JSON.parse(fs.readFileSync(path.join(dir,'official-establishments.json'))),stage=JSON.parse(fs.readFileSync(path.join(dir,'verified-image-allocations.json'))),hosts=JSON.parse(fs.readFileSync(path.join(dir,'../real-catalog/hosts.json'))).accounts;
 assert.ok(stage.status.startsWith('staged'),'Finish image staging before building the DB plan');assert.equal(hosts.length,50);
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'../cloudinary-images.json')));const verified=new Map(Object.values(manifest.assets).filter(x=>x.state==='verified').map(x=>[x.secureUrl,x]));
 const plan={schemaVersion:1,batchId,createdAt:new Date().toISOString(),sourceSha256:sha(fs.readFileSync(path.join(dir,'official-establishments.json'))),attractionSha256:sha(fs.readFileSync(path.join(dir,'real-attractions.json'))),stageSha256:sha(fs.readFileSync(path.join(dir,'verified-image-allocations.json'))),complexes:[],listings:[],inventory:[],sources:[],skipped:[],hostAssignments:[]};
 const allocation=key=>{const a=stage.allocations[key];return a?.photos?.length?a:null;};
 const photoRefs=a=>a.photos.map(p=>{assert.ok(verified.has(p.secureUrl),'Missing asset verification');assert.equal(verified.get(p.secureUrl).optimizedSha256,p.optimizedSha256);assert.ok(p.secureUrl.startsWith('https://res.cloudinary.com/'+manifest.cloudName+'/image/upload/'));return p.secureUrl;});
 const provenance=(recordType,recordId,key,facts,a)=>plan.sources.push({recordType,recordId,sourceId:key,sourceUrl:facts.sourcePage||facts.sourceUrl,verifiedAt:facts.checkedAt,verificationKind:facts.offerKind||'REAL_ESTABLISHMENT_PUBLIC_FACTS',commerceKind:'SIMULATED_HOST_TEST_INVENTORY',facts,photos:a.photos});
 const personalHosts=hosts.filter(x=>x.role==='HOST'),enterpriseHosts=hosts.filter(x=>x.role==='ENTERPRISE');
 assert.equal(personalHosts.length,25);assert.equal(enterpriseHosts.length,25);
 let enterpriseIndex=0,personalIndex=0;
 for(const h of source.establishments){
  assert.ok(provinces.includes(h.province));assert.ok(h.latitude>=8&&h.latitude<=24&&h.longitude>=102&&h.longitude<=111);
  // Complex management is ENTERPRISE-only in CatalogHostController. A personal
  // homestay remains a standalone accommodation, with rooms owned by its host.
  const owner=h.hostKind==='HOST'?personalHosts[personalIndex++%25]:enterpriseHosts[enterpriseIndex++%25];plan.hostAssignments.push({sourceId:h.sourceId,hostId:owner.id,hostType:owner.role});
  const parent=owner.role==='ENTERPRISE'?allocation(h.sourceId):null,complexId=parent?id('complex:'+h.sourceId):null;
  if(parent){const galleryUrls=photoRefs(parent);plan.complexes.push({id:complexId,hostId:owner.id,name:h.name,province:h.province,latitude:h.latitude,longitude:h.longitude,thumbnailUrl:galleryUrls[0],galleryUrls,status:'ACTIVE',description:`${h.name}. Địa chỉ theo nguồn công bố: ${h.address}. Cơ sở có các hạng phòng và tiện ích được liệt kê riêng bên dưới.\n\nNguồn thông tin và ảnh: ${h.sourceUrl}.\n\n${note}`});provenance('complexes',complexId,h.sourceId,{...h,rooms:undefined,services:undefined,experiences:undefined,images:undefined},parent);}
  const items=[...h.rooms.map(r=>({...r,kind:'STAY',key:h.sourceId+':room:'+sha(r.name).slice(0,16)})),...h.services.map(s=>({...s,kind:'SVC',key:h.sourceId+':service:'+sha(s.name).slice(0,16)})),...(h.experiences||[]).map(e=>({...e,kind:'EXP',key:h.sourceId+':experience:'+sha(e.name).slice(0,16)}))];
  for(const item of items){const a=allocation(item.key);if(!a){plan.skipped.push({sourceId:item.key,name:item.name,reason:'No unique verified photograph'});continue;}
    const displayName=/^[a-z]+(?:-[a-z]+)+$/.test(item.name)?item.name.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '):item.name;
    // The publisher itself has a spa image bound to this room: do not import it as room photography.
    if(item.kind==='STAY'&&item.images.some(u=>/luxspa-spa5|chuc-mung-nam-moi/i.test(u))){plan.skipped.push({sourceId:item.key,name:item.name,reason:'Publisher image may be a spa/marketing graphic instead of the named room'});continue;}
    if(item.kind==='SVC'&&item.subCategory==='SPA'&&['publisher:mayplaza','publisher:adamo-hungyen'].includes(h.sourceId)){plan.skipped.push({sourceId:item.key,name:item.name,reason:'Visual review found treatment illustrations/collages or renders, without a verified photograph of the facility'});continue;}
    const galleryUrls=photoRefs(a),listingId=id('listing:'+item.key);let attributes,description,priceUnit,basePrice;
    if(item.kind==='STAY'){
      const bed=item.bedType?{type:item.bedType,quantity:item.bedQuantity||1}:/twin|triple/i.test(item.name)?{type:'single',quantity:/triple/i.test(item.name)?3:2}:/king/i.test(item.name)?{type:'king',quantity:1}:{type:'double',quantity:1};
      const bedroomCount=/two[- ]bedroom|2 phòng ngủ/i.test(item.name)?2:1;
      attributes={categoryType:'STAY',galleryUrls,amenities:item.amenities||[],stayDetail:{propertyType:h.hostKind==='HOST'?'homestay':/apartment|căn hộ/i.test(item.name)?'apartment':/luxury|holiday|resort/i.test(h.name)?'resort_room':'hotel',roomSizeSqM:item.areaSquareMeters||25,maxGuests:item.maxGuests||(/triple/i.test(item.name)?3:bedroomCount*2),bedrooms:bedroomCount,beds:[bed],bathrooms:1},policies:{checkInTime:'14:00',checkOutTime:'12:00',allowPets:false,allowSmoking:false,partyAllowed:false}};
      priceUnit='PER_NIGHT';basePrice=item.quotedPrice||750000;description=`${displayName} tại ${h.name}, ${h.province}. Địa chỉ theo nguồn: ${h.address}.${item.areaSquareMeters?' Diện tích công bố: '+item.areaSquareMeters+' m².':' Nguồn chưa công bố diện tích hạng phòng. Diện tích 25 m² đang hiển thị là dữ liệu kiểm thử, chưa phải diện tích thật đã xác minh.'}${item.amenities?.length?' Tiện nghi được công bố: '+item.amenities.join(', ')+'.':''}`;
    }else if(item.kind==='SVC'){
      attributes={categoryType:'SVC_'+item.subCategory,galleryUrls,logistics:{serveAtClientLocation:false,maxTravelRadiusKm:0},serviceDetail:item.subCategory==='SPA'?{treatments:[],organicProductsOnly:null,durationMinutes:60,genderPreference:null}:{mealType:[],deliveryFrequency:null,mealsPerDay:null,caloriesPerDay:null,heatingInstructions:null}};
      priceUnit=item.subCategory==='SPA'?'PER_HOUR':'PER_PAX';basePrice=250000;description=`${item.name} tại ${h.name}. Địa chỉ theo nguồn: ${h.address}. ${item.facts?.length?'Thông tin công bố: '+item.facts.map(x=>x.name+': '+x.value).join('; ')+'.':''} Kiểm tra thực đơn, liệu trình, giờ hoạt động và điều kiện phục vụ trực tiếp với cơ sở.`;
    }else{
      attributes={categoryType:'EXP',galleryUrls,expDetail:{durationMinutes:item.durationMinutes||120,difficulty:null,languages:['Tiếng Việt'],groupSize:{min:1,max:6},meetingPoint:h.address,meetingPointLat:h.latitude,meetingPointLng:h.longitude},inclusions:[],exclusions:[],itinerary:[]};priceUnit='PER_PAX';basePrice=350000;description=`${item.name}, do ${h.name} công bố tại ${h.province}. Điểm xuất phát theo thông tin cơ sở: ${h.address}. Kiểm tra lịch, phương tiện, yêu cầu sức khỏe và điều kiện tham gia với cơ sở.`;
    }
    description+=`\n\nNguồn thông tin và ảnh: ${item.sourcePage||h.sourceUrl}.\n\n${note}`;
    plan.listings.push({id:listingId,hostId:owner.id,complexId,title:item.kind==='SVC'?`${displayName} — ${h.name}`:`${h.name} — ${displayName}`,description,category:item.kind,subCategory:item.kind==='SVC'?item.subCategory:'NONE',province:h.province,basePrice,priceUnit,latitude:h.latitude,longitude:h.longitude,thumbnailUrl:galleryUrls[0],attributes,averageRating:0,totalReviews:0,status:'ACTIVE'});
    provenance('listings',listingId,item.key,{...item,images:undefined,establishmentName:h.name,address:h.address,province:h.province},a);
  }
 }
 const attractionFile=path.join(dir,'real-attractions.json');
 for(const e of fs.existsSync(attractionFile)?JSON.parse(fs.readFileSync(attractionFile)).attractions:[]){
  const a=allocation(e.sourceId);if(!a){plan.skipped.push({sourceId:e.sourceId,name:e.name,reason:'No unique verified photograph'});continue;}
  const owner=personalHosts[personalIndex++%25],listingId=id('listing:'+e.sourceId),galleryUrls=photoRefs(a);let credit=a.photos.map(p=>`${p.credit}; ${p.rights}; ${p.commonsPage||p.sourcePage}${p.licenseUrl?'; '+p.licenseUrl:''}`).join('\n');
  plan.listings.push({id:listingId,hostId:owner.id,complexId:null,title:`Tham quan ${e.name}`,description:`${e.name} là địa điểm có thật tại ${e.province}. Thông tin địa điểm: ${e.sourceUrl}. Kiểm tra giờ mở cửa, điều kiện tiếp cận, vé vào cửa và hướng dẫn của ban quản lý trước chuyến đi. Đây là hoạt động tham quan địa điểm thật với tài khoản tổ chức giả lập trên GoTravel; chưa xác minh dịch vụ tour hay hợp đồng bán vé của đơn vị vận hành.\n\nẢnh: ${credit}. Đã đổi kích thước và chuyển WebP, giữ giấy phép nguồn.\n\n${note}`,category:'EXP',subCategory:'NONE',province:e.province,basePrice:150000,priceUnit:'PER_PAX',latitude:e.latitude,longitude:e.longitude,thumbnailUrl:galleryUrls[0],attributes:{categoryType:'EXP',galleryUrls,expDetail:{durationMinutes:120,difficulty:null,languages:['Tiếng Việt'],groupSize:{min:1,max:6},meetingPoint:e.name+' — '+e.province+'; vị trí tham khảo, xác nhận điểm hẹn trước khi đi',meetingPointLat:e.latitude,meetingPointLng:e.longitude},inclusions:[],exclusions:[],itinerary:[]},averageRating:0,totalReviews:0,status:'ACTIVE'});
  provenance('listings',listingId,e.sourceId,e,a);
 }
 // Do not expose empty parent complexes.
 const parents=new Set(plan.listings.map(x=>x.complexId).filter(Boolean));plan.complexes=plan.complexes.filter(x=>parents.has(x.id));plan.sources=plan.sources.filter(x=>x.recordType!=='complexes'||parents.has(x.recordId));
 for(const l of plan.listings)plan.inventory.push({id:id('inventory:'+l.id),listingId:l.id,category:l.category,isActive:true,scheduleConfig:l.category==='STAY'?{defaultQuantity:2,timeSlots:[]}:{defaultQuantity:0,timeSlots:[{slot:'09:00',quantity:6},{slot:'14:00',quantity:6}]}});
 const owners=new Set(hosts.map(x=>x.id));const photos=new Map();for(const s of plan.sources)for(const p of s.photos){const other=photos.get(p.optimizedSha256);assert.ok(!other||other===s.recordId,'Photograph shared by different catalog records');photos.set(p.optimizedSha256,s.recordId);}
 for(const l of plan.listings){assert.ok(owners.has(l.hostId));assert.ok(!l.complexId||plan.complexes.some(x=>x.id===l.complexId&&x.hostId===l.hostId));assert.ok(l.description.includes(note));assert.equal(l.totalReviews,0);}
 for(const c of plan.complexes)assert.ok(enterpriseHosts.some(h=>h.id===c.hostId),'Only an enterprise may own a complex');
 plan.inventoryStart=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 plan.coverage=provinces.map(province=>({province,STAY:plan.listings.filter(x=>x.province===province&&x.category==='STAY').length,EXP:plan.listings.filter(x=>x.province===province&&x.category==='EXP').length,SVC:plan.listings.filter(x=>x.province===province&&x.category==='SVC').length,complexes:plan.complexes.filter(x=>x.province===province).length}));
 save(path.join(dir,'plan.json'),plan);console.log(JSON.stringify({listings:plan.listings.length,complexes:plan.complexes.length,uniquePhotographs:photos.size,hostCount:new Set(plan.listings.map(x=>x.hostId)).size,coverage:plan.coverage,skipped:plan.skipped.length}));
}
if(require.main===module)main();module.exports={main,batchId};
