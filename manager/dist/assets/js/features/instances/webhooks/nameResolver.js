import { listGroups, getContacts } from "../../../core/api.js";

/**
 * Cache lazy de nombres por JID. Una sola carga por token; comparte
 * resultado entre picker y prefill del form. Tolera errores de red
 * (devuelve el map parcial).
 */
const cacheByToken = new Map(); // token -> Promise<map>

export function loadNameMap(token) {
  if (!token) return Promise.resolve({});
  if (cacheByToken.has(token)) return cacheByToken.get(token);
  const p = Promise.all([
    listGroups(token).catch(() => ({ data: [] })),
    getContacts(token).catch(() => ({ data: {} }))
  ]).then(([gRes, cRes]) => {
    const map = {};
    const groups = Array.isArray(gRes.data) ? gRes.data : [];
    groups.forEach((g) => {
      const jid = g.JID || g.jid || "";
      const name = (g.GroupName && (g.GroupName.Name || g.GroupName.name)) || g.Name || "";
      if (jid && name) map[jid] = name;
    });
    const cData = cRes.data;
    if (Array.isArray(cData)) {
      cData.forEach((c) => {
        const jid = c.Jid || c.jid || c.JID || "";
        const name = c.FullName || c.fullName || c.PushName || c.pushName ||
                     c.BusinessName || c.businessName || "";
        if (jid && name) map[jid] = name;
      });
    } else if (cData && typeof cData === "object") {
      Object.keys(cData).forEach((k) => {
        const c = cData[k] || {};
        const name = c.FullName || c.fullName || c.PushName || c.pushName ||
                     c.BusinessName || c.businessName || "";
        if (name) map[k] = name;
      });
    }
    return map;
  });
  cacheByToken.set(token, p);
  return p;
}

/** Limpia el cache (testing / cambio de instancia). */
export function clearNameMapCache() { cacheByToken.clear(); }

/**
 * Formatea un JID + nombre como `Nombre <JID>` (estilo RFC 5322).
 * Si no hay nombre, devuelve el JID crudo (preserva wildcards
 * `*@g.us` que no tienen nombre asociado).
 */
export function formatJid(jid, nameMap) {
  if (!jid) return "";
  const name = nameMap && nameMap[jid];
  return name ? `${name} <${jid}>` : jid;
}

/**
 * Parsea una línea de la allowlist y devuelve solo el JID:
 *   "Mauro <549...>" → "549..."
 *   "<549...>"        → "549..."
 *   "*@g.us"          → "*@g.us"
 *   "549...@..."      → "549...@..."
 */
export function parseLineToJid(line) {
  const t = (line || "").trim();
  if (!t) return "";
  const m = t.match(/<([^>]+)>/);
  if (m) return m[1].trim();
  return t;
}

/** Aplica parseLineToJid sobre el contenido de una textarea. */
export function parseTextareaToJids(ta) {
  return (ta.value || "").split("\n").map(parseLineToJid).filter(Boolean);
}
