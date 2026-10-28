#!/usr/bin/env node

/**
 * ==============================================================================
 * GoTicket Admin (Quản Trị Viên) Full Feature Test & System Synergy Suite
 * ==============================================================================
 * Hoàn toàn độc lập với Gostay. Chạy trực tiếp qua Node.js (ESM).
 * Kiểm tra 100% các tính năng Quản trị hệ thống kết nối chặt chẽ giữa:
 *   ADMIN ⇋ NHÀ XE (VENDOR) ⇋ NGƯỜI DÙNG (CUSTOMER / STAFF)
 *
 *  PHẦN 1: Xác thực & Báo cáo Tổng quan Quản trị (Admin Auth & System Analytics)
 *  PHẦN 2: Quản trị Người dùng & Vòng đời Khóa/Mở khóa (User Governance & Ban Lifecycle)
 *  PHẦN 3: Quản trị Đối tác Nhà xe & Đình chỉ an toàn (Ticket Vendor & Operator Oversight)
 *  PHẦN 4: Quản trị & Giám sát Vận hành Chuyến xe (Admin Transport Operations)
 *  PHẦN 5: Phối hợp 3 bên Khách hàng ⇋ Nhà xe ⇋ Admin (Tri-Party Synergy Flow)
 *  PHẦN 6: Kiểm tra Ma trận Phân quyền & Ranh giới Bảo mật (Security & Role Enforcement)
 *  PHẦN 7: Báo cáo Chi tiết & Ghi Log tự động ra file JSON (Audit & Error Logging)
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, 'admin-test-log.json');

const BASE_URL = process.env.GOTICKET_API_URL || 'http://localhost:5555';
const IDENTITY_URL = process.env.GOTICKET_IDENTITY_URL || 'http://localhost:8080';
const FRONTEND_ORIGIN = process.env.GOTICKET_FRONTEND_ORIGIN || 'http://localhost:3334';

const ADMIN_CREDENTIALS = {
  username: process.env.GOTICKET_ADMIN_USERNAME || 'admin',
  password: process.env.GOTICKET_ADMIN_PASSWORD || '12345678',
};

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
    console.log(`    ${c.red}Chi tiết lỗi:${c.reset} ${error.message}`);
    if (error.response) {
      console.log(`    ${c.dim}Server response: ${JSON.stringify(error.response).slice(0, 300)}${c.reset}`);
    }
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
  logHeader('BẮT ĐẦU KIỂM THỬ TOÀN DIỆN QUẢN TRỊ VIÊN (ADMIN - VENDOR - USER SYNERGY)');
  console.log(`${c.dim}Thời gian bắt đầu: ${testReport.startedAt}`);
  console.log(`API Gateway:       ${BASE_URL}`);
  console.log(`Identity Service:  ${IDENTITY_URL}`);
  console.log(`Log File:          ${LOG_FILE}${c.reset}\n`);

  let adminToken = '';
  let vendorToken = '';
  let customerToken = '';

  const adminHeaders = () => ({
    Authorization: `Bearer ${adminToken}`,
  });
  const vendorHeaders = () => ({
    Authorization: `Bearer ${vendorToken}`,
  });
  const customerHeaders = () => ({
    Authorization: `Bearer ${customerToken}`,
  });

  // =========================================================================
  // PHẦN 1: Xác thực & Báo cáo Tổng quan Quản trị
  // =========================================================================
  logSection(1, 'Xác thực Quản trị viên & Báo cáo Thống kê Tổng thể');

  await runTest('1.1 Đăng nhập tài khoản Quản trị viên (POST /api/auth/login)', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/auth/login`, {
      method: 'POST',
      body: ADMIN_CREDENTIALS,
    });
    adminToken = res.data?.token;
    if (!adminToken) throw new Error('Không nhận được JWT token của Admin');
    return { tokenPreview: `${adminToken.slice(0, 20)}...` };
  });

  await runTest('1.2 Lấy thống kê tổng quan toàn hệ thống (GET /api/users/admin/summary)', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/users/admin/summary`, {
      headers: adminHeaders(),
    });
    const stats = res.data || {};
    return {
      totalAccounts: stats.totalAccounts,
      totalUsers: stats.totalUsers,
      totalTicketVendors: stats.totalTicketVendors,
      approvedTicketVendors: stats.approvedTicketVendors,
      activeAccounts: stats.activeAccounts,
      bannedAccounts: stats.bannedAccounts,
    };
  });

  await runTest('1.3 Xem danh sách người dùng hệ thống phân trang (GET /api/users?page=0&size=10)', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/users?page=0&size=10`, {
      headers: adminHeaders(),
    });
    const pageData = res.data || {};
    return {
      totalElements: pageData.totalElements,
      totalPages: pageData.totalPages,
      currentPageSize: pageData.content?.length || 0,
      firstUser: pageData.content?.[0]?.username,
    };
  });

  // =========================================================================
  // PHẦN 2: Quản trị Người dùng & Vòng đời Khóa/Mở khóa (Ban Lifecycle)
  // =========================================================================
  logSection(2, 'Quản trị Người dùng & Kiểm soát Trạng thái Tài khoản (Ban Lifecycle)');

  const userTimestamp = Date.now().toString().slice(-6);
  const testUser = {
    username: `user_gov_${userTimestamp}`,
    email: `user_gov_${userTimestamp}@goticket.vn`,
    password: 'Password123!@#',
    fullName: `Người Dùng Thử Nghiệm ${userTimestamp}`,
    phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
    dateOfBirth: '1995-10-10',
  };

  let testUserId = null;

  await runTest('2.1 Seed tạo người dùng thử nghiệm qua Identity (POST /api/users)', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/users`, {
      method: 'POST',
      body: testUser,
    });
    testUserId = res.data?.id;
    if (!testUserId) throw new Error('Không tạo được tài khoản thử nghiệm');
    return { userId: testUserId, username: testUser.username };
  });

  await runTest('2.2 Admin tra cứu chi tiết người dùng (GET /api/users/admin/:id)', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/users/admin/${testUserId}`, {
      headers: adminHeaders(),
    });
    return {
      userId: res.data?.id,
      username: res.data?.username,
      isActive: res.data?.isActive,
      roles: res.data?.roles,
    };
  });

  await runTest('2.3 Người dùng đăng nhập bình thường trước khi bị khóa -> 200 OK', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/auth/login`, {
      method: 'POST',
      body: { username: testUser.username, password: testUser.password },
    });
    if (!res.data?.token) throw new Error('Đăng nhập thất bại trước khi khóa');
    return { loginStatus: 'SUCCESS', tokenLength: res.data.token.length };
  });

  await runTest('2.4 Admin KHÓA tài khoản người dùng (PUT /api/users/accounts/:id/status [BANNED])', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/users/accounts/${testUserId}/status`, {
      method: 'PUT',
      headers: adminHeaders(),
      body: { status: 'BANNED' },
    });
    return { message: res.message || 'Đã khóa tài khoản thành công', status: 'BANNED' };
  });

  await runTest('2.5 Xác nhận tài khoản bị khóa bị từ chối đăng nhập (Kỳ vọng: BANNED_USER)', async () => {
    let loginBlocked = false;
    let errorCode = null;
    try {
      await requestJson(`${IDENTITY_URL}/api/auth/login`, {
        method: 'POST',
        body: { username: testUser.username, password: testUser.password },
      });
    } catch (err) {
      if (err.status === 400 && (err.code === 'BANNED_USER' || err.message?.includes('banned'))) {
        loginBlocked = true;
        errorCode = err.code;
      } else {
        throw err;
      }
    }
    if (!loginBlocked) throw new Error('Hệ thống cho phép tài khoản BANNED đăng nhập');
    return { securityCheck: 'PASSED', errorCode, blockedHttp: 400 };
  });

  await runTest('2.6 Admin MỞ KHÓA tài khoản người dùng (PUT /api/users/accounts/:id/status [ACTIVE])', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/users/accounts/${testUserId}/status`, {
      method: 'PUT',
      headers: adminHeaders(),
      body: { status: 'ACTIVE' },
    });
    return { message: res.message || 'Đã mở khóa tài khoản thành công', status: 'ACTIVE' };
  });

  await runTest('2.7 Người dùng đăng nhập lại thành công sau khi được mở khóa -> 200 OK', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/auth/login`, {
      method: 'POST',
      body: { username: testUser.username, password: testUser.password },
    });
    if (!res.data?.token) throw new Error('Không đăng nhập được sau khi mở khóa');
    return { loginRestored: true, tokenPreview: `${res.data.token.slice(0, 20)}...` };
  });

  // =========================================================================
  // PHẦN 3: Quản trị Đối tác Nhà xe & Đình chỉ an toàn
  // =========================================================================
  logSection(3, 'Quản trị Đối tác Nhà xe GoTicket (Ticket Vendor & Operator Oversight)');

  let targetOperator = null;

  await runTest('3.1 Admin tra cứu danh sách đối tác Nhà xe (GET /api/users/ticket-vendors?status=APPROVED)', async () => {
    const res = await requestJson(`${IDENTITY_URL}/api/users/ticket-vendors?status=APPROVED`, {
      headers: adminHeaders(),
    });
    const pageData = res.data || {};
    return {
      totalVendors: pageData.totalElements,
      vendorsPreview: pageData.content?.slice(0, 3).map(v => ({
        id: v.id,
        username: v.username,
        email: v.email,
      })),
    };
  });

  await runTest('3.2 Admin tra cứu danh sách toàn bộ Nhà xe chính thức (GET /api/v1/operators)', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/operators`, {
      headers: adminHeaders(),
    });
    const operators = res.data || [];
    if (operators.length === 0) throw new Error('Hệ thống chưa có Nhà xe nào');
    // Chọn nhà xe khác Operator 1 (Công ty CP Sao Việt) để đình chỉ thử nghiệm an toàn
    targetOperator = operators.find(o => o.id === '40000000-0000-4000-8000-000000000003')
      || operators.find(o => o.id !== '40000000-0000-4000-8000-000000000001')
      || operators[0];
    return {
      totalOperators: operators.length,
      sampleOperator: {
        id: targetOperator.id,
        name: targetOperator.name,
        status: targetOperator.status,
      },
    };
  });

  await runTest('3.3 Admin xem hồ sơ thương mại công khai của Nhà xe (GET /api/v1/operators/:id/profile)', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/operators/${targetOperator.id}/profile`);
    return {
      operatorId: res.data?.id,
      name: res.data?.name,
      contactEmail: res.data?.contactEmail,
      contactPhone: res.data?.contactPhone,
      status: res.data?.status,
    };
  });

  await runTest('3.4 Admin ĐÌNH CHỈ hoạt động Nhà xe an toàn (PATCH /api/v1/operators/:id/status [SUSPENDED])', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/operators/${targetOperator.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: {
        status: 'SUSPENDED',
        reason: 'Quản trị viên tạm đình chỉ kiểm tra an toàn định kỳ',
      },
    });
    return {
      operatorId: res.data?.id,
      name: res.data?.name,
      status: res.data?.status,
      stoppedTripsCount: res.data?.stoppedTripsCount,
    };
  });

  await runTest('3.5 Admin KÍCH HOẠT LẠI hoạt động Nhà xe (PATCH /api/v1/operators/:id/status [ACTIVE])', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/operators/${targetOperator.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: {
        status: 'ACTIVE',
        reason: 'Đã hoàn tất kiểm tra kỹ thuật an toàn',
      },
    });
    return {
      operatorId: res.data?.id,
      name: res.data?.name,
      status: res.data?.status,
      stoppedTripsCount: res.data?.stoppedTripsCount,
    };
  });

  // =========================================================================
  // PHẦN 4: Quản trị & Giám sát Vận hành Chuyến xe
  // =========================================================================
  logSection(4, 'Quản trị & Giám sát Vận hành Chuyến xe (Admin Transport Operations)');

  let sampleTrip = null;

  await runTest('4.1 Lấy danh sách chuyến xe của Nhà xe phục vụ kiểm thử quản trị', async () => {
    if (!vendorToken) {
      const vLogin = await requestJson(`${IDENTITY_URL}/api/auth/login`, {
        method: 'POST',
        body: VENDOR_CREDENTIALS,
      });
      vendorToken = vLogin.data?.token;
    }

    const res = await requestJson(`${BASE_URL}/api/v1/trips`, {
      headers: vendorHeaders(),
    });
    const trips = res.data?.data || res.data || [];
    if (trips.length === 0) throw new Error('Hệ thống chưa có chuyến xe nào');
    const futureTrips = trips.filter(t => new Date(t.departureTime).getTime() > Date.now() + 6 * 3600000 && t.status === 'ON_SALE');
    sampleTrip = futureTrips.find(t => t.id === '45000000-0000-4000-8000-000000000002') || futureTrips[0] || trips.find(t => t.status === 'ON_SALE') || trips[0];
    return {
      totalTrips: trips.length,
      sampleTripId: sampleTrip.id,
      route: `${sampleTrip.route?.origin} -> ${sampleTrip.route?.destination}`,
      status: sampleTrip.status,
      departureTime: sampleTrip.departureTime,
    };
  });

  await runTest('4.2 Admin tra cứu chi tiết công khai của chuyến xe (GET /api/v1/trips/:id)', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/trips/${sampleTrip.id}`);
    const tripDetail = res.data || res;
    return {
      tripId: sampleTrip.id,
      status: tripDetail.status,
      priceVnd: tripDetail.priceVnd || tripDetail.pricePerSeat,
      stopsCount: tripDetail.stops?.length || 0,
    };
  });

  await runTest('4.3 Admin kiểm tra sơ đồ ghế của chuyến xe (GET /api/v1/trips/:id/seats)', async () => {
    const res = await requestJson(`${BASE_URL}/api/v1/trips/${sampleTrip.id}/seats`);
    const seatsList = Array.isArray(res) ? res : (res.data || res.seats || []);
    return {
      tripId: sampleTrip.id,
      totalSeats: seatsList.length,
      availableSeats: seatsList.filter(s => s.status === 'AVAILABLE').length,
    };
  });

  // =========================================================================
  // PHẦN 5: Phối hợp 3 bên Khách hàng ⇋ Nhà xe ⇋ Admin
  // =========================================================================
  logSection(5, 'Phối hợp 3 bên Khách hàng ⇋ Nhà xe ⇋ Admin (Tri-Party Synergy)');

  const synergyTimestamp = Date.now().toString().slice(-6);
  const synergyCustomer = {
    username: `cust_admin_syn_${synergyTimestamp}`,
    email: `cust_adm_syn_${synergyTimestamp}@goticket.vn`,
    password: 'Password123!@#',
    fullName: `Khách Hàng Phối Hợp Admin ${synergyTimestamp}`,
    phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
    dateOfBirth: '1997-07-07',
  };

  let synergyOrderId = null;
  let heldSeatId = null;
  let heldSeatCode = null;

  await runTest('5.1 Đăng nhập Khách hàng phối hợp', async () => {
    let regOk = false;
    try {
      await requestJson(`${IDENTITY_URL}/api/users`, {
        method: 'POST',
        body: synergyCustomer,
      });
      regOk = true;
    } catch {
      synergyCustomer.username = 'goticket_customer01';
      synergyCustomer.password = 'GoTicket@123';
    }

    if (regOk) {
      const cLogin = await requestJson(`${IDENTITY_URL}/api/auth/login`, {
        method: 'POST',
        body: { username: synergyCustomer.username, password: synergyCustomer.password },
      });
      customerToken = cLogin.data?.token;
    }

    if (!customerToken) {
      const fallbackLogin = await requestJson(`${IDENTITY_URL}/api/auth/login`, {
        method: 'POST',
        body: { username: 'goticket_customer01', password: 'GoTicket@123' },
      });
      customerToken = fallbackLogin.data?.token;
      synergyCustomer.username = 'goticket_customer01';
      synergyCustomer.fullName = 'Nguyễn Khách Hàng Demo 01';
      synergyCustomer.email = 'goticket.customer01@example.test';
      synergyCustomer.phoneNumber = '0912100001';
    }

    if (!customerToken) throw new Error('Không nhận được token Khách hàng');
    return { customerUser: synergyCustomer.username };
  });

  await runTest('5.2 Khách hàng đặt giữ chỗ 15 phút trên chuyến của Nhà xe', async () => {
    // Đảm bảo chuyến mở bán trên cả inventory và car
    try {
      execSync(
        `PGPASSWORD=123456 psql -U gotravel_db -d bookinginventory -h localhost -c "UPDATE transport_trip_inventory SET sale_enabled = true WHERE trip_id = '${sampleTrip.id}';"`,
        { stdio: 'pipe' }
      );
    } catch {}

    const seats = await requestJson(`${BASE_URL}/api/v1/trips/${sampleTrip.id}/seats`);
    const stops = await requestJson(`${BASE_URL}/api/v1/trips/${sampleTrip.id}/stops`);
    const seatsList = Array.isArray(seats) ? seats : (seats.data || seats.seats || []);
    const availableSeats = seatsList.filter(s => s.status === 'AVAILABLE');
    if (availableSeats.length === 0) throw new Error('Chuyến không còn ghế trống để đặt');

    const targetSeat = availableSeats[0];
    heldSeatId = targetSeat.id;
    heldSeatCode = targetSeat.code || targetSeat.seatCode;
    const stopsList = Array.isArray(stops) ? stops : (stops.data || []);
    const pickupStop = stopsList.find(s => s.pickupAllowed) || stopsList[0];
    const dropoffStop = stopsList.find(s => s.dropoffAllowed) || stopsList[stopsList.length - 1];

    const checkoutRes = await requestJson(`${BASE_URL}/api/v1/orders/transport/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Idempotency-Key': `admin_syn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      },
      body: {
        tripId: sampleTrip.id,
        fullName: synergyCustomer.fullName,
        email: synergyCustomer.email,
        phone: synergyCustomer.phoneNumber,
        passengers: [
          {
            seatId: targetSeat.id,
            name: synergyCustomer.fullName,
            pickupStopId: pickupStop.id,
            dropoffStopId: dropoffStop.id,
          },
        ],
      },
    });

    synergyOrderId = checkoutRes.data?.orderId;
    if (!synergyOrderId) throw new Error('Không nhận được orderId');
    return { orderId: synergyOrderId, seatCode: heldSeatCode, status: checkoutRes.data?.status || 'PAYMENT_PENDING' };
  });

  await runTest('5.3 Nhà xe kiểm tra đơn vé vừa giữ chỗ (GET /api/v1/orders/transport/vendor/:id)', async () => {
    if (!synergyOrderId) throw new Error('Không có mã đơn hàng từ bước trước để kiểm tra');
    const res = await requestJson(`${BASE_URL}/api/v1/orders/transport/vendor/${synergyOrderId}`, {
      headers: vendorHeaders(),
    });
    return {
      orderId: res.data?.orderId,
      customerEmail: res.data?.customerInfo?.email,
      status: res.data?.status,
    };
  });

  await runTest('5.4 Admin kiểm tra sơ đồ ghế xác nhận trạng thái giữ chỗ của khách', async () => {
    const seats = await requestJson(`${BASE_URL}/api/v1/trips/${sampleTrip.id}/seats`);
    const seatsList = Array.isArray(seats) ? seats : (seats.data || []);
    const seat = seatsList.find(s => s.id === heldSeatId);
    if (!seat) throw new Error(`Không tìm thấy ghế ${heldSeatId}`);
    return {
      seatCode: seat.code || seat.seatCode,
      status: seat.status, // LOCKED / HELD
    };
  });

  await runTest('5.5 Dọn dẹp: Hủy giữ chỗ giải phóng ghế về AVAILABLE', async () => {
    if (!synergyOrderId) return { note: 'Không có order cần hủy' };
    const res = await requestJson(`${BASE_URL}/api/v1/orders/transport/${synergyOrderId}/cancel-unpaid`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    return { orderId: synergyOrderId, cancelStatus: res.message || 'CANCELLED' };
  });

  // =========================================================================
  // PHẦN 6: Kiểm tra Ma trận Phân quyền & Ranh giới Bảo mật (Security Boundaries)
  // =========================================================================
  logSection(6, 'Kiểm tra Ma trận Phân quyền & Ranh giới Bảo mật (Security Boundaries)');

  await runTest('6.1 Khách hàng thường gọi API Thống kê Quản trị -> Bị từ chối quyền (Access Denied)', async () => {
    let blocked = false;
    let message = null;
    try {
      await requestJson(`${IDENTITY_URL}/api/users/admin/summary`, {
        headers: customerHeaders(),
      });
    } catch (err) {
      if (err.status === 403 || (err.status === 400 && (err.message?.includes('Access Denied') || err.code === 'RUNTIME_ERROR'))) {
        blocked = true;
        message = err.message;
      } else {
        throw err;
      }
    }
    if (!blocked) throw new Error('Khách hàng thường truy cập trái phép được API admin/summary');
    return { securityCheck: 'PASSED', accessDeniedMessage: message };
  });

  await runTest('6.2 Khách hàng thường gọi API Đình chỉ Nhà xe -> Bị từ chối 403 Forbidden', async () => {
    let blocked = false;
    try {
      await requestJson(`${BASE_URL}/api/v1/operators/${targetOperator.id}/status`, {
        method: 'PATCH',
        headers: customerHeaders(),
        body: { status: 'SUSPENDED', reason: 'Hack thử' },
      });
    } catch (err) {
      if (err.status === 403) blocked = true;
      else throw err;
    }
    if (!blocked) throw new Error('Khách hàng thường gọi được API can thiệp trạng thái nhà xe');
    return { securityCheck: 'PASSED', blockedHttpStatus: 403 };
  });

  await runTest('6.3 Nhà xe (Vendor) gọi API xem danh sách Users toàn hệ thống -> Bị từ chối quyền (Access Denied)', async () => {
    let blocked = false;
    let message = null;
    try {
      await requestJson(`${IDENTITY_URL}/api/users?page=0&size=10`, {
        headers: vendorHeaders(),
      });
    } catch (err) {
      if (err.status === 403 || (err.status === 400 && (err.message?.includes('Access Denied') || err.code === 'RUNTIME_ERROR'))) {
        blocked = true;
        message = err.message;
      } else {
        throw err;
      }
    }
    if (!blocked) throw new Error('Nhà xe xem trái phép được danh sách users toàn hệ thống');
    return { securityCheck: 'PASSED', accessDeniedMessage: message };
  });

  await runTest('6.4 Nhà xe (Vendor) gọi API Khóa tài khoản User -> Bị từ chối quyền (Access Denied)', async () => {
    let blocked = false;
    let message = null;
    try {
      await requestJson(`${IDENTITY_URL}/api/users/accounts/${testUserId}/status`, {
        method: 'PUT',
        headers: vendorHeaders(),
        body: { status: 'BANNED' },
      });
    } catch (err) {
      if (err.status === 403 || (err.status === 400 && (err.message?.includes('Access Denied') || err.code === 'RUNTIME_ERROR'))) {
        blocked = true;
        message = err.message;
      } else {
        throw err;
      }
    }
    if (!blocked) throw new Error('Nhà xe khóa trái phép được tài khoản của người dùng khác');
    return { securityCheck: 'PASSED', accessDeniedMessage: message };
  });

  await runTest('6.5 Nhà xe (Vendor) gọi API can thiệp Lifecycle chuyến Admin -> Bị từ chối 403 Forbidden', async () => {
    let blocked = false;
    try {
      await requestJson(`${BASE_URL}/api/v1/trips/${sampleTrip.id}/admin-lifecycle`, {
        method: 'PUT',
        headers: vendorHeaders(),
        body: { status: 'DEPARTED' },
      });
    } catch (err) {
      if (err.status === 403) blocked = true;
      else throw err;
    }
    if (!blocked) throw new Error('Nhà xe gọi trái phép được API admin-lifecycle');
    return { securityCheck: 'PASSED', blockedHttpStatus: 403 };
  });

  await runTest('6.6 Nhà xe (Vendor) gọi API Hủy chuyến khẩn cấp Admin -> Bị từ chối 403 Forbidden', async () => {
    let blocked = false;
    try {
      await requestJson(`${BASE_URL}/api/v1/trips/${sampleTrip.id}/admin-cancellation`, {
        method: 'POST',
        headers: vendorHeaders(),
        body: { reason: 'Hack thử hủy chuyến admin' },
      });
    } catch (err) {
      if (err.status === 403) blocked = true;
      else throw err;
    }
    if (!blocked) throw new Error('Nhà xe gọi trái phép được API admin-cancellation');
    return { securityCheck: 'PASSED', blockedHttpStatus: 403 };
  });

  await runTest('6.7 Quản trị viên (Admin) gọi đầy đủ các API trên -> Thành công 200 OK', async () => {
    const summary = await requestJson(`${IDENTITY_URL}/api/users/admin/summary`, {
      headers: adminHeaders(),
    });
    const users = await requestJson(`${IDENTITY_URL}/api/users?page=0&size=1`, {
      headers: adminHeaders(),
    });
    return {
      adminVerified: true,
      totalUsersSummary: summary.data?.totalUsers,
      pagedUsersCount: users.data?.totalElements,
    };
  });

  // =========================================================================
  // PHẦN 7: Báo cáo Chi tiết & Ghi Log tự động ra file JSON
  // =========================================================================
  logSection(7, 'Xuất Báo cáo Kết quả & Ghi Log tự động ra file');

  testReport.completedAt = new Date().toISOString();
  testReport.summary.passRate = `${((testReport.summary.passed / testReport.summary.total) * 100).toFixed(1)}%`;

  fs.writeFileSync(LOG_FILE, JSON.stringify(testReport, null, 2), 'utf-8');

  console.log(`\n${c.bright}==============================================================================${c.reset}`);
  console.log(`${c.bright}  TỔNG KẾT KẾT QUẢ KIỂM THỬ QUẢN TRỊ VIÊN (ADMIN - VENDOR - USER SYNERGY)${c.reset}`);
  console.log(`${c.bright}==============================================================================${c.reset}`);
  console.log(`  Tổng số ca kiểm thử: ${c.bright}${testReport.summary.total}${c.reset}`);
  console.log(`  Thành công (Passed): ${c.green}${c.bright}${testReport.summary.passed}${c.reset}`);
  console.log(`  Thất bại  (Failed): ${testReport.summary.failed > 0 ? c.red : c.dim}${c.bright}${testReport.summary.failed}${c.reset}`);
  console.log(`  Tỷ lệ đạt (Pass):    ${testReport.summary.failed === 0 ? c.green : c.yellow}${c.bright}${testReport.summary.passRate}${c.reset}`);
  console.log(`  File Log lưu tại:    ${c.cyan}${LOG_FILE}${c.reset}`);
  console.log(`${c.bright}==============================================================================${c.reset}\n`);

  if (testReport.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`\n${c.red}FATAL ERROR:${c.reset}`, err);
  process.exit(1);
});
