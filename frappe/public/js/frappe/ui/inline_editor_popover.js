frappe.provide("frappe.ui");

(function () {
    // Reusable inline editor overlay / popover
    frappe.ui._inline_editor_overlay = null;

    function _ensure_overlay() {
        if (frappe.ui._inline_editor_overlay) return frappe.ui._inline_editor_overlay;

        const $overlay = $(
            '<div class="frappe-inline-editor-overlay" style="position:fixed;inset:0;z-index:1050;display:none"></div>'
        ).appendTo(document.body);

        // click outside to close
        $overlay.on('click', (e) => {
            if (e.target === $overlay.get(0)) {
                frappe.ui._inline_editor_overlay.hide();
                frappe.ui._inline_editor_overlay.find('.inline-editor-panel').remove();
                $(document).off('keydown.inline_editor');
            }
        });

        frappe.ui._inline_editor_overlay = $overlay;
        return $overlay;
    }

    // opts: { docname, fielddef, currentValue, cellElement, canWrite, onSave(newValue) -> Promise }
    frappe.ui.open_inline_editor = function (opts) {
        const overlay = _ensure_overlay();
        overlay.show();
        overlay.find('.inline-editor-panel').remove();

        const panel = $(
            '<div class="inline-editor-panel card shadow" style="position:absolute;min-width:260px;max-width:420px;padding:0;border-radius:8px"></div>'
        ).appendTo(overlay);

        const header = $(`<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px"></div>`).appendTo(panel);
        const title = $(`<div class="inline-editor-title" style="font-weight:600"></div>`).appendTo(header);
        title.text((opts.fielddef && opts.fielddef.label) ? __('Assign {0}', [opts.fielddef.label]) : (opts.fielddef.label || opts.fielddef.fieldname));

        const closeBtn = $(`<button class="btn btn-link btn-xs" style="margin-left:8px">${__('Cancel')}</button>`).appendTo(header);
        closeBtn.on('click', () => {
            overlay.hide();
            panel.remove();
            $(document).off('keydown.inline_editor');
        });

        const body = $(`<div class="card-body" style="padding:8px 12px"></div>`).appendTo(panel);

        // content area where we will mount the frappe control
        const $content = $(`<div class="inline-editor-content"></div>`).appendTo(body);

        // footer
        const footer = $(`<div class="card-footer" style="display:flex;justify-content:flex-end;padding:8px 12px;gap:8px"></div>`).appendTo(panel);
        const saveBtn = $(`<button class="btn btn-primary btn-xs">${__('Save')}</button>`).appendTo(footer);
        const cancelBtn = $(`<button class="btn btn-default btn-xs">${__('Cancel')}</button>`).appendTo(footer);
        cancelBtn.on('click', () => {
            overlay.hide();
            panel.remove();
            $(document).off('keydown.inline_editor');
        });

        if (!opts.canWrite) {
            saveBtn.hide();
        }

        // instantiate a Frappe control for this field
        const control = frappe.ui.form.make_control({
            df: opts.fielddef,
            parent: $content[0],
            render_input: true,
        });

        // set value
        try {
            control.set_value(opts.currentValue);
        } catch (e) {
            // ignore
        }
        control.toggle_label(false);
        control.toggle_description(false);

        // Disable inputs when read-only
        if (!opts.canWrite) {
            // disable native inputs inside control
            $content.find('input,textarea,select,button').prop('disabled', true);
        }

        // Save handler
        saveBtn.on('click', () => {
            const newValue = control.get_value();
            // call provided onSave
            const p = opts.onSave && opts.onSave(newValue);
            if (p && p.then) {
                saveBtn.prop('disabled', true);
                p
                    .then(() => {
                        overlay.hide();
                        panel.remove();
                        $(document).off('keydown.inline_editor');
                    })
                    .catch((err) => {
                        frappe.msgprint(err && err.message ? err.message : err || __('Unable to save'));
                    })
                    .finally(() => saveBtn.prop('disabled', false));
            } else {
                // close immediately if no promise
                overlay.hide();
                panel.remove();
                $(document).off('keydown.inline_editor');
            }
        });

        // position the panel relative to the clicked cell
        const rect = opts.cellElement.getBoundingClientRect();
        // place below left by default
        panel.css({ top: `${rect.bottom + 4 + window.scrollY}px`, left: `${rect.left + window.scrollX}px` });

        // clamp into viewport after render
        setTimeout(() => {
            const panelRect = panel[0].getBoundingClientRect();
            let top = panelRect.top;
            let left = panelRect.left;
            if (panelRect.right > window.innerWidth) {
                left = Math.max(8, window.innerWidth - panelRect.width - 8);
            }
            if (panelRect.bottom > window.innerHeight) {
                top = Math.max(8, rect.top - panelRect.height - 8 + window.scrollY);
            }
            panel.css({ top: `${top + window.scrollY}px`, left: `${left + window.scrollX}px` });
        }, 0);

        // Escape key closes
        $(document).on('keydown.inline_editor', (e) => {
            if (e.key === 'Escape') {
                overlay.hide();
                panel.remove();
                $(document).off('keydown.inline_editor');
            }
        });

        return {
            close: () => {
                overlay.hide();
                panel.remove();
                $(document).off('keydown.inline_editor');
            },
        };
    };
})();


