# BÀI TẬP LỚN: AN TOÀN PHẦN MỀM (CSE703093)

**Học phần**: An toàn phần mềm - Lớp: N01  
**Đề tài**: Phân tích và kiểm chứng an toàn phần mềm cho hệ thống đặt phòng khách sạn (GoStay)  
**Giảng viên hướng dẫn**: TS. Vũ Quang Dũng  
**Đơn vị**: Khoa Công nghệ Thông tin - Trường Đại học Phenikaa  
**Nhóm thực hiện**: Nhóm 14  
1. **Cao Đức Trung** (Trưởng nhóm - Thành viên 1): Kiểm thử mờ Fuzzing (304 ca), Xây dựng Test suite JUnit, Báo cáo tổng hợp.  
2. **Nguyễn Thành Nhân** (Thành viên 3): Kiểm chứng BMC (CFG DFS k=3), Kiểm thử tích hợp H2 DB, Tái hiện phản ví dụ.  
3. **Lê Đức Long** (MSSV: 23010016 - Thành viên 2): Mô hình Kripke 5 trạng thái & CTL, Z3 SMT Verifier, Phân tích an toàn bộ nhớ C (Cppcheck & ASan).  

---

## CẤU TRÚC THƯ MỤC GÓI BÀI TẬP LỚN (`BTL`)

```text
BTL/
├── Báo Cáo bài tập lớn.docx       # Báo cáo tổng hợp toàn diện đồ án bài tập lớn (Word)
├── Biên bản test.xlsx             # Biên bản kiểm thử đa tầng End-to-End (8 Sheets chi tiết)
├── Bien_ban_test.xlsx             # Bản sao lưu tên không dấu của biên bản kiểm thử
├── README.md                      # Tài liệu hướng dẫn gói nộp bài và các bước chạy mã nguồn
└── code/                          # Toàn bộ mã nguồn thực thi kiểm chứng đa tầng
    ├── 01_Java_Reference/         # Mã nguồn Java nghiệp vụ đối chứng
    │   ├── v0/InventoryInternalService.java  # Bản gốc chưa vá (Tồn tại lỗ hổng)
    │   └── v1/InventoryInternalService.java  # Bản vá an toàn (Bổ sung Guard & Math.addExact)
    ├── 02_C_Bounded_Model_Checking/          # Kiểm chứng mô hình giới hạn BMC theo CFG & DFS
    │   ├── bmc.c                             # Mã nguồn C mô phỏng đồ thị CFG và thuật toán DFS
    │   └── bmc_explorer                      # Binary thực thi chạy kiểm tra độ sâu k=1, 2, 3
    ├── 03_Python_Z3_SMT/          # Kiểm chứng điều kiện xử lý và số học bằng Z3 Solver
    │   └── z3_verifier.py                    # Script giải 5 bài toán SMT Z3 (Overbooking, Overflow, ...)
    ├── 04_Pipeline_Fuzzing/       # Kiểm thử động mờ Fuzzing tầng nghiệp vụ Java
    │   ├── pipeline_fuzzing.py               # Pipeline chạy tự động hóa kiểm thử
    │   ├── dynamic_fuzzer.py                 # Bộ sinh tập dữ liệu 304 ca test từ Seed 703093
    │   └── inspect_corpus.py                 # Công cụ đọc và phân tích tập dữ liệu kiểm thử mẫu
    └── 05_Checkmemory/            # Thí nghiệm kiểm tra an toàn bộ nhớ C (Cppcheck & ASan)
        ├── gostay_lock_vulnerable.c          # Bản C v0 (CWE-415 Double Free, CWE-401 Memory Leak)
        └── gostay_lock_fixed.c               # Bản C v1 (Đã gia cố: gán *lock_ptr = NULL sau free)
```

---

## HƯỚNG DẪN THỰC THI KIỂM CHỨNG

### 1. Kiểm chứng mô hình giới hạn BMC (C Engine)
```bash
cd code/02_C_Bounded_Model_Checking
gcc -O2 bmc.c -o bmc_explorer
./bmc_explorer
```

### 2. Kiểm chứng logic hình thức & Bất biến số học bằng Z3 SMT Solver
```bash
cd code/03_Python_Z3_SMT
python3 z3_verifier.py
```

### 3. Kiểm thử động Fuzzing tầng nghiệp vụ Java
```bash
cd code/04_Pipeline_Fuzzing
python3 pipeline_fuzzing.py
```

### 4. Kiểm tra an toàn bộ nhớ C bằng Cppcheck & Clang AddressSanitizer
```bash
cd code/05_Checkmemory
# Kiểm tra tĩnh Cppcheck:
cppcheck --enable=all gostay_lock_vulnerable.c
cppcheck --enable=all gostay_lock_fixed.c

# Biên dịch với AddressSanitizer (ASan):
clang -fsanitize=address -g gostay_lock_fixed.c -o test_fixed
./test_fixed
```
