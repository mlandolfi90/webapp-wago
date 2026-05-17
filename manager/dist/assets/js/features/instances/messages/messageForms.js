import { h } from "../../../ui/dom.js";
import { input, textarea, field } from "../../../ui/form.js";
import {
  reactMessage, markRead, deleteMessage, editMessage, messageStatus, downloadMedia
} from "../../../core/api.js";

function lines(t) { return t.value.split("\n").map((s) => s.trim()).filter(Boolean); }
function showJSON(area, label, data) {
  area.replaceChildren(
    h("hr", { class: "sep" }),
    h("div", { class: "field-label", style: "margin-bottom:6px" }, [label]),
    h("div", { class: "input", style: "white-space:pre-wrap;word-break:break-all;user-select:all" },
      [JSON.stringify(data, null, 2)])
  );
}

/**
 * Catálogo declarativo de operaciones sobre mensajes (forma compatible
 * con _shared/tabbedForms.js). El orquestador agrega submit/estado.
 */
export const MESSAGE_FORMS = [
  {
    id: "react", label: "Reaccionar", api: reactMessage,
    build() {
      const number = input({ placeholder: "5491122334455" });
      const id = input({ placeholder: "ID del mensaje (messageId)" });
      const reaction = input({ placeholder: "👍  (vacío = quitar reacción)" });
      const fromMe = h("input", { type: "checkbox" });
      const participant = input({ placeholder: "(grupos) JID del autor del mensaje" });
      return {
        fields: [
          field("Número / chat", number, "Chat donde está el mensaje (número sin + o JID). Ej: 5491122334455"),
          field("ID del mensaje", id, "messageId del mensaje a reaccionar. Lo obtenés del evento o del envío. Ej: 3EB0..."),
          field("Emoji", reaction, "Emoji de la reacción. Vacío = quitar la reacción. Ej: 👍 ❤️ 😂"),
          h("div", { class: "check-row" }, [
            h("label", { class: "check" }, [fromMe, h("span", {}, ["El mensaje es mío (fromMe)"])])
          ]),
          field("Participante (grupos)", participant, "En grupos: JID de quien envió el mensaje. Vacío en chats 1-a-1.")
        ],
        validate: () => {
          if (!number.value.trim()) return "El número/chat es obligatorio";
          if (!id.value.trim()) return "El ID del mensaje es obligatorio";
          return null;
        },
        body: () => ({
          number: number.value.trim(), id: id.value.trim(),
          reaction: reaction.value, fromMe: fromMe.checked,
          participant: participant.value.trim()
        })
      };
    }
  },
  {
    id: "markread", label: "Marcar leído", api: markRead,
    build() {
      const number = input({ placeholder: "5491122334455" });
      const ids = textarea({ rows: "3", placeholder: "Un ID por línea" });
      const participant = input({ placeholder: "(grupos) JID del autor del mensaje" });
      return {
        fields: [
          field("Número / chat", number, "Chat de los mensajes. Ej: 5491122334455"),
          field("IDs (uno por línea)", ids, "messageId de cada mensaje a marcar leído, uno por línea."),
          field("Participante (grupos)", participant,
            "En GRUPOS: JID de quien envió el mensaje. Sin esto el check azul NO registra en grupos. Vacío en chats 1-a-1.")
        ],
        validate: () => {
          if (!number.value.trim()) return "El número/chat es obligatorio";
          if (!lines(ids).length) return "Cargá al menos un ID";
          return null;
        },
        body: () => {
          const b = { number: number.value.trim(), id: lines(ids) };
          if (participant.value.trim()) b.participant = participant.value.trim();
          return b;
        }
      };
    }
  },
  {
    id: "delete", label: "Borrar", api: deleteMessage,
    build() {
      const chat = input({ placeholder: "5491122334455 o JID del chat" });
      const messageId = input({ placeholder: "ID del mensaje" });
      return {
        fields: [
          field("Chat", chat, "Chat donde está el mensaje (número sin + o JID). Ej: 5491122334455"),
          field("ID del mensaje", messageId, "messageId del mensaje a borrar para todos. Ej: 3EB0...")
        ],
        validate: () => {
          if (!chat.value.trim()) return "El chat es obligatorio";
          if (!messageId.value.trim()) return "El ID del mensaje es obligatorio";
          return null;
        },
        body: () => ({ chat: chat.value.trim(), messageId: messageId.value.trim() })
      };
    }
  },
  {
    id: "edit", label: "Editar", api: editMessage,
    build() {
      const chat = input({ placeholder: "5491122334455 o JID del chat" });
      const messageId = input({ placeholder: "ID del mensaje" });
      const message = textarea({ rows: "3", placeholder: "Nuevo texto del mensaje" });
      return {
        fields: [
          field("Chat", chat, "Chat donde está el mensaje. Ej: 5491122334455"),
          field("ID del mensaje", messageId, "messageId del mensaje a editar (solo texto). Ej: 3EB0..."),
          field("Nuevo texto", message, "Contenido que reemplaza al original. Ej: Corrijo: la reunión es a las 15h")
        ],
        validate: () => {
          if (!chat.value.trim()) return "El chat es obligatorio";
          if (!messageId.value.trim()) return "El ID del mensaje es obligatorio";
          if (!message.value.trim()) return "El nuevo texto es obligatorio";
          return null;
        },
        body: () => ({
          chat: chat.value.trim(), messageId: messageId.value.trim(),
          message: message.value
        })
      };
    }
  },
  {
    id: "status", label: "Estado de entrega", api: messageStatus,
    build() {
      const id = input({ placeholder: "ID del mensaje" });
      return {
        fields: [field("ID del mensaje", id,
          "messageId para consultar su estado (enviado/entregado/leído). Ej: 3EB0...")],
        validate: () => id.value.trim() ? null : "El ID del mensaje es obligatorio",
        body: () => ({ id: id.value.trim() })
      };
    },
    result: (data, area) => showJSON(area, "Estado del mensaje", data)
  },
  {
    id: "download", label: "Descargar media", api: downloadMedia,
    build() {
      const msg = textarea({ rows: "6", placeholder: '{ "key": { ... }, "message": { ... } }' });
      return {
        fields: [field("Mensaje (JSON crudo)", msg,
          "Objeto del mensaje (tal como llega por webhook/evento) que contiene la media a descargar. Pegá el JSON completo del mensaje.")],
        validate: () => {
          if (!msg.value.trim()) return "Pegá el JSON del mensaje";
          try { JSON.parse(msg.value); return null; }
          catch { return "El JSON no es válido"; }
        },
        body: () => ({ message: JSON.parse(msg.value) })
      };
    },
    result(data, area) {
      const url = data && (data.URL || data.url || data.media || data.path);
      area.replaceChildren(h("hr", { class: "sep" }));
      if (url) {
        area.appendChild(h("div", { class: "field-label", style: "margin-bottom:6px" }, ["Media"]));
        area.appendChild(h("div", { class: "input", style: "user-select:all;word-break:break-all" }, [String(url)]));
      } else {
        area.appendChild(h("div", { class: "input", style: "white-space:pre-wrap;word-break:break-all;user-select:all" },
          [JSON.stringify(data, null, 2)]));
      }
    }
  }
];
