/**
 * Runtime Contract Validator
 * Enforces contract integrity at system boundaries (API entry, DB read, Client reception).
 */

const { ItemCategory, normalizeCategory } = require('./grocery.contract');

class ContractValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ContractValidationError';
    this.status = 400;
    this.code = 'VALIDATION_ERROR';
    this.errors = errors;
  }
}

/**
 * Validates a CreateItemDTO payload
 */
function validateCreateItemDTO(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    throw new ContractValidationError('Payload must be a valid JSON object');
  }

  // Name / Label validation
  if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
    errors.push('name: Item label / name is required and cannot be empty.');
  } else if (payload.name.trim().length > 150) {
    errors.push('name: Item label cannot exceed 150 characters.');
  }

  // Quantity validation
  if (!payload.quantity && payload.quantity !== 0) {
    errors.push('quantity: Quantity / "how much" is required.');
  } else {
    const qtyStr = String(payload.quantity).trim();
    if (!qtyStr) {
      errors.push('quantity: Quantity cannot be blank whitespace.');
    } else if (qtyStr.length > 50) {
      errors.push('quantity: Quantity specification cannot exceed 50 characters.');
    }
  }

  if (errors.length > 0) {
    throw new ContractValidationError(errors[0], errors);
  }

  return {
    name: payload.name.trim(),
    quantity: String(payload.quantity).trim(),
    category: normalizeCategory(payload.category),
  };
}

/**
 * Validates a full GroceryItem entity against the GroceryItemContract
 */
function validateGroceryItem(entity) {
  const errors = [];

  if (!entity || typeof entity !== 'object') {
    throw new ContractValidationError('Item entity must be an object.');
  }

  if (!entity.id || typeof entity.id !== 'string') {
    errors.push('id must be a non-empty string identifier.');
  }

  if (!entity.name || typeof entity.name !== 'string') {
    errors.push('name must be a non-empty string.');
  }

  if (typeof entity.quantity !== 'string') {
    errors.push('quantity must be a string specification.');
  }

  const categoryEnum = normalizeCategory(entity.category);
  if (!ItemCategory[categoryEnum]) {
    errors.push(`category "${entity.category}" is not a recognized ItemCategory enum.`);
  }

  if (typeof entity.isCompleted !== 'boolean') {
    errors.push('isCompleted must be a boolean.');
  }

  if (entity.version === undefined || !Number.isInteger(Number(entity.version)) || Number(entity.version) < 1) {
    errors.push('version must be a positive integer (OCC sequence >= 1).');
  }

  if (!entity.createdAt || isNaN(Date.parse(entity.createdAt))) {
    errors.push('createdAt must be a valid ISO 8601 date string.');
  }

  if (errors.length > 0) {
    throw new ContractValidationError(`Contract mismatch: ${errors.join('; ')}`, errors);
  }

  return true;
}

module.exports = {
  ContractValidationError,
  validateCreateItemDTO,
  validateGroceryItem,
};
