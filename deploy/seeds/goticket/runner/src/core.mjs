import { createHash, createHmac } from "node:crypto";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  chmodSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import { parse as envParse } from "dotenv";
import { parse as yamlParse } from "yaml";

export const ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);
export const DATA = resolve(ROOT, ".data/goticket-demo");
export const DBS = {
  auth: "Identity",
  car: "car",
  catalog: "CatalogandListing",
  inventory: "BookingandInventory",
  cart: "CartandOrder",
  pay: "PaymentandWallet",
};
const read = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return "";
    throw e;
  }
};
export const carEnv = envParse(read(resolve(ROOT, "car/.env")));
const secretDir =
  process.env.GOTRAVEL_SECRETS_DIR || resolve(ROOT, "Identity/.secrets");
export const secrets = envParse(read(resolve(secretDir, "internal.env")));
export function atomic(path, data, mode = 0o600) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, data, { mode });
  chmodSync(tmp, mode);
  renameSync(tmp, path);
}
export const jsonWrite = (path, data) =>
  atomic(path, JSON.stringify(data, null, 2) + "\n");
export const sha = (text) => createHash("sha256").update(text).digest("hex");
export function id(runId, type, key) {
  const h = sha(`goticket-demo-v1:${runId}:${type}:${key}`)
    .slice(0, 32)
    .split("");
  h[12] = "5";
  h[16] = "a";
  const t = h.join("");
  return `${t.slice(0, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}-${t.slice(16, 20)}-${t.slice(20)}`;
}
export function token(ticketId, itemId, generation = 1) {
  const key = process.env.TICKET_SIGNING_KEY || carEnv.TICKET_SIGNING_KEY;
  if (!key || key.length < 32) throw Error("Thiếu TICKET_SIGNING_KEY hợp lệ");
  const suffix = generation > 1 ? `:${generation}` : "";
  return `${ticketId}.${itemId}${generation > 1 ? "." + generation : ""}.${createHmac(
    "sha256",
    key,
  )
    .update(ticketId + ":" + itemId + suffix)
    .digest("base64url")}`;
}
export function vnDate(date = new Date()) {
  return new Date(date.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
}
export function local(day, hour = 0, minute = 0) {
  return new Date(
    `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`,
  );
}
export const plus = (time, minutes) =>
  new Date(new Date(time).getTime() + minutes * 60000);
export const dateOffset = (day, n) => vnDate(plus(local(day), n * 1440));
export const stamp = (date) => new Date(date).toISOString();
// Prisma timestamps are UTC wall timestamps; Spring LocalDateTime uses Vietnam wall time.
export const sqlTime = (key, date) =>
  key === "car" ? stamp(date) : plus(date, 420).toISOString().slice(0, 23);
export async function connectAll() {
  const dbs = {};
  try {
    for (const [key, service] of Object.entries(DBS)) {
      let cfg;
      const override = process.env[`SEED_${key.toUpperCase()}_DATABASE_URL`];
      if (key === "car" || override) {
        const u = new URL(override || carEnv.DATABASE_URL);
        u.search = "";
        cfg = { connectionString: u.toString() };
      } else {
        const doc = yamlParse(
          read(resolve(ROOT, service, "src/main/resources/database.yaml")),
        );
        const source = doc?.spring?.datasource;
        if (!source?.url || !source.username || !source.password)
          throw Error(`Thiếu cấu hình DB ${service}`);
        const u = new URL(source.url.replace(/^jdbc:/, ""));
        cfg = {
          host: process.env.SEED_DB_HOST || u.hostname,
          port: Number(process.env.SEED_DB_PORT || u.port || 5432),
          database: u.pathname.slice(1),
          user: process.env.SEED_DB_USER || source.username,
          password: String(process.env.SEED_DB_PASSWORD || source.password),
        };
      }
      dbs[key] = new pg.Client({
        ...cfg,
        application_name: "goticket-demo-seed",
        connectionTimeoutMillis: 10000,
      });
      await dbs[key].connect();
      await dbs[key].query(
        `SET TIME ZONE '${key === "car" ? "UTC" : "Asia/Ho_Chi_Minh"}'`,
      );
    }
    return dbs;
  } catch (e) {
    await Promise.allSettled(Object.values(dbs).map((db) => db.end()));
    throw e;
  }
}
const ident = (s) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Error("Invalid SQL identifier");
  return '"' + s + '"';
};
export async function insert(db, table, rows) {
  if (!rows.length) return;
  const fields = Object.keys(rows[0]);
  if (rows.some((row) => Object.keys(row).join() !== fields.join()))
    throw Error(`Không đồng nhất field ${table}`);
  const columns = fields.map(ident).join(",");
  for (let i = 0; i < rows.length; i += 400)
    await db.query(
      `INSERT INTO ${ident(table)} (${columns}) SELECT ${columns} FROM json_populate_recordset(NULL::${ident(table)}, $1::json) ON CONFLICT DO NOTHING`,
      [JSON.stringify(rows.slice(i, i + 400))],
    );
}
export class Manifest {
  constructor() {
    mkdirSync(DATA, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(resolve(DATA, "manifest.sqlite"));
    chmodSync(resolve(DATA, "manifest.sqlite"), 0o600);
    this.db.exec(
      `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, state TEXT NOT NULL, phase TEXT, started_at TEXT NOT NULL, updated_at TEXT NOT NULL, error TEXT); CREATE TABLE IF NOT EXISTS records(run_id TEXT NOT NULL, db_key TEXT NOT NULL, table_name TEXT NOT NULL, record_key TEXT NOT NULL, PRIMARY KEY(run_id,db_key,table_name,record_key)); CREATE TABLE IF NOT EXISTS scenarios(run_id TEXT NOT NULL, code TEXT NOT NULL, state TEXT NOT NULL, detail TEXT NOT NULL, PRIMARY KEY(run_id,code));`,
    );
  }
  start(run) {
    this.db
      .prepare("INSERT OR IGNORE INTO runs VALUES(?,?,?,?,?,NULL)")
      .run(run, "RUNNING", "P0", stamp(new Date()), stamp(new Date()));
  }
  phase(run, phase, state = "RUNNING", error = null) {
    this.db
      .prepare(
        "UPDATE runs SET phase=?,state=?,updated_at=?,error=? WHERE id=?",
      )
      .run(phase, state, stamp(new Date()), error, run);
  }
  own(run, key, table, rows) {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO records VALUES(?,?,?,?)",
    );
    this.db.exec("BEGIN");
    try {
      for (const row of rows)
        stmt.run(
          run,
          key,
          table,
          table === "users_roles"
            ? `${row.user_id}:${row.roles_name}`
            : table === "transport_trip_seats"
              ? `${row.trip_id}:${row.seat_id}`
              : table === "transport_hold_seats"
                ? `${row.hold_id}:${row.seat_id}`
                : table === "transport_item_cash_refund_allocations"
                  ? `${row.operation_id}:${row.shift_id}`
                  : table === "transport_reconciliation_findings"
                    ? `${row.order_id}:${row.issue_code}`
                    : String(
                        row.id ||
                          row.command_id ||
                          row.item_id ||
                          row.operation_id ||
                          row.user_id ||
                          row.payout_id ||
                          row.trip_id ||
                          row.order_id ||
                          row.shift_id ||
                          row.hold_id,
                      ),
        );
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
export async function phase(dbs, manifest, run, name, key, tables) {
  manifest.phase(run, name);
  console.log(
    `[${name}] ${key}: ${tables.map(([t, r]) => t + "=" + r.length).join(", ")}`,
  );
  const db = dbs[key];
  await db.query("BEGIN");
  try {
    for (const [table, rows] of tables) await insert(db, table, rows);
    await db.query("COMMIT");
    for (const [table, rows] of tables) manifest.own(run, key, table, rows);
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
}
