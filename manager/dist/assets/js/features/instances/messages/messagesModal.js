import { openTabbedForms } from "../_shared/tabbedForms.js";
import { MESSAGE_FORMS } from "./messageForms.js";

export function openMessagesModal(inst) {
  openTabbedForms({
    title: "Mensajes — " + (inst.name || inst.id),
    inst,
    forms: MESSAGE_FORMS
  });
}
