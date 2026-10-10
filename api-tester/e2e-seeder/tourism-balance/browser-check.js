const {fs,path,dir,save}=require('./common');
const {chromium}=require('/tmp/gateway-browser-tools/node_modules/playwright');
async function main(){
 const plan=JSON.parse(fs.readFileSync(path.join(dir,'plan.json'))),out=path.join(dir,'.cache/browser');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
 const nui=plan.complexes.find(x=>x.name.includes('Núi Thần Tài')),bana=plan.complexes.find(x=>x.name.includes('Bà Nà Hills'));
 const samples=[{name:'complex-nui-than-tai',path:'/complex/'+nui.id+'/detail',expect:nui.name},{name:'complex-ba-na',path:'/complex/'+bana.id+'/detail',expect:bana.name},...['STAY','EXP','SVC'].map(category=>{const l=plan.listings.find(l=>l.category===category);return{name:'listing-'+category.toLowerCase(),path:'/'+({STAY:'place',EXP:'experience',SVC:'service'}[category])+'/'+l.id+'/detail',expect:l.title};}),{name:'tab-service',path:'/service',expect:'Dịch vụ theo loại hình'},{name:'tab-experience',path:'/experience',expect:'Trải nghiệm tại'}];
 const result=[];
 for(const sample of samples){const errors=[];const listener=e=>errors.push(e.message);page.on('pageerror',listener);const response=await page.goto('https://gotravel.trungcaodev.io.vn'+sample.path,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(text=>document.body.innerText.includes(text),sample.expect,{timeout:30000});
 await page.waitForFunction(()=>[...document.images].filter(i=>{const r=i.getBoundingClientRect();return i.src.includes('res.cloudinary.com')&&Math.min(r.bottom,innerHeight)-Math.max(r.top,0)>20&&Math.min(r.right,innerWidth)-Math.max(r.left,0)>20;}).every(i=>i.complete&&i.naturalWidth>0),undefined,{timeout:25000});
 await page.screenshot({path:path.join(out,sample.name+'.png'),fullPage:false});
 const visibleImages=await page.evaluate(()=>[...document.images].filter(i=>{const r=i.getBoundingClientRect();return i.src.includes('res.cloudinary.com')&&Math.min(r.bottom,innerHeight)-Math.max(r.top,0)>20&&Math.min(r.right,innerWidth)-Math.max(r.left,0)>20;}).map(i=>({url:i.src,width:i.naturalWidth,height:i.naturalHeight})));
 result.push({...sample,status:response.status(),visibleCloudinaryImages:visibleImages.length,brokenVisibleImages:visibleImages.filter(i=>!i.width).length,pageErrors:errors});page.off('pageerror',listener);
 }
 const verifyFile=path.join(dir,'verification.json'),verification=JSON.parse(fs.readFileSync(verifyFile));verification.browser=result;save(verifyFile,verification);save(path.join(out,'receipt.json'),result);console.log(JSON.stringify(result));
 if(result.some(x=>x.status!==200||x.brokenVisibleImages||x.pageErrors.length))throw Error('Browser checks contain an error; inspect receipt');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
