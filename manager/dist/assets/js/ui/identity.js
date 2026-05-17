import { h } from "./dom.js";
import { toast } from "./feedback.js";

/** Copia texto al portapapeles con fallback para contextos no seguros (http). */
function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(value);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
    } catch (e) {
      reject(e);
    } finally {
      ta.remove();
    }
  });
}

/**
 * Chip con un valor técnico (LID/JID) y copia en 1 clic.
 * El valor se muestra completo pero truncado por CSS; el title lo expone.
 */
export function copyChip(value) {
  if (!value) return null;
  const chip = h("button", {
    type: "button", class: "copy-chip", title: "Copiar: " + value,
    "aria-label": "Copiar " + value
  }, [
    h("span", { class: "copy-chip-val" }, [value]),
    h("span", { class: "copy-chip-ico", "aria-hidden": "true" }, ["⧉"])
  ]);
  chip.addEventListener("click", () => {
    copyText(value)
      .then(() => toast("Copiado"))
      .catch(() => toast("No se pudo copiar (copialo a mano)", "err"));
  });
  return chip;
}

/**
 * Bloque de identidad: Nombre humano destacado (lo que un humano reconoce),
 * teléfono si se tiene, y el id técnico (LID/JID) siempre visible y copiable.
 *   identityBlock({ name, phone, id, idLabel })
 */
export function identityBlock({ name, phone, id, idLabel = "ID" }) {
  return h("div", { class: "identity" }, [
    h("div", { class: "identity-name" }, [name || "(sin nombre)"]),
    phone ? h("div", { class: "identity-phone" }, ["☎ " + phone]) : null,
    id ? h("div", { class: "identity-id" }, [
      h("span", { class: "identity-id-label" }, [idLabel]),
      copyChip(id)
    ]) : null
  ]);
}
