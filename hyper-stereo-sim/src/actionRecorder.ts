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

interface RecorderCommentary {
  t: number;
  text: string;
  final: boolean;
}

interface RecorderMeta {
  startUrl: string;
  viewport: { width: number; height: number };
  userAgent: string;
  startedAt: string;
  durationMs: number;
  commentaryMode?: 'speech-recognition' | 'manual-note';
}

interface RecordingPayload {
  meta: RecorderMeta;
  events: RecorderEvent[];
  commentary?: RecorderCommentary[];
  appState?: unknown;
}

interface RecorderState {
  recording: boolean;
  replaying: boolean;
  micActive: boolean;
  startedAtMs: number;
  startedAtIso: string;
  startUrl: string;
  events: RecorderEvent[];
  commentary: RecorderCommentary[];
  durationMs: number;
  hasRecording: boolean;
  loadedReplay?: RecordingPayload;
  appState?: unknown;
  replayElapsedMs: number;
  replayDurationMs: number;
  replayCaption: string;
  replayEventText: string;
  commentaryMode?: 'speech-recognition' | 'manual-note';
}

export interface ActionRecorderSnapshot {
  recording: boolean;
  replaying: boolean;
  micActive: boolean;
  hasRecording: boolean;
  hasReplay: boolean;
  elapsedMs: number;
  replayElapsedMs: number;
  replayDurationMs: number;
  replayCaption: string;
  replayEventText: string;
  eventCount: number;
  commentaryCount: number;
}

