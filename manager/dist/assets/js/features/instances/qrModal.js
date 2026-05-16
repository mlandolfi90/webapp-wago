import { h } from "../../ui/dom.js";
import { modal } from "../../ui/modal.js";
import { getQr } from "../../core/api.js";

const POLL_MS = 8000;

export function openQrModal(inst) {
  const img = h("img", { alt: "QR" });
  const statusEl = h("div", { class: "muted-sm", style: "margin-top:8px" }, ["Cargando..."]);
  const codeEl = h("div", { class: "qr-code" }, []);
  const refreshBtn = h("button", { class: "btn btn-primary" }, ["Actualizar QR"]);

  const m = modal(
    "Código QR — " + (inst.name || inst.id),
    h("div", { class: "qr-box" }, [img, statusEl, codeEl]),
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cerrar"]), refreshBtn]
  );

  function load() {
    getQr(inst.token)
      .then((res) => {
        const d = res.data || {};
        if (d.Qrcode) { img.src = d.Qrcode; img.style.display = "block"; }
        codeEl.textContent = d.Code || "";
        statusEl.textContent = "Escaneá este código con WhatsApp (Dispositivos vinculados).";
      })
      .catch((e) => {
        img.style.display = "none";
        statusEl.textContent = e.message;
      });
  }

  const timer = setInterval(load, POLL_MS);
  m.onClose(() => clearInterval(timer));
  refreshBtn.addEventListener("click", load);
  load();
}
