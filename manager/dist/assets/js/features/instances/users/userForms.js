import { h } from "../../../ui/dom.js";
import { input, textarea, field } from "../../../ui/form.js";
import { identityBlock } from "../../../ui/identity.js";
import {
  checkUser, getUserInfo, getAvatar, getPrivacy, setPrivacy,
  setProfileName, setProfileStatus, setProfilePicture
} from "../../../core/api.js";

const PRIVACY_OPTS = ["", "all", "contacts", "contact_blacklist", "none", "match_last_seen", "known"];
const PRIVACY_FIELDS = [
  ["lastSeen", "Última vez"], ["online", "En línea"], ["profile", "Foto de perfil"],
  ["status", "Estado"], ["readReceipts", "Confirmaciones de lectura"],
  ["groupAdd", "Quién me agrega a grupos"], ["callAdd", "Quién me puede llamar"]
];

function lines(t) { return t.value.split("\n").map((s) => s.trim()).filter(Boolean); }
function sel(value) {
  return h("select", { class: "input" },
    PRIVACY_OPTS.map((o) => h("option", { value: o, ...(o === value ? { selected: "" } : {}) },
      [o === "" ? "(sin cambiar)" : o])));
}
function showJSON(area, label, data) {
  area.replaceChildren(
    h("hr", { class: "sep" }),
    h("div", { class: "field-label", style: "margin-bottom:6px" }, [label]),
    h("div", { class: "input", style: "white-space:pre-wrap;word-break:break-all;user-select:all" },
      [JSON.stringify(data, null, 2)])
  );
}

/**
 * Catálogo declarativo de operaciones de usuario tipo formulario.
 * Cada entrada: { id, label, api, build(prefill)->{fields,validate,body},
 *   result?(data, areaEl), load?(token)->Promise(data) }.
 */
export const USER_FORMS = [
  {
    id: "check", label: "Verificar", api: checkUser,
    build() {
      const nums = textarea({ rows: "4", placeholder: "Un número por línea\n5491122334455" });
      return {
        fields: [field("Números (uno por línea)", nums,
          "Números en formato internacional sin +, uno por línea. Devuelve si están en WhatsApp + su JID/LID. Ej:\n5491122334455")],
        validate: () => lines(nums).length ? null : "Cargá al menos un número",
        body: () => ({ number: lines(nums) })
      };
    },
    result(data, area) {
      const arr = Array.isArray(data) ? data : (data && data.users) || [];
      area.replaceChildren(h("hr", { class: "sep" }));
      if (!arr.length) { area.appendChild(h("div", { class: "muted-sm" }, [JSON.stringify(data)])); return; }
      arr.forEach((u) => area.appendChild(h("div", { class: "card", style: "margin-bottom:8px" }, [
        identityBlock({
          name: u.VerifiedName || u.verifiedName || u.Query || u.query || "(usuario)",
          phone: (u.Query || u.query || ""),
          id: (u.LID || u.lid || u.JID || u.jid || "-"),
          idLabel: (u.LID || u.lid) ? "LID" : "JID"
        })
      ])));
    }
  },
  {
    id: "info", label: "Info", api: getUserInfo,
    build() {
      const nums = textarea({ rows: "4", placeholder: "Un número por línea\n5491122334455" });
      return {
        fields: [field("Números (uno por línea)", nums,
          "Devuelve info detallada (estado, foto, dispositivos, LID). Ej:\n5491122334455")],
        validate: () => lines(nums).length ? null : "Cargá al menos un número",
        body: () => ({ number: lines(nums) })
      };
    },
    result: (data, area) => showJSON(area, "Información de usuario", data)
  },
  {
    id: "avatar", label: "Avatar", api: getAvatar,
    build() {
      const num = input({ placeholder: "5491122334455" });
      const preview = h("input", { type: "checkbox" });
      return {
        fields: [
          field("Número", num, "Número en formato internacional sin +. Ej: 5491122334455"),
          h("div", { class: "check-row" }, [
            h("label", { class: "check" }, [preview, h("span", {}, ["Solo preview (baja resolución)"])])
          ])
        ],
        validate: () => num.value.trim() ? null : "El número es obligatorio",
        body: () => ({ number: num.value.trim(), preview: preview.checked })
      };
    },
    result(data, area) {
      const url = (data && (data.URL || data.url || data.PictureURL || data.pictureUrl)) ||
        (typeof data === "string" ? data : "");
      area.replaceChildren(h("hr", { class: "sep" }));
      if (url) {
        area.appendChild(h("img", { src: url, alt: "avatar", style: "max-width:160px;border-radius:10px;display:block;margin-bottom:8px" }));
        area.appendChild(h("div", { class: "input", style: "user-select:all;word-break:break-all" }, [url]));
      } else {
        area.appendChild(h("div", { class: "muted-sm" }, ["Sin avatar disponible o privado."]));
      }
    }
  },
  {
    id: "privacy", label: "Privacidad", api: setPrivacy,
    load: (token) => getPrivacy(token),
    build(prefill) {
      const cur = prefill || {};
      const ctrls = {};
      const fields = PRIVACY_FIELDS.map(([key, label]) => {
        const s = sel(cur[key] || cur[key.toLowerCase()] || "");
        ctrls[key] = s;
        return field(label, s,
          "all: todos · contacts: mis contactos · contact_blacklist: contactos excepto… · none: nadie · (sin cambiar): deja el valor actual");
      });
      return {
        fields,
        validate: () => null,
        body: () => {
          const b = {};
          PRIVACY_FIELDS.forEach(([k]) => { if (ctrls[k].value) b[k] = ctrls[k].value; });
          return b;
        }
      };
    }
  },
  {
    id: "pname", label: "Mi nombre", api: setProfileName,
    build() {
      const v = input({ placeholder: "Tu nombre visible" });
      return {
        fields: [field("Nombre de perfil", v, "Nombre público de tu cuenta de WhatsApp. Ej: Soporte Wago")],
        validate: () => v.value.trim() ? null : "El nombre es obligatorio",
        body: () => ({ name: v.value.trim() })
      };
    }
  },
  {
    id: "pstatus", label: "Mi estado", api: setProfileStatus,
    build() {
      const v = input({ placeholder: "Disponible · Atiendo de 9 a 18" });
      return {
        fields: [field("Mensaje de estado", v, "Texto de estado/recado de tu perfil. Ej: Respondemos en el día")],
        validate: () => v.value.trim() ? null : "El estado es obligatorio",
        body: () => ({ status: v.value.trim() })
      };
    }
  },
  {
    id: "ppic", label: "Mi foto", api: setProfilePicture,
    build() {
      const v = input({ placeholder: "https://.../foto.jpg" });
      return {
        fields: [field("Imagen (URL o base64)", v, "Foto de perfil: URL pública (JPG/PNG) o data URI base64.")],
        validate: () => v.value.trim() ? null : "La imagen es obligatoria",
        body: () => ({ image: v.value.trim() })
      };
    }
  }
];
