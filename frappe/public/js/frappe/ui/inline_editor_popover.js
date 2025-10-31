/**
 * Inline Editor Popover for Report View
 *
 * Provides a reusable popup editor that appears near clicked cells
 * in Report View, similar to Notion/NocoDB style inline editing.
 */

frappe.provide("frappe.ui");

frappe.ui.InlineEditorPopover = class InlineEditorPopover {
	constructor() {
		this.overlay = null;
		this.popup = null;
		this.control = null;
		this.current_cell = null;
		this.current_fielddef = null;
		this.current_value = null;
		this.can_write = false;
		this.on_save_callback = null;
		this.doctype = null;
		this.docname = null;
	}

	/**
	 * Open the inline editor popup
	 * @param {Object} params
	 * @param {string} params.doctype - The DocType name
	 * @param {string} params.docname - The document name
	 * @param {Object} params.fielddef - The field definition
	 * @param {*} params.currentValue - Current value of the field
	 * @param {HTMLElement} params.cellElement - The clicked cell element
	 * @param {boolean} params.canWrite - Whether user has write permission
	 * @param {Function} params.onSave - Callback function for save (newValue) => void
	 */
	open({ doctype, docname, fielddef, currentValue, cellElement, canWrite, onSave }) {
		this.doctype = doctype;
		this.docname = docname;
		this.current_fielddef = fielddef;
		this.current_value = currentValue;
		this.current_cell = cellElement;
		this.can_write = canWrite;
		this.on_save_callback = onSave;

		this.create_overlay();
		this.position_popup();
		this.render_popup();
		this.attach_events();

		// Focus the control
		if (this.control && this.can_write) {
			setTimeout(() => {
				this.control.set_focus && this.control.set_focus();
			}, 100);
		}
	}

	/**
	 * Create or reuse the fullscreen overlay
	 */
	create_overlay() {
		// Reuse existing overlay if it exists
		if (this.overlay) {
			this.overlay.style.display = 'block';
			return;
		}

		this.overlay = document.createElement('div');
		this.overlay.className = 'frappe-inline-editor-overlay';
		this.overlay.style.cssText = `
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.1);
			z-index: 1000;
			display: block;
		`;

		this.popup = document.createElement('div');
		this.popup.className = 'frappe-inline-editor-popup';
		this.popup.style.cssText = `
			position: absolute;
			background: white;
			border-radius: 8px;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
			padding: 16px;
			min-width: 200px;
			max-width: 400px;
			z-index: 1001;
		`;

		this.overlay.appendChild(this.popup);
		document.body.appendChild(this.overlay);
	}

	/**
	 * Position the popup near the clicked cell
	 */
	position_popup() {
		if (!this.current_cell || !this.popup) return;

		const rect = this.current_cell.getBoundingClientRect();
		const popup_rect = this.popup.getBoundingClientRect();

		let top = rect.bottom + 4;
		let left = rect.left;

		// Ensure popup stays within viewport
		const viewport_width = window.innerWidth;
		const viewport_height = window.innerHeight;

		if (left + popup_rect.width > viewport_width) {
			left = viewport_width - popup_rect.width - 10;
		}

		if (top + popup_rect.height > viewport_height) {
			top = rect.top - popup_rect.height - 4;
		}

		// Ensure minimum left position
		left = Math.max(10, left);

		this.popup.style.top = top + 'px';
		this.popup.style.left = left + 'px';
	}

	/**
	 * Render the popup content
	 */
	render_popup() {
		if (!this.popup || !this.current_fielddef) return;

		const fielddef = this.current_fielddef;
		const is_read_only = !this.can_write;

		// Header
		const header_title = is_read_only ? fielddef.label : `Assign ${fielddef.label}`;
		const header = `<div class="inline-editor-header" style="margin-bottom: 12px; font-weight: 500; color: #333;">
			${__(header_title)}
		</div>`;

		// Control container
		const control_container = `<div class="inline-editor-control" style="margin-bottom: 16px;"></div>`;

		// Footer (only show save/cancel if writable)
		let footer = '';
		if (!is_read_only) {
			footer = `<div class="inline-editor-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
				<button class="btn btn-sm btn-default cancel-btn">${__("Cancel")}</button>
				<button class="btn btn-sm btn-primary save-btn">${__("Save")}</button>
			</div>`;
		}

		this.popup.innerHTML = header + control_container + footer;

		// Create and mount the field control
		const control_container_el = this.popup.querySelector('.inline-editor-control');
		this.render_field_control(control_container_el);
	}

	/**
	 * Render the appropriate Frappe field control
	 */
	render_field_control(container) {
		if (!container || !this.current_fielddef) return;

		const fielddef = { ...this.current_fielddef };
		fielddef.read_only = !this.can_write;

		// Create control using Frappe's form control factory
		this.control = frappe.ui.form.make_control({
			df: fielddef,
			parent: container,
			render_input: true,
		});

		this.control.set_value(this.current_value);

		if (!this.can_write) {
			this.control.df.read_only = true;
			this.control.set_read_only && this.control.set_read_only(true);
		}
	}

	/**
	 * Attach event handlers
	 */
	attach_events() {
		// Outside click to close
		this.overlay.addEventListener('click', (e) => {
			if (e.target === this.overlay) {
				this.close();
			}
		});

		// Escape key to close
		const escape_handler = (e) => {
			if (e.key === 'Escape') {
				this.close();
				document.removeEventListener('keydown', escape_handler);
			}
		};
		document.addEventListener('keydown', escape_handler);

		// Save and Cancel buttons
		if (this.can_write) {
			const save_btn = this.popup.querySelector('.save-btn');
			const cancel_btn = this.popup.querySelector('.cancel-btn');

			if (save_btn) {
				save_btn.addEventListener('click', () => this.save());
			}

			if (cancel_btn) {
				cancel_btn.addEventListener('click', () => this.close());
			}
		}
	}

	/**
	 * Save the edited value
	 */
	async save() {
		if (!this.control || !this.can_write || !this.on_save_callback) return;

		const new_value = this.control.get_value();

		try {
			await this.on_save_callback(new_value);
			this.close();
		} catch (error) {
			console.error('Error saving value:', error);
			frappe.show_alert({
				message: __('Error saving value'),
				indicator: 'red'
			});
		}
	}

	/**
	 * Close the popup
	 */
	close() {
		if (this.overlay) {
			this.overlay.style.display = 'none';
		}

		// Cleanup
		this.control = null;
		this.current_cell = null;
		this.current_fielddef = null;
		this.current_value = null;
		this.can_write = false;
		this.on_save_callback = null;
		this.doctype = null;
		this.docname = null;
	}

	/**
	 * Check if popup is currently open
	 */
	is_open() {
		return this.overlay && this.overlay.style.display !== 'none';
	}
};

// Global instance for reuse
frappe.ui.inline_editor_popover = new frappe.ui.InlineEditorPopover();
