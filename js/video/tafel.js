// ------------------------------------------------------------------
// Tafel im Video: eingeblendete 2D-Zeichnungen, jedes Bild neu gezeichnet.
//   'windungen'  – Leiterschleife (eine Windung) und Spule (viele Windungen, Eisenkern), Blick von vorne
//   'stabmagnet' – Feldlinien eines Stabmagneten und einer stromdurchflossenen Spule
//   'kompass'    – Kompassnadel im Magnetfeld zwischen zwei Polen, richtet sich entlang der Feldlinien aus
// tafel.wert (0 … 1) blendet den zweiten Teil einer Zeichnung ein, tafel.winkel dreht die Kompassnadel.
// Farben wie in der Simulation (Nordpol rot, Südpol grün, Feld blau, Kraft violett).
// ------------------------------------------------------------------
const $ = id => document.getElementById(id);
const INK = '#33404d', COPPER = '#c46a2b', IRON = '#9aa3ad', IRON_DARK = '#6b737c';
const NORD = '#d32f2f', SUED = '#2e7d32', FELD = '#1e88e5', KRAFT = '#7b1fa2';
const SCHRIFT = 'system-ui, sans-serif';

export const tafel = { modus: null, wert: 0, winkel: 60 };

// ---------------- Hilfen
function pfeilspitze(ctx, x, y, w, groesse = 16) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - groesse * Math.cos(w - 0.45), y - groesse * Math.sin(w - 0.45));
  ctx.lineTo(x - groesse * Math.cos(w + 0.45), y - groesse * Math.sin(w + 0.45));
  ctx.closePath();
  ctx.fill();
}
function pfeil(ctx, x0, y0, x1, y1, farbe, breite = 6) {
  ctx.strokeStyle = ctx.fillStyle = farbe;
  ctx.lineWidth = breite;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  pfeilspitze(ctx, x1, y1, Math.atan2(y1 - y0, x1 - x0), 22);
}
function text(ctx, s, x, y, { groesse = 40, farbe = INK, fett = false, ausrichtung = 'center' } = {}) {
  ctx.font = `${fett ? 'bold ' : ''}${groesse}px ${SCHRIFT}`;
  ctx.fillStyle = farbe;
  ctx.textAlign = ausrichtung;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
// Leiter im Querschnitt: ⊙ (Strom zum Betrachter, richtung > 0) oder ⊗
function leiter(ctx, x, y, r, richtung) {
  ctx.fillStyle = COPPER;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = ctx.fillStyle = '#fff';
  ctx.lineWidth = Math.max(2, r * 0.18);
  if (richtung > 0) {
    ctx.beginPath(); ctx.arc(x, y, r * 0.25, 0, 2 * Math.PI); ctx.fill();
  } else {
    const d = r * 0.5;
    ctx.beginPath(); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x - d, y + d); ctx.lineTo(x + d, y - d); ctx.stroke();
  }
}
// Polblock (Rechteck mit Buchstabe)
function pol(ctx, x, y, w, h, nord) {
  ctx.fillStyle = nord ? NORD : SUED;
  ctx.fillRect(x, y, w, h);
  text(ctx, nord ? 'N' : 'S', x + w / 2, y + h / 2, { groesse: 44, farbe: '#fff', fett: true });
}

