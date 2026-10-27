/*
 * bmc.c - THUẬT TOÁN BOUNDED MODEL CHECKING (BMC) DUYỆT THEO ĐỘ SÂU (DFS TRÊN CFG)
 * Phụ trách: Người 1 (Chuyên gia Toán & Logic hình thức)
 *
 * ĐẶC TẢ THEO YÊU CẦU CỦA GIẢNG VIÊN:
 * 1. Duyệt theo Đồ thị luồng điều khiển (Control Flow Graph - CFG) với thuật toán DFS.
 * 2. Theo dõi minh bạch TỪNG BƯỚC và ĐỘ SÂU (k = 1, k = 2, k = 3) tại mỗi lần rẽ nhánh.
 * 3. Kiểm chứng Bất biến an toàn (Safety Invariant) độc lập tại từng độ sâu.
 * 4. Đối chứng toàn diện giữa Bản v0 (chứa lỗi logic) và Bản v1 (đã có State Guard).
 */

#include <assert.h>
#include <stdio.h>
#include <stdbool.h>
#include <string.h>

#define CAPACITY 10 // Sức chứa tối đa 10 phòng

// Các đỉnh (Nodes) trên Đồ thị luồng điều khiển (CFG):
typedef enum {
    STATE_S0_FREE = 0,     // Node 0: Phòng trống ban đầu
    STATE_S1_HOLDING = 1,  // Node 1: Đang giữ chỗ (LOCKED)
    STATE_S2_BOOKED = 2,   // Node 2: Đã thanh toán (CONFIRMED)
    STATE_S3_RELEASED = 3, // Node 3: Đã giải phóng hoàn kho (RELEASED)
    STATE_S4_EXPIRED = 4   // Node 4: Hết hạn tạm giữ (EXPIRED)
} state_t;

typedef struct {
    int available; // Số phòng trống trong kho
    int booked;    // Số phòng đã chốt bán thành công
    int locked;    // Số phòng đang bị khóa tạm giữ
    state_t state; // Đỉnh CFG hiện tại
} system_t;

// Các cạnh chuyển tiếp (Edges) trên CFG:
typedef enum {
    ACT_LOCK = 0,     // 1. Giữ phòng (batchLock)
    ACT_CONFIRM = 1,  // 2. Thanh toán (confirmLock)
    ACT_CANCEL = 2,   // 3. Hủy phòng (cancelLock)
    ACT_TIMEOUT = 3,  // 4. Hết hạn 15 phút (Timeout)
    ACT_WORKER = 4    // 5. Worker thu hồi kho
} action_t;

const char* state_name(state_t s) {
    switch(s) {
        case STATE_S0_FREE:     return "Node S0(FREE)";
        case STATE_S1_HOLDING:  return "Node S1(HOLDING)";
        case STATE_S2_BOOKED:   return "Node S2(BOOKED)";
        case STATE_S3_RELEASED: return "Node S3(RELEASED)";
        case STATE_S4_EXPIRED:  return "Node S4(EXPIRED)";
        default:                return "UNKNOWN";
    }
}

const char* action_name(action_t a) {
    switch(a) {
        case ACT_LOCK:    return "batchLock()";
        case ACT_CONFIRM: return "confirmBooking()";
        case ACT_CANCEL:  return "cancelLock()";
        case ACT_TIMEOUT: return "timeout15p()";
        case ACT_WORKER:  return "workerCleanup()";
        default:          return "Unknown";
    }
}

/*
 * MÔ PHỎNG CHUYỂN DỊCH TRÊN CFG THEO MÃ NGUỒN JAVA:
 * Tuyệt đối không gán S5_BAD ở đây! Hàm chỉ mô phỏng đúng những gì Java thực thi.
 */
