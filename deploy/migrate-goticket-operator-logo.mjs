import {connectAll} from './seeds/goticket/runner/src/core.mjs';
import {readFileSync} from 'node:fs';
const db=await connectAll();
try{await db.auth.query('BEGIN');try{await db.auth.query("SET LOCAL lock_timeout='5s'");await db.auth.query(readFileSync(new URL('./sql/goticket-operator-logo.sql',import.meta.url),'utf8'));await db.auth.query('COMMIT');console.log('Identity operator logo column ready.');}catch(error){await db.auth.query('ROLLBACK');throw error;}}
finally{await Promise.all(Object.values(db).map(c=>c.end()));}