// ---------------- 'windungen'
function windungen(ctx, W, H) {
  // Feld von links nach rechts zwischen zwei Polen, in beiden Hälften
  const haelfte = (x0, titel, buendel, kern) => {
    const cx = x0 + W / 4, cy = H / 2 + 30;
    pol(ctx, x0 + 20, 110, 46, H - 170, true);
    pol(ctx, x0 + W / 2 - 66, 110, 46, H - 170, false);
    ctx.strokeStyle = 'rgba(30, 136, 229, 0.35)';
    ctx.lineWidth = 3;
    for (const dy of [-200, -100, 0, 100, 200]) {
      ctx.beginPath(); ctx.moveTo(x0 + 80, cy + dy); ctx.lineTo(x0 + W / 2 - 80, cy + dy); ctx.stroke();
    }
    text(ctx, titel, cx, 52, { groesse: 42, fett: true });
    // Schleife unter 120° (Blick von vorne): unten rechts ⊙, oben links ⊗
    const R = 170, w = 120 * Math.PI / 180;
    const ox = R * Math.cos(w), oy = -R * Math.sin(w);
    if (kern > 0) {                                    // Eisenkern quer zur Schleife
      ctx.save();
      ctx.globalAlpha = kern;
      ctx.translate(cx, cy);
      ctx.rotate(-w + Math.PI / 2);
      ctx.fillStyle = IRON;
      ctx.fillRect(-190, -34, 380, 68);
      ctx.strokeStyle = IRON_DARK; ctx.lineWidth = 3;
      ctx.strokeRect(-190, -34, 380, 68);
      ctx.restore();
      ctx.globalAlpha = 1;
      text(ctx, 'Eisenkern', cx + 120, cy + 120, { groesse: 34, farbe: IRON_DARK, fett: true });
    }
    ctx.strokeStyle = COPPER; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx - ox, cy - oy); ctx.lineTo(cx + ox, cy + oy); ctx.stroke();
    for (const [s, richtung] of [[1, -1], [-1, 1]]) {   // s = +1: oben links (⊗), −1: unten rechts (⊙)
      const px = cx + s * ox, py = cy + s * oy;
      const punkte = buendel ? [[0, 0], [-26, 0], [26, 0], [-13, -23], [13, -23], [-13, 23], [13, 23]] : [[0, 0]];
      for (const [dx, dy] of punkte) leiter(ctx, px + dx, py + dy, buendel ? 13 : 22, richtung);
      // Kraft: ⊙ nach oben, ⊗ nach unten; bei der Spule n-fach
      const lang = buendel ? 150 : 70, dir = richtung > 0 ? -1 : 1;
      const y0 = py + dir * (buendel ? 50 : 32);
      pfeil(ctx, px, y0, px, y0 + dir * lang, KRAFT, buendel ? 10 : 6);
      text(ctx, buendel ? 'n · F' : 'F', px + 50, y0 + dir * lang * 0.75, { groesse: 38, farbe: KRAFT, fett: true, ausrichtung: 'left' });
    }
  };
  haelfte(0, 'Leiterschleife: 1 Windung', false, 0);
  ctx.save();
  ctx.globalAlpha = Math.min(1, tafel.wert * 2);
  haelfte(W / 2, 'Spule: n Windungen', true, Math.max(0, tafel.wert * 2 - 1));
  ctx.restore();
  ctx.strokeStyle = '#d5dce3'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W / 2, 30); ctx.lineTo(W / 2, H - 30); ctx.stroke();
}

// ---------------- Feldlinien eines Dipols (zwei „Polladungen“ an den Enden): Startpunkte um den Nordpol
function feldlinien(ctx, cx, cy, L, box) {
  const qN = [cx + L, cy], qS = [cx - L, cy];
  const feld = (x, y) => {
    let bx = 0, by = 0;
    for (const [q, s] of [[qN, 1], [qS, -1]]) {
      const dx = x - q[0], dy = y - q[1], r3 = Math.pow(dx * dx + dy * dy, 1.5) + 1e-6;
      bx += s * dx / r3; by += s * dy / r3;
    }
    const b = Math.hypot(bx, by);
    return [bx / b, by / b];
  };
  ctx.strokeStyle = ctx.fillStyle = FELD;
  ctx.lineWidth = 3;
  for (let k = 1; k < 12; k++) {
    const a = Math.PI * (k / 12) * 2 - Math.PI;             // rundherum um den Nordpol
    let x = qN[0] + 14 * Math.cos(a), y = qN[1] + 14 * Math.sin(a);
    const pts = [[x, y]];
    for (let i = 0; i < 2000; i++) {
      const [ux, uy] = feld(x, y);
      x += ux * 3; y += uy * 3;
      if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) break;
      if (Math.hypot(x - qS[0], y - qS[1]) < 14) break;
      pts.push([x, y]);
    }
    // nur der Teil außerhalb des Magneten (dort steht der Körper)
    const aussen = pts.filter(([px, py]) => !(Math.abs(px - cx) < L + 6 && Math.abs(py - cy) < 30));
    if (aussen.length < 2) continue;
    ctx.beginPath();
    aussen.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
    const m = Math.floor(aussen.length / 2);
    const [x1, y1] = aussen[m], [x0, y0] = aussen[m - 1];
    pfeilspitze(ctx, x1, y1, Math.atan2(y1 - y0, x1 - x0), 16);
  }
}

