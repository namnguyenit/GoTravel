CC = clang
CFLAGS = -Wall -Wextra -g -std=c11
ASAN_FLAGS = -fsanitize=address -fno-omit-frame-pointer

all: test_v0 test_v1

test_v0: gostay_lock_vulnerable.c
	$(CC) $(CFLAGS) $(ASAN_FLAGS) gostay_lock_vulnerable.c -o test_v0

test_v1: gostay_lock_fixed.c
	$(CC) $(CFLAGS) $(ASAN_FLAGS) gostay_lock_fixed.c -o test_v1

clean:
	rm -f test_v0 test_v1 *.o
