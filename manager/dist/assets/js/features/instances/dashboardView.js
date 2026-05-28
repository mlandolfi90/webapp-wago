import { h, clear } from "../../ui/dom.js";
import { listInstances } from "../../core/api.js";
import { setInstances, getInstances } from "../../core/state.js";
import { renderShell } from "../../core/shell.js";
import { goDashboard, goInstances, goLogin } from "../../core/router.js";
import { instanceCard } from "./instanceCard.js";
import { openCreateModal } from "./createModal.js";

function onNav(key) {
  if (key === "dashboard") goDashboard();
  else if (key === "instances") goInstances();
}

export function renderDashboard(root) {
  const main = renderShell(root, "instances", onNav);

  const grid = h("div", { class: "grid" }, []);
  const reload = () => loadInstances(grid);

  main.appendChild(
    h("div", { class: "container" }, [
      h("div", { class: "page-head" }, [
        h("h2", {}, ["Instancias"]),
        h("div", { class: "row" }, [
          h("button", { class: "btn btn-sm", onclick: reload }, ["Actualizar"]),
          h(
            "button",
            { class: "btn btn-primary btn-sm", onclick: () => openCreateModal(reload) },
            ["Nueva instancia"]
          ),
        ]),
      ]),
      grid,
    ])
  );

  loadInstances(grid);
}

function loadInstances(grid) {
  clear(grid);
  grid.appendChild(h("div", { class: "center-load" }, [h("span", { class: "spinner" })]));
  const reload = () => loadInstances(grid);

  listInstances()
    .then((res) => {
      setInstances(res.data || []);
      clear(grid);
      const list = getInstances();
      if (!list.length) {
        grid.appendChild(h("div", { class: "empty" }, ["Sin instancias todavía. Creá la primera."]));
        return;
      }
      list.forEach((inst) => grid.appendChild(instanceCard(inst, reload)));
    })
    .catch((e) => {
      clear(grid);
      if (e.status === 401 || e.status === 403) { goLogin(); return; }
      grid.appendChild(h("div", { class: "empty" }, ["Error cargando instancias: " + e.message]));
    });
}