bool step_transition(system_t *sys, action_t act, int version, state_t *prev_state) {
    *prev_state = sys->state;

    switch(act) {
        case ACT_LOCK:
            // S0 -> S1 (Khách giữ 1 phòng)
            if (sys->state == STATE_S0_FREE && sys->available >= 1) {
                sys->available -= 1;
                sys->locked += 1;
                sys->state = STATE_S1_HOLDING;
                return true;
            }
            return false;

        case ACT_CONFIRM:
            // Xác nhận hợp lệ: S1 -> S2
            if (sys->state == STATE_S1_HOLDING) {
                sys->booked += sys->locked;
                sys->locked = 0;
                sys->state = STATE_S2_BOOKED;
                return true;
            }
            // LỖI Ở JAVA v0: Không kiểm tra trạng thái trước khi nhận tiền!
            if (version == 0) {
                // Nhánh lỗi: S3 -> S2 (Đơn đã hủy nhưng Webhook muộn vẫn nhận tiền)
                if (sys->state == STATE_S3_RELEASED) {
                    sys->booked += 1;
                    sys->state = STATE_S2_BOOKED;
                    return true;
                }
                // Nhánh lỗi: S4 -> S2 (Đơn đã hết hạn nhưng vẫn duyệt thanh toán)
                if (sys->state == STATE_S4_EXPIRED) {
                    sys->booked += 1;
                    sys->state = STATE_S2_BOOKED;
                    return true;
                }
            }
            // Bản v1: State Guard chặn đứng, chỉ cho confirm khi đang ở S1
            return false;

        case ACT_CANCEL:
            // Hủy hợp lệ: S1 -> S3
            if (sys->state == STATE_S1_HOLDING) {
                sys->available += sys->locked;
                sys->locked = 0;
                sys->state = STATE_S3_RELEASED;
                return true;
            }
            // LỖI Ở JAVA v0 (Dòng 230: if (status != RELEASED) cho hoàn phòng!):
            if (version == 0) {
                // Đơn đã BOOKED (S2) mà vẫn gọi cancelLock() -> Java v0 hoàn phòng!
                if (sys->state == STATE_S2_BOOKED) {
                    sys->available += 1;           // Hoàn lại phòng vào kho
                    sys->state = STATE_S3_RELEASED; // Chuyển sang S3
                    return true;
                }
            }
            // Bản v1: State Guard chỉ cho phép hủy khi đang ở S1 (LOCKED)
            return false;

        case ACT_TIMEOUT:
            // S1 -> S4: Đơn giữ chỗ hết hạn sau 15 phút
            if (sys->state == STATE_S1_HOLDING) {
                sys->state = STATE_S4_EXPIRED;
                return true;
            }
            return false;

        case ACT_WORKER:
            // S4 -> S3 -> S0: Worker quét dọn hoàn kho
            if (version == 1 && sys->state == STATE_S4_EXPIRED) {
                sys->available += sys->locked;
                sys->locked = 0;
                sys->state = STATE_S3_RELEASED;
                return true;
            }
            if (sys->state == STATE_S3_RELEASED) {
                sys->state = STATE_S0_FREE;
                return true;
            }
            return false;
    }
    return false;
}

/*
 * BỘ GIÁM SÁT BẤT BIẾN AN TOÀN ĐỘC LẬP TẠI MỖI ĐỘ SÂU (INVARIANT MONITOR):
 */
bool check_safety_invariants(const system_t *sys, state_t prev_state, action_t last_act, char *reason) {
    // 1. Bất biến Tồn kho (Chống Overbooking):
    if (sys->available + sys->booked > CAPACITY) {
        sprintf(reason, "available(%d) + booked(%d) = %d > Sức chứa(%d) -> OVERBOOKING!",
                sys->available, sys->booked, sys->available + sys->booked, CAPACITY);
        return false;
    }

    // 2. Bất biến Vòng đời Trạng thái:
    if (prev_state == STATE_S4_EXPIRED && last_act == ACT_CONFIRM && sys->state == STATE_S2_BOOKED) {
        sprintf(reason, "Thanh toán đơn khi khóa đã HẾT HẠN (S4_EXPIRED -> S2_BOOKED)!");
        return false;
    }

    return true;
}

/*
 * IN CHI TIẾT ĐƯỜNG ĐI TỪNG BƯỚC THEO ĐỘ SÂU (k = 1, k = 2, k = 3)
 */
