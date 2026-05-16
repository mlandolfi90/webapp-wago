import { renderLogin } from "../features/auth/loginView.js";
import { renderDashboard } from "../features/instances/dashboardView.js";

let root = null;

export function initRouter(rootEl) {
  root = rootEl;
}

export function goLogin() {
  renderLogin(root);
}

export function goDashboard() {
  renderDashboard(root);
}
