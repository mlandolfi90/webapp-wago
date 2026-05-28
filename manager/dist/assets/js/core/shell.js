// App shell (ADR 0050): sidebar + topbar + footer envolviendo cada vista,
// recreando el look "WebAPP-Wago" pre-rebuild en vanilla puro.
import { h, clear } from "../ui/dom.js";
import { clearApiKey } from "./state.js";
import { goLogin } from "./router.js";

const NAV = [
  { key: "dashboard", label: "Dashboard", ico: "▦" },
  { key: "instances", label: "Instancias", ico: "▢" },
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

function sidebar(activeKey, onNav) {
  return h(
    "aside",
    { class: "sidebar" },
    [brand()].concat(
      NAV.map((it) =>
        h(
          "button",
          {
            class:
              "sidebar-item" + (it.key === activeKey ? " is-active" : ""),
            onclick: () => onNav(it.key),
          },
          [
            h("span", { class: "sidebar-item-ico" }, [it.ico]),
            h("span", {}, [it.label]),
          ]
        )
      )
    )
  );
}

function topbar() {
  return h("div", { class: "topbar" }, [
    h("div", {}, []),
    h("div", { class: "topbar-actions" }, [
      h(
        "a",
        {
          class: "btn btn-sm btn-ghost",
          href: "/swagger/index.html",
          target: "_blank",
          rel: "noopener",
        },
        ["Swagger"]
      ),
      h("button", { class: "btn btn-sm", onclick: logout }, ["Salir"]),
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
