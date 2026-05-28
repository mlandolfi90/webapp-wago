// Vista Dashboard (placeholder, paridad con look pre-rebuild). ADR 0050.
import { h } from "../../ui/dom.js";
import { renderShell } from "../../core/shell.js";
import { goDashboard, goInstances } from "../../core/router.js";

function onNav(key) {
  if (key === "dashboard") goDashboard();
  else if (key === "instances") goInstances();
}

export function renderDashboardHome(root) {
  const main = renderShell(root, "dashboard", onNav);
  main.appendChild(
    h("div", { class: "container" }, [
      h("div", { class: "page-head" }, [h("h2", {}, ["Dashboard"])]),
      h("p", { class: "muted-sm" }, [
        "Contenido del dashboard será implementado aquí...",
      ]),
    ])
  );
}
