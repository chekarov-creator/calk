export const $ = (s, p = document) => p.querySelector(s);
export const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

export const round = (n, d = 2) => {
  const k = Math.pow(10, d);
  return Math.round(n * k) / k;
};

export class MessageManager {
  constructor(errEl, okEl) {
    this.errEl = errEl;
    this.okEl = okEl;
  }

  showErr(msg) {
    this.errEl.style.display = 'inline';
    this.errEl.textContent = msg;
    this.okEl.style.display = 'none';
    this.okEl.textContent = '';
  }

  showOk(msg) {
    this.okEl.style.display = 'inline';
    this.okEl.textContent = msg;
    this.errEl.style.display = 'none';
    this.errEl.textContent = '';
  }

  hideMsg() {
    this.errEl.style.display = 'none';
    this.errEl.textContent = '';
    this.okEl.style.display = 'none';
    this.okEl.textContent = '';
  }
}

export function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
