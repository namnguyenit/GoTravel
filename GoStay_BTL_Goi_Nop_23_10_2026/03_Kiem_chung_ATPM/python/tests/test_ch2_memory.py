from atpm_gostay.ch2_memory_safety.memory_checker import run_c_memory_lab

def test_missing_tools_are_skipped_not_clean(monkeypatch,tmp_path):
    monkeypatch.delenv('ATPM_CC',raising=False);monkeypatch.delenv('ATPM_CPPCHECK',raising=False)
    monkeypatch.setattr('atpm_gostay.ch2_memory_safety.memory_checker.shutil.which',lambda _:None)
    r=run_c_memory_lab(tmp_path,tmp_path/'out')
    assert r['cppcheck']['v1']['status']=='SKIPPED'
    assert r['execution']['status']=='SKIPPED'

def test_optional_sanitizer_is_explicit(monkeypatch,tmp_path):
    monkeypatch.delenv('ATPM_CC',raising=False);monkeypatch.delenv('ATPM_CPPCHECK',raising=False)
    monkeypatch.setattr('atpm_gostay.ch2_memory_safety.memory_checker.shutil.which',lambda _:None)
    assert run_c_memory_lab(tmp_path,tmp_path/'out')['asan']['status']=='SKIPPED'
