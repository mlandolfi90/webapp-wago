import { h, clear } from "../../../ui/dom.js";
import { modal } from "../../../ui/modal.js";
import { input, field, busy } from "../../../ui/form.js";
import { toast, toastError } from "../../../ui/feedback.js";
import { SENDERS } from "./senders.js";

export function openSendModal(inst) {
  const number = input({ placeholder: "5491122334455" });
  const formArea = h("div", {});
  let active = SENDERS[0];
  let current = active.build();

  const seg = h("div", { class: "seg" }, SENDERS.map((s) =>
    h("button", {
      type: "button",
      class: s.id === active.id ? "is-active" : "",
      onclick: () => selectType(s)
    }, [s.label])
  ));

  function renderForm() {
    clear(formArea);
    current.fields.forEach((f) => formArea.appendChild(f));
  }

  function selectType(s) {
    active = s;
    current = s.build();
    seg.querySelectorAll("button").forEach((b, i) => {
      b.className = SENDERS[i].id === s.id ? "is-active" : "";
    });
    renderForm();
  }

  const sendBtn = h("button", { class: "btn btn-primary" }, ["Enviar"]);
  const m = modal(
    "Enviar mensaje — " + (inst.name || inst.id),
    h("div", {}, [
      field("Número (con código de país, sin +)", number,
        "Destinatario en formato internacional sin el signo +. También acepta un JID. Ej: 5491122334455 o 5491122334455@s.whatsapp.net"),
      h("label", { class: "field-label", style: "margin-bottom:8px;display:block" }, ["Tipo de mensaje"]),
      seg,
      formArea
    ]),
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cancelar"]), sendBtn]
  );

  renderForm();

  sendBtn.addEventListener("click", () => {
    if (!number.value.trim()) { toast("El número es obligatorio", "err"); return; }
    const err = current.validate();
    if (err) { toast(err, "err"); return; }
    const body = { number: number.value.trim(), ...current.body() };
    const reset = busy(sendBtn, "Enviando...");
    active.api(inst.token, body)
      .then(() => { m.close(); toast(active.label + " enviado"); })
      .catch((e) => { reset(); toastError(e); });
  });
}
