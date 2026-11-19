const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./server');
const { createDemoData } = require('./demo-data');

test('HTTP API serves local demo data without environment files or outbound requests', async (t) => {
    const now = new Date('2026-11-19T12:00:00Z');
    const expected = createDemoData(now);
    // Deny outbound HTTP(S) while allowing the test client to reach loopback.
    for (const protocol of ['node:http', 'node:https']) {
        const transport = require(protocol);
        for (const method of ['request', 'get']) {
            const original = transport[method];
            t.mock.method(transport, method, function (url, ...args) {
                const host = typeof url === 'string' || url instanceof URL ? new URL(url).hostname : url.hostname || url.host;
                assert.ok(['127.0.0.1', 'localhost', '::1'].includes(host), `Unexpected outbound request: ${host}`);
                return original.call(this, url, ...args);
            });
        }
    }
    const originalFetch = globalThis.fetch;
    t.mock.method(globalThis, 'fetch', (url, options) => {
        assert.equal(new URL(url).hostname, '127.0.0.1', 'Unexpected outbound fetch');
        return originalFetch(url, options);
    });
    const server = createApp({ now: () => now }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => { server.closeAllConnections(); server.close((error) => error ? reject(error) : resolve()); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const [endpoint, result] of [
        ['/api/health', { status: 'ok' }], ['/api/catalog', expected.catalog(7)],
        ['/api/catalog?days=15', expected.catalog(15)], ['/api/catalog?days=30', expected.catalog(30)],
        ['/api/catalog?days=invalid', expected.catalog(7)], ['/api/dashboard', expected.dashboard()],
        ['/api/dashboard/availability', expected.availability()], ['/api/platform', expected.platform()],
        ['/api/platform?metricsOnly=1', expected.platform()],
        ['/api/lms/alfa', expected.institution('alfa')], ['/api/lms/beta', expected.institution('beta')]
    ]) {
        const response = await fetch(base + endpoint);
        assert.equal(response.status, 200, endpoint);
        assert.equal(response.headers.get('set-cookie'), null);
        assert.deepEqual(await response.json(), result, endpoint);
    }
    for (const endpoint of ['/api/missing', '/api/lms/missing', '/api/auth/session', '/api/auth/login', '/api/auth/register', '/api/auth/logout', '/api/users', '/api/users/1', '/v1/tickets/new']) {
        for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
            const response = await fetch(base + endpoint, { method });
            assert.equal(response.status, 404, `${method} ${endpoint}`);
            assert.match(response.headers.get('content-type'), /application\/json/);
            assert.equal((await response.json()).error, true);
        }
    }
    for (const endpoint of ['/', '/#painel-tv', '/any-frontend-path']) {
        const response = await fetch(base + endpoint);
        assert.ok([200, 503].includes(response.status));
        if (response.status === 200) assert.match(await response.text(), /id="root"/);
    }
});
