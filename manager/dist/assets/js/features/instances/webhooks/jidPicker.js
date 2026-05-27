import { h, clear } from "../../../ui/dom.js";
import { input } from "../../../ui/form.js";
import { toastError } from "../../../ui/feedback.js";
import { listGroups, getContacts } from "../../../core/api.js";

/**
 * Picker inline: muestra grupos o contactos por nombre humano, deja
 * tildar varios, y al confirmar **añade los JIDs** seleccionados a la
 * textarea destino (uno por línea, deduplicado). No es un modal —
 * se monta dentro de `host`.
 */
export function mountJidPicker({ host, source, token, targetTextarea, onClose }) {
  const title = source === "groups" ? "Elegir grupos" : "Elegir contactos";
  const search = input({ placeholder: "Filtrar por nombre o JID…" });
  const listBox = h("div", { style: "max-height:240px;overflow:auto;padding:4px 0" });
  const addBtn = h("button", { class: "btn btn-primary btn-sm" }, ["Añadir seleccionados"]);
  const closeBtn = h("button", { class: "btn btn-sm" }, ["Cerrar"]);

  let items = []; // { jid, name, cb }

  function render(filter) {
    clear(listBox);
    const f = (filter || "").toLowerCase();
    const visible = items.filter(({ jid, name }) =>
      !f || jid.toLowerCase().includes(f) || (name || "").toLowerCase().includes(f));
    if (!visible.length) {
      listBox.appendChild(h("div", { class: "empty" }, ["Sin resultados."]));
      return;
    }
    visible.forEach(({ jid, name, cb }) => {
      listBox.appendChild(h("label", { class: "check", style: "display:flex;gap:8px;padding:4px 2px" }, [
        cb,
        h("span", { style: "min-width:0;overflow:hidden" }, [
          h("div", {}, [name || "(sin nombre)"]),
          h("div", { class: "muted-sm", style: "word-break:break-all;user-select:all" }, [jid])
        ])
      ]));
    });
  }

  function loadGroups() {
    return listGroups(token).then((res) => {
      const arr = Array.isArray(res.data) ? res.data : [];
      items = arr.map((g) => ({
        jid: g.JID || g.jid || "",
        name: (g.GroupName && (g.GroupName.Name || g.GroupName.name)) || g.groupName || g.Name || "",
        cb: h("input", { type: "checkbox" })
      })).filter((x) => x.jid);
    });
  }
  function loadContacts() {
    return getContacts(token).then((res) => {
      const raw = res.data;
      const list = !raw ? [] : Array.isArray(raw)
        ? raw.map((c) => ({ jid: c.Jid || c.jid || c.JID || "", info: c }))
        : Object.keys(raw).map((k) => ({ jid: k, info: raw[k] || {} }));
      items = list.map(({ jid, info }) => ({
        jid,
        name: info.FullName || info.fullName || info.PushName || info.pushName ||
              info.BusinessName || info.businessName || info.Name || info.name || "",
        cb: h("input", { type: "checkbox" })
      })).filter((x) => x.jid);
    });
  }

  clear(host);
  host.appendChild(h("div", { class: "card", style: "margin-top:6px" }, [
    h("div", { class: "row", style: "justify-content:space-between;align-items:center;gap:8px" }, [
      h("b", {}, [title]),
      closeBtn
    ]),
    h("div", { style: "margin:6px 0" }, [search]),
    listBox,
    h("div", { class: "row", style: "gap:8px;justify-content:flex-end;margin-top:6px" }, [addBtn])
  ]));

  closeBtn.addEventListener("click", () => onClose && onClose());
  search.addEventListener("input", () => render(search.value));
  addBtn.addEventListener("click", () => {
    const picked = items.filter((x) => x.cb.checked).map((x) => x.jid);
    if (!picked.length) { onClose && onClose(); return; }
    const cur = (targetTextarea.value || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const merged = Array.from(new Set([...cur, ...picked]));
    targetTextarea.value = merged.join("\n");
    onClose && onClose();
  });

  listBox.appendChild(h("div", { class: "center-load" }, [h("span", { class: "spinner" })]));
  const loader = source === "groups" ? loadGroups() : loadContacts();
  loader
    .then(() => render(""))
    .catch((e) => { clear(listBox); listBox.appendChild(h("div", { class: "empty" }, ["Error: " + e.message])); toastError(e); });
}
