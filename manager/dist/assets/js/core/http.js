import { getApiKey } from "./state.js";

/**
 * Low-level JSON request against the WebAPP-Wago API.
 * Auth is the `apikey` header: GLOBAL_API_KEY for admin routes,
 * the instance token for instance-scoped routes (pass via opts.key).
 */
export function request(method, path, opts = {}) {
  const headers = { apikey: opts.key != null ? opts.key : getApiKey() };
  let body;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  return fetch(path, { method, headers, body }).then((res) =>
    res.text().then((txt) => {
      let json = {};
      try { json = txt ? JSON.parse(txt) : {}; } catch { json = { error: txt }; }
      if (!res.ok) {
        const err = new Error(json.error || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return json;
    })
  );
}
