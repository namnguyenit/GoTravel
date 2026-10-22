"""Run the shipped TV3 tests and collect fresh evidence outside the submission.

No application source is changed. Maven builds a temporary project copy.
The console summary is computed from new XML/CSV/tool output, not preset verdicts.
"""
from pathlib import Path
from datetime import datetime,timezone,timedelta,date
import argparse,csv,hashlib,json,os,shutil,subprocess,sys,tempfile
import xml.etree.ElementTree as ET

def run(cmd,log,cwd=None,timeout=300):
    print('COMMAND: '+subprocess.list2cmdline([str(x) for x in cmd]),flush=True)
    env=os.environ.copy();env['PYTHONDONTWRITEBYTECODE']='1'
    proc=subprocess.run([str(x) for x in cmd],cwd=cwd,env=env,capture_output=True,text=True,
                        encoding='utf-8',errors='replace',timeout=timeout)
    log.write_text('COMMAND: '+subprocess.list2cmdline([str(x) for x in cmd])+f'\nEXIT_CODE: {proc.returncode}\n'+proc.stdout+'\n'+proc.stderr,encoding='utf-8')
    for line in proc.stdout.splitlines():
        if 'Tests run:' in line or 'BUILD SUCCESS' in line or 'BUILD FAILURE' in line or 'SHARED_CORPUS' in line or 'passed' in line or 'failed' in line:
            print(line,flush=True)
    if proc.returncode:
        print(proc.stdout[-4500:]);print(proc.stderr[-2000:])
        raise RuntimeError(f'Exit {proc.returncode}; full log: {log}')
    return proc

def mvn(project,arguments,log):
    wrapper=project/'mvnw.cmd'
    command=[os.environ.get('COMSPEC','cmd.exe'),'/d','/c',str(wrapper),'-B','-Dstyle.color=never']+arguments
    run(command,log,project)

def suites(folder):
    result=[]
    for path in sorted(folder.glob('TEST-*.xml')):
        root=ET.parse(path).getroot()
        result.append({'suite':root.get('name').split('.')[-1],**{k:int(root.get(k,0)) for k in ('tests','failures','errors','skipped')}})
    return result

def junit_phase(project,out):
    names=['InventoryAdditionalValidationTest','InventoryBoundaryFuzzTest','InventoryPublicServiceValidationTest',
           'InventoryHostValidationTest','InventoryOwnershipTest','InventoryInternalTokenTest']
    with tempfile.TemporaryDirectory(prefix='gostay-tv3-junit-') as tmp:
        copy=Path(tmp)/'project'
        shutil.copytree(project/'02_Source_Java/v1/BookingandInventory',copy,ignore=shutil.ignore_patterns('target','.git','~$*'))
        mvn(copy,['-Dtest='+','.join(names),'test'],out/'junit.log')
        rows=suites(copy/'target/surefire-reports')
        for f in (copy/'target/surefire-reports').glob('TEST-*.xml'):shutil.copy2(f,out/f.name)
    assert {x['suite'] for x in rows}==set(names),'JUnit suite set differs from expected'
    total=sum(x['tests'] for x in rows);errors=sum(x['failures']+x['errors']+x['skipped'] for x in rows)
    assert total==15 and errors==0,'Inspect current test counts and XML'
    print('\n========== FRESH JUNIT V1 RESULTS ==========')
    print(f'{"JUnit suite":43} {"Tests":>5} {"Fail":>5} {"Error":>5}')
    for row in rows:print(f'{row["suite"]:43} {row["tests"]:>5} {row["failures"]:>5} {row["errors"]:>5}')
    print(f'JUnit v1 total: {total}; failures/errors/skips: {errors}')
    print('Target: selected Java v1 tests only; pytest runs separately.')
    return {'status':'PASS','version':'v1','junit':rows,'junit_total':total}

def pytest_phase(project,out):
    root=project/'03_Kiem_chung_ATPM/python/tests'
    run([sys.executable,'-m','pytest',root/'test_ch2_memory.py',root/'test_ch4_fuzzing.py','-v','-p','no:cacheprovider',
         '--junitxml='+str(out/'pytest.xml')],out/'pytest.log',out)
    py_suites=list(ET.parse(out/'pytest.xml').getroot().iter('testsuite'))
    py_count=sum(int(x.get('tests',0)) for x in py_suites)
    py_errors=sum(int(x.get('failures',0))+int(x.get('errors',0))+int(x.get('skipped',0)) for x in py_suites)
    assert py_count==5 and py_errors==0,'Inspect pytest.xml'
    print('\n========== FRESH PYTEST HELPER RESULTS ==========')
    print(f'Pytest memory-helper + corpus-generator: {py_count}; failures/errors/skips: {py_errors}')
    print('Pytest helper tests include mocked missing-tool scenarios; native C runs in Memory phase.')
    return {'status':'PASS','pytest_total':py_count}

