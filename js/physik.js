// ------------------------------------------------------------------
// Physik des Gleichstrommotors im Polmodell (ohne 3D, testbar mit node --test)
//
// Blick von vorne entlang der Drehachse (z zeigt zum Betrachter), Statorfeld in x-Richtung.
// Der Rotor ist ein Elektromagnet aus einer oder mehreren Spulen. Jede Spule magnetisiert ihren
// Eisenkern in eine feste Richtung (Winkel im Rotor); Strom positiv → Moment in diese Richtung.
// Drehmoment im Statorfeld: τ = Σ m × B, also τ = −K · f · B_x · Σ i_Spule · sin(phi + Winkel).
//
// Die Rotoren unterscheiden sich durch ihren Kommutator (Zahl der Segmente) und ihre Spulen:
//   spule     – Eisenstab mit einer Spule, zweiteiliger Kommutator (Übergang von der Leiterschleife)
//   doppelT   – Doppel-T-Anker: zwei Spulen in Reihe, Polschuhe, zweiteiliger Kommutator
//   dreipolig – drei Arme mit je einer Spule (Dreieckschaltung), dreiteiliger Kommutator: kein Totpunkt
// ------------------------------------------------------------------
import { MODEL, COMMUTATOR } from './config.js';

const TAU = 2 * Math.PI;

/**
 * Beschreibung der Rotoren.
 * segments: Zahl der Kommutatorsegmente; segOffset: Lage von Segment 0 relativ zum Rotor (rad);
 * gapHalf: halbe Lücke zwischen den Segmenten.
 * coils: Spulen zwischen Segment a und b; Strom von a nach b magnetisiert in Richtung angle.
 * arms: Arme/Enden des Eisenkerns mit Pol: Winkel, zugehörige Spule und Vorzeichen (+1: Nordpol bei positivem Strom).
 */
export const ROTORS = {
  spule: {
    name: 'Spule mit Eisenkern',
    segments: 2, segOffset: Math.PI / 2, gapHalf: COMMUTATOR.gapHalf,
    coils: [{ a: 0, b: 1, angle: 0 }],
    arms: [{ angle: 0, coil: 0, sign: 1 }, { angle: Math.PI, coil: 0, sign: -1 }],
    torqueFactor: 0.75,          // ohne Polschuhe: schwächere Kopplung an das Statorfeld
    deadPoint: true,
  },
  doppelT: {
    name: 'Doppel-T-Anker',
    segments: 2, segOffset: Math.PI / 2, gapHalf: COMMUTATOR.gapHalf,
    coils: [{ a: 0, b: 1, angle: 0 }],
    arms: [{ angle: 0, coil: 0, sign: 1 }, { angle: Math.PI, coil: 0, sign: -1 }],
    torqueFactor: 1,
    deadPoint: true,
  },
  dreipolig: {
    name: 'Dreipoliger Anker',
    segments: 3, segOffset: COMMUTATOR.threePoleOffset, gapHalf: COMMUTATOR.threePoleGapHalf,
    coils: [0, 1, 2].map(j => ({ a: j, b: (j + 1) % 3, angle: j * TAU / 3 })),
    arms: [0, 1, 2].map(j => ({ angle: j * TAU / 3, coil: j, sign: 1 })),
    torqueFactor: 1,
    deadPoint: false,
  },
};

const BRUSHES = { left: Math.PI, right: 0 };
const angDist = (a, b) => Math.abs(((a - b) % TAU + 3 * Math.PI) % TAU - Math.PI);
export const rotorOf = s => ROTORS[s.rotor || 'doppelT'];
/** Ist ein Rotor mit Kommutator eingebaut? (Sonst berühren die Bürsten nichts.) */
export const commutatorContact = s => s.rotorInstalled !== false && s.commutatorOn !== false;

/** Mitte von Kommutatorsegment k beim Rotorwinkel phi */
export function segmentCenter(rotor, k, phi) {
  return phi + rotor.segOffset + k * TAU / rotor.segments;
}

/** Segmente, die eine Bürste (Winkel beta) berührt */
function contacts(rotor, phi, beta) {
  const half = Math.PI / rotor.segments - rotor.gapHalf + COMMUTATOR.brushHalf;
  const list = [];
  for (let k = 0; k < rotor.segments; k++) if (angDist(beta, segmentCenter(rotor, k, phi)) < half) list.push(k);
  return list;
}

/**
 * Ströme in den Rotorspulen. Das Netzgerät liefert die eingestellte Stromstärke I; sie teilt sich
 * auf die Wege zwischen den Bürsten auf (alle Spulen mit gleichem Widerstand).
 * @returns {{ coils: number[], armature: number, gap: boolean, left: number[], right: number[] }}
 *   armature: Strom durch die Bürsten (mit Vorzeichen der Polung), gap: Bürste auf einer Lücke (Stromkreis offen)
 */
