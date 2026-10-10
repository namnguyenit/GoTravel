const {connect}=require('../expansion/db');
const {fs,path,dir,save}=require('./common');
async function main(){const c=await connect('CatalogandListing');try{
 const records=(await c.query("SELECT * FROM listings WHERE status='ACTIVE' ORDER BY id")).rows;
 const parents=(await c.query("SELECT * FROM complexes WHERE status='ACTIVE' ORDER BY id")).rows;
 const report={checkedAt:new Date().toISOString(),total:records.length,categories:{},serviceTypes:{},muongThanh:{},coverage:[],parents:[]};
 for(const x of records){report.categories[x.category]=(report.categories[x.category]||0)+1;if(x.category==='SVC')report.serviceTypes[x.sub_category]=(report.serviceTypes[x.sub_category]||0)+1;if(/Mường Thanh/i.test(x.title))report.muongThanh[x.category]=(report.muongThanh[x.category]||0)+1;}
 report.coverage=(await c.query("SELECT province,count(*) FILTER(WHERE category='STAY')::int stay,count(*) FILTER(WHERE category='EXP')::int exp,count(*) FILTER(WHERE category='SVC')::int svc FROM listings WHERE status='ACTIVE' GROUP BY province ORDER BY province")).rows;
 report.parents=parents.map(p=>({id:p.id,name:p.name,province:p.province,STAY:records.filter(x=>x.complex_id===p.id&&x.category==='STAY').length,EXP:records.filter(x=>x.complex_id===p.id&&x.category==='EXP').length,SVC:records.filter(x=>x.complex_id===p.id&&x.category==='SVC').length}));
 const target=process.argv.includes('--after')?'audit-after.json':'audit-before.json';if(target==='audit-before.json'&&fs.existsSync(path.join(dir,target)))throw Error('Baseline already exists; use --after for a new check');save(path.join(dir,target),report);
 if(target==='audit-before.json'){save(path.join(dir,'active-image-baseline.json'),{records:[...records.map(x=>({id:x.id,thumbnail_url:x.thumbnail_url,gallery_urls:x.attributes?.galleryUrls||[]})),...parents.map(x=>({id:x.id,thumbnail_url:x.thumbnail_url,gallery_urls:x.gallery_urls||[]}))]});}
 console.log(JSON.stringify({total:report.total,categories:report.categories,muongThanh:report.muongThanh,complexes:parents.length}));
}finally{await c.end();}}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
