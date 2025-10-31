/**
 * InlineEditorPopover - Reusable popup editor for inline cell editing (Notion/NocoDB style)
 */

frappe.provide("frappe.ui");

frappe.ui.InlineEditorPopover = class InlineEditorPopover {
	constructor() {
		this.overlay = null;
		this.popup = null;
		this.control = null;
		this.options = null;
		this.is_open = false;
	}

	/**
	 * Open the inline popup editor
	 * @param {Object} options - Configuration options
	 * @param {HTMLElement} options.cellElement - The clicked cell element
	 * @param {Object} options.fielddef - The field definition
	 * @param {*} options.currentValue - Current value of the field
	 * @param {string} options.docname - Document name
	 * @param {string} options.doctype - Document type
	 * @param {boolean} options.canWrite - Whether user can edit this field
	 * @param {Function} options.onSave - Callback when save is clicked
	 * @param {Function} options.onCancel - Optional callback when cancelled
	 * @param {Object} options.doc - Full document object for context
	 */
	open(options) {
		if (this.is_open) {
			this.close();
		}

		this.options = options;
		this.is_open = true;

		// Create or reuse overlay
		this.create_overlay();
		
		// Create popup panel
		this.create_popup();
		
		// Position popup near cell
		this.position_popup();
		
		// Create field control
		this.create_control();
		
		// Setup event handlers
		this.setup_handlers();
		
		// Focus the control
		setTimeout(() => {
			if (this.control && this.control.set_focus) {
				this.control.set_focus();
			}
		}, 100);
	}

	create_overlay() {
		// Reuse existing overlay or create new one
		let overlay = document.querySelector('.frappe-inline-editor-overlay');
		
		if (!overlay) {
			overlay = document.createElement('div');
			overlay.className = 'frappe-inline-editor-overlay';
			overlay.style.cssText = `
				position: fixed;
				inset: 0;
				background-color: rgba(0, 0, 0, 0.2);
				z-index: 1050;
				display: none;
			`;
			document.body.appendChild(overlay);
		}
		
		this.overlay = overlay;
		this.overlay.style.display = 'block';
	}

	create_popup() {
		// Remove any existing popup content
		this.overlay.innerHTML = '';
		
		const popup = document.createElement('div');
		popup.className = 'frappe-inline-editor-popup';
		popup.style.cssText = `
			position: absolute;
			background: white;
			border: 1px solid var(--border-color);
			border-radius: var(--border-radius-md);
			box-shadow: var(--shadow-lg);
			min-width: 300px;
			max-width: 500px;
			max-height: 80vh;
			overflow: auto;
			z-index: 1051;
		`;
		
		// Header
		const header = document.createElement('div');
		header.className = 'inline-editor-header';
		header.style.cssText = `
			padding: 12px 16px;
			border-bottom: 1px solid var(--border-color);
			font-weight: 600;
			font-size: 14px;
			color: var(--text-color);
			display: flex;
			justify-content: space-between;
			align-items: center;
		`;
		
		const title = document.createElement('span');
		title.textContent = this.get_title();
		header.appendChild(title);
		
		// Close button
		const closeBtn = document.createElement('button');
		closeBtn.className = 'btn-close';
		closeBtn.innerHTML = '&times;';
		closeBtn.style.cssText = `
			background: none;
			border: none;
			font-size: 24px;
			cursor: pointer;
			padding: 0;
			margin-left: 16px;
			color: var(--text-muted);
		`;
		closeBtn.onclick = () => this.close();
		header.appendChild(closeBtn);
		
		popup.appendChild(header);
		
		// Body (control container)
		const body = document.createElement('div');
		body.className = 'inline-editor-body';
		body.style.cssText = `
			padding: 16px;
		`;
		popup.appendChild(body);
		
		// Footer
		if (this.options.canWrite) {
			const footer = document.createElement('div');
			footer.className = 'inline-editor-footer';
			footer.style.cssText = `
				padding: 12px 16px;
				border-top: 1px solid var(--border-color);
				display: flex;
				justify-content: flex-end;
				gap: 8px;
			`;
			
			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'btn btn-sm btn-default';
			cancelBtn.textContent = __('Cancel');
			cancelBtn.onclick = () => this.close();
			footer.appendChild(cancelBtn);
			
			const saveBtn = document.createElement('button');
			saveBtn.className = 'btn btn-sm btn-primary';
			saveBtn.textContent = __('Save');
			saveBtn.onclick = () => this.handle_save();
			footer.appendChild(saveBtn);
			
			popup.appendChild(footer);
		}
		
		this.overlay.appendChild(popup);
		this.popup = popup;
	}

	get_title() {
		const label = this.options.fielddef.label || this.options.fielddef.fieldname;
		
		// For Table MultiSelect and similar assignment fields, use "Assign <Label>"
		if (this.options.fielddef.fieldtype === 'Table MultiSelect') {
			return __('Assign {0}', [__(label)]);
		}
		
		// For other fields, just use the label
		return __(label);
	}

	position_popup() {
		if (!this.options.cellElement || !this.popup) return;
		
		const rect = this.options.cellElement.getBoundingClientRect();
		
		// Position below the cell with a small gap
		let top = rect.bottom + 4;
		let left = rect.left;
		
		// Ensure popup stays within viewport
		const popupRect = this.popup.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		
		// Adjust horizontal position if overflowing
		if (left + popupRect.width > viewportWidth - 10) {
			left = viewportWidth - popupRect.width - 10;
		}
		if (left < 10) {
			left = 10;
		}
		
		// Adjust vertical position if overflowing
		if (top + popupRect.height > viewportHeight - 10) {
			// Try positioning above the cell instead
			top = rect.top - popupRect.height - 4;
			if (top < 10) {
				// If still doesn't fit, position at viewport top
				top = 10;
			}
		}
		
		this.popup.style.top = top + 'px';
		this.popup.style.left = left + 'px';
	}

	create_control() {
		const body = this.popup.querySelector('.inline-editor-body');
		if (!body) return;
		
		const fielddef = Object.assign({}, this.options.fielddef);
		
		// For Table MultiSelect, we need special handling
		if (fielddef.fieldtype === 'Table MultiSelect') {
			// Use the frappe control system
			const controlClass = frappe.ui.form.make_control({
				df: fielddef,
				parent: $(body),
				render_input: true,
			});
			
			this.control = controlClass;
			this.control.set_value(this.options.currentValue);
			
			// Disable if read-only
			if (!this.options.canWrite) {
				this.control.$input && this.control.$input.prop('disabled', true);
				this.control.$wrapper && this.control.$wrapper.addClass('disabled');
			}
			
			return;
		}
		
		// For other field types, use standard Frappe control
		const controlClass = frappe.ui.form.Controls[fielddef.fieldtype] || 
			frappe.ui.form.Controls['Data'];
		
		const control = new controlClass({
			df: fielddef,
			parent: $(body),
			render_input: true,
			doc: this.options.doc || {},
			doctype: this.options.doctype,
			docname: this.options.docname,
		});
		
		control.refresh();
		control.set_value(this.options.currentValue);
		control.toggle_label(false);
		control.toggle_description(false);
		
		// Disable if read-only
		if (!this.options.canWrite) {
			control.$input && control.$input.prop('disabled', true);
			control.$wrapper && control.$wrapper.addClass('disabled');
		}
		
		this.control = control;
	}

	setup_handlers() {
		// Click outside to close
		this.overlay.onclick = (e) => {
			if (e.target === this.overlay) {
				this.close();
			}
		};
		
		// Escape key to close
		this.escape_handler = (e) => {
			if (e.key === 'Escape') {
				this.close();
			}
		};
		document.addEventListener('keydown', this.escape_handler);
		
		// Enter key to save (for single-line inputs)
		if (this.control && this.control.$input) {
			const fieldtype = this.options.fielddef.fieldtype;
			const singleLineTypes = ['Data', 'Int', 'Float', 'Currency', 'Percent'];
			
			if (singleLineTypes.includes(fieldtype) && this.options.canWrite) {
				this.control.$input.on('keydown', (e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						this.handle_save();
					}
				});
			}
		}
	}

	handle_save() {
		if (!this.options.canWrite) return;
		
		const value = this.control.get_value();
		
		if (this.options.onSave) {
			// Show loading state
			const saveBtn = this.popup.querySelector('.btn-primary');
			if (saveBtn) {
				saveBtn.disabled = true;
				saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
			}
			
			// Call save callback
			Promise.resolve(this.options.onSave(value))
				.then(() => {
					this.close();
				})
				.catch((err) => {
					console.error('Save failed:', err);
					frappe.show_alert({
						message: __('Failed to save'),
						indicator: 'red',
					});
					
					// Restore button state
					if (saveBtn) {
						saveBtn.disabled = false;
						saveBtn.innerHTML = __('Save');
					}
				});
		} else {
			this.close();
		}
	}

	close() {
		if (!this.is_open) return;
		
		// Clean up control
		if (this.control && this.control.$wrapper) {
			this.control.$wrapper.remove();
		}
		this.control = null;
		
		// Hide overlay
		if (this.overlay) {
			this.overlay.style.display = 'none';
			this.overlay.innerHTML = '';
		}
		
		// Remove event listeners
		if (this.escape_handler) {
			document.removeEventListener('keydown', this.escape_handler);
			this.escape_handler = null;
		}
		
		// Call cancel callback
		if (this.options && this.options.onCancel) {
			this.options.onCancel();
		}
		
		this.popup = null;
		this.options = null;
		this.is_open = false;
	}

	is_popup_open() {
		return this.is_open;
	}
};

// Create global singleton instance
frappe.ui.inline_editor_popover = new frappe.ui.InlineEditorPopover();

