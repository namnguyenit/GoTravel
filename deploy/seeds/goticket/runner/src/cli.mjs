#!/usr/bin/env node
import { readFileSync, existsSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import {
  ROOT,
  DATA,
  connectAll,
  Manifest,
  phase,
  jsonWrite,
  atomic,
  vnDate,
  secrets,
  sha,
} from "./core.mjs";
import { generate } from "./plan.mjs";
import { buildOrders, finishCash } from "./orders.mjs";
import { buildOperations } from "./operations.mjs";
import { checkPlan, checkStored } from "./checks.mjs";
import { report } from "./report.mjs";
import { scenarios, refreshLive } from "./scenarios.mjs";

const { values } = parseArgs({
  options: {
    profile: { type: "string", default: "full" },
    resume: { type: "string" },
    "refresh-live": { type: "string" },
    "include-exceptions": { type: "boolean" },
    "snapshots-only": { type: "boolean" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(
    "seed-goticket-demo.sh --profile full | --resume RUN_ID | --refresh-live RUN_ID\nOptional: --snapshots-only (skip API scenarios), SEED_ADMIN_ID (existing Auth admin).",
  );
  process.exit(0);
}
if (values.profile !== "full")
  throw Error(
    "Profile không hợp lệ; dùng --profile full hoặc --profile legacy qua shell launcher",
  );
if (values["include-exceptions"])
  throw Error(
    "Exception pack chưa được hỗ trợ; không tạo dữ liệu lỗi vào hệ thống đang phục vụ.",
  );
if (values.resume && values["refresh-live"])
  throw Error("Chọn resume hoặc refresh-live");
let dbs,
  manifest,
  runId,
  p,
  currentPhase = "P0";
const adminFingerprint = async () =>
  sha(
    JSON.stringify(
      (
        await dbs.auth.query(
          `SELECT u.id,u.username,u.password,u.is_active,u.is_deleted,array_agg(r.roles_name ORDER BY r.roles_name) roles FROM users u JOIN users_roles r ON r.user_id=u.id WHERE u.id=$1 GROUP BY u.id`,
          [p.adminId],
        )
      ).rows,
    ),
  );
try {
  dbs = await connectAll();
  const lock = (
    await dbs.car.query(
      "SELECT pg_try_advisory_lock(hashtext('goticket-demo-seed-v1')) AS locked",
    )
  ).rows[0].locked;
  if (!lock) throw Error("Một runner seed khác đang hoạt động");
  console.log(
    `Ngày Việt Nam: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`,
  );
  for (const [key, db] of Object.entries(dbs)) {
    const clock = (
      await db.query(
        "SELECT extract(epoch from now())::float8 as epoch,current_database() as db",
      )
    ).rows[0];
    if (Math.abs(clock.epoch * 1000 - Date.now()) > 30000)
      throw Error(`Đồng hồ ${key} lệch trên 30 giây`);
    console.log(`Database ${key}: ${clock.db}`);
  }
  manifest = new Manifest();
  runId =
    values.resume ||
    values["refresh-live"] ||
    `${vnDate().replaceAll("-", "")}-${randomBytes(3).toString("hex")}`;
  if (!/^\d{8}-[a-f0-9]{6}$/.test(runId)) throw Error("runId không hợp lệ");
  const dir = resolve(DATA, "runs", runId),
    planPath = resolve(dir, "plan.json"),
    progressPath = resolve(dir, "progress.json");
  if (!values.resume && !values["refresh-live"] && existsSync(planPath))
    throw Error("Mã phiên đã tồn tại; chạy lại FULL để lấy mã mới");
  manifest.start(runId);
  if (values.resume || values["refresh-live"]) {
    if (!existsSync(planPath))
      throw Error("Không tìm thấy plan của phiên cần tiếp tục");
    p = JSON.parse(readFileSync(planPath, "utf8"));
  } else {
    const admins = (
      await dbs.auth.query(
        `SELECT u.id FROM users u JOIN users_roles r ON r.user_id=u.id WHERE r.roles_name='ADMIN' AND u.is_active=true AND coalesce(u.is_deleted,false)=false AND ($1::text IS NULL OR u.id=$1)`,
        [process.env.SEED_ADMIN_ID || null],
      )
    ).rows;
    if (admins.length !== 1)
      throw Error(
        "Cần đúng một Admin có sẵn hợp lệ; cấu hình SEED_ADMIN_ID nếu có nhiều tài khoản",
      );
    const response = await fetch(
      (process.env.SEED_PAY_URL || "http://127.0.0.1:8085") +
        "/api/v1/internal/payments/transport/commission",
      {
        headers: {
          "X-Internal-Service-Token":
            secrets.INTERNAL_SERVICE_TOKEN ||
            process.env.INTERNAL_SERVICE_TOKEN ||
            "",
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    const body = await response.json();
    if (
      !response.ok ||
      !body.success ||
      !body.data?.version ||
      !Number.isFinite(Number(body.data.rate))
    )
      throw Error("Không đọc được snapshot hoa hồng transport từ GoPay");
    p = await generate(runId, new Date(), admins[0].id, body.data);
    buildOrders(p);
    buildOperations(p);
    finishCash(p);
    checkPlan(p);
    jsonWrite(planPath, p);
    jsonWrite(progressPath, {
      completed: [],
      startedAt: new Date().toISOString(),
    });
  }
  // Reused admin is checked again, and never mutated by the seed.
  const valid = (
    await dbs.auth.query(
      `SELECT 1 FROM users u JOIN users_roles r ON r.user_id=u.id WHERE u.id=$1 AND r.roles_name='ADMIN' AND u.is_active=true AND coalesce(u.is_deleted,false)=false`,
      [p.adminId],
    )
  ).rowCount;
  if (!valid) throw Error("Admin có sẵn không còn hợp lệ");
  for (const [dbKey, tables] of Object.entries(p.tables)) {
    const cols = (
      await dbs[dbKey].query(
        `SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'`,
      )
    ).rows;
    for (const [table, rows] of Object.entries(tables))
      for (const field of Object.keys(rows[0] || {})) {
        if (
          !cols.some(
            (col) => col.table_name === table && col.column_name === field,
          )
        )
          throw Error(
            `Thiếu schema ${dbKey}.${table}.${field}; migrate riêng trước khi seed`,
          );
      }
  }
  const roles = (
    await dbs.auth.query(`SELECT name FROM role WHERE name=ANY($1::text[])`, [
      ["USER", "STAFF", "TICKET_VENDOR", "ADMIN"],
    ])
  ).rows;
  if (roles.length !== 4)
    throw Error("Auth chưa có đủ 4 role; không tự cấp role Admin trong seed");
  const existingUsers = (
    await dbs.auth.query(
      "SELECT id,username FROM users WHERE username=ANY($1::text[])",
      [p.tables.auth.users.map((u) => u.username)],
    )
  ).rows;
  if (
    existingUsers.some(
      (u) =>
        p.tables.auth.users.find((planned) => planned.username === u.username)
          ?.id !== u.id,
    )
  )
    throw Error("Tên tài khoản demo đã thuộc ID khác; từ chối ghi tiếp");
  const existingPlates = (
    await dbs.car.query(
      "SELECT id,license_plate FROM cars WHERE license_plate=ANY($1::text[])",
      [p.tables.car.cars.map((c) => c.license_plate)],
    )
  ).rows;
  if (
    existingPlates.some(
      (c) =>
        p.tables.car.cars.find(
          (planned) => planned.license_plate === c.license_plate,
        )?.id !== c.id,
    )
  )
    throw Error("Biển số demo trùng xe khác; tạo một phiên mới");
  const fingerprint = await adminFingerprint();
  let progress = existsSync(progressPath)
    ? JSON.parse(readFileSync(progressPath, "utf8"))
    : { completed: [] };
  const write = async (name, key, names) => {
    currentPhase = name;
    if (progress.completed.includes(name)) {
      console.log(`[${name}] đã ghi, giữ nguyên dữ liệu`);
      return;
    }
    const staged = names.map((table) => [
      table,
      (p.tables[key][table] || []).map((row) => {
        if (name === "P2-catalog" && row.status === "ACTIVE")
          return { ...row, status: "HIDDEN" };
        if (name === "P2-car" && table === "trips" && row.status === "ON_SALE")
          return { ...row, status: "DRAFT" };
        if (name === "P3-inventory" && table === "transport_trip_inventory")
          return { ...row, sale_enabled: false };
        return row;
      }),
    ]);
    await phase(dbs, manifest, runId, name, key, staged);
    progress.completed.push(name);
    jsonWrite(progressPath, progress);
  };
  if (!values["refresh-live"]) {
    await write("P1-identity", "auth", [
      "users",
      "user_profiles",
      "users_roles",
      "ticket_vendor_profiles",
    ]);
    await write("P2-catalog", "catalog", ["listings"]);
    await write("P2-car", "car", [
      "operators",
      "cars",
      "seat_templates",
      "operator_stops",
      "routes",
      "route_stops",
      "trips",
      "operator_staff",
    ]);
    await write("P3-inventory", "inventory", [
      "transport_trip_inventory",
      "transport_trip_seats",
      "transport_seat_holds",
      "transport_hold_seats",
      "transport_item_inventory",
      "transport_item_inventory_operations",
      "transport_seat_block_audit",
    ]);
    await write("P4-money", "pay", [
      "payment_requests",
      "payment_transactions",
      "payment_order_notifications",
      "host_payouts",
      "transport_payout_bases",
      "transport_payout_proofs",
      "transport_manual_refunds",
      "transport_cash_settlements",
      "transport_cash_refund_adjustments",
      "transport_cash_commission_payments",
      "transport_item_accounts",
      "transport_item_fund_lots",
      "transport_item_money_operations",
      "transport_item_money_events",
      "transport_item_cash_refund_allocations",
    ]);
    await write("P4-tickets", "car", [
      "issued_tickets",
      "transport_item_operations",
      "transport_audit",
    ]);
    await write("P5-orders", "cart", [
      "transport_cash_shifts",
      "orders",
      "order_items",
      "transport_cash_receipts",
      "transport_refund_confirmations",
      "transport_cash_refund_outbox",
      "order_disputes",
      "transport_item_operations",
      "transport_operation_cash_proofs",
      "transport_operation_refund_proofs",
      "transport_notification_outbox",
    ]);
  }
  if (!values["refresh-live"] && !progress.completed.includes("P5-activate")) {
    // Only this run's staged rows become public, after seats, tickets and money exist.
    await dbs.car.query(
      `UPDATE trips tr SET status=CASE WHEN tr.departure_time>(now() AT TIME ZONE 'UTC')+interval '15 minutes' THEN 'ON_SALE'::"TripStatus" ELSE 'STOP_SALE'::"TripStatus" END FROM json_to_recordset($1::json) AS planned(id text) WHERE tr.id=planned.id AND tr.status='DRAFT'`,
      [
        JSON.stringify(
          p.tables.car.trips
            .filter((tr) => tr.status === "ON_SALE")
            .map((tr) => ({ id: tr.id })),
        ),
      ],
    );
    await dbs.catalog.query(
      `UPDATE listings l SET status='ACTIVE' FROM json_to_recordset($1::json) AS planned(id uuid) WHERE l.id=planned.id AND l.status='HIDDEN'`,
      [
        JSON.stringify(
          p.tables.catalog.listings
            .filter((l) => l.status === "ACTIVE")
            .map((l) => ({ id: l.id })),
        ),
      ],
    );
    await dbs.inventory.query(
      `UPDATE transport_trip_inventory ti SET sale_enabled=true FROM json_to_recordset($1::json) AS planned(trip_id uuid) WHERE ti.trip_id=planned.trip_id AND ti.departure_at>now()+interval '15 minutes'`,
      [
        JSON.stringify(
          p.tables.inventory.transport_trip_inventory
            .filter((tr) => tr.sale_enabled)
            .map((tr) => ({ trip_id: tr.trip_id })),
        ),
      ],
    );
    progress.completed.push("P5-activate");
    jsonWrite(progressPath, progress);
  }
  const allowlistPath = resolve(DATA, "mock-users.txt");
  const priorAllowlist = existsSync(allowlistPath)
    ? readFileSync(allowlistPath, "utf8")
        .split(/\s+/)
        .filter((x) => /^[a-f0-9-]{36}$/.test(x))
    : [];
  const demoUsers = (
    await dbs.auth.query(
      `SELECT id FROM users WHERE id=ANY($1::text[]) AND username LIKE 'gtd\_%' ESCAPE '\\' AND email LIKE '%@example.test' AND is_active=true AND is_deleted=false`,
      [p.credentials.filter((a) => a.group === "user").map((a) => a.id)],
    )
  ).rows;
  atomic(
    allowlistPath,
    [...new Set([...priorAllowlist, ...demoUsers.map((a) => a.id)])].join(
      "\n",
    ) + "\n",
  );
  // Java services run as another member of doAn: allow traversal and read of this UUID-only file, not credential artifacts.
  chmodSync(resolve(ROOT, ".data"), 0o710);
  chmodSync(DATA, 0o710);
  chmodSync(allowlistPath, 0o640);
  currentPhase = "P6-scenarios";
  manifest.phase(runId, currentPhase);
  const results = values["refresh-live"]
    ? await refreshLive(dbs, p, manifest)
    : await scenarios(dbs, p, manifest, dir, values["snapshots-only"]);
  if (values["refresh-live"] && existsSync(resolve(dir, "scenarios.json"))) {
    results.unshift(
      ...JSON.parse(readFileSync(resolve(dir, "scenarios.json"), "utf8")),
    );
  }
  currentPhase = "P7-report";
  const checks = await checkStored(dbs, p, manifest);
  if (fingerprint !== (await adminFingerprint()))
    checks.errors.push(
      "Admin có sẵn đã thay đổi trong lúc seed; cần kiểm tra tác nhân bên ngoài",
    );
  const summary = report(p, checks, results);
  manifest.phase(runId, "P7", summary.status);
  jsonWrite(resolve(dir, "progress.json"), {
    ...progress,
    state: summary.status,
    readyAt: summary.readyAt,
  });
  console.log(
    `Seed ${runId}: ${summary.status}. Tài khoản seed mới: 244; Admin có sẵn: 1.`,
  );
  if (summary.status === "PARTIAL") process.exitCode = 1;
  if (checks.errors.length) {
    console.error(checks.errors.join("\n"));
    process.exitCode = 1;
  }
} catch (e) {
  if (manifest && runId)
    manifest.phase(
      runId,
      currentPhase,
      "FAILED",
      String(e.message).slice(0, 800),
    );
  console.error(`Seed chưa hoàn tất tại ${currentPhase}: ${e.message}`);
  if (runId && existsSync(resolve(DATA, "runs", runId, "plan.json")))
    console.error(
      `Tiếp tục sau khi sửa: ./deploy/seed-goticket-demo.sh --resume ${runId}`,
    );
  process.exitCode = 1;
} finally {
  manifest?.close();
  if (dbs) await Promise.allSettled(Object.values(dbs).map((db) => db.end()));
}
