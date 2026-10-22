"""Run the five existing chapter 3 SMT queries, printing fresh solver results.

This is a CLI entry point, not a reader of saved verdicts. The actual constraints
and solver calls remain in atpm_gostay.ch3_smt_bmc.z3_bmc_verifier.
"""
import argparse
import json
import sys
from dataclasses import asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

import z3
from atpm_gostay.ch3_smt_bmc.z3_bmc_verifier import (
    check_inventory_conservation, check_int32_overflow, check_date_inversion,
    check_quantity_limit, check_range_limit,
)

CASES = [
    ('HỦY KHÓA ĐÃ XÁC NHẬN', check_inventory_conservation,
     'Khóa CONFIRMED; A=9, B=1, q=1, capacity=10.',
     'Tìm A_sau_hủy + B > 10.',
     'v0 cho hủy CONFIRMED; v1 chỉ cho hủy LOCKED.'),
    ('TRÀN SỐ KHI HOÀN KHO', check_int32_overflow,
     '0 <= A <= MAX_INT; 1 <= q <= MAX_INT; MAX_INT=2147483647.',
     'Tìm A + q > MAX_INT bằng tổng số nguyên toán học.',
     'v1 thêm A + q <= MAX_INT cho nhánh cập nhật thành công.'),
    ('NGÀY BẮT ĐẦU SAU NGÀY KẾT THÚC', check_date_inversion,
     'start_day >= 0; end_day >= 0.',
     'Tìm end_day < start_day.',
     'v1 thêm end_day >= start_day.'),
    ('SỐ LƯỢNG VƯỢT GIỚI HẠN', check_quantity_limit,
     '1 <= quantity <= 2147483647.',
     'Tìm quantity > 50.',
     'v1 thêm quantity <= 50.'),
    ('KHOẢNG ĐẶT VƯỢT GIỚI HẠN', check_range_limit,
     '1 <= inclusive_days <= 3650; tính cả hai đầu.',
     'Tìm inclusive_days > 90.',
     'v1 thêm inclusive_days <= 90.'),
]


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--case', type=int, nargs='+', choices=range(1, 6),
                        help='Select queries 1..5; defaults to all five')
    args = parser.parse_args()
    selected = list(dict.fromkeys(args.case or range(1, 6)))
    now = datetime.now(timezone(timedelta(hours=7)))
    print('GOSTAY — CHẠY TRỰC TIẾP NĂM TRUY VẤN SMT BẰNG Z3')
    print('Thời gian: ' + now.strftime('%Y-%m-%d %H:%M:%S UTC+07:00'))
    print('Z3: ' + z3.get_version_string())
    print('Nguyên lý: giả thiết + điều kiện được phép + điều kiện vi phạm.')
    print('SAT: có bộ giá trị vi phạm. UNSAT: không có trong miền đã mã hóa.')
    print('Đây là mô hình toán học; không gọi ứng dụng Java hay cơ sở dữ liệu.')
    result_rows = []
    for number in selected:
        title, check, assumptions, violation, fix = CASES[number-1]
        print(f'\n===== SMT {number}: {title} =====')
        print('Giả thiết: ' + assumptions)
        print('Truy vấn vi phạm: ' + violation)
        print('Điều kiện bản sửa: ' + fix)
        for version in ('v0', 'v1'):
            result = check(version)  # Actual new Solver.check() call, no saved result.
            result_rows.append(asdict(result))
            print(f'{version}: {result.status}')
            if result.counterexample:
                print('  Giá trị solver tìm được: ' + json.dumps(result.counterexample, ensure_ascii=False))
            if result.status == 'UNSAT':
                print('  Không tìm được bộ giá trị thỏa đồng thời các ràng buộc trên.')
    bad = [r for r in result_rows if r['status'] != ('SAT' if r['version'] == 'v0' else 'UNSAT')]
    out = Path(__file__).resolve().parents[2]/'Minh_chung_bao_cao'/('SMT_'+now.strftime('%Y%m%d_%H%M%S_%f'))
    out.mkdir(parents=True)
    status = 'PASS' if not bad else 'FAIL'
    (out/'smt_results.json').write_text(json.dumps({
        'started_at': now.isoformat(), 'z3': z3.get_version_string(),
        'cases': selected, 'result': status, 'queries': result_rows,
        'scope': 'Five explicitly encoded mathematical queries; not Java execution.',
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\nKẾT QUẢ ĐỐI CHIẾU: {status}; đã chạy {len(selected)} truy vấn trên mỗi phiên bản.')
    print('PASS ở đây là kết quả khớp kỳ vọng v0 SAT / v1 UNSAT; v0 vẫn có vi phạm.')
    print('Bằng chứng JSON: ' + str(out/'smt_results.json'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
