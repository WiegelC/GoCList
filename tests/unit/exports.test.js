/**
 * ==============================================================================
 * Layer 1: Unit Test Suite — Spreadsheet Export & Formatting Engine
 * Uses native Node.js test runner (node:test & node:assert)
 * ==============================================================================
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const groceryService = require('../../src/services/grocery.service');
const repository = require('../../src/repositories/grocery.repository');

describe('Layer 1: Unit Tests — Export Engine & Formatter', () => {
  const sampleItems = [
    {
      id: 'item-1',
      name: 'Organic Honeycrisp Apples',
      quantity: '4 pcs',
      category: 'PRODUCE',
      isCompleted: false,
      version: 1,
      createdAt: '2026-09-27T10:00:00.000Z',
    },
    {
      id: 'item-2',
      name: 'Oat Milk, "Barista Edition"',
      quantity: '2 cartons',
      category: 'DAIRY',
      isCompleted: true,
      version: 2,
      createdAt: '2026-09-27T10:05:00.000Z',
    },
  ];

  it('should format spreadsheet TSV with exact tab delimiters (\\t) for Google Sheets / Excel', async () => {
    // Mock repository response
    const origFindAll = repository.findAll;
    repository.findAll = async () => sampleItems;

    try {
      const { contentType, filename, content } = await groceryService.exportData('tsv');

      assert.strictEqual(contentType, 'text/tab-separated-values');
      assert.strictEqual(filename, 'grocery-list.tsv');

      const lines = content.split('\n');
      assert.strictEqual(lines[0], 'Item Name\tQuantity\tCategory\tStatus');
      assert.strictEqual(lines[1], 'Organic Honeycrisp Apples\t4 pcs\tPRODUCE\tTo Buy');
      assert.strictEqual(lines[2], 'Oat Milk, "Barista Edition"\t2 cartons\tDAIRY\tBought');
    } finally {
      repository.findAll = origFindAll;
    }
  });

  it('should format RFC 4180 compliant CSV escaping commas and quotes', async () => {
    const origFindAll = repository.findAll;
    repository.findAll = async () => sampleItems;

    try {
      const { contentType, filename, content } = await groceryService.exportData('csv');

      assert.strictEqual(contentType, 'text/csv');
      assert.strictEqual(filename, 'grocery-list.csv');

      const lines = content.split('\n');
      assert.strictEqual(lines[0], 'Item Name,Quantity,Category,Status,Created At');
      
      // Quotes inside item name must be escaped as double double-quotes: ""Barista Edition""
      assert.ok(lines[2].includes('"Oat Milk, ""Barista Edition"""'));
      assert.ok(lines[2].includes('Completed'));
    } finally {
      repository.findAll = origFindAll;
    }
  });
});
