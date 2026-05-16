import { initRouter, goLogin, goDashboard } from "./core/router.js";
import { getApiKey } from "./core/state.js";
import { validateKey } from "./core/api.js";

const root = document.getElementById("app");
initRouter(root);

const key = getApiKey();
if (key) {
  validateKey(key).then(goDashboard).catch(goLogin);
} else {
  goLogin();
}
