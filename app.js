/**
 * Grocery Sync — Frontend Application Controller
 * Manages UI interactions, optimistic updates, REST API synchronization, and spreadsheet exports.
 */

// --- 1. API & STORAGE SERVICE ---
class GroceryService {
  constructor() {
    this.apiAvailable = false;
    this.storageKey = 'grocery_sync_items_v1';
  }

  async checkServer() {
    try {
      const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        this.apiAvailable = true;
        return true;
      }
    } catch {
      this.apiAvailable = false;
    }
    return false;
  }

  async getItems() {
    if (this.apiAvailable) {
      try {
        const res = await fetch('/api/items');
        const json = await res.json();
        if (json.success) return json.data;
      } catch (err) {
        console.warn('API error, falling back to local storage:', err);
      }
    }
    // LocalStorage fallback
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      // Default initial mock items if storage empty
      const defaultItems = [
        { id: '1', name: 'Organic Honeycrisp Apples', quantity: '4 pcs', category: 'Produce', isCompleted: false, createdAt: new Date().toISOString() },
        { id: '2', name: 'Oat Milk', quantity: '2 cartons', category: 'Dairy', isCompleted: false, createdAt: new Date().toISOString() },
        { id: '3', name: 'Whole Grain Sourdough', quantity: '1 loaf', category: 'Bakery', isCompleted: false, createdAt: new Date().toISOString() },
        { id: '4', name: 'Cold Brew Coffee', quantity: '1 bottle', category: 'Beverages', isCompleted: true, createdAt: new Date().toISOString() },
        { id: '5', name: 'Avocados', quantity: '3', category: 'Produce', isCompleted: true, createdAt: new Date().toISOString() }
      ];
      this.saveLocalItems(defaultItems);
      return defaultItems;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveLocalItems(items) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  async addItem({ name, quantity, category }) {
    if (this.apiAvailable) {
      try {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, quantity, category })
        });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (err) {
        console.warn('API add failed, saving locally:', err);
      }
    }
    // Local creation
    const newItem = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name,
      quantity,
      category: category || 'Other',
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    const items = await this.getItems();
    items.unshift(newItem);
    this.saveLocalItems(items);
    return newItem;
  }

  async toggleItem(id) {
    if (this.apiAvailable) {
      try {
        const res = await fetch(`/api/items/${id}/toggle`, { method: 'PATCH' });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (err) {
        console.warn('API toggle failed:', err);
      }
    }
    const items = await this.getItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      item.isCompleted = !item.isCompleted;
      this.saveLocalItems(items);
      return item;
    }
    return null;
  }

  async deleteItem(id) {
    if (this.apiAvailable) {
      try {
        const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) return true;
      } catch (err) {
        console.warn('API delete failed:', err);
      }
    }
    const items = await this.getItems();
    const filtered = items.filter((i) => i.id !== id);
    this.saveLocalItems(filtered);
    return true;
  }

  async clearAll() {
    if (this.apiAvailable) {
      try {
        const res = await fetch('/api/items', { method: 'DELETE' });
        const json = await res.json();
        if (json.success) return true;
      } catch (err) {
        console.warn('API clear failed:', err);
      }
    }
    this.saveLocalItems([]);
    return true;
  }
}

