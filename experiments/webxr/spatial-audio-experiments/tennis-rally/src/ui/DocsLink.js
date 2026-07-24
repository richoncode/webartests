const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  a.dl-btn {
    position: fixed; right: 12px; z-index: 2147483000;
    font: 700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #1a1a1a; color: #ccc; border: 1px solid #333; border-radius: 8px;
    padding: 9px 14px; text-decoration: none; display: inline-block;
  }
  a.dl-btn:hover { border-color: #5b9bd5; color: #fff; }
`;

// A single always-visible link, bottom-right, stacked with other DocsLink instances by `bottom`
// — a plain link rather than a Shadow DOM button with a click handler, since navigating away is
// the entire behavior. Used for both the Porting Guide and Audio Physics pages.
export class DocsLink {
  constructor({ href, label, title, bottom = 12 }) {
    this.host = document.createElement("div");
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <a class="dl-btn" style="bottom:${bottom}px" href="${href}" title="${title}">${label}</a>
    `;
  }

  dispose() {
    this.host.remove();
  }
}