export interface ActionRecorderApi {
  start: () => void;
  stop: () => void;
  save: () => void;
  replay: () => void;
  openReplayPicker: () => void;
  loadReplayFile: (file: File) => Promise<void>;
  toggleMic: () => Promise<void>;
  markTransition: (label: string) => void;
  setAppStateHandlers: (handlers: {
    capture: () => unknown;
    restore: (state: unknown) => void;
  }) => void;
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

type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

const getSpeechRecognition = (): SpeechRecognitionConstructor | undefined => {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
};

export const installActionRecorder = () => {
  if (window.__hyperStereoActionRecorderInstalled) return;
  window.__hyperStereoActionRecorderInstalled = true;

  const state: RecorderState = {
    recording: false,
    replaying: false,
    micActive: false,
    startedAtMs: 0,
    startedAtIso: '',
    startUrl: '',
    events: [],
    commentary: [],
    durationMs: 0,
    hasRecording: false,
    loadedReplay: undefined,
    appState: undefined,
    replayElapsedMs: 0,
    replayDurationMs: 0,
    replayCaption: '',
    replayEventText: '',
    commentaryMode: undefined
  };

  let timerId = 0;
  let lastScrollCapture = 0;
  let lastUrl = window.location.href;
  let recognition: SpeechRecognition | undefined;
  let replayAbort = false;
  let replayTimerId = 0;
  let appStateHandlers: { capture: () => unknown; restore: (state: unknown) => void } | undefined;
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
        width: 340px;
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
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
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
      .hsar-row {
        display: flex;
        gap: 6px;
        margin-top: 6px;
      }
      .hsar-file {
        display: none;
      }
      .hsar-commentary {
        margin-top: 8px;
        padding: 7px;
        border: 1px solid #2d2d2d;
        border-radius: 5px;
        background: rgba(255,255,255,0.04);
        color: #aaa;
        line-height: 1.35;
      }
      .hsar-replay-panel {
        display: none;
        margin-top: 8px;
        padding: 8px;
        border: 1px solid #333;
        border-radius: 5px;
        background: rgba(0,0,0,0.35);
      }
      .hsar-widget[data-replaying="true"] .hsar-replay-panel {
        display: block;
      }
      .hsar-progress {
        width: 100%;
        height: 6px;
        border-radius: 999px;
        background: #2a2a2a;
        overflow: hidden;
        margin-bottom: 7px;
      }
      .hsar-progress-fill {
        height: 100%;
        width: 0%;
        background: #5b9bd5;
      }
      .hsar-replay-time {
        color: #8fc5ff;
        font-weight: 800;
      }
      .hsar-event-text {
        margin-top: 5px;
        color: #ddd;
      }
      .hsar-caption {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        display: none;
        max-width: min(760px, calc(100vw - 420px));
        padding: 9px 13px;
        border-radius: 6px;
        background: rgba(0,0,0,0.82);
        color: #fff;
        font: 700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
        line-height: 1.35;
        box-shadow: 0 10px 28px rgba(0,0,0,0.45);
      }
      .hsar-caption:not(:empty) {
        display: block;
      }
      .hsar-commentary strong {
        color: #f2f2f2;
      }
      .hsar-widget[data-mic="true"] .hsar-mic {
        border-color: #ff3838;
        color: #ffb3b3;
      }
      .hsar-widget[data-replaying="true"] .hsar-replay {
        border-color: #f0a040;
        color: #ffd166;
      }
    </style>
    <div class="hsar-widget" data-recording="false" data-replaying="false" data-mic="false">
      <div class="hsar-status"><span class="hsar-dot"></span><span class="hsar-time">00:00</span><span class="hsar-count">0 events</span><span class="hsar-loaded"></span></div>
      <div class="hsar-controls">
        <button class="hsar-button hsar-start" type="button">Start</button>
        <button class="hsar-button hsar-stop" type="button" disabled>Stop</button>
        <button class="hsar-button hsar-save" type="button" disabled>Save/Download</button>
        <button class="hsar-button hsar-mic" type="button">Mic Notes</button>
        <button class="hsar-button hsar-load" type="button">Load Replay</button>
        <button class="hsar-button hsar-replay" type="button" disabled>Replay</button>
      </div>
      <input class="hsar-file" type="file" accept="application/json,.json" />
      <div class="hsar-replay-panel">
        <div class="hsar-progress"><div class="hsar-progress-fill"></div></div>
        <div><span class="hsar-replay-time">00:00 / 00:00</span></div>
        <div class="hsar-event-text">Ready</div>
      </div>
      <div class="hsar-commentary"><strong>Commentary:</strong> mic notes are exported as timestamped text for AI narration/context.</div>
      <div class="hsar-caption"></div>
    </div>
  `;

  const widget = shadow.querySelector('.hsar-widget') as HTMLElement;
  const startButton = shadow.querySelector('.hsar-start') as HTMLButtonElement;
  const stopButton = shadow.querySelector('.hsar-stop') as HTMLButtonElement;
  const saveButton = shadow.querySelector('.hsar-save') as HTMLButtonElement;
  const micButton = shadow.querySelector('.hsar-mic') as HTMLButtonElement;
  const loadButton = shadow.querySelector('.hsar-load') as HTMLButtonElement;
  const replayButton = shadow.querySelector('.hsar-replay') as HTMLButtonElement;
  const fileInput = shadow.querySelector('.hsar-file') as HTMLInputElement;
  const timeLabel = shadow.querySelector('.hsar-time') as HTMLElement;
  const countLabel = shadow.querySelector('.hsar-count') as HTMLElement;
  const loadedLabel = shadow.querySelector('.hsar-loaded') as HTMLElement;
  const progressFill = shadow.querySelector('.hsar-progress-fill') as HTMLElement;
  const replayTimeLabel = shadow.querySelector('.hsar-replay-time') as HTMLElement;
  const eventTextLabel = shadow.querySelector('.hsar-event-text') as HTMLElement;
  const captionLabel = shadow.querySelector('.hsar-caption') as HTMLElement;

  const elapsed = () => state.recording ? Math.round(performance.now() - state.startedAtMs) : state.durationMs;

  const formatMs = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const resolveByXpath = (xpath: string) => {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue instanceof Element ? result.singleNodeValue : undefined;
    } catch {
      return undefined;
    }
  };

  const elementTextMatches = (element: Element, text: string) =>
    normalizeText(element.textContent || element.getAttribute('aria-label')).includes(text);

  const resolveSelector = (selectors?: SelectorCandidates) => {
    if (!selectors) return undefined;

    const candidates: (Element | undefined | null)[] = [];
    if (selectors.testId) {
      candidates.push(document.querySelector(`[data-testid="${cssEscape(selectors.testId)}"]`));
      candidates.push(document.querySelector(`[data-test="${cssEscape(selectors.testId)}"]`));
    }
    if (selectors.id) candidates.push(document.getElementById(selectors.id));
    if (selectors.css) {
      try {
        const matches = Array.from(document.querySelectorAll(selectors.css));
        candidates.push(typeof selectors.nth === 'number' ? matches[selectors.nth] : matches[0]);
      } catch {
        // Keep walking lower-priority selectors.
      }
    }
    if (selectors.role && selectors.name) {
      candidates.push(
        Array.from(document.querySelectorAll('*')).find(element =>
          getExplicitRole(element) === selectors.role && getAccessibleName(element) === selectors.name
        )
      );
    }
    if (selectors.text) {
      candidates.push(
        Array.from(document.querySelectorAll('button,a,[role="button"],[role="menuitem"],[role="tab"],summary')).find(element =>
          elementTextMatches(element, selectors.text || '')
        )
      );
    }
    if (selectors.xpath) candidates.push(resolveByXpath(selectors.xpath));

    return candidates.find((candidate): candidate is Element => Boolean(candidate));
  };

  const setElementValue = (element: Element, value = '') => {
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        element.checked = value === 'true';
      } else {
        element.value = value;
      }
      return;
    }
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
      element.value = value;
      return;
    }
    if (element instanceof HTMLElement && element.isContentEditable) {
      element.innerText = value;
    }
  };

  const dispatchInputEvents = (element: Element, type: 'input' | 'change') => {
    element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  };

  const replayEvent = (event: RecorderEvent) => {
    if (event.type === 'navigation') {
      if (event.url && event.url !== window.location.href && event.url !== state.loadedReplay?.meta.startUrl) {
        history.pushState(null, '', event.url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      return;
    }

    if (event.type === 'scroll') {
      const target = resolveSelector(event.selectors);
      if (target instanceof HTMLElement && event.scroll) {
        target.scrollTo(event.scroll.x, event.scroll.y);
      } else if (event.scroll) {
        window.scrollTo(event.scroll.x, event.scroll.y);
      }
      return;
    }

    const target = resolveSelector(event.selectors);
    if (!target) return;

    if (event.type === 'click') {
      (target as HTMLElement).click();
      return;
    }

    if (event.type === 'input' || event.type === 'change') {
      setElementValue(target, event.value);
      dispatchInputEvents(target, event.type);
      return;
    }

    if (event.type === 'keypress') {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: event.key, bubbles: true, cancelable: true }));
    }
  };

  const describeTarget = (selectors?: SelectorCandidates) =>
    selectors?.name || selectors?.text || selectors?.id || selectors?.testId || selectors?.css || 'page';

  const describeEvent = (event: RecorderEvent) => {
    if (event.type === 'navigation') return event.value ? `Navigation: ${event.value}` : `Navigation: ${event.url}`;
    if (event.type === 'click') return `Click: ${describeTarget(event.selectors)}`;
    if (event.type === 'input') return `Input: ${describeTarget(event.selectors)} = ${event.value ?? ''}`;
    if (event.type === 'change') return `Change: ${describeTarget(event.selectors)} = ${event.value ?? ''}`;
    if (event.type === 'keypress') return `Key: ${event.key ?? ''} on ${describeTarget(event.selectors)}`;
    if (event.type === 'scroll') return `Scroll: ${event.scroll?.x ?? 0}, ${event.scroll?.y ?? 0}`;
    return event.type;
  };

  const currentCaptionFor = (elapsedMs: number) => {
    const commentary = state.loadedReplay?.commentary || [];
    const current = commentary
      .filter(item => item.t <= elapsedMs)
      .sort((a, b) => b.t - a.t)[0];
    if (!current) return '';
    return elapsedMs - current.t <= 6000 ? current.text : '';
  };

  const updateUi = () => {
    widget.dataset.recording = String(state.recording);
    widget.dataset.replaying = String(state.replaying);
    widget.dataset.mic = String(state.micActive);
    timeLabel.textContent = formatMs(elapsed());
    countLabel.textContent = `${state.events.length} event${state.events.length === 1 ? '' : 's'}`;
    loadedLabel.textContent = state.loadedReplay ? 'Replay loaded' : '';
    const progress = state.replayDurationMs > 0 ? Math.min(1, state.replayElapsedMs / state.replayDurationMs) : 0;
    progressFill.style.width = `${Math.round(progress * 100)}%`;
    replayTimeLabel.textContent = `${formatMs(state.replayElapsedMs)} / ${formatMs(state.replayDurationMs)}`;
    eventTextLabel.textContent = state.replayEventText || 'Ready';
    captionLabel.textContent = state.replayCaption;
    startButton.disabled = state.recording;
    stopButton.disabled = !state.recording;
    saveButton.disabled = state.recording || !state.hasRecording;
    micButton.disabled = !state.recording || state.replaying;
    loadButton.disabled = state.recording || state.replaying;
    replayButton.disabled = state.recording || state.replaying || !state.loadedReplay;
    micButton.textContent = state.micActive ? 'Stop Mic' : 'Mic Notes';
    replayButton.textContent = state.replaying ? 'Replaying' : 'Replay';
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
    replaying: state.replaying,
    micActive: state.micActive,
    hasRecording: state.hasRecording,
    hasReplay: Boolean(state.loadedReplay),
    elapsedMs: elapsed(),
    replayElapsedMs: state.replayElapsedMs,
    replayDurationMs: state.replayDurationMs,
    replayCaption: state.replayCaption,
    replayEventText: state.replayEventText,
    eventCount: state.events.length,
    commentaryCount: state.commentary.length
  });

  const stopMic = () => {
    if (!state.micActive) return;
    state.micActive = false;
    recognition?.stop();
    recognition = undefined;
    updateUi();
  };

  const addCommentary = (text: string, final: boolean) => {
    const normalized = normalizeText(text);
    if (!normalized || !state.recording) return;
    state.commentary.push({ t: elapsed(), text: normalized, final });
    updateUi();
  };

  const toggleMic = async () => {
    if (!state.recording) return;
    if (state.micActive) {
      stopMic();
      return;
    }

    const SpeechRecognitionApi = getSpeechRecognition();
    if (!SpeechRecognitionApi) {
      const note = window.prompt('Speech recognition is not available here. Add a manual commentary note?');
      if (note) {
        state.commentaryMode = 'manual-note';
        addCommentary(note, true);
      }
      return;
    }

    const instance = new SpeechRecognitionApi();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = navigator.language || 'en-US';
    instance.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) addCommentary(result[0]?.transcript || '', true);
      }
    };
    instance.onerror = () => {
      state.micActive = false;
      updateUi();
    };
    instance.onend = () => {
      state.micActive = false;
      updateUi();
    };
    recognition = instance;
    state.commentaryMode = 'speech-recognition';
    state.micActive = true;
    instance.start();
    updateUi();
  };

  const updateReplayProgress = (elapsedMs: number) => {
    state.replayElapsedMs = Math.min(elapsedMs, state.replayDurationMs);
    state.replayCaption = currentCaptionFor(state.replayElapsedMs);
    updateUi();
  };

  const startRecording = () => {
    if (state.recording) return;
    state.recording = true;
    state.startedAtMs = performance.now();
    state.startedAtIso = new Date().toISOString();
    state.startUrl = window.location.href;
    state.events = [];
    state.commentary = [];
    state.commentaryMode = undefined;
    state.appState = appStateHandlers?.capture();
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
    stopMic();
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
      durationMs: state.durationMs,
      commentaryMode: state.commentaryMode
    };
    const payload: RecordingPayload = {
      meta,
      events: state.events,
      commentary: state.commentary,
      appState: state.appState
    };
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

  const loadReplayFile = async (file: File) => {
    const payload = JSON.parse(await file.text()) as RecordingPayload;
    if (!payload?.meta?.startUrl || !Array.isArray(payload.events)) {
      throw new Error('Invalid recording file');
    }
    state.loadedReplay = payload;
    state.replayDurationMs = payload.meta.durationMs || payload.events[payload.events.length - 1]?.t || 0;
    state.replayElapsedMs = 0;
    state.replayCaption = '';
    state.replayEventText = 'Ready';
    updateUi();
  };

  const openReplayPicker = () => {
    if (state.recording || state.replaying) return;
    fileInput.click();
  };

  const sleep = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

  const replay = async () => {
    if (!state.loadedReplay || state.replaying || state.recording) return;
    replayAbort = false;
    state.replaying = true;
    state.replayElapsedMs = 0;
    state.replayDurationMs = state.loadedReplay.meta.durationMs || state.loadedReplay.events[state.loadedReplay.events.length - 1]?.t || 0;
    state.replayCaption = '';
    state.replayEventText = 'Restoring initial app state';
    updateUi();

    if (state.loadedReplay.appState !== undefined) {
      appStateHandlers?.restore(state.loadedReplay.appState);
      await sleep(150);
    }

    const replayStartedAt = performance.now();
    replayTimerId = window.setInterval(() => {
      updateReplayProgress(Math.round(performance.now() - replayStartedAt));
    }, 100);

    const events = state.loadedReplay.events;
    let previousTime = 0;
    for (const event of events) {
      if (replayAbort) break;
      const delay = Math.max(0, event.t - previousTime);
      previousTime = event.t;
      await sleep(delay);
      state.replayElapsedMs = event.t;
      state.replayCaption = currentCaptionFor(event.t);
      state.replayEventText = describeEvent(event);
      updateUi();
      replayEvent(event);
    }

    window.clearInterval(replayTimerId);
    updateReplayProgress(state.replayDurationMs);
    state.replaying = false;
    state.replayEventText = replayAbort ? 'Replay stopped' : 'Replay complete';
    state.replayCaption = '';
    updateUi();
  };

  window.__hyperStereoActionRecorder = {
    start: startRecording,
    stop: stopRecording,
    save: downloadRecording,
    replay,
    openReplayPicker,
    loadReplayFile,
    toggleMic,
    markTransition,
    setAppStateHandlers: (handlers) => {
      appStateHandlers = handlers;
    },
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
  micButton.addEventListener('click', () => void toggleMic());
  loadButton.addEventListener('click', openReplayPicker);
  replayButton.addEventListener('click', () => void replay());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    void loadReplayFile(file).catch(error => {
      window.alert(error instanceof Error ? error.message : 'Unable to load recording');
    });
    fileInput.value = '';
  });

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
