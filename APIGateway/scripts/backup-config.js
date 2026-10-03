import "dotenv/config";
import Database from "better-sqlite3";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

process.umask(0o077);
const source = process.env.GATEWAY_CONFIG_DB;
const destination = process.argv[2];
if (!source || !destination) {
  console.error(
    "Usage: GATEWAY_CONFIG_DB=/path/gateway.sqlite npm run config:backup -- /path/backup.sqlite",
  );
  process.exit(1);
}
if (resolve(source) === resolve(destination))
  throw new Error("Backup destination must differ from the live database");
mkdirSync(dirname(resolve(destination)), { recursive: true, mode: 0o700 });
const db = new Database(source, { readonly: true, fileMustExist: true });
try {
  await db.backup(resolve(destination));
  chmodSync(resolve(destination), 0o600);
  console.log(
    `Gateway configuration backup completed: ${resolve(destination)}`,
  );
} finally {
  db.close();
}
