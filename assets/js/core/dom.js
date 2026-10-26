// 작은 DOM 헬퍼. h('div', { class: 'x', onClick }, child, [children], 'text')

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'style' && typeof value === 'object') {
        for (const [prop, v] of Object.entries(value)) {
          if (prop.startsWith('--')) el.style.setProperty(prop, v); // CSS 변수
          else el.style[prop] = v;
        }
      }
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'value') el.value = value;
      else if (value === true) el[key] = true;
      else el.setAttribute(key, value);
    }
  }
  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else parent.append(child instanceof Node ? child : String(child));
  }
  return parent;
}

/** 자식을 모두 교체한다. */
export function replace(parent, ...children) {
  parent.replaceChildren();
  return append(parent, children);
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
