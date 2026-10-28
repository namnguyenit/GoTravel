import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRouteRegistry } from '../APIGateway/src/gateway/route-registry.js';
import { newRoute } from '../APIGateway/src/gateway/seed-config.js';
const dbPath = process.env.GATEWAY_CONFIG_DB;
if (!dbPath || !existsSync(dbPath)) throw new Error('Set GATEWAY_CONFIG_DB to the existing Gateway database.');
const registry = createRouteRegistry({ dbPath });
try {
  const path = '/api/v1/orders/transport/cancellation-policy';
  const current = registry.snapshot();
  const backup = fileURLToPath(new URL('../.release-backups/goticket-seat-refund-20261026/gateway-before.json', import.meta.url));
  if (!existsSync(backup)) writeFileSync(backup, JSON.stringify(current), { mode: 0o600 });
  if (!current.routes.some(route => route.sourcePath === path)) {
    registry.mutate(current.version, config => ({ ...config, routes: [...config.routes, newRoute({
      id: 'c62b1d30-495d-4a9e-bd06-ff645aba9260', name: 'GoTicket cancellation policy',
      methods: ['GET'], sourcePath: path, upstreamPath: '/api/v1/public/transport/cancellation-policy',
      serviceKey: 'cart', auth: 'public', forwardAuthorization: false, priority: 100,
    })] }), 'goticket-functional-fix', 'Expose read-only GoTicket cancellation policy before checkout');
  }
  console.log('GoTicket read-only policy route configured.');
} finally { registry.close(); }
