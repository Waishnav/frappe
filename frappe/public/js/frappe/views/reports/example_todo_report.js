/**
 * Example Report View Customization for ToDo DocType
 * 
 * This file demonstrates how to customize the Report View for a specific DocType
 * Place this file in your app's public/js directory
 */

frappe.provide("frappe.reportview_settings");

frappe.reportview_settings['ToDo'] = {
	/**
	 * Called once when the Report view is first loaded
	 */
	onload: function(report_view) {
		console.log('ToDo Report View loaded');
		
		// Example: Add a custom button to the page
		report_view.page.add_inner_button(__('Mark All Complete'), function() {
			const selected = report_view.get_checked_items();
			if (selected.length === 0) {
				frappe.msgprint(__('Please select items to mark as complete'));
				return;
			}
			
			frappe.confirm(
				__('Mark {0} items as complete?', [selected.length]),
				() => {
					// Batch update logic here
					frappe.msgprint(__('Items marked as complete'));
				}
			);
		});
	},
	
	/**
	 * Called whenever the Report view refreshes
	 */
	refresh: function(report_view) {
		// Update page indicators or stats
		const total = report_view.data.length;
		const completed = report_view.data.filter(d => d.status === 'Closed').length;
		
		console.log(`ToDo Report: ${completed}/${total} completed`);
	},
	
	/**
	 * Customize DataTable options
	 */
	get_datatable_options: function(report_view) {
		return {
			// Increase cell height for better readability
			cellHeight: 40,
		};
	},
	
	/**
	 * Custom cell formatter
	 */
	formatter: function(row, col, value, column, data, defaultFormatter) {
		// Custom formatting for status field
		if (column.field === 'status') {
			const indicator_map = {
				'Open': 'orange',
				'Closed': 'green',
				'Cancelled': 'red'
			};
			
			const indicator = indicator_map[value] || 'gray';
			return `<span class="indicator-pill ${indicator}">${__(value)}</span>`;
		}
		
		// Custom formatting for priority
		if (column.field === 'priority') {
			const priority_colors = {
				'High': 'red',
				'Medium': 'orange',
				'Low': 'green'
			};
			
			const color = priority_colors[value] || 'gray';
			return `<span style="color: var(--${color}-500); font-weight: 600;">${__(value)}</span>`;
		}
		
		// Use default formatter for all other fields
		return defaultFormatter(value, row, column, data);
	}
};
