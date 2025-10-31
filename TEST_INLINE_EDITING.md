# Testing Inline Popup Editing in Report View

This document describes how to test the new inline popup editing feature in Report View.

## What Was Implemented

### 1. Inline Popup Editor (`inline_editor_popover.js`)
- Reusable popup component for editing cells
- Single-click to open editor
- Positioned near the clicked cell
- Read-only mode for users without write permission
- Escape key to cancel
- Outside click to close without saving

### 2. Report View Changes (`report_view.js`)
- **Removed**: Double-click inline editing (`getEditor` removed from DataTable setup)
- **Added**: Single-click cell handlers
- **Added**: Table field filtering (pure Table fields are hidden)
- **Added**: TableMultiSelect pill formatter
- **Added**: Support for `[doctype]_report.js` configuration files

### 3. TableMultiSelect Rendering
- Empty state: `+ Assign <Field Label>`
- Non-empty: `N <Field Label>(s)`
- Examples: `+ Assign Handler`, `3 Handler(s)`

### 4. DocType-Specific Configuration
- `onload(reportView)`: Called when report loads
- `refresh(reportView)`: Called on data refresh
- `get_datatable_options(reportView, options)`: Customize datatable
- `formatter(row, col, value, column, data, defaultFormatter)`: Custom cell formatting

## Testing Checklist

### Basic Functionality
- [ ] Single click on any editable cell opens popup
- [ ] Popup appears near the clicked cell
- [ ] Popup shows field label as title (e.g., "Status", "Assign Handler")
- [ ] Popup contains the correct field control (Link, Select, Date, etc.)
- [ ] Current value is pre-filled in the control
- [ ] Escape key closes popup without saving
- [ ] Clicking outside popup closes it without saving
- [ ] Cancel button closes popup without saving
- [ ] Save button saves the value
- [ ] After save, cell updates in-place (no page reload)
- [ ] Success message shows after save

### Field Type Testing

#### Data Fields
- [ ] Text fields show input box in popup
- [ ] Enter key saves (for single-line fields)
- [ ] Value updates in cell after save

#### Link Fields
- [ ] Link search works in popup
- [ ] Can select from dropdown
- [ ] Selected value updates in cell

#### Select Fields
- [ ] Options dropdown shows in popup
- [ ] Selected option updates in cell

#### Date/Datetime Fields
- [ ] Date picker shows in popup
- [ ] Selected date updates in cell
- [ ] Date is formatted correctly in cell

#### Check (Boolean) Fields
- [ ] Checkbox shows in popup
- [ ] Toggling checkbox and saving updates cell

#### Int/Float/Currency Fields
- [ ] Number input shows in popup
- [ ] Enter key saves
- [ ] Number is formatted correctly in cell after save

#### TableMultiSelect Fields
- [ ] Empty state shows: `+ Assign <Field Label>`
- [ ] Click opens popup with search/select UI
- [ ] Can add multiple selections
- [ ] After save, pill shows: `N <Field Label>(s)`
- [ ] Count is correct

