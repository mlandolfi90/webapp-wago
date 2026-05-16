import { h } from "../../ui/dom.js";
import { modal } from "../../ui/modal.js";
import { input, field, busy } from "../../ui/form.js";
import { toast, toastError } from "../../ui/feedback.js";
import { createInstance } from "../../core/api.js";

export function openCreateModal(reload) {
  const name = input({ placeholder: "Mi instancia" });
  const token = input({ placeholder: "token único de la instancia" });

  const useProxy = h("input", { type: "checkbox" });
  const pHost = input({ placeholder: "host" });
  const pPort = input({ placeholder: "puerto" });
  const pUser = input({ placeholder: "usuario" });
  const pPass = input({ type: "password", placeholder: "contraseña" });
  const proxyBox = h("div", { style: "display:none" }, [
    field("Host del proxy", pHost),
    field("Puerto del proxy", pPort),
    field("Usuario del proxy", pUser),
    field("Contraseña del proxy", pPass)
  ]);
  useProxy.addEventListener("change", () => {
    proxyBox.style.display = useProxy.checked ? "block" : "none";
  });

  const saveBtn = h("button", { class: "btn btn-primary" }, ["Crear"]);
  const m = modal(
    "Nueva instancia",
    h("div", {}, [
      field("Nombre de la instancia", name),
      field("Token", token),
      h("label", { class: "check", style: "margin-bottom:10px" }, [useProxy, h("span", {}, ["Usar proxy"])]),
      proxyBox
    ]),
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cancelar"]), saveBtn]
  );

  saveBtn.addEventListener("click", () => {
    if (!name.value.trim()) { toast("El nombre es obligatorio", "err"); return; }
    if (!token.value.trim()) { toast("El token es obligatorio", "err"); return; }
    const body = { name: name.value.trim(), token: token.value.trim() };
    if (useProxy.checked) {
      body.proxy = {
        host: pHost.value.trim(), port: pPort.value.trim(),
        username: pUser.value.trim(), password: pPass.value
      };
    }
    const reset = busy(saveBtn, "Creando...");
    createInstance(body)
      .then(() => { m.close(); toast("Instancia creada"); reload(); })
      .catch((e) => { reset(); toastError(e); });
  });
}
