# Công cụ kiểm chứng GoStay

Chạy từ thư mục gói nộp theo README chính:

```sh
python 03_Kiem_chung_ATPM/run_all_checks.py
```

Runner lưu bằng chứng vào `04_Ket_qua`, không báo PASS cho bước bắt buộc bị bỏ qua. ASan tùy chọn ghi SKIPPED; `--strict-native` yêu cầu ASan thành công.

- `python/atpm_gostay/ch1_kripke`: graph 6 trạng thái, invariant/reachability và AF bằng điểm bất động. Liveness v1 có giả định worker cuối cùng thành công.
- `python/atpm_gostay/ch2_memory_safety`: gọi Cppcheck/compiler thật, lưu command, exit code và diagnostics. Không suy lỗi heap C thành lỗi heap Java.
- `python/atpm_gostay/ch3_smt_bmc`: 5 SMT query và unrolling k bước. UNKNOWN không phải UNSAT.
- `python/atpm_gostay/ch4_fuzzing`: tạo CSV chung và đọc kết quả Java trả về, không mô phỏng verdict.
- `java/JavaAstAnalyzer.java`: JDK Tree API, CSV có file/method/line và metrics theo quy ước.
- `java/InventoryCorpusTest.java`: cùng harness và input cho hai Java version, gồm 300 input sai và 4 input hợp lệ.
- `java/InventoryConcurrencyBaselineTest.java`: tái hiện stale confirm trên baseline trong H2 riêng. PASS nghĩa là tái hiện lỗi.
- `c/ch2_memory`: ví dụ con trỏ có lỗi cài chủ đích và bản sửa.
- `c/ch3_static/gostay_bmc.c`: kịch bản C có assert để minh họa; chạy C bình thường không phải chứng nhận CBMC.

Chạy riêng Python:

```sh
python -m pytest 03_Kiem_chung_ATPM/python/tests -q
```

Lệnh riêng chỉ chạy test mô hình/công cụ Python, không bao gồm bằng chứng Java/C/AST. Dùng runner để đánh giá gói đầy đủ.