### Permissions Testing
- [ ] User WITH write permission sees editable popup
- [ ] User WITHOUT write permission sees read-only popup
- [ ] Read-only popup shows field control disabled
- [ ] Read-only popup has no Save button (or it's disabled)
- [ ] Read-only popup can still be opened and viewed
- [ ] Submitted documents: editable only for fields with `allow_on_submit`
- [ ] Cancelled documents: all fields are read-only

### Table Fields
- [ ] Pure Table fields (not TableMultiSelect) are NOT shown as columns
- [ ] Adding a Table field to column picker doesn't add it to view

### UI/UX Testing
- [ ] Popup doesn't overflow off-screen (right edge)
- [ ] Popup doesn't overflow off-screen (bottom edge)
- [ ] Popup repositions above cell if needed
- [ ] Multiple clicks on different cells work correctly
- [ ] Opening a popup while another is open replaces it
- [ ] Pills in TableMultiSelect cells are styled correctly
- [ ] Cell hover shows pointer cursor
- [ ] Cell hover shows light background

### Error Handling
- [ ] Failed saves show error message
- [ ] Save button restores after error
- [ ] Validation errors are displayed
- [ ] Network errors are handled gracefully

## Test on DocTypes

### Recommended DocTypes to Test
1. **User** - Has Link, Data, Check fields
2. **ToDo** - Has Link, Select, Date, Text fields
3. **Task** - Has Status, Priority, Date fields, TableMultiSelect for assignments
4. **Project** - Complex fields including TableMultiSelect
5. **Any Custom DocType** with various field types

## Test Scenario: ToDo DocType

### Setup
1. Go to ToDo List
2. Switch to Report View
3. Ensure you have some ToDo records

### Test Steps
1. **Click on Status field**
   - Popup should open
   - Title should be "Status"
   - Select control with options should show
   - Current status should be selected
   - Change status, click Save
   - Cell should update immediately

2. **Click on Description field**
   - Popup should open with Text control
   - Edit description
   - Save
   - Cell should update

3. **Click on Assigned To field**
   - Popup should open with Link control
   - Search for a user
   - Select and save
   - Cell should show user name

4. **Click on a read-only field as non-owner**
   - Popup should open in read-only mode
   - Control should be disabled
   - No Save button or disabled Save

## Test Scenario: Custom DocType with TableMultiSelect

If you have a DocType with TableMultiSelect (like "Assigned Users"):

### Setup
```python
# In your doctype JSON, add a field:
{
    "fieldname": "assigned_users",
    "fieldtype": "Table MultiSelect",
    "label": "Assigned Users",
    "options": "User"
}
```

### Test Steps
1. Go to Report View for this DocType
2. **Empty TableMultiSelect cell**
   - Should show: `+ Assign Assigned Users`
   - Click cell
   - Popup opens with search/select UI
   - Add 2-3 users
   - Save
   - Cell should now show: `3 Assigned Users(s)`

3. **Non-empty TableMultiSelect cell**
   - Click cell showing `3 Assigned Users(s)`
   - Popup opens with current selections
   - Add or remove users
   - Save
   - Cell pill updates with new count

## Performance Testing
- [ ] Opening popup is fast (< 100ms)
- [ ] Save operation is fast
- [ ] Cell update is instant (no flicker)
- [ ] No memory leaks (open/close many times)

## Browser Compatibility
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Per-DocType Configuration Testing

### Setup
Create a test file: `your_app/your_module/doctype/todo/todo_report.js`

```javascript
frappe.provide('frappe.reportview_settings');

frappe.reportview_settings['ToDo'] = {
    onload: function(reportView) {
        console.log('ToDo report loaded');
    },
    
    refresh: function(reportView) {
        console.log('ToDo report refreshed', reportView.data.length);
    },
    
    get_datatable_options: function(reportView, options) {
        options.cellHeight = 60;
        return options;
    },
    
    formatter: function(row, column, value, columnData, data, defaultFormatter) {
        if (column.docfield?.fieldname === 'status') {
            return `<strong>${value}</strong>`;
        }
        return defaultFormatter(value, row, column, data);
    }
};
```

### Test Steps
1. Clear cache: `bench clear-cache`
2. Reload browser
3. Go to ToDo Report View
4. **Check console**: Should see "ToDo report loaded"
5. **Refresh data**: Should see "ToDo report refreshed X" in console
6. **Check cell height**: Should be 60px (taller than default)
7. **Check status column**: Status values should be bold

## Known Limitations

1. **Text Editor fields**: These already open in a dialog, so they continue to work as before
2. **Image fields**: Not tested extensively
3. **Signature fields**: Not tested extensively
4. **Complex calculated fields**: May need special handling

## Debugging

### Check if settings are loaded
```javascript
// In browser console
console.log(frappe.reportview_settings);
console.log(frappe.reportview_settings['ToDo']); // Should not be undefined
```

### Check if popup is created
```javascript
// In browser console
console.log(frappe.ui.inline_editor_popover);
console.log(frappe.ui.inline_editor_popover.is_open);
```

### Check cell click handlers
- Open Dev Tools
- Go to Elements tab
- Find a `.dt-cell--col` element
- Check Event Listeners tab
- Should see 'click' event attached

## Troubleshooting

### Popup doesn't open
- Check console for errors
- Verify inline_editor_popover.js is loaded
- Check if cell has `docfield` property

### Popup opens but Save doesn't work
- Check console for save errors
- Verify permissions on the document
- Check network tab for API call

### TableMultiSelect shows wrong count
- Check data format in browser console
- Verify the value is an array or JSON string

### Styles look broken
- Run `bench build`
- Clear browser cache
- Check if inline_editor_popover.css is loaded

### [doctype]_report.js not loading
- Check file naming (must match doctype with underscores)
- Clear cache: `bench clear-cache`
- Check for syntax errors in the JS file
- Verify file is in correct location

## Success Criteria

The implementation is successful if:

1. ✅ All basic functionality tests pass
2. ✅ All field types work correctly
3. ✅ Permissions are respected
4. ✅ TableMultiSelect fields show pills
5. ✅ Pure Table fields are hidden
6. ✅ Per-DocType configuration works
7. ✅ No console errors
8. ✅ No performance regressions
9. ✅ Works across all major browsers
10. ✅ User experience is intuitive and smooth

