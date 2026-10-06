// Article image lists contain navigation images. Require exact subject metadata.
const fs=require('node:fs'),path=require('node:path');
const {dir,fold,save}=require('./helpers');
const extra={
 'Chùa Dơi':['mahatup'], 'Vườn quốc gia Cát Tiên':['cattien'],
 'Nhà thờ chính tòa Kon Tum':['nhathogokontum'], 'Khu chứng tích Sơn Mỹ':['mylai'],
 'Hồ Ba Bể':['babe'], 'Vườn quốc gia Cát Bà':['catba'],
 'Thành nhà Hồ':['hodynasty','taydocastle','congnam'],
 'Vườn quốc gia Bến En':['lakesongmuc'], 'Đền Hùng':['hungking'],
 'Dinh Hoàng A Tưởng':['bachadhinhvuameo'], 'Đền Đô':['denlybatde'],
 'Nhà thờ chính tòa Phát Diệm':['phatdiem'], 'Cầu Hiền Lương':['hienluong'],
 'Tháp Po Nagar':['ponagar'], 'Ngũ Hành Sơn':['marblemountains'],
 'Dinh Độc Lập':['independencepalace','reunificationpalace'],
 'Bảo tàng Chứng tích chiến tranh':['warremnantsmuseum'],
 'Chùa Một Cột':['onepillarpagoda'], 'Văn Miếu – Quốc Tử Giám':['hanoitempleofliterature'],
 'Yên Tử':['hoayen','huequang'], 'Hồ Lắk':['laklake','holak01'],
 'Thánh địa Mỹ Sơn':['myson'], 'Lăng Khải Định':['khaidinh'],
 'Lăng Minh Mạng':['minhmang'], 'Cầu Rồng':['dragonbridge'],
 'Hòn Đá Bạc':['dabacislet'], 'Mẫu Sơn':['mauson'],
 'Cao nguyên đá Đồng Văn':['dongvan'], 'Tam Cốc – Bích Động':['tamcoc'],
 'Hồ Hoàn Kiếm':['hoankiem'], 'Chùa Vĩnh Nghiêm (Bắc Ninh)':['vinhnghiemyendung'],
 'Gò Tháp':['gothap'], 'Chùa Keo Thái Bình':['chuakeothaibinh']
};
function main(){
 const file=path.join(dir,'real-attractions.json');
 const backup=path.join(dir,'.cache','attractions-before-review.json');
 if(!fs.existsSync(backup))fs.writeFileSync(backup,fs.readFileSync(file));
 const input=JSON.parse(fs.readFileSync(backup));const output={...input,attractions:[],photoReviewRejected:[],reviewedAt:new Date().toISOString()};
 for(const e of input.attractions){
  const aliases=[fold(e.name.replace(/Vườn quốc gia |Nhà thờ chính tòa |Bảo tàng |Khu chứng tích |Di tích |Lăng |Chùa |Tháp |Hồ |Vịnh |Đảo /g,'')),...(extra[e.name]||[])];
  const seen=new Set();const photos=e.photos.filter(p=>{
   const subject=fold(p.fileTitle+' '+p.description);
   let supported=aliases.some(a=>a.length>=5&&subject.includes(a))&&!/postcard|1930|1967|1966|cartograph|historical painting|solar power|rice map/i.test(p.fileTitle+' '+p.description);
   if(e.name==='Vườn quốc gia Phú Quốc')supported=/phuquocnationalpark|vuonquocgiaphuquoc/.test(subject);
   if(e.name==='Lam Kinh')supported=/^File:Lam Kinh\.jpg$/i.test(p.fileTitle);
   if(e.name==='Cao nguyên đá Đồng Văn')supported=/baidamattrangdongvan|caonguyendadongvan/.test(subject);
   if(e.name==='Hồ Lắk')supported=false; // Reviewed files show a lodging building; no verified lake panorama in this set.
   if(!supported){output.photoReviewRejected.push({place:e.name,fileTitle:p.fileTitle,reason:'Photograph metadata does not establish this exact subject, or is a historical/illustrative image'});return false;}
   if(seen.has(p.sourceUrl))return false;seen.add(p.sourceUrl);return true;
  });
  if(photos.length)output.attractions.push({...e,photos,photographBinding:'exact_subject_in_commons_title_or_description_reviewed'});
  else output.rejected.push({name:e.name,province:e.province,reason:'No photograph survives exact subject review'});
 }
 save(file,output);console.log(JSON.stringify({accepted:output.attractions.length,rejectedPhotos:output.photoReviewRejected.length}));
}
if(require.main===module)main();
