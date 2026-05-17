import { h } from "../../../ui/dom.js";
import { input, field } from "../../../ui/form.js";
import { pollResults, rejectCall } from "../../../core/api.js";

function showJSON(area, label, data) {
  area.replaceChildren(
    h("hr", { class: "sep" }),
    h("div", { class: "field-label", style: "margin-bottom:6px" }, [label]),
    h("div", { class: "input", style: "white-space:pre-wrap;word-break:break-all;user-select:all" },
      [JSON.stringify(data, null, 2)])
  );
}

export const UTIL_FORMS = [
  {
    id: "pollresults", label: "Resultados de encuesta",
    api: (token, body) => pollResults(token, body.pollMessageId),
    build() {
      const id = input({ placeholder: "pollMessageId" });
      return {
        fields: [field("ID del mensaje de la encuesta", id,
          "messageId del mensaje /send/poll enviado. Devuelve los votos. Ej: 3EB0...")],
        validate: () => id.value.trim() ? null : "El ID es obligatorio",
        body: () => ({ pollMessageId: id.value.trim() })
      };
    },
    result: (data, area) => showJSON(area, "Resultados de la encuesta", data)
  },
  {
    id: "rejectcall", label: "Rechazar llamada", api: rejectCall,
    build() {
      const callId = input({ placeholder: "callId" });
      const creator = input({ placeholder: "JID de quien llama" });
      return {
        fields: [
          field("ID de la llamada", callId, "callId de la llamada entrante (del evento CALL). Ej: ABCD123"),
          field("Quién llama", creator, "JID del que origina la llamada. Ej: 5491122334455@s.whatsapp.net")
        ],
        validate: () => (callId.value.trim() && creator.value.trim())
          ? null : "callId y quién llama son obligatorios",
        body: () => ({ callId: callId.value.trim(), callCreator: creator.value.trim() })
      };
    }
  }
];
