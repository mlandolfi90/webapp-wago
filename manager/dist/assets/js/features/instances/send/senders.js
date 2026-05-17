import { h } from "../../../ui/dom.js";
import { input, textarea, field } from "../../../ui/form.js";
import {
  sendText, sendLink, sendMedia, sendLocation, sendPoll, sendContact, sendSticker
} from "../../../core/api.js";

/**
 * Catálogo declarativo de tipos de envío. Cada entrada expone:
 *  - id, label
 *  - api: fn(token, body) de core/api.js
 *  - build(): { fields:[Node], validate:()->string|null, body:()->object }
 * El orquestador (sendModal) agrega el campo común `number` y el submit.
 */

function selectEl(options) {
  return h("select", { class: "input" }, options.map((o) => h("option", { value: o }, [o])));
}

export const SENDERS = [
  {
    id: "text", label: "Texto", api: sendText,
    build() {
      const text = textarea({ rows: "3", placeholder: "Mensaje de prueba" });
      return {
        fields: [field("Mensaje", text,
          "Texto que se enviará. Admite saltos de línea y emojis. Ej: Hola, te escribo desde Wago 👋")],
        validate: () => text.value.trim() ? null : "El mensaje es obligatorio",
        body: () => ({ text: text.value })
      };
    }
  },
  {
    id: "media", label: "Media", api: sendMedia,
    build() {
      const type = selectEl(["image", "video", "audio", "document"]);
      const url = input({ placeholder: "https://.../archivo.jpg" });
      const caption = input({ placeholder: "Texto opcional" });
      const filename = input({ placeholder: "documento.pdf" });
      return {
        fields: [
          field("Tipo de media", type,
            "Qué clase de archivo es. Determina cómo lo muestra WhatsApp. Ej: image para una foto, document para un PDF."),
          field("URL del archivo", url,
            "Enlace público al archivo a enviar (también acepta base64 data URI). Ej: https://misitio.com/foto.jpg"),
          field("Epígrafe (caption)", caption,
            "Texto que acompaña a la imagen/video. Opcional. Ej: Mirá esta promo"),
          field("Nombre de archivo", filename,
            "Nombre con el que se recibe el documento. Útil para type=document. Ej: factura.pdf")
        ],
        validate: () => url.value.trim() ? null : "La URL del archivo es obligatoria",
        body: () => ({
          type: type.value, url: url.value.trim(),
          caption: caption.value, filename: filename.value.trim()
        })
      };
    }
  },
  {
    id: "link", label: "Link", api: sendLink,
    build() {
      const url = input({ placeholder: "https://ejemplo.com" });
      const text = input({ placeholder: "Mirá este enlace" });
      const title = input({ placeholder: "Título de la vista previa" });
      const description = input({ placeholder: "Descripción de la vista previa" });
      const imgUrl = input({ placeholder: "https://.../miniatura.jpg" });
      return {
        fields: [
          field("URL", url,
            "Enlace a compartir; WhatsApp genera la vista previa. Ej: https://miempresa.com/promo"),
          field("Texto", text,
            "Mensaje que acompaña al enlace. Opcional. Ej: Aprovechá esta oferta 👇"),
          field("Título", title,
            "Título de la tarjeta de vista previa. Ej: Oferta de verano"),
          field("Descripción", description,
            "Bajada de la vista previa. Ej: 30% off hasta el viernes"),
          field("Imagen (miniatura)", imgUrl,
            "URL de la imagen para la vista previa. Opcional. Ej: https://misitio.com/og.jpg")
        ],
        validate: () => url.value.trim() ? null : "La URL es obligatoria",
        body: () => ({
          url: url.value.trim(), text: text.value, title: title.value,
          description: description.value, imgUrl: imgUrl.value.trim()
        })
      };
    }
  },
  {
    id: "location", label: "Ubicación", api: sendLocation,
    build() {
      const latitude = input({ placeholder: "-34.6037" });
      const longitude = input({ placeholder: "-58.3816" });
      const name = input({ placeholder: "Obelisco" });
      const address = input({ placeholder: "Av. 9 de Julio, CABA" });
      return {
        fields: [
          field("Latitud", latitude,
            "Coordenada norte-sur en grados decimales. Ej: -34.6037 (Buenos Aires)"),
          field("Longitud", longitude,
            "Coordenada este-oeste en grados decimales. Ej: -58.3816 (Buenos Aires)"),
          field("Nombre del lugar", name,
            "Etiqueta del punto. Opcional. Ej: Oficina central"),
          field("Dirección", address,
            "Dirección legible bajo el nombre. Opcional. Ej: Av. Corrientes 1234")
        ],
        validate: () => {
          const la = parseFloat(latitude.value), lo = parseFloat(longitude.value);
          if (Number.isNaN(la) || Number.isNaN(lo)) return "Latitud y longitud deben ser números";
          return null;
        },
        body: () => ({
          latitude: parseFloat(latitude.value), longitude: parseFloat(longitude.value),
          name: name.value, address: address.value
        })
      };
    }
  },
  {
    id: "poll", label: "Encuesta", api: sendPoll,
    build() {
      const question = input({ placeholder: "¿Cuál preferís?" });
      const options = textarea({ rows: "4", placeholder: "Una opción por línea\nOpción A\nOpción B" });
      const maxAnswer = input({ type: "number", min: "1", value: "1" });
      return {
        fields: [
          field("Pregunta", question,
            "Texto de la encuesta. Ej: ¿Qué horario te queda mejor?"),
          field("Opciones", options,
            "Una opción por línea (mínimo 2). Ej:\nMañana\nTarde\nNoche"),
          field("Máx. respuestas por persona", maxAnswer,
            "Cuántas opciones puede elegir cada participante. 1 = elección única. Ej: 1")
        ],
        validate: () => {
          if (!question.value.trim()) return "La pregunta es obligatoria";
          const opts = options.value.split("\n").map((s) => s.trim()).filter(Boolean);
          if (opts.length < 2) return "Cargá al menos 2 opciones (una por línea)";
          return null;
        },
        body: () => ({
          question: question.value.trim(),
          options: options.value.split("\n").map((s) => s.trim()).filter(Boolean),
          maxAnswer: parseInt(maxAnswer.value, 10) || 1
        })
      };
    }
  },
  {
    id: "contact", label: "Contacto", api: sendContact,
    build() {
      const fullName = input({ placeholder: "Juan Pérez" });
      const phone = input({ placeholder: "5491122334455" });
      const organization = input({ placeholder: "Mi Empresa S.A." });
      return {
        fields: [
          field("Nombre completo", fullName,
            "Nombre del contacto a compartir. Ej: Juan Pérez"),
          field("Teléfono", phone,
            "Número del contacto, formato internacional sin +. Ej: 5491122334455"),
          field("Organización", organization,
            "Empresa/organización del contacto. Opcional. Ej: Soporte Wago")
        ],
        validate: () => {
          if (!fullName.value.trim()) return "El nombre es obligatorio";
          if (!phone.value.trim()) return "El teléfono es obligatorio";
          return null;
        },
        body: () => ({
          vcard: {
            fullName: fullName.value.trim(),
            phone: phone.value.trim(),
            organization: organization.value.trim()
          }
        })
      };
    }
  },
  {
    id: "sticker", label: "Sticker", api: sendSticker,
    build() {
      const sticker = input({ placeholder: "https://.../sticker.webp" });
      return {
        fields: [field("Sticker (URL o base64)", sticker,
          "Imagen del sticker: URL pública (idealmente .webp) o data URI base64. Ej: https://misitio.com/sticker.webp")],
        validate: () => sticker.value.trim() ? null : "El sticker es obligatorio",
        body: () => ({ sticker: sticker.value.trim() })
      };
    }
  }
];
