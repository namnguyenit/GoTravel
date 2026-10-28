import { readFileSync, writeFileSync, renameSync, statSync, chmodSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const source = new URL('../front_end/src/shared/constants/provinces.ts', import.meta.url);
const targets = [
  new URL('../front-end-goticket/src/shared/constants/provinces.ts', import.meta.url),
  new URL('../car/src/trip/domain/value-object/provinces.ts', import.meta.url),
];
function extract(text) {
  const match = text.match(/export\s+const\s+PROVINCES\s*=\s*(\[[\s\S]*?\])\s*(?:as\s+const)?\s*;/);
  if (!match) throw new Error('Không đọc được danh sách PROVINCES của GoStay.');
  const values = JSON.parse(match[1].replace(/,\s*\]/g, ']'));
  if (!values.length || values.some(value => typeof value !== 'string' || !value.trim()) || new Set(values).size !== values.length)
    throw new Error('Danh sách tỉnh nguồn không hợp lệ; dừng đồng bộ.');
  return values;
}
const provinces = extract(readFileSync(source, 'utf8'));
for (const target of targets) {
  let old;
  try { old = extract(readFileSync(target, 'utf8')); } catch { old = null; }
  if (JSON.stringify(old) === JSON.stringify(provinces)) continue;
  if (process.argv.includes('--check')) throw new Error(`Danh sách tỉnh chưa đồng bộ: ${fileURLToPath(target)}`);
  const path = fileURLToPath(target), temporary = `${path}.sync-${randomUUID()}`;
  writeFileSync(temporary, '// Generated from front_end/src/shared/constants/provinces.ts; do not edit this copy.\nexport const PROVINCES = '+JSON.stringify(provinces,null,2)+';\n');
  let mode = 0o644;
  try { mode = statSync(path).mode & 0o777; } catch {}
  chmodSync(temporary, mode); renameSync(temporary, path);
}
console.log(`GoTicket frontend/backend dùng đúng ${provinces.length} tỉnh/thành từ GoStay.`);
