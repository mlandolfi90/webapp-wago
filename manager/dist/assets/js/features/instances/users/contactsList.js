import { h, clear } from "../../../ui/dom.js";
import { input, field, busy } from "../../../ui/form.js";
import { toast, toastError } from "../../../ui/feedback.js";
import { identityBlock } from "../../../ui/identity.js";
import { getContacts, getBlocklist, blockContact, unblockContact } from "../../../core/api.js";

/** Número legible a partir de un JID de usuario (...@s.whatsapp.net). */
function phoneFromJid(jid) {
  if (!jid || typeof jid !== "string") return "";
  const m = jid.match(/^(\d{6,15})@/);
  return m ? "+" + m[1] : "";
}
function contactName(c, jid) {
  return c.FullName || c.fullName || c.PushName || c.pushName ||
    c.Name || c.name || c.BusinessName || phoneFromJid(jid) || "(contacto)";
}

/** Normaliza la respuesta de /user/contacts (map JID->info | array | {data}). */
function normalizeContacts(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.map((c) => ({ jid: c.JID || c.jid || c.id || "", c }));
  return Object.keys(data).map((k) => ({ jid: k, c: data[k] || {} }));
}

export function renderContacts(area, inst) {
  clear(area);
  area.appendChild(h("div", { class: "center-load" }, [h("span", { class: "spinner" })]));
  getContacts(inst.token)
    .then((res) => {
      clear(area);
      const list = normalizeContacts(res.data);
      if (!list.length) {
        area.appendChild(h("div", { class: "empty" }, ["Sin contactos sincronizados todavía."]));
        return;
      }
      list.forEach(({ jid, c }) => {
        area.appendChild(h("div", { class: "card", style: "margin-bottom:8px" }, [
          identityBlock({ name: contactName(c, jid), phone: phoneFromJid(jid), id: jid || "-", idLabel: "JID" })
        ]));
      });
    })
    .catch((e) => { clear(area); area.appendChild(h("div", { class: "empty" }, ["Error: " + e.message])); });
}

export function renderBlocklist(area, inst) {
  const number = input({ placeholder: "5491122334455" });
  const blockBtn = h("button", { class: "btn btn-danger btn-sm" }, ["Bloquear"]);
  const listBox = h("div", {});

  function reload() {
    clear(listBox);
    listBox.appendChild(h("div", { class: "center-load" }, [h("span", { class: "spinner" })]));
    getBlocklist(inst.token)
      .then((res) => {
        clear(listBox);
        const raw = res.data;
        const jids = Array.isArray(raw) ? raw
          : Array.isArray(raw && raw.blocklist) ? raw.blocklist : [];
        if (!jids.length) {
          listBox.appendChild(h("div", { class: "empty" }, ["No hay contactos bloqueados."]));
          return;
        }
        jids.forEach((j) => {
          const jid = typeof j === "string" ? j : (j.JID || j.jid || "");
          const unBtn = h("button", { class: "btn btn-sm" }, ["Desbloquear"]);
          unBtn.addEventListener("click", () => {
            const r = busy(unBtn, "...");
            unblockContact(inst.token, { number: phoneFromJid(jid) || jid })
              .then(() => { toast("Desbloqueado"); reload(); })
              .catch((e) => { r(); toastError(e); });
          });
          listBox.appendChild(h("div", { class: "card", style: "margin-bottom:8px" }, [
            h("div", { class: "row", style: "justify-content:space-between;gap:12px" }, [
              identityBlock({ name: phoneFromJid(jid) || "(bloqueado)", id: jid || "-", idLabel: "JID" }),
              unBtn
            ])
          ]));
        });
      })
      .catch((e) => { clear(listBox); listBox.appendChild(h("div", { class: "empty" }, ["Error: " + e.message])); });
  }

  blockBtn.addEventListener("click", () => {
    if (!number.value.trim()) { toast("El número es obligatorio", "err"); return; }
    const r = busy(blockBtn, "...");
    blockContact(inst.token, { number: number.value.trim() })
      .then(() => { number.value = ""; toast("Contacto bloqueado"); reload(); })
      .catch((e) => { r(); toastError(e); });
  });

  clear(area);
  area.appendChild(h("div", {}, [
    field("Bloquear un número", number,
      "Número en formato internacional sin +. Lo agrega a la lista de bloqueados. Ej: 5491122334455"),
    blockBtn,
    h("hr", { class: "sep" }),
    listBox
  ]));
  reload();
}
