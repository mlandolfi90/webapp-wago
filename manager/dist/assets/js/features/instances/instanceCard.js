// Card de instancia replicando el bundle WebAPP-Wago pre-rebuild (ADR
// 0052): header con nombre + badge, subtítulo con perfil, tabla
// Status/Proprietário, fila de 4 acciones con iconos lucide
// (Desconectar / Mensaje / Test / Configuraciones) — el resto de las
// operaciones (Grupos, Contactos, Mensajes, Comunidades, Etiquetas,
// Newsletters, Utilidades) viven dentro de la página de Configuraciones.
import { h } from "../../ui/dom.js";
import { toast, toastError } from "../../ui/feedback.js";
import { disconnectInstance, deleteInstance } from "../../core/api.js";
import { goInstanceConfig } from "../../core/router.js";
import { openSendModal } from "./send/sendModal.js";
import { openConnectModal } from "./connectModal.js";
import {
  icoPowerOff, icoMessageSquare, icoFlask, icoSettings, icoTrash,
} from "../../ui/icons.js";

function statusBadge(inst) {
  return inst.connected
    ? h("span", { class: "badge badge-on" }, ["Conectado"])
    : h("span", { class: "badge badge-off" }, ["Desconectado"]);
}

function infoRow(label, value) {
  return h("div", { class: "info-row" }, [
    h("span", { class: "info-label" }, [label]),
    h("span", { class: "info-value" }, [value || "-"]),
  ]);
}

function maskJid(jid) {
  if (!jid) return "-";
  return jid.split("@")[0];
}

function actionBtn(ico, title, onclick, variant) {
  const cls = "btn-card-action" + (variant ? " " + variant : "");
  return h(
    "button",
    { class: cls, title, "aria-label": title, onclick },
    [h("span", { class: "btn-card-action-ico", html: ico() })]
  );
}

function actionBtnWithText(ico, label, onclick, variant) {
  const cls = "btn-card-action btn-card-action-text" + (variant ? " " + variant : "");
  return h(
    "button",
    { class: cls, onclick },
    [h("span", { class: "btn-card-action-ico", html: ico() }), h("span", {}, [label])]
  );
}

function doDisconnect(inst, reload) {
  if (!confirm(`¿Desconectar la instancia "${inst.name || inst.id}"?`)) return;
  disconnectInstance(inst.token)
    .then(() => { toast("Instancia desconectada"); reload(); })
    .catch(toastError);
}

function doDelete(inst, reload) {
  if (!confirm(`¿Borrar definitivamente "${inst.name || inst.id}"? Esta acción no se puede deshacer.`)) return;
  deleteInstance(inst.id)
    .then(() => { toast("Instancia borrada"); reload(); })
    .catch(toastError);
}

export function instanceCard(inst, reload) {
  const isConnected = !!inst.connected;
  const profile = inst.profileName || inst.name || "";
  const status = isConnected ? "open" : "closed";

  return h("div", { class: "card-instance" }, [
    h("div", { class: "card-instance-head" }, [
      h("div", { class: "identity" }, [
        h("div", { class: "identity-name" }, [inst.name || "(sin nombre)"]),
        profile && profile !== inst.name
          ? h("div", { class: "identity-sub" }, [profile])
          : null,
      ]),
      statusBadge(inst),
    ]),
    h("div", { class: "card-instance-info" }, [
      infoRow("Status", status),
      infoRow("Propietario", maskJid(inst.jid)),
    ]),
    h("div", { class: "card-instance-actions" }, [
      isConnected
        ? actionBtnWithText(icoPowerOff, "Desconectar", () => doDisconnect(inst, reload), "warn")
        : actionBtnWithText(icoPowerOff, "Conectar", () => openConnectModal(inst), "primary"),
      actionBtn(icoMessageSquare, "Enviar mensaje de prueba",
        () => openSendModal(inst), "accent-blue"),
      actionBtn(icoFlask, "Probar botones, listas y carrusel",
        () => openSendModal(inst), "accent-violet"),
      actionBtn(icoSettings, "Configuraciones",
        () => goInstanceConfig(inst), "muted"),
      actionBtn(icoTrash, "Borrar instancia",
        () => doDelete(inst, reload), "accent-danger"),
    ]),
  ]);
}
