export function $(id) {
  return document.getElementById(id);
}

export function bindToggle(container, onChange) {
  const buttons = [...container.querySelectorAll('button')];
  function set(value) {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', button.dataset.value === value ? 'true' : 'false');
    }
  }
  container.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !container.contains(button)) return;
    set(button.dataset.value);
    onChange(button.dataset.value);
  });
  const initial = buttons.find((button) => button.getAttribute('aria-pressed') === 'true');
  return { set, value: () => (buttons.find((b) => b.getAttribute('aria-pressed') === 'true') || {}).dataset.value || (initial && initial.dataset.value) };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function download(filename, text) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function armFlash(overlay) {
  let on = false;
  let timer = 0;
  return function set(next) {
    const edge = next && !on;
    on = next;
    if (!edge) {
      if (!next) overlay.classList.remove('pop');
      return on;
    }
    overlay.classList.remove('pop');
    void overlay.offsetWidth;
    overlay.classList.add('pop');
    clearTimeout(timer);
    timer = setTimeout(() => overlay.classList.remove('pop'), 1700);
    return on;
  };
}

export function round(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value) * 1000) / 1000;
}

export function fmt(value, digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(digits);
}
