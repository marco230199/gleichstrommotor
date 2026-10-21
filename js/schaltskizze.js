// ------------------------------------------------------------------
// Schaltskizze: Blick entlang der Drehachse (von vorne, wie die Kamera „Blick von vorne“)
// Stator (Magnetschalen oder Polkerne mit Feldspulen), mitdrehender Rotor (Spule mit Eisenkern,
// Doppel-T-Anker oder dreipoliger Anker) mit Polen, Kommutator, Bürsten, Schalter und Batterie. Beim Elektromagneten liegen die Feldspulen
// parallel zum Rotor an der Batterie.
// ------------------------------------------------------------------
import { state } from './state.js';
import { armatureCurrent, rotorCurrents, rotorOf, segmentCenter, fieldCurrent, statorField, rotorPole, statorPole, poleForceX } from './physik.js';
import { COMMUTATOR, GEO } from './config.js';
import { COLOR_A, COLOR_B, COLOR_C, COLOR_N, COLOR_S } from './materialien.js';

const $ = id => document.getElementById(id);
const INK = '#33404d', IRON = '#6b737c', IRON_DARK = '#4f565e', IRON_ROTOR = '#c9d0d8', COPPER = '#c46a2b';
const CURRENT = '#f57c00', FORCE = '#7b1fa2', FIELD = 'rgba(30, 136, 229, 0.45)';
// Polfarbe; ohne Pol die Eisenfarbe des Teils (Stator dunkler, Rotor heller)
const poleColor = (p, iron = IRON) => (p === 'N' ? COLOR_N : p === 'S' ? COLOR_S : iron);
const SEGMENT_COLORS = [COLOR_A, COLOR_B, COLOR_C];

function arrowHead(ctx, x, y, angle, size = 9) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - 0.45), y - size * Math.sin(angle - 0.45));
  ctx.lineTo(x - size * Math.cos(angle + 0.45), y - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

// Strompfeil auf einer Strecke von p nach q (Spitze in der Mitte)
function currentOnLine(ctx, p, q) {
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
  ctx.fillStyle = CURRENT;
  arrowHead(ctx, mx + (q.x - p.x) * 0.06, my + (q.y - p.y) * 0.06, Math.atan2(q.y - p.y, q.x - p.x), 10);
}

/** Dicker Kreisbogen (Canvas-Winkel, y nach unten) */
function arcBand(ctx, cx, cy, rIn, rOut, center, half, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, center - half, center + half);
  ctx.arc(cx, cy, rIn, center + half, center - half, true);
  ctx.closePath();
  ctx.fill();
}

function letter(ctx, text, x, y, size) {
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + size * 0.04);
}

