import { h, clear } from "../../ui/dom.js";
import { listInstances } from "../../core/api.js";
import { setInstances, getInstances } from "../../core/state.js";
import { renderShell } from "../../core/shell.js";
import { goDashboard, goInstances, goLogin } from "../../core/router.js";
import { instanceCard } from "./instanceCard.js";
import { openCreateModal } from "./createModal.js";
import { icoPlus, icoSearch } from "../../ui/icons.js";

function onNav(key) {
  if (key === "dashboard") goDashboard();
  else if (key === "instances") goInstances();
}

export function renderDashboard(root) {
  const main = renderShell(root, "instances", onNav);

  const grid = h("div", { class: "instances-grid" }, []);
  const reload = () => loadInstances(grid, searchInput.value);

  const searchInput = h("input", {
    class: "search-input",
    type: "text",
    placeholder: "Buscar instancias…",
  });
  searchInput.addEventListener("input", () => renderList(grid, searchInput.value));

  const newBtn = h(
    "button",
    { class: "btn btn-primary btn-with-ico", onclick: () => openCreateModal(reload) },
    [h("span", { class: "btn-ico", html: icoPlus() }), h("span", {}, ["Nueva instancia"])]
  );

  main.appendChild(
    h("div", { class: "container" }, [
      h("div", { class: "page-head with-actions" }, [
        h("div", {}, [
          h("h2", {}, ["Instancias"]),
          h("p", { class: "page-sub" }, [
            "Gestioná tus instancias de WhatsApp desde WebAPP-Wago.",
          ]),
        ]),
        h("div", { class: "page-actions" }, [newBtn]),
      ]),
      h("div", { class: "search-wrap" }, [
        h("span", { class: "search-ico", html: icoSearch() }),
        searchInput,
      ]),
      grid,
    ])
  );

  loadInstances(grid, "");
}

function renderList(grid, query) {
  const list = getInstances();
  const q = (query || "").trim().toLowerCase();
  const filtered = q
    ? list.filter((i) =>
        (i.name || "").toLowerCase().includes(q) ||
        (i.profileName || "").toLowerCase().includes(q) ||
        (i.jid || "").toLowerCase().includes(q))
    : list;
  clear(grid);
  if (!filtered.length) {
    grid.appendChild(h("div", { class: "empty" }, [
      q
        ? `Sin coincidencias para "${query}".`
        : "Sin instancias todavía. Creá la primera.",
    ]));
    return;
  }
  filtered.forEach((inst) => grid.appendChild(instanceCard(inst, () => loadInstances(grid, query))));
}

function loadInstances(grid, query) {
  clear(grid);
  grid.appendChild(h("div", { class: "center-load" }, [h("span", { class: "spinner" })]));

  listInstances()
    .then((res) => {
      setInstances(res.data || []);
      renderList(grid, query);
    })
    .catch((e) => {
      clear(grid);
      if (e.status === 401 || e.status === 403) { goLogin(); return; }
      grid.appendChild(h("div", { class: "empty" }, ["Error cargando instancias: " + e.message]));
    });
}
