// App shell (ADR 0050): sidebar + topbar + footer envolviendo cada vista,
// recreando el look "WebAPP-Wago" pre-rebuild en vanilla puro. Topbar con
// API Tester + Swagger + toggle de tema (ADR 0051) + Salir.
import { h, clear } from "../ui/dom.js";
import { clearApiKey } from "./state.js";
import { goLogin } from "./router.js";
import { getTheme, toggleTheme } from "./theme.js";
import {
  icoDashboard, icoInstances, icoApiTester, icoSwagger,
  icoMoon, icoSun, icoLogout,
} from "../ui/icons.js";

const NAV = [
  { key: "dashboard", label: "Dashboard", ico: icoDashboard },
  { key: "instances", label: "Instancias", ico: icoInstances },
];

function logout() {
  clearApiKey();
  goLogin();
}

function brand() {
  return h("div", { class: "brand-row" }, [
    h("img", { src: "/assets/favicon.svg", alt: "WebAPP-Wago" }),
    h("h1", {}, ["WebAPP-Wago"]),
  ]);
}

function navItem(it, activeKey, onNav) {
  return h(
    "button",
    {
      class: "sidebar-item" + (it.key === activeKey ? " is-active" : ""),
      onclick: () => onNav(it.key),
    },
    [
      h("span", { class: "sidebar-item-ico", html: it.ico() }),
      h("span", {}, [it.label]),
    ]
  );
}

function sidebar(activeKey, onNav) {
  return h(
    "aside",
    { class: "sidebar" },
    [brand()].concat(NAV.map((it) => navItem(it, activeKey, onNav)))
  );
}

function topAction(ico, label, attrs) {
  return h("a", Object.assign({ class: "btn btn-sm btn-ghost top-link" }, attrs), [
    h("span", { class: "top-ico", html: ico() }),
    h("span", { class: "top-label" }, [label]),
  ]);
}

function themeToggle() {
  const render = () => (getTheme() === "light" ? icoSun() : icoMoon());
  const labelText = () => (getTheme() === "light" ? "Modo claro" : "Modo oscuro");
  const icon = h("span", { class: "top-ico", html: render() });
  const btn = h(
    "button",
    {
      class: "btn btn-sm btn-ghost top-link top-icon-only",
      title: labelText(),
      "aria-label": "Cambiar tema",
      onclick: () => {
        toggleTheme();
        icon.innerHTML = render();
        btn.setAttribute("title", labelText());
      },
    },
    [icon]
  );
  return btn;
}

function topbarBrandMobile() {
  return h("div", { class: "topbar-brand-mobile" }, [
    h("img", { src: "/assets/favicon.svg", alt: "WebAPP-Wago" }),
    h("span", {}, ["WebAPP-Wago"]),
  ]);
}

function topbar() {
  return h("div", { class: "topbar" }, [
    topbarBrandMobile(),
    h("div", { class: "topbar-actions" }, [
      topAction(icoApiTester, "API Tester", {
        href: "/swagger/index.html", target: "_blank", rel: "noopener",
      }),
      topAction(icoSwagger, "Swagger", {
        href: "/swagger/index.html", target: "_blank", rel: "noopener",
      }),
      themeToggle(),
      h(
        "button",
        { class: "btn btn-sm top-link", onclick: logout },
        [h("span", { class: "top-ico", html: icoLogout() }), h("span", { class: "top-label" }, ["Salir"])]
      ),
    ]),
  ]);
}

function footer() {
  return h("footer", { class: "footer" }, [
    h("div", { class: "footer-brand" }, ["WebAPP-Wago"]),
    h("div", {}, ["© 2026 All rights reserved"]),
  ]);
}

export function renderShell(root, activeKey, onNav) {
  clear(root);
  const main = h("main", { class: "main-area" }, []);
  root.appendChild(
    h("div", { class: "shell" }, [
      sidebar(activeKey, onNav),
      h("div", { class: "shell-right" }, [topbar(), main, footer()]),
    ])
  );
  return main;
}
