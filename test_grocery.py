#!/usr/bin/env python3
"""
Automated Test Suite for Week 5: Collaborative Grocery List Manager
Validates:
1. UI structure & Accessibility (HTML/CSS contracts, ARIA attributes, Top options bar)
2. Add modal (Item Label & How Much fields)
3. Export / Copy options (Spreadsheet TSV formatting, CSV generation)
4. Express Backend REST API Endpoints (Health, GET, POST, PATCH toggle, DELETE, Clear, Export)
"""

import json
import os
import re
import socket
import subprocess
import time
import unittest
import urllib.request
import urllib.error
from pathlib import Path

WEEK5_DIR = Path(__file__).resolve().parent

class TestGroceryUIStructure(unittest.TestCase):
    """Validates HTML structure, Accessibility, and UI contracts."""

    def setUp(self):
        self.html_path = WEEK5_DIR / "index.html"
        self.css_path = WEEK5_DIR / "styles.css"
        self.js_path = WEEK5_DIR / "app.js"
        self.assertTrue(self.html_path.exists(), "index.html must exist")
        self.assertTrue(self.css_path.exists(), "styles.css must exist")
        self.assertTrue(self.js_path.exists(), "app.js must exist")

        with open(self.html_path, "r", encoding="utf-8") as f:
            self.html = f.read()
        with open(self.css_path, "r", encoding="utf-8") as f:
            self.css = f.read()
        with open(self.js_path, "r", encoding="utf-8") as f:
            self.js = f.read()

    def test_top_options_bar_elements(self):
        """Top bar must have: Add button, Export or Copy dropdown, and Clear button."""
        # 1. Add button
        self.assertIn('id="btn-add-item"', self.html, "Must have #btn-add-item")
        self.assertIn("Add Item", self.html)

        # 2. Export or Copy button & dropdown
        self.assertIn('id="btn-export-copy"', self.html, "Must have #btn-export-copy")
        self.assertIn('id="export-menu"', self.html, "Must have #export-menu dropdown")
        self.assertIn('id="btn-copy-sheets"', self.html, "Must have #btn-copy-sheets for spreadsheet paste")
        self.assertIn('id="btn-download-csv"', self.html, "Must have #btn-download-csv for file export")
        self.assertIn('id="btn-copy-text"', self.html, "Must have #btn-copy-text for checklist copy")

        # 3. Clear button
        self.assertIn('id="btn-clear-list"', self.html, "Must have #btn-clear-list")

    def test_add_modal_fields(self):
        """Modal must allow labeling item and specifying 'how much' (quantity)."""
        self.assertIn('id="modal-add-item"', self.html, "Must have #modal-add-item modal")
        self.assertIn('id="input-item-name"', self.html, "Must have label/name input field")
        self.assertIn('id="input-item-quantity"', self.html, "Must have 'how much'/quantity input field")
        self.assertIn('id="btn-submit-add"', self.html, "Must have submit button in modal")

    def test_clear_confirmation_safety(self):
        """Must have confirmation dialog to prevent accidental list deletion."""
        self.assertIn('id="modal-confirm-clear"', self.html, "Must have clear confirmation modal")
        self.assertIn('id="btn-confirm-clear"', self.html, "Must have confirm clear button")
        self.assertIn('id="btn-cancel-clear"', self.html, "Must have cancel clear button")

    def test_accessibility_attributes(self):
        """Validates ARIA dialogs, live regions, labels, and roles."""
        self.assertIn('role="dialog"', self.html, "Add modal must have role='dialog'")
        self.assertIn('aria-modal="true"', self.html, "Modal must declare aria-modal='true'")
        self.assertIn('role="alertdialog"', self.html, "Clear modal must have role='alertdialog'")
        self.assertIn('aria-live="polite"', self.html, "List container must have aria-live")
        self.assertIn('aria-haspopup="true"', self.html, "Dropdown trigger must declare aria-haspopup")

    def test_export_formatting_in_js(self):
        """JavaScript must support Tab-separated copy for Sheets and CSV file generation."""
        self.assertIn('copyForSheets', self.js, "app.js must implement copyForSheets")
        self.assertIn('\\t', self.js, "copyForSheets must format data with tab delimiters for spreadsheets")
        self.assertIn('downloadCSV', self.js, "app.js must implement downloadCSV")
        self.assertIn('text/csv', self.js, "downloadCSV must create text/csv blob")

    def test_dark_theme_support(self):
        """Theme toggle button must exist and styles must support data-theme='dark'."""
        self.assertIn('id="btn-theme-toggle"', self.html, "Must have #btn-theme-toggle button")
        self.assertIn('[data-theme="dark"]', self.css, "styles.css must have [data-theme='dark'] tokens")
        self.assertIn('initTheme', self.js, "app.js must implement initTheme")
        self.assertIn('toggleTheme', self.js, "app.js must implement toggleTheme")
        self.assertIn('grocery_sync_theme', self.js, "app.js must persist theme to localStorage")



