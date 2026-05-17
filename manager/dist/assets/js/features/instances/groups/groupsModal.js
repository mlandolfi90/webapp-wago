import { h } from "../../../ui/dom.js";
import { input, textarea, field, busy } from "../../../ui/form.js";
import { toast, toastError } from "../../../ui/feedback.js";
import { identityBlock } from "../../../ui/identity.js";
import { openTabbedForms } from "../_shared/tabbedForms.js";
import { listGroups, createGroup, joinGroup } from "../../../core/api.js";
import { openGroupActions, groupLabel, groupJid } from "./groupActions.js";

function renderList(area, inst, ctx) {
  area.appendChild(h("div", { class: "center-load" }, [h("span", { class: "spinner" })]));
  listGroups(inst.token)
    .then((res) => {
      area.replaceChildren();
      const list = Array.isArray(res.data) ? res.data : (res.data && res.data.groups) || [];
      if (!list.length) {
        area.appendChild(h("div", { class: "empty" }, ["Esta instancia no tiene grupos (o no se pudieron listar)."]));
        return;
      }
      list.forEach((g) => {
        area.appendChild(h("div", { class: "card", style: "margin-bottom:10px" }, [
          h("div", { class: "row", style: "justify-content:space-between;align-items:flex-start;gap:12px" }, [
            identityBlock({ name: groupLabel(g), id: groupJid(g) || "-", idLabel: "JID" }),
            h("button", {
              class: "btn btn-sm btn-primary",
              onclick: () => openGroupActions(inst, g, ctx.refresh)
            }, ["Gestionar"])
          ])
        ]));
      });
    })
    .catch((e) => { area.replaceChildren(h("div", { class: "empty" }, ["Error: " + e.message])); });
}

function renderCreate(area, inst, ctx) {
  const name = input({ placeholder: "Nombre del grupo" });
  const parts = textarea({ rows: "4", placeholder: "Un número por línea\n5491122334455\n5491133445566" });
  const btn = h("button", { class: "btn btn-primary" }, ["Crear grupo"]);
  area.appendChild(h("div", {}, [
    field("Nombre del grupo", name, "Título del nuevo grupo. Ej: Proyecto X"),
    field("Participantes (uno por línea)", parts,
      "Números en formato internacional sin +, uno por línea. Vos quedás como admin. Ej:\n5491122334455"),
    btn
  ]));
  btn.addEventListener("click", () => {
    const list = parts.value.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!name.value.trim()) { toast("El nombre es obligatorio", "err"); return; }
    if (!list.length) { toast("Cargá al menos un participante", "err"); return; }
    const reset = busy(btn, "Creando...");
    createGroup(inst.token, { groupName: name.value.trim(), participants: list })
      .then(() => { toast("Grupo creado"); ctx.go("list"); })
      .catch((e) => { reset(); toastError(e); });
  });
}

function renderJoin(area, inst, ctx) {
  const code = input({ placeholder: "https://chat.whatsapp.com/XXXX o el código" });
  const btn = h("button", { class: "btn btn-primary" }, ["Unirme"]);
  area.appendChild(h("div", {}, [
    field("Link o código de invitación", code,
      "Link de invitación del grupo o su código. Ej: https://chat.whatsapp.com/AbCdEf123"),
    btn
  ]));
  btn.addEventListener("click", () => {
    if (!code.value.trim()) { toast("El link/código es obligatorio", "err"); return; }
    const reset = busy(btn, "Uniéndome...");
    joinGroup(inst.token, { code: code.value.trim() })
      .then(() => { toast("Te uniste al grupo"); ctx.go("list"); })
      .catch((e) => { reset(); toastError(e); });
  });
}

export function openGroupsModal(inst) {
  openTabbedForms({
    title: "Grupos — " + (inst.name || inst.id),
    inst,
    forms: [
      { id: "list", label: "Mis grupos", render: renderList },
      { id: "create", label: "Crear grupo", render: renderCreate },
      { id: "join", label: "Unirme por link", render: renderJoin }
    ]
  });
}
