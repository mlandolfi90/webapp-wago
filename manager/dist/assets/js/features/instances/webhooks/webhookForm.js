import { h } from "../../../ui/dom.js";
import { input, textarea, field, checkboxRow, helpHint } from "../../../ui/form.js";
import { EVENTS } from "../../../constants.js";

/** Convierte textarea con un valor por línea a array (limpio). */
export function lines(t) {
  return t.value.split("\n").map((s) => s.trim()).filter(Boolean);
}

/**
 * Devuelve los controles + un builder de body para crear/editar un
 * webhook. Reutilizado por webhooksList (modo crear inline + editar).
 */
export function buildWebhookForm(prefill) {
  const cur = prefill || {};
  const urlIn = input({ placeholder: "https://miapp.com/whatsapp/hook", value: cur.url || "" });
  const enabledRow = checkboxRow("Habilitado", cur.enabled !== false,
    "Si está apagado, el webhook NO recibe eventos aunque matchee el filtro. Útil para pausar sin borrar.");

  const selectedEvents = Array.isArray(cur.events) ? cur.events : [];
  const eventChecks = {};
  const eventsGrid = h("div", { class: "events-grid" }, EVENTS.map((ev) => {
    const cb = h("input", { type: "checkbox" });
    cb.checked = selectedEvents.includes(ev);
    eventChecks[ev] = cb;
    return h("label", { class: "check" }, [cb, h("span", {}, [ev])]);
  }));

  const ctVal = cur.chatType || "any";
  function radio(value, label) {
    const r = h("input", { type: "radio", name: "wh-ct", value });
    if (ctVal === value) r.checked = true;
    return h("label", { class: "check" }, [r, h("span", {}, [label])]);
  }
  const ctAny = radio("any", "Cualquiera");
  const ctGroup = radio("group", "Solo grupos");
  const ctIndiv = radio("individual", "Solo individuales");
  const ctRow = h("div", { class: "events-grid" }, [ctAny, ctGroup, ctIndiv]);

  const chatIds = textarea({
    rows: "3",
    placeholder: "Un JID por línea\n5491122334455@s.whatsapp.net\n12036304...@g.us",
    value: (cur.chatIds || []).join("\n")
  });
  const senders = textarea({
    rows: "3",
    placeholder: "Un JID por línea\n5491122334455@s.whatsapp.net",
    value: (cur.senders || []).join("\n")
  });

  function readChatType() {
    if (ctGroup.querySelector("input").checked) return "group";
    if (ctIndiv.querySelector("input").checked) return "individual";
    return "any";
  }

  const fields = h("div", {}, [
    field("URL del webhook", urlIn,
      "URL HTTPS a la que el servidor hará POST con cada evento que matchee el filtro. Ej: https://miapp.com/whatsapp/hook"),
    enabledRow.row,
    h("label", { class: "muted-sm", style: "display:flex;align-items:center;gap:7px;margin:8px 0" }, [
      "Eventos",
      helpHint("Tipos de evento que dispara este webhook. Vacío = todos. Ej: tildar MESSAGE para mensajes entrantes.")
    ]),
    eventsGrid,
    h("label", { class: "muted-sm", style: "display:flex;align-items:center;gap:7px;margin:8px 0" }, [
      "Tipo de chat",
      helpHint("Filtra por origen: cualquiera, solo grupos (@g.us), o solo individuales (un usuario).")
    ]),
    ctRow,
    field("Chats permitidos (allowlist)", chatIds,
      "Si está vacío, no filtra por chat. Si tiene JIDs, solo dispara cuando el evento pertenece a uno de esos chats. Uno por línea."),
    field("Autores permitidos (allowlist)", senders,
      "Solo dispara cuando el autor del mensaje (sender) está en esta lista. Útil para filtrar por persona en grupos. Vacío = no filtra. Uno por línea.")
  ]);

  function build() {
    return {
      url: urlIn.value.trim(),
      enabled: enabledRow.checkbox.checked,
      events: EVENTS.filter((ev) => eventChecks[ev].checked),
      chatType: readChatType(),
      chatIds: lines(chatIds),
      senders: lines(senders)
    };
  }

  function validate() {
    const u = urlIn.value.trim();
    if (!u) return "La URL es obligatoria";
    if (!/^https?:\/\//i.test(u)) return "La URL debe empezar con http:// o https://";
    return null;
  }

  return { fields, build, validate };
}
