import { h, clear, brandRow } from "../../ui/dom.js";
import { input, field, busy } from "../../ui/form.js";
import { toast } from "../../ui/feedback.js";
import { validateKey } from "../../core/api.js";
import { setApiKey } from "../../core/state.js";
import { goDashboard } from "../../core/router.js";

export function renderLogin(root) {
  clear(root);

  const keyInput = input({ type: "password", placeholder: "GLOBAL_API_KEY", autofocus: "true" });
  const submitBtn = h("button", { class: "btn btn-primary", style: "width:100%" }, ["Entrar"]);

  function submit() {
    const key = keyInput.value.trim();
    if (!key) { toast("La API Key es obligatoria", "err"); return; }
    const reset = busy(submitBtn, "Verificando...");
    validateKey(key)
      .then(() => { setApiKey(key); goDashboard(); })
      .catch((e) => {
        reset();
        const denied = e.status === 401 || e.status === 403;
        toast(denied ? "API Key inválida" : "Error: " + e.message, "err");
      });
  }

  submitBtn.addEventListener("click", submit);
  keyInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

  root.appendChild(
    h("div", { class: "login-wrap" }, [
      h("div", { class: "login-card" }, [
        brandRow("Wago Manager"),
        h("p", { class: "sub" }, ["Ingresá tu clave de API para administrar las instancias."]),
        field("Clave de API", keyInput),
        submitBtn
      ])
    ])
  );
}
