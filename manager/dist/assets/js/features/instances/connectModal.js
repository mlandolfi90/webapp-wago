import { h } from "../../ui/dom.js";
import { modal } from "../../ui/modal.js";
import { input, field, checkboxRow, helpHint, busy } from "../../ui/form.js";
import { toast, toastError } from "../../ui/feedback.js";
import { connectInstance } from "../../core/api.js";
import { EVENTS } from "../../constants.js";
import { openQrModal } from "./qrModal.js";

export function openConnectModal(inst) {
  const webhook = input({ placeholder: "https://tu-webhook.com/hook", value: inst.webhook || "" });

  const wsRow = checkboxRow("Habilitar WebSocket", String(inst.websocketEnable) === "true",
    "Además del webhook, expone los eventos por WebSocket en /ws?instanceId=<id>. Útil para recibir mensajes en tiempo real sin webhook. Ej: dejar tildado si tu app se conecta por WebSocket.");
  const wsToggle = wsRow.checkbox;

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
      field("URL del Webhook", webhook,
        "URL HTTPS a la que el servidor hará POST con cada evento (mensajes entrantes, estado, etc.). Dejá vacío si no usás webhook. Ej: https://miapp.com/whatsapp/hook"),
      wsRow.row,
      h("label", { class: "muted-sm", style: "display:flex;align-items:center;gap:7px;margin-bottom:8px" }, [
        "Eventos a suscribir",
        helpHint("Tipos de evento que querés recibir por webhook/WebSocket. Para un bot básico alcanza con MESSAGE y CONNECTION. Ej: tildar MESSAGE para recibir mensajes entrantes.")
      ]),
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
