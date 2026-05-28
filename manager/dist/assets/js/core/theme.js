// Tema claro/oscuro (ADR 0051): toggle persistente que revierte el
// dark-only de ADR 0021. La preferencia vive en localStorage; se aplica
// sobre <html data-theme> y el CSS hace el resto vía [data-theme="light"].
const LS_THEME = "wago.theme";

export function getTheme() {
  return localStorage.getItem(LS_THEME) === "light" ? "light" : "dark";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme) {
  localStorage.setItem(LS_THEME, theme);
  applyTheme(theme);
}

export function toggleTheme() {
  const next = getTheme() === "light" ? "dark" : "light";
  setTheme(next);
  return next;
}
