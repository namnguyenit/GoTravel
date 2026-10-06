// Replaying a completed batch never creates accounts, uploads photos or inserts rows.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const dir=__dirname,receiptFile=path.join(dir,'receipt.json');
function main(){
 if(process.argv.includes('--verify')){const p=spawnSync(process.execPath,[path.join(dir,'verify.js')],{stdio:'inherit'});process.exitCode=p.error||p.signal?1:(p.status??1);return;}
 if(fs.existsSync(receiptFile)){const r=JSON.parse(fs.readFileSync(receiptFile));if(r.status==='committed'){console.log(JSON.stringify({status:'already_completed',batchId:r.batchId,imported:r.imported}));return;}}
 if(!process.argv.includes('--apply'))throw Error('Use --apply for an approved frozen plan or --verify to inspect the deployed batch');
 const p=spawnSync(process.execPath,[path.join(dir,'apply-plan.js'),'--apply'],{stdio:'inherit'});process.exitCode=p.error||p.signal?1:(p.status??1);
}
if(require.main===module)try{main()}catch(e){console.error(e.message);process.exitCode=1}
