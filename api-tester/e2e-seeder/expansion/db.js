const fs=require('node:fs'),path=require('node:path');const {Client}=require('pg');
const root=path.resolve(__dirname,'../../..');
function config(service){const v={};for(const l of fs.readFileSync(path.join(root,service,'src/main/resources/database.yaml'),'utf8').split('\n')){const m=l.match(/^\s*(url|username|password):\s*(.+)\s*$/);if(m)v[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}const u=new URL(v.url.replace(/^jdbc:/,''));return{host:u.hostname,port:Number(u.port||5432),database:u.pathname.slice(1),user:v.username,password:v.password,connectionTimeoutMillis:10000,application_name:'gotravel-additive-seeder'};}
async function connect(service){const c=new Client(config(service));await c.connect();return c;}
async function accounts(){const c=await connect('Identity');try{return(await c.query("SELECT u.id,u.username,array_agg(ur.roles_name) AS roles FROM users u JOIN users_roles ur ON ur.user_id=u.id WHERE u.is_active=true AND u.is_deleted=false AND u.username LIKE 'user\\_%' ESCAPE '\\' GROUP BY u.id,u.username ORDER BY u.username")).rows;}finally{await c.end();}}
module.exports={connect,accounts};
