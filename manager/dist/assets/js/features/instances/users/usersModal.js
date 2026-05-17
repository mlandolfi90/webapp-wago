import { h, clear } from "../../../ui/dom.js";
import { modal } from "../../../ui/modal.js";
import { busy } from "../../../ui/form.js";
import { toast, toastError } from "../../../ui/feedback.js";
import { renderContacts, renderBlocklist } from "./contactsList.js";
import { USER_FORMS } from "./userForms.js";

const TABS = [
  { id: "contacts", label: "Contactos" },
  { id: "blocklist", label: "Bloqueados" },
  ...USER_FORMS.map((f) => ({ id: f.id, label: f.label, form: f }))
];

export function openUsersModal(inst) {
  let active = TABS[0];
  const area = h("div", {});

  const seg = h("div", { class: "seg" }, TABS.map((t) =>
    h("button", {
      type: "button",
      class: t.id === active.id ? "is-active" : "",
      onclick: () => select(t)
    }, [t.label])
  ));

  const m = modal(
    "Contactos — " + (inst.name || inst.id),
    h("div", {}, [seg, area]),
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cerrar"])]
  );

  function select(t) {
    active = t;
    seg.querySelectorAll("button").forEach((b, i) => {
      b.className = TABS[i].id === t.id ? "is-active" : "";
    });
    render();
  }

  function renderForm(f) {
    clear(area);
    const formArea = h("div", {});
    const resultArea = h("div", {});
    const goBtn = h("button", { class: "btn btn-primary" }, [f.result ? "Consultar" : "Aplicar"]);

    const mount = (prefill) => {
      const current = f.build(prefill);
      clear(formArea);
      current.fields.forEach((x) => formArea.appendChild(x));
      goBtn.onclick = () => {
        const err = current.validate();
        if (err) { toast(err, "err"); return; }
        const reset = busy(goBtn, "...");
        f.api(inst.token, current.body())
          .then((res) => {
            reset();
            if (f.result) f.result(res.data, resultArea);
            else toast(f.label + " ok");
          })
          .catch((e) => { reset(); toastError(e); });
      };
    };

    area.appendChild(formArea);
    area.appendChild(goBtn);
    area.appendChild(resultArea);

    if (f.load) {
      formArea.appendChild(h("div", { class: "center-load" }, [h("span", { class: "spinner" })]));
      f.load(inst.token)
        .then((res) => mount(res.data))
        .catch((e) => { clear(formArea); toastError(e); mount(); });
    } else {
      mount();
    }
  }

  function render() {
    if (active.id === "contacts") return renderContacts(area, inst);
    if (active.id === "blocklist") return renderBlocklist(area, inst);
    return renderForm(active.form);
  }

  render();
}
