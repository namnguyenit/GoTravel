// Reviewed publisher pages, with separately matched property coordinates.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load}=require('cheerio');const {save}=require('./research');
const {extract,getHtml}=require('./collect-official');
const dir=__dirname,cache=path.join(dir,'.cache','supplemental');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function doc(file){const v=JSON.parse(fs.readFileSync(path.join(cache,file+'.json')));const html=v.rawHtml||v.html;if(!html)throw Error('No source body: '+file);return {v,$:load(html),url:v.metadata.sourceURL,checkedAt:v.metadata?.scrapeId?new Date().toISOString():null};}
function images($,box){return [...new Set(box.find('img').addBack('img').map((_,e)=>{
  let u=$(e).attr('data-original')||$(e).attr('data-src')||$(e).attr('src')||'';if(u.startsWith('/')&&$(e).attr('data-original'))u='https://songtienhotel.tiengiangtourist.com'+u;
  if(!/^https:\/\//.test(u)||! /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(u)||/logo|icon|flag|badge|star\d/i.test(u))return null;
  if(/adamohotelhungyen.com/.test(u))u=u.replace(/\/thumbs\/\d+x\d+x\d\//,'/');
  if(/dam.melia.com/.test(u))u=u.split('?')[0];return u;
}).get().filter(Boolean))];}
const text=x=>String(x||'').replace(/\s+/g,' ').trim();
function cards(d,selector,kind='STAY'){
 const {$,url,checkedAt}=d,out=[];
 for(const e of $(selector).toArray()){
  const h=$(e),name=text(h.text());if(!name||out.some(x=>x.name===name))continue;
  const box=h.parents().filter((_,p)=>$(p).find('h1,h2,h3,h4').length===1&&images($,$(p)).length>0).first();
  if(!box.length)continue;const photos=images($,box);if(!photos.length)continue;
  const facts=text(box.text());const area=Number(facts.match(/([\d,.]+)\s*m[²2]/)?.[1]?.replace(',','.'))||null;
  out.push({name,images:photos,areaSquareMeters:area,amenities:[],quotedPrice:null,sourcePage:url,checkedAt,sourceVerification:'named_publisher_card_binds_photo_to_item',kind});
 }return out;
}
function linkedCards(d,pattern){const {$,url,checkedAt}=d,out=[];for(const e of $('a[href]').toArray()){
 const a=$(e),href=a.attr('href');if(!pattern.test(href))continue;const img=a.find('img');if(!img.length)continue;
 const peers=$('a[href]').filter((_,x)=>$(x).attr('href')===href);const name=text(peers.map((_,x)=>$(x).text()).get().filter(x=>x.trim()&&!/^(read more|see more|xem thêm)$/i.test(x.trim()))[0]||img.first().attr('alt')||href.split('/').filter(Boolean).pop().replace(/-/g,' '));
 const photos=images($,a);if(!name||!photos.length||out.some(x=>x.sourcePage===href))continue;
 out.push({name,images:photos,areaSquareMeters:null,amenities:[],quotedPrice:null,sourcePage:href,sourceBindingPage:url,checkedAt,sourceVerification:'named_publisher_link_binds_photo_to_item'});
 }return out;}
async function main(){
 const coordinates=JSON.parse(fs.readFileSync(path.join(cache,'gap-coordinates.json'))).data.alexandria;
 const config=[
  {key:'de-la-coupole',name:'Hotel de la Coupole Sapa',province:'Lào Cai',coord:1,home:'gap-home-4',rooms:'supplemental-0',roomPattern:/rooms-and-suites\/.+\//,hotelPhotos:/\/2026\/.+(?:Overview|Lobby)/i},
  {key:'nikko-haiphong',name:'Hotel Nikko Hai Phong',province:'Hải Phòng',coord:0,home:'supplemental-1',roomPattern:/\/accommodation\/(?:club|suite|executive-suite|deluxe|premier)$/,hotelPhotos:/dji-0128/,servicePattern:/\/dining\/(?:hishou-restaurant|la-brasserie)$/},
  {key:'songtien',name:'Khách sạn Sông Tiền',province:'Đồng Tháp',coord:2,home:'supplemental-2',roomPattern:/\/dat-phong\/.+\.html$/,hotelPhotos:/\/gioi-thieu\//},
  {key:'melia-tayninh',name:'Meliá Vinpearl Tay Ninh',province:'Tây Ninh',coord:3,home:'supplemental-3',rooms:'gap-home-5',selector:'article h3',hotelPhotos:/rE89x3aGMZJQCA4oRV4E/},
  {key:'mayplaza',name:'May Plaza Hotel',province:'Thái Nguyên',coord:4,home:'item-source-0',rooms:'item-source-0',selector:'h3',hotelPhotos:/\/11\.RGB_color/,services:[['item-source-2','Massage Spa May Plaza','SPA'],['item-source-3','Nhà hàng May Plaza','PREPARED_MEALS']]},
  {key:'adamo-hungyen',name:'Adamo Hotel Hưng Yên',province:'Hưng Yên',coord:5,home:'gap-home-1',rooms:'item-source-4',selector:'.box_pro_dt h3',hotelPhotos:/\/upload\/photo\/thiet-ke-chua-co-ten/,services:[['item-source-5','Lux Spa — Adamo Hotel','SPA'],['item-source-6',"Nhà hàng L’amore — Adamo Hotel",'PREPARED_MEALS']]},
  {key:'aurora-dongnai',name:'Aurora Hotel Plaza',province:'Đồng Nai',coord:6,home:'gap-home-2',rooms:'item-source-7',selector:'.room-card-glass h3',hotelPhotos:/\/hero-banner\/aurora-hotel-bien-hoa-[12]\.jpg/,services:[['item-source-8','Aurora Restaurant','PREPARED_MEALS']]}
 ];const properties=[];
 for(const cfg of config){const c=coordinates[cfg.coord]?.data;if(!c?.latitude||!c?.longitude)throw Error('Missing independently matched coordinates: '+cfg.key);const home=doc(cfg.home),roomPage=doc(cfg.rooms||cfg.home);
  const rooms=(cfg.selector?cards(roomPage,cfg.selector):linkedCards(roomPage,cfg.roomPattern)).filter(x=>!/honeymoon/i.test(x.name));
  const hotelImages=images(home.$,home.$('body')).filter(x=>cfg.hotelPhotos.test(x));
  const services=[];
  if(cfg.servicePattern)for(const r of linkedCards(home,cfg.servicePattern))services.push({...r,subCategory:'PREPARED_MEALS',sourceSummary:'',facts:[]});
  for(const [file,name,subCategory]of cfg.services||[]){const d=doc(file);let xs;
    if(cfg.key==='mayplaza')xs=images(d.$,d.$('.entry-content'));
    else if(cfg.key==='adamo-hungyen')xs=images(d.$,d.$('.hinh_pro_dt').first());
    else xs=[...new Set((d.v.rawHtml||d.v.html).match(/https:\/\/aurorahotelplaza.com\/assets\/img\/restaurant\/[^\s"'<>]+\.(?:jpg|png|webp)/g)||[])];
    if(xs?.length)services.push({name,subCategory,images:xs,sourceSummary:'',facts:[],sourcePage:d.url,checkedAt:d.checkedAt});
  }
  if(cfg.key==='melia-tayninh')for(const r of cards(doc('melia-restaurants'),'main h3'))if(r.name==='Garbo 986')services.push({...r,subCategory:'PREPARED_MEALS',sourceSummary:'',facts:[]});
  if(cfg.key==='de-la-coupole'||cfg.key==='songtien'){
    const d=doc('service-gap-'+(cfg.key==='de-la-coupole'?0:1));
    const pattern=cfg.key==='de-la-coupole'?/https:\/\/(?:www.hoteldelacoupole.com|d2e5ushqwiltxm.cloudfront.net)\/[^\s"'<>\\]+(?:Spa|3254|1805|1578|1598)[^\s"'<>\\]*\.(?:jpg|png)/g:/https:\/\/songtienhotel.tiengiangtourist.com\/uploads\/dich-vu\/spa\/[^\s"'<>\\]+\.(?:jpg|png)/g;
    const xs=[...new Set((d.v.rawHtml||d.v.html).match(pattern)||[])];
    if(xs.length)services.push({name:cfg.key==='de-la-coupole'?'Nuages Spa':'Sông Tiền Spa & Massage',subCategory:'SPA',images:xs,sourceSummary:'',facts:[],sourcePage:d.url,checkedAt:d.checkedAt});
  }
  properties.push({sourceId:'publisher:'+cfg.key,name:cfg.name,address:c.address,province:cfg.province,latitude:c.latitude,longitude:c.longitude,coordinateBasis:'matched_Booking_property_record',locationSource:c.source_url,addressSource:c.source_url,sourceUrl:home.url,sourcePublisher:cfg.name,ward:null,images:hotelImages,rooms,services,checkedAt:home.checkedAt,sourceVerification:'official_publisher_named_items_with_independent_property_coordinate_match',partnershipStatus:'not_established'});
 }
 const pc=JSON.parse(fs.readFileSync(path.join(cache,'supplemental-coordinates.json'))).data.alexandria[1].data;
 const pottery=doc('gap-home-3');const rooms=[['Double Bedroom with Garden View','double-bedroom',20,2,873000],['Triple Bedroom with Garden View','triple-bedroom',25,3,985000],['King Room with Garden View','king-room',55,4,1560000]].map(([name,slug,area,maxGuests,quotedPrice])=>({name,images:['https://mekongpotteryhomestay.com/images/rooms/'+slug+'/main-room-view.webp'],areaSquareMeters:area,maxGuests,quotedPrice,amenities:['Bữa sáng','Xe đạp','Wi-Fi','Điều hòa','Phòng tắm riêng'],sourcePage:'https://mekongpotteryhomestay.com/rooms/',checkedAt:pottery.checkedAt}));
 const exp=[26,27,28].map(i=>{const d=doc('item-source-'+i);return {name:text(d.$('h1').first().text()),images:images(d.$,d.$('main')).filter(x=>x.includes('/images/tours/')),sourcePage:d.url,checkedAt:d.checkedAt,durationMinutes:i===26?150:i===27?240:180};});
 const cuisine=doc('pottery-service-0');const meals={name:'Bữa tối gia đình Mekong Delta',subCategory:'PREPARED_MEALS',images:images(cuisine.$,cuisine.$('body')).filter(x=>x.includes('/images/cuisine/')&&!x.includes('kombucha')),facts:[{name:'Hình thức phục vụ',value:'Bữa tối từ bếp gia đình; nguồn khuyến nghị đặt trước một ngày'},{name:'Món ăn công bố',value:'Tôm rim nước cốt dừa, thịt kho tàu, cá đồng kho tiêu và món chay'}],sourcePage:cuisine.url,checkedAt:cuisine.checkedAt};
 properties.push({sourceId:'publisher:mekong-pottery',name:'Mekong Pottery Homestay',province:'Vĩnh Long',address:pc.address,latitude:pc.latitude,longitude:pc.longitude,coordinateBasis:'matched_Booking_property_record',locationSource:pc.source_url,addressSource:pc.source_url,sourceUrl:pottery.url,sourcePublisher:'Mekong Pottery Homestay',ward:null,images:images(pottery.$,pottery.$('body')).filter(x=>x.includes('/images/home/hero-background')),rooms,services:[meals],experiences:exp,checkedAt:pottery.checkedAt,partnershipStatus:'not_established'});
 const input=JSON.parse(fs.readFileSync(path.join(dir,'official-establishments.json')));
 const lyson=input.rejected.find(x=>x.name==='Mường Thanh Holiday Lý Sơn');
 if(lyson){const c=JSON.parse(fs.readFileSync(path.join(cache,'supplemental-coordinates.json'))).data.alexandria[0].data;properties.push(extract(lyson,await getHtml(lyson.sourceUrl),{latitude:c.latitude,longitude:c.longitude,sourceUrl:c.source_url}));}
 for(const h of properties){input.establishments=input.establishments.filter(x=>x.sourceId!==h.sourceId);input.establishments.push(h);}input.supplementedAt=new Date().toISOString();save(path.join(dir,'official-establishments.json'),input);
 console.log(JSON.stringify({addedProperties:properties.length,provinceCount:new Set(input.establishments.map(x=>x.province)).size,items:properties.map(x=>({name:x.name,hotelPhotos:x.images.length,rooms:x.rooms.length,services:x.services.length,experiences:x.experiences?.length||0}))}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={cards,linkedCards,images};
