import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileConfiguration } from '../src/gateway/config-validation.js';

const match = compileConfiguration({
  services: [{ key: 'search', target: 'http://127.0.0.1:8086' }],
  routes: [{ id: 'province-destinations', enabled: true, priority: 0,
    serviceKey: 'search', auth: 'public', methods: ['GET'], matchType: 'exact',
    sourcePath: '/api/v1/recommendations/provinces/:province/destinations',
    upstreamPath: '/api/v1/recommendations/provinces/:province/destinations',
    paramTypes: { province: 'string' }, preserveQuery: true, query: { remove: [], set: {} } }],
});
const path = province => `/api/v1/recommendations/provinces/${province}/destinations`;

test('province names containing spaces and Vietnamese characters reach the backend as encoded parameters', () => {
  for (const province of ['Hà Nội', 'Đà Nẵng', 'Thừa Thiên Huế']) {
    const result = match('GET', `${path(encodeURIComponent(province))}?limit=6`);
    assert.equal(result.backendUrl, `http://127.0.0.1:8086${path(encodeURIComponent(province))}?limit=6`);
  }
});

test('encoded separators, controls, traversal, double encoding and padded privileged names stay blocked', () => {
  for (const value of ['%2f', '%5c', '%00', '%09', '%0a', '%0d', '%7f', '%2e', '%2e%2e',
    '%252f', '%252e%252e', '%20admin', 'admin%20', 'host', 'me', '%ZZ']) {
    assert.throws(() => match('GET', path(value)), error => error.status === 400 || error.code === 'UNSAFE_PATH');
  }
});
