import { initRouter, goLogin, goDashboard } from "./core/router.js";
import { getApiKey } from "./core/state.js";
import { validateKey } from "./core/api.js";
import { applyTheme, getTheme } from "./core/theme.js";

applyTheme(getTheme());

const root = document.getElementById("app");
initRouter(root);

const key = getApiKey();
if (key) {
  validateKey(key).then(goDashboard).catch(goLogin);
} else {
  goLogin();
}
