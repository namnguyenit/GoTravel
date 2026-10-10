const {fs,path,dir,save,hash,fold,clean,page,images}=require('./common');
const properties=[];
function property(key,name,province,latitude,longitude,address,locationSource,kind='TOURISM_COMPLEX'){
 const d=page(key);const p={sourceId:key,name,province,latitude,longitude,address,locationSource,complexKind:kind,sourceUrl:d.url,publisher:new URL(d.url).hostname,checkedAt:d.checkedAt,images:[],items:[]};properties.push(p);return {p,d};
}
function add(p,d,name,kind,box,extra={}){name=clean(name);const photos=images(d,box);if(!name||!photos.length)return;const key=p.sourceId+':'+kind+':'+hash(fold(name)).slice(0,16);if(p.items.some(x=>x.key===key))return;p.items.push({key,name,kind,subCategory:kind==='SVC'?'PREPARED_MEALS':'NONE',sourcePage:d.url,checkedAt:d.checkedAt,images:photos,verification:'publisher_named_card_or_section',...extra});}
function vin(config){const {p,d}=property(...config);const $=d.$;p.images=images(d,$('.tg_banner_hd'));for(const e of $('.food-card').toArray()){const box=$(e),name=clean(box.find('h3').text()),time=clean(box.find('.food-card__time').text());if(/đóng cửa/i.test(time)||/mua sắm|cửa hàng|kiosk|store|shop/i.test(name))continue;add(p,d,name,'SVC',box,{publishedHours:time,venue:clean(box.find('.food-card__place--text').text())});}
 for(const e of $('.top_special,.other-special__card').toArray()){const box=$(e);add(p,d,box.find('h4,h5').first().text(),'EXP',box,{experienceKind:'SHOW',includedInAdmission:true});}
 for(const e of $('.experience .slide-card').toArray()){const box=$(e);add(p,d,box.find('.slide-card_content_title').text(),'EXP',box,{experienceKind:'PARK_ZONE',includedInAdmission:true});}
 return p;
}
const configs=[
 ['vin-nt','VinWonders Nha Trang','Khánh Hòa',12.21635,109.241655,'Đảo Hòn Tre, Nha Trang, Khánh Hòa','Existing verified landmark: VinWonders Nha Trang'],
 ['vin-pq','VinWonders Phú Quốc','An Giang',10.337229,103.853907,'Bãi Dài, Gành Dầu, Phú Quốc, An Giang','Geoapify: VinWonders Phú Quốc'],
 ['vin-ha','VinWonders Nam Hội An','Đà Nẵng',15.7887796,108.4107881,'Bình Minh, Thăng Bình, Đà Nẵng (Quảng Nam cũ)','Geoapify: VinWonders Nam Hội An'],
 ['vin-ch','VinWonders Cửa Hội','Nghệ An',18.77433,105.7514225,'Cửa Hội, Nghệ An','Geoapify: VinWonder Cửa Hội'],
 ['vin-safari','Vinpearl Safari Phú Quốc','An Giang',10.3393964,103.8950113,'Gành Dầu, Phú Quốc, An Giang','Geoapify: Vinpearl Safari'],
 ['vin-grand','Grand World Phú Quốc','An Giang',10.32545,103.860079,'Bãi Dài, Gành Dầu, Phú Quốc, An Giang','Geoapify: Grand World Phú Quốc'],
 ['vin-vu-yen','VinWonders Vũ Yên','Hải Phòng',20.87264,106.74876,'Đảo Vũ Yên, Hải Phòng','Geoapify: VinWonders Vũ Yên'],
 ['vin-wave','VinWonders Wave Park & Water Park','Hưng Yên',20.9504241,105.9836369,'Vinhomes Ocean Park 2 và Ocean Park 3, Hưng Yên','Geoapify: Công viên nước Royal Wave Park; meeting point at Wave Park'],
];
for(const config of configs)vin(config);
// Horse Academy has its own management node, adjacent to the Vũ Yên park.
{const p=vin(['vin-horse','Vinpearl Horse Academy Vũ Yên','Hải Phòng',20.8732145,106.746369,'Đảo Vũ Yên, Hải Phòng','Geoapify: Vinpearl Horse Academy Vu Yen']);p.items=p.items.filter(x=>x.experienceKind!=='PARK_ZONE');const d=page('vin-horse');for(const e of d.$('.slide-card').toArray()){const q=d.$(e),text=clean(q.find('.slide-card_content_title').text());if(/giáo trình quốc tế/i.test(text))add(p,d,'Học cưỡi ngựa với huấn luyện viên','SVC',q,{subCategory:'TRAINING'});else if(/nghệ thuật bên các tuấn mã/i.test(text))add(p,d,'Chụp ảnh cùng ngựa','SVC',q,{subCategory:'PHOTOGRAPHY'});else if(/giáo trí giúp trẻ/i.test(text))add(p,d,'Tìm hiểu và chăm sóc ngựa dành cho trẻ','SVC',q,{subCategory:'TRAINING'});else if(/Tham quan Mái Nhà Ngựa Quý/i.test(text))add(p,d,'Tham quan Mái Nhà Ngựa Quý','EXP',q,{includedInAdmission:true});}}
// Sun World detail pages require rendered retrieval. Error pages are excluded.
const sunConfigs=[
 ['sun-bana-about','Sun World Bà Nà Hills','Đà Nẵng',15.9958569,107.9890712,'Bà Nà, Hòa Vang, Đà Nẵng','Geoapify: Sun World Bà Nà Hills'],
 ['sun-hl-about','Sun World Hạ Long','Quảng Ninh',20.9517962,107.0484638,'9 Hạ Long, Bãi Cháy, Quảng Ninh','https://maps.apple.com/place?place-id=I17187065CC87C288'],
 ['sun-thom','Sun World Hòn Thơm','An Giang',9.9564073,104.018169,'Đảo Hòn Thơm, Phú Quốc, An Giang','Geoapify: Sun World Hon Thom'],
 ['sun-hanam','Sun World Hà Nam','Ninh Bình',20.5697159,105.9452701,'Khu vực Hà Nam cũ, Ninh Bình','Geoapify: Sun World Hà Nam'],
 ['sun-fansipan-about','Sun World Fansipan Legend','Lào Cai',22.33474,103.8406191,'Khu du lịch Fansipan Legend, Sa Pa, Lào Cai','Geoapify: Sun World Fansipan Legend; meeting point at lower cable-car station'],
 ['sun-baden-about','Sun World Núi Bà Đen','Tây Ninh',11.381431,106.171175,'Khu du lịch Núi Bà Đen, Tây Ninh','Existing verified landmark: Khu du lịch Núi Bà Đen']
];
function article(d){const box=d.$('main div').filter((_,e)=>(d.$(e).attr('class')||'').includes('leading-8')&&d.$(e).find('p').length>0).first();if(box.length)return box;const h=d.$('h1').filter((_,e)=>clean(d.$(e).text())).first();return h.length?h.parent():d.$('.entry-content');}
for(const config of sunConfigs){try{const {p,d}=property(...config);p.images=images(d,article(d)).filter(x=>!/shutterstock/i.test(x));}catch{}}
const parkFromUrl=u=>u.includes('/banahills/')?'sun-bana-about':u.includes('/ha-long/')?'sun-hl-about':u.includes('/hon-thom/')?'sun-thom':u.includes('/fansipan/')?'sun-fansipan-about':u.includes('/ba-den/')?'sun-baden-about':null;
for(const file of fs.readdirSync(path.join(dir,'.cache/pages')).filter(x=>/^sun-item-\d+\.json$/.test(x))){const d=page(file.slice(0,-5));if(/Bạn đã bị lạc/.test(d.data.markdown||''))continue;const p=properties.find(x=>x.sourceId===parkFromUrl(d.url));if(!p)continue;const box=article(d);const name=clean(d.$('h1').first().text());if(!name)continue;add(p,d,name,/Trú Vũ Trà Quán|Rain Sheltering Teahouse/i.test(name)?'SVC':'EXP',box,{includedInAdmission:true});}
function sections(key,parent,kind='EXP',subCategory='NONE',matcher=()=>true){const p=properties.find(x=>x.sourceId===parent),d=page(key);if(!p)return;const box=article(d),$=d.$;for(const e of box.find('h2,h3').toArray()){const h=$(e),name=clean(h.text());if(!matcher(name))continue;const section=h.add(h.nextUntil('h2,h3'));add(p,d,name,kind,section,{subCategory,includedInAdmission:kind==='EXP'});}}
sections('sun-thom-games','sun-thom','EXP','NONE',name=>/^4\./.test(name));
sections('sun-hl-games','sun-hl-about','EXP','NONE',name=>/^2\.[1-4]\./.test(name)||/^3\.[1-7]\./.test(name));
sections('sun-bana-restaurant','sun-bana-about','SVC','PREPARED_MEALS',name=>/^1\.[1-6]/.test(name));
sections('sun-thom-food','sun-thom','SVC','PREPARED_MEALS',name=>/nhà hàng|Golden Beans|Slice|Sunny|Coconut|Panorama/i.test(name));
// Named article photograph captions can document attractions, but unnamed
// decorative photos cannot create arbitrary new rides or future developments.
for(const key of ['sun-hanam','sun-fansipan-about','sun-baden-about']){const p=properties.find(x=>x.sourceId===key);if(!p)continue;const d=page(key),box=article(d);for(const e of box.find('img').toArray()){const q=d.$(e),name=clean(q.attr('alt'));if(/công viên|khu vực|gia đình|cáp treo|bản mây|tượng|chùa|tâm linh|vườn|thác/i.test(name))add(p,d,name,'EXP',q,{includedInAdmission:true});}if(p.items.length===0&&p.images.length>1)add(p,d,'Tham quan '+p.name,'EXP',box,{includedInAdmission:true});}
// Nui Than Tai: real room/bed variants and wellness facilities inside the park.
{const {p,d}=property('nui-than-tai','Công viên suối khoáng nóng Núi Thần Tài','Đà Nẵng',15.968587,108.017956,'Quốc lộ 14G, Hòa Vang, Đà Nẵng','https://maps.app.goo.gl/mKjGW7dYu9k9sygs6');const overview=page('ntt-water');p.images=images(overview,overview.$('.entry-content')).slice(-2);for(const e of d.$('.room-card h3').toArray()){const h=d.$(e),box=h.closest('.col-inner'),text=clean(box.text()),name=clean(h.text());add(p,d,name,'STAY',box,{areaSquareMeters:Number(text.match(/(?:phòng:|phòng\s*)\s*(\d+)\s*m/i)?.[1])||null,maxGuests:/Triple/i.test(name)?3:2,bedType:/Twin/i.test(name)?'single':'queen',bedQuantity:/Twin/i.test(name)?2:1,amenities:['Hồ bơi ngoài trời','Nhà hàng','Ăn sáng','Nước khoáng nóng']});}
 const entries=[['ntt-bath','Tắm bùn khoáng','SPA'],['ntt-onsen','Tắm Onsen Nhật Bản','SPA'],['ntt-wine','Tắm rượu vang','SPA'],['ntt-coffee','Tắm cà phê','SPA'],['ntt-green-tea','Tắm trà xanh','SPA'],['ntt-milk','Tắm sữa','SPA'],['ntt-phoenix','Nhà hàng Phượng Hoàng','PREPARED_MEALS'],['ntt-dragon','Nhà hàng Rồng Đỏ','PREPARED_MEALS'],['ntt-bbq','BBQ Buffet','PREPARED_MEALS'],['ntt-water','Công viên nước','NONE']];for(const [key,name,sub]of entries){try{const d=page(key);if(/không tìm thấy|not found/i.test(d.data.markdown||''))continue;add(p,d,name,sub==='NONE'?'EXP':'SVC',d.$('.entry-content'),{subCategory:sub,includedInAdmission:sub==='NONE'});}catch{}}
}
// I-Resort: do not attach Ibala hotel's off-site packages to this complex.
{const {p,d}=property('iresort','Suối khoáng nóng I-Resort Nha Trang','Khánh Hòa',12.2731916,109.1757778,'Tổ 19, thôn Xuân Ngọc, phường Tây Nha Trang, Khánh Hòa','https://maps.app.goo.gl/u8reARNsGvi7xfqv5');p.images=images(d,d.$('img[src*="Sliders"]')).slice(0,3);const names=new Set();for(const e of d.$('a[title]').toArray()){const a=d.$(e),name=clean(a.attr('title'));if(!/tắm khoáng|thảo dược|suối khoáng|mud house|bùn khoáng|I-Combo/i.test(name)||names.has(fold(name)))continue;names.add(fold(name));add(p,d,name,'SVC',a,{subCategory:'SPA',sourcePage:new URL(a.attr('href'),d.url).href});}
 const extra=[['iresort-spa-real','Massage và chăm sóc cơ thể I-Resort','MASSAGE'],['iresort-food','Ẩm thực trong khuôn viên I-Resort','PREPARED_MEALS'],['iresort-events','Gala dinner và tiệc tại I-Resort','CATERING']];for(const [key,name,sub]of extra){try{const s=page(key);if(/404|not found/i.test(s.data.metadata?.title||''))continue;add(p,s,name,'SVC',s.$('main').length?s.$('main'):s.$('body'),{subCategory:sub});}catch{}}
}
// Mobile providers use a city reference point, not an invented business address.
{const {p,d}=property('provider-photographer','Hoi An Photographer','Đà Nẵng',15.88006,108.33804,'Phục vụ tại Hội An; điểm chụp được thỏa thuận với nhà cung cấp','Service area on publisher website; city reference point','MOBILE_PROVIDER');for(const e of d.$('a.hn-cat').toArray()){const q=d.$(e);const name=clean(q.text()).replace(/View gallery/i,'');add(p,d,'Chụp ảnh '+({Wedding:'cưới',Family:'gia đình',Couple:'cặp đôi',Solo:'chân dung cá nhân',Proposal:'cầu hôn'}[name]||name),'SVC',q,{subCategory:'PHOTOGRAPHY',serveAtClientLocation:true});}}
{const {p,d}=property('provider-makeup','Makeup Hoi An','Đà Nẵng',15.88006,108.33804,'Phục vụ tại Hội An và Đà Nẵng; địa điểm được thỏa thuận với nhà cung cấp','Service area on publisher website; city reference point','MOBILE_PROVIDER');for(const e of d.$('.amh-service').toArray()){const q=d.$(e),name=clean(q.find('h3').text());add(p,d,name,'SVC',q,{subCategory:/Hair/i.test(name)?'HAIR_STYLING':'MAKEUP',serveAtClientLocation:true});}}
// Missing images and error pages remain in research only, never in published DB.
for(const p of properties){p.images=[...new Set(p.images)];for(const x of p.items){x.images=[...new Set(x.images)];x.name=x.name.replace(/^\d+(?:\.\d+)*[.)]\s*/,'');}}
save(path.join(dir,'official-catalog.json'),{schemaVersion:1,checkedAt:new Date().toISOString(),properties});
console.log(JSON.stringify({properties:properties.length,items:properties.reduce((n,p)=>n+p.items.length,0),byProperty:properties.map(p=>({name:p.name,parentPhotos:p.images.length,items:p.items.length,EXP:p.items.filter(x=>x.kind==='EXP').length,SVC:p.items.filter(x=>x.kind==='SVC').length,STAY:p.items.filter(x=>x.kind==='STAY').length}))}));
