import { h, clear } from "../../../ui/dom.js";
import { modal } from "../../../ui/modal.js";
import { input, textarea, field, busy } from "../../../ui/form.js";
import { toast, toastError } from "../../../ui/feedback.js";
import {
  getGroupInfo, getGroupInviteLink, setGroupName, setGroupDescription,
  setGroupPhoto, updateGroupParticipants, leaveGroup
} from "../../../core/api.js";

export function groupJid(g) {
  return g.JID || g.jid || g.id || g.Jid || "";
}
export function groupLabel(g) {
  return g.Name || g.name || g.Subject || g.subject || groupJid(g) || "(grupo)";
}

function selectEl(options) {
  return h("select", { class: "input" }, options.map((o) => h("option", { value: o }, [o])));
}
function lines(t) {
  return t.value.split("\n").map((s) => s.trim()).filter(Boolean);
}
function show(area, label, value) {
  clear(area);
  area.appendChild(h("hr", { class: "sep" }));
  area.appendChild(h("div", { class: "field-label", style: "margin-bottom:6px" }, [label]));
  area.appendChild(h("div", { class: "input", style: "white-space:pre-wrap;word-break:break-all;user-select:all" }, [value]));
}

/**
 * Catálogo declarativo de acciones sobre UN grupo. Cada entrada:
 *  - id, label
 *  - build(group): { fields, validate, body }  (body NO incluye groupJid;
 *    el orquestador lo agrega)
 *  - api(token, body) -> Promise
 *  - result?(data, areaEl): si existe, renderiza salida y NO cierra
 *  - confirm?(group): string para confirm() previo (acciones destructivas)
 *  - reload?: true si tras éxito hay que recargar la lista de grupos
 */
export const GROUP_ACTIONS = [
  {
    id: "info", label: "Info", api: getGroupInfo,
    build: () => ({ fields: [], validate: () => null, body: () => ({}) }),
    result: (data, area) => show(area, "Información del grupo", JSON.stringify(data, null, 2))
  },
  {
    id: "invitelink", label: "Link", api: getGroupInviteLink,
    build() {
      const reset = h("input", { type: "checkbox" });
      return {
        fields: [h("div", { class: "check-row" }, [
          h("label", { class: "check" }, [reset, h("span", {}, ["Regenerar link (invalida el anterior)"])])
        ])],
        validate: () => null,
        body: () => ({ reset: reset.checked })
      };
    },
    result: (data, area) => {
      const link = (data && (data.InviteLink || data.inviteLink || data.link || data.url)) ||
        (typeof data === "string" ? data : JSON.stringify(data));
      show(area, "Link de invitación (tocá para seleccionar)", link);
    }
  },
  {
    id: "name", label: "Renombrar", api: setGroupName, reload: true,
    build() {
      const name = input({ placeholder: "Nuevo nombre del grupo" });
      return {
        fields: [field("Nombre", name, "Nuevo título visible del grupo. Ej: Equipo Ventas 2026")],
        validate: () => name.value.trim() ? null : "El nombre es obligatorio",
        body: () => ({ name: name.value.trim() })
      };
    }
  },
  {
    id: "description", label: "Descripción", api: setGroupDescription,
    build() {
      const desc = textarea({ rows: "3", placeholder: "Descripción del grupo" });
      return {
        fields: [field("Descripción", desc, "Texto descriptivo del grupo. Dejar vacío la borra. Ej: Coordinación de turnos")],
        validate: () => null,
        body: () => ({ description: desc.value })
      };
    }
  },
  {
    id: "photo", label: "Foto", api: setGroupPhoto,
    build() {
      const image = input({ placeholder: "https://.../foto.jpg" });
      return {
        fields: [field("Imagen (URL o base64)", image, "Foto del grupo: URL pública (JPG/PNG) o data URI base64. Ej: https://misitio.com/logo.jpg")],
        validate: () => image.value.trim() ? null : "La imagen es obligatoria",
        body: () => ({ image: image.value.trim() })
      };
    }
  },
  {
    id: "participants", label: "Participantes", api: updateGroupParticipants, reload: true,
    build() {
      const action = selectEl(["add", "remove", "promote", "demote"]);
      const parts = textarea({ rows: "4", placeholder: "Un número por línea\n5491122334455\n5491133445566" });
      return {
        fields: [
          field("Acción", action, "add: agregar · remove: quitar · promote: hacer admin · demote: quitar admin"),
          field("Participantes (uno por línea)", parts,
            "Números en formato internacional sin +, uno por línea. Ej:\n5491122334455\n5491133445566")
        ],
        validate: () => lines(parts).length ? null : "Cargá al menos un participante",
        body: () => ({ action: action.value, participants: lines(parts) })
      };
    }
  },
  {
    id: "leave", label: "Salir", api: leaveGroup, reload: true,
    confirm: (g) => `¿Salir del grupo "${groupLabel(g)}"?`,
    build: () => ({ fields: [], validate: () => null, body: () => ({}) })
  }
];

export function openGroupActions(inst, group, onChanged) {
  let active = GROUP_ACTIONS[0];
  let current = active.build(group);
  const formArea = h("div", {});
  const resultArea = h("div", {});

  const seg = h("div", { class: "seg" }, GROUP_ACTIONS.map((a) =>
    h("button", {
      type: "button",
      class: a.id === active.id ? "is-active" : "",
      onclick: () => select(a)
    }, [a.label])
  ));

  function renderForm() {
    clear(formArea);
    clear(resultArea);
    current.fields.forEach((f) => formArea.appendChild(f));
  }
  function select(a) {
    active = a;
    current = a.build(group);
    seg.querySelectorAll("button").forEach((b, i) => {
      b.className = GROUP_ACTIONS[i].id === a.id ? "is-active" : "";
    });
    renderForm();
  }

  const goBtn = h("button", { class: "btn btn-primary" }, ["Aplicar"]);
  const m = modal(
    "Grupo — " + groupLabel(group),
    h("div", {}, [
      h("div", { class: "meta", style: "margin-bottom:12px;word-break:break-all" }, [
        h("b", {}, ["JID: "]), groupJid(group) || "(desconocido)"
      ]),
      seg, formArea, resultArea
    ]),
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cerrar"]), goBtn]
  );
  renderForm();

  goBtn.addEventListener("click", () => {
    const err = current.validate();
    if (err) { toast(err, "err"); return; }
    if (active.confirm && !confirm(active.confirm(group))) return;
    const body = { groupJid: groupJid(group), ...current.body() };
    const reset = busy(goBtn, "Aplicando...");
    active.api(inst.token, body)
      .then((res) => {
        reset();
        if (active.result) { active.result(res.data, resultArea); toast(active.label + " ok"); }
        else { toast(active.label + " ok"); m.close(); }
        if (active.reload && onChanged) onChanged();
      })
      .catch((e) => { reset(); toastError(e); });
  });
}
