// Example per-doctype configuration for Report View
// This demonstrates how to customize Report View behavior for the User doctype

frappe.reportview_settings["User"] = {
	// Called when the Report view is first created
	onload: function(report_view) {
		console.log("User Report View loaded");
	},

	// Called whenever the Report view data refreshes
	refresh: function(report_view) {
		console.log("User Report View refreshed");
	},

	// Customize datatable options (hide columns, reorder, etc.)
	get_datatable_options: function(report_view) {
		return {
			// Example: hide some columns by default
			// You can also reorder columns, set custom widths, etc.
		};
	},

	// Custom formatter for cells
	formatter: function(row, cell, value, column, data, default_formatter) {
		// Example: custom formatting for specific fields
		if (column.field === "enabled") {
			// Custom formatting for enabled field
			return value ? "✓ Active" : "✗ Inactive";
		}

		// For all other fields, use default formatting
		return default_formatter(value, row, column, data);
	}
};
