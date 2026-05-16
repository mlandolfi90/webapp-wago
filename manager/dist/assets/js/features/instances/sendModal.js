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
      field("Número (con código de país, sin +)", number,
        "Destinatario en formato internacional sin el signo +. También acepta un JID. Ej: 5491122334455 (Argentina) o 5491122334455@s.whatsapp.net"),
      field("Mensaje", text,
        "Texto que se enviará por WhatsApp. Admite saltos de línea y emojis. Ej: Hola, te escribo desde Wago 👋")
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
