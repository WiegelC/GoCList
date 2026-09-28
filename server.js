/**
 * Server Entrypoint
 * Express Application with Layered Architecture (Routes -> Controllers -> Services -> Repositories)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const groceryRoutes = require('./src/routes/grocery.routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Mount Modular API Routes
app.use('/api', groceryRoutes);

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🛒 Collaborative Grocery List Server running at http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
