import { openTabbedForms } from "../_shared/tabbedForms.js";
import { NEWSLETTER_FORMS } from "./newsletterForms.js";

export function openNewslettersModal(inst) {
  openTabbedForms({
    title: "Newsletters — " + (inst.name || inst.id),
    inst,
    forms: NEWSLETTER_FORMS
  });
}
