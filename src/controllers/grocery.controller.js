/**
 * Grocery Controller
 * HTTP request/response coordinator.
 * Maps REST verbs to domain services and returns standard HTTP status codes.
 */

const service = require('../services/grocery.service');

class GroceryController {
  async getHealth(req, res) {
    res.status(200).json({
      status: 'ok',
      service: 'Collaborative Grocery List API (Layered Architecture)',
      database: require('../config/db').isPostgresActive() ? 'PostgreSQL (Prisma)' : 'Persistent Storage (Active)',
      timestamp: new Date().toISOString(),
    });
  }

  async getItems(req, res, next) {
    try {
      const { category, isCompleted } = req.query;
      const items = await service.listItems({ category, isCompleted });
      res.status(200).json({
        success: true,
        count: items.length,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  async getItemById(req, res, next) {
    try {
      const item = await service.getItemById(req.params.id);
      res.status(200).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  async addItem(req, res, next) {
    try {
      const { name, quantity, category } = req.body;
      const item = await service.addItem({ name, quantity, category });
      res.status(201).json({
        success: true,
        message: 'Item added successfully',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleItem(req, res, next) {
    try {
      const { id } = req.params;
      const expectedVersion = req.body.expectedVersion !== undefined ? Number(req.body.expectedVersion) : null;
      const updated = await service.toggleItemStatus(id, expectedVersion);
      res.status(200).json({
        success: true,
        message: 'Item status toggled',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteItem(req, res, next) {
    try {
      const { id } = req.params;
      await service.removeItem(id);
      res.status(200).json({
        success: true,
        message: 'Item removed successfully',
        id,
      });
    } catch (err) {
      next(err);
    }
  }

  async clearAll(req, res, next) {
    try {
      const countCleared = await service.clearAllItems();
      res.status(200).json({
        success: true,
        message: `Cleared all ${countCleared} items.`,
        countCleared,
      });
    } catch (err) {
      next(err);
    }
  }

  async exportList(req, res, next) {
    try {
      const format = (req.query.format || 'csv').toLowerCase();
      const { contentType, filename, content } = await service.exportData(format);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(content);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new GroceryController();
