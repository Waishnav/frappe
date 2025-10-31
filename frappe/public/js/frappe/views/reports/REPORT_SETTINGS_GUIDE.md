# Report View Settings Guide - [doctype]_report.js

This guide explains how to create DocType-specific configurations for Report View, similar to how `[doctype]_list.js` works for List View.

## Overview

The Report View now supports per-DocType customization through `[doctype]_report.js` files. These files should be placed in your DocType's folder alongside other DocType files.

## File Location

```
your_app/
  your_module/
    doctype/
      your_doctype/
        your_doctype.json
        your_doctype.py
        your_doctype.js
        your_doctype_list.js      # List view settings
        your_doctype_report.js    # Report view settings (NEW!)
```

## Available Hooks

### 1. `onload(reportViewInstance)`

Called once when the Report view is first created.

**Example:**
```javascript
frappe.reportview_settings['Your DocType'] = {
	onload: function(reportView) {
		console.log('Report view loaded for', reportView.doctype);
		// Add custom buttons, modify filters, etc.
	}
};
```

### 2. `refresh(reportViewInstance)`

Called whenever the Report view data refreshes.

**Example:**
```javascript
frappe.reportview_settings['Your DocType'] = {
	refresh: function(reportView) {
		console.log('Report view refreshed with', reportView.data.length, 'rows');
		// Update UI based on new data
	}
};
```

### 3. `get_datatable_options(reportViewInstance, defaultOptions)`

Allows customization of the DataTable options before the table is created.

**Parameters:**
- `reportViewInstance`: The ReportView instance
- `defaultOptions`: The default DataTable options object

**Returns:** Modified options object (or null to use defaults)

**Example:**
```javascript
frappe.reportview_settings['Your DocType'] = {
	get_datatable_options: function(reportView, options) {
		// Customize cell height
		options.cellHeight = 60;
		
		// Add custom events
		options.events.onCellClick = function(colIndex, rowIndex) {
			console.log('Cell clicked:', colIndex, rowIndex);
		};
		
		return options;
	}
};
```

### 4. `formatter(row, column, value, columnData, data, defaultFormatter)`

Custom formatter for cell rendering. This wraps the default formatting logic.

**Parameters:**
- `row`: The row data
- `column`: The column object
- `value`: The cell value
- `columnData`: Column metadata
- `data`: Additional data context
- `defaultFormatter`: The default formatter function

**Returns:** HTML string or formatted value

**Example:**
```javascript
frappe.reportview_settings['Your DocType'] = {
	formatter: function(row, column, value, columnData, data, defaultFormatter) {
		// Custom formatting for specific fields
		if (column.docfield && column.docfield.fieldname === 'status') {
			return `<span class="custom-status-${value}">${value}</span>`;
		}
		
		// Use default formatter for other fields
		return defaultFormatter(value, row, column, data);
	}
};
```

## Complete Example

Here's a complete example for a custom DocType called "Project":

**File:** `your_app/your_module/doctype/project/project_report.js`

```javascript
frappe.provide('frappe.reportview_settings');

frappe.reportview_settings['Project'] = {
	// Called on initial load
	onload: function(reportView) {
		// Add a custom button
		reportView.page.add_inner_button(__('Export Projects'), function() {
			// Custom export logic
			frappe.call({
				method: 'your_app.api.export_projects',
				args: {
					filters: reportView.get_args()
				},
				callback: function(r) {
					frappe.msgprint(__('Export started'));
				}
			});
		});
	},

	// Called on every refresh
	refresh: function(reportView) {
		// Update page title with count
		reportView.page.set_title(__('Projects ({0})', [reportView.data.length]));
		
		// Highlight overdue projects
		reportView.data.forEach((row, idx) => {
			if (row.status === 'Overdue') {
				const $row = reportView.$result.find(`.dt-row[data-row-index="${idx}"]`);
				$row.addClass('overdue-project');
			}
		});
	},

	// Customize datatable options
	get_datatable_options: function(reportView, options) {
		// Increase cell height for better readability
		options.cellHeight = 50;
		
		// Add custom column widths
		options.columns.forEach(col => {
			if (col.field === 'project_name') {
				col.width = 300;
			}
		});
		
		return options;
	},

	// Custom cell formatting
	formatter: function(row, column, value, columnData, data, defaultFormatter) {
		const fieldname = column.docfield?.fieldname;
		
		// Custom format for priority
		if (fieldname === 'priority') {
			const colors = {
				'High': 'red',
				'Medium': 'orange',
				'Low': 'green'
			};
			return `<span class="indicator ${colors[value]}">${value}</span>`;
		}
		
		// Custom format for progress
		if (fieldname === 'progress_percent') {
			return `
				<div class="progress" style="height: 20px;">
					<div class="progress-bar" style="width: ${value}%">${value}%</div>
				</div>
			`;
		}
		
		// Use default formatter for everything else
		return defaultFormatter(value, row, column, data);
	}
};
```

## Inline Popup Editing

The Report View now uses inline popup editing (Notion/NocoDB style) instead of in-cell editing.

### Key Features:

1. **Single-click to edit**: Click any cell to open a popup editor
2. **Read-only mode**: Users without write permission see a read-only popup
3. **Table MultiSelect rendering**: Shows as pills (e.g., "3 Handlers" or "+ Assign Handler")
4. **Table fields hidden**: Pure Table fields are not shown as columns

### Customization:

You can still customize which fields show up and how they're formatted using the hooks above.

## Loading the Settings File

The settings file is automatically loaded by Frappe's meta system, similar to `[doctype]_list.js`. Make sure:

1. The file is named exactly `[doctype_name]_report.js` (lowercase, with underscores)
2. The file is in the doctype's folder
3. You've cleared cache after creating the file: `bench clear-cache`

## Debugging

To check if your settings are loaded:

```javascript
// In browser console
console.log(frappe.reportview_settings['Your DocType']);
```

If `undefined`, check:
- File naming (must match doctype name exactly, with underscores)
- File location (must be in doctype folder)
- Cache (run `bench clear-cache`)
- Syntax errors in your JS file

## Notes

- The inline editor automatically handles permissions
- Save operations use the standard `frappe.db.set_value` API
- Version history and audit trails work automatically
- No page refresh needed - updates happen in-place