class TestBackendAPI(unittest.TestCase):
    """Spins up the Node.js Express server on an isolated port and tests all REST endpoints."""

    server_process = None
    port = 3987
    base_url = f"http://127.0.0.1:{port}"

    @classmethod
    def setUpClass(cls):
        # Find available port or use 3987
        env = os.environ.copy()
        env["PORT"] = str(cls.port)
        
        # Start server as subprocess
        cls.server_process = subprocess.Popen(
            ["node", "server.js"],
            cwd=str(WEEK5_DIR),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Wait for server to boot
        for _ in range(30):
            try:
                with urllib.request.urlopen(f"{cls.base_url}/api/health", timeout=1) as resp:
                    if resp.status == 200:
                        break
            except Exception:
                time.sleep(0.15)
        else:
            cls.server_process.kill()
            raise RuntimeError("Backend server failed to start within 4.5 seconds")

    @classmethod
    def tearDownClass(cls):
        if cls.server_process:
            cls.server_process.terminate()
            cls.server_process.wait()

    def _request(self, endpoint, method="GET", data=None):
        url = f"{self.base_url}{endpoint}"
        req = urllib.request.Request(url, method=method)
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")

        body = json.dumps(data).encode("utf-8") if data else None
        try:
            with urllib.request.urlopen(req, data=body, timeout=3) as resp:
                resp_body = resp.read().decode("utf-8")
                return resp.status, resp_body, resp.headers
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8"), e.headers

    def test_1_health_check(self):
        status, body, _ = self._request("/api/health")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertEqual(data.get("status"), "ok")

    def test_2_add_item_with_label_and_quantity(self):
        payload = {
            "name": "Organic Strawberries",
            "quantity": "2 containers",
            "category": "Produce"
        }
        status, body, _ = self._request("/api/items", method="POST", data=payload)
        self.assertEqual(status, 201)
        data = json.loads(body)
        self.assertTrue(data.get("success"))
        item = data.get("data")
        self.assertEqual(item["name"], "Organic Strawberries")
        self.assertEqual(item["quantity"], "2 containers")
        self.assertFalse(item["isCompleted"])
        self.assertIn("id", item)

    def test_3_validation_rejects_missing_fields(self):
        # Missing quantity
        status, body, _ = self._request("/api/items", method="POST", data={"name": "Almonds"})
        self.assertEqual(status, 400)
        data = json.loads(body)
        self.assertIn("how much", data.get("error", "").lower())

        # Missing name/label
        status, body, _ = self._request("/api/items", method="POST", data={"quantity": "1 lb"})
        self.assertEqual(status, 400)
        data = json.loads(body)
        self.assertIn("label / name", data.get("error", "").lower())


    def test_4_toggle_item_status(self):
        # Create item
        _, body, _ = self._request("/api/items", method="POST", data={"name": "Sourdough Bread", "quantity": "1 loaf"})
        item_id = json.loads(body)["data"]["id"]

        # Toggle item
        status, body, _ = self._request(f"/api/items/{item_id}/toggle", method="PATCH")
        self.assertEqual(status, 200)
        toggled = json.loads(body)["data"]
        self.assertTrue(toggled["isCompleted"])

        # Toggle back
        status, body, _ = self._request(f"/api/items/{item_id}/toggle", method="PATCH")
        toggled_back = json.loads(body)["data"]
        self.assertFalse(toggled_back["isCompleted"])

    def test_5_export_endpoints(self):
        # TSV export
        status, body, headers = self._request("/api/export?format=tsv")
        self.assertEqual(status, 200)
        self.assertIn("Item Name\tQuantity", body)
        self.assertIn("tab-separated-values", headers.get("Content-Type", ""))

        # CSV export
        status, body, headers = self._request("/api/export?format=csv")
        self.assertEqual(status, 200)
        self.assertIn("Item Name,Quantity", body)
        self.assertIn("text/csv", headers.get("Content-Type", ""))

    def test_6_delete_item(self):
        # Create item
        _, body, _ = self._request("/api/items", method="POST", data={"name": "Dark Chocolate", "quantity": "2 bars"})
        item_id = json.loads(body)["data"]["id"]

        # Delete item
        status, _, _ = self._request(f"/api/items/{item_id}", method="DELETE")
        self.assertEqual(status, 200)

        # Check item is gone
        status, body, _ = self._request("/api/items")
        all_items = json.loads(body)["data"]
        self.assertFalse(any(i["id"] == item_id for i in all_items))

    def test_7_clear_all_items(self):
        status, body, _ = self._request("/api/items", method="DELETE")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data.get("success"))

        # Verify empty
        status, body, _ = self._request("/api/items")
        items = json.loads(body)["data"]
        self.assertEqual(len(items), 0)

    def test_8_contract_response_alignment(self):
        """Verifies that API item responses conform strictly to GroceryItemContract."""
        # Create a test item
        status, body, _ = self._request("/api/items", method="POST", data={
            "name": "Greek Yogurt",
            "quantity": "32 oz",
            "category": "Dairy"
        })
        self.assertEqual(status, 201)
        item = json.loads(body)["data"]

        # Check required contract keys and types
        self.assertIsInstance(item.get("id"), str)
        self.assertIsInstance(item.get("name"), str)
        self.assertIsInstance(item.get("quantity"), str)
        self.assertIsInstance(item.get("category"), str)
        self.assertIn(item.get("category"), [
            "PRODUCE", "DAIRY", "BAKERY", "BEVERAGES", "PANTRY", "MEAT_SEAFOOD", "FROZEN", "OTHER"
        ])
        self.assertIsInstance(item.get("isCompleted"), bool)
        self.assertIsInstance(item.get("version"), int)
        self.assertGreaterEqual(item.get("version"), 1)
        self.assertIsInstance(item.get("createdAt"), str)

    def test_9_contract_category_normalization(self):
        """Verifies that category casing mismatches ('Meat & Seafood' -> 'MEAT_SEAFOOD') are normalized."""
        status, body, _ = self._request("/api/items", method="POST", data={
            "name": "Atlantic Salmon",
            "quantity": "2 fillets",
            "category": "Meat & Seafood"
        })
        self.assertEqual(status, 201)
        item = json.loads(body)["data"]
        self.assertEqual(item.get("category"), "MEAT_SEAFOOD", "Must normalize 'Meat & Seafood' to canonical enum")

    def test_10_contract_validation_rejections(self):
        """Verifies boundary contract rules (oversized strings, blank payloads)."""
        # Exceeds 150 char limit
        status, body, _ = self._request("/api/items", method="POST", data={
            "name": "A" * 151,
            "quantity": "1"
        })
        self.assertEqual(status, 400)
        data = json.loads(body)
        self.assertEqual(data.get("code"), "VALIDATION_ERROR")


if __name__ == "__main__":
    unittest.main(verbosity=2)

