import { input, textarea, field } from "../../../ui/form.js";
import { createCommunity, communityAdd, communityRemove } from "../../../core/api.js";

function lines(t) { return t.value.split("\n").map((s) => s.trim()).filter(Boolean); }

export const COMMUNITY_FORMS = [
  {
    id: "create", label: "Crear", api: createCommunity,
    build() {
      const name = input({ placeholder: "Nombre de la comunidad" });
      return {
        fields: [field("Nombre de la comunidad", name,
          "Título de la nueva comunidad. Ej: Clientes Premium")],
        validate: () => name.value.trim() ? null : "El nombre es obligatorio",
        body: () => ({ communityName: name.value.trim() })
      };
    }
  },
  {
    id: "add", label: "Agregar grupos", api: communityAdd,
    build() {
      const cj = input({ placeholder: "JID de la comunidad (...@g.us)" });
      const gj = textarea({ rows: "3", placeholder: "Un JID de grupo por línea" });
      return {
        fields: [
          field("JID de la comunidad", cj, "Identificador de la comunidad. Ej: 12036...@g.us"),
          field("Grupos (un JID por línea)", gj, "JIDs de los grupos a vincular, uno por línea. Ej:\n12036...@g.us")
        ],
        validate: () => {
          if (!cj.value.trim()) return "El JID de la comunidad es obligatorio";
          if (!lines(gj).length) return "Cargá al menos un grupo";
          return null;
        },
        body: () => ({ communityJid: cj.value.trim(), groupJid: lines(gj) })
      };
    }
  },
  {
    id: "remove", label: "Quitar grupos", api: communityRemove,
    build() {
      const cj = input({ placeholder: "JID de la comunidad (...@g.us)" });
      const gj = textarea({ rows: "3", placeholder: "Un JID de grupo por línea" });
      return {
        fields: [
          field("JID de la comunidad", cj, "Identificador de la comunidad. Ej: 12036...@g.us"),
          field("Grupos (un JID por línea)", gj, "JIDs de los grupos a desvincular, uno por línea.")
        ],
        validate: () => {
          if (!cj.value.trim()) return "El JID de la comunidad es obligatorio";
          if (!lines(gj).length) return "Cargá al menos un grupo";
          return null;
        },
        body: () => ({ communityJid: cj.value.trim(), groupJid: lines(gj) })
      };
    }
  }
];
