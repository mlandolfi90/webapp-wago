// Página "Configuraciones" de instancia (ADR 0052), réplica de la
// vista detalle inline del bundle WebAPP-Wago pre-rebuild. Secciones:
// Informações da Instância (readonly) · Webhooks (legacy summary +
// botón al modal multi-webhook) · Configuraciones Avanzadas (toggles
// inline) · Zona de Peligro.
import { h, clear } from "../../ui/dom.js";
import { renderShell } from "../../core/shell.js";
import { goDashboard, goInstances } from "../../core/router.js";
import { toast, toastError } from "../../ui/feedback.js";
import { busy } from "../../ui/form.js";
import {
  getAdvancedSettings, updateAdvancedSettings,
  disconnectInstance, deleteInstance,
} from "../../core/api.js";
import {
  icoArrowLeft, icoEye, icoEyeOff, icoSave, icoPowerOff, icoTrash,
  icoAlertTriangle, icoSettings,
} from "../../ui/icons.js";
import { openWebhooksModal } from "./webhooksModal.js";

function onNav(key) {
  if (key === "dashboard") goDashboard();
  else if (key === "instances") goInstances();
}

function infoField(label, value, opts = {}) {
  const valueEl = h("div", { class: "info-grid-value" + (opts.muted ? " is-muted" : "") }, [value || "-"]);
  const wrap = h("div", { class: "info-grid-row" }, [
    h("div", { class: "info-grid-label" }, [label]),
    valueEl,
  ]);
  if (opts.toggleVisible) {
    let shown = false;
    const masked = String(value || "").replace(/./g, "•");
    valueEl.textContent = masked;
    const btn = h("button", { class: "btn-icon-ghost", title: "Mostrar/ocultar", html: icoEye() });
    btn.addEventListener("click", () => {
      shown = !shown;
      valueEl.textContent = shown ? String(value || "") : masked;
      btn.innerHTML = shown ? icoEyeOff() : icoEye();
    });
    wrap.appendChild(btn);
  }
  return wrap;
}

function section(title, children, opts = {}) {
  const cls = "config-section" + (opts.danger ? " is-danger" : "");
  return h("section", { class: cls }, [
    h("div", { class: "config-section-head" }, [
      h("h3", {}, [title]),
    ]),
    h("div", { class: "config-section-body" }, children),
  ]);
}

function checkboxField(label, help, checked) {
  const cb = h("input", { type: "checkbox" });
  if (checked) cb.checked = true;
  const row = h("div", { class: "toggle-row" }, [
    h("div", { class: "toggle-text" }, [
      h("div", { class: "toggle-label" }, [label]),
      h("div", { class: "toggle-help" }, [help]),
    ]),
    h("label", { class: "switch" }, [cb, h("span", { class: "slider" })]),
  ]);
  return { row, checkbox: cb };
}

function dangerRow(title, desc, btnLabel, ico, onclick) {
  const btn = h("button", { class: "btn btn-danger", onclick }, [
    h("span", { class: "btn-ico", html: ico() }),
    h("span", {}, [btnLabel]),
  ]);
  return h("div", { class: "danger-row" }, [
    h("div", {}, [
      h("div", { class: "danger-title" }, [title]),
      h("div", { class: "danger-desc" }, [desc]),
    ]),
    btn,
  ]);
}

