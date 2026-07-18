type RecorderEventType = 'click' | 'input' | 'change' | 'keypress' | 'scroll' | 'navigation';

interface SelectorCandidates {
  testId?: string;
  id?: string;
  role?: string;
  name?: string;
  text?: string;
  css?: string;
  xpath?: string;
  nth?: number;
}

interface RecorderEvent {
  t: number;
  type: RecorderEventType;
  url: string;
  selectors?: SelectorCandidates;
  value?: string;
  key?: string;
  scroll?: { x: number; y: number };
}

interface RecorderMeta {
  startUrl: string;
  viewport: { width: number; height: number };
  userAgent: string;
  startedAt: string;
  durationMs: number;
}

interface RecorderState {
  recording: boolean;
  startedAtMs: number;
  startedAtIso: string;
  startUrl: string;
  events: RecorderEvent[];
  durationMs: number;
  hasRecording: boolean;
}

export interface ActionRecorderSnapshot {
  recording: boolean;
  hasRecording: boolean;
  elapsedMs: number;
  eventCount: number;
}

export interface ActionRecorderApi {
  start: () => void;
  stop: () => void;
  save: () => void;
  markTransition: (label: string) => void;
  getSnapshot: () => ActionRecorderSnapshot;
  subscribe: (listener: (snapshot: ActionRecorderSnapshot) => void) => () => void;
}

declare global {
  interface Window {
    __hyperStereoActionRecorderInstalled?: boolean;
    __hyperStereoActionRecorder?: ActionRecorderApi;
  }
}

const WIDGET_HOST_ID = 'hsar-action-recorder-host';
const SELECTOR_LIMIT = 120;

const isElement = (target: EventTarget | null): target is Element => target instanceof Element;

const normalizeText = (text: string | null | undefined) =>
  (text || '').replace(/\s+/g, ' ').trim().slice(0, 160);

const cssEscape = (value: string) => {
  if ('CSS' in window && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\#.:,[\]()=>+~*^$|]/g, '\\$&');
};

const safeQueryCount = (selector: string) => {
  try {
    return document.querySelectorAll(selector).length;
  } catch {
    return 0;
  }
};

const attrSelector = (name: string, value: string) => `[${name}="${cssEscape(value)}"]`;

const tagSelector = (element: Element) => element.tagName.toLowerCase();

const textForSelector = (element: Element) => {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  if (!['button', 'a', 'summary', 'option'].includes(tag) && !['button', 'link', 'menuitem', 'tab', 'option'].includes(role || '')) {
    return undefined;
  }
  return normalizeText(element.textContent || element.getAttribute('aria-label'));
};

const getExplicitRole = (element: Element) => {
  const role = element.getAttribute('role');
  if (role) return role;
  const tag = element.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a' && element.hasAttribute('href')) return 'link';
  if (tag === 'select') return 'combobox';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'input') {
    const type = (element.getAttribute('type') || 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'range') return 'slider';
    if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
    return 'textbox';
  }
  return undefined;
};

const getAccessibleName = (element: Element) => {
  const ariaLabel = normalizeText(element.getAttribute('aria-label'));
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const label = labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent || '')
      .join(' ');
    const normalized = normalizeText(label);
    if (normalized) return normalized;
  }

  if (element instanceof HTMLInputElement && element.labels?.length) {
    const label = Array.from(element.labels).map(item => item.textContent || '').join(' ');
    const normalized = normalizeText(label);
    if (normalized) return normalized;
  }

  const title = normalizeText(element.getAttribute('title'));
  if (title) return title;

  return normalizeText(element.textContent || (element as HTMLInputElement).value);
};

const stableCssPath = (element: Element) => {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.documentElement && parts.length < 8) {
    let part = tagSelector(current);

    const testId = current.getAttribute('data-testid') || current.getAttribute('data-test');
    if (testId) {
      part += attrSelector(testId === current.getAttribute('data-testid') ? 'data-testid' : 'data-test', testId);
      parts.unshift(part);
      break;
    }

    if (current.id) {
      part += `#${cssEscape(current.id)}`;
      parts.unshift(part);
      break;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => child.tagName === current?.tagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;
  }

  const selector = parts.join(' > ');
  return selector.length > SELECTOR_LIMIT ? selector.slice(0, SELECTOR_LIMIT) : selector;
};

const xpathForElement = (element: Element) => {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const currentElement: Element = current;
    const tag = currentElement.tagName.toLowerCase();
    const parent: Element | null = currentElement.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }

    const siblings = Array.from(parent.children).filter((child): child is Element => child.tagName === currentElement.tagName);
    const index = siblings.length > 1 ? `[${siblings.indexOf(currentElement) + 1}]` : '';
    parts.unshift(`${tag}${index}`);
    current = parent;
  }

  return `/${parts.join('/')}`;
};