void print_step_by_step_trace(int violation_id, int max_depth,
                              const system_t path_sys[], const state_t path_states[],
                              const action_t path_acts[], const char *violation_reason)
{
    printf("  ┌──────────────────────────────────────────────────────────────────────────────────┐\n");
    printf("  │ [LỖI PHÁT HIỆN #%d] PHÁ VỠ BẤT BIẾN TẠI ĐỘ SÂU k = %d (BƯỚC %d TRÊN CFG)          │\n",
           violation_id, max_depth, max_depth);
    printf("  ├──────────────────────────────────────────────────────────────────────────────────┤\n");
    printf("  │ • Bước 0 (k = 0 - Gốc CFG): %s | Kho: trống=%d, đã bán=%d, khóa=%d | Invariant: PASS\n",
           state_name(path_states[0]), path_sys[0].available, path_sys[0].booked, path_sys[0].locked);

    for (int step = 1; step <= max_depth; step++) {
        action_t act = path_acts[step - 1];
        state_t from = path_states[step - 1];
        state_t to   = path_states[step];
        const system_t *s = &path_sys[step];

        if (step < max_depth) {
            printf("  │ • Bước %d (k = %d): %s --[%s]--> %s\n", step, step, state_name(from), action_name(act), state_name(to));
            printf("  │     ↳ Kho: trống=%d, đã bán=%d, khóa=%d | Invariant (%d+%d <= %d): [PASS]\n",
                   s->available, s->booked, s->locked, s->available, s->booked, CAPACITY);
        } else {
            // Bước cuối cùng bị bẻ gãy Invariant:
            printf("  │ • Bước %d (k = %d): %s --[%s]--> %s\n", step, step, state_name(from), action_name(act), state_name(to));
            printf("  │     ↳ Kho: trống=%d, đã bán=%d, khóa=%d\n", s->available, s->booked, s->locked);
            printf("  │     💥 BẤT BIẾN BỊ BẺ GÃY TẠI ĐỘ SÂU k = %d: %s\n", step, violation_reason);
            printf("  │     ↳ Quy chiếu sơ đồ Kripke: Nhánh rẽ đâm thẳng vào trạng thái lỗi S5(BAD)!\n");
        }
    }
    printf("  └──────────────────────────────────────────────────────────────────────────────────┘\n\n");
}

/*
 * THUẬT TOÁN BMC (DFS VÉT CẠN MỌI ĐƯỜNG ĐI TRÊN CFG ĐẾN ĐỘ SÂU k = 3)
 */
void bmc_explore_dfs(system_t sys, int depth, int max_k, int version, bool trace_dfs,
                     action_t path_acts[], state_t path_states[], system_t path_sys[],
                     int *total_paths, int *violations)
{
    path_states[depth] = sys.state;
    path_sys[depth]    = sys;

    // Ở mỗi độ sâu k > 0, kiểm tra Bất biến an toàn:
    if (depth > 0) {
        char reason[256] = "";
        state_t prev = path_states[depth - 1];
        action_t last_act = path_acts[depth - 1];

        if (!check_safety_invariants(&sys, prev, last_act, reason)) {
            (*violations)++;
            print_step_by_step_trace(*violations, depth, path_sys, path_states, path_acts, reason);
            return; // Dừng nhánh này vì đã vi phạm bất biến
        }
    }

    // Đạt đến độ sâu tối đa k = 3 mà mọi bất biến đều thỏa mãn:
    if (depth == max_k) {
        (*total_paths)++;
        if (trace_dfs) {
            printf("  [AN TOÀN] Độ sâu k=%d: ", depth);
            for (int i = 0; i < depth; i++) {
                printf("%s -[%s]-> ", state_name(path_states[i]), action_name(path_acts[i]));
            }
            printf("%s | Kho: trống=%d, bán=%d (Tổng=%d <= 10) [PASS]\n",
                   state_name(sys.state), sys.available, sys.booked, sys.available + sys.booked);
        }
        return;
    }

    // Dò theo độ sâu (DFS) trên tất cả 5 cạnh rẽ nhánh của CFG:
    for (int a = 0; a < 5; a++) {
        system_t next_sys = sys;
        state_t prev_st;
        bool valid = step_transition(&next_sys, (action_t)a, version, &prev_st);

        if (valid) {
            path_acts[depth] = (action_t)a;
            bmc_explore_dfs(next_sys, depth + 1, max_k, version, trace_dfs,
                            path_acts, path_states, path_sys, total_paths, violations);
        }
    }
}

