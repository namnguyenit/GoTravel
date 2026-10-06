const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { connect } = require('../expansion/db');
const dir = __dirname;
const privateDir = path.join(dir, '.private');
const credentialsPath = path.join(privateDir, 'host-credentials.json');
const namespace = 'gotravel-real-venue-virtual-hosts-v1';
function id(key) {
  const h = crypto.createHash('sha256').update(namespace + ':' + key).digest('hex').slice(0,32).split('');
  h[12]='5';h[16]='8';const x=h.join('');return [x.slice(0,8),x.slice(8,12),x.slice(12,16),x.slice(16,20),x.slice(20)].join('-');
}
function hashPasswords(passwords) {
  const jar = process.env.SEED_BCRYPT_JAR || '/home/trungcao/.m2/repository/org/springframework/security/spring-security-crypto/7.0.4/spring-security-crypto-7.0.4.jar';
  const java = process.env.SEED_JAVA || '/home/nhan/.jdks/jdk-21/bin/java';
  if (!fs.existsSync(jar)) throw Error('Set SEED_BCRYPT_JAR to the locally installed Spring Security crypto jar');
  return new Promise((resolve,reject)=>{
    const p=spawn(java,['-cp',jar,path.join(dir,'HashPasswords.java')],{stdio:['pipe','pipe','pipe']});
    let out='';p.stdout.on('data',x=>out+=x);p.stderr.resume();p.on('error',()=>reject(Error('BCrypt helper could not start')));
    p.on('close',code=>{const hashes=out.trim().split('\n');if(code||hashes.length!==passwords.length||hashes.some(x=>!/^\$2[aby]\$12\$/.test(x)))reject(Error('BCrypt helper failed'));else resolve(hashes);});
    p.stdin.end(passwords.join('\n')+'\n');
  });
}
async function main() {
  fs.mkdirSync(privateDir,{recursive:true,mode:0o700});fs.chmodSync(privateDir,0o700);
  let accounts;
  if(fs.existsSync(credentialsPath)){fs.chmodSync(credentialsPath,0o600);accounts=JSON.parse(fs.readFileSync(credentialsPath)).accounts;}
  else {
    const existingDb=await connect('Identity');
    try { if((await existingDb.query("SELECT 1 FROM users WHERE username LIKE 'seed\\_host\\_%' ESCAPE '\\' OR username LIKE 'seed\\_enterprise\\_%' ESCAPE '\\' LIMIT 1")).rowCount)throw Error('Seed identities already exist but their private credential registry is missing; restore that registry instead of generating unusable replacement passwords'); }
    finally { await existingDb.end(); }
    accounts=Array.from({length:50},(_,i)=>{const enterprise=i>=25,n=String(i%25+1).padStart(3,'0'),username='seed_'+(enterprise?'enterprise_':'host_')+n;return{id:id(username),username,email:username+'@seed.gotravel.invalid',displayName:'GoTravel Seed '+(enterprise?'Enterprise ':'Host ')+n,role:enterprise?'ENTERPRISE':'HOST',password:crypto.randomBytes(24).toString('base64url')};});
    const hashes=await hashPasswords(accounts.map(x=>x.password));accounts.forEach((x,i)=>x.passwordHash=hashes[i]);
    fs.writeFileSync(credentialsPath,JSON.stringify({schemaVersion:1,namespace,notice:'Private test account credentials; fictional operators, no real business identity or legal verification.',accounts},null,2)+'\n',{flag:'wx',mode:0o600});
  }
  if(accounts.length!==50||new Set(accounts.map(x=>x.id)).size!==50)throw Error('Invalid private account registry');
  const c=await connect('Identity');
  try {
    await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[namespace]);
    await c.query("CREATE TABLE IF NOT EXISTS seed_host_provenance (user_id varchar PRIMARY KEY REFERENCES users(id), batch_id text NOT NULL, operator_kind text NOT NULL, identity_kind text NOT NULL CHECK(identity_kind='FICTIONAL_TEST_OPERATOR'), created_at timestamptz NOT NULL DEFAULT now())");
    for(const a of accounts){
      const found=(await c.query('SELECT id,username,email FROM users WHERE username=$1 OR email=$2 OR id=$3',[a.username,a.email,a.id])).rows;
      if(found.length && (found.length!==1||found[0].id!==a.id||found[0].username!==a.username||found[0].email!==a.email))throw Error('A seed account name belongs to a different identity');
      if(found.length && !(await c.query('SELECT 1 FROM seed_host_provenance WHERE user_id=$1 AND batch_id=$2',[a.id,namespace])).rowCount)throw Error('Existing identity has no ownership provenance');
      await c.query("INSERT INTO users(id,username,email,password,provider,is_active,is_deleted,created_at) VALUES($1,$2,$3,$4,'LOCAL',true,false,now()) ON CONFLICT(id) DO NOTHING",[a.id,a.username,a.email,a.passwordHash]);
      await c.query('INSERT INTO users_roles(user_id,roles_name) VALUES($1,\'USER\'),($1,$2) ON CONFLICT DO NOTHING',[a.id,a.role]);
      await c.query('INSERT INTO user_profiles(user_id,full_name) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING',[a.id,a.displayName]);
      // Enterprise host detail also requires a host profile. No invented ID, tax, banking or contact numbers.
      await c.query("INSERT INTO host_profiles(user_id,full_name,approval_status,created_at,updated_at) VALUES($1,$2,'APPROVED',now(),now()) ON CONFLICT(user_id) DO NOTHING",[a.id,a.displayName]);
      if(a.role==='ENTERPRISE')await c.query("INSERT INTO enterprise_profiles(user_id,company_name,representative_name,approval_status,created_at,updated_at) VALUES($1,$2,$3,'APPROVED',now(),now()) ON CONFLICT(user_id) DO NOTHING",[a.id,a.displayName,a.displayName+' Operator']);
      await c.query("INSERT INTO seed_host_provenance(user_id,batch_id,operator_kind,identity_kind) VALUES($1,$2,$3,'FICTIONAL_TEST_OPERATOR') ON CONFLICT(user_id) DO NOTHING",[a.id,namespace,a.role]);
    }
    await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
  fs.writeFileSync(path.join(dir,'hosts.json'),JSON.stringify({namespace,accounts:accounts.map(({password,passwordHash,...a})=>a)},null,2)+'\n');
  console.log(JSON.stringify({accounts:50,personalHosts:25,enterpriseHosts:25,credentialsPath,legalDocuments:'none fabricated'}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={id};
