import { h } from "./dom.js";

export function toast(message, kind = "ok") {
  const el = h("div", { class: `toast ${kind === "err" ? "toast-err" : "toast-ok"}` }, [message]);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function toastError(e) {
  toast("Error: " + (e && e.message ? e.message : e), "err");
}
