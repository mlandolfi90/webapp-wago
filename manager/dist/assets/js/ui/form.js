import { h } from "./dom.js";

export function input(attrs = {}) {
  return h("input", { class: "input", ...attrs });
}

export function textarea(attrs = {}) {
  return h("textarea", { class: "input", ...attrs });
}

/**
 * Contextual help affordance: a focusable "?" with a pure-CSS tooltip
 * (no JS listeners). `text` describes qué es / cómo se usa / ejemplo.
 */
export function helpHint(text) {
  if (!text) return null;
  return h("span", { class: "help", tabindex: "0", role: "note", "aria-label": "Ayuda: " + text }, [
    "?",
    h("span", { class: "help-pop", role: "tooltip" }, [text])
  ]);
}

export function field(label, controlEl, help) {
  return h("div", { class: "field" }, [
    h("label", { class: "field-label" }, [label, helpHint(help)]),
    controlEl
  ]);
}

export function checkboxRow(labelText, checked, help) {
  const cb = h("input", { type: "checkbox" });
  cb.checked = !!checked;
  return {
    row: h("div", { class: "check-row" }, [
      h("label", { class: "check" }, [cb, h("span", {}, [labelText])]),
      helpHint(help)
    ]),
    checkbox: cb
  };
}

export function primaryButton(label, onClick) {
  return h("button", { class: "btn btn-primary", onclick: onClick }, [label]);
}

export function button(label, onClick, cls = "btn") {
  return h("button", { class: cls, onclick: onClick }, [label]);
}

/** Toggles a button into a disabled "busy" state and back. */
export function busy(btn, busyLabel) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = busyLabel;
  return () => { btn.disabled = false; btn.textContent = original; };
}
