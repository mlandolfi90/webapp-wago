import { openTabbedForms } from "../_shared/tabbedForms.js";
import { LABEL_FORMS } from "./labelForms.js";

export function openLabelsModal(inst) {
  openTabbedForms({
    title: "Etiquetas — " + (inst.name || inst.id),
    inst,
    forms: LABEL_FORMS
  });
}