// ---------------- 'stabmagnet'
function stabmagnet(ctx, W, H) {
  const L = 130;
  // links: Stabmagnet
  const cx1 = W / 4, cy = H / 2 + 30;
  text(ctx, 'Stabmagnet', cx1, 52, { groesse: 42, fett: true });
  feldlinien(ctx, cx1, cy, L, [20, 100, W / 2 - 20, H - 20]);
  ctx.fillStyle = SUED; ctx.fillRect(cx1 - L - 10, cy - 30, L + 10, 60);
  ctx.fillStyle = NORD; ctx.fillRect(cx1, cy - 30, L + 10, 60);
  text(ctx, 'S', cx1 - L / 2, cy, { groesse: 40, farbe: '#fff', fett: true });
  text(ctx, 'N', cx1 + L / 2, cy, { groesse: 40, farbe: '#fff', fett: true });
  // rechts: Spule mit Strom
  ctx.save();
  ctx.globalAlpha = tafel.wert;
  const cx2 = 3 * W / 4;
  text(ctx, 'Spule mit Strom', cx2, 52, { groesse: 42, fett: true });
  feldlinien(ctx, cx2, cy, L, [W / 2 + 20, 100, W - 20, H - 20]);
  ctx.fillStyle = IRON; ctx.fillRect(cx2 - L - 10, cy - 22, 2 * L + 20, 44);
  ctx.strokeStyle = COPPER; ctx.lineWidth = 7;
  for (let k = 0; k <= 10; k++) {                          // Windungen
    const x = cx2 - L + 6 + k * (2 * L - 12) / 10;
    ctx.beginPath(); ctx.ellipse(x, cy, 9, 38, 0.18, 0, 2 * Math.PI); ctx.stroke();
  }
  text(ctx, 'S', cx2 - L - 40, cy, { groesse: 44, farbe: SUED, fett: true });
  text(ctx, 'N', cx2 + L + 40, cy, { groesse: 44, farbe: NORD, fett: true });
  ctx.restore();
  ctx.strokeStyle = '#d5dce3'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W / 2, 30); ctx.lineTo(W / 2, H - 30); ctx.stroke();
}

// ---------------- 'kompass'
function kompass(ctx, W, H) {
  const cy = H / 2 + 20;
  text(ctx, 'Eine Kompassnadel richtet sich entlang der Feldlinien aus', W / 2, 52, { groesse: 40, fett: true });
  pol(ctx, 60, 120, 90, H - 180, true);
  pol(ctx, W - 150, 120, 90, H - 180, false);
  ctx.strokeStyle = ctx.fillStyle = 'rgba(30, 136, 229, 0.55)';
  ctx.lineWidth = 4;
  for (const dy of [-240, -120, 0, 120, 240]) {
    const y = cy + dy;
    ctx.beginPath(); ctx.moveTo(180, y); ctx.lineTo(W - 180, y); ctx.stroke();
    for (const x of [380, W - 380]) pfeilspitze(ctx, x, y, 0, 22);
  }
  // Nadel: Nordhälfte rot, Südhälfte grün, Drehpunkt in der Mitte
  const w = -tafel.winkel * Math.PI / 180, L = 210, B = 34;
  ctx.save();
  ctx.translate(W / 2, cy);
  ctx.rotate(w);
  ctx.fillStyle = NORD;
  ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(0, -B); ctx.lineTo(0, B); ctx.closePath(); ctx.fill();
  ctx.fillStyle = SUED;
  ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, -B); ctx.lineTo(0, B); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, 2 * Math.PI); ctx.fill();
  ctx.restore();
}

const ZEICHNUNG = { windungen, stabmagnet, kompass };

/** Jedes Bild: aktuelle Zeichnung neu malen (nur wenn die Tafel sichtbar ist) */
export function tafelZeichnen() {
  const box = $('tafel');
  if (!tafel.modus || Number(box.style.opacity || 0) < 0.001) return;
  const cv = $('tafelCanvas'), ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.lineCap = 'round';
  ZEICHNUNG[tafel.modus](ctx, cv.width, cv.height);
}
