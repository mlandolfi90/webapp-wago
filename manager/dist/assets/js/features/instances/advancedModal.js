import { h, clear } from "../../ui/dom.js";
import { modal } from "../../ui/modal.js";
import { input, field, checkboxRow, busy } from "../../ui/form.js";
import { toast, toastError } from "../../ui/feedback.js";
import { getAdvancedSettings, updateAdvancedSettings } from "../../core/api.js";

export function openAdvancedModal(inst) {
  const body = h("div", {}, [h("div", { class: "center-load" }, [h("span", { class: "spinner" })])]);
  const saveBtn = h("button", { class: "btn btn-primary", disabled: "true" }, ["Guardar"]);

  const m = modal(
    "Configuración avanzada — " + (inst.name || inst.id),
    body,
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cancelar"]), saveBtn]
  );

  getAdvancedSettings(inst.id, inst.token)
    .then((res) => {
      const s = res.data || {};
      const alwaysOnline = checkboxRow("Siempre en línea", s.alwaysOnline);
      const rejectCall = checkboxRow("Rechazar llamadas", s.rejectCall);
      const readMessages = checkboxRow("Marcar mensajes como leídos", s.readMessages);
      const ignoreGroups = checkboxRow("Ignorar grupos", s.ignoreGroups);
      const ignoreStatus = checkboxRow("Ignorar estados", s.ignoreStatus);
      const msg = input({ value: s.msgRejectCall || "", placeholder: "Mensaje al rechazar llamada" });

      clear(body);
      [alwaysOnline, rejectCall, readMessages, ignoreGroups, ignoreStatus]
        .forEach((c) => body.appendChild(c.row));
      body.appendChild(field("Mensaje al rechazar llamada", msg));

      saveBtn.disabled = false;
      saveBtn.addEventListener("click", () => {
        const payload = {
          alwaysOnline: alwaysOnline.checkbox.checked,
          rejectCall: rejectCall.checkbox.checked,
          readMessages: readMessages.checkbox.checked,
          ignoreGroups: ignoreGroups.checkbox.checked,
          ignoreStatus: ignoreStatus.checkbox.checked,
          msgRejectCall: msg.value
        };
        const reset = busy(saveBtn, "Guardando...");
        updateAdvancedSettings(inst.id, inst.token, payload)
          .then(() => { m.close(); toast("Configuración guardada"); })
          .catch((e) => { reset(); toastError(e); });
      });
    })
    .catch((e) => {
      clear(body);
      body.appendChild(h("div", { class: "empty" }, ["Error: " + e.message]));
    });
}
