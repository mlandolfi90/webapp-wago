import { h } from "./dom.js";

export function input(attrs = {}) {
  return h("input", { class: "input", ...attrs });
}

export function textarea(attrs = {}) {
  return h("textarea", { class: "input", ...attrs });
}

export function field(label, controlEl) {
  return h("div", { class: "field" }, [h("label", {}, [label]), controlEl]);
}

export function checkboxRow(labelText, checked) {
  const cb = h("input", { type: "checkbox" });
  cb.checked = !!checked;
  const row = h("label", { class: "check", style: "margin-bottom:10px" }, [
    cb, h("span", {}, [labelText])
  ]);
  return { row, checkbox: cb };
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
