const {createRequire}=require('node:module');
const {fs,path,dir,save}=require('./common');
const req=createRequire(path.resolve(dir,'../../../search-and-recommendation/package.json'));
const Redis=req('ioredis'),dotenv=req('dotenv');
async function main(){
 const receipt=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json')));if(receipt.status!=='committed')throw Error('Commit catalog before invalidating cache');
 const env=dotenv.parse(fs.readFileSync(path.resolve(dir,'../../../search-and-recommendation/.env')));if(!env.REDIS_URL)throw Error('REDIS_URL missing');
 const r=new Redis(env.REDIS_URL,{maxRetriesPerRequest:1,connectTimeout:5000});
 const namespaces=['home:feed:*','province:destinations:*','recommend:complexes:*','recommend:complex:*','recommend:landmark:*','recommend:similar:*'];let removed=0;
 try{for(const pattern of namespaces){let cursor='0';do{const [next,keys]=await r.scan(cursor,'MATCH',pattern,'COUNT',100);cursor=next;if(keys.length)removed+=await r.unlink(...keys);}while(cursor!=='0');}
 receipt.cacheInvalidation={checkedAt:new Date().toISOString(),namespaces,removed};save(path.join(dir,'receipt.json'),receipt);console.log(JSON.stringify({catalogCacheKeysRemoved:removed}));
 }finally{r.disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
