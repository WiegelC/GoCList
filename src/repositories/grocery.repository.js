/**
 * Grocery Repository
 * Implements the Data Access Object (DAO) pattern.
 * Abstracts SQL / Prisma operations with Optimistic Concurrency Control (OCC)
 * and provides persistent JSON fallback for environments without live PostgreSQL.
 */

const fs = require('fs');
const path = require('path');
const { getPrismaClient, isPostgresActive } = require('../config/db');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'grocery_items.json');

class GroceryRepository {
  constructor() {
    this._ensureDataFile();
  }

  _ensureDataFile() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }

  _readLocal() {
    try {
      this._ensureDataFile();
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw || '[]');
    } catch (err) {
      console.error('Repository read error:', err);
      return [];
    }
  }

  _writeLocal(items) {
    try {
      this._ensureDataFile();
      fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Repository write error:', err);
      return false;
    }
  }

  /**
   * Retrieve all items matching filters (category, completion state)
   */
  async findAll({ category, isCompleted } = {}) {
    const prisma = getPrismaClient();
    if (prisma && isPostgresActive()) {
      const where = {};
      if (category && category !== 'ALL') where.category = category.toUpperCase();
      if (isCompleted !== undefined) where.isCompleted = isCompleted === 'true' || isCompleted === true;

      return await prisma.groceryItem.findMany({
        where,
        orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
      });
    }

    // Local persistent storage
    let items = this._readLocal();
    if (category && category !== 'ALL') {
      items = items.filter(
        (i) => (i.category || 'Other').toLowerCase() === category.toLowerCase()
      );
    }
    if (isCompleted !== undefined) {
      const boolVal = isCompleted === 'true' || isCompleted === true;
      items = items.filter((i) => i.isCompleted === boolVal);
    }
    return items;
  }

  /**
   * Find item by unique ID
   */
  async findById(id) {
    const prisma = getPrismaClient();
    if (prisma && isPostgresActive()) {
      return await prisma.groceryItem.findUnique({ where: { id } });
    }

    const items = this._readLocal();
    return items.find((i) => i.id === id) || null;
  }

  /**
   * Create new grocery item
   */
  async create({ name, quantity, category }) {
    const prisma = getPrismaClient();
    if (prisma && isPostgresActive()) {
      return await prisma.groceryItem.create({
        data: {
          name,
          quantity,
          category: category ? category.toUpperCase() : 'OTHER',
          version: 1,
        },
      });
    }

    const items = this._readLocal();
    const newItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name,
      quantity,
      category: category || 'Other',
      isCompleted: false,
      version: 1,
      createdAt: new Date().toISOString(),
    };
    items.unshift(newItem);
    this._writeLocal(items);
    return newItem;
  }

  /**
   * Toggle completion with Optimistic Concurrency Control (OCC)
   */
  async toggle(id, expectedVersion = null) {
    const prisma = getPrismaClient();
    if (prisma && isPostgresActive()) {
      // Use interactive transaction to guarantee atomic version increment
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.groceryItem.findUnique({ where: { id } });
        if (!existing) return null;

        if (expectedVersion !== null && existing.version !== expectedVersion) {
          const err = new Error('Concurrent modification detected. Please refresh.');
          err.code = 'ERR_CONFLICT';
          throw err;
        }

        const newStatus = !existing.isCompleted;
        return await tx.groceryItem.update({
          where: { id },
          data: {
            isCompleted: newStatus,
            completedAt: newStatus ? new Date() : null,
            version: { increment: 1 },
          },
        });
      });
    }

    const items = this._readLocal();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return null;

    if (expectedVersion !== null && items[index].version !== expectedVersion) {
      const err = new Error('Concurrent modification detected. Please refresh.');
      err.code = 'ERR_CONFLICT';
      throw err;
    }

    items[index].isCompleted = !items[index].isCompleted;
    items[index].version = (items[index].version || 1) + 1;
    items[index].completedAt = items[index].isCompleted ? new Date().toISOString() : null;
    items[index].updatedAt = new Date().toISOString();

    this._writeLocal(items);
    return items[index];
  }

  /**
   * Delete an item by ID
   */
  async delete(id) {
    const prisma = getPrismaClient();
    if (prisma && isPostgresActive()) {
      try {
        await prisma.groceryItem.delete({ where: { id } });
        return true;
      } catch (err) {
        if (err.code === 'P2025') return false; // Record not found
        throw err;
      }
    }

    const items = this._readLocal();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;

    this._writeLocal(filtered);
    return true;
  }

  /**
   * Atomically clear all items
   */
  async clearAll() {
    const prisma = getPrismaClient();
    if (prisma && isPostgresActive()) {
      const result = await prisma.groceryItem.deleteMany({});
      return result.count;
    }

    const items = this._readLocal();
    const count = items.length;
    this._writeLocal([]);
    return count;
  }
}

module.exports = new GroceryRepository();
