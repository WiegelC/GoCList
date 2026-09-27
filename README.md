# Grocery Sync — Full-Stack Collaborative Grocery List Manager

A production-ready, full-stack collaborative grocery list manager built with a modular frontend, Express REST API, persistent storage, and multi-format spreadsheet export capabilities.

---

## 🛒 Features & User Interface

### 1. Top Options Bar
- **➕ Add Item Button (`#btn-add-item`)**:
  - Launches an accessible modal dialog (`role="dialog"`, `aria-modal="true"`).
  - Prompts for **Item Label / Name** (e.g. *"Organic Honeycrisp Apples"*) and **How Much / Quantity** (e.g. *"4 pcs"*, *"2 lbs"*, *"1 carton"*).
  - Includes quick amount presets (`1`, `2`, `1 lb`, `1 bunch`, `1 bag`) and category classification (*Produce, Dairy, Bakery, Beverages, Pantry, Meat, Frozen*).
  - Auto-focuses the primary input with keyboard submit (`Enter`) and dismiss (`Escape`).
- **📋 Export or Copy Menu (`#btn-export-copy`)**:
  - **Copy for Sheets / Excel**: Formats the list with Tab-Separated Values (`\t`) so copying and pasting directly into Google Sheets or Microsoft Excel places Item Name, Quantity, Category, and Status into individual adjacent columns.
  - **Export as CSV File**: Generates and downloads a standardized RFC 4180 `.csv` spreadsheet file with a single click.
  - **Copy as Checklist**: Copies a clean bulleted checklist formatted with markdown checkboxes (`[ ]` / `[x]`) for Apple Notes, Slack, or SMS.
- **🗑️ Clear Button (`#btn-clear-list`)**:
  - Clears the current grocery list.
  - Guarded with an accessible confirmation dialog (`role="alertdialog"`) to prevent accidental list deletion.

### 2. Item Management & Status
- **Interactive Checkboxes**: Toggle items between "To Buy" and "Completed" with instant optimistic visual feedback (subtle strikethrough, opacity shift, and green status check).
- **Dynamic Counters**: Live count indicator (`2 / 5 Completed`) and category filter chips (*All, Produce, Dairy, Bakery, Beverages, Pantry*).
- **Delete Action**: Quick removal button for individual items with toast notifications.
- **Empty State**: Friendly illustration and quick-action button when the list has no items.

---

## 🚀 Quick Start

### Option A: Launch with Node.js Express Backend (Recommended)

1. Start the server:
   ```bash
   cd week5
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
   *The server hosts both the static frontend and the REST API at `http://localhost:3000/api/items` with persistent JSON storage in `week5/data/grocery_items.json`.*

---

### Option B: Standalone Frontend (Zero Dependencies)

The application includes an offline/local storage fallback. You can launch it using Python's built-in HTTP server:

```bash
cd week5
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

---

## 🧪 Running Automated Tests

Run the comprehensive unit, accessibility, and integration test suite:

```bash
python3 week5/test_grocery.py
```
*(Or via `npm test` inside the `week5/` directory).*

### What the Test Suite Verifies:
1. **UI & Accessibility Contracts**:
   - Verification of top options bar elements (`#btn-add-item`, `#btn-clear-list`, `#btn-export-copy`, `#export-menu`).
   - Modal input fields for **Item Label** and **How Much / Quantity**.
   - Defensive confirmation dialog for list clearing.
   - WAI-ARIA roles (`dialog`, `alertdialog`), `aria-live` regions, and keyboard handlers.
2. **Data Export Formatting**:
   - Tab-separated value (`\t`) generation for spreadsheet copy.
   - Standardized CSV MIME-type blob generation.
3. **Express REST API Integration**:
   - Health check (`GET /api/health`).
   - Item retrieval (`GET /api/items`).
   - Item creation with strict validation (`POST /api/items`).
   - Toggle completion status (`PATCH /api/items/:id/toggle`).
   - Item deletion (`DELETE /api/items/:id`).
   - Clear all items (`DELETE /api/items`).
   - Server-side CSV & TSV export streams (`GET /api/export`).

---

## 📁 Project Structure

```text
week5/
├── index.html               # Semantic HTML5 layout with top options bar & modals
├── styles.css               # Design system, glassmorphism, responsive layout & animations
├── app.js                   # Client coordinator, API sync, optimistic state & export helper
├── server.js                # Express REST API with persistent storage
├── package.json             # Scripts & dependencies (express, cors)
├── test_grocery.py          # Automated Python unit & integration test suite
├── data/
│   └── grocery_items.json   # Persistent JSON data store
└── README.md                # Project documentation
```
