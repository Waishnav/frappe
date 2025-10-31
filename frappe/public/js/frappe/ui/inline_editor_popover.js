// Copyright (c) 2025, Frappe Technologies and Contributors
// Reusable inline editor popover utility for anchored, body-level popup editing

frappe.provide("frappe.ui");

export const InlineEditorPopover = (function () {
	let overlayEl = null;
	let panelEl = null;
	let control = null;
	let resolveClose = null;

	function ensureOverlay() {
		if (overlayEl) return overlayEl;

		overlayEl = document.createElement("div");
		overlayEl.className = "frappe-inline-editor-overlay";
		overlayEl.style.position = "fixed";
		overlayEl.style.inset = "0";
		overlayEl.style.background = "rgba(0,0,0,0.01)"; // almost transparent, just to catch clicks
		overlayEl.style.zIndex = 1001; // above desk but below any modal dialogs typically at 1002+
		overlayEl.style.display = "none";
		document.body.appendChild(overlayEl);

		// close on outside click
		overlayEl.addEventListener("mousedown", (e) => {
			if (panelEl && !panelEl.contains(e.target)) {
				close();
			}
		});

		// close on Escape
		document.addEventListener("keydown", (e) => {
			if (overlayEl && overlayEl.style.display !== "none" && e.key === "Escape") {
				close();
			}
		});

		return overlayEl;
	}

	function createPanel() {
		if (panelEl) return panelEl;
		panelEl = document.createElement("div");
		panelEl.className = "frappe-inline-editor-panel";
		panelEl.style.position = "absolute";
		panelEl.style.minWidth = "280px";
		panelEl.style.maxWidth = "520px";
		panelEl.style.background = "var(--fg-color)";
		panelEl.style.border = "1px solid var(--border-color)";
		panelEl.style.borderRadius = "8px";
		panelEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
		panelEl.style.padding = "12px";

		return panelEl;
	}

	function clearPanel() {
		if (!panelEl) return;
		panelEl.innerHTML = "";
		control = null;
	}

	function positionPanel(cellElement, preferredWidth) {
		const rect = cellElement.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let top = rect.bottom + 4; // 4px gap below the cell
		let left = rect.left;

		panelEl.style.width = preferredWidth ? preferredWidth + "px" : "";

		// Temporarily display to compute size for clamping
		panelEl.style.visibility = "hidden";
		panelEl.style.display = "block";
		const panelRect = panelEl.getBoundingClientRect();

		if (left + panelRect.width > viewportWidth - 8) {
			left = Math.max(8, viewportWidth - panelRect.width - 8);
		}
		if (top + panelRect.height > viewportHeight - 8) {
			top = Math.max(8, viewportHeight - panelRect.height - 8);
		}

		panelEl.style.left = left + "px";
		panelEl.style.top = top + "px";
		panelEl.style.visibility = "visible";
	}

	function close() {
		if (!overlayEl) return;
		overlayEl.style.display = "none";
		clearPanel();
		if (resolveClose) {
			resolveClose();
			resolveClose = null;
		}
	}

	async function open(options) {
		const {
			doctype,
			docname,
			fielddef,
			currentValue,
			cellElement,
			canWrite,
			onSave,
		} = options;

		ensureOverlay();
		createPanel();
		clearPanel();

		// header
		const headerEl = document.createElement("div");
		headerEl.style.display = "flex";
		headerEl.style.alignItems = "center";
		headerEl.style.justifyContent = "space-between";
		headerEl.style.marginBottom = "8px";
		headerEl.style.gap = "8px";
		const title = document.createElement("div");
		title.className = "text-bold";
		title.textContent = __("Assign {0}", [__(fielddef.label, null, fielddef.parent)]);
		headerEl.appendChild(title);

		const actionsEl = document.createElement("div");
		const cancelBtn = document.createElement("button");
		cancelBtn.className = "btn btn-default btn-xs";
		cancelBtn.textContent = __("Cancel");
		actionsEl.appendChild(cancelBtn);

		let saveBtn = null;
		if (canWrite) {
			saveBtn = document.createElement("button");
			saveBtn.className = "btn btn-primary btn-xs";
			saveBtn.textContent = __("Save");
			actionsEl.appendChild(saveBtn);
		}
		headerEl.appendChild(actionsEl);
		panelEl.appendChild(headerEl);

		// content container for control
		const contentEl = document.createElement("div");
		contentEl.style.maxHeight = "360px";
		contentEl.style.overflow = "auto";
		panelEl.appendChild(contentEl);

		// mount control using frappe.ui.form.make_control
		const df = Object.assign({}, fielddef);
		// do not render label/description inside popup
		const wrapper = document.createElement("div");
		contentEl.appendChild(wrapper);

		control = frappe.ui.form.make_control({
			df,
			parent: wrapper,
			render_input: true,
		});

		// Pre-fill value: Table MultiSelect needs fresh value from doc
		try {
			if (fielddef.fieldtype === "Table MultiSelect") {
				const doc = await frappe.db.get_doc(doctype, docname);
				if (doc && Object.prototype.hasOwnProperty.call(doc, fielddef.fieldname)) {
					control.set_value(doc[fielddef.fieldname]);
				}
			} else if (typeof currentValue !== "undefined") {
				control.set_value(currentValue);
			}
		} catch (e) {
			// non-blocking
		}

		// hide extra UI
		if (control && control.toggle_label) control.toggle_label(false);
		if (control && control.toggle_description) control.toggle_description(false);

		if (!canWrite) {
			try {
				if (control.df) control.df.read_only = 1;
				control.refresh && control.refresh();
				if (control.set_disabled) control.set_disabled(true);
				if (saveBtn) saveBtn.disabled = true;
			} catch (_e) {}
		}

		// attach actions
		cancelBtn.addEventListener("click", close);
		if (saveBtn) {
			saveBtn.addEventListener("click", async () => {
				const value = control.get_value ? control.get_value() : null;
				try {
					await onSave(value);
					close();
				} catch (e) {
					// leave open for user to fix
				}
			});
		}

		ensureOverlay();
		overlayEl.style.display = "block";
		overlayEl.appendChild(panelEl);
		positionPanel(cellElement);

		return new Promise((resolve) => (resolveClose = resolve));
	}

	return { open, close };
})();

// Expose globally under frappe.ui for convenience
frappe.ui.InlineEditorPopover = InlineEditorPopover;


