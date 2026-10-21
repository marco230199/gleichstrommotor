// Tests der Physik (ohne Browser): npm test  bzw.  node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL } from '../js/config.js';
import { armatureCurrent, statorField, rotorPole, statorPole, torque, poleForceX, step } from '../js/physik.js';

const deg = d => d * Math.PI / 180;
const base = (extra = {}) => ({ powerOn: true, current: 3, polarity: 1, magnet: 1, stator: 'permanent', phi: deg(60), omega: 0, ...extra });

test('Kommutator: Pol A oben wird Nordpol, nach der halben Drehung Südpol; Lücke am Totpunkt', () => {
  const s = base();
  assert.equal(rotorPole('A', deg(60), s), 'N');
  assert.equal(rotorPole('B', deg(60), s), 'S');
  assert.equal(armatureCurrent(deg(60), s).leftBrush, 'A');
  assert.equal(rotorPole('A', deg(240), s), 'S', 'A unten: Kommutator hat umgepolt');
  assert.equal(armatureCurrent(deg(240), s).leftBrush, 'B');
  for (const p of [0, 5, 180, 355]) {
    const i = armatureCurrent(deg(p), s);
    assert.equal(i.gap, true, `${p}°: Bürsten auf den Lücken`);
    assert.equal(i.armature, 0);
  }
});

test('Statorpole: Permanentmagnet und Elektromagnet', () => {
  assert.equal(statorPole(-1, base()), 'N');
  assert.equal(statorPole(1, base({ magnet: -1 })), 'N', 'Magnet umgedreht');
  const e = base({ stator: 'elektro' });
  assert.equal(statorField(e), 1, 'bei 3 A so stark wie der Permanentmagnet');
  assert.equal(statorPole(-1, e), 'N');
  assert.equal(statorPole(-1, { ...e, polarity: -1 }), 'S', 'Umpolen polt auch die Feldspulen um');
  assert.equal(statorPole(-1, { ...e, powerOn: false }), null, 'ohne Strom kein Feld');
  assert.equal(statorField({ ...e, current: 6 }), 2, 'Feld proportional zum Feldstrom');
});

test('Pole: Ungleichnamige Pole ziehen sich an – Kraft auf Rotorpol A zum Statorsüdpol', () => {
  const s = base();                      // Nordpol links, Südpol rechts; A ist Nordpol
  assert.ok(poleForceX('A', deg(60), s) > 0, 'Nordpol A wird nach rechts zum Südpol gezogen');
  assert.ok(poleForceX('B', deg(60), s) < 0, 'Südpol B wird nach links zum Nordpol gezogen');
});

test('Kommutator: Drehmoment hat in jeder Stellung dasselbe Vorzeichen (außer am Totpunkt)', () => {
  for (const extra of [{}, { stator: 'elektro' }]) {
    const s = base(extra);
    for (let p = 0; p < 360; p += 3) {
      const t = torque(deg(p), s);
      if (armatureCurrent(deg(p), s).gap) assert.equal(Math.abs(t), 0);
      else assert.ok(t < 0, `${p}°: im Uhrzeigersinn`);
    }
  }
});

test('Permanentmagnet: Umpolen kehrt die Drehrichtung um, Magnet umdrehen auch', () => {
  const t = torque(deg(60), base());
  assert.ok(torque(deg(60), base({ polarity: -1 })) * t < 0);
  assert.ok(torque(deg(60), base({ magnet: -1 })) * t < 0);
  assert.ok(torque(deg(60), base({ polarity: -1, magnet: -1 })) * t > 0);
});

test('Elektromagnet: Umpolen ändert die Drehrichtung nicht, nur Feldspulen umpolen tut es', () => {
  const e = base({ stator: 'elektro' });
  const t = torque(deg(60), e);
  assert.ok(torque(deg(60), { ...e, polarity: -1 }) * t > 0, 'Rotor und Feld werden gemeinsam umgepolt');
  assert.ok(torque(deg(60), { ...e, magnet: -1 }) * t < 0, 'nur die Feldspulen umgepolt');
});

test('Elektromagnet: Drehmoment wächst mit dem Quadrat der Stromstärke', () => {
  const e = base({ stator: 'elektro' });
  const ratio = torque(deg(60), { ...e, current: 4 }) / torque(deg(60), { ...e, current: 2 });
  assert.ok(Math.abs(ratio - 4) < 1e-9);
  const p = base();
  const ratioP = torque(deg(60), { ...p, current: 4 }) / torque(deg(60), { ...p, current: 2 });
  assert.ok(Math.abs(ratioP - 2) < 1e-9, 'Permanentmagnet: linear');
});

