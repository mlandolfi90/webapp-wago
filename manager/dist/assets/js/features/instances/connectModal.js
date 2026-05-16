import { h } from "../../ui/dom.js";
import { modal } from "../../ui/modal.js";
import { input, field, busy } from "../../ui/form.js";
import { toast, toastError } from "../../ui/feedback.js";
import { connectInstance } from "../../core/api.js";
import { EVENTS } from "../../constants.js";
import { openQrModal } from "./qrModal.js";

export function openConnectModal(inst) {
  const webhook = input({ placeholder: "https://tu-webhook.com/hook", value: inst.webhook || "" });

  const wsToggle = h("input", { type: "checkbox" });
  wsToggle.checked = String(inst.websocketEnable) === "true";

  const selected = (inst.events || "").split(",").filter(Boolean);
  const checks = {};
  const eventsGrid = h("div", { class: "events-grid" }, EVENTS.map((ev) => {
    const cb = h("input", { type: "checkbox" });
    cb.checked = selected.includes(ev);
    checks[ev] = cb;
    return h("label", { class: "check" }, [cb, h("span", {}, [ev])]);
  }));

  const saveBtn = h("button", { class: "btn btn-primary" }, ["Conectar"]);
  const m = modal(
    "Conectar — " + (inst.name || inst.id),
    h("div", {}, [
      field("URL del Webhook", webhook),
      h("label", { class: "check", style: "margin:4px 0 14px" }, [wsToggle, h("span", {}, ["Habilitar WebSocket"])]),
      h("label", { class: "muted-sm", style: "display:block;margin-bottom:8px" }, ["Eventos a suscribir"]),
      eventsGrid
    ]),
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cancelar"]), saveBtn]
  );

  saveBtn.addEventListener("click", () => {
    const body = {
      webhookUrl: webhook.value.trim(),
      subscribe: EVENTS.filter((ev) => checks[ev].checked),
      websocketEnable: wsToggle.checked ? "true" : "",
      immediate: false,
      phone: ""
    };
    const reset = busy(saveBtn, "Conectando...");
    connectInstance(inst.token, body)
      .then(() => { m.close(); toast("Conexión iniciada. Abrí el QR para vincular."); openQrModal(inst); })
      .catch((e) => { reset(); toastError(e); });
  });
}