export function drawSketch() {
  const cv = $('sketchCanvas');
  const W = cv.clientWidth, H = cv.clientHeight;
  if (W === 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const u = W / 100;                              // Zeichnungseinheit
  const cx = W / 2, cy = 40 * u;                  // Drehachse
  const k = 19 * u / GEO.rotorRadius;             // Maßstab: Rotorradius 19u
  const rr = GEO.rotorRadius * k, rs = (GEO.rotorRadius + GEO.airGap) * k;
  const shoeIn = (GEO.rotorRadius - GEO.shoeThickness) * k;
  const half = GEO.shoeHalf, rotorHalf = GEO.rotorShoeHalf;
  const elektro = state.stator === 'elektro';
  const phi = state.phi;
  const i = armatureCurrent(phi, state);
  const iField = fieldCurrent(state);
  const plusLeft = state.polarity > 0;

  // ---------------- Stator
  let coilEnds = null;
  if (!elektro) {
    const ringIn = rs + 7 * u;
    arcBand(ctx, cx, cy, ringIn, ringIn + 3 * u, 0, Math.PI, IRON_DARK);
    for (const side of [-1, 1]) {
      const pole = statorPole(side, state);
      const c = side < 0 ? Math.PI : 0;
      arcBand(ctx, cx, cy, rs, ringIn, c, half, poleColor(pole));
      letter(ctx, pole, cx + side * (rs + ringIn) / 2, cy, 6 * u);
    }
  } else {
    const coreIn = rs + 3 * u, yoke = rs + 13 * u;
    arcBand(ctx, cx, cy, yoke, yoke + 3 * u, 0, Math.PI, IRON_DARK);
    for (const side of [-1, 1]) {
      const pole = statorPole(side, state);
      const c = side < 0 ? Math.PI : 0;
      ctx.fillStyle = IRON;
      const x0 = side < 0 ? cx - yoke - 0.5 * u : cx + coreIn;
      ctx.fillRect(x0, cy - 4 * u, yoke - coreIn + 0.5 * u, 8 * u);
      arcBand(ctx, cx, cy, rs, coreIn, c, half, state.showPoles ? poleColor(pole) : IRON);
      if (state.showPoles && pole) letter(ctx, pole, cx + side * (rs + coreIn) / 2, cy, 4.5 * u);
      // Feldspule: Windungen über dem Polkern
      const a = cx + side * (coreIn + 1.5 * u), b = cx + side * (yoke - 1.5 * u);
      ctx.strokeStyle = COPPER;
      ctx.lineWidth = 1.6;
      const n = 5;
      for (let j = 0; j < n; j++) {
        const x = a + (b - a) * (j + 0.5) / n;
        ctx.beginPath(); ctx.ellipse(x, cy, 1.1 * u, 5.5 * u, 0, 0, 2 * Math.PI); ctx.stroke();
      }
      if (side < 0) coilEnds = { left: { top: { x: b, y: cy - 5.5 * u }, bottom: { x: a, y: cy + 5.5 * u } } };
      else Object.assign(coilEnds, { right: { top: { x: a, y: cy - 5.5 * u }, bottom: { x: b, y: cy + 5.5 * u } } });
    }
  }

  // Feldlinien zwischen den Polschuhen (hinter dem Rotor)
  const bField = statorField(state);
  if (state.showField && bField !== 0) {
    ctx.strokeStyle = ctx.fillStyle = FIELD;
    ctx.lineWidth = 1.5;
    for (const dy of [-13, -4.5, 4.5, 13]) {
      const y = cy + dy * u;
      const x = Math.sqrt(Math.max(0, rs * rs - (dy * u) ** 2));
      ctx.beginPath(); ctx.moveTo(cx - x, y); ctx.lineTo(cx + x, y); ctx.stroke();
      arrowHead(ctx, bField > 0 ? cx + x - 1 * u : cx - x + 1 * u, y, bField > 0 ? 0 : Math.PI, 8);
    }
  }

  // ---------------- Rotor: Eisenkern, Spulen, Polflächen mit Polen (nur wenn eingebaut)
  const ang = -phi;                               // Canvas: y nach unten
  const rotor = rotorOf(state);
  const armGeo = [];                              // je Arm: Winkel (Canvas), Radius für Buchstaben und Kraft
  if (state.rotorInstalled) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    if (state.rotor === 'spule') {
      const B = GEO.barHalf * k, END = 0.75 * k, h = GEO.armHeight * k;
      ctx.fillStyle = IRON_ROTOR;
      ctx.fillRect(-B + END, -h / 2, 2 * (B - END), h);
      ctx.fillStyle = COPPER;
      ctx.fillRect(-(B - END - 0.4 * k), -1.4 * k, 2 * (B - END - 0.4 * k), 2.8 * k);
      rotor.arms.forEach((arm, j) => {
        const pole = rotorPole(j, phi, state);
        ctx.fillStyle = state.showPoles ? poleColor(pole, IRON_ROTOR) : IRON_ROTOR;
        ctx.fillRect(j === 0 ? B - END : -B, -h / 2, END, h);
        ctx.fillStyle = SEGMENT_COLORS[j];                                 // Farbmarke wie die Kommutatorhälfte
        ctx.fillRect(j === 0 ? B - END - 0.3 * k : -B + END, -h * 0.35, 0.3 * k, h * 0.7);
        armGeo.push({ c: ang - arm.angle, labelR: B - END / 2, tipR: B, pole });
      });
    } else {
      const three = state.rotor === 'dreipolig';
      const h = (three ? 1.4 : GEO.armHeight) * k, shoeHalf = three ? GEO.rotorShoeHalf3 : GEO.rotorShoeHalf;
      ctx.fillStyle = IRON_ROTOR;
      ctx.beginPath(); ctx.arc(0, 0, 1.0 * k, 0, 2 * Math.PI); ctx.fill();
      for (const arm of rotor.arms) {
        ctx.save();
        ctx.rotate(-arm.angle);
        ctx.fillStyle = IRON_ROTOR;
        ctx.fillRect(0.6 * k, -h / 2, shoeIn - 0.6 * k, h);
        ctx.fillStyle = COPPER;
        if (three) ctx.fillRect(1.15 * k, -1.2 * k, 1.35 * k, 2.4 * k);
        else ctx.fillRect(1.25 * k, -1.4 * k, 1.3 * k, 2.8 * k);
        ctx.restore();
      }
      ctx.restore();
      ctx.save();
      rotor.arms.forEach((arm, j) => {
        const pole = rotorPole(j, phi, state);
        const c = ang - arm.angle;
        arcBand(ctx, cx, cy, shoeIn, rr, c, shoeHalf, state.showPoles ? poleColor(pole, IRON_ROTOR) : IRON_ROTOR);
        if (!three) arcBand(ctx, cx, cy, shoeIn - 1.2 * u, shoeIn, c, 0.3, SEGMENT_COLORS[j]);   // Farbmarke
        armGeo.push({ c, labelR: (shoeIn + rr) / 2, tipR: rr, pole });
      });
    }
    ctx.restore();
    for (const g of armGeo) {
      if (state.showPoles && g.pole) letter(ctx, g.pole, cx + g.labelR * Math.cos(g.c), cy + g.labelR * Math.sin(g.c), 4.5 * u);
    }
    // Kräfte auf die Rotorpole (waagrecht: Nordpol in Feldrichtung, Südpol entgegen)
    if (state.showForces) {
      armGeo.forEach((g, j) => {
        const f = poleForceX(j, phi, state);
        if (f === 0) return;
        const px = cx + g.tipR * Math.cos(g.c), py = cy + g.tipR * Math.sin(g.c);
        const len = (7 + 5 * Math.min(2, Math.abs(f) / 3)) * u, dir = Math.sign(f);
        ctx.strokeStyle = ctx.fillStyle = FORCE;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dir * len, py); ctx.stroke();
        arrowHead(ctx, px + dir * (len + 4), py, dir > 0 ? 0 : Math.PI, 10);
      });
    }
  }

  // ---------------- Kommutator (wenn aufgesetzt) und Bürsten (vorne)
  const rc = 6 * u;
  if (state.rotorInstalled && state.commutatorOn) {
    const n = rotor.segments, segHalf = Math.PI / n - rotor.gapHalf;
    ctx.lineWidth = 4 * u;
    ctx.lineCap = 'butt';
    for (let s2 = 0; s2 < n; s2++) {
      const center = -segmentCenter(rotor, s2, phi);
      ctx.strokeStyle = SEGMENT_COLORS[s2];
      ctx.beginPath(); ctx.arc(cx, cy, rc - 2 * u, center - segHalf, center + segHalf); ctx.stroke();
    }
    ctx.lineCap = 'round';
  }
  if (state.rotorInstalled) {
    ctx.fillStyle = '#5b636c';
    ctx.beginPath(); ctx.arc(cx, cy, 1.4 * u, 0, 2 * Math.PI); ctx.fill();
  }
  const bw = 4 * u, bh = 2 * rc * Math.tan(COMMUTATOR.brushHalf);
  ctx.fillStyle = '#333';
  ctx.fillRect(cx - rc - bw + 0.5 * u, cy - bh / 2, bw, bh);
  ctx.fillRect(cx + rc - 0.5 * u, cy - bh / 2, bw, bh);
  if (i.gap && state.powerOn && state.showCurrent) {
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.arc(cx + side * rc, cy, 4.5 * u, 0, 2 * Math.PI); ctx.stroke();
    }
  }

  // ---------------- Leitungen: Bürsten nach unten zu Schalter und Batterie
  const bl = cx - rc - bw + 0.5 * u, br = cx + rc + bw - 0.5 * u;   // äußere Enden der Bürsten
  const yb = cy + 40 * u;                                          // Höhe der Batterie
  const swY = cy + 29 * u;                                         // Schalter in der linken Leitung
    ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bl, cy); ctx.lineTo(bl - 4 * u, cy); ctx.lineTo(bl - 4 * u, swY - 4 * u);
  ctx.moveTo(bl - 4 * u, swY + 4 * u); ctx.lineTo(bl - 4 * u, yb); ctx.lineTo(cx - 5 * u, yb);
  ctx.moveTo(br, cy); ctx.lineTo(br + 4 * u, cy); ctx.lineTo(br + 4 * u, yb); ctx.lineTo(cx + 5 * u, yb);
  ctx.stroke();
  const lx = bl - 4 * u, rx = br + 4 * u;
  // Schalter
  ctx.fillStyle = INK;
  for (const y of [swY - 4 * u, swY + 4 * u]) { ctx.beginPath(); ctx.arc(lx, y, 2, 0, 2 * Math.PI); ctx.fill(); }
  ctx.beginPath();
  ctx.moveTo(lx, swY + 4 * u);
  if (state.powerOn) ctx.lineTo(lx, swY - 4 * u); else ctx.lineTo(lx - 6 * u, swY - 3 * u);
  ctx.stroke();
  // Batterie: langer Strich = Pluspol
  const plusX = plusLeft ? cx - 2 * u : cx + 2 * u, minusX = plusLeft ? cx + 2 * u : cx - 2 * u;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(plusX, yb - 5.5 * u); ctx.lineTo(plusX, yb + 5.5 * u); ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(minusX, yb - 3.5 * u); ctx.lineTo(minusX, yb + 3.5 * u); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 5 * u, yb); ctx.lineTo(cx - 2 * u, yb); ctx.moveTo(cx + 2 * u, yb); ctx.lineTo(cx + 5 * u, yb); ctx.stroke();
  ctx.font = `bold ${5 * u}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#c62828';
  ctx.fillText('+', plusX + (plusLeft ? -3.5 : 3.5) * u, yb - 5.5 * u);
  ctx.fillStyle = '#1e5bc6';
  ctx.fillText('−', minusX + (plusLeft ? 3.5 : -3.5) * u, yb - 5.5 * u);

  // Feldspulen parallel zum Rotor: Abzweig unterhalb des Schalters bzw. rechts auf gleicher Höhe
  let fieldPath = null;
  if (elektro && coilEnds) {
    const L = coilEnds.left, R = coilEnds.right;
    const topY = cy - (rs + 16.8 * u);
    const node = { l: { x: lx, y: swY + 6.5 * u }, r: { x: rx, y: swY + 6.5 * u } };   // Abzweig zu den Feldspulen
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L.top.x, L.top.y); ctx.lineTo(L.top.x, topY); ctx.lineTo(R.top.x, topY); ctx.lineTo(R.top.x, R.top.y);
    if (state.magnet > 0) {
      ctx.moveTo(node.l.x, node.l.y); ctx.lineTo(L.bottom.x, node.l.y); ctx.lineTo(L.bottom.x, L.bottom.y);
      ctx.moveTo(R.bottom.x, R.bottom.y); ctx.lineTo(R.bottom.x, node.r.y); ctx.lineTo(node.r.x, node.r.y);
    } else {
      // Feldspulen umgepolt: Anschlüsse über Kreuz
      const y2 = node.l.y + 3 * u;
      ctx.moveTo(node.l.x, node.l.y); ctx.lineTo(R.bottom.x, node.l.y); ctx.lineTo(R.bottom.x, R.bottom.y);
      ctx.moveTo(node.r.x, node.r.y); ctx.lineTo(node.r.x, y2); ctx.lineTo(L.bottom.x, y2); ctx.lineTo(L.bottom.x, L.bottom.y);
    }
    ctx.stroke();
    ctx.fillStyle = INK;
    for (const p of [node.l, node.r]) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 2 * Math.PI); ctx.fill(); }
    fieldPath = { node, L, R, topY };
  }

  // Stromrichtung (technisch, von + nach −)
  if (state.showCurrent && state.powerOn && state.current > 0) {
    const up = plusLeft;      // links fließt der Strom vom Pluspol hinauf
    if (i.armature !== 0) {
      currentOnLine(ctx, { x: lx, y: up ? swY - 4 * u : cy }, { x: lx, y: up ? cy : swY - 4 * u });
      currentOnLine(ctx, { x: rx, y: up ? cy : yb }, { x: rx, y: up ? yb : cy });
    }
    if (fieldPath && iField !== 0) {
      const { L, R, topY } = fieldPath;
      // iField > 0: Strom von links unten über die linke Spule, oben herüber, durch die rechte Spule nach unten
      const fwd = iField > 0;
      currentOnLine(ctx, fwd ? { x: L.top.x, y: topY } : { x: R.top.x, y: topY }, fwd ? { x: R.top.x, y: topY } : { x: L.top.x, y: topY });
      currentOnLine(ctx, { x: lx, y: up ? yb : swY + 4 * u }, { x: lx, y: up ? swY + 4 * u : yb });
    }
  }
}

/** Kurzer Text zu Bürsten, Kommutator und Feld */
export function sketchStatus() {
  const i = armatureCurrent(state.phi, state);
  const field = state.stator === 'elektro' ? ' Die Feldspulen liegen parallel zum Rotor.' : '';
  if (!state.rotorInstalled) return 'Kein Rotor eingebaut: Zwischen den Bürsten ist der Stromkreis offen.' + field;
  if (!state.commutatorOn) return 'Kommutator abgenommen: Die Bürsten berühren nichts, der Rotorstromkreis ist offen.' + field;
  if (!state.powerOn) return 'Schalter offen: Es fließt kein Strom.';
  if (state.current === 0) return 'Die Stromstärke ist null.';
  if (i.gap) {
    return state.omega !== 0
      ? 'Totpunkt: Die Bürsten liegen auf den Lücken, der Rotor ist stromlos. Er dreht durch seinen Schwung weiter.'
      : 'Totpunkt: Die Bürsten liegen auf den Lücken, der Rotor ist stromlos. Ohne Schwung bleibt er stehen.';
  }
  if (rotorOf(state).segments === 3) {
    const r = rotorCurrents(state.phi, state);
    const bridge = r.left.length > 1 || r.right.length > 1;
    return (bridge
      ? 'Eine Bürste berührt gerade zwei Segmente – die Spule dazwischen ist kurz stromlos.'
      : 'Dreiteiliger Kommutator: Der Strom teilt sich auf – eine Spule führt 2/3, die beiden anderen je 1/3.') + field;
  }
  const left = i.leftBrush === 'A' ? 'goldenen' : 'türkisen';
  const right = i.leftBrush === 'A' ? 'türkisen' : 'goldenen';
  return `Linke Bürste an der ${left} Hälfte, rechte Bürste an der ${right} Hälfte.${field}`;
}
