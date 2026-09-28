/**
 * ==============================================================================
 * Layer 2: Integration Test Suite — REST API & Optimistic Concurrency Control
 * Validates real HTTP interactions against the Express application layer.
 * ==============================================================================
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../../server');

describe('Layer 2: Integration Tests — API & Data Layer', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });


  // Helper HTTP request function using native Node http
  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqOpts = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      };

      const req = http.request(url, reqOpts, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch (_) {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  it('1. GET /api/health — should return 200 OK with health details', async () => {
    const res = await request('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.service.includes('Collaborative Grocery List API'));
  });

  let createdItemId = null;

  it('2. POST /api/items — should create an item and return 201 Created with version 1', async () => {
    const payload = {
      name: 'Organic Honeycrisp Apples',
      quantity: '4 pcs',
      category: 'Produce',
    };
    const res = await request('/api/items', { method: 'POST' }, payload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, 'Organic Honeycrisp Apples');
    assert.strictEqual(res.body.data.quantity, '4 pcs');
    assert.strictEqual(res.body.data.category, 'PRODUCE');
    assert.strictEqual(res.body.data.version, 1);
    assert.strictEqual(res.body.data.isCompleted, false);

    createdItemId = res.body.data.id;
  });

  it('3. GET /api/items/:id — should retrieve the created item', async () => {
    const res = await request(`/api/items/${createdItemId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, createdItemId);
  });

  it('4. PATCH /api/items/:id/toggle — should toggle status and increment version to 2', async () => {
    const res = await request(`/api/items/${createdItemId}/toggle`, { method: 'PATCH' }, { expectedVersion: 1 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.isCompleted, true);
    assert.strictEqual(res.body.data.version, 2);
  });

  it('5. OCC Conflict: PATCH with stale version should return 409 Conflict', async () => {
    // Server is at version 2; sending expectedVersion: 1 must trigger a conflict
    const res = await request(`/api/items/${createdItemId}/toggle`, { method: 'PATCH' }, { expectedVersion: 1 });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.code, 'ERR_CONFLICT');
    assert.ok(res.body.error.includes('Concurrent modification detected'));
  });

  it('6. GET /api/export — should return CSV stream with RFC 4180 headers', async () => {
    const res = await request('/api/export?format=csv');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.body.includes('Item Name,Quantity,Category,Status,Created At'));
  });

  it('7. DELETE /api/items/:id — should delete the item and return 200', async () => {
    const res = await request(`/api/items/${createdItemId}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, createdItemId);

    // Follow-up lookup must be 404
    const notFoundRes = await request(`/api/items/${createdItemId}`);
    assert.strictEqual(notFoundRes.status, 404);
  });
});
