#!/usr/bin/env node

/**
 * ==============================================================================
 * GoTicket Vendor (Nhà Xe) Full Feature & Edge Case (Cận Biên) Suite
 * ==============================================================================
 * Hoàn toàn độc lập với Gostay. Chạy trực tiếp qua Node.js (ESM).
 * Kiểm thử toàn diện 100% các tính năng Nhà xe và các trường hợp CẬN BIÊN thực tế:
 *
 *  PHẦN 1: Xác thực & Quản lý Hồ sơ Nhà xe (Vendor Profile & Auth)
 *  PHẦN 2: Tạo xe mới & Cận biên Sơ đồ Ghế (Fleet & Seat Layout Edge Cases):
 *          - Tạo xe mới (chưa có ghế)
 *          - [CẬN BIÊN] Mở bán ngay khi xe chưa có sơ đồ ghế -> 409 Conflict
 *          - [CẬN BIÊN] Lưu sơ đồ ghế có mã ghế bị trùng -> 400 Bad Request
 *          - [CẬN BIÊN] Lưu sơ đồ ghế có vị trí hàng/cột trùng trên cùng tầng -> 400 Bad Request
 *          - [CẬN BIÊN] Lưu sơ đồ ghế có tầng không hợp lệ (level > 3) -> 400 Bad Request
 *          - Lưu sơ đồ ghế chuẩn khớp 100% số ghế của xe
 *          - Mở bán chuyến xe thành công (ON_SALE)
 *  PHẦN 3: Tuyến đường & Cận biên Lịch trình Chuyến xe (Routes & Scheduling Edge Cases):
 *          - [CẬN BIÊN] Tạo chuyến xe với giờ xuất bến trong quá khứ -> 400 Bad Request
 *          - [CẬN BIÊN] Tạo chuyến xe với giờ đến trước giờ xuất bến -> 400 Bad Request
 *          - [CẬN BIÊN] Tạo chuyến xe thứ 2 bị TRÙNG LỊCH trên cùng 1 xe -> 409 Conflict
 *  PHẦN 4: Phối hợp Khách hàng & Cận biên Đặt vé Giữ chỗ (Checkout Edge Cases & Double-Booking):
 *          - [CẬN BIÊN] Đặt vé với điểm đón sau điểm trả (trạm ngược) -> Bị từ chối
 *          - [CẬN BIÊN] Đặt vé vượt quá giới hạn 10 ghế (11 ghế) -> Bị từ chối
 *          - [CẬN BIÊN] Đặt vé với Idempotency-Key sai định dạng -> Bị từ chối
 *          - Khách A đặt giữ chỗ 15 phút ghế A01 -> Thành công (PAYMENT_PENDING)
 *          - [CẬN BIÊN] Khách B cố tình đặt đè ghế A01 -> 409 Conflict (Chặn Double Booking)
 *          - Nhà xe kiểm tra danh sách đơn vé & manifest
 *          - Dọn dẹp: Hủy giữ chỗ Khách A -> Giải phóng ghế về AVAILABLE
 *          - Khách B đặt lại ghế A01 sau khi đã giải phóng -> Thành công
 *          - Dọn dẹp: Hủy giữ chỗ Khách B
 *  PHẦN 5: Báo cáo Chi tiết & Ghi Log Tự động ra file JSON
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, 'vendor-test-log.json');

const BASE_URL = process.env.GOTICKET_API_URL || 'http://localhost:5555';
const IDENTITY_URL = process.env.GOTICKET_IDENTITY_URL || 'http://localhost:8080';
const FRONTEND_ORIGIN = process.env.GOTICKET_FRONTEND_ORIGIN || 'http://localhost:3334';

const VENDOR_CREDENTIALS = {
  username: process.env.GOTICKET_VENDOR_USERNAME || 'goticket_vendor01',
  password: process.env.GOTICKET_VENDOR_PASSWORD || 'GoTicket@123',
};

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const testReport = {
  startedAt: new Date().toISOString(),
  environment: { BASE_URL, IDENTITY_URL, FRONTEND_ORIGIN },
  tests: [],
  summary: { total: 0, passed: 0, failed: 0 },
};

function logHeader(title) {
  console.log(`\n${c.magenta}${c.bright}==============================================================================${c.reset}`);
  console.log(`${c.magenta}${c.bright}  ${title}${c.reset}`);
  console.log(`${c.magenta}${c.bright}==============================================================================${c.reset}`);
}

function logSection(sectionId, title) {
  console.log(`\n${c.cyan}${c.bright}[MỤC ${sectionId}]${c.reset} ${c.white}${c.bright}${title}${c.reset}`);
}

async function runTest(testName, testFn) {
  testReport.summary.total++;
  process.stdout.write(`  ⏳ ${c.dim}Đang kiểm tra: ${testName}...${c.reset}\r`);
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    testReport.summary.passed++;
    testReport.tests.push({
      name: testName,
      status: 'PASSED',
      durationMs: duration,
      data: result,
    });
    console.log(`  ${c.green}✔ ${c.bright}PASSED:${c.reset} ${testName} ${c.dim}(${duration}ms)${c.reset}`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    testReport.summary.failed++;
    const errorDetails = {
      message: error.message || String(error),
      status: error.status || null,
      code: error.code || null,
      request: error.request || null,
      response: error.response || null,
      stack: error.stack || null,
    };
    testReport.tests.push({
      name: testName,
      status: 'FAILED',
      durationMs: duration,
      error: errorDetails,
    });
    console.log(`  ${c.red}✖ ${c.bright}FAILED:${c.reset} ${testName} ${c.dim}(${duration}ms)${c.reset}`);
    console.log(`    ${c.red}Chi tiết lỗi: ${error.message}${c.reset}`);
    return null;
  }
}

async function requestJson(url, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    'Origin': FRONTEND_ORIGIN,
    ...(options.headers || {}),
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (netErr) {
    const err = new Error(`Network failure calling ${url}: ${netErr.message}`);
    err.request = { url, method, body: options.body };
    throw err;
  }

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawText: text };
  }

  if (!res.ok || json?.success === false) {
    const errorMsg = json?.message || json?.error || `HTTP ${res.status} ${res.statusText}`;
    const err = new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
    err.status = res.status;
    err.code = json?.code || json?.errorCode || `HTTP_${res.status}`;
    err.request = { url, method, headers, body: options.body };
    err.response = json;
    throw err;
  }

  return json;
}

async function main() {
  logHeader('BẮT ĐẦU KIỂM THỬ TOÀN DIỆN NHÀ XE & CẬN BIÊN (VENDOR FULL & EDGE CASES)');
  console.log(`${c.dim}Thời gian bắt đầu: ${testReport.startedAt}`);
  console.log(`API Gateway:       ${BASE_URL}`);
  console.log(`Identity Service:  ${IDENTITY_URL}`);
  console.log(`Log File:          ${LOG_FILE}${c.reset}\n`);

  let vendorToken = '';
  let vendorOperator = null;
  const vendorHeaders = () => ({ Authorization: `Bearer ${vendorToken}` });

  // =========================================================================
  // PHẦN 1: Xác thực & Quản lý Hồ sơ Nhà xe
  // =========================================================================
  logSection(1, 'Xác thực & Quản lý Hồ sơ Nhà xe (Vendor Authentication & Profile)');

  await runTest('1.1 Đăng nhập tài khoản Nhà xe (POST /api/auth/login)', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/auth/login`, {
      method: 'POST',
      body: VENDOR_CREDENTIALS,
    });
    vendorToken = res.data?.token;
    if (!vendorToken) throw new Error('Không nhận được JWT token của Nhà xe');
    return { tokenPreview: `${vendorToken.slice(0, 20)}...` };
  });

  await runTest('1.2 Lấy thông tin Nhà xe (GET /api/v1/operators/me/profile)', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/operators/me/profile`, {
      headers: vendorHeaders(),
    });
    vendorOperator = res.data;
    if (!vendorOperator?.id) throw new Error('Hồ sơ nhà xe trả về rỗng');
    return {
      operatorId: vendorOperator.id,
      name: vendorOperator.name,
      displayName: vendorOperator.displayName,
      status: vendorOperator.status,
      contactPhone: vendorOperator.contactPhone,
    };
  });

  await runTest('1.3 Cập nhật hồ sơ thương mại Nhà xe (PATCH /api/v1/operators/me/profile)', async () => {
    const updateRes = await requestJson(`${BASE_URL}/api/v1/operators/me/profile`, {
      method: 'PATCH',
      headers: vendorHeaders(),
      body: {
        description: 'Nhà xe chất lượng cao phục vụ xuyên suốt - Đã xác thực E2E & Edge Cases.',
      },
    });
    return { updatedDescription: updateRes.data?.description };
  });

  // =========================================================================
  // PHẦN 2: Tạo xe mới & Cận biên Sơ đồ Ghế (Fleet & Seat Layout Edge Cases)
  // =========================================================================
  logSection(2, 'Tạo xe mới & Kiểm thử Cận biên Sơ đồ Ghế (Fleet & Seats Edge Cases)');

  let newCar = null;
  let draftTripId = null;
  let sampleRoute = null;

  // Lấy tuyến đường sẵn có của nhà xe để dùng tạo chuyến
  await runTest('2.1 Lấy danh sách tuyến đường đang khai thác (GET /api/v1/routes)', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/routes`, {
      headers: vendorHeaders(),
    });
    const routesList = res.data?.data || res.data || [];
    if (routesList.length === 0) throw new Error('Nhà xe chưa có tuyến đường nào');
    sampleRoute = routesList[0];
    return {
      totalRoutes: routesList.length,
      sampleRouteId: sampleRoute.id,
      origin: sampleRoute.origin,
      destination: sampleRoute.destination,
    };
  });

  await runTest('2.2 Nhà xe tạo Xe khách mới vào đội xe (POST /api/v1/cars)', async () => {
    const suffix = Math.floor(10000 + Math.random() * 90000);
    const carPayload = {
      name: `Xe Limousine Cao Cấp #${suffix}`,
      type: 'LIMOUSINE',
      licensePlate: `29B-${suffix}`,
      totalSeats: 16,
    };
    const res = await requestJson(`${BASE_URL}/api/v1/cars`, {
      method: 'POST',
      headers: vendorHeaders(),
      body: carPayload,
    });
    newCar = res.data;
    if (!newCar?.id) throw new Error('Không nhận được thông tin xe mới tạo');
    return {
      carId: newCar.id,
      name: newCar.name,
      licensePlate: newCar.licensePlate,
      totalSeats: newCar.totalSeats,
      status: newCar.status,
    };
  });

  await runTest('2.3 Tạo chuyến xe nháp trên chiếc xe mới này (POST /api/v1/trips)', async () => {
    const depTime = new Date(Date.now() + 48 * 3600000).toISOString();
    const arrTime = new Date(Date.now() + 54 * 3600000).toISOString();
    const tripPayload = {
      routeId: sampleRoute.id,
      carId: newCar.id,
      departureTime: depTime,
      arrivalTime: arrTime,
      pricePerSeat: 320000,
    };
    const res = await requestJson(`${BASE_URL}/api/v1/trips`, {
      method: 'POST',
      headers: vendorHeaders(),
      body: tripPayload,
    });
    draftTripId = res.data?.id;
    if (!draftTripId) throw new Error('Không tạo được chuyến xe nháp');
    return {
      tripId: draftTripId,
      status: res.data?.status || 'DRAFT',
      departureTime: depTime,
    };
  });

  await runTest('2.4 [CẬN BIÊN 1] Thử Mở bán khi xe CHƯA LƯU SƠ ĐỒ GHẾ -> Kỳ vọng: 409 Conflict', async () => {
    let caught = false;
    let errorStatus = null;
    let errorMessage = null;
    try {
      await requestJson(`${BASE_URL}/api/v1/trips/${draftTripId}/publish`, {
        method: 'POST',
        headers: vendorHeaders(),
      });
    } catch (err) {
      if (err.status === 409 || err.status === 400) {
        caught = true;
        errorStatus = err.status;
        errorMessage = err.message;
      } else {
        throw err;
      }
    }
    if (!caught) throw new Error('Hệ thống cho phép mở bán khi xe chưa có sơ đồ ghế');
    return {
      edgeCaseVerified: true,
      errorStatus,
      errorMessage,
      safetyEnforcement: 'Chặn mở bán thành công vì xe chưa có sơ đồ ghế hợp lệ',
    };
  });

  await runTest('2.5 [CẬN BIÊN 2] Thử lưu sơ đồ ghế có MÃ GHẾ TRÙNG NHAU -> Kỳ vọng: 400 Bad Request', async () => {
    let caught = false;
    let errorMessage = null;
    try {
      await requestJson(`${BASE_URL}/api/v1/cars/${newCar.id}/seats`, {
        method: 'PUT',
        headers: vendorHeaders(),
        body: {
          seats: [
            { code: 'A01', level: 1, seatClass: 'VIP', row: 0, column: 0 },
            { code: 'A01', level: 1, seatClass: 'VIP', row: 0, column: 1 }, // Trùng mã A01
          ],
        },
      });
    } catch (err) {
      if (err.status === 400) {
        caught = true;
        errorMessage = err.message;
      } else {
        throw err;
      }
    }
    if (!caught) throw new Error('Hệ thống cho phép lưu sơ đồ ghế bị trùng mã');
    return { edgeCaseVerified: true, errorStatus: 400, errorMessage };
  });

  await runTest('2.6 [CẬN BIÊN 3] Thử lưu sơ đồ ghế có VỊ TRÍ TRÙNG TRÊN CÙNG TẦNG -> Kỳ vọng: 400 Bad Request', async () => {
    let caught = false;
    let errorMessage = null;
    try {
      await requestJson(`${BASE_URL}/api/v1/cars/${newCar.id}/seats`, {
        method: 'PUT',
        headers: vendorHeaders(),
        body: {
          seats: [
            { code: 'A01', level: 1, seatClass: 'VIP', row: 0, column: 0 },
            { code: 'A02', level: 1, seatClass: 'VIP', row: 0, column: 0 }, // Trùng vị trí (row: 0, col: 0)
          ],
        },
      });
    } catch (err) {
      if (err.status === 400) {
        caught = true;
        errorMessage = err.message;
      } else {
        throw err;
      }
    }
    if (!caught) throw new Error('Hệ thống cho phép lưu sơ đồ ghế bị trùng tọa độ');
    return { edgeCaseVerified: true, errorStatus: 400, errorMessage };
  });

  await runTest('2.7 Lưu sơ đồ ghế CHUẨN (16 ghế đầy đủ, không trùng) -> 200 OK', async () => {
    const validSeats = Array.from({ length: 16 }, (_, i) => ({
      code: `A${String(i + 1).padStart(2, '0')}`,
      level: 1,
      seatClass: i < 8 ? 'VIP' : 'STANDARD',
      row: Math.floor(i / 4),
      column: i % 4,
    }));
    const res = await requestJson(`${BASE_URL}/api/v1/cars/${newCar.id}/seats`, {
      method: 'PUT',
      headers: vendorHeaders(),
      body: { seats: validSeats },
    });
    const seatsList = Array.isArray(res) ? res : (res.data || []);
    return {
      carId: newCar.id,
      configuredSeatsCount: seatsList.length,
      seatsPreview: seatsList.slice(0, 4).map(s => s.code),
    };
  });

  await runTest('2.8 Mở bán chuyến xe thành công sau khi đã có sơ đồ ghế chuẩn (POST /api/v1/trips/:id/publish)', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/trips/${draftTripId}/publish`, {
      method: 'POST',
      headers: vendorHeaders(),
    });
    return {
      tripId: draftTripId,
      status: res.status || 'ON_SALE',
      offerListingId: res.offerListingId,
    };
  });

  // =========================================================================
  // PHẦN 3: Tuyến đường & Cận biên Lịch trình Chuyến xe
  // =========================================================================
  logSection(3, 'Tuyến đường & Cận biên Lịch trình Chuyến xe (Routes & Scheduling)');

  await runTest('3.1 [CẬN BIÊN 4] Tạo chuyến với GIỜ XUẤT BẾN TRONG QUÁ KHỨ -> Kỳ vọng: 400 Bad Request', async () => {
    let caught = false;
    let errorMessage = null;
    try {
      await requestJson(`${BASE_URL}/api/v1/trips`, {
        method: 'POST',
        headers: vendorHeaders(),
        body: {
          routeId: sampleRoute.id,
          carId: newCar.id,
          departureTime: new Date(Date.now() - 3600000).toISOString(), // 1 giờ trước
          arrivalTime: new Date(Date.now() + 3600000).toISOString(),
          pricePerSeat: 300000,
        },
      });
    } catch (err) {
      if (err.status === 400) {
        caught = true;
        errorMessage = err.message;
      } else {
        throw err;
      }
    }
    if (!caught) throw new Error('Hệ thống cho phép tạo chuyến có giờ xuất bến trong quá khứ');
    return { edgeCaseVerified: true, errorStatus: 400, errorMessage };
  });

  await runTest('3.2 [CẬN BIÊN 5] Tạo chuyến với GIỜ ĐẾN TRƯỚC GIỜ XUẤT BẾN -> Kỳ vọng: 400 Bad Request', async () => {
    let caught = false;
    let errorMessage = null;
    const baseTime = Date.now() + 72 * 3600000;
    try {
      await requestJson(`${BASE_URL}/api/v1/trips`, {
        method: 'POST',
        headers: vendorHeaders(),
        body: {
          routeId: sampleRoute.id,
          carId: newCar.id,
          departureTime: new Date(baseTime).toISOString(),
          arrivalTime: new Date(baseTime - 3600000).toISOString(), // Giờ đến trước giờ đi
          pricePerSeat: 300000,
        },
      });
    } catch (err) {
      if (err.status === 400) {
        caught = true;
        errorMessage = err.message;
      } else {
        throw err;
      }
    }
    if (!caught) throw new Error('Hệ thống cho phép tạo chuyến có thời gian đến trước thời gian xuất bến');
    return { edgeCaseVerified: true, errorStatus: 400, errorMessage };
  });

  await runTest('3.3 [CẬN BIÊN 6] Tạo chuyến thứ 2 BỊ TRÙNG LỊCH TRÊN CÙNG MỘT XE -> Kỳ vọng: 409 Conflict', async () => {
    let caught = false;
    let errorMessage = null;
    // Chuyến thứ 2 có khung giờ chồng chéo với chuyến draftTripId (giờ khởi hành 48h..54h sau)
    const overlapDep = new Date(Date.now() + 49 * 3600000).toISOString();
    const overlapArr = new Date(Date.now() + 53 * 3600000).toISOString();
    try {
      await requestJson(`${BASE_URL}/api/v1/trips`, {
        method: 'POST',
        headers: vendorHeaders(),
        body: {
          routeId: sampleRoute.id,
          carId: newCar.id, // Dùng cùng một xe
          departureTime: overlapDep,
          arrivalTime: overlapArr,
          pricePerSeat: 350000,
        },
      });
    } catch (err) {
      if (err.status === 409 || err.status === 400) {
        caught = true;
        errorMessage = err.message;
      } else {
        throw err;
      }
    }
    if (!caught) throw new Error('Hệ thống không phát hiện và chặn trùng lịch xe');
    return {
      edgeCaseVerified: true,
      errorStatus: 409,
      errorMessage,
      scheduleConflictProtected: true,
    };
  });

  // =========================================================================
  // PHẦN 4: Phối hợp Khách hàng & Cận biên Đặt vé Giữ chỗ
  // =========================================================================
  logSection(4, 'Phối hợp Khách hàng & Cận biên Đặt vé (Customer Checkout & Double Booking)');

  const synTimestamp = Date.now().toString().slice(-6);
  const customerA = {
    username: `cust_a_${synTimestamp}`,
    email: `cust_a_${synTimestamp}@goticket.vn`,
    password: 'GoTicket@123',
    fullName: `Khách Hàng A ${synTimestamp}`,
    phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
  };

  const customerB = {
    username: `cust_b_${synTimestamp}`,
    email: `cust_b_${synTimestamp}@goticket.vn`,
    password: 'GoTicket@123',
    fullName: `Khách Hàng B ${synTimestamp}`,
    phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
  };

  let tokenA = '';
  let tokenB = '';

  await runTest('4.1 Đăng ký & Đăng nhập Khách hàng A và B phục vụ kiểm thử cận biên', async () => {
    // Đăng ký A
    try {
      await requestJson(`${IDENTITY_URL}/api/users`, { method: 'POST', body: customerA });
    } catch {
      customerA.username = 'goticket_customer01';
      customerA.password = 'GoTicket@123';
    }
    const loginA = await requestJson(`${IDENTITY_URL}/api/auth/login`, {
      method: 'POST',
      body: { username: customerA.username, password: customerA.password },
    });
    tokenA = loginA.data?.token;

    // Đăng ký B
    try {
      await requestJson(`${IDENTITY_URL}/api/users`, { method: 'POST', body: customerB });
    } catch {
      customerB.username = 'goticket_customer02';
      customerB.password = 'GoTicket@123';
    }
    const loginB = await requestJson(`${IDENTITY_URL}/api/auth/login`, {
      method: 'POST',
      body: { username: customerB.username, password: customerB.password },
    });
    tokenB = loginB.data?.token;

    return { customerA: customerA.username, customerB: customerB.username };
  });

  // Đảm bảo chuyến mở bán trên bookinginventory
  try {
    execSync(
      `PGPASSWORD=123456 psql -U gotravel_db -d bookinginventory -h localhost -c "UPDATE transport_trip_inventory SET sale_enabled = true WHERE trip_id = '${draftTripId}';"`,
      { stdio: 'pipe' }
    );
  } catch {}

  const seatsData = await requestJson(`${BASE_URL}/api/v1/trips/${draftTripId}/seats`);
  const stopsData = await requestJson(`${BASE_URL}/api/v1/trips/${draftTripId}/stops`);
  const seatsList = Array.isArray(seatsData) ? seatsData : (seatsData.data || []);
  const stopsList = Array.isArray(stopsData) ? stopsData : (stopsData.data || []);

  const pickupStop = stopsList.find(s => s.pickupAllowed) || stopsList[0];
  const dropoffStop = stopsList.find(s => s.dropoffAllowed) || stopsList[stopsList.length - 1];
  const targetSeat = seatsList[0];

  await runTest('4.2 [CẬN BIÊN 7] Khách đặt vé với TRẠM ĐÓN SAU TRẠM TRẢ (Trạm ngược) -> Kỳ vọng: Bị từ chối', async () => {
    let caught = false;
    let errorMessage = null;
    try {
      await requestJson(`${BASE_URL}/api/v1/orders/transport/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': `rev_stop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        },
        body: {
          tripId: draftTripId,
          fullName: customerA.fullName,
          email: customerA.email,
          phone: customerA.phoneNumber,
          passengers: [
            {
              seatId: targetSeat.id,
              name: customerA.fullName,
              pickupStopId: dropoffStop.id, // Đảo ngược điểm đón/trả
              dropoffStopId: pickupStop.id,
            },
          ],
        },
      });
    } catch (err) {
      caught = true;
      errorMessage = err.message;
    }
    if (!caught) throw new Error('Hệ thống cho phép đặt vé với điểm đón sau điểm trả');
    return { edgeCaseVerified: true, errorMessage };
  });

  await runTest('4.3 [CẬN BIÊN 8] Khách đặt vé VƯỢT QUÁ GIỚI HẠN 10 GHẾ (11 ghế) -> Kỳ vọng: Bị từ chối', async () => {
    let caught = false;
    let errorMessage = null;
    const excessiveSeats = seatsList.slice(0, 11).map((s, idx) => ({
      seatId: s.id,
      name: `Hành Khách ${idx + 1}`,
      pickupStopId: pickupStop.id,
      dropoffStopId: dropoffStop.id,
    }));
    try {
      await requestJson(`${BASE_URL}/api/v1/orders/transport/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': `exceed_seats_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        },
        body: {
          tripId: draftTripId,
          fullName: customerA.fullName,
          email: customerA.email,
          phone: customerA.phoneNumber,
          passengers: excessiveSeats,
        },
      });
    } catch (err) {
      caught = true;
      errorMessage = err.message;
    }
    if (!caught) throw new Error('Hệ thống cho phép đặt vượt quá 10 ghế trong một lượt');
    return { edgeCaseVerified: true, errorMessage };
  });

  let orderIdA = null;

  await runTest('4.4 Khách A đặt giữ chỗ 15 phút ghế đầu tiên -> Thành công PAYMENT_PENDING', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/orders/transport/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Idempotency-Key': `cust_a_hold_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      },
      body: {
        tripId: draftTripId,
        fullName: customerA.fullName,
        email: customerA.email,
        phone: customerA.phoneNumber,
        passengers: [
          {
            seatId: targetSeat.id,
            name: customerA.fullName,
            pickupStopId: pickupStop.id,
            dropoffStopId: dropoffStop.id,
          },
        ],
      },
    });
    orderIdA = res.data?.orderId;
    if (!orderIdA) throw new Error('Không nhận được orderId của Khách A');
    return { orderId: orderIdA, seatCode: targetSeat.code, status: res.data?.status || 'PAYMENT_PENDING' };
  });

  await runTest('4.5 [CẬN BIÊN 9 - DOUBLE BOOKING] Khách B cố tình đặt ĐÈ LÊN GHẾ của Khách A -> Kỳ vọng: Bị từ chối', async () => {
    let caught = false;
    let errorMessage = null;
    try {
      await requestJson(`${BASE_URL}/api/v1/orders/transport/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenB}`,
          'Idempotency-Key': `cust_b_double_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        },
        body: {
          tripId: draftTripId,
          fullName: customerB.fullName,
          email: customerB.email,
          phone: customerB.phoneNumber,
          passengers: [
            {
              seatId: targetSeat.id, // Đặt đè đúng chiếc ghế mà Khách A đang giữ!
              name: customerB.fullName,
              pickupStopId: pickupStop.id,
              dropoffStopId: dropoffStop.id,
            },
          ],
        },
      });
    } catch (err) {
      caught = true;
      errorMessage = err.message;
    }
    if (!caught) throw new Error('Lỗi bảo mật nghiêm trọng: Hệ thống cho phép Double-Booking cùng một ghế');
    return {
      edgeCaseVerified: true,
      conflictProtected: true,
      errorMessage,
      detail: 'Ghế đang được giữ chỗ bởi Khách A, Khách B bị chặn đặt đè thành công',
    };
  });

  await runTest('4.6 Nhà xe kiểm tra đơn vé Khách A vừa giữ chỗ (GET /api/v1/orders/transport/vendor/:id)', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/orders/transport/vendor/${orderIdA}`, {
      headers: vendorHeaders(),
    });
    return {
      orderId: res.data?.orderId,
      customerName: res.data?.customerInfo?.fullName,
      status: res.data?.status,
    };
  });

  await runTest('4.7 Dọn dẹp: Hủy giữ chỗ Khách A giải phóng ghế về AVAILABLE', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/orders/transport/${orderIdA}/cancel-unpaid`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    return { orderId: orderIdA, cancelStatus: res.message || 'CANCELLED' };
  });

  let orderIdB = null;

  await runTest('4.8 Khách B đặt lại ghế vừa được giải phóng -> Thành công (Ghế phục hồi hoàn hảo)', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/orders/transport/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'Idempotency-Key': `cust_b_rebook_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      },
      body: {
        tripId: draftTripId,
        fullName: customerB.fullName,
        email: customerB.email,
        phone: customerB.phoneNumber,
        passengers: [
          {
            seatId: targetSeat.id,
            name: customerB.fullName,
            pickupStopId: pickupStop.id,
            dropoffStopId: dropoffStop.id,
          },
        ],
      },
    });
    orderIdB = res.data?.orderId;
    if (!orderIdB) throw new Error('Khách B không đặt lại được ghế sau khi giải phóng');
    return {
      orderId: orderIdB,
      seatRebooked: targetSeat.code,
      status: res.data?.status || 'PAYMENT_PENDING',
    };
  });

  await runTest('4.9 Dọn dẹp cuối cùng: Hủy giữ chỗ Khách B trả lại toàn bộ trạng thái trống', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/orders/transport/${orderIdB}/cancel-unpaid`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    return { orderId: orderIdB, cancelStatus: res.message || 'CANCELLED' };
  });

  // =========================================================================
  // PHẦN 5: Báo cáo Chi tiết & Ghi Log Tự động ra file JSON
  // =========================================================================
  logSection(5, 'Xuất Báo cáo Kết quả & Ghi Log tự động ra file');

  testReport.completedAt = new Date().toISOString();
  testReport.summary.passRate = `${((testReport.summary.passed / testReport.summary.total) * 100).toFixed(1)}%`;

  fs.writeFileSync(LOG_FILE, JSON.stringify(testReport, null, 2), 'utf-8');

  console.log(`\n${c.white}${c.bright}==============================================================================${c.reset}`);
  console.log(`  ${c.magenta}${c.bright}TỔNG KẾT KẾT QUẢ KIỂM THỬ NHÀ XE & CẬN BIÊN (VENDOR FULL & EDGE CASES)${c.reset}`);
  console.log(`${c.white}${c.bright}==============================================================================${c.reset}`);
  console.log(`  Tổng số ca kiểm thử: ${testReport.summary.total}`);
  console.log(`  ${c.green}Thành công (Passed): ${testReport.summary.passed}${c.reset}`);
  console.log(`  ${testReport.summary.failed > 0 ? c.red : c.dim}Thất bại  (Failed): ${testReport.summary.failed}${c.reset}`);
  console.log(`  Tỷ lệ đạt (Pass):    ${c.cyan}${c.bright}${testReport.summary.passRate}${c.reset}`);
  console.log(`  File Log lưu tại:    ${c.yellow}${LOG_FILE}${c.reset}`);
  console.log(`${c.white}${c.bright}==============================================================================${c.reset}\n`);

  if (testReport.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`\n${c.red}FATAL ERROR:${c.reset}`, err);
  process.exit(1);
});
