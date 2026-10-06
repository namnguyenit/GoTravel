import { existsSync } from 'node:fs';
import { createRouteRegistry } from '../APIGateway/src/gateway/route-registry.js';
import defaults from '../APIGateway/src/gateway/default-config.json' with { type: 'json' };

const dbPath = process.env.GATEWAY_CONFIG_DB;
if (!dbPath || !existsSync(dbPath)) throw new Error('Set GATEWAY_CONFIG_DB to the existing running Gateway SQLite database');
const registry = createRouteRegistry({ dbPath });
try {
  const wanted = defaults.routes.filter(route => route.sourcePath.startsWith('/api/v1/payments/vnpay/'));
  const snapshot = registry.snapshot();
  const updated = registry.mutate(snapshot.version, current => {
    for (const route of wanted) {
      const existing = current.routes.findIndex(r => r.sourcePath === route.sourcePath);
      if (existing >= 0) current.routes[existing] = { ...route, id: current.routes[existing].id };
      else current.routes.push(route);
    }
    // Keep history/code for legacy payments; stop exposing the old provider's callback.
    for (const route of current.routes) {
      if (route.sourcePath === '/api/v1/public/payments/sepay-webhook') route.enabled = false;
    }
    return current;
  }, 'deployment:vnpay', 'Add exact VNPAY GET callbacks and disable SePay ingress');
  console.log(JSON.stringify({ version: updated.version, callbacks: wanted.map(r => r.sourcePath) }));
} finally { registry.close(); }
