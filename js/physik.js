// ------------------------------------------------------------------
// Physik des Gleichstrommotors im Polmodell (ohne 3D, testbar mit node --test)
//
// Blick von vorne entlang der Drehachse (z zeigt zum Betrachter), Statorfeld in x-Richtung.
// Der Anker ist ein Elektromagnet: Seine Pole A (gold) und B (türkis) liegen beim Winkel phi
// bzw. phi + 180°. Ankerstrom positiv: Pol A wird zum Nordpol.
// Drehmoment des Ankermagneten im Statorfeld: τ = m × B, also τ = −K · I_A · B_x · sin(phi).
// ------------------------------------------------------------------
import { MODEL } from './config.js';

/**
 * Strom im Anker und Kontakt der Bürsten (Kommutator).
 * Die Kommutatorhälfte A ist mit Pol A verbunden und liegt 90° vor ihm (bei phi + 90°).
 * Bürsten links und rechts; die linke ist bei polarity = +1 der Pluspol.
 * Liegen die Bürsten auf den Lücken (Anker waagrecht, Pole gegenüber den Statorpolen: Totpunkt),
 * ist der Ankerstromkreis unterbrochen.
 * @returns {{ armature: number, gap: boolean, leftBrush: 'A'|'B'|null }}
 */
export function armatureCurrent(phi, s) {
  const on = s.powerOn && s.current > 0;
  const sin = Math.sin(phi);
  if (Math.abs(sin) < Math.sin(MODEL.gapAngle)) return { armature: 0, gap: true, leftBrush: null };
  // Hälfte A liegt bei phi + 90°: oben (sin > 0) heißt Hälfte A links an der linken Bürste.
  // Der Strom tritt an der linken Bürste ein (Pluspol bei polarity +1) und durchläuft die Spulen von A nach B.
  const leftBrush = sin > 0 ? 'A' : 'B';
  const i = on ? s.polarity * s.current * Math.sign(sin) : 0;
  return { armature: i, gap: false, leftBrush };
}

/** Strom in den Feldspulen (Elektromagnet, parallel zum Anker am selben Netzgerät) */
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

/** Pol eines Ankerendes: 'N', 'S' oder null (kein Strom). end = 'A' oder 'B' */
export function rotorPole(end, phi, s) {
  const i = armatureCurrent(phi, s).armature;
  if (i === 0) return null;
  return (i > 0) === (end === 'A') ? 'N' : 'S';
}

/** Pol der Statorseite: side −1 links, +1 rechts → 'N', 'S' oder null (kein Feld) */
export function statorPole(side, s) {
  const b = statorField(s);
  if (b === 0) return null;
  return (b > 0) === (side < 0) ? 'N' : 'S';
}

/** Drehmoment (positiv: gegen den Uhrzeigersinn, Blick von vorne) in N·m */
export function torque(phi, s) {
  const i = armatureCurrent(phi, s).armature;
  return -MODEL.torqueConstant * i * statorField(s) * Math.sin(phi);
}

/**
 * Kraft auf einen Ankerpol in x-Richtung (Polmodell, relativ): Ein Nordpol wird in Feldrichtung
 * gezogen, ein Südpol entgegen. Zur Darstellung der Kräfte.
 */
export function poleForceX(end, phi, s) {
  const i = armatureCurrent(phi, s).armature;
  return (end === 'A' ? 1 : -1) * i * statorField(s);
}

/**
 * Bewegung um dt weiterrechnen (Trägheit, Reibung, Haftreibung).
 * Verändert s.phi und s.omega.
 */
export function step(s, dt) {
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
  s.phi = ((s.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}
