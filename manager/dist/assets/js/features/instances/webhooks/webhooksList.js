import { h, clear } from "../../../ui/dom.js";
import { busy } from "../../../ui/form.js";
import { toast, toastError } from "../../../ui/feedback.js";
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook } from "../../../core/api.js";
import { buildWebhookForm } from "./webhookForm.js";

const CT_LABEL = { any: "cualquiera", group: "solo grupos", individual: "solo individuales" };

/** Resumen humano del filtro para una fila. */
function filterSummary(w) {
  const parts = [];
  parts.push(Array.isArray(w.events) && w.events.length ? `${w.events.length} eventos` : "todos los eventos");
  parts.push(CT_LABEL[w.chatType || "any"] || w.chatType);
  parts.push(Array.isArray(w.chatIds) && w.chatIds.length ? `${w.chatIds.length} chats` : "cualquier chat");
  parts.push(Array.isArray(w.senders) && w.senders.length ? `${w.senders.length} autores` : "cualquier autor");
  if (Array.isArray(w.chatNames) && w.chatNames.length) {
    parts.push(`nombres grupo: ${w.chatNames.join(", ")}`);
  }
  if (Array.isArray(w.senderNames) && w.senderNames.length) {
    parts.push(`nombres autor: ${w.senderNames.join(", ")}`);
  }
  return parts.join(" · ");
}

function row(w, onEdit, onDelete) {
  const editBtn = h("button", { class: "btn btn-sm" }, ["Editar"]);
  const delBtn = h("button", { class: "btn btn-sm btn-danger" }, ["Borrar"]);
  editBtn.addEventListener("click", () => onEdit(w));
  delBtn.addEventListener("click", () => {
    if (!confirm("¿Borrar este webhook?")) return;
    onDelete(w);
  });
  const status = w.enabled === false
    ? h("span", { class: "badge badge-off" }, ["Pausado"])
    : h("span", { class: "badge badge-on" }, ["Activo"]);
  return h("div", { class: "card", style: "margin-bottom:8px" }, [
    h("div", { class: "row", style: "justify-content:space-between;gap:12px;align-items:flex-start" }, [
      h("div", { style: "min-width:0;flex:1" }, [
        h("div", { class: "row", style: "gap:8px;align-items:center" }, [status,
          h("b", { style: "word-break:break-all;user-select:all" }, [w.url || "(sin url)"])
        ]),
        h("div", { class: "muted-sm", style: "margin-top:4px" }, [filterSummary(w)])
      ]),
      h("div", { class: "row", style: "gap:6px" }, [editBtn, delBtn])
    ])
  ]);
}

export function renderWebhooks(area, inst) {
  const listBox = h("div", {});
  const formBox = h("div", { class: "card", style: "margin-bottom:12px" });
  const addBtn = h("button", { class: "btn btn-primary" }, ["+ Nuevo webhook"]);
  const headerRow = h("div", { class: "row", style: "justify-content:space-between;align-items:center;margin-bottom:8px" }, [
    h("div", { class: "muted-sm" }, [
      "N webhooks por instancia con filtros (events + tipo de chat + chats + autores). Coexisten con el webhook único del modal Conectar."
    ]),
    addBtn
  ]);

  function reload() {
    clear(listBox);
    listBox.appendChild(h("div", { class: "center-load" }, [h("span", { class: "spinner" })]));
    listWebhooks(inst.token)
      .then((res) => {
        clear(listBox);
        const arr = Array.isArray(res.data) ? res.data : [];
        if (!arr.length) {
          listBox.appendChild(h("div", { class: "empty" }, ["Sin webhooks. Usá '+ Nuevo' para crear uno."]));
          return;
        }
        arr.forEach((w) => listBox.appendChild(row(w, openEdit, doDelete)));
      })
      .catch((e) => { clear(listBox); listBox.appendChild(h("div", { class: "empty" }, ["Error: " + e.message])); });
  }

  function closeForm() { clear(formBox); formBox.style.display = "none"; }
  closeForm();

  function openCreate() {
    openForm(null);
  }
  function openEdit(w) {
    openForm(w);
  }
  function openForm(prefill) {
    formBox.style.display = "block";
    clear(formBox);
    const { fields, build, validate } = buildWebhookForm(prefill || undefined, inst.token);
    const saveBtn = h("button", { class: "btn btn-primary" }, [prefill ? "Guardar cambios" : "Crear webhook"]);
    const cancelBtn = h("button", { class: "btn" }, ["Cancelar"]);
    cancelBtn.addEventListener("click", closeForm);
    saveBtn.addEventListener("click", () => {
      const err = validate();
      if (err) { toast(err, "err"); return; }
      const body = build();
      const reset = busy(saveBtn, "Guardando...");
      const op = prefill
        ? updateWebhook(inst.token, prefill.id, body)
        : createWebhook(inst.token, body);
      op
        .then(() => { toast(prefill ? "Webhook actualizado" : "Webhook creado"); closeForm(); reload(); })
        .catch((e) => { reset(); toastError(e); });
    });
    formBox.appendChild(h("h4", { style: "margin:0 0 8px 0" }, [prefill ? "Editar webhook" : "Nuevo webhook"]));
    formBox.appendChild(fields);
    formBox.appendChild(h("div", { class: "row", style: "gap:8px;margin-top:10px;justify-content:flex-end" }, [cancelBtn, saveBtn]));
  }

  function doDelete(w) {
    deleteWebhook(inst.token, w.id)
      .then(() => { toast("Webhook borrado"); reload(); })
      .catch(toastError);
  }

  addBtn.addEventListener("click", openCreate);

  clear(area);
  area.appendChild(headerRow);
  area.appendChild(formBox);
  area.appendChild(listBox);
  reload();
}
