import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyInternalToken } from '../src/middlewares/internal-token.middleware.js';
import { verifyMediaJWT } from '../src/middlewares/auth.middleware.js';

const call = (middleware, headers = {}) => {
    let status = 200;
    let nextCalled = false;
    const res = { status(code) { status = code; return this; }, json() { return this; } };
    const req = { headers: { ...headers } };
    middleware(req, res, () => { nextCalled = true; });
    return { status, nextCalled, headers: req.headers };
};

test('internal email denies missing configuration and legacy authentication headers', () => {
    const original = [process.env.EMAIL_INTERNAL_TOKEN, process.env.INTERNAL_SERVICE_TOKEN, process.env.MEDIA_INTERNAL_SERVICE_TOKEN];
    try {
        delete process.env.EMAIL_INTERNAL_TOKEN;
        delete process.env.INTERNAL_SERVICE_TOKEN;
        delete process.env.MEDIA_INTERNAL_SERVICE_TOKEN;
        assert.equal(call(verifyInternalToken, { 'x-internal-service-token': 'anything' }).status, 503);
        process.env.EMAIL_INTERNAL_TOKEN = 'configured-secret';
        assert.equal(call(verifyInternalToken, { 'x-internal-token': 'configured-secret' }).status, 401);
        assert.equal(call(verifyInternalToken, { authorization: 'Bearer configured-secret' }).status, 401);
        assert.equal(call(verifyInternalToken, { 'x-internal-service-token': 'configured-secret' }).nextCalled, true);
    } finally {
        ['EMAIL_INTERNAL_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'MEDIA_INTERNAL_SERVICE_TOKEN'].forEach((name, index) => {
            if (original[index] === undefined) delete process.env[name];
            else process.env[name] = original[index];
        });
    }
});

test('media has no built-in internal token', () => {
    const original = [process.env.INTERNAL_SERVICE_TOKEN, process.env.MEDIA_INTERNAL_SERVICE_TOKEN];
    try {
        delete process.env.INTERNAL_SERVICE_TOKEN;
        delete process.env.MEDIA_INTERNAL_SERVICE_TOKEN;
        assert.equal(call(verifyMediaJWT, { 'x-internal-service-token': 'attacker-supplied-token' }).status, 503);
        process.env.INTERNAL_SERVICE_TOKEN = 'configured-secret';
        assert.equal(call(verifyMediaJWT, { 'x-internal-service-token': 'configured-secret' }).nextCalled, true);
    } finally {
        ['INTERNAL_SERVICE_TOKEN', 'MEDIA_INTERNAL_SERVICE_TOKEN'].forEach((name, index) => {
            if (original[index] === undefined) delete process.env[name];
            else process.env[name] = original[index];
        });
    }
});
