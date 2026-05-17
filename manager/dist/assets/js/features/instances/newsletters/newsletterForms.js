import { h } from "../../../ui/dom.js";
import { input, textarea, field } from "../../../ui/form.js";
import {
  createNewsletter, listNewsletters, newsletterInfo,
  newsletterLink, newsletterSubscribe, newsletterMessages
} from "../../../core/api.js";

function showJSON(area, label, data) {
  area.replaceChildren(
    h("hr", { class: "sep" }),
    h("div", { class: "field-label", style: "margin-bottom:6px" }, [label]),
    h("div", { class: "input", style: "white-space:pre-wrap;word-break:break-all;user-select:all" },
      [JSON.stringify(data, null, 2)])
  );
}

export const NEWSLETTER_FORMS = [
  {
    id: "create", label: "Crear", api: createNewsletter,
    build() {
      const name = input({ placeholder: "Nombre del canal" });
      const desc = textarea({ rows: "2", placeholder: "Descripción (opcional)" });
      return {
        fields: [
          field("Nombre", name, "Título del canal/newsletter. Ej: Novedades Wago"),
          field("Descripción", desc, "Texto descriptivo. Opcional.")
        ],
        validate: () => name.value.trim() ? null : "El nombre es obligatorio",
        body: () => ({ name: name.value.trim(), description: desc.value })
      };
    }
  },
  {
    id: "list", label: "Listar", api: (t) => listNewsletters(t),
    build: () => ({ fields: [], validate: () => null, body: () => ({}) }),
    result: (data, area) => showJSON(area, "Canales", data)
  },
  {
    id: "info", label: "Info", api: newsletterInfo,
    build() {
      const jid = input({ placeholder: "...@newsletter" });
      return {
        fields: [field("JID del canal", jid, "Identificador del newsletter. Ej: 12036...@newsletter")],
        validate: () => jid.value.trim() ? null : "El JID es obligatorio",
        body: () => ({ jid: jid.value.trim() })
      };
    },
    result: (data, area) => showJSON(area, "Información del canal", data)
  },
  {
    id: "link", label: "Invitación", api: newsletterLink,
    build() {
      const key = input({ placeholder: "key del canal" });
      return {
        fields: [field("Key", key, "Clave de invitación del canal.")],
        validate: () => key.value.trim() ? null : "La key es obligatoria",
        body: () => ({ key: key.value.trim() })
      };
    },
    result: (data, area) => showJSON(area, "Invitación", data)
  },
  {
    id: "subscribe", label: "Suscribir", api: newsletterSubscribe,
    build() {
      const jid = input({ placeholder: "...@newsletter" });
      return {
        fields: [field("JID del canal", jid, "JID del newsletter a suscribir.")],
        validate: () => jid.value.trim() ? null : "El JID es obligatorio",
        body: () => ({ jid: jid.value.trim() })
      };
    }
  },
  {
    id: "messages", label: "Mensajes", api: newsletterMessages,
    build() {
      const jid = input({ placeholder: "...@newsletter" });
      const count = input({ type: "number", placeholder: "50", value: "50" });
      const before = input({ type: "number", placeholder: "(opcional) before_id" });
      return {
        fields: [
          field("JID del canal", jid, "JID del newsletter."),
          field("Cantidad", count, "Cuántos mensajes traer. Ej: 50"),
          field("before_id", before, "Paginar: traer anteriores a este id. Opcional.")
        ],
        validate: () => jid.value.trim() ? null : "El JID es obligatorio",
        body: () => {
          const b = { jid: jid.value.trim(), count: parseInt(count.value, 10) || 50 };
          if (before.value.trim()) b.before_id = parseInt(before.value, 10);
          return b;
        }
      };
    },
    result: (data, area) => showJSON(area, "Mensajes del canal", data)
  }
];
