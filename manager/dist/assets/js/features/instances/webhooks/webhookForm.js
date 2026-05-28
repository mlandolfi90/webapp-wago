import { h, clear } from "../../../ui/dom.js";
import { input, textarea, field, checkboxRow, helpHint } from "../../../ui/form.js";
import { EVENTS } from "../../../constants.js";
import { mountJidPicker } from "./jidPicker.js";
import { loadNameMap, formatJid, parseTextareaToJids } from "./nameResolver.js";

/** Convierte textarea con un valor por línea a array (limpio). */
export function lines(t) {
  return t.value.split("\n").map((s) => s.trim()).filter(Boolean);
}

/**
 * Devuelve los controles + un builder de body para crear/editar un
 * webhook. Reutilizado por webhooksList (modo crear inline + editar).
 * `token` es opcional: si se pasa, habilita los pickers "Elegir
 * grupos/contactos" que consultan /group/list y /user/contacts.
 */
export function buildWebhookForm(prefill, token) {
  const cur = prefill || {};
  const urlIn = input({ placeholder: "https://miapp.com/whatsapp/hook", value: cur.url || "" });
  const enabledRow = checkboxRow("Habilitado", cur.enabled !== false,
    "Si está apagado, el webhook NO recibe eventos aunque matchee el filtro. Útil para pausar sin borrar.");
  // WAGO-PATCH(ADR-0049): default tildado (cur.ignoreFromMe undefined
  // cuenta como true por el !== false; webhooks nuevos arrancan
  // protegidos contra el loop).
  const ignoreFromMeRow = checkboxRow("Ignorar mis propios mensajes (rompe loops)", cur.ignoreFromMe !== false,
    "Tildado (recomendado): este webhook NO recibe los mensajes que vos enviás. Rompe el loop infinito cuando un consumer responde un evento con /send/text. Destildar SOLO si necesitás auditar mensajes salientes en este webhook.");

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
    placeholder: "Una entrada por línea. Formato:\n  Nombre <JID>   (lo arma el picker)\n  *@g.us         (wildcard)",
    value: (cur.chatIds || []).join("\n")
  });
  const senders = textarea({
    rows: "3",
    placeholder: "Una entrada por línea. Formato:\n  Nombre <JID>           (lo arma el picker)\n  549*@s.whatsapp.net    (wildcard)",
    value: (cur.senders || []).join("\n")
  });

  // Filtros por NOMBRE (matchean contra el nombre humano del grupo o
  // contacto que llega del backend) — soportan glob: `Harness*`,
  // `Soporte L?`. Atrapan grupos nuevos cuyo nombre cumple el patrón
  // (lo que un picker de JIDs fijos no hace).
  const chatNames = textarea({
    rows: "2",
    placeholder: "Un patrón por línea sobre el NOMBRE del grupo:\n  Harness*\n  Soporte L?\n  Familia",
    value: (cur.chatNames || []).join("\n")
  });
  const senderNames = textarea({
    rows: "2",
    placeholder: "Un patrón por línea sobre el NOMBRE del contacto:\n  Mauro*\n  Soporte Nivel ?",
    value: (cur.senderNames || []).join("\n")
  });

  // Enriquece el prefill con nombres (asincrónico). Wildcards quedan
  // como están porque formatJid devuelve el JID crudo si no hay nombre.
  if (token && ((cur.chatIds && cur.chatIds.length) || (cur.senders && cur.senders.length))) {
    loadNameMap(token).then((map) => {
      if (cur.chatIds && cur.chatIds.length) {
        chatIds.value = cur.chatIds.map((j) => formatJid(j, map)).join("\n");
      }
      if (cur.senders && cur.senders.length) {
        senders.value = cur.senders.map((j) => formatJid(j, map)).join("\n");
      }
    });
  }

  // Pickers por nombre — sólo se montan si tenemos token.
  const chatPicker = h("div", {});
  const senderPicker = h("div", {});
  function pickChats() {
    if (!token) return;
    mountJidPicker({
      host: chatPicker, source: "groups", token, targetTextarea: chatIds,
      onClose: () => clear(chatPicker)
    });
  }
  function pickSenders() {
    if (!token) return;
    mountJidPicker({
      host: senderPicker, source: "contacts", token, targetTextarea: senders,
      onClose: () => clear(senderPicker)
    });
  }
  const chatPickBtn = h("button", { class: "btn btn-sm", type: "button" }, ["Elegir grupos…"]);
  const sendPickBtn = h("button", { class: "btn btn-sm", type: "button" }, ["Elegir contactos…"]);
  chatPickBtn.addEventListener("click", pickChats);
  sendPickBtn.addEventListener("click", pickSenders);

  function readChatType() {
    if (ctGroup.querySelector("input").checked) return "group";
    if (ctIndiv.querySelector("input").checked) return "individual";
    return "any";
  }

  const fields = h("div", {}, [
    field("URL del webhook", urlIn,
      "URL HTTPS a la que el servidor hará POST con cada evento que matchee el filtro. Ej: https://miapp.com/whatsapp/hook"),
    enabledRow.row,
    ignoreFromMeRow.row,
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
      "Vacío = no filtra. Cada línea es `Nombre <JID>` (lo arma el picker), `<JID>` o un wildcard glob: *@g.us, 12036*@g.us, *@s.whatsapp.net. Al guardar se manda solo el JID."),
    token ? h("div", { class: "row", style: "gap:6px;margin-top:-4px;margin-bottom:8px" }, [chatPickBtn]) : null,
    chatPicker,
    field("Autores permitidos (allowlist)", senders,
      "Vacío = no filtra. Cada línea es `Nombre <JID>` (lo arma el picker), `<JID>` o wildcard glob: 549*@s.whatsapp.net, *@s.whatsapp.net. Al guardar se manda solo el JID."),
    token ? h("div", { class: "row", style: "gap:6px;margin-top:-4px;margin-bottom:8px" }, [sendPickBtn]) : null,
    senderPicker,
    field("Filtro por NOMBRE de grupo (glob)", chatNames,
      "Patrón sobre el nombre humano del grupo: `Harness*` matchea cualquier grupo cuyo nombre empieza con Harness, incluido uno creado mañana. Vacío = no filtra. Un patrón por línea."),
    field("Filtro por NOMBRE de contacto (glob)", senderNames,
      "Patrón sobre el nombre del autor: `Mauro*` matchea Mauro Landolfi, Mauro García, etc. Vacío = no filtra. Un patrón por línea.")
  ]);

  function build() {
    return {
      url: urlIn.value.trim(),
      enabled: enabledRow.checkbox.checked,
      events: EVENTS.filter((ev) => eventChecks[ev].checked),
      chatType: readChatType(),
      // chatIds/senders: cada línea puede ser `Nombre <JID>`, `<JID>`
      // o `JID/wildcard` crudo — se manda solo el JID al backend.
      chatIds: parseTextareaToJids(chatIds),
      senders: parseTextareaToJids(senders),
      // chatNames/senderNames: patrones glob sobre nombre. Crudo.
      chatNames: lines(chatNames),
      senderNames: lines(senderNames),
      // WAGO-PATCH(ADR-0049): per-webhook opt-in para mensajes propios.
      ignoreFromMe: ignoreFromMeRow.checkbox.checked
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
