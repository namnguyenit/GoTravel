from atpm_gostay.ch4_fuzzing.dynamic_fuzzer import *
from dataclasses import asdict

def test_seed_reproduces_identical_payloads():
    assert generate_fuzz_dataset()==generate_fuzz_dataset()
    assert generate_fuzz_dataset(1)!=generate_fuzz_dataset(2)

def test_corpus_has_300_invalid_and_4_valid_boundaries():
    data=generate_fuzz_dataset(include_valid=True)
    assert len(data)==304 and sum(r.is_valid_payload for r in data)==4
    assert all(r.start_offset>=1 for r in data)

def test_ranges_use_inclusive_ninety_day_limit():
    data=generate_fuzz_dataset(include_valid=True)
    assert all(r.end_offset-r.start_offset+1>90 for r in data if r.category=='LONG_RANGE')
    assert {(r.quantity,r.end_offset-r.start_offset+1) for r in data if r.category=='VALID_BOUNDARY'}=={(1,1),(1,90),(50,1),(50,90)}
