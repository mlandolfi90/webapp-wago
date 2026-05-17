import { openTabbedForms } from "../_shared/tabbedForms.js";
import { renderContacts, renderBlocklist } from "./contactsList.js";
import { USER_FORMS } from "./userForms.js";

export function openUsersModal(inst) {
  openTabbedForms({
    title: "Contactos — " + (inst.name || inst.id),
    inst,
    forms: [
      { id: "contacts", label: "Contactos", render: (area, i) => renderContacts(area, i) },
      { id: "blocklist", label: "Bloqueados", render: (area, i) => renderBlocklist(area, i) },
      ...USER_FORMS
    ]
  });
}
