import { h } from "../../ui/dom.js";
import { modal } from "../../ui/modal.js";
import { input, field, checkboxRow, busy } from "../../ui/form.js";
import { toast, toastError } from "../../ui/feedback.js";
import { createInstance } from "../../core/api.js";

export function openCreateModal(reload) {
  const name = input({ placeholder: "Mi instancia" });
  const token = input({ placeholder: "token único de la instancia" });

  const proxyToggle = checkboxRow("Usar proxy", false,
    "Activá esto si la instancia debe salir a internet a través de un proxy. Al tildarlo se muestran los datos del proxy. Ej: dejarlo sin tildar si no usás proxy.");
  const useProxy = proxyToggle.checkbox;
  const pHost = input({ placeholder: "host" });
  const pPort = input({ placeholder: "puerto" });
  const pUser = input({ placeholder: "usuario" });
  const pPass = input({ type: "password", placeholder: "contraseña" });
  const proxyBox = h("div", { style: "display:none" }, [
    field("Host del proxy", pHost,
      "Dirección (IP o dominio) del servidor proxy. Ej: 10.0.0.5 o proxy.miempresa.com"),
    field("Puerto del proxy", pPort,
      "Puerto donde escucha el proxy. Ej: 8080 o 1080 (SOCKS)"),
    field("Usuario del proxy", pUser,
      "Usuario para autenticarse en el proxy (si lo requiere). Ej: usuario1 — dejar vacío si el proxy no pide login."),
    field("Contraseña del proxy", pPass,
      "Contraseña del usuario del proxy (si lo requiere). Dejar vacío si el proxy no pide login.")
  ]);
  useProxy.addEventListener("change", () => {
    proxyBox.style.display = useProxy.checked ? "block" : "none";
  });

  const saveBtn = h("button", { class: "btn btn-primary" }, ["Crear"]);
  const m = modal(
    "Nueva instancia",
    h("div", {}, [
      field("Nombre de la instancia", name,
        "Nombre descriptivo para identificar la instancia en el panel. Ej: Ventas Bot o Soporte Clientes."),
      field("Token", token,
        "Clave única de esta instancia: se usa como apikey para operarla (enviar mensajes, etc.). Elegí algo secreto e irrepetible. Ej: tok_ventas_9f3a21c7."),
      proxyToggle.row,
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