const selectorCandidatesFor = (element: Element): SelectorCandidates => {
  const dataTestId = element.getAttribute('data-testid') || element.getAttribute('data-test') || undefined;
  const id = element.id || undefined;
  const role = getExplicitRole(element);
  const name = role ? getAccessibleName(element) : undefined;
  const text = textForSelector(element);
  const css = stableCssPath(element);
  const xpath = xpathForElement(element);
  const nth = css ? Array.from(document.querySelectorAll(css)).indexOf(element) : -1;

  return {
    testId: dataTestId,
    id,
    role,
    name: name || undefined,
    text,
    css,
    xpath,
    nth: nth >= 0 && safeQueryCount(css) !== 1 ? nth : undefined
  };
};

const valueFor = (element: Element) => {
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') return String(element.checked);
    return element.value;
  }
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return element.value;
  if (element instanceof HTMLElement && element.isContentEditable) return element.innerText;
  return undefined;
};

const isTextEntryElement = (element: Element) => {
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  if (!(element instanceof HTMLInputElement)) return false;
  const type = (element.type || 'text').toLowerCase();
  return ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(type);
};

const shouldIgnoreEvent = (event: Event, host: HTMLElement) =>
  event.composedPath().some(item => item === host);

export const installActionRecorder = () => {
  if (window.__hyperStereoActionRecorderInstalled) return;
  window.__hyperStereoActionRecorderInstalled = true;

  const state: RecorderState = {
    recording: false,
    startedAtMs: 0,
    startedAtIso: '',
    startUrl: '',
    events: [],
    durationMs: 0,
    hasRecording: false
  };

  let timerId = 0;
  let lastScrollCapture = 0;
  let lastUrl = window.location.href;
  const subscribers = new Set<(snapshot: ActionRecorderSnapshot) => void>();

  const host = document.createElement('div');
  host.id = WIDGET_HOST_ID;
  host.style.position = 'fixed';
  host.style.right = '12px';
  host.style.bottom = '12px';
  host.style.zIndex = '2147483647';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .hsar-widget {
        box-sizing: border-box;
        min-width: 220px;
        padding: 10px;
        border: 1px solid rgba(255,255,255,0.22);
        border-radius: 8px;
        background: rgba(14,14,14,0.94);
        box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        color: #f2f2f2;
        font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .hsar-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .hsar-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #555;
      }
      .hsar-widget[data-recording="true"] .hsar-dot {
        background: #ff3838;
        box-shadow: 0 0 0 4px rgba(255,56,56,0.16);
      }
      .hsar-controls {
        display: flex;
        gap: 6px;
      }
      .hsar-button {
        appearance: none;
        border: 1px solid #3a3a3a;
        border-radius: 5px;
        background: #222;
        color: #f2f2f2;
        padding: 7px 9px;
        font: 700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        cursor: pointer;
      }
      .hsar-button:disabled {
        cursor: default;
        opacity: 0.38;
      }
      .hsar-button:not(:disabled):hover {
        border-color: #5b9bd5;
        color: #8fc5ff;
      }
    </style>
    <div class="hsar-widget" data-recording="false">
      <div class="hsar-status"><span class="hsar-dot"></span><span class="hsar-time">00:00</span><span class="hsar-count">0 events</span></div>
      <div class="hsar-controls">
        <button class="hsar-button hsar-start" type="button">Start</button>
        <button class="hsar-button hsar-stop" type="button" disabled>Stop</button>
        <button class="hsar-button hsar-save" type="button" disabled>Save/Download</button>
      </div>
    </div>
  `;

  const widget = shadow.querySelector('.hsar-widget') as HTMLElement;
  const startButton = shadow.querySelector('.hsar-start') as HTMLButtonElement;
  const stopButton = shadow.querySelector('.hsar-stop') as HTMLButtonElement;
  const saveButton = shadow.querySelector('.hsar-save') as HTMLButtonElement;
  const timeLabel = shadow.querySelector('.hsar-time') as HTMLElement;
  const countLabel = shadow.querySelector('.hsar-count') as HTMLElement;

  const elapsed = () => state.recording ? Math.round(performance.now() - state.startedAtMs) : state.durationMs;

  const formatMs = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const updateUi = () => {
    widget.dataset.recording = String(state.recording);
    timeLabel.textContent = formatMs(elapsed());
    countLabel.textContent = `${state.events.length} event${state.events.length === 1 ? '' : 's'}`;
    startButton.disabled = state.recording;
    stopButton.disabled = !state.recording;
    saveButton.disabled = state.recording || !state.hasRecording;
    const snapshot = getSnapshot();
    subscribers.forEach(listener => listener(snapshot));
  };

  const record = (event: Omit<RecorderEvent, 't' | 'url'>) => {
    if (!state.recording) return;
    state.events.push({
      t: elapsed(),
      url: window.location.href,
      ...event
    });
    updateUi();
  };

  const recordNavigationIfChanged = () => {
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;
    record({ type: 'navigation' });
  };

  const getSnapshot = (): ActionRecorderSnapshot => ({
    recording: state.recording,
    hasRecording: state.hasRecording,
    elapsedMs: elapsed(),
    eventCount: state.events.length
  });

  const startRecording = () => {
    if (state.recording) return;
    state.recording = true;
    state.startedAtMs = performance.now();
    state.startedAtIso = new Date().toISOString();
    state.startUrl = window.location.href;
    state.events = [];
    state.durationMs = 0;
    state.hasRecording = false;
    lastUrl = window.location.href;
    lastScrollCapture = 0;
    timerId = window.setInterval(updateUi, 250);
    record({ type: 'navigation' });
    updateUi();
  };

  const stopRecording = () => {
    if (!state.recording) return;
    state.durationMs = elapsed();
    state.recording = false;
    state.hasRecording = true;
    window.clearInterval(timerId);
    updateUi();
  };

  const downloadRecording = () => {
    if (!state.hasRecording) return;
    const meta: RecorderMeta = {
      startUrl: state.startUrl,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      userAgent: navigator.userAgent,
      startedAt: state.startedAtIso,
      durationMs: state.durationMs
    };
    const payload = { meta, events: state.events };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recording-${state.startedAtIso.replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const markTransition = (label: string) => {
    record({ type: 'navigation', value: label });
  };

  window.__hyperStereoActionRecorder = {
    start: startRecording,
    stop: stopRecording,
    save: downloadRecording,
    markTransition,
    getSnapshot,
    subscribe: (listener) => {
      subscribers.add(listener);
      listener(getSnapshot());
      return () => subscribers.delete(listener);
    }
  };

  startButton.addEventListener('click', startRecording);
  stopButton.addEventListener('click', stopRecording);
  saveButton.addEventListener('click', downloadRecording);

  document.addEventListener('click', (event) => {
    if (shouldIgnoreEvent(event, host) || !isElement(event.target)) return;
    record({ type: 'click', selectors: selectorCandidatesFor(event.target) });
  }, { capture: true, passive: true });

  document.addEventListener('input', (event) => {
    if (shouldIgnoreEvent(event, host) || !isElement(event.target)) return;
    record({ type: 'input', selectors: selectorCandidatesFor(event.target), value: valueFor(event.target) });
  }, { capture: true });

  document.addEventListener('change', (event) => {
    if (shouldIgnoreEvent(event, host) || !isElement(event.target)) return;
    record({ type: 'change', selectors: selectorCandidatesFor(event.target), value: valueFor(event.target) });
  }, { capture: true });

  document.addEventListener('keydown', (event) => {
    if (shouldIgnoreEvent(event, host) || !isElement(event.target)) return;
    const target = event.target;
    const shouldRecordKey = ['Enter', 'Tab', 'Escape'].includes(event.key) || isTextEntryElement(target);
    if (!shouldRecordKey) return;
    record({ type: 'keypress', selectors: selectorCandidatesFor(target), key: event.key });
  }, { capture: true });

  const handleScroll = (event: Event) => {
    if (!state.recording) return;
    const now = performance.now();
    if (now - lastScrollCapture < 100) return;
    lastScrollCapture = now;

    if (isElement(event.target) && event.target !== document.documentElement && event.target !== document.body) {
      record({
        type: 'scroll',
        selectors: selectorCandidatesFor(event.target),
        scroll: { x: event.target.scrollLeft, y: event.target.scrollTop }
      });
      return;
    }

    record({ type: 'scroll', scroll: { x: window.scrollX, y: window.scrollY } });
  };

  document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
  window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

  const originalPushState = history.pushState;
  history.pushState = function pushState(...args) {
    const result = originalPushState.apply(this, args);
    queueMicrotask(recordNavigationIfChanged);
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function replaceState(...args) {
    const result = originalReplaceState.apply(this, args);
    queueMicrotask(recordNavigationIfChanged);
    return result;
  };

  window.addEventListener('popstate', () => queueMicrotask(recordNavigationIfChanged), { capture: true, passive: true });
  window.addEventListener('hashchange', () => queueMicrotask(recordNavigationIfChanged), { capture: true, passive: true });
  window.addEventListener('beforeunload', () => {
    if (state.recording) stopRecording();
  }, { capture: true });

  updateUi();
};
