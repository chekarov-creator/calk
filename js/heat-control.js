export class HeatControl {
  constructor() {
    this.wrap = document.createElement('div');
    this.wrap.className = 'svgwrap';
    this.mode = 'rect';
    this.rectMask = 1 | 2 | 4 | 8;
    this.circleSegs = 12;
    this.circleMask = (1 << this.circleSegs) - 1;
    this.polyMask = 0;
    this.polyType = '';
    this.render();
  }

  countBits(x) {
    let c = 0;
    while (x) {
      c += x & 1;
      x >>= 1;
    }
    return c;
  }

  circleFraction() {
    return this.countBits(this.circleMask) / this.circleSegs;
  }

  setMode(m, polyLen = 0, pType = '') {
    this.mode = m;
    this.polyType = pType;
    if (this.mode === 'poly') {
      this.polyMask = (polyLen > 0) ? ((1 << polyLen) - 1) : 1;
    }
    this.render();
  }

  render() {
    this.wrap.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 120 140');
    svg.setAttribute('width', '140');
    svg.setAttribute('height', '120');

    if (this.mode === 'rect') {
      this.renderRect(svg, ns);
    } else if (this.mode === 'circle') {
      this.renderCircle(svg, ns);
    } else if (this.mode === 'poly') {
      this.renderPoly(svg, ns);
    } else {
      this.addLabel(svg, 'Введите P вручную');
    }

    this.wrap.appendChild(svg);
  }

  renderRect(svg, ns) {
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('x', '28');
    bg.setAttribute('y', '28');
    bg.setAttribute('width', '64');
    bg.setAttribute('height', '64');
    bg.setAttribute('class', 'shape-bg');
    svg.appendChild(bg);

    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', '28');
    rect.setAttribute('y', '28');
    rect.setAttribute('width', '64');
    rect.setAttribute('height', '64');
    rect.setAttribute('class', 'shape');
    svg.appendChild(rect);

    const segs = [
      { bit: 1, x1: 30, y1: 28, x2: 90, y2: 28, label: 'Верх' },
      { bit: 2, x1: 92, y1: 30, x2: 92, y2: 90, label: 'Право' },
      { bit: 4, x1: 30, y1: 92, x2: 90, y2: 92, label: 'Низ' },
      { bit: 8, x1: 28, y1: 30, x2: 28, y2: 90, label: 'Лево' },
    ];

    segs.forEach((s) => {
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', s.x1);
      l.setAttribute('y1', s.y1);
      l.setAttribute('x2', s.x2);
      l.setAttribute('y2', s.y2);
      l.setAttribute('class', 'seg' + ((this.rectMask & s.bit) ? ' on' : ''));
      l.setAttribute('data-side', s.label);
      l.setAttribute('title', `${s.label}: ${(this.rectMask & s.bit) ? 'обогревается' : 'не обогревается'} (клик для переключения)`);
      l.addEventListener('click', () => {
        this.rectMask ^= s.bit;
        if (this.rectMask === 0) this.rectMask = s.bit;
        this.render();
        this.wrap.dispatchEvent(new CustomEvent('change', { detail: this.getState() }));
      });
      svg.appendChild(l);
    });
  }

  renderCircle(svg, ns) {
    const cx = 60, cy = 60, r = 32;
    const bg = document.createElementNS(ns, 'circle');
    bg.setAttribute('cx', cx);
    bg.setAttribute('cy', cy);
    bg.setAttribute('r', r);
    bg.setAttribute('class', 'shape-bg');
    svg.appendChild(bg);

    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', cx);
    c.setAttribute('cy', cy);
    c.setAttribute('r', r);
    c.setAttribute('class', 'shape');
    svg.appendChild(c);

    for (let i = 0; i < this.circleSegs; i++) {
      const a1 = (i / this.circleSegs) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 1) / this.circleSegs) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const bit = (1 << i);
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', x1);
      l.setAttribute('y1', y1);
      l.setAttribute('x2', x2);
      l.setAttribute('y2', y2);
      l.setAttribute('class', 'seg' + ((this.circleMask & bit) ? ' on' : ''));
      l.setAttribute('title', `Сегмент ${i + 1}: ${(this.circleMask & bit) ? 'обогревается' : 'не обогревается'} (клик для переключения)`);
      l.addEventListener('click', () => {
        this.circleMask ^= bit;
        if (this.circleMask === 0) this.circleMask = bit;
        this.render();
        this.wrap.dispatchEvent(new CustomEvent('change', { detail: this.getState() }));
      });
      svg.appendChild(l);
    }
    this.addLabel(svg, `Клик по дугам: ${Math.round(this.circleFraction() * 100)}%`);
  }

  renderPoly(svg, ns) {
    const bg = document.createElementNS(ns, 'path');
    bg.setAttribute('class', 'shape-bg');
    bg.setAttribute('d', this.polyOutlinePath(this.polyType));
    svg.appendChild(bg);

    const segLines = this.polySegmentsForSvg(this.polyType);
    segLines.forEach((s, idx) => {
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', s.x1);
      l.setAttribute('y1', s.y1);
      l.setAttribute('x2', s.x2);
      l.setAttribute('y2', s.y2);
      l.setAttribute('class', 'seg' + ((this.polyMask & (1 << idx)) ? ' on' : ''));
      l.setAttribute('title', `Сегмент ${idx + 1}: ${(this.polyMask & (1 << idx)) ? 'обогревается' : 'не обогревается'} (клик для переключения)`);
      l.addEventListener('click', () => {
        this.polyMask ^= (1 << idx);
        if (this.polyMask === 0) this.polyMask = (1 << idx);
        this.render();
        this.wrap.dispatchEvent(new CustomEvent('change', { detail: this.getState() }));
      });
      svg.appendChild(l);
    });

    const outline = document.createElementNS(ns, 'path');
    outline.setAttribute('class', 'shape');
    outline.setAttribute('d', this.polyOutlinePath(this.polyType));
    svg.appendChild(outline);
    this.addLabel(svg, 'Клик по сегментам периметра');
  }

  polyOutlinePath(kind) {
    if (kind === 'i') return 'M28 30 H92 V40 H68 V80 H92 V90 H28 V80 H52 V40 H28 Z';
    if (kind === 'u') return 'M30 30 H90 V40 H40 V80 H90 V90 H30 Z';
    return 'M30 30 V90 H90 V80 H40 V30 Z';
  }

  polySegmentsForSvg(kind) {
    if (kind === 'i') {
      return [
        { x1: 28, y1: 30, x2: 92, y2: 30 },
        { x1: 92, y1: 30, x2: 92, y2: 40 },
        { x1: 92, y1: 40, x2: 68, y2: 40 },
        { x1: 68, y1: 40, x2: 68, y2: 80 },
        { x1: 68, y1: 80, x2: 92, y2: 80 },
        { x1: 92, y1: 80, x2: 92, y2: 90 },
        { x1: 92, y1: 90, x2: 28, y2: 90 },
        { x1: 28, y1: 90, x2: 28, y2: 80 },
        { x1: 28, y1: 80, x2: 52, y2: 80 },
        { x1: 52, y1: 80, x2: 52, y2: 40 },
        { x1: 52, y1: 40, x2: 28, y2: 40 },
        { x1: 28, y1: 40, x2: 28, y2: 30 },
      ];
    }
    if (kind === 'u') {
      return [
        { x1: 30, y1: 30, x2: 90, y2: 30 },
        { x1: 90, y1: 30, x2: 90, y2: 40 },
        { x1: 90, y1: 40, x2: 40, y2: 40 },
        { x1: 40, y1: 40, x2: 40, y2: 80 },
        { x1: 40, y1: 80, x2: 90, y2: 80 },
        { x1: 90, y1: 80, x2: 90, y2: 90 },
        { x1: 90, y1: 90, x2: 30, y2: 90 },
        { x1: 30, y1: 90, x2: 30, y2: 30 },
      ];
    }
    return [
      { x1: 30, y1: 30, x2: 30, y2: 90 },
      { x1: 30, y1: 90, x2: 90, y2: 90 },
      { x1: 90, y1: 90, x2: 90, y2: 80 },
      { x1: 90, y1: 80, x2: 40, y2: 80 },
      { x1: 40, y1: 80, x2: 40, y2: 30 },
      { x1: 40, y1: 30, x2: 30, y2: 30 },
    ];
  }

  addLabel(svg, txt) {
    const ns = 'http://www.w3.org/2000/svg';
    

    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', '60');
    t.setAttribute('y', '128');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', '8');
    t.setAttribute('fill', '#666');
    t.setAttribute('class', 'heat-label');
    
    if (txt.length > 25) {
      const mid = txt.lastIndexOf(' ', Math.floor(txt.length / 2));
      if (mid > 0) {
        t.textContent = txt.substring(0, mid);
        const tspan = document.createElementNS(ns, 'tspan');
        tspan.setAttribute('x', '60');
        tspan.setAttribute('dy', '9');
        tspan.textContent = txt.substring(mid + 1);
        t.appendChild(tspan);
      } else {
        t.textContent = txt;
      }
    } else {
      t.textContent = txt;
    }
    svg.appendChild(t);
  }

  getState() {
    return {
      mode: this.mode,
      rectMask: this.rectMask,
      circleFraction: this.circleFraction(),
      polyMask: this.polyMask,
      polyType: this.polyType
    };
  }

  getRectMask() {
    return this.rectMask;
  }

  getCircleFraction() {
    return this.circleFraction();
  }

  getPolyMask() {
    return this.polyMask;
  }

  get el() {
    return this.wrap;
  }
}
