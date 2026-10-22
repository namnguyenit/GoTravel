import pytest
from atpm_gostay.ch3_smt_bmc.z3_bmc_verifier import *

def test_initial_state_is_safe_even_in_v0():
    assert check_bmc('v0',0)['status']=='UNSAT'
    assert check_bmc('v0',0)['trace']==[]

def test_first_workflow_violation_needs_three_steps():
    assert check_bmc('v0',1)['status']=='UNSAT'
    assert check_bmc('v0',2)['status']=='UNSAT'
    r=check_bmc('v0',3)
    assert r['status']=='SAT' and len(r['trace'])==4
    assert any(row['available']+row['held']+row['booked']!=10 for row in r['trace'])

def test_patched_model_has_no_counterexample_up_to_six():
    for k in (0,1,2,3,6):assert check_bmc('v1',k)['status']=='UNSAT'

def test_all_three_smt_queries_compare_guards():
    for check in (check_inventory_conservation,check_int32_overflow,check_date_inversion):
        assert check('v0').status=='SAT'
        assert check('v1').status=='UNSAT'

def test_int32_counterexample_has_representable_operands():
    r=check_int32_overflow('v0').counterexample
    assert 0<=r['available']<=2**31-1 and 0<r['quantity']<=2**31-1
    assert r['mathematical_sum']>2**31-1

def test_invalid_bounds_are_rejected():
    with pytest.raises(ValueError):check_bmc('v1',-1)
