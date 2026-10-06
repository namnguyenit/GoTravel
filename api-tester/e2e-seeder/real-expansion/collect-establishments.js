// Each recipe is reviewed against a publisher page, never a bulk POI import.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const H=require('./helpers');const {dir,page,images,linkCards,headingCards,clean,fold,save}=H;
const geo=require('./geo-accommodations.json').flatMap(x=>x.results).concat(require('./geo-banme.json').results,require('./geo-babe.json').results);
const old=require('../real-catalog/official-establishments.json').establishments;
const result={schemaVersion:1,checkedAt:new Date().toISOString(),establishments:[],excluded:[
 {name:'The Mira Central Park',reason:'Publisher HTML contains unrelated injected SEO/spam; room details inaccessible. Not used as an authoritative source in this batch.'},
 {name:'Nam Cường Hải Dương',reason:'Candidate page resolves to a Nam Định hotel; photographs cannot establish the Hải Dương property.'},
 {name:'Beau Champ Villa',reason:'Heading extractor binds icons instead of villa photographs; excluded pending manual gallery review.'}
]};
const pics=(key,regex)=>{const d=page(key);return images(d,d.$('body')).filter(x=>regex.test(decodeURIComponent(x)));};
function item(key,name,regex,extra={}){const d=page(key);return {name,sourcePage:d.url,images:pics(key,regex),checkedAt:d.checkedAt,amenities:[],sourceVerification:'reviewed_named_publisher_page_or_card_binds_exact_item',...extra};}
function venue(key,name,province,address,geoName,config={}){
 const d=page(key);const point=geoName?geo.find(x=>fold(x.name)===fold(geoName)):null;
 assert.ok(point||config.coordinate,'A precise property coordinate is required: '+name);
 const v={sourceId:'publisher:'+key,name,province,address,latitude:point?.lat||config.coordinate.lat,longitude:point?.lon||config.coordinate.lon,
 sourceUrl:d.url,sourcePublisher:name+' — website/cổng thông tin đơn vị công bố',checkedAt:d.checkedAt,
 coordinateBasis:point?'Geoapify named OSM accommodation POI corroborated by publisher address':'Publisher map iframe coordinate',
 coordinateSource:point?{name:point.name,placeId:point.place_id,datasource:point.datasource,formatted:point.formatted}:config.coordinate,
 images:[],rooms:[],services:[],experiences:[],...config};delete v.coordinate;
 assert.ok(!old.some(x=>fold(x.name)===fold(name)),'Previously imported property');result.establishments.push(v);return v;
}
function roomDetails(key,name,pattern){const d=page(key);const body=d.$('body').clone();body.find('script,style,nav,footer,header').remove();const text=clean(body.text());return item(key,name||clean(d.$('h1').first().text()),pattern,{areaSquareMeters:Number(text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i)?.[1]?.replace(',','.'))||null});}
function main(){
 let h=venue('saigonvinhlong','Khách sạn Sài Gòn Vĩnh Long','Vĩnh Long','02 Trưng Nữ Vương, phường Long Châu, Vĩnh Long','Khách sạn Sài Gòn - Vĩnh Long');
 h.images=pics('saigonvinhlong',/Imgup-201901240751472/);
 for(const [key,name,re]of [['suite','Suite Room',/\/Suite[^/]*\.jpg/i],['grand','Grand Deluxe',/\/(Grand|Grand-DLX)[^/]*\.jpg/i],['deluxe','Deluxe Room',/\/Deluxe[^/]*\.jpg/i],['superior','Superior Room',/\/Superior[^/]*\.jpg/i]])h.rooms.push(roomDetails('saigonvl-'+key,name,re));
 h.services=[item('saigonvl-restaurant','Mekong Restaurant',/\/Buffet[^/]*\.jpg/i,{subCategory:'PREPARED_MEALS'}),item('saigonvl-spa','Hotel Spa',/\/1785307817\d+[^/]*\.jpg/,{subCategory:'SPA'})];
 h=venue('diamondstarbentre','Diamond Stars Bến Tre','Vĩnh Long','140 Hùng Vương, phường An Hội, Vĩnh Long','Diamond Star Hotel');
 h.images=pics('diamondstarbentre',/ho_boi_vo_cuc\.jpg/);
 h.rooms=linkCards(page('diamondstarbentre'),/deluxe|suite|superior/).filter(x=>/vnt_upload\/product/.test(x.images[0]));
 h.services=[item('diamondstar-restaurant','Nhà hàng Diamond Stars',/vnt_upload\/restaurant.*\(1000x670\)/,{subCategory:'PREPARED_MEALS'}),item('diamondstar-spa','Spa & Massage',/vnt_upload\/service\/07_2020\/(?:slide|s[1-4])\.jpg/,{subCategory:'SPA'})];
 h=venue('konklor','Konklor Bungalow Garden Hotel','Quảng Ngãi','38 Bắc Kạn, khu vực Kon Tum, Quảng Ngãi','Konklor Hotel');
 h.images=pics('konklor',/168965113[78]/);
 h.rooms=linkCards(page('konklor'),/phong-gia-dinh|phong-giuong-doi-sang|phong-standar-double|phong-superior-bungalow-garden-sang-trong$/).filter(x=>!x.images.some(u=>u.includes('/small/')));
 h=venue('habana','Habana Hotel Thái Nguyên','Thái Nguyên','318 Quang Trung, khu vực Tân Thịnh, Thái Nguyên','Khách sạn Habana Thái Nguyên');
 h.rooms=headingCards(page('habana'),'h3').filter(x=>/room$/i.test(x.name));h.images=pics('habana',/z6446723664704_b14eb16d75f3e30e1a1bdad100ca5d1a\.jpg/);
 // These are separate hotels. The publisher explicitly groups cards by CL/LX/DX.
 const dx=linkCards(page('dongxuyen'),/\/phong\//);
 for(const [suffix,name,geoname]of [['CL','Khách sạn Cửu Long','Cuu Long'],['LX','Khách sạn Long Xuyên','Long Xuyen'],['DX','Khách sạn Đông Xuyên','Dong Xuyen']]){
  h=venue('dongxuyen',name,'An Giang','Cụm khách sạn Đông Xuyên, 9A Lương Văn Cù, khu vực Long Xuyên, An Giang',geoname);h.sourceId+=':'+suffix;
  h.rooms=dx.filter(x=>x.images.some(u=>new RegExp('-'+suffix+'-').test(u)));
  for(const r of h.rooms){const index=dx.indexOf(r),detail=page('dongxuyen-detail-'+index);const base=new URL(r.images[0]).pathname.split('/').pop().replace(/-\d+x\d+\./,'.');r.images=images(detail,detail.$('body')).filter(u=>new URL(u).pathname.split('/').pop().replace(/-\d+x\d+\./,'.')===base);r.sourcePage=detail.url;}
 }
 h=venue('saigonrachgia','Khách sạn Sài Gòn Rạch Giá','An Giang','844 Nguyễn Trung Trực, khu vực Rạch Giá, An Giang','Khách sạn Sài Gòn Rạch Giá');
 // A Geoapify candidate has an abbreviated name; retain independently reviewed point.
 h.coordinateBasis='Geoapify named accommodation candidate, matched to Rạch Giá publisher';h.rooms=headingCards(page('saigonrachgia'),'h4').filter(x=>/^PHÒNG /i.test(x.name));h.images=pics('saigonrachgia',/\/ab\/ks1\.jpg/);
 h=venue('phucuong','Khách sạn Phú Cường Cà Mau','Cà Mau','81 Phan Ngọc Hiển, khu vực phường 4, Cà Mau','Phu Cuong Hotel - Ca Mau');
 h.images=pics('phucuong',/catalog\/slider\/intro\/h[34]-/);h.rooms=headingCards(page('phucuong'),'h2.milenia-entity-title').filter(x=>/Superior|Deluxe|Family|Executive|Classy/i.test(x.name));
 const folder=[['Superior','Superior city view'],['Deluxe','Deluxe city view'],['Royal','Royal'],['Family','Family'],['Executive','Executive'],['Classy','Classy']];
 for(const r of h.rooms){const f=folder.find(([n])=>r.name.toLowerCase().includes(n.toLowerCase()));const suffix=/balcony/i.test(r.name)?'Executive balcony':f?.[1];if(suffix)r.images=r.images.filter(u=>decodeURIComponent(u).includes('/'+suffix+'/'));}
 h.services=headingCards(page('phucuong'),'h2.milenia-entity-title').filter(x=>/Nhà hàng/.test(x.name)).map(x=>({...x,subCategory:'PREPARED_MEALS'}));
 h=venue('ninhkieu','Ninh Kiều Riverside Hotel','Cần Thơ','02 Hai Bà Trưng, phường Ninh Kiều, Cần Thơ','Ninh Kiều Riverside Hotel');
 h.images=pics('ninhkieu-spa',/ninh-kieu-riverside-hotel-can-tho-exterior/);
 for(let n=0;n<11;n++){const key='ninhkieu-detail-'+n,d=page(key);h.rooms.push(item(key,clean(d.$('h2').first().text()),/\/uploads\/1662\/_room_.*height=1080/));}
 h.experiences=[item('ninhkieu-cruise','Du thuyền Ninh Kiều',/\/uploads\/1662\/.*(?:du_thuyn|cruise-|img_83)/,{durationMinutes:120})];
 // Exclude spa page: it uses a Pexels treatment photo alongside unverified imagery.
 result.excluded.push({name:'Spa Ninh Kiều',reason:'Publisher includes stock Pexels imagery. No imported spa offer from this page.'});
 h=venue('mekongriverside','Mekong Riverside Boutique Resort & Spa','Đồng Tháp','Hòa Quí, Hòa Khánh, khu vực Cái Bè, Đồng Tháp','Mekong Riverside Resort & Spa');
 h.coordinateBasis='Geoapify named accommodation candidate and publisher address';h.images=pics('mekongriverside',/_gallery_lake_at_night_time.*height=1080/);
 for(let n=4;n<12;n++){const key='extra-'+n,d=page(key);h.rooms.push(item(key,clean(d.$('h2').first().text()),/\/uploads\/1079\/_room_.*height=1080/));}
 h.services=[item('mekongriverside-spa','Oasis Spa',/\/uploads\/1079\/__page__oasis_spa_mrr_00[12]/,{subCategory:'SPA'})];
 h=venue('cocolodge','Coco Riverside Lodge','Vĩnh Long','Phú An, Trung Ngãi, Vĩnh Long','Coco Riverside Lodge');h.hostKind='HOST';h.images=pics('cocolodge',/\/Uploads\/Posts\/slide[126]/);
 h.rooms=[item('cocolodge-double','Double Room',/\/Uploads\/Posts\/(?:Double|P2-BED|toilet-p2)/),item('cocolodge-family','Family Bungalows',/\/Uploads\/Posts\/(?:Family|BEDp5)/),item('cocolodge-standard','Standard Room',/\/Uploads\/Posts\/(?:Standar|NOIBO)/)];
 h=venue('saigonbanme','Khách sạn Sài Gòn Ban Mê','Đắk Lắk','01–03 Phan Chu Trinh, phường Buôn Ma Thuột, Đắk Lắk','KS Sài Gòn Ban Mê');h.images=pics('saigonbanme',/\/saigon-banme(?:-hotel)?\.jpg/);
 for(let n=0;n<4;n++){const d=page('extra-'+n);const name=clean(d.$('h1').first().text())||['Suite','Superior','Triple','Deluxe'][n];h.rooms.push(roomDetails('extra-'+n,name,/\/uploads\/2019\/06\/DSC[^/]*-1170x600\.jpg/));}
 h.services=[item('saigonbanme-detail-1','Nhà hàng Sài Gòn Ban Mê',/\/uploads\/.*\.(?:jpg|png)$/,{subCategory:'PREPARED_MEALS'})];h.services[0].images=h.services[0].images.filter(u=>!/(bg-main|saigon-banme|log[o0]|button|popup)/i.test(u)).slice(0,6);
 h=venue('babelake','Ba Be Lake View Homestay','Thái Nguyên','Pác Ngòi, khu vực Ba Bể, Thái Nguyên','Lake View Homestay');h.hostKind='HOST';h.rooms=[item('extra-20','Deluxe private room with private bathroom and A/C',/\/deluxe-room[^/]*\.jpg/)];
 h=venue('saomai','Khách sạn Sao Mai Cao Lãnh','Đồng Tháp','178 Nguyễn Huệ, phường Cao Lãnh, Đồng Tháp',null,{coordinate:{lat:10.457502,lon:105.638458,sourcePage:page('saomai').url,selector:'hotel map iframe !2d105.638458 !3d10.457502'}});h.images=pics('saomai',/SM_BIA-1/);
 for(const [name,re,area]of [['Standard 1',/Standard-1-HINH/,27],['Standard 2',/Standard-2-HINH/,27],['Superior',/Superior-HINH/,null],['Deluxe',/DELUXE-HINH/,null],['Suite',/Suite-[12]-HINH/,62],['President',/president-DAI/,120]])h.rooms.push(item('saomai',name,re,{areaSquareMeters:area}));
 h.services=[item('saomai','Nhà hàng Sao Mai Hạnh Phúc 1',/KSSM_HP1/,{subCategory:'PREPARED_MEALS'}),item('saomai','Nhà hàng Sao Mai Hạnh Phúc 2',/SM_HP2/,{subCategory:'PREPARED_MEALS'})];
 h=venue('lila','Lila Inn & Tours','Tuyên Quang','Khu vực Hà Giang, Tuyên Quang; xác nhận địa chỉ đón khách với Lila Inn','Lila Inn & Tours');h.hostKind='HOST';
 for(let n=0;n<5;n++){const key='lila-detail-'+n,d=page(key);h.experiences.push(item(key,clean(d.$('h1').first().text()),/\/uploads\/.*(?:tour|loop).*(?:\.webp|\.jpg)$/i,{durationMinutes:[2880,4320,5760,7200,10080][n]}));}
 for(const h of result.establishments){assert.ok(h.latitude>8&&h.longitude>102);for(const field of ['rooms','services','experiences'])h[field]=h[field].filter(item=>{if(item.name&&item.sourcePage&&item.images.length)return true;result.excluded.push({name:h.name+' — '+item.name,reason:'No item-specific photograph found by the reviewed recipe'});return false;});}
 save(path.join(dir,'official-establishments.json'),result);
 console.log(JSON.stringify({establishments:result.establishments.length,rooms:result.establishments.reduce((n,h)=>n+h.rooms.length,0),services:result.establishments.reduce((n,h)=>n+h.services.length,0),experiences:result.establishments.reduce((n,h)=>n+h.experiences.length,0)}));
}
if(require.main===module)main();
