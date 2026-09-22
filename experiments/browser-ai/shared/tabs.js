/**
 * Wire a tablist. Buttons use data-tab; panels use id="panel-<tab>".
 * @param {ParentNode} root
 * @param {{ onChange?: (id: string) => void }} [options]
 */
export function initTabs(root, options = {}) {
  const buttons = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];
  const known = new Set(buttons.map((button) => button.dataset.tab));

  function show(id, { updateHash = true } = {}) {
    const next = known.has(id) ? id : buttons[0]?.dataset.tab;
    if (!next) return;
    for (const button of buttons) {
      const on = button.dataset.tab === next;
      button.setAttribute('aria-selected', on ? 'true' : 'false');
      button.tabIndex = on ? 0 : -1;
    }
    for (const panel of panels) {
      panel.hidden = panel.id !== `panel-${next}`;
    }
    if (updateHash && location.hash.replace('#', '') !== next) {
      const url = new URL(location.href);
      url.hash = next;
      history.replaceState(null, '', url);
    }
    if (options.onChange) options.onChange(next);
  }

  for (const button of buttons) {
    button.addEventListener('click', () => show(button.dataset.tab));
  }

  const initial = location.hash.replace('#', '');
  show(known.has(initial) ? initial : undefined, { updateHash: false });

  window.addEventListener('hashchange', () => {
    show(location.hash.replace('#', ''), { updateHash: false });
  });

  return { show };
}
