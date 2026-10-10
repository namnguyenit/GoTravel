const assert=require('node:assert/strict');
const {connect}=require('../expansion/db');
const {fs,path,dir,save,hash,id,fold}=require('./common');
const batchId='gotravel-tourism-balance-2026-10-09-v3';
const note='Tài khoản quản lý trên GoTravel là tài khoản giả lập. Giá, sức chứa đặt, thời lượng và lịch trên GoTravel phục vụ kiểm thử; chưa phải báo giá, tồn phòng hay xác nhận đặt chỗ của đơn vị vận hành. Xác nhận trực tiếp điều kiện tham gia, giờ hoạt động và các khoản bao gồm trước khi sử dụng thực tế.';
function svcDetail(item){switch(item.subCategory){
 case 'PHOTOGRAPHY':return{providerType:'professional',durationMinutes:60,deliveryDays:null,deliverables:'Thỏa thuận số ảnh, chỉnh sửa và thời hạn giao ảnh với nhà cung cấp',cameraGear:null};
 case 'MAKEUP':return{makeupStyle:[item.name],includesHair:/Hair/i.test(item.name),durationMinutes:60,brandsUsed:[]};
 case 'HAIR_STYLING':return{serviceType:[item.name],targetGender:null,chemicalsIncluded:null,durationMinutes:60};
 case 'MASSAGE':return{massageType:[item.name],durationMinutes:60,genderPreference:null,equipmentProvided:null};
 case 'SPA':return{treatments:[item.name],organicProductsOnly:null,durationMinutes:60,genderPreference:null};
 case 'CATERING':return{eventType:['Gala dinner','Tiệc'],menuType:null,guestCapacity:{min:1,max:20},includesStaff:null,includesTableware:null};
 case 'TRAINING':return{skillTaught:item.name,level:'Theo chương trình cơ sở',durationMinutes:60,groupSize:{min:1,max:4},equipmentProvided:null};
 default:return{mealType:[],deliveryFrequency:null,mealsPerDay:null,caloriesPerDay:null,heatingInstructions:null};
}}
async function main(){
 if(fs.existsSync(path.join(dir,'receipt.json')))throw Error('Batch journal already exists; use apply-plan.js --apply to resume or verify.js to check. Create a new batch for another plan.');
 const sourceRaw=fs.readFileSync(path.join(dir,'official-catalog.json')),source=JSON.parse(sourceRaw),stage=JSON.parse(fs.readFileSync(path.join(dir,'verified-image-allocations.json'))),review=JSON.parse(fs.readFileSync(path.join(dir,'photo-review.json')));
 assert.equal(stage.sourceSha256,hash(sourceRaw));assert.equal(review.stageSha256,hash(fs.readFileSync(path.join(dir,'verified-image-allocations.json'))));assert.equal(review.status,'reviewed');
 const excluded=new Set(review.excludedPublicIds),hosts=require('../real-catalog/hosts.json').accounts,enterprise=hosts.filter(x=>x.role==='ENTERPRISE'),personal=hosts.filter(x=>x.role==='HOST');
 const plan={schemaVersion:1,batchId,createdAt:new Date().toISOString(),sourceSha256:hash(sourceRaw),stageSha256:hash(fs.readFileSync(path.join(dir,'verified-image-allocations.json'))),reviewSha256:hash(fs.readFileSync(path.join(dir,'photo-review.json'))),complexes:[],listings:[],sources:[],inventory:[],patches:{listings:[],complexes:[]},skipped:[],inventoryStart:'2026-10-09',inventoryDays:91};
 const manifest=require('../cloudinary-images.json'),assets=new Map(Object.values(manifest.assets).filter(x=>x.state==='verified').map(x=>[x.secureUrl,x]));const used=new Set();
 const allocation=key=>Object.values(stage.allocations).flatMap(a=>a.photos.filter(x=>(review.photoAssignments?.[x.publicId]||a.id)===key&&!excluded.has(x.publicId))).sort((a,b)=>Number(b.publicId===review.primaryPhotos?.[key])-Number(a.publicId===review.primaryPhotos?.[key]));
 const urls=photos=>photos.map(p=>{assert.ok(assets.has(p.secureUrl));assert.ok(!used.has(p.optimizedSha256),'Images cannot be shared across records');used.add(p.optimizedSha256);return p.secureUrl;});
 function provenance(recordType,recordId,p,item,photos){plan.sources.push({recordType,recordId,sourceId:item?.key||p.sourceId,sourceUrl:item?.sourcePage||p.sourceUrl,verifiedAt:item?.checkedAt||p.checkedAt,verificationKind:'PUBLISHER_ITEM_BINDING_AND_VISUAL_PHOTOGRAPH_REVIEW',commerceKind:'SIMULATED_HOST_TEST_INVENTORY',facts:{establishmentName:p.name,complexKind:p.complexKind,address:p.address,locationSource:p.locationSource,itemName:item?.name,category:item?.kind,subCategory:item?.subCategory,venue:item?.venue,publishedHours:item?.publishedHours,includedInAdmission:item?.includedInAdmission||false},photos});}
 for(let n=0;n<source.properties.length;n++){
  const p=source.properties[n],owner=p.complexKind==='MOBILE_PROVIDER'?personal[n%personal.length]:enterprise[n%enterprise.length],parent=allocation(p.sourceId);
  if(p.complexKind!=='MOBILE_PROVIDER'&&!parent.length){plan.skipped.push({name:p.name,reason:'No reviewed unique parent photograph; children cannot be published as detached park services'});continue;}
  const complexId=p.complexKind==='MOBILE_PROVIDER'?null:id('complex:'+p.sourceId);
  const listings=[];
  for(const rawItem of p.items){const item={...rawItem,name:review.nameOverrides?.[rawItem.key]||rawItem.name.replace(/^\d+\s+/, '').split(/\s+[–—]\s+/)[0]};const photos=allocation(item.key);if(!photos.length){plan.skipped.push({name:p.name+' — '+item.name,reason:'No reviewed unique item photograph'});continue;}
   const galleryUrls=urls(photos),listingId=id('listing:'+item.key);let attributes,priceUnit,basePrice,description;
   if(item.kind==='STAY'){
    assert.ok(item.areaSquareMeters,'Do not invent published room dimensions');attributes={categoryType:'STAY',galleryUrls,amenities:item.amenities||[],stayDetail:{propertyType:'hotel',roomSizeSqM:item.areaSquareMeters,maxGuests:item.maxGuests,bedrooms:1,beds:item.name==='Deluxe Triple'?[{type:'queen',quantity:1},{type:'single',quantity:1}]:[{type:item.bedType,quantity:item.bedQuantity}],bathrooms:1},policies:{checkInTime:'14:00',checkOutTime:'12:00',allowPets:null,allowSmoking:false,partyAllowed:null}};priceUnit='PER_NIGHT';basePrice=950000;description=`${item.name} tại ${p.name}. Phòng ${item.areaSquareMeters} m², dành cho ${item.maxGuests} khách; thông tin phòng và giường được đối chiếu theo trang cơ sở. Các thông số đặt phòng khác và giờ nhận/trả đang dùng để kiểm thử, cần xác nhận trực tiếp với khách sạn.`;
   }else if(item.kind==='EXP'){
    attributes={categoryType:'EXP',galleryUrls,expDetail:{durationMinutes:120,difficulty:null,languages:['Tiếng Việt'],groupSize:{min:1,max:6},meetingPoint:p.address+'; xác nhận cổng vào và điểm hẹn với đơn vị vận hành',meetingPointLat:p.latitude,meetingPointLng:p.longitude},inclusions:[],exclusions:['Phí và điều kiện ngoài nội dung được đơn vị vận hành xác nhận'],itinerary:[]};priceUnit='PER_PAX';basePrice=200000;description=`${item.name} là hạng mục tham quan hoặc hoạt động được ${p.name} công bố. Hoạt động nằm trong khu du lịch, được quản lý cùng các dịch vụ của khu trên GoTravel. Kiểm tra giới hạn độ tuổi/chiều cao, sức khỏe, giờ vận hành và tình trạng hoạt động trước khi tham gia.`;
    if(item.includedInAdmission)description+=' Hạng mục có thể được bao gồm trong vé vào cổng hoặc vé theo phân khu; giá trên GoTravel là giá kiểm thử cho bản ghi này, không phải xác nhận hạng mục được bán vé riêng.';
   }else{
    attributes={categoryType:'SVC_'+item.subCategory,galleryUrls,logistics:{serveAtClientLocation:!!item.serveAtClientLocation,maxTravelRadiusKm:item.serveAtClientLocation?20:0},serviceDetail:svcDetail(item)};priceUnit:['SPA','MASSAGE','MAKEUP','HAIR_STYLING','TRAINING','PHOTOGRAPHY'].includes(item.subCategory)?'PER_HOUR':'PER_PAX';basePrice=250000;description=`${item.name} — dịch vụ được ${p.name} công bố.${complexId?' Dịch vụ nằm trong khuôn viên hoặc phân khu của '+p.name+'.':' Nhà cung cấp phục vụ theo địa điểm thỏa thuận; tọa độ trên bản đồ chỉ là mốc tham khảo khu vực Hội An, không phải địa chỉ cửa hàng.'} Xác nhận phạm vi phục vụ, nội dung gói, thời lượng, số người và các khoản đi kèm trước khi đặt.`;
   }
   description+=`\n\nĐịa điểm: ${p.address}.${item.venue?' Khu vực trong cơ sở: '+item.venue+'.':''}${item.publishedHours?' Giờ công bố tại thời điểm kiểm tra: '+item.publishedHours+'.':''}\nNguồn thông tin và ảnh: ${item.sourcePage}.\n\n${note}`;
   const listing={id:listingId,hostId:owner.id,complexId,title:p.name+' — '+item.name,description,category:item.kind,subCategory:item.kind==='SVC'?item.subCategory:'NONE',province:p.province,basePrice,priceUnit,latitude:p.latitude,longitude:p.longitude,thumbnailUrl:galleryUrls[0],attributes,status:'ACTIVE',averageRating:0,totalReviews:0};assert.ok(listing.title.length<=255);listings.push(listing);provenance('listings',listingId,p,item,photos);
  }
  if(!listings.length)continue;
  if(complexId){const galleryUrls=urls(parent);plan.complexes.push({id:complexId,hostId:owner.id,name:p.name,description:`${p.name} là tổ hợp du lịch, vui chơi hoặc nghỉ dưỡng có các hạng mục được công bố và liệt kê riêng. Các trải nghiệm, dịch vụ tiện ích và phòng nghỉ nếu có được gắn trực tiếp vào tổ hợp này; không tạo phòng nghỉ cho công viên không công bố dịch vụ lưu trú.\n\nĐịa điểm: ${p.address}. Nguồn: ${p.sourceUrl}.\n\n${note}`,province:p.province,latitude:p.latitude,longitude:p.longitude,thumbnailUrl:galleryUrls[0],galleryUrls,status:'ACTIVE'});provenance('complexes',complexId,p,null,parent);}
  plan.listings.push(...listings);
 }
 for(const l of plan.listings)plan.inventory.push({id:id('inventory:'+l.id),listingId:l.id,category:l.category,isActive:true,scheduleConfig:l.category==='STAY'?{defaultQuantity:2,timeSlots:[]}:{defaultQuantity:0,timeSlots:[{slot:'09:00',quantity:l.category==='EXP'?6:4},{slot:'14:00',quantity:l.category==='EXP'?6:4}]}});
 // Hide only excess imported seed rows. Existing orders and inventory quantities
 // are never rewritten; every listing referenced by an order remains visible.
 const c=await connect('CatalogandListing'),o=await connect('CartandOrder'),b=await connect('BookingandInventory');try{
  const pinned=new Set((await o.query('SELECT DISTINCT listing_id FROM order_items')).rows.map(x=>x.listing_id));
  for(const r of (await b.query("SELECT DISTINCT c.listing_id FROM inventory_locks l JOIN inventory_calendars c ON c.id=l.inventory_calendar_id WHERE l.expires_at>now() AND l.lock_status='LOCKED'")).rows)pinned.add(r.listing_id);
  const existing=(await c.query("SELECT l.*,md5(to_jsonb(l)::text) fingerprint FROM listings l JOIN seed_record_provenance p ON p.record_id=l.id AND p.record_type='listings' WHERE l.status='ACTIVE' AND l.title ILIKE '%Mường Thanh%' AND p.origin='real-public-facts-virtual-test-operator' ORDER BY l.province,l.title,l.id")).rows;
  const parents=(await c.query("SELECT c.*,md5(to_jsonb(c)::text) fingerprint FROM complexes c WHERE c.status='ACTIVE' AND c.name ILIKE '%Mường Thanh%' ORDER BY c.province,c.name")).rows;
  const keep=new Set(existing.filter(x=>pinned.has(x.id)).map(x=>x.id));
  for(const province of [...new Set(existing.map(x=>x.province))]){const ps=parents.filter(x=>x.province===province);const pinnedParent=ps.find(p=>existing.some(x=>x.complex_id===p.id&&pinned.has(x.id)));const parent=pinnedParent||ps.find(p=>existing.filter(x=>x.complex_id===p.id&&x.category==='STAY').length>=2)||ps[0];if(!parent)continue;
   const rows=existing.filter(x=>x.complex_id===parent.id);const rooms=rows.filter(x=>x.category==='STAY').sort((a,b)=>Number(!/deluxe|superior/i.test(a.title))-Number(!/deluxe|superior/i.test(b.title))||a.title.localeCompare(b.title));for(const r of rooms.slice(0,2))keep.add(r.id);
   for(const sub of ['PREPARED_MEALS','SPA']){const r=rows.find(x=>x.sub_category===sub);if(r)keep.add(r.id);}
  }
  plan.pinnedExistingListingIds=[...pinned].filter(id=>existing.some(x=>x.id===id));
  plan.patches.listings=existing.filter(x=>!keep.has(x.id)).map(x=>({id:x.id,previousStatus:x.status,status:'HIDDEN',fingerprint:x.fingerprint,title:x.title,province:x.province,category:x.category,reason:'Reduce over-represented seed brand; retain representative room/utility variants per province'}));
  const activeByParent=(await c.query("SELECT complex_id,array_agg(id) ids FROM listings WHERE status='ACTIVE' AND complex_id IS NOT NULL GROUP BY complex_id")).rows;const hidden=new Set(plan.patches.listings.map(x=>x.id));
  plan.patches.complexes=parents.filter(p=>activeByParent.find(x=>x.complex_id===p.id)?.ids.every(id=>hidden.has(id))).map(p=>({id:p.id,previousStatus:p.status,status:'HIDDEN',fingerprint:p.fingerprint,name:p.name,reason:'No remaining visible child listings after seed curation'}));
 }finally{await Promise.all([c.end(),o.end(),b.end()]);}
 assert.ok(plan.complexes.length>=10);assert.ok(plan.listings.length>=100);assert.ok(plan.listings.some(x=>x.category==='STAY')&&plan.listings.some(x=>x.subCategory==='PHOTOGRAPHY'));
 save(path.join(dir,'plan.json'),plan);console.log(JSON.stringify({newListings:plan.listings.length,newComplexes:plan.complexes.length,categories:Object.fromEntries(['STAY','EXP','SVC'].map(k=>[k,plan.listings.filter(x=>x.category===k).length])),hideListings:plan.patches.listings.length,hideComplexes:plan.patches.complexes.length,photos:used.size,pinnedExisting:plan.pinnedExistingListingIds.length,skipped:plan.skipped.length}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={batchId,main};
