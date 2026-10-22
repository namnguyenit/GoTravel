"""Finite abstraction of InventoryLock. BAD records history-dependent violations.

v1 liveness assumes the scheduler eventually completes a cleanup transaction.
Transitions abstract completed operations/time expiry, not every rejected request.
This is not a proof of database concurrency; that is tested separately in Java.
"""
from .kripke_core import KripkeStructure

STATES = {
    's0_free': ['available','free'],
    's1_holding': ['holding'],
    's2_booked': ['booked'],
    's3_released': ['released','available','free'],
    's4_timeout': ['expired'],
    's5_bad': ['violation'],
}
FORBIDDEN_TRANSITIONS = {('s2_booked','s5_bad'),('s3_released','s5_bad'),('s4_timeout','s5_bad')}

def build_model(version):
    if version not in ('v0','v1'): raise ValueError(version)
    k=KripkeStructure()
    for state,labels in STATES.items(): k.add_state(state,labels)
    k.set_initial('s0_free')
    edges=[('s0_free','s0_free'),('s0_free','s1_holding'),('s1_holding','s2_booked'),
           ('s1_holding','s3_released'),('s1_holding','s4_timeout'),('s3_released','s0_free'),
           ('s2_booked','s2_booked'),('s5_bad','s5_bad')]
    if version=='v0':
        edges+=list(sorted(FORBIDDEN_TRANSITIONS))+[('s4_timeout','s4_timeout'),('s4_timeout','s3_released')]
    else:
        edges+=[('s4_timeout','s3_released')]
    for a,b in edges: k.add_transition(a,b)
    k.validate_total()
    return k

def build_gostay_v0(): return build_model('v0')
def build_gostay_v1(): return build_model('v1')

def find_forbidden_transitions(model):
    reachable=model.reachable_from()
    return [(a,b,'CWE-841: forbidden lifecycle action') for a,b in sorted(FORBIDDEN_TRANSITIONS)
            if a in reachable and b in model.transitions[a]]

def af_states(model, targets):
    """Least fixed point AF(P) = P union AX(AF(P)) on a total finite graph."""
    result=set(targets)
    while True:
        expanded=result|{s for s in model.states if model.transitions[s] <= result}
        if expanded==result: return result
        result=expanded

def verify_gostay_kripke(version='v0'):
    model=build_model(version)
    reachable=model.reachable_from()
    labels=lambda atom:{s for s in model.states if atom in model.labels_of(s)}
    eventually_done=af_states(model, labels('booked')|labels('available'))
    eventually_released=af_states(model,labels('released'))
    safety=model.check_invariant('violation')
    properties={
        'AG(!violation)': safety['holds'],
        'EF(booked)': model.check_reachability('booked')['holds'],
        'AG(holding -> AF(booked | available))': all(s in eventually_done for s in reachable & labels('holding')),
        'AG(expired -> AF(released))': all(s in eventually_released for s in reachable & labels('expired')),
        'AG(EX(true))': all(bool(model.transitions[s]) for s in reachable),
    }
    return {'version':version,'state_count':len(model.states),
            'edge_count':sum(map(len,model.transitions.values())),
            'reachable_states':sorted(reachable),'properties':properties,
            'counterexample':safety['counterexample_path'],
            'forbidden_edges':find_forbidden_transitions(model),
            'is_safe':properties['AG(!violation)'],
            'assumptions':['Finite hand-built model; transitions are completed actions.',
                'v1 AF assumes successful eventual worker execution, database availability and finite conflicts.',
                'Concurrent stale reads are covered by Java transaction tests, not this graph.'],
            'transitions':[(a,b) for a in sorted(model.transitions) for b in sorted(model.transitions[a])]}

if __name__=='__main__':
    import json
    print(json.dumps([verify_gostay_kripke(v) for v in ('v0','v1')],ensure_ascii=False,indent=2))
