/**
 * frappe.ui.InlineEditorPopover
 * 
 * Reusable inline popup editor for Report View (Notion/NocoDB style)
 * Handles overlay, positioning, field control rendering, and save/cancel actions
 */

frappe.provide("frappe.ui");

frappe.ui.InlineEditorPopover = class InlineEditorPopover {
	constructor() {
		this.overlay = null;
		this.popup = null;
		this.control = null;
		this.is_open = false;
	}

	/**
	 * Opens the inline popup editor
	 * @param {Object} options
	 * @param {string} options.docname - Document name
	 * @param {Object} options.fielddef - Field definition (contains label, fieldtype, fieldname, etc.)
	 * @param {*} options.currentValue - Current field value
	 * @param {HTMLElement} options.cellElement - The clicked cell element for positioning
	 * @param {boolean} options.canWrite - Whether user has write permission
	 * @param {Function} options.onSave - Callback when save is clicked: (newValue) => {}
	 * @param {string} options.doctype - Document type
	 * @param {Object} options.doc - Full document data for evaluation
	 */
	open(options) {
		this.options = options;
		
		if (this.is_open) {
			this.close();
		}

		this.create_overlay();
		this.create_popup();
		this.position_popup();
		this.render_control();
		this.setup_event_handlers();
		
		this.is_open = true;

		// Focus the control
		setTimeout(() => {
			if (this.control && this.control.set_focus) {
				this.control.set_focus();
			}
		}, 100);
	}

	create_overlay() {
		// Reuse or create overlay
		this.overlay = document.querySelector('.frappe-inline-editor-overlay');
		
		if (!this.overlay) {
			this.overlay = document.createElement('div');
			this.overlay.className = 'frappe-inline-editor-overlay';
			document.body.appendChild(this.overlay);
		}

		this.overlay.style.display = 'block';
	}

	create_popup() {
		// Clear any existing popup content
		this.overlay.innerHTML = '';

		const popup = document.createElement('div');
		popup.className = 'frappe-inline-editor-popup';
		
		// Header
		const header = document.createElement('div');
		header.className = 'inline-editor-header';
		const fieldLabel = this.options.fielddef.label || this.options.fielddef.fieldname;
		header.textContent = __('Assign {0}', [__(fieldLabel)]);
		popup.appendChild(header);

		// Control container
		const controlContainer = document.createElement('div');
		controlContainer.className = 'inline-editor-control';
		popup.appendChild(controlContainer);

		// Footer (only if editable)
		if (this.options.canWrite) {
			const footer = document.createElement('div');
			footer.className = 'inline-editor-footer';
			
			const saveBtn = document.createElement('button');
			saveBtn.className = 'btn btn-primary btn-sm';
			saveBtn.textContent = __('Save');
			saveBtn.onclick = () => this.save();
			
			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'btn btn-secondary btn-sm';
			cancelBtn.textContent = __('Cancel');
			cancelBtn.onclick = () => this.close();
			
			footer.appendChild(saveBtn);
			footer.appendChild(cancelBtn);
			popup.appendChild(footer);
		}

		this.popup = popup;
		this.controlContainer = controlContainer;
		this.overlay.appendChild(popup);
	}

	position_popup() {
		const rect = this.options.cellElement.getBoundingClientRect();
		const popupRect = this.popup.getBoundingClientRect();
		
		// Position below the cell
		let top = rect.bottom + 4;
		let left = rect.left;

		// Prevent overflow on the right
		if (left + popupRect.width > window.innerWidth) {
			left = window.innerWidth - popupRect.width - 10;
		}

		// Prevent overflow on the bottom
		if (top + popupRect.height > window.innerHeight) {
			top = rect.top - popupRect.height - 4;
			// If still overflows, clamp to bottom
			if (top < 0) {
				top = window.innerHeight - popupRect.height - 10;
			}
		}

		// Ensure left is not negative
		if (left < 0) {
			left = 10;
		}

		this.popup.style.position = 'fixed';
		this.popup.style.top = top + 'px';
		this.popup.style.left = left + 'px';
	}

	render_control() {
		const df = Object.assign({}, this.options.fielddef);
		
		// Make control read-only if user cannot write
		if (!this.options.canWrite) {
			df.read_only = 1;
		}

		// Create the control using Frappe's control system
		this.control = frappe.ui.form.make_control({
			df: df,
			parent: $(this.controlContainer),
			render_input: true,
		});

		this.control.toggle_label(false);
		this.control.toggle_description(false);
		
		// Set the current value
		if (this.options.currentValue !== undefined) {
			this.control.set_value(this.options.currentValue);
		}

		// For TableMultiSelect, we need to handle it specially
		if (df.fieldtype === 'Table MultiSelect') {
			this.control.frm = {
				doc: this.options.doc || {},
				script_manager: {
					trigger: () => Promise.resolve()
				}
			};
		}
	}

	setup_event_handlers() {
		// Click outside to close
		this.overlay.onclick = (e) => {
			if (e.target === this.overlay) {
				this.close();
			}
		};

		// Escape key to close
		this.escapeHandler = (e) => {
			if (e.key === 'Escape') {
				this.close();
			}
		};
		document.addEventListener('keydown', this.escapeHandler);
	}

	save() {
		if (!this.options.canWrite) {
			return;
		}

		const newValue = this.control.get_value();
		
		if (this.options.onSave) {
			this.options.onSave(newValue);
		}

		this.close();
	}

	close() {
		if (this.escapeHandler) {
			document.removeEventListener('keydown', this.escapeHandler);
		}

		if (this.overlay) {
			this.overlay.style.display = 'none';
			this.overlay.innerHTML = '';
		}

		this.control = null;
		this.popup = null;
		this.is_open = false;
	}
};

// Add CSS styles
frappe.provide("frappe.ui.inline_editor_styles");

if (!frappe.ui.inline_editor_styles.loaded) {
	const style = document.createElement('style');
	style.textContent = `
		.frappe-inline-editor-overlay {
			position: fixed;
			inset: 0;
			background: transparent;
			z-index: 1050;
			display: none;
		}

		.frappe-inline-editor-popup {
			background: white;
			border: 1px solid var(--border-color);
			border-radius: 4px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
			min-width: 300px;
			max-width: 500px;
		}

		.inline-editor-header {
			padding: 12px 16px;
			border-bottom: 1px solid var(--border-color);
			font-weight: 600;
			font-size: 14px;
		}

		.inline-editor-control {
			padding: 16px;
		}

		.inline-editor-control .form-group {
			margin-bottom: 0;
		}

		.inline-editor-footer {
			padding: 12px 16px;
			border-top: 1px solid var(--border-color);
			display: flex;
			gap: 8px;
			justify-content: flex-end;
		}
	`;
	document.head.appendChild(style);
	frappe.ui.inline_editor_styles.loaded = true;
}
