import { h } from "../../../ui/dom.js";
import { input, field } from "../../../ui/form.js";
import {
  listLabels, labelChat, labelMessage, editLabel, unlabelChat, unlabelMessage
} from "../../../core/api.js";

function showJSON(area, label, data) {
  area.replaceChildren(
    h("hr", { class: "sep" }),
    h("div", { class: "field-label", style: "margin-bottom:6px" }, [label]),
    h("div", { class: "input", style: "white-space:pre-wrap;word-break:break-all;user-select:all" },
      [JSON.stringify(data, null, 2)])
  );
}
const noBody = () => ({ fields: [], validate: () => null, body: () => ({}) });

export const LABEL_FORMS = [
  {
    id: "list", label: "Listar", api: (t) => listLabels(t),
    build: noBody,
    result: (data, area) => showJSON(area, "Etiquetas", data)
  },
  {
    id: "chat", label: "Etiquetar chat", api: labelChat,
    build() {
      const jid = input({ placeholder: "5491122334455 o JID" });
      const labelId = input({ placeholder: "ID de la etiqueta" });
      return {
        fields: [
          field("Chat", jid, "Número (sin +) o JID del chat. Ej: 5491122334455"),
          field("ID de etiqueta", labelId, "labelId a aplicar. Lo ves en 'Listar'. Ej: 1")
        ],
        validate: () => (jid.value.trim() && labelId.value.trim()) ? null : "Chat y etiqueta son obligatorios",
        body: () => ({ jid: jid.value.trim(), labelId: labelId.value.trim() })
      };
    }
  },
  {
    id: "unchat", label: "Quitar de chat", api: unlabelChat,
    build() {
      const jid = input({ placeholder: "5491122334455 o JID" });
      const labelId = input({ placeholder: "ID de la etiqueta" });
      return {
        fields: [
          field("Chat", jid, "Número (sin +) o JID del chat."),
          field("ID de etiqueta", labelId, "labelId a quitar del chat.")
        ],
        validate: () => (jid.value.trim() && labelId.value.trim()) ? null : "Chat y etiqueta son obligatorios",
        body: () => ({ jid: jid.value.trim(), labelId: labelId.value.trim() })
      };
    }
  },
  {
    id: "msg", label: "Etiquetar mensaje", api: labelMessage,
    build() {
      const jid = input({ placeholder: "5491122334455 o JID" });
      const labelId = input({ placeholder: "ID de la etiqueta" });
      const messageId = input({ placeholder: "ID del mensaje" });
      return {
        fields: [
          field("Chat", jid, "Número (sin +) o JID del chat."),
          field("ID de etiqueta", labelId, "labelId a aplicar."),
          field("ID del mensaje", messageId, "messageId al que se aplica la etiqueta.")
        ],
        validate: () => (jid.value.trim() && labelId.value.trim() && messageId.value.trim())
          ? null : "Chat, etiqueta y mensaje son obligatorios",
        body: () => ({ jid: jid.value.trim(), labelId: labelId.value.trim(), messageId: messageId.value.trim() })
      };
    }
  },
  {
    id: "unmsg", label: "Quitar de mensaje", api: unlabelMessage,
    build() {
      const jid = input({ placeholder: "5491122334455 o JID" });
      const labelId = input({ placeholder: "ID de la etiqueta" });
      const messageId = input({ placeholder: "ID del mensaje" });
      return {
        fields: [
          field("Chat", jid, "Número (sin +) o JID del chat."),
          field("ID de etiqueta", labelId, "labelId a quitar."),
          field("ID del mensaje", messageId, "messageId del que se quita la etiqueta.")
        ],
        validate: () => (jid.value.trim() && labelId.value.trim() && messageId.value.trim())
          ? null : "Chat, etiqueta y mensaje son obligatorios",
        body: () => ({ jid: jid.value.trim(), labelId: labelId.value.trim(), messageId: messageId.value.trim() })
      };
    }
  },
  {
    id: "edit", label: "Crear/Editar", api: editLabel,
    build() {
      const labelId = input({ placeholder: "ID (vacío = crear)" });
      const name = input({ placeholder: "Nombre de la etiqueta" });
      const color = input({ type: "number", placeholder: "0-19" });
      const del = h("input", { type: "checkbox" });
      return {
        fields: [
          field("ID de etiqueta", labelId, "labelId existente para editar; vacío para crear una nueva."),
          field("Nombre", name, "Texto de la etiqueta. Ej: Prioritario"),
          field("Color (0-19)", color, "Índice de color de WhatsApp. Ej: 5"),
          h("div", { class: "check-row" }, [
            h("label", { class: "check" }, [del, h("span", {}, ["Eliminar esta etiqueta"])])
          ])
        ],
        validate: () => name.value.trim() || del.checked ? null : "Poné un nombre (o marcá eliminar)",
        body: () => ({
          labelId: labelId.value.trim(),
          name: name.value.trim(),
          color: parseInt(color.value, 10) || 0,
          deleted: del.checked
        })
      };
    }
  }
];
