export class CalculationService {
  static ptm(S_cm2, P_cm) {
    return (S_cm2 > 0 && P_cm > 0) ? (S_cm2 * 10) / P_cm : NaN;
  }

  static massKgM(item, S_cm2) {
    return (item.mass_kgm && item.mass_kgm > 0) ? item.mass_kgm : (0.785 * S_cm2);
  }

  static sumSegments(segs, mask) {
    if (!segs || !segs.length) return NaN;
    let m = (typeof mask === 'number') ? mask : ((1 << segs.length) - 1);
    if (m === 0) m = 1;
    let s = 0;
    for (let i = 0; i < segs.length; i++) {
      if (m & (1 << i)) s += segs[i].len;
    }
    return s;
  }

  static segmentsI(h, b, tw, tf) {
    const step = (b - tw) / 2;
    const lens = [b, tf, step, (h - 2 * tf), step, tf, b, tf, step, (h - 2 * tf), step, tf];
    return lens.map(len => ({ len }));
  }

  static segmentsU(h, b, tw, tf) {
    const lens = [b, tf, (b - tw), (h - 2 * tf), (b - tw), tf, b, h];
    return lens.map(len => ({ len }));
  }

  static segmentsL(b1, b2, t) {
    const lens = [b2, t, (b2 - t), (b1 - t), t, b1];
    return lens.map(len => ({ len }));
  }

  static geom(item, rectMask, circleFraction, segMask) {
    const S_cm2 = (item.S_cm2 != null) ? Number(item.S_cm2) : NaN;

    if (item.kind === 'rhs') {
      const H = Number(item.H), B = Number(item.B), t = Number(item.t);
      const S = Number.isFinite(S_cm2) ? S_cm2 : ((H * B - (H - 2 * t) * (B - 2 * t)) / 100);
      const top = (rectMask & 1) ? B : 0;
      const right = (rectMask & 2) ? H : 0;
      const bottom = (rectMask & 4) ? B : 0;
      const left = (rectMask & 8) ? H : 0;
      return { S_cm2: S, P_cm: (top + right + bottom + left) / 10, kind: 'rhs', supports: 'rect' };
    }

    if (item.kind === 'pipe') {
      const D = Number(item.D), t = Number(item.t);
      const S = Number.isFinite(S_cm2) ? S_cm2 : ((Math.PI * (D * t - t * t)) / 100);
      const frac = (typeof circleFraction === 'number' && circleFraction > 0) ? circleFraction : 1.0;
      return { S_cm2: S, P_cm: (Math.PI * D * frac) / 10, kind: 'pipe', supports: 'circle' };
    }

    if (item.kind === 'round') {
      const D = Number(item.D);
      const S = Number.isFinite(S_cm2) ? S_cm2 : ((Math.PI * D * D / 4) / 100);
      const frac = (typeof circleFraction === 'number' && circleFraction > 0) ? circleFraction : 1.0;
      return { S_cm2: S, P_cm: (Math.PI * D * frac) / 10, kind: 'round', supports: 'circle' };
    }

    if (item.kind === 'plate') {
      const B = Number(item.B), t = Number(item.t);
      const S = Number.isFinite(S_cm2) ? S_cm2 : ((B * t) / 100);
      const top = (rectMask & 1) ? B : 0;
      const right = (rectMask & 2) ? t : 0;
      const bottom = (rectMask & 4) ? B : 0;
      const left = (rectMask & 8) ? t : 0;
      return { S_cm2: S, P_cm: (top + right + bottom + left) / 10, kind: 'plate', supports: 'rect' };
    }

    if (item.kind === 'i' || item.kind === 'u') {
      const h = Number(item.h), b = Number(item.b), tw = Number(item.tw), tf = Number(item.tf);
      const S = Number.isFinite(S_cm2) ? S_cm2 : ((2 * b * tf + (h - 2 * tf) * tw) / 100);
      const segs = (item.kind === 'i') ? CalculationService.segmentsI(h, b, tw, tf) : CalculationService.segmentsU(h, b, tw, tf);
      const P_mm = CalculationService.sumSegments(segs, segMask);
      return { S_cm2: S, P_cm: P_mm / 10, kind: item.kind, supports: 'poly', segCount: segs.length };
    }

    if (item.kind === 'l') {
      const b1 = Number(item.b1), b2 = Number(item.b2), t = Number(item.t);
      const S = Number.isFinite(S_cm2) ? S_cm2 : ((t * (b1 + b2 - t)) / 100);
      const segs = CalculationService.segmentsL(b1, b2, t);
      const P_mm = CalculationService.sumSegments(segs, segMask);
      return { S_cm2: S, P_cm: P_mm / 10, kind: 'l', supports: 'poly', segCount: segs.length };
    }

    return { S_cm2, P_cm: NaN, kind: item.kind || 'custom', supports: 'manual' };
  }
}
