"""Generate a shared corpus; verdicts are collected from Java, never simulated."""
from dataclasses import dataclass,asdict
from pathlib import Path
import csv,random

@dataclass
class FuzzTestCase:
    test_id: int
    category: str
    start_offset: int
    end_offset: int
    quantity: int
    is_valid_payload: bool

def generate_fuzz_dataset(seed=703093,cases_per_type=100,include_valid=False):
    rng=random.Random(seed);rows=[]
    def add(kind,start,end,qty,valid=False): rows.append(FuzzTestCase(len(rows)+1,kind,start,end,qty,valid))
    for _ in range(cases_per_type):
        end=rng.randint(1,30);add('INVERTED_DATES',end+rng.randint(1,30),end,1)
    for _ in range(cases_per_type):add('OVERSIZED_QUANTITY',1,1,51+rng.randrange(500))
    for _ in range(cases_per_type):add('LONG_RANGE',1,1+rng.randrange(90,270),1)
    if include_valid:
        for q in (1,50):
            for days in (1,90):add('VALID_BOUNDARY',1,days,q,True)
    return rows

def write_corpus(path,seed=703093):
    rows=generate_fuzz_dataset(seed,include_valid=True);path=Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(asdict(rows[0])))
        writer.writeheader();writer.writerows(asdict(row) for row in rows)
    return rows

def summarize_java_results(path):
    rows=list(csv.DictReader(Path(path).open(encoding='utf-8')))
    invalid=[r for r in rows if r['category']!='VALID_BOUNDARY']
    valid=[r for r in rows if r['category']=='VALID_BOUNDARY']
    return {'total_cases':len(rows),'invalid_cases':len(invalid),
            'invalid_rejected':sum(r['outcome']=='REJECTED' for r in invalid),
            'invalid_accepted':sum(r['outcome']=='ACCEPTED' for r in invalid),
            'valid_cases':len(valid),'valid_accepted':sum(r['outcome']=='ACCEPTED' for r in valid),
            'unexpected_errors':sum(r['outcome']=='ERROR' for r in rows),
            'target':'Java services with mocked repositories; no HTTP/DB fuzzing'}