def fuzz_phase(project,out):
    from atpm_gostay.ch4_fuzzing.dynamic_fuzzer import write_corpus,summarize_java_results
    corpus=out/'shared_corpus.csv';inputs=write_corpus(corpus)
    anchor=date.today().isoformat();result={}
    for version in ('v0','v1'):
        with tempfile.TemporaryDirectory(prefix='gostay-tv3-corpus-') as tmp:
            copy=Path(tmp)/'project'
            shutil.copytree(project/f'02_Source_Java/{version}/BookingandInventory',copy,ignore=shutil.ignore_patterns('target','.git','~$*'))
            dest=copy/'src/test/java/com/Gostay/BookingandInventory/service/InventoryCorpusTest.java'
            shutil.copy2(project/'03_Kiem_chung_ATPM/java/InventoryCorpusTest.java',dest)
            mvn(copy,['-Dtest=InventoryCorpusTest',f'-Datpm.version={version}',f'-Datpm.corpus={corpus}',
                      f'-Datpm.corpus.output={out/("corpus_"+version+"_results.csv")}',f'-Datpm.anchor={anchor}','test'],out/f'corpus_{version}.log')
            report=copy/'target/surefire-reports'
            sr=suites(report)
            assert len(sr)==1 and sr[0]['tests']==1 and sr[0]['failures']+sr[0]['errors']+sr[0]['skipped']==0
            for f in report.glob('TEST-*.xml'):shutil.copy2(f,out/(version+'_'+f.name))
        result[version]=summarize_java_results(out/f'corpus_{version}_results.csv')
    assert len(inputs)==304
    for version,summary in result.items():
        assert summary['total_cases']==304 and summary['valid_accepted']==4 and summary['unexpected_errors']==0
        assert summary['invalid_rejected']==(300 if version=='v1' else 0)
    print('\n========== FRESH SHARED CORPUS RESULTS ==========')
    print('Seed: 703093; same 304 inputs and Java harness for both versions.')
    print('Date anchor: '+anchor)
    print(f'{"Version":10}{"Invalid accepted":>18}{"Invalid rejected":>18}{"Valid accepted":>17}{"Errors":>9}')
    for v,s in result.items():print(f'{v:10}{s["invalid_accepted"]:>18}{s["invalid_rejected"]:>18}{s["valid_accepted"]:>17}{s["unexpected_errors"]:>9}')
    print('Target: real Java services with mocked repositories; no live HTTP/database fuzzing.')
    print('One corpus JUnit method per version; 304 inputs per method.')
    return {'status':'PASS','corpus_sha256':hashlib.sha256(corpus.read_bytes()).hexdigest(),'date_anchor':anchor,'versions':result}

def memory_phase(project,out):
    from atpm_gostay.ch2_memory_safety.memory_checker import run_c_memory_lab
    os.environ.pop('ATPM_ASAN',None)
    for label,executable in [('Compiler',os.environ.get('ATPM_CC')),('Cppcheck',os.environ.get('ATPM_CPPCHECK'))]:
        if executable and Path(executable).is_file():
            v=subprocess.run([executable,'--version'],capture_output=True,text=True,errors='replace')
            print(label+': '+(v.stdout or v.stderr).splitlines()[0])
    r=run_c_memory_lab(project/'03_Kiem_chung_ATPM/c/ch2_memory',out)
    print('\n========== FRESH C MEMORY RESULTS ==========')
    for version,s in r['cppcheck'].items():
        print(f'Cppcheck {version}: {s["status"]}; exit={s.get("exit_code")}; findings={len(s.get("findings",[]))}')
        for finding in s.get('findings',[]):
            locations=finding.get('locations',[]);line=locations[0].get('line','?') if locations else '?'
            print(f'  {finding["id"]}; CWE-{finding.get("cwe","?")}; line {line}')
    print('C v1 compile/run: '+r['execution'].get('status','UNKNOWN')+'; exit='+str(r['execution'].get('exit_code')))
    print('Instrumented: '+str(r['execution'].get('instrumented')))
    print('ASan: '+r['asan']['status']+' (not run in this phase)')
    print('Scope: independent C pointer examples; not Java heap vulnerabilities.')
    ok=(r['cppcheck'].get('v0',{}).get('status')=='FINDINGS' and
        r['cppcheck'].get('v1',{}).get('status')=='PASS' and r['execution'].get('status')=='PASS')
    r['status']='PASS_WITH_ASAN_SKIP' if ok else 'FAIL'
    if not ok:
        (out/'memory_results.json').write_text(json.dumps(r,indent=2),encoding='utf-8')
        raise RuntimeError('Native result differs from expected; inspect logs/status, do not treat missing tools as clean')
    return r

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['JUnit','Pytest','Fuzzing','Memory'],required=True)
    parser.add_argument('--project',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();project=args.project.resolve()
    stamp=datetime.now(timezone(timedelta(hours=7)))
    out=args.output.resolve()/(stamp.strftime('%Y%m%d_%H%M%S_%f')+'_'+args.phase);out.mkdir(parents=True)
    sys.path.insert(0,str(project/'03_Kiem_chung_ATPM/python'))
    os.environ['PYTHONDONTWRITEBYTECODE']='1'
    os.environ['PYTHONPATH']=str(project/'03_Kiem_chung_ATPM/python')
    if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')
    print('GOSTAY - THANH VIEN 3 - '+args.phase,flush=True)
    print('Started: '+stamp.strftime('%Y-%m-%d %H:%M:%S UTC+07:00'),flush=True)
    print('Source: '+str(project),flush=True)
    print('Evidence: '+str(out),flush=True)
    metadata={'phase':args.phase,'started_at':stamp.isoformat(),'project':str(project),'python':sys.version.split()[0]}
    try:
        r={'JUnit':junit_phase,'Pytest':pytest_phase,'Fuzzing':fuzz_phase,'Memory':memory_phase}[args.phase](project,out)
        metadata['result']=r;code=0
    except Exception as exc:
        metadata['result']={'status':'ERROR','message':str(exc)};print('\nERROR: '+str(exc));code=1
    (out/'summary.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print('\nRESULT: '+metadata['result']['status'])
    print('Completed: '+datetime.now(timezone(timedelta(hours=7))).strftime('%Y-%m-%d %H:%M:%S UTC+07:00'))
    print('Evidence saved: '+str(out))
    print('Take a terminal screenshot showing this result and the command you entered.')
    return code

if __name__=='__main__':sys.exit(main())
