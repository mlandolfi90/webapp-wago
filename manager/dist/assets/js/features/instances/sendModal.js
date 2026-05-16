import { h } from "../../ui/dom.js";
import { modal } from "../../ui/modal.js";
import { input, textarea, field, busy } from "../../ui/form.js";
import { toast, toastError } from "../../ui/feedback.js";
import { sendText } from "../../core/api.js";

export function openSendModal(inst) {
  const number = input({ placeholder: "5491122334455" });
  const text = textarea({ rows: "3", placeholder: "Mensaje de prueba" });

  const sendBtn = h("button", { class: "btn btn-primary" }, ["Enviar"]);
  const m = modal(
    "Probar envío — " + (inst.name || inst.id),
    h("div", {}, [
      field("Número (con código de país, sin +)", number),
      field("Mensaje", text)
    ]),
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cancelar"]), sendBtn]
  );

  sendBtn.addEventListener("click", () => {
    if (!number.value.trim()) { toast("El número es obligatorio", "err"); return; }
    if (!text.value.trim()) { toast("El mensaje es obligatorio", "err"); return; }
    const reset = busy(sendBtn, "Enviando...");
    sendText(inst.token, { number: number.value.trim(), text: text.value })
      .then(() => { m.close(); toast("Mensaje enviado"); })
      .catch((e) => { reset(); toastError(e); });
  });
}
