"""Bước 2: kiểm tra dữ liệu đầu vào; chưa chạy chương trình GoStay."""

from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import sys

# Dùng lại bộ sinh trong BTL_ATPM, không viết lại thuật toán sinh dữ liệu.
PROJECT = Path(__file__).resolve().parents[1]
PYTHON_SOURCE = PROJECT / "BTL_ATPM/03_Kiem_chung_ATPM/python"
sys.dont_write_bytecode = True
sys.path.insert(0, str(PYTHON_SOURCE))

from atpm_gostay.ch4_fuzzing.dynamic_fuzzer import generate_fuzz_dataset, write_corpus


SEED = 703093
OUTPUT = Path(__file__).resolve().parent / "ket_qua_buoc2"


def valid_by_input_rules(case):
    """Đánh giá quy tắc ngày/số lượng, chưa xét tồn kho hay database."""
    days = case.end_offset - case.start_offset + 1
    return (
        case.start_offset >= 0
        and case.end_offset >= case.start_offset
        and 1 <= case.quantity <= 50
        and 1 <= days <= 90
    )


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    OUTPUT.mkdir(parents=True, exist_ok=True)

    # write_corpus thêm 4 biên hợp lệ: 300 ca sai + 4 ca hợp lệ = 304.
    corpus_file = OUTPUT / "corpus_buoc2.csv"
    cases = write_corpus(corpus_file, seed=SEED)
    counts = Counter(case.category for case in cases)

    # Kiểm tra nhãn kỳ vọng bằng quy tắc được tính độc lập ở trên.
    mismatches = [
        case.test_id for case in cases
        if valid_by_input_rules(case) != case.is_valid_payload
    ]

    # Hai ID khác nhau vẫn có thể chứa cùng một đầu vào thực sự.
    input_ids = defaultdict(list)
    for case in cases:
        key = (case.start_offset, case.end_offset, case.quantity)
        input_ids[key].append(case.test_id)
    duplicates = [
        {"start_offset": key[0], "end_offset": key[1], "quantity": key[2], "test_ids": ids}
        for key, ids in input_ids.items() if len(ids) > 1
    ]

    same_seed_equal = cases == generate_fuzz_dataset(seed=SEED, include_valid=True)
    boundary_cases = {
        (case.quantity, case.end_offset - case.start_offset + 1)
        for case in cases if case.category == "VALID_BOUNDARY"
    }
    checks = {
        "expected_group_counts": counts == Counter({
            "INVERTED_DATES": 100, "OVERSIZED_QUANTITY": 100,
            "LONG_RANGE": 100, "VALID_BOUNDARY": 4,
        }),
        "unique_test_ids": len({case.test_id for case in cases}) == len(cases),
        "labels_match_input_rules": not mismatches,
        "same_seed_reproduces_cases": same_seed_equal,
        "expected_valid_boundaries": boundary_cases == {(1, 1), (1, 90), (50, 1), (50, 90)},
    }
    summary = {
        "scope": "Input-data inspection only; no target execution or fuzzing verdicts.",
        "seed": SEED,
        "total_cases": len(cases),
        "group_counts": dict(counts),
        "valid_labels": sum(case.is_valid_payload for case in cases),
        "invalid_labels": sum(not case.is_valid_payload for case in cases),
        "unique_input_values": len(input_ids),
        "duplicate_occurrences_beyond_first": len(cases) - len(input_ids),
        "duplicate_groups": duplicates,
        "label_mismatch_ids": mismatches,
        "checks": checks,
        "data_checks_passed": all(checks.values()),
        "generator_sha256": hashlib.sha256((PYTHON_SOURCE / "atpm_gostay/ch4_fuzzing/dynamic_fuzzer.py").read_bytes()).hexdigest(),
        "corpus_sha256": hashlib.sha256(corpus_file.read_bytes()).hexdigest(),
    }
    summary_file = OUTPUT / "thong_ke_buoc2.json"
    summary_file.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print("BƯỚC 2 — KIỂM TRA BỘ DỮ LIỆU ĐẦU VÀO")
    print(f"Seed: {SEED}; tổng số ca: {len(cases)}")
    for name, count in counts.items():
        print(f"  {name}: {count}")
    print(f"Nhãn hợp lệ: {summary['valid_labels']}; nhãn không hợp lệ: {summary['invalid_labels']}")
    print(f"Nhãn không khớp quy tắc: {len(mismatches)}")
    print(f"Sinh lại cùng seed có giống nhau: {same_seed_equal}")
    print(f"Bộ giá trị đầu vào khác nhau: {len(input_ids)}")
    print(f"Số lượt trùng ngoài lần đầu: {summary['duplicate_occurrences_beyond_first']}")
    if duplicates:
        print("Ví dụ các ID chứa cùng input:", duplicates[0])
    print("\nMẪU MỖI NHÓM (start/end là độ lệch ngày):")
    for name in counts:
        selected = [case for case in cases if case.category == name]
        for case in (selected if name == "VALID_BOUNDARY" else selected[:1]):
            days = case.end_offset - case.start_offset + 1
            print(f"  ID {case.test_id}: {name}, start={case.start_offset}, end={case.end_offset}, quantity={case.quantity}, days={days}, valid={case.is_valid_payload}")
    print(f"\nKiểm tra dữ liệu đạt: {summary['data_checks_passed']}")
    print("Chưa chạy GoStay; chưa có kết quả ACCEPTED/REJECTED từ chương trình mục tiêu.")
    print("CSV:", corpus_file)
    print("JSON:", summary_file)
    return 0 if summary["data_checks_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
