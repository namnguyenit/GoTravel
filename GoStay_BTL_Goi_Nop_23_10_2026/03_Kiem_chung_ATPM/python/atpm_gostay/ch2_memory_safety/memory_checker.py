"""Run actual C tools and retain their command, return code and diagnostics.

The C program is a deliberately vulnerable educational model, not Java heap code.
Missing optional ASan is SKIPPED, never converted into a clean sanitizer result.
"""
from pathlib import Path
import os,shutil,subprocess,tempfile,xml.etree.ElementTree as ET

def run(command,log):
    try:
        p=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=60)
        log.write_text('COMMAND: '+subprocess.list2cmdline(command)+'\nEXIT_CODE: '+str(p.returncode)+'\n'+p.stdout+'\n'+p.stderr,encoding='utf-8')
        return p
    except (OSError,subprocess.TimeoutExpired) as exc:
        log.write_text(str(exc),encoding='utf-8');return None

def run_c_memory_lab(c_dir,output_dir=None):
    c_dir=Path(c_dir);out=Path(output_dir or tempfile.mkdtemp(prefix='gostay-c-'));out.mkdir(parents=True,exist_ok=True)
    cppcheck=os.environ.get('ATPM_CPPCHECK') or shutil.which('cppcheck')
    compiler=os.environ.get('ATPM_CC') or shutil.which('clang') or shutil.which('gcc')
    report={'scope':'Deliberately vulnerable C model; does not establish malloc/free defects in Java.',
            'cppcheck':{},'execution':{},'asan':{'status':'SKIPPED','reason':'ASan is opt-in; set ATPM_ASAN=1 with a supported compiler.'}}
    for version,name in [('v0','gostay_lock_vulnerable.c'),('v1','gostay_lock_fixed.c')]:
        source=c_dir/name
        if cppcheck:
            cmd=[cppcheck,'--enable=warning,performance,portability','--suppress=missingIncludeSystem','--xml','--xml-version=2','--error-exitcode=2',str(source)]
            p=run(cmd,out/f'cppcheck_{version}.log')
            try:
                tree=ET.fromstring(p.stderr if p else '')
                findings=[dict(x.attrib,locations=[dict(l.attrib) for l in x.findall('location')]) for x in tree.findall('./errors/error')]
                report['cppcheck'][version]={'status':'FINDINGS' if findings else 'PASS','exit_code':p.returncode,'findings':findings}
                if p.returncode not in (0,2):report['cppcheck'][version]['status']='ERROR'
            except ET.ParseError:report['cppcheck'][version]={'status':'ERROR','reason':'No valid cppcheck XML; inspect log.'}
        else:report['cppcheck'][version]={'status':'SKIPPED','reason':'cppcheck not found'}
    if compiler:
        binary=out/('memory_v1.exe' if os.name=='nt' else 'memory_v1')
        built=run([compiler,'-Wall','-Wextra','-std=c11',str(c_dir/'gostay_lock_fixed.c'),'-o',str(binary)],out/'c_compile_v1.log')
        if built and built.returncode==0:
            executed=run([str(binary)],out/'c_execute_v1.log')
            report['execution']={'status':'PASS' if executed and executed.returncode==0 else 'FAIL',
                'exit_code':executed.returncode if executed else None,'instrumented':False}
        else:report['execution']={'status':'ERROR','reason':'Compilation failed'}
        if os.environ.get('ATPM_ASAN')=='1':
            instrumented=out/('memory_asan.exe' if os.name=='nt' else 'memory_asan')
            built=run([compiler,'-g','-fsanitize=address','-fno-omit-frame-pointer',str(c_dir/'gostay_lock_fixed.c'),'-o',str(instrumented)],out/'asan_compile.log')
            if built and built.returncode==0:
                executed=run([str(instrumented)],out/'asan_execute.log')
                report['asan']={'status':'PASS' if executed and executed.returncode==0 else 'FAIL','exit_code':executed.returncode if executed else None}
            else:report['asan']={'status':'ERROR','reason':'Compiler cannot build an ASan target; inspect asan_compile.log.'}
    else:report['execution']={'status':'SKIPPED','reason':'No C compiler found'}
    return report
