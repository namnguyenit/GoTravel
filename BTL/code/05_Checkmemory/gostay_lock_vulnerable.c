/*
 * gostay_lock_vulnerable.c - Mô phỏng cấp phát/giải phóng khóa phòng GoStay (bản v0 có lỗi)
 * Dùng làm đối tượng kiểm tra an toàn bộ nhớ cho Chương 2 (AddressSanitizer & Cppcheck).
 *
 * Lỗ hổng mô phỏng:
 *  1. CWE-415 (Double Free): Gọi cancel_lock khi khóa đã ở trạng thái RELEASED.
 *  2. CWE-416 (Use-After-Free): Gọi confirm_lock khi khóa đã bị free().
 *  3. CWE-401 (Memory Leak): Khóa bị timeout nhưng không được giải phóng.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef enum {
    STATUS_LOCKED,
    STATUS_CONFIRMED,
    STATUS_RELEASED,
    STATUS_EXPIRED
} lock_status_t;

typedef struct {
    int lock_id;
    lock_status_t status;
    int quantity;
} inventory_lock_t;

/* Cấp phát khóa phòng tại s1_holding */
inventory_lock_t *create_lock(int id, int qty) {
    inventory_lock_t *lock = (inventory_lock_t *)malloc(sizeof(inventory_lock_t));
    if (!lock) return NULL;
    lock->lock_id = id;
    lock->status = STATUS_LOCKED;
    lock->quantity = qty;
    return lock;
}

/* Hàm v0: Hủy khóa và giải phóng vùng nhớ (thiếu guard) */
void cancel_lock_v0(inventory_lock_t *lock) {
    if (!lock) return;
    free(lock);
}

/* LỖI 1: Hàm kích hoạt Double Free (CWE-415) */
void trigger_double_free_v0(inventory_lock_t *lock) {
    free(lock);
    free(lock); /* CWE-415: Giải phóng con trỏ 2 lần */
}

/* LỖI 2: Hàm kích hoạt Use-After-Free (CWE-416) */
void trigger_use_after_free_v0(inventory_lock_t *lock) {
    free(lock);
    lock->status = STATUS_CONFIRMED; /* CWE-416: Ghi dữ liệu vào vùng nhớ đã giải phóng */
    printf("UAF lock ID: %d\n", lock->lock_id);
}

/* LỖI 3: Hàm kích hoạt Memory Leak (CWE-401) */
void trigger_memory_leak_v0(void) {
    inventory_lock_t *leak = (inventory_lock_t *)malloc(sizeof(inventory_lock_t));
    leak = (inventory_lock_t *)malloc(sizeof(inventory_lock_t)); /* CWE-401: Mất con trỏ vùng nhớ đầu tiên */
    free(leak);
}

/* Hàm v0: Xác nhận đơn (thiếu kiểm tra con trỏ đã free hay chưa) */
void confirm_lock_v0(inventory_lock_t *lock) {
    lock->status = STATUS_CONFIRMED;
    printf("[v0] Confirm lock %d thanh cong\n", lock->lock_id);
}

/* Hàm mô phỏng rò rỉ bộ nhớ (CWE-401): Hết hạn nhưng không free */
void handle_timeout_v0(inventory_lock_t *lock) {
    if (lock) {
        lock->status = STATUS_EXPIRED;
    }
}


int main(int argc, char **argv) {
    printf("=== MO PHONG LO HONG BO NHO GOSTAY v0 ===\n");
    
    if (argc > 1) {
        inventory_lock_t *l1 = create_lock(101, 2);
        trigger_double_free_v0(l1);

        inventory_lock_t *l2 = create_lock(102, 1);
        trigger_use_after_free_v0(l2);

        trigger_memory_leak_v0();
    }
    return 0;
}
