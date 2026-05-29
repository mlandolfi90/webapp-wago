import { h, clear } from "../../ui/dom.js";
import { input, busy } from "../../ui/form.js";
import { toast } from "../../ui/feedback.js";
import { validateKey } from "../../core/api.js";
import { setApiKey } from "../../core/state.js";
import { goDashboard } from "../../core/router.js";

const LS_URL = "wago.apiUrl";

export function renderLogin(root) {
  clear(root);

  const urlInput = input({
    type: "text",
    name: "apiUrl",
    value: localStorage.getItem(LS_URL) || window.location.origin,
    placeholder: "http://127.0.0.1:8080",
  });
  const keyInput = input({
    type: "password",
    name: "apiKey",
    placeholder: "Tu clave de API",
    autofocus: "true",
  });
  const submitBtn = h("button", { class: "btn btn-primary btn-block" }, ["Entrar"]);

  function submit() {
    const key = keyInput.value.trim();
    if (!key) { toast("La API Key es obligatoria", "err"); return; }
    localStorage.setItem(LS_URL, urlInput.value.trim() || window.location.origin);
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
      h("div", { class: "login-stack" }, [
        h("h1", { class: "login-brand-big" }, ["WebAPP-Wago"]),
        h("div", { class: "login-card" }, [
          h("h2", { class: "login-title" }, ["Entrá en tu cuenta"]),
          h("p", { class: "login-sub" }, ["Ingresá tus credenciales para acceder al sistema"]),
          h("div", { class: "field" }, [
            h("label", {}, ["URL de la API WebAPP-Wago"]),
            urlInput,
          ]),
          h("div", { class: "field" }, [
            h("label", {}, ["API Key (GLOBAL_API_KEY)"]),
            keyInput,
          ]),
          h("p", { class: "login-tip" }, [
            h("b", {}, ["Tip: "]),
            "la API Key es el valor de la variable ",
            h("code", {}, ["GLOBAL_API_KEY"]),
            " configurada en el archivo .env de WebAPP-Wago.",
          ]),
          submitBtn,
        ]),
        h("p", { class: "login-foot" }, [
          "Al continuar, aceptás nuestros ",
          h("a", { href: "#", onclick: (e) => e.preventDefault() }, ["Términos de Servicio"]),
          " y ",
          h("a", { href: "#", onclick: (e) => e.preventDefault() }, ["Política de Privacidad"]),
          ".",
        ]),
      ]),
    ])
  );
}