export function rotorCurrents(phi, s) {
  const rotor = rotorOf(s);
  const zero = rotor.coils.map(() => 0);
  if (!commutatorContact(s)) return { coils: zero, armature: 0, gap: false, left: [], right: [], open: true };
  const left = contacts(rotor, phi, BRUSHES.left), right = contacts(rotor, phi, BRUSHES.right);
  const gap = left.length === 0 || right.length === 0;
  if (gap || !(s.powerOn && s.current > 0)) return { coils: zero, armature: 0, gap, left, right };

  // Potentiale: Segmente an der linken Bürste 1, an der rechten 0, die übrigen frei (Spulen gleich groß)
  const V = new Array(rotor.segments).fill(0.5);
  const fixed = new Array(rotor.segments).fill(false);
  for (const k of left) { V[k] = 1; fixed[k] = true; }
  for (const k of right) { V[k] = 0; fixed[k] = true; }
  for (let it = 0; it < 50; it++) {
    for (let k = 0; k < rotor.segments; k++) {
      if (fixed[k]) continue;
      const nb = rotor.coils.filter(c => c.a === k || c.b === k).map(c => V[c.a === k ? c.b : c.a]);
      if (nb.length) V[k] = nb.reduce((x, y) => x + y, 0) / nb.length;
    }
  }
  const raw = rotor.coils.map(c => V[c.a] - V[c.b]);
  // Gesamtstrom aus der linken Bürste heraus
  let total = 0;
  rotor.coils.forEach((c, j) => {
    const aL = left.includes(c.a), bL = left.includes(c.b);
    if (aL && !bL) total += raw[j];
    if (bL && !aL) total -= raw[j];
  });
  if (total <= 1e-12) return { coils: zero, armature: 0, gap: false, left, right };
  const I = s.polarity * s.current;
  return { coils: raw.map(r => I * r / total), armature: I, gap: false, left, right };
}

/**
 * Rotorstrom und Kontakt der Bürsten (für Anzeige und Texte).
 * leftBrush: Beim zweiteiligen Kommutator die Hälfte ('A' oder 'B') an der linken Bürste.
 * armature: beim zweiteiligen Kommutator der Spulenstrom mit Vorzeichen, sonst der Strom durch die Bürsten.
 */
export function armatureCurrent(phi, s) {
  const r = rotorCurrents(phi, s);
  const rotor = rotorOf(s);
  const two = rotor.segments === 2;
  const leftBrush = two && r.left.length === 1 ? (r.left[0] === 0 ? 'A' : 'B') : null;
  return { armature: two ? r.coils[0] : r.armature, gap: r.gap, leftBrush, open: !!r.open };
}

/** Strom in den Feldspulen (Elektromagnet, parallel zum Rotor am selben Netzgerät) */
export function fieldCurrent(s) {
  if (s.stator !== 'elektro' || !s.powerOn) return 0;
  return s.magnet * s.polarity * s.current;
}

/**
 * Statorfeld in x-Richtung (relativ, Permanentmagnet = ±1). Positiv: Nordpol links.
 * Elektromagnet: proportional zum Feldstrom – auch während der Kommutatorlücke.
 */
export function statorField(s) {
  if (s.stator !== 'elektro') return s.magnet;
  return fieldCurrent(s) / MODEL.fieldReference;
}

/** Arm k des Rotors: 'A' und 'B' stehen für die Arme 0 und 1 */
const armIndex = end => (end === 'A' ? 0 : end === 'B' ? 1 : end);

/** Pol am Ende eines Arms: 'N', 'S' oder null (kein Strom in seiner Spule) */
export function rotorPole(end, phi, s) {
  const arm = rotorOf(s).arms[armIndex(end)];
  if (!arm) return null;
  const i = rotorCurrents(phi, s).coils[arm.coil];
  if (Math.abs(i) < 1e-9) return null;
  return i * arm.sign > 0 ? 'N' : 'S';
}

/** Pol der Statorseite: side −1 links, +1 rechts → 'N', 'S' oder null (kein Feld) */
export function statorPole(side, s) {
  const b = statorField(s);
  if (b === 0) return null;
  return (b > 0) === (side < 0) ? 'N' : 'S';
}

/** Drehmoment (positiv: gegen den Uhrzeigersinn, Blick von vorne) in N·m */
export function torque(phi, s) {
  if (s.rotorInstalled === false) return 0;
  const rotor = rotorOf(s);
  const { coils } = rotorCurrents(phi, s);
  let sum = 0;
  rotor.coils.forEach((c, j) => { sum += coils[j] * Math.sin(phi + c.angle); });
  if (sum === 0) return 0;
  return -MODEL.torqueConstant * rotor.torqueFactor * statorField(s) * sum;
}

/**
 * Kraft auf einen Rotorpol in x-Richtung (Polmodell, relativ): Ein Nordpol wird in Feldrichtung
 * gezogen, ein Südpol entgegen. Zur Darstellung der Kräfte.
 */
export function poleForceX(end, phi, s) {
  const arm = rotorOf(s).arms[armIndex(end)];
  if (!arm) return 0;
  const i = rotorCurrents(phi, s).coils[arm.coil];
  return arm.sign * i * statorField(s);
}

/**
 * Bewegung um dt weiterrechnen (Trägheit, Reibung, Haftreibung).
 * Verändert s.phi und s.omega. Ohne eingebauten Rotor passiert nichts.
 */
export function step(s, dt) {
  if (s.rotorInstalled === false) { s.omega = 0; return; }
  const n = Math.max(1, Math.ceil(dt / 0.002));
  const h = dt / n;
  for (let k = 0; k < n; k++) {
    const tau = torque(s.phi, s);
    if (s.omega === 0 && Math.abs(tau) <= MODEL.staticFriction) continue;   // haftet
    const alpha = (tau - MODEL.damping * s.omega - Math.sign(s.omega || tau) * MODEL.staticFriction) / MODEL.inertia;
    const before = s.omega;
    s.omega += alpha * h;
    // Haftreibung lässt die Drehung zur Ruhe kommen, statt sie umzukehren
    if (before !== 0 && Math.sign(s.omega) !== Math.sign(before) && Math.abs(tau) <= MODEL.staticFriction) s.omega = 0;
    s.phi += s.omega * h;
  }
  s.phi = ((s.phi % TAU) + TAU) % TAU;
}
