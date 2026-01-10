export function makeSelect(options, value) {
  const s = document.createElement('select');
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    s.appendChild(opt);
  });
  if (value != null) s.value = value;
  return s;
}

export function makeInput(value, readonly = false, type = 'text') {
  const i = document.createElement('input');
  i.type = type;
  i.value = value ?? '';
  if (readonly) i.readOnly = true;
  return i;
}
