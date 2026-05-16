import { h } from "../../ui/dom.js";
import { modal } from "../../ui/modal.js";
import { input, field, busy } from "../../ui/form.js";
import { toast, toastError } from "../../ui/feedback.js";
import { setProxy, removeProxy } from "../../core/api.js";

export function openProxyModal(inst) {
  const host = input({ placeholder: "host" });
  const port = input({ placeholder: "puerto" });
  const user = input({ placeholder: "usuario" });
  const pass = input({ type: "password", placeholder: "contraseña" });

  const applyBtn = h("button", { class: "btn btn-primary" }, ["Aplicar proxy"]);
  const removeBtn = h("button", { class: "btn btn-danger" }, ["Quitar proxy"]);

  const m = modal(
    "Proxy — " + (inst.name || inst.id),
    h("div", {}, [
      field("Host", host,
        "Dirección (IP o dominio) del servidor proxy por el que saldrá esta instancia. Ej: 10.0.0.5 o proxy.miempresa.com"),
      field("Puerto", port,
        "Puerto donde escucha el proxy. Ej: 8080 o 1080 (SOCKS)"),
      field("Usuario", user,
        "Usuario para autenticarse en el proxy (si lo requiere). Dejar vacío si el proxy no pide login."),
      field("Contraseña", pass,
        "Contraseña del usuario del proxy (si lo requiere). Dejar vacío si el proxy no pide login.")
    ]),
    [removeBtn, h("button", { class: "btn", onclick: () => m.close() }, ["Cancelar"]), applyBtn]
  );

  applyBtn.addEventListener("click", () => {
    const body = {
      host: host.value.trim(), port: port.value.trim(),
      username: user.value.trim(), password: pass.value
    };
    const reset = busy(applyBtn, "Aplicando...");
    setProxy(inst.id, body)
      .then(() => { m.close(); toast("Proxy aplicado"); })
      .catch((e) => { reset(); toastError(e); });
  });

  removeBtn.addEventListener("click", () => {
    const reset = busy(removeBtn, "Quitando...");
    removeProxy(inst.id)
      .then(() => { m.close(); toast("Proxy quitado"); })
      .catch((e) => { reset(); toastError(e); });
  });
}