// --- 2. EXPORT & CLIPBOARD HELPER ---
const ExportHelper = {
  /**
   * Generates Tab-Separated Values so users can paste directly
   * into separate columns in Google Sheets or Microsoft Excel.
   */
  async copyForSheets(items) {
    if (!items || items.length === 0) return false;
    const header = 'Item Name\tHow Much\tCategory\tStatus';
    const rows = items.map(
      (item) => `${item.name}\t${item.quantity}\t${item.category || 'General'}\t${item.isCompleted ? 'Bought' : 'To Buy'}`
    );
    const content = [header, ...rows].join('\n');
    return this._writeToClipboard(content);
  },

  /**
   * Generates a plain text checklist formatted for Apple Notes, Slack, or SMS.
   */
  async copyChecklist(items) {
    if (!items || items.length === 0) return false;
    const lines = items.map(
      (item) => `[${item.isCompleted ? 'x' : ' '}] ${item.name} (${item.quantity}) - ${item.category || 'Other'}`
    );
    const content = `🛒 GROCERY LIST (${items.length} items):\n` + lines.join('\n');
    return this._writeToClipboard(content);
  },

  /**
   * Downloads a standardized .CSV file for spreadsheets.
   */
  downloadCSV(items) {
    if (!items || items.length === 0) return false;
    const escapeCSV = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    const headers = ['Item Name', 'Quantity', 'Category', 'Status', 'Date Added'];
    const rows = items.map((item) => [
      escapeCSV(item.name),
      escapeCSV(item.quantity),
      escapeCSV(item.category || 'Other'),
      item.isCompleted ? 'Completed' : 'Pending',
      item.createdAt || ''
    ]);

    const csvString = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `grocery-list-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  },

  async _writeToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback for non-https or older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      return false;
    }
  }
};

// --- 3. UI CONTROLLER ---
class GroceryApp {
  constructor() {
    this.service = new GroceryService();
    this.items = [];
    this.activeCategory = 'ALL';

    // DOM Elements
    this.listEl = document.getElementById('grocery-items-list');
    this.emptyStateEl = document.getElementById('empty-state');
    this.statsCompletedEl = document.getElementById('stats-completed');
    this.footerCountEl = document.getElementById('footer-item-count');
    this.syncStatusText = document.getElementById('sync-status-text');

    // Action Buttons
    this.btnAdd = document.getElementById('btn-add-item');
    this.btnEmptyAdd = document.getElementById('btn-empty-add');
    this.btnClear = document.getElementById('btn-clear-list');
    this.btnExportMenu = document.getElementById('btn-export-copy');
    this.exportDropdown = document.getElementById('export-menu');

    // Export Options
    this.btnCopySheets = document.getElementById('btn-copy-sheets');
    this.btnDownloadCSV = document.getElementById('btn-download-csv');
    this.btnCopyText = document.getElementById('btn-copy-text');

    // Add Modal Elements
    this.modalAdd = document.getElementById('modal-add-item');
    this.formAdd = document.getElementById('form-add-item');
    this.inputName = document.getElementById('input-item-name');
    this.inputQuantity = document.getElementById('input-item-quantity');
    this.selectCategory = document.getElementById('select-item-category');
    this.errorName = document.getElementById('error-item-name');
    this.errorQuantity = document.getElementById('error-item-quantity');
    this.btnCloseAdd = document.getElementById('btn-close-add-modal');
    this.btnCancelAdd = document.getElementById('btn-cancel-add');

    // Clear Modal Elements
    this.modalClear = document.getElementById('modal-confirm-clear');
    this.btnCancelClear = document.getElementById('btn-cancel-clear');
    this.btnConfirmClear = document.getElementById('btn-confirm-clear');

    // Filter Chips
    this.filterChips = document.querySelectorAll('.filter-chip');

    // Toast Container
    this.toastContainer = document.getElementById('toast-container');

    // Theme Toggle Elements
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.sunIcon = this.btnThemeToggle ? this.btnThemeToggle.querySelector('.sun-icon') : null;
    this.moonIcon = this.btnThemeToggle ? this.btnThemeToggle.querySelector('.moon-icon') : null;

    this.init();
  }

  async init() {
    this.initTheme();
    this.setupEventListeners();
    const hasServer = await this.service.checkServer();
    if (this.syncStatusText) {
      this.syncStatusText.textContent = hasServer ? 'Cloud Synced' : 'Local Mode';
    }
    await this.loadItems();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('grocery_sync_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    this.applyTheme(theme, false);

    if (this.btnThemeToggle) {
      this.btnThemeToggle.addEventListener('click', () => this.toggleTheme());
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme, true);
  }

  applyTheme(theme, notify = false) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('grocery_sync_theme', theme);

    if (this.sunIcon && this.moonIcon) {
      if (theme === 'dark') {
        this.sunIcon.classList.remove('hidden');
        this.moonIcon.classList.add('hidden');
        if (this.btnThemeToggle) {
          this.btnThemeToggle.setAttribute('title', 'Switch to Light Theme');
          this.btnThemeToggle.setAttribute('aria-label', 'Switch to Light Theme');
        }
      } else {
        this.sunIcon.classList.add('hidden');
        this.moonIcon.classList.remove('hidden');
        if (this.btnThemeToggle) {
          this.btnThemeToggle.setAttribute('title', 'Switch to Dark Theme');
          this.btnThemeToggle.setAttribute('aria-label', 'Switch to Dark Theme');
        }
      }
    }

    if (notify) {
      this.showToast(theme === 'dark' ? '🌙 Dark theme enabled' : '☀️ Light theme enabled', 'info');
    }
  }

  setupEventListeners() {
    // Top Options: Add Button
    this.btnAdd.addEventListener('click', () => this.openAddModal());
    this.btnEmptyAdd.addEventListener('click', () => this.openAddModal());

    // Top Options: Clear Button
    this.btnClear.addEventListener('click', () => this.openClearModal());

    // Top Options: Export/Copy Dropdown Toggle
    this.btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleExportMenu();
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!this.exportDropdown.contains(e.target) && e.target !== this.btnExportMenu) {
        this.closeExportMenu();
      }
    });

    // Export Actions
    this.btnCopySheets.addEventListener('click', () => this.handleCopySheets());
    this.btnDownloadCSV.addEventListener('click', () => this.handleDownloadCSV());
    this.btnCopyText.addEventListener('click', () => this.handleCopyText());

    // Modal Close Triggers
    this.btnCloseAdd.addEventListener('click', () => this.closeAddModal());
    this.btnCancelAdd.addEventListener('click', () => this.closeAddModal());
    this.modalAdd.addEventListener('click', (e) => {
      if (e.target === this.modalAdd) this.closeAddModal();
    });

    // Clear Modal Handlers
    this.btnCancelClear.addEventListener('click', () => this.closeClearModal());
    this.btnConfirmClear.addEventListener('click', () => this.handleConfirmClear());
    this.modalClear.addEventListener('click', (e) => {
      if (e.target === this.modalClear) this.closeClearModal();
    });

    // Quick presets for quantity
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.inputQuantity.value = btn.dataset.preset;
      });
    });

    // Add Form Submit
    this.formAdd.addEventListener('submit', (e) => this.handleAddSubmit(e));

    // Category Filter Chips
    this.filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.filterChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeCategory = chip.dataset.category;
        this.renderList();
      });
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAddModal();
        this.closeClearModal();
        this.closeExportMenu();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openAddModal();
      }
    });
  }

  async loadItems() {
    this.items = await this.service.getItems();
    this.renderList();
  }

  formatCategoryDisplay(cat) {
    const map = {
      'PRODUCE': 'Produce',
      'DAIRY': 'Dairy',
      'BAKERY': 'Bakery',
      'BEVERAGES': 'Beverages',
      'PANTRY': 'Pantry',
      'MEAT_SEAFOOD': 'Meat & Seafood',
      'FROZEN': 'Frozen',
      'OTHER': 'Other'
    };
    const key = String(cat || 'OTHER').toUpperCase().replace(/[\s&]+/g, '_');
    return map[key] || cat || 'Other';
  }

  renderList() {
    const filteredItems = this.activeCategory === 'ALL'
      ? this.items
      : this.items.filter((item) => {
          const itemCat = this.formatCategoryDisplay(item.category).toLowerCase();
          return itemCat === this.activeCategory.toLowerCase();
        });

    const completedCount = this.items.filter((i) => i.isCompleted).length;
    const totalCount = this.items.length;

    // Update Counters
    this.statsCompletedEl.textContent = `${completedCount} / ${totalCount} Completed`;
    this.footerCountEl.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'} recorded`;

    // Disable clear and export if empty
    this.btnClear.disabled = totalCount === 0;
    this.btnExportMenu.disabled = totalCount === 0;

    // Render list or empty state
    if (filteredItems.length === 0) {
      this.listEl.innerHTML = '';
      this.emptyStateEl.classList.remove('hidden');
      return;
    }

    this.emptyStateEl.classList.add('hidden');
    this.listEl.innerHTML = filteredItems
      .map((item) => {
        const displayCategory = this.formatCategoryDisplay(item.category);
        const categoryClass = 'category-' + displayCategory.replace(/\s+/g, '-').replace(/&/g, '');
        return `
          <li class="grocery-item-row ${item.isCompleted ? 'is-completed' : ''}" data-id="${item.id}">
            <label class="item-left">
              <input 
                type="checkbox" 
                class="item-checkbox-input" 
                ${item.isCompleted ? 'checked' : ''} 
                aria-label="Mark ${this.escapeHtml(item.name)} as completed"
              >
              <span class="custom-checkbox">
                <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
              <div class="item-info">
                <span class="item-name">${this.escapeHtml(item.name)}</span>
                <div class="item-meta">
                  <span class="category-tag ${categoryClass}">${this.escapeHtml(displayCategory)}</span>
                </div>
              </div>
            </label>
            <div class="item-right">
              <span class="quantity-badge" title="Quantity / Amount">${this.escapeHtml(item.quantity)}</span>
              <button 
                type="button" 
                class="btn-item-delete" 
                aria-label="Delete ${this.escapeHtml(item.name)}" 
                title="Remove item"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </li>
        `;
      })
      .join('');


    // Attach item listeners
    this.listEl.querySelectorAll('.grocery-item-row').forEach((row) => {
      const id = row.dataset.id;
      const checkbox = row.querySelector('.item-checkbox-input');
      const deleteBtn = row.querySelector('.btn-item-delete');

      checkbox.addEventListener('change', () => this.handleToggleItem(id));
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleDeleteItem(id);
      });
    });
  }

  // --- Modal Operations ---
  openAddModal() {
    this.closeExportMenu();
    this.modalAdd.classList.remove('hidden');
    this.inputName.value = '';
    this.inputQuantity.value = '1';
    this.errorName.classList.add('hidden');
    this.errorQuantity.classList.add('hidden');
    setTimeout(() => this.inputName.focus(), 60);
  }

  closeAddModal() {
    this.modalAdd.classList.add('hidden');
  }

  openClearModal() {
    this.closeExportMenu();
    if (this.items.length === 0) return;
    this.modalClear.classList.remove('hidden');
  }

  closeClearModal() {
    this.modalClear.classList.add('hidden');
  }

  toggleExportMenu() {
    const isHidden = this.exportDropdown.classList.contains('hidden');
    if (isHidden) {
      this.exportDropdown.classList.remove('hidden');
      this.btnExportMenu.setAttribute('aria-expanded', 'true');
    } else {
      this.closeExportMenu();
    }
  }

  closeExportMenu() {
    this.exportDropdown.classList.add('hidden');
    this.btnExportMenu.setAttribute('aria-expanded', 'false');
  }

  // --- Form & Action Handlers ---
  async handleAddSubmit(e) {
    e.preventDefault();
    const name = this.inputName.value.trim();
    const quantity = this.inputQuantity.value.trim();
    const category = this.selectCategory.value;

    let hasError = false;
    if (!name) {
      this.errorName.classList.remove('hidden');
      hasError = true;
    } else {
      this.errorName.classList.add('hidden');
    }

    if (!quantity) {
      this.errorQuantity.classList.remove('hidden');
      hasError = true;
    } else {
      this.errorQuantity.classList.add('hidden');
    }

    if (hasError) return;

    // Optimistic / Fast insertion
    const created = await this.service.addItem({ name, quantity, category });
    if (created) {
      this.items.unshift(created);
      this.renderList();
      this.closeAddModal();
      this.showToast(`Added "${name}" (${quantity})`, 'success');
    }
  }

  async handleToggleItem(id) {
    // Optimistic toggle
    const target = this.items.find((i) => i.id === id);
    if (!target) return;
    target.isCompleted = !target.isCompleted;
    this.renderList();

    await this.service.toggleItem(id);
  }

  async handleDeleteItem(id) {
    const item = this.items.find((i) => i.id === id);
    const itemName = item ? item.name : 'Item';

    this.items = this.items.filter((i) => i.id !== id);
    this.renderList();
    this.showToast(`Removed "${itemName}"`, 'info');

    await this.service.deleteItem(id);
  }

  async handleConfirmClear() {
    const count = this.items.length;
    this.items = [];
    this.renderList();
    this.closeClearModal();
    this.showToast(`Cleared ${count} items from list`, 'info');

    await this.service.clearAll();
  }

  async handleCopySheets() {
    this.closeExportMenu();
    const ok = await ExportHelper.copyForSheets(this.items);
    if (ok) {
      this.showToast('📋 Copied! Ready to paste into Google Sheets or Excel', 'success');
    } else {
      this.showToast('Failed to copy to clipboard', 'error');
    }
  }

  async handleCopyText() {
    this.closeExportMenu();
    const ok = await ExportHelper.copyChecklist(this.items);
    if (ok) {
      this.showToast('📝 Checklist copied to clipboard!', 'success');
    } else {
      this.showToast('Failed to copy checklist', 'error');
    }
  }

  handleDownloadCSV() {
    this.closeExportMenu();
    const ok = ExportHelper.downloadCSV(this.items);
    if (ok) {
      this.showToast('📁 Exported grocery-list.csv', 'success');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.groceryApp = new GroceryApp();
});