export function renderInstanceConfig(root, inst) {
  const main = renderShell(root, "instances", onNav);

  const backBtn = h(
    "button",
    { class: "btn-icon-ghost back-btn", title: "Volver",
      onclick: () => goInstances() },
    [h("span", { html: icoArrowLeft() })]
  );
  const head = h("div", { class: "page-head with-back" }, [
    backBtn,
    h("div", {}, [
      h("h2", {}, ["Configuraciones"]),
      h("p", { class: "page-sub" }, [inst.name || inst.id]),
    ]),
  ]);

  const infoSection = section("Información de la Instancia", [
    h("div", { class: "info-grid" }, [
      infoField("Nombre de la Instancia", inst.name),
      infoField("Token de la Instancia", inst.token, { toggleVisible: true }),
      infoField("Estado", inst.connected ? "Conectado" : "Desconectado"),
      infoField("Número", inst.jid ? inst.jid.split("@")[0] : "-"),
      infoField("Nombre del Perfil", inst.profileName || inst.name || "-"),
    ]),
  ]);

  const webhookSection = section("Configuración de Webhook", [
    h("p", { class: "section-intro" }, [
      "Gestioná los webhooks de esta instancia: la URL única clásica del backend y los webhooks adicionales con filtros (eventos, tipo de chat, allowlist por chat o sender).",
    ]),
    inst.webhook
      ? h("div", { class: "webhook-summary" }, [
          h("div", { class: "info-grid-label" }, ["Webhook legacy actual"]),
          h("code", { class: "webhook-url" }, [inst.webhook]),
        ])
      : h("p", { class: "muted-sm" }, ["No hay webhook legacy configurado."]),
    h(
      "button",
      { class: "btn btn-primary",
        onclick: () => openWebhooksModal(inst) },
      [h("span", { class: "btn-ico", html: icoSettings() }), h("span", {}, ["Gestionar webhooks"])]
    ),
  ]);

  const advancedBody = h("div", {}, [
    h("div", { class: "center-load" }, [h("span", { class: "spinner" })]),
  ]);
  const saveBtn = h(
    "button",
    { class: "btn btn-primary", disabled: "true" },
    [h("span", { class: "btn-ico", html: icoSave() }), h("span", {}, ["Guardar Avanzadas"])]
  );
  const advancedSection = section("Configuración Avanzada", [advancedBody, saveBtn]);

  getAdvancedSettings(inst.id, inst.token)
    .then((res) => {
      const s = res.data || {};
      const alwaysOnline = checkboxField("Siempre en línea",
        "Mantiene el número en línea de forma permanente.", s.alwaysOnline);
      const rejectCall = checkboxField("Rechazar llamadas",
        "Rechaza automáticamente las llamadas entrantes.", s.rejectCall);
      const readMessages = checkboxField("Marcar mensajes como leídos",
        "Doble tilde azul automático para los mensajes entrantes.", s.readMessages);
      const ignoreGroups = checkboxField("Ignorar grupos",
        "No procesa mensajes de grupos vía webhook.", s.ignoreGroups);
      const ignoreStatus = checkboxField("Ignorar estados",
        "No procesa actualizaciones de Estados/Historias.", s.ignoreStatus);
      const ignoreFromMe = checkboxField("Ignorar mis propios mensajes",
        "Rompe loops cuando un consumer responde con /send/text (ADR 0049).",
        s.ignoreFromMe !== false);

      clear(advancedBody);
      [alwaysOnline, rejectCall, readMessages, ignoreGroups, ignoreStatus, ignoreFromMe]
        .forEach((c) => advancedBody.appendChild(c.row));

      saveBtn.disabled = false;
      saveBtn.addEventListener("click", () => {
        const payload = {
          alwaysOnline: alwaysOnline.checkbox.checked,
          rejectCall: rejectCall.checkbox.checked,
          readMessages: readMessages.checkbox.checked,
          ignoreGroups: ignoreGroups.checkbox.checked,
          ignoreStatus: ignoreStatus.checkbox.checked,
          ignoreFromMe: ignoreFromMe.checkbox.checked,
        };
        const reset = busy(saveBtn, "Guardando…");
        updateAdvancedSettings(inst.id, inst.token, payload)
          .then(() => { reset(); toast("Configuración guardada"); })
          .catch((e) => { reset(); toastError(e); });
      });
    })
    .catch((e) => {
      clear(advancedBody);
      advancedBody.appendChild(h("div", { class: "empty" }, ["Error: " + e.message]));
    });

  const dangerSection = section("Zona de Peligro", [
    dangerRow(
      "Desconectar Instancia",
      "Cierra la sesión de WhatsApp sin borrar la instancia.",
      "Desconectar", icoPowerOff,
      () => {
        if (!confirm(`¿Desconectar la instancia "${inst.name || inst.id}"?`)) return;
        disconnectInstance(inst.token)
          .then(() => { toast("Instancia desconectada"); goInstances(); })
          .catch(toastError);
      }
    ),
    dangerRow(
      "Borrar Instancia",
      "Elimina permanentemente esta instancia. La acción no se puede deshacer.",
      "Borrar", icoTrash,
      () => {
        if (!confirm(`¿Borrar definitivamente "${inst.name || inst.id}"? Esta acción no se puede deshacer.`)) return;
        deleteInstance(inst.id)
          .then(() => { toast("Instancia borrada"); goInstances(); })
          .catch(toastError);
      }
    ),
  ], { danger: true });

  main.appendChild(
    h("div", { class: "container" }, [
      head,
      infoSection,
      webhookSection,
      advancedSection,
      dangerSection,
    ])
  );
}
