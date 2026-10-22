/*
 * gostay_lock_fixed.c - Bản vá an toàn bộ nhớ cho GoStay (v1)
 * Triển khai State Guard và gán NULL sau khi free, đảm bảo giải phóng khi timeout.
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

inventory_lock_t *create_lock(int id, int qty) {
    inventory_lock_t *lock = (inventory_lock_t *)malloc(sizeof(inventory_lock_t));
    if (!lock) return NULL;
    lock->lock_id = id;
    lock->status = STATUS_LOCKED;
    lock->quantity = qty;
    return lock;
}

/* Bản vá: Chỉ hủy khi status == STATUS_LOCKED và gán NULL sau khi free */
int cancel_lock_v1(inventory_lock_t **lock_ptr) {
    if (!lock_ptr || !*lock_ptr) return -1;
    
    inventory_lock_t *lock = *lock_ptr;
    if (lock->status != STATUS_LOCKED) {
        printf("[v1 Guard] Tu choi huy vi trang thai khong hop le!\n");
        return -1;
    }
    
    free(lock);
    *lock_ptr = NULL; /* Chống Use-After-Free và Double-Free */
    printf("[v1] Giai phong lock thanh cong va gan NULL.\n");
    return 0;
}

/* Bản vá: Chỉ confirm khi con trỏ khác NULL và đang ở STATUS_LOCKED */
int confirm_lock_v1(inventory_lock_t *lock) {
    if (!lock) {
        printf("[v1 Guard] Con tro NULL hoac lock da bi huy!\n");
        return -1;
    }
    if (lock->status != STATUS_LOCKED) {
        printf("[v1 Guard] Tu choi confirm vi lock khong con LOCKED!\n");
        return -1;
    }
    lock->status = STATUS_CONFIRMED;
    printf("[v1] Confirm lock %d thanh cong.\n", lock->lock_id);
    return 0;
}

/* Bản vá: Worker giải phóng lock khi timeout */
void handle_timeout_v1(inventory_lock_t **lock_ptr) {
    if (lock_ptr && *lock_ptr && (*lock_ptr)->status == STATUS_LOCKED) {
        free(*lock_ptr);
        *lock_ptr = NULL; /* Thu hồi vùng nhớ, triệt tiêu Memory Leak */
        printf("[v1 Worker] Da tu dong thu hoi lock het han.\n");
    }
}

int main(int argc, char **argv) {
    printf("=== KIEM THU BAN VA AN TOAN BO NHO GOSTAY v1 ===\n");
    
    inventory_lock_t *lock1 = create_lock(201, 2);
    cancel_lock_v1(&lock1);
    
    /* Thử lại: gọi confirm trên lock đã hủy -> Bị chặn an toàn */
    confirm_lock_v1(lock1);
    
    /* Thử lại: gọi cancel lần 2 -> Bị chặn an toàn, không double free */
    cancel_lock_v1(&lock1);

    /* Timeout worker: giải phóng sạch sẽ */
    inventory_lock_t *lock2 = create_lock(202, 1);
    handle_timeout_v1(&lock2);

    printf("=== EXERCISED CANCEL / RETRY / TIMEOUT; SEE EXTERNAL TOOL LOGS ===\n");
    return 0;
}
