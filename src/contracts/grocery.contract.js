/**
 * ==============================================================================
 * Shared Contract & Canonical Data Dictionary
 * Single Source of Truth between Frontend (Client) and Backend (API / Database)
 * ==============================================================================
 */

/**
 * Canonical Item Categories (PostgreSQL Enum & API Standard)
 */
const ItemCategory = Object.freeze({
  PRODUCE: 'PRODUCE',
  DAIRY: 'DAIRY',
  BAKERY: 'BAKERY',
  BEVERAGES: 'BEVERAGES',
  PANTRY: 'PANTRY',
  MEAT_SEAFOOD: 'MEAT_SEAFOOD',
  FROZEN: 'FROZEN',
  OTHER: 'OTHER',
});

/**
 * Bidirectional Category Normalizer
 * Resolves naming mismatches between human UI labels and database enums.
 * e.g., "Meat & Seafood" -> "MEAT_SEAFOOD" -> "Meat & Seafood"
 */
const CategoryDictionary = Object.freeze({
  [ItemCategory.PRODUCE]: { label: 'Produce', slug: 'produce' },
  [ItemCategory.DAIRY]: { label: 'Dairy', slug: 'dairy' },
  [ItemCategory.BAKERY]: { label: 'Bakery', slug: 'bakery' },
  [ItemCategory.BEVERAGES]: { label: 'Beverages', slug: 'beverages' },
  [ItemCategory.PANTRY]: { label: 'Pantry', slug: 'pantry' },
  [ItemCategory.MEAT_SEAFOOD]: { label: 'Meat & Seafood', slug: 'meat-seafood' },
  [ItemCategory.FROZEN]: { label: 'Frozen', slug: 'frozen' },
  [ItemCategory.OTHER]: { label: 'Other', slug: 'other' },
});

function normalizeCategory(input) {
  if (!input || typeof input !== 'string') return ItemCategory.OTHER;
  const clean = input.trim().toUpperCase().replace(/[\s&]+/g, '_');
  if (ItemCategory[clean]) return clean;

  // Fallback slug/label search
  for (const [key, val] of Object.entries(CategoryDictionary)) {
    if (val.label.toLowerCase() === input.trim().toLowerCase()) return key;
    if (val.slug.toLowerCase() === input.trim().toLowerCase()) return key;
  }
  return ItemCategory.OTHER;
}

function getCategoryDisplayLabel(categoryEnum) {
  const norm = normalizeCategory(categoryEnum);
  return CategoryDictionary[norm]?.label || 'Other';
}

/**
 * Standard API Error Codes
 */
const ApiErrorCode = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  ERR_CONFLICT: 'ERR_CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

module.exports = {
  ItemCategory,
  CategoryDictionary,
  ApiErrorCode,
  normalizeCategory,
  getCategoryDisplayLabel,
};
