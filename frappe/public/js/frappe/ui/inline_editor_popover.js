/**
 * Inline Editor Popover
 * Provides a reusable inline popup editor for Report View cell editing
 */

frappe.provide("frappe.ui.inline_editor");

frappe.ui.InlineEditorPopover = class InlineEditorPopover {
	constructor(opts) {
		this.opts = opts;
		this.overlay = null;
		this.popup = null;
		this.control = null;
		this.init();
	}

	init() {
		this.create_overlay();
		this.create_popup();
		this.setup_control();
		this.setup_event_handlers();
		this.position_popup();
	}

	create_overlay() {
		// Reuse existing overlay if present
		let $existing = $(".frappe-inline-editor-overlay");
		if ($existing.length) {
			$existing.remove();
		}

		this.overlay = $('<div class="frappe-inline-editor-overlay"></div>');
		this.overlay.css({
			position: "fixed",
			inset: 0,
			zIndex: 1050,
			backgroundColor: "rgba(0, 0, 0, 0.1)",
		});
		$("body").append(this.overlay);
	}

	create_popup() {
		this.popup = $('<div class="frappe-inline-editor-popup"></div>');
		this.popup.css({
			position: "fixed",
			zIndex: 1051,
			backgroundColor: "#fff",
			borderRadius: "6px",
			boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
			minWidth: "280px",
			maxWidth: "400px",
		});

		// Header
		const header = $(`
			<div class="frappe-inline-editor-header">
				<div class="frappe-inline-editor-title"></div>
				${this.opts.canWrite ? '<button class="btn btn-xs btn-primary frappe-inline-editor-save">' + __("Save") + '</button>' : ''}
				<button class="btn btn-xs btn-secondary frappe-inline-editor-close">${frappe.utils.icon('close', 'sm')}</button>
			</div>
		`);
		this.popup.append(header);

		// Content area
		const content = $('<div class="frappe-inline-editor-content"></div>');
		this.popup.append(content);

		// Footer (for Cancel if needed)
		if (this.opts.canWrite) {
			const footer = $('<div class="frappe-inline-editor-footer"><button class="btn btn-xs btn-secondary frappe-inline-editor-cancel">' + __("Cancel") + '</button></div>');
			this.popup.append(footer);
		}

		this.overlay.append(this.popup);

		// Set title
		const titleText = this.opts.fielddef.label;
		header.find(".frappe-inline-editor-title").text(titleText);
	}

	setup_control() {
		const contentArea = this.popup.find(".frappe-inline-editor-content");
		
		// Create a wrapper div for the control
		const controlWrapper = $('<div class="frappe-inline-editor-control-wrapper"></div>');
		contentArea.append(controlWrapper);

		// Create the Frappe field control
		this.control = frappe.ui.form.make_control({
			df: this.opts.fielddef,
			parent: controlWrapper[0],
			render_input: true,
		});

		if (!this.control) {
			console.error("Failed to create control for fieldtype:", this.opts.fielddef.fieldtype);
			this.destroy();
			return;
		}

		// Set initial value
		this.control.set_value(this.opts.currentValue);

		// Set read-only mode if needed
		if (!this.opts.canWrite) {
			this.control.set_disabled(true);
		}

		// Hide label and description
		this.control.toggle_label(false);
		this.control.toggle_description(false);

		// Style adjustments for popup
		$(this.control.wrapper).css({
			margin: "12px",
		});
	}

	setup_event_handlers() {
		const me = this;

		// Save button
		if (this.opts.canWrite) {
			this.popup.find(".frappe-inline-editor-save").on("click", () => {
				this.save();
			});

			// Cancel button
			this.popup.find(".frappe-inline-editor-cancel").on("click", () => {
				this.cancel();
			});
		}

		// Close button
		this.popup.find(".frappe-inline-editor-close").on("click", () => {
			this.cancel();
		});

		// Outside click
		this.overlay.on("click", (e) => {
			if ($(e.target).hasClass("frappe-inline-editor-overlay")) {
				this.cancel();
			}
		});

		// Escape key
		$(document).on("keydown.inline-editor", (e) => {
			if (e.keyCode === 27) { // Escape
				this.cancel();
			}
		});

		// Prevent popup clicks from closing
		this.popup.on("click", (e) => {
			e.stopPropagation();
		});
	}

	position_popup() {
		const rect = this.opts.cellElement.getBoundingClientRect();
		const popupWidth = this.popup.outerWidth();
		const popupHeight = this.popup.outerHeight();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// Position below and to the left of the cell
		let top = rect.bottom + 4;
		let left = rect.left;

		// Clamp to viewport
		if (left + popupWidth > viewportWidth) {
			left = viewportWidth - popupWidth - 10;
		}
		if (left < 0) {
			left = 10;
		}

		if (top + popupHeight > viewportHeight) {
			// Show above the cell instead
			top = rect.top - popupHeight - 4;
			if (top < 0) {
				top = 10;
			}
		}

		this.popup.css({
			top: top + "px",
			left: left + "px",
		});
	}

	save() {
		const newValue = this.control.get_value();
		
		if (this.opts.onSave) {
			this.opts.onSave(newValue).then(() => {
				this.destroy();
			}).catch((error) => {
				console.error("Save failed:", error);
				frappe.show_alert({
					message: __("Failed to save changes"),
					indicator: "red",
				});
			});
		} else {
			this.destroy();
		}
	}

	cancel() {
		this.destroy();
	}

	destroy() {
		// Remove event listeners
		$(document).off("keydown.inline-editor");

		// Remove from DOM
		if (this.overlay) {
			this.overlay.remove();
		}

		// Cleanup control
		if (this.control && this.control.destroy) {
			this.control.destroy();
		}
	}
};

// Static method to open popup
frappe.ui.inline_editor.open = function(opts) {
	return new frappe.ui.InlineEditorPopover(opts);
};

