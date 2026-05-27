import { h } from "../../ui/dom.js";
import { modal } from "../../ui/modal.js";
import { renderWebhooks } from "./webhooks/webhooksList.js";

export function openWebhooksModal(inst) {
  const body = h("div", {});
  const m = modal(
    "Webhooks — " + (inst.name || inst.id),
    body,
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cerrar"])]
  );
  renderWebhooks(body, inst);
}
