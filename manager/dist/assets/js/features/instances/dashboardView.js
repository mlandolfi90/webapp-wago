import { h, clear, brandRow } from "../../ui/dom.js";
import { toast } from "../../ui/feedback.js";
import { listInstances } from "../../core/api.js";
import { clearApiKey, setInstances, getInstances } from "../../core/state.js";
import { goLogin } from "../../core/router.js";
import { instanceCard } from "./instanceCard.js";
import { openCreateModal } from "./createModal.js";

function logout() {
  clearApiKey();
  goLogin();
}

export function renderDashboard(root) {
  clear(root);

  const grid = h("div", { class: "grid" }, []);
  const reload = () => loadInstances(grid);

  root.appendChild(
    h("div", { class: "topbar" }, [
      brandRow("Wago Manager"),
      h("div", { class: "topbar-actions" }, [
        h("a", {
          class: "btn btn-sm btn-ghost",
          href: "/swagger/index.html", target: "_blank", rel: "noopener"
        }, ["Swagger"]),
        h("button", { class: "btn btn-sm", onclick: logout }, ["Salir"])
      ])
    ])
  );

  root.appendChild(
    h("div", { class: "container" }, [
      h("div", { class: "page-head" }, [
        h("h2", {}, ["Instancias"]),
        h("div", { class: "row" }, [
          h("button", { class: "btn btn-sm", onclick: reload }, ["Actualizar"]),
          h("button", { class: "btn btn-primary btn-sm", onclick: () => openCreateModal(reload) }, ["Nueva instancia"])
        ])
      ]),
      grid
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
        grid.appendChild(h("div", { class: "empty" }, ["No hay instancias todavía. Creá la primera."]));
        return;
      }
      list.forEach((inst) => grid.appendChild(instanceCard(inst, reload)));
    })
    .catch((e) => {
      clear(grid);
      if (e.status === 401 || e.status === 403) { logout(); return; }
      grid.appendChild(h("div", { class: "empty" }, ["Error cargando instancias: " + e.message]));
    });
}
