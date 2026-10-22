"""Explicit SMT assumptions and actual k-step unrolling for one order/one slot."""
from dataclasses import dataclass
from typing import Optional
import z3

@dataclass
class SmtCheckResult:
    check_name: str
    version: str
    property_holds: Optional[bool]
    status: str
    counterexample: Optional[dict]=None
    generated_test_case: Optional[str]=None

def result(solver,name,version,values):
    answer=solver.check()
    if answer==z3.sat:
        model=solver.model()
        example={k:model.eval(v,model_completion=True).as_long() for k,v in values.items()}
        return SmtCheckResult(name,version,False,'SAT',example)
    if answer==z3.unsat: return SmtCheckResult(name,version,True,'UNSAT')
    return SmtCheckResult(name,version,None,'UNKNOWN',{'reason':solver.reason_unknown()})

def check_inventory_conservation(version='v0',capacity_val=10):
    a,b,q,status=z3.Ints('available booked stored_quantity status')
    s=z3.Solver();s.add(a==capacity_val-1,b==1,q==1,status==1)
    allowed=status!=2 if version=='v0' else status==0
    restored=z3.If(allowed,a+q,a)
    s.add(restored+b>capacity_val)
    return result(s,'cancel_confirmed_inventory',version,{'available_before':a,'booked':b,'stored_quantity':q,'available_after':restored})

def check_int32_overflow(version='v0'):
    a,q=z3.Ints('available quantity');limit=2**31-1
    s=z3.Solver();s.add(a>=0,a<=limit,q>0,q<=limit)
    if version=='v1':s.add(a+q<=limit) # successful Math.addExact path; exception path makes no update
    s.add(a+q>limit)
    return result(s,'int32_addition_overflow',version,{'available':a,'quantity':q,'mathematical_sum':a+q})

def check_date_inversion(version='v0'):
    start,end=z3.Ints('start_day end_day');s=z3.Solver();s.add(start>=0,end>=0)
    if version=='v1':s.add(end>=start)
    s.add(end<start)
    return result(s,'public_date_inversion',version,{'start_day':start,'end_day':end})

def check_quantity_limit(version='v0'):
    q=z3.Int('quantity');s=z3.Solver();s.add(q>=1,q<=2**31-1)
    if version=='v1':s.add(q<=50)
    s.add(q>50)
    return result(s,'quantity_limit',version,{'quantity':q})

def check_range_limit(version='v0'):
    span=z3.Int('inclusive_days');s=z3.Solver();s.add(span>=1,span<=3650)
    if version=='v1':s.add(span<=90)
    s.add(span>90)
    return result(s,'range_limit',version,{'inclusive_days':span})

def check_bmc(version='v0',k_steps=3):
    """I(s0) & T(s0,s1) & ... & T(s[k-1],s[k]) & OR bad(s[i]).

    One order, quantity=1, capacity=10. Ignores clock, persistence and threads.
    No completeness threshold is claimed. k=0 checks only the safe initial state.
    """
    if version not in ('v0','v1'):raise ValueError(version)
    if not isinstance(k_steps,int) or not 0<=k_steps<=50:raise ValueError('k must be between 0 and 50')
    s=z3.Solver();s.set(timeout=10000)
    A=[z3.Int(f'a_{i}') for i in range(k_steps+1)]
    H=[z3.Int(f'h_{i}') for i in range(k_steps+1)]
    B=[z3.Int(f'b_{i}') for i in range(k_steps+1)]
    S=[z3.Int(f'status_{i}') for i in range(k_steps+1)] # 0 free, 1 held, 2 confirmed, 3 released
    actions=[z3.Int(f'action_{i}') for i in range(k_steps)] # hold, confirm, cancel, stutter
    s.add(A[0]==10,H[0]==0,B[0]==0,S[0]==0)
    for i,action in enumerate(actions):
        hold=z3.And(action==0,S[i]==0,A[i]>=1,
                    A[i+1]==A[i]-1,H[i+1]==1,B[i+1]==B[i],S[i+1]==1)
        confirm_allowed=S[i]==1 if version=='v1' else S[i]!=0
        confirm=z3.And(action==1,confirm_allowed,A[i+1]==A[i],H[i+1]==0,
                       B[i+1]==z3.If(S[i]==2,B[i],B[i]+1),S[i+1]==2)
        cancel_allowed=S[i]==1 if version=='v1' else z3.Or(S[i]==1,S[i]==2)
        cancel=z3.And(action==2,cancel_allowed,A[i+1]==A[i]+1,H[i+1]==0,B[i+1]==B[i],S[i+1]==3)
        idle=z3.And(action==3,A[i+1]==A[i],H[i+1]==H[i],B[i+1]==B[i],S[i+1]==S[i])
        s.add(z3.Or(hold,confirm,cancel,idle))
    s.add(z3.Or(*[z3.Or(A[i]<0,H[i]<0,B[i]<0,A[i]+H[i]+B[i]!=10) for i in range(k_steps+1)]))
    answer=s.check();status=str(answer).upper();trace=[]
    if answer==z3.sat:
        m=s.model()
        for i in range(k_steps+1):
            trace.append({'step':i,'available':m.eval(A[i]).as_long(),'held':m.eval(H[i]).as_long(),
                          'booked':m.eval(B[i]).as_long(),'status':m.eval(S[i]).as_long(),
                          'action':None if i==k_steps else ['hold','confirm','cancel','stutter'][m.eval(actions[i]).as_long()]})
    return {'version':version,'k':k_steps,'status':status,'property_holds':True if answer==z3.unsat else False if answer==z3.sat else None,
            'trace':trace,'scope':'one order, quantity 1, capacity 10, k transitions; no clock/concurrency/completeness proof'}

def generate_bmc_test_cases(k_steps=3):
    before=check_bmc('v0',k_steps);after=check_bmc('v1',k_steps)
    return [{'test_case_id':f'BMC-INV-k{k_steps}','k_bound':k_steps,'result_v0':before['status'],
             'result_v1':after['status'],'steps':before['trace']}]

if __name__=='__main__':
    import json
    print(json.dumps([check_bmc(v,k) for k in (0,1,2,3,6) for v in ('v0','v1')],indent=2))
