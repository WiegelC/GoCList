/**
 * ==============================================================================
 * Layer 3: End-to-End (E2E) Test Suite — Full User Journey Simulation
 * Simulates complete user journeys from initial state, creation, filtering,
 * completion, spreadsheet export, to final clear.
 * ==============================================================================
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../../server');

describe('Layer 3: End-to-End (E2E) User Journey', () => {
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


  function api(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, baseUrl);
      const req = http.request(
        url,
        {
          method,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            let parsed = data;
            try {
              parsed = JSON.parse(data);
            } catch (_) {}
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  it('Journey Step 1: User verifies HTML application shell & accessible UI controls exist', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

    // Verify critical interactive landmarks
    assert.ok(html.includes('id="btn-add-item"'), 'Add Item button must be present in top toolbar');
    assert.ok(html.includes('id="btn-export-copy"'), 'Export/Copy button must be present in top toolbar');
    assert.ok(html.includes('id="btn-clear-list"'), 'Clear button must be present in top toolbar');
    assert.ok(html.includes('id="btn-theme-toggle"'), 'Theme toggle button must be present in header corner');
    assert.ok(html.includes('id="modal-add-item"'), 'Add modal must exist');
    assert.ok(html.includes('id="modal-confirm-clear"'), 'Confirm clear modal must exist');
  });

  it('Journey Step 2: User clears previous list to begin fresh journey', async () => {
    const res = await api('/api/items', 'DELETE');
    assert.strictEqual(res.status, 200);

    const check = await api('/api/items');
    assert.strictEqual(check.status, 200);
    assert.strictEqual(check.body.count, 0);
  });

  let itemId1, itemId2, itemId3;

  it('Journey Step 3: User adds items across multiple categories with amounts', async () => {
    // 1. Produce item
    const res1 = await api('/api/items', 'POST', {
      name: 'Organic Honeycrisp Apples',
      quantity: '4 pcs',
      category: 'Produce',
    });
    assert.strictEqual(res1.status, 201);
    itemId1 = res1.body.data.id;

    // 2. Dairy item
    const res2 = await api('/api/items', 'POST', {
      name: 'Oat Milk',
      quantity: '2 cartons',
      category: 'Dairy',
    });
    assert.strictEqual(res2.status, 201);
    itemId2 = res2.body.data.id;

    // 3. Bakery item
    const res3 = await api('/api/items', 'POST', {
      name: 'Sourdough Batard',
      quantity: '1 loaf',
      category: 'Bakery',
    });
    assert.strictEqual(res3.status, 201);
    itemId3 = res3.body.data.id;
  });

  it('Journey Step 4: User views complete active list (3 items recorded)', async () => {
    const res = await api('/api/items');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.count, 3);
  });

  it('Journey Step 5: User checks off "Oat Milk" as completed in shopping cart', async () => {
    const res = await api(`/api/items/${itemId2}/toggle`, 'PATCH', { expectedVersion: 1 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.isCompleted, true);
    assert.strictEqual(res.body.data.version, 2);
  });

  it('Journey Step 6: User exports the list for spreadsheets (verifies TSV fidelity)', async () => {
    const res = await api('/api/export?format=tsv');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/tab-separated-values'));

    const lines = res.body.trim().split('\n');
    assert.strictEqual(lines.length, 4); // 1 header + 3 items
    assert.ok(res.body.includes('Organic Honeycrisp Apples\t4 pcs\tPRODUCE\tTo Buy'));
    assert.ok(res.body.includes('Oat Milk\t2 cartons\tDAIRY\tBought'));
  });

  it('Journey Step 7: User completes shopping and clears entire list', async () => {
    const res = await api('/api/items', 'DELETE');
    assert.strictEqual(res.status, 200);

    const emptyCheck = await api('/api/items');
    assert.strictEqual(emptyCheck.body.count, 0);
  });
});
