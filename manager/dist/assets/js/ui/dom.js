/** Tiny hyperscript helper. `on*` keys become listeners, `html` sets innerHTML. */
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function spinner() {
  return h("div", { class: "center-load" }, [h("span", { class: "spinner" })]);
}

export function brandRow(titleText) {
  return h("div", { class: "brand-row" }, [
    h("img", { src: "/assets/favicon.svg", alt: "Wago" }),
    h("h1", {}, [titleText])
  ]);
}
