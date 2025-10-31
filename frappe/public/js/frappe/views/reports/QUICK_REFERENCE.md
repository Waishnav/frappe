# Report View Settings - Quick Reference

## File Template

Create: `your_app/your_module/doctype/[doctype]/[doctype]_report.js`

```javascript
frappe.provide('frappe.reportview_settings');

frappe.reportview_settings['Your DocType'] = {
    // Called once on initial load
    onload: function(reportView) {
        // Add buttons, setup one-time things
    },
    
    // Called on every data refresh
    refresh: function(reportView) {
        // Update UI based on new data
    },
    
    // Customize datatable options
    get_datatable_options: function(reportView, options) {
        // Modify options
        return options;
    },
    
    // Custom cell formatter
    formatter: function(row, column, value, columnData, data, defaultFormatter) {
        // Return custom HTML or use defaultFormatter
        return defaultFormatter(value, row, column, data);
    }
};
```

## ReportView Instance Properties

```javascript
reportView.doctype              // String: DocType name
reportView.data                 // Array: Current row data
reportView.columns              // Array: Column definitions
reportView.columns_map          // Object: Column lookup by id
reportView.datatable            // Object: DataTable instance
reportView.$result              // jQuery: Result container
reportView.$datatable_wrapper   // jQuery: DataTable wrapper
reportView.page                 // Object: Page instance
reportView.filter_area          // Object: Filter bar
reportView.sort_selector        // Object: Sort selector
reportView.meta                 // Object: DocType meta
reportView.settings             // Object: List view settings
reportView.report_settings      // Object: Report settings (yours!)
reportView.report_doc           // Object: Saved report doc (if any)
```

## Common Use Cases

### Add Custom Button

```javascript
onload: function(reportView) {
    reportView.page.add_inner_button(__('Export'), function() {
        // Custom export logic
    });
}
```

### Change Cell Height

```javascript
get_datatable_options: function(reportView, options) {
    options.cellHeight = 60;
    return options;
}
```

### Custom Status Formatting

```javascript
formatter: function(row, column, value, columnData, data, defaultFormatter) {
    if (column.docfield?.fieldname === 'status') {
        const colors = { Open: 'orange', Closed: 'green', Pending: 'red' };
        return `<span class="indicator ${colors[value]}">${value}</span>`;
    }
    return defaultFormatter(value, row, column, data);
}
```

### Add CSS Class to Rows

```javascript
refresh: function(reportView) {
    reportView.data.forEach((row, idx) => {
        if (row.is_urgent) {
            const $row = reportView.$result.find(`.dt-row[data-row-index="${idx}"]`);
            $row.addClass('urgent-row');
        }
    });
}
```

### Modify Column Widths

```javascript
get_datatable_options: function(reportView, options) {
    options.columns.forEach(col => {
        if (col.field === 'name') col.width = 200;
        if (col.field === 'description') col.width = 400;
    });
    return options;
}
```

### Update Page Title with Count

```javascript
refresh: function(reportView) {
    const count = reportView.data.length;
    reportView.page.set_title(__('Items ({0})', [count]));
}
```

## After Creating File

1. **Clear cache**: `bench clear-cache`
2. **Reload browser**
3. **Verify**: `console.log(frappe.reportview_settings['Your DocType'])`

## Field Types in Popup Editor

All standard Frappe field types are supported:
- Data, Text, Text Editor
- Int, Float, Currency, Percent
- Date, Datetime, Time
- Link, Dynamic Link
- Select, Check
- **Table MultiSelect** (shows as pills)

**Note**: Pure `Table` fields are hidden from Report View.

## Styling Pills (TableMultiSelect)

```css
/* In your app's CSS */
.table-multiselect-pill {
    /* Customize pill appearance */
}

.table-multiselect-pill.empty {
    /* Customize empty state */
}
```

## Debug

```javascript
// Check if loaded
console.log(frappe.reportview_settings);

// Check popup state
console.log(frappe.ui.inline_editor_popover.is_open);

// Access current report view
// (if you're on a report view page)
const reportView = frappe.views.list_view[frappe.get_route_str()];
console.log(reportView);
```

