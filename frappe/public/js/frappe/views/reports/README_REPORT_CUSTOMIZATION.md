# Report View Customization

Similar to List View's `[doctype]_list.js` files, Report View now supports DocType-specific customization through `[doctype]_report.js` files.

## How to Use

Create a file named `[doctype]_report.js` in your app's public/js directory and register it with:

```javascript
frappe.provide("frappe.reportview_settings");

frappe.reportview_settings['Your DocType'] = {
    // Your customizations here
};
```

## Available Hooks

### 1. onload(reportViewInstance)
Called once when the Report view is first created.

```javascript
frappe.reportview_settings['Your DocType'] = {
    onload: function(report_view) {
        console.log('Report view loaded for', report_view.doctype);
        // Initialize custom components, add custom buttons, etc.
    }
};
```

### 2. refresh(reportViewInstance)
Called whenever the Report view data refreshes.

```javascript
frappe.reportview_settings['Your DocType'] = {
    refresh: function(report_view) {
        console.log('Report view refreshed');
        // Update custom UI elements based on new data
    }
};
```

### 3. get_datatable_options(reportViewInstance)
Allows customization of the DataTable options.

```javascript
frappe.reportview_settings['Your DocType'] = {
    get_datatable_options: function(report_view) {
        return {
            // Return custom datatable options to merge with defaults
            cellHeight: 40, // Override cell height
            // Other frappe-datatable options
        };
    }
};
```

### 4. formatter(row, col, value, column, data, defaultFormatter)
Allows custom formatting of cell values.

```javascript
frappe.reportview_settings['Your DocType'] = {
    formatter: function(row, col, value, column, data, defaultFormatter) {
        // Custom formatting logic
        if (column.field === 'status') {
            return `<span class="indicator ${value}">${value}</span>`;
        }
        
        // Use default formatter for other fields
        return defaultFormatter(value, row, column, data);
    }
};
```

## Example: Complete Customization

```javascript
frappe.provide("frappe.reportview_settings");

frappe.reportview_settings['Task'] = {
    onload: function(report_view) {
        // Add custom button
        report_view.page.add_inner_button(__('Custom Action'), function() {
            frappe.msgprint('Custom action triggered');
        });
    },
    
    refresh: function(report_view) {
        // Update UI based on data
        console.log(`Loaded ${report_view.data.length} tasks`);
    },
    
    get_datatable_options: function(report_view) {
        return {
            cellHeight: 40,
            // Add custom datatable options
        };
    },
    
    formatter: function(row, col, value, column, data, defaultFormatter) {
        // Custom formatting for priority field
        if (column.field === 'priority') {
            const colors = {
                'High': 'red',
                'Medium': 'orange',
                'Low': 'green'
            };
            const color = colors[value] || 'gray';
            return `<span style="color: ${color}; font-weight: bold;">${value}</span>`;
        }
        
        // Use default formatter for everything else
        return defaultFormatter(value, row, column, data);
    }
};
```

## Notes

- These settings are separate from List View settings (`frappe.listview_settings`)
- The settings are loaded from `frappe.reportview_settings[doctype]`
- All hooks are optional - implement only what you need
- The formatter hook receives both the default formatter and any built-in special formatters (like Table MultiSelect pills)
