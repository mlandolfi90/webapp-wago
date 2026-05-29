import { renderLogin } from "../features/auth/loginView.js";
import { renderDashboard } from "../features/instances/dashboardView.js";
import { renderDashboardHome } from "../features/dashboard-home/dashboardHomeView.js";
import { renderInstanceConfig } from "../features/instances/configView.js";

let root = null;

export function initRouter(rootEl) {
  root = rootEl;
}

export function goLogin() {
  renderLogin(root);
}

// goDashboard apunta a la Home placeholder (ADR 0050) — el flow post-
// login lleva ahí, como en el look WebAPP-Wago. Las instâncias viven en
// goInstances; el detalle de cada instancia en goInstanceConfig (ADR 0052).
export function goDashboard() {
  renderDashboardHome(root);
}

export function goInstances() {
  renderDashboard(root);
}

export function goInstanceConfig(inst) {
  renderInstanceConfig(root, inst);
}
