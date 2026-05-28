import { renderLogin } from "../features/auth/loginView.js";
import { renderDashboard } from "../features/instances/dashboardView.js";
import { renderDashboardHome } from "../features/dashboard-home/dashboardHomeView.js";

let root = null;

export function initRouter(rootEl) {
  root = rootEl;
}

export function goLogin() {
  renderLogin(root);
}

// goDashboard apunta a la Home placeholder (ADR 0050) para recuperar el
// flow post-login del look WebAPP-Wago. Las instâncias viven en goInstances.
export function goDashboard() {
  renderDashboardHome(root);
}

export function goInstances() {
  renderDashboard(root);
}
