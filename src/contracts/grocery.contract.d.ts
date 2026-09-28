/**
 * ==============================================================================
 * Formal TypeScript Contract & DTO Specification
 * Shared Source of Truth for Collaborative Grocery List Manager
 * ==============================================================================
 */

export type ItemCategory =
  | 'PRODUCE'
  | 'DAIRY'
  | 'BAKERY'
  | 'BEVERAGES'
  | 'PANTRY'
  | 'MEAT_SEAFOOD'
  | 'FROZEN'
  | 'OTHER';

export interface CategoryMetadata {
  label: string;
  slug: string;
}

/**
 * Core Grocery Item Data Contract
 * Guaranteed schema returned by the backend and consumed by the React UI.
 */
export interface GroceryItemContract {
  /** Unique entity identifier (UUIDv4 or prefixed identifier) */
  id: string;

  /** Associated parent list identifier */
  listId?: string;

  /** Human-readable item label / name (1 - 150 characters) */
  name: string;

  /** Quantity / amount specification (e.g. "2 cartons", "1.5 lbs", "3") */
  quantity: string;

  /** Normalized category enum */
  category: ItemCategory;

  /** Completion / checked off status */
  isCompleted: boolean;

  /** ISO 8601 timestamp of completion, or null if pending */
  completedAt?: string | null;

  /** Optimistic Concurrency Control sequence counter (>= 1) */
  version: number;

  /** Author identity if authenticated */
  createdById?: string | null;

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** ISO 8601 last update timestamp */
  updatedAt?: string;
}

/**
 * Data Transfer Object (DTO) for creating an item
 */
export interface CreateItemDTO {
  name: string;
  quantity: string | number;
  category?: string;
}

/**
 * Data Transfer Object (DTO) for toggling or updating an item with OCC
 */
export interface ToggleItemDTO {
  expectedVersion?: number;
}

/**
 * Standardized API Response Envelopes
 */
export interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiCollectionResponse<T> {
  success: true;
  count: number;
  data: T[];
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, string[]>;
}
