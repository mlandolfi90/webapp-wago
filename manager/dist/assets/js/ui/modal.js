import { h } from "./dom.js";

/**
 * Opens a modal. Returns { close, onClose } so callers can clean up
 * (e.g. stop polling) both on explicit close and overlay dismiss.
 */
export function modal(title, bodyEl, footChildren) {
  const closeHandlers = [];
  const overlay = h("div", {
    class: "overlay",
    onclick: (e) => { if (e.target === overlay) close(); }
  });

  function close() {
    closeHandlers.forEach((fn) => fn());
    overlay.remove();
  }

  const box = h("div", { class: "modal" }, [
    h("div", { class: "modal-head" }, [
      h("h3", {}, [title]),
      h("button", { class: "x-btn", title: "Cerrar", onclick: close }, ["×"])
    ]),
    h("div", { class: "modal-body" }, [bodyEl]),
    footChildren ? h("div", { class: "modal-foot" }, footChildren) : null
  ]);

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  return { close, onClose: (fn) => closeHandlers.push(fn) };
}
