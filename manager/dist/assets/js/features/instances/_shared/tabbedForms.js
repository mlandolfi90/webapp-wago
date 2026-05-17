import { h, clear } from "../../../ui/dom.js";
import { modal } from "../../../ui/modal.js";
import { busy } from "../../../ui/form.js";
import { toast, toastError } from "../../../ui/feedback.js";

/**
 * Modal genérico de "pestañas-formulario": un `seg` de formularios
 * declarativos. Consolida el patrón usado por dominios de gestión.
 *
 * forms: [{ id, label, api(token, body)->Promise,
 *   build(prefill)->{ fields:[Node], validate:()->string|null, body:()->object },
 *   result?(data, areaEl),   // si existe: renderiza salida, NO cierra
 *   load?(token)->Promise }] // precarga estado antes de build(prefill)
 */
export function openTabbedForms({ title, inst, forms }) {
  let active = forms[0];
  const area = h("div", {});

  const seg = h("div", { class: "seg" }, forms.map((f) =>
    h("button", {
      type: "button",
      class: f.id === active.id ? "is-active" : "",
      onclick: () => select(f)
    }, [f.label])
  ));

  const m = modal(
    title,
    h("div", {}, [seg, area]),
    [h("button", { class: "btn", onclick: () => m.close() }, ["Cerrar"])]
  );

  function select(f) {
    active = f;
    seg.querySelectorAll("button").forEach((b, i) => {
      b.className = forms[i].id === f.id ? "is-active" : "";
    });
    renderForm(f);
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

  renderForm(active);
}
