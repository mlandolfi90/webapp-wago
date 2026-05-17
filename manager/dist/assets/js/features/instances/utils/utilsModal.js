import { openTabbedForms } from "../_shared/tabbedForms.js";
import { UTIL_FORMS } from "./utilForms.js";

export function openUtilsModal(inst) {
  openTabbedForms({
    title: "Utilidades — " + (inst.name || inst.id),
    inst,
    forms: UTIL_FORMS
  });
}
