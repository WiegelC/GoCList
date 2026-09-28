/**
 * Grocery Service
 * Pure business logic layer. Orchestrates data access, input sanitization,
 * domain validation, and spreadsheet export transformations.
 */

const repository = require('../repositories/grocery.repository');
const { validateCreateItemDTO, validateGroceryItem } = require('../contracts/contractValidator');

class GroceryService {
  async listItems(filters) {
    const items = await repository.findAll(filters);
    // Guarantee every item returned adheres to contract
    items.forEach((item) => {
      try {
        validateGroceryItem(item);
      } catch (e) {
        console.warn('Contract warning on item:', item.id, e.message);
      }
    });
    return items;
  }

  async getItemById(id) {
    const item = await repository.findById(id);
    if (!item) {
      const err = new Error(`Grocery item with ID "${id}" was not found.`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    validateGroceryItem(item);
    return item;
  }

  async addItem(rawPayload) {
    // Strict schema & DTO boundary validation
    const validatedDTO = validateCreateItemDTO(rawPayload);

    const created = await repository.create(validatedDTO);
    validateGroceryItem(created);
    return created;
  }


  async toggleItemStatus(id, expectedVersion = null) {
    try {
      const updated = await repository.toggle(id, expectedVersion);
      if (!updated) {
        const err = new Error(`Item with ID "${id}" not found.`);
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }
      return updated;
    } catch (err) {
      if (err.code === 'ERR_CONFLICT') {
        err.status = 409;
      }
      throw err;
    }
  }

  async removeItem(id) {
    const deleted = await repository.delete(id);
    if (!deleted) {
      const err = new Error(`Item with ID "${id}" not found.`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return true;
  }

  async clearAllItems() {
    return await repository.clearAll();
  }

  async exportData(format = 'csv') {
    const items = await repository.findAll();

    if (format === 'tsv') {
      const header = 'Item Name\tQuantity\tCategory\tStatus';
      const rows = items.map(
        (item) => `${item.name}\t${item.quantity}\t${item.category || 'Other'}\t${item.isCompleted ? 'Bought' : 'To Buy'}`
      );
      return {
        contentType: 'text/tab-separated-values',
        filename: 'grocery-list.tsv',
        content: [header, ...rows].join('\n'),
      };
    }

    // Default: CSV (RFC 4180 escaped)
    const escapeCSV = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    const headers = ['Item Name', 'Quantity', 'Category', 'Status', 'Created At'];
    const rows = items.map((item) => [
      escapeCSV(item.name),
      escapeCSV(item.quantity),
      escapeCSV(item.category || 'Other'),
      item.isCompleted ? 'Completed' : 'Pending',
      item.createdAt || '',
    ]);

    return {
      contentType: 'text/csv',
      filename: 'grocery-list.csv',
      content: [headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
    };
  }
}

module.exports = new GroceryService();
