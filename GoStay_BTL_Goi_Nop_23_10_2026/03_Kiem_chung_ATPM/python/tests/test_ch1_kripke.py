from atpm_gostay.ch1_kripke.gostay_model import *

def test_bad_label_is_reachable_only_in_v0():
    assert build_gostay_v0().check_invariant('violation')['holds'] is False
    assert build_gostay_v1().check_invariant('violation')['holds'] is True

def test_v0_has_a_concrete_counterexample():
    r=verify_gostay_kripke('v0')
    assert r['counterexample'][0]=='s0_free'
    assert r['counterexample'][-1]=='s5_bad'

def test_timeout_liveness_differs_with_worker_assumption():
    assert not verify_gostay_kripke('v0')['properties']['AG(expired -> AF(released))']
    assert verify_gostay_kripke('v1')['properties']['AG(expired -> AF(released))']

def test_reachability_and_totality_are_not_liveness():
    for version in ('v0','v1'):
        p=verify_gostay_kripke(version)['properties']
        assert p['EF(booked)'] and p['AG(EX(true))']