test('Der Motor läuft dauerhaft (Kommutator) und steht ohne Strom', () => {
  for (const extra of [{}, { stator: 'elektro' }]) {
    const s = base(extra);
    let turns = 0, last = s.phi;
    for (let k = 0; k < 2000; k++) {          // 20 s
      step(s, 0.01);
      if (s.phi > last + Math.PI) turns--;     // Sprung von 0 auf 2π: eine Umdrehung im Uhrzeigersinn
      last = s.phi;
    }
    assert.ok(s.omega < -1, `${extra.stator || 'permanent'}: dreht sich im Uhrzeigersinn`);
    assert.ok(turns <= -5, `${extra.stator || 'permanent'}: mehrere Umdrehungen`);
  }
  const off = base({ powerOn: false });
  step(off, 1);
  assert.equal(off.omega, 0);
});

test('Totpunkt: Steht der Rotor auf der Lücke, läuft er ohne Anstoßen nicht an', () => {
  const s = base({ phi: 0 });
  step(s, 1);
  assert.equal(s.omega, 0);
  assert.ok(MODEL.gapAngle > 0);
});

// ---------------- Rotor zum Austauschen, Kommutator abnehmen, Rotor ausbauen
import { ROTORS, rotorCurrents } from '../js/physik.js';

test('Spule mit Eisenkern: wie der Doppel-T-Anker (Totpunkt), nur schwächer', () => {
  const sp = base({ rotor: 'spule' }), dt = base({ rotor: 'doppelT' });
  assert.equal(rotorPole('A', deg(60), sp), 'N');
  assert.ok(armatureCurrent(deg(3), sp).gap, 'Totpunkt');
  const ratio = torque(deg(60), sp) / torque(deg(60), dt);
  assert.ok(ratio > 0 && ratio < 1, 'gleiche Richtung, kleineres Drehmoment');
});

test('Dreipoliger Anker: kein Totpunkt – Drehmoment in jeder Stellung gleich gerichtet und nie null', () => {
  for (const extra of [{}, { stator: 'elektro' }]) {
    const s = base({ rotor: 'dreipolig', ...extra });
    for (let p = 0; p < 360; p += 1) {
      const t = torque(deg(p), s);
      assert.ok(t < -10 * MODEL.staticFriction, `${p}°: kräftig im Uhrzeigersinn`);
      assert.equal(armatureCurrent(deg(p), s).gap, false);
    }
  }
});

test('Dreipoliger Anker: Strom teilt sich auf (2/3 durch eine Spule, je 1/3 durch die beiden anderen)', () => {
  const s = base({ rotor: 'dreipolig' });
  const r = rotorCurrents(deg(37), s);
  const mags = r.coils.map(Math.abs).sort((a, b) => a - b);
  assert.ok(Math.abs(mags[0] - 1) < 1e-6 && Math.abs(mags[1] - 1) < 1e-6 && Math.abs(mags[2] - 2) < 1e-6, mags.join(', '));
  assert.equal(r.armature, 3, 'durch die Bürsten fließt die eingestellte Stromstärke');
  assert.equal(ROTORS.dreipolig.arms.length, 3);
});

test('Dreipoliger Anker läuft aus dem Stand an, auch dort, wo der Doppel-T-Anker im Totpunkt steht', () => {
  const s = base({ rotor: 'dreipolig', phi: 0 });
  step(s, 2);
  assert.ok(s.omega < -1);
  const d = base({ rotor: 'doppelT', phi: 0 });
  step(d, 2);
  assert.equal(d.omega, 0);
});

test('Ohne Kommutator oder ohne Rotor fließt kein Rotorstrom und es gibt kein Drehmoment', () => {
  for (const extra of [{ commutatorOn: false }, { rotorInstalled: false }]) {
    const s = base(extra);
    assert.equal(armatureCurrent(deg(60), s).armature, 0);
    assert.equal(torque(deg(60), s), 0);
    step(s, 1);
    assert.equal(s.omega, 0);
  }
  assert.equal(statorPole(-1, base({ stator: 'elektro', commutatorOn: false })), 'N', 'Feldspulen bleiben unter Strom');
});
