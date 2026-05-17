import { openTabbedForms } from "../_shared/tabbedForms.js";
import { COMMUNITY_FORMS } from "./communityForms.js";

export function openCommunityModal(inst) {
  openTabbedForms({
    title: "Comunidades — " + (inst.name || inst.id),
    inst,
    forms: COMMUNITY_FORMS
  });
}