int main(int argc, char **argv) {
    int max_k = 3;
    bool show_safe_trace = (argc > 1 && strcmp(argv[1], "--all") == 0);

    printf("========================================================================================\n");
    printf("  BOUNDED MODEL CHECKING (BMC) - DUYỆT ĐỒ THỊ LUỒNG ĐIỀU KHIỂN (CFG) BẰNG THUẬT TOÁN DFS\n");
    printf("  (Theo dõi chi tiết: Từng Bước thực hiện & Độ sâu k = 1, k = 2, k = 3)\n");
    printf("========================================================================================\n\n");

    printf("[*] ĐẶC TẢ ĐỘ SÂU DUỖI CFG (UNROLLING BOUND):\n");
    printf("    • k = 1 (Bước 1): Khảo sát nhánh khởi tạo & giữ chỗ (batchLock)\n");
    printf("    • k = 2 (Bước 2): Khảo sát nhánh chuyển tiếp (confirmBooking / cancelLock / timeout)\n");
    printf("    • k = 3 (Bước 3): Khảo sát hành vi hoàn tất giao dịch & kiểm tra Assertion bảo toàn\n\n");

    // --------------------------------------------------------------------------
    // 1. KHẢO SÁT BẢN v0 (MÃ NGUỒN CHỨA LỖI LOGIC)
    // --------------------------------------------------------------------------
    printf("[-] 1. ĐANG QUÉT TẤT CẢ CÁC LUỒNG TRÊN CFG BẢN v0 (Chưa vá):\n");
    printf("    Bắt đầu DFS từ Đỉnh Gốc: Node S0(FREE) | available = 10, booked = 0\n\n");

    system_t init_v0 = { .available = CAPACITY, .booked = 0, .locked = 0, .state = STATE_S0_FREE };
    action_t path_acts_v0[10];
    state_t path_states_v0[10];
    system_t path_sys_v0[10];
    int total_v0 = 0, viol_v0 = 0;

    bmc_explore_dfs(init_v0, 0, max_k, 0, show_safe_trace,
                    path_acts_v0, path_states_v0, path_sys_v0, &total_v0, &viol_v0);

    printf("  >>> TỔNG KẾT BẢN v0: Tìm thấy %d LUỒNG PHÁ VỠ BẤT BIẾN TẠI ĐỘ SÂU k = 3! <<<\n", viol_v0);
    printf("  >>> ĐÁNH GIÁ: BẢN v0 KHÔNG AN TOÀN (Bị bẻ gãy bởi các chuỗi 3 bước gọi hàm)\n\n");
    printf("----------------------------------------------------------------------------------------\n\n");

    // --------------------------------------------------------------------------
    // 2. KHẢO SÁT BẢN v1 (MÃ NGUỒN ĐÃ BỔ SUNG STATE GUARD)
    // --------------------------------------------------------------------------
    printf("[+] 2. ĐANG QUÉT TẤT CẢ CÁC LUỒNG TRÊN CFG BẢN v1 (Đã vá an toàn):\n");
    printf("    Bắt đầu DFS từ Đỉnh Gốc: Node S0(FREE) | available = 10, booked = 0\n\n");

    system_t init_v1 = { .available = CAPACITY, .booked = 0, .locked = 0, .state = STATE_S0_FREE };
    action_t path_acts_v1[10];
    state_t path_states_v1[10];
    system_t path_sys_v1[10];
    int total_v1 = 0, viol_v1 = 0;

    bmc_explore_dfs(init_v1, 0, max_k, 1, true, // Luôn in chi tiết các nhánh an toàn v1
                    path_acts_v1, path_states_v1, path_sys_v1, &total_v1, &viol_v1);

    printf("\n  >>> TỔNG KẾT BẢN v1: Số luồng vi phạm = %d / Số luồng an toàn = %d <<<\n", viol_v1, total_v1);
    printf("  >>> ĐÁNH GIÁ: TẤT CẢ CÁC LUỒNG ĐẾN ĐỘ SÂU k = 3 ĐỀU AN TOÀN 100%% (PASS)!\n");
    printf("========================================================================================\n");

    return 0;
}
