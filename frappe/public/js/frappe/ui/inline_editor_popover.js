/**
 * frappe.ui.InlineEditorPopover
 * 
 * Reusable inline popup editor for Report View cell editing.
 * Creates a Notion/NocoDB-style anchored popup for editing field values.
 */

frappe.provide("frappe.ui");

frappe.ui.InlineEditorPopover = class InlineEditorPopover {
	constructor() {
		this.overlay = null;
		this.popup = null;
		this.control = null;
		this.current_config = null;
	}

	/**
	 * Open the inline popup editor
	 * @param {Object} config - Configuration object
	 * @param {string} config.docname - Document name
	 * @param {Object} config.fielddef - Field definition object with label, fieldtype, fieldname, etc.
	 * @param {*} config.currentValue - Current field value
	 * @param {HTMLElement} config.cellElement - The clicked cell element for positioning
	 * @param {boolean} config.canWrite - Whether user has write permission
	 * @param {Function} config.onSave - Callback when save is clicked: (newValue) => {}
	 */
	open(config) {
		this.current_config = config;
		this.create_overlay();
		this.create_popup();
		this.position_popup();
		this.mount_control();
		this.setup_events();
	}

	create_overlay() {
		// Reuse or create overlay
		if (!this.overlay) {
			this.overlay = document.createElement('div');
			this.overlay.className = 'frappe-inline-editor-overlay';
			this.overlay.style.cssText = `
				position: fixed;
				inset: 0;
				background: transparent;
				z-index: 1050;
				display: none;
			`;
			document.body.appendChild(this.overlay);
		}
		this.overlay.style.display = 'block';
	}

	create_popup() {
		// Clear previous popup content
		if (this.popup) {
			this.popup.remove();
		}

		const { fielddef, canWrite } = this.current_config;
		
		this.popup = document.createElement('div');
		this.popup.className = 'frappe-inline-editor-popup';
		this.popup.style.cssText = `
			position: fixed;
			background: white;
			border: 1px solid var(--border-color);
			border-radius: var(--border-radius);
			box-shadow: var(--shadow-xl);
			padding: 0;
			min-width: 300px;
			max-width: 500px;
			z-index: 1051;
		`;

		// Header
		const header = document.createElement('div');
		header.className = 'inline-editor-header';
		header.style.cssText = `
			padding: 12px 16px;
			border-bottom: 1px solid var(--border-color);
			font-weight: 500;
			font-size: 14px;
		`;
		header.textContent = __('Assign {0}', [__(fielddef.label, null, fielddef.parent)]);
		this.popup.appendChild(header);

		// Control container
		const controlContainer = document.createElement('div');
		controlContainer.className = 'inline-editor-control';
		controlContainer.style.cssText = `
			padding: 16px;
		`;
		this.popup.appendChild(controlContainer);
		this.control_container = controlContainer;

		// Footer with buttons
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
		cancelBtn.className = 'btn btn-default btn-sm';
		cancelBtn.textContent = __('Cancel');
		cancelBtn.onclick = () => this.close();

		footer.appendChild(cancelBtn);

		if (canWrite) {
			const saveBtn = document.createElement('button');
			saveBtn.className = 'btn btn-primary btn-sm';
			saveBtn.textContent = __('Save');
			saveBtn.onclick = () => this.save();
			footer.appendChild(saveBtn);
			this.save_btn = saveBtn;
		}

		this.popup.appendChild(footer);
		this.overlay.appendChild(this.popup);
	}

	position_popup() {
		const { cellElement } = this.current_config;
		const rect = cellElement.getBoundingClientRect();
		
		// Position below and to the left of the cell
		let top = rect.bottom + 4;
		let left = rect.left;

		// Clamp to viewport
		const popupRect = this.popup.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// Adjust horizontal position if overflowing right
		if (left + popupRect.width > viewportWidth - 20) {
			left = viewportWidth - popupRect.width - 20;
		}

		// Adjust vertical position if overflowing bottom
		if (top + popupRect.height > viewportHeight - 20) {
			// Try positioning above the cell
			top = rect.top - popupRect.height - 4;
			// If still overflowing, clamp to viewport
			if (top < 20) {
				top = 20;
			}
		}

		this.popup.style.top = `${top}px`;
		this.popup.style.left = `${left}px`;
	}

	mount_control() {
		const { fielddef, currentValue, canWrite } = this.current_config;
		
		// Create a shallow copy of fielddef to avoid mutating the original
		const df = Object.assign({}, fielddef);
		
		// Set read_only if user can't write
		if (!canWrite) {
			df.read_only = 1;
		}

		// Create the appropriate Frappe control
		this.control = frappe.ui.form.make_control({
			df: df,
			parent: $(this.control_container),
			render_input: true,
		});

		// Set the current value
		this.control.set_value(currentValue);
		
		// Toggle off label and description for cleaner look
		this.control.toggle_label(false);
		this.control.toggle_description(false);

		// Focus the control
		setTimeout(() => {
			if (this.control.$input) {
				this.control.$input.focus();
			}
		}, 100);
	}

	setup_events() {
		// Close on outside click
		this.overlay.addEventListener('click', (e) => {
			if (e.target === this.overlay) {
				this.close();
			}
		});

		// Close on Escape key
		const escapeHandler = (e) => {
			if (e.key === 'Escape') {
				this.close();
				document.removeEventListener('keydown', escapeHandler);
			}
		};
		document.addEventListener('keydown', escapeHandler);
		this._escapeHandler = escapeHandler;
	}

	save() {
		const { onSave } = this.current_config;
		const newValue = this.control.get_value();
		
		if (onSave) {
			onSave(newValue);
		}
		
		this.close();
	}

	close() {
		if (this.overlay) {
			this.overlay.style.display = 'none';
		}
		
		if (this.popup) {
			this.popup.remove();
			this.popup = null;
		}
		
		if (this.control) {
			this.control = null;
		}

		if (this._escapeHandler) {
			document.removeEventListener('keydown', this._escapeHandler);
			this._escapeHandler = null;
		}

		this.current_config = null;
		this.control_container = null;
		this.save_btn = null;
	}
};
