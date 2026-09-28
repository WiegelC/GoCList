/**
 * Grocery API Routes
 * Declares RESTful endpoints for CRUD, toggling, bulk clear, and spreadsheet exports.
 */

const express = require('express');
const controller = require('../controllers/grocery.controller');

const router = express.Router();

// System
router.get('/health', controller.getHealth.bind(controller));

// Export
router.get('/export', controller.exportList.bind(controller));

// Grocery Items Collection
router.get('/items', controller.getItems.bind(controller));
router.post('/items', controller.addItem.bind(controller));
router.delete('/items', controller.clearAll.bind(controller));

// Individual Item
router.get('/items/:id', controller.getItemById.bind(controller));
router.patch('/items/:id/toggle', controller.toggleItem.bind(controller));
router.delete('/items/:id', controller.deleteItem.bind(controller));

module.exports = router;
