/*
 * gostay_bmc.c - Mô hình C dùng cho Bounded Model Checking (CBMC)
 * Kiểm chứng bất biến bảo toàn sức chứa phòng trong k bước thực thi.
 */

#include <assert.h>
#include <stdbool.h>

#define CAPACITY 10

typedef struct {
    int available;
    int booked;
    int locked;
    int status; /* 0: LOCKED, 1: CONFIRMED, 2: RELEASED */
} inventory_state_t;

/* Khởi tạo trạng thái ban đầu */
inventory_state_t init_state(void) {
    inventory_state_t s;
    s.available = CAPACITY;
    s.booked = 0;
    s.locked = 0;
    s.status = 2;
    return s;
}

/* Bước 1: Giữ phòng */
void step_batch_lock(inventory_state_t *s, int qty) {
    if (s->available >= qty && qty > 0) {
        s->available -= qty;
        s->locked = qty;
        s->status = 0; /* LOCKED */
    }
}

/* Bước 2: Thanh toán */
void step_confirm_lock(inventory_state_t *s) {
    if (s->status == 0) {
        s->booked += s->locked;
        s->locked = 0;
        s->status = 1; /* CONFIRMED */
    }
}

/* Bước 3 (v0): Hủy thiếu guard gây overbooking */
void step_cancel_lock_v0(inventory_state_t *s) {
    if (s->status != 2) { /* LỖI: CONFIRMED vẫn hủy được */
        s->available += 1;
        s->status = 2;
    }
}

/* Bước 3 (v1): Hủy có guard chặt chẽ */
void step_cancel_lock_v1(inventory_state_t *s) {
    if (s->status == 0) { /* Chỉ cho hủy khi LOCKED */
        s->available += s->locked;
        s->locked = 0;
        s->status = 2;
    }
}

/* Hàm kiểm tra BMC cho v0: CBMC sẽ phát hiện assertion failure */
void check_bmc_v0(void) {
    inventory_state_t s = init_state();
    step_batch_lock(&s, 1);
    step_confirm_lock(&s);
    step_cancel_lock_v0(&s);

    /* BẤT BIẾN: Tổng phòng trống + đã bán không được vượt quá capacity */
    assert(s.available + s.booked <= CAPACITY);
}

/* Hàm kiểm tra BMC cho v1: CBMC xác nhận luôn thỏa mãn */
void check_bmc_v1(void) {
    inventory_state_t s = init_state();
    step_batch_lock(&s, 1);
    step_confirm_lock(&s);
    step_cancel_lock_v1(&s);

    assert(s.available + s.booked <= CAPACITY);
}


#include <stdio.h>
#include <string.h>

int main(int argc, char **argv) {
    printf("=========================================================\n");
    printf("  KIEM CHUNG C BOUNDED MODEL CHECKING (GOSTAY BMC)\n");
    printf("=========================================================\n");
    printf("[*] Kiem chung Ban v1 (k=3 buoc: lock -> confirm -> cancel)...\n");
    check_bmc_v1();
    printf("[+] KET QUA: check_bmc_v1() PASS (Bat bien phong <= 10 giu vung)\n");

    if (argc > 1 && strcmp(argv[1], "--test-v0") == 0) {
        printf("\n[-] Dang chay ban v0 (se bi dung vi assert failure: 11 > 10)...\n");
        check_bmc_v0();
    } else {
        printf("[*] (Chay voi '--test-v0' de xem v0 bi crash boi lenh assert)\n");
    }
    return 0;
}

