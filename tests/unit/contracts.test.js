/**
 * ==============================================================================
 * Layer 1: Unit Test Suite — Data Contracts & Boundary Validations
 * Uses native Node.js test runner (node:test & node:assert)
 * ==============================================================================
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  validateCreateItemDTO,
  validateGroceryItem,
  ContractValidationError,
} = require('../../src/contracts/contractValidator');
const {
  ItemCategory,
  normalizeCategory,
  getCategoryDisplayLabel,
} = require('../../src/contracts/grocery.contract');

describe('Layer 1: Unit Tests — Contract & DTO Validation', () => {
  it('should successfully validate and normalize a valid CreateItemDTO', () => {
    const raw = {
      name: '  Organic Honeycrisp Apples  ',
      quantity: '4 pcs',
      category: 'Produce',
    };
    const validated = validateCreateItemDTO(raw);

    assert.strictEqual(validated.name, 'Organic Honeycrisp Apples');
    assert.strictEqual(validated.quantity, '4 pcs');
    assert.strictEqual(validated.category, ItemCategory.PRODUCE);
  });

  it('should normalize compound category names with special characters', () => {
    assert.strictEqual(normalizeCategory('Meat & Seafood'), ItemCategory.MEAT_SEAFOOD);
    assert.strictEqual(normalizeCategory('meat-seafood'), ItemCategory.MEAT_SEAFOOD);
    assert.strictEqual(normalizeCategory('DAIRY'), ItemCategory.DAIRY);
    assert.strictEqual(normalizeCategory('Unknown Random'), ItemCategory.OTHER);
    assert.strictEqual(getCategoryDisplayLabel(ItemCategory.MEAT_SEAFOOD), 'Meat & Seafood');
  });

  it('should reject empty or whitespace-only item labels', () => {
    assert.throws(
      () => validateCreateItemDTO({ name: '   ', quantity: '1' }),
      (err) => err instanceof ContractValidationError && err.message.includes('cannot be empty')
    );
  });

  it('should reject item labels exceeding 150 characters (boundary test)', () => {
    const oversizedName = 'A'.repeat(151);
    assert.throws(
      () => validateCreateItemDTO({ name: oversizedName, quantity: '1' }),
      (err) => err instanceof ContractValidationError && err.message.includes('150 characters')
    );
  });

  it('should reject missing or blank quantity specifications', () => {
    assert.throws(
      () => validateCreateItemDTO({ name: 'Almond Milk', quantity: '' }),
      (err) => err instanceof ContractValidationError && err.message.includes('Quantity')
    );
  });

  it('should reject quantities exceeding 50 characters (boundary test)', () => {
    const oversizedQty = '1'.repeat(51);
    assert.throws(
      () => validateCreateItemDTO({ name: 'Almond Milk', quantity: oversizedQty }),
      (err) => err instanceof ContractValidationError && err.message.includes('50 characters')
    );
  });

  it('should strictly validate a complete GroceryItemContract entity', () => {
    const validEntity = {
      id: 'item-uuid-1234',
      name: 'Whole Grain Sourdough',
      quantity: '1 loaf',
      category: ItemCategory.BAKERY,
      isCompleted: false,
      version: 1,
      createdAt: new Date().toISOString(),
    };
    assert.strictEqual(validateGroceryItem(validEntity), true);
  });

  it('should reject an entity with an invalid OCC version (< 1 or non-integer)', () => {
    const invalidEntity = {
      id: 'item-uuid-1234',
      name: 'Whole Grain Sourdough',
      quantity: '1 loaf',
      category: ItemCategory.BAKERY,
      isCompleted: false,
      version: 0, // Invalid version
      createdAt: new Date().toISOString(),
    };
    assert.throws(
      () => validateGroceryItem(invalidEntity),
      (err) => err instanceof ContractValidationError && err.message.includes('version must be a positive integer')
    );
  });
});
