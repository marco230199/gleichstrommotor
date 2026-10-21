// ------------------------------------------------------------------
// Die austauschbaren Rotoren als 3D-Bauteile, jeweils mit eigenem, abnehmbarem Kommutator.
//   spule     – Eisenstab mit einer Spule (ohne Polschuhe)
//   doppelT   – Doppel-T-Anker: zwei Spulen, Polschuhe
//   dreipolig – drei Arme mit Polschuhen und je einer Spule, dreiteiliger Kommutator
// Die Lage der Kommutatorsegmente stammt aus der Physik (ROTORS), damit 3D und Rechnung übereinstimmen.
// Koordinaten in cm im Rotor: Drehachse = z, Arm 0 zeigt in +x.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO } from './config.js';
import { ROTORS } from './physik.js';
import { addMesh, makeCable } from './hilfen.js';
import { mat } from './materialien.js';
import { rod, arcShell, coil } from './bauteile.js';

const D = GEO.depth, ZF = D / 2;
const RR = GEO.rotorRadius, ARM_IN = RR - GEO.shoeThickness;
const CZ = GEO.commZ, CR = GEO.commRadius, CL = GEO.commLength;
const SEGMENT_MATS = [mat.halfA, mat.halfB, mat.halfC];
export const SHAFT = { back: -5.8, front: CZ + 3.2 };

/** Kommutator: Segmente nach der Physik, Isolierkern; eigene Gruppe (lässt sich abnehmen) */
function buildCommutator(def) {
  const group = new THREE.Group();
  const n = def.segments, half = Math.PI / n - def.gapHalf;
  for (let k = 0; k < n; k++) {
    arcShell(CR * 0.55, CR, def.segOffset + k * 2 * Math.PI / n, half, CZ - CL / 2, CL, SEGMENT_MATS[k], group);
  }
  const core = addMesh(new THREE.CylinderGeometry(CR * 0.55, CR * 0.55, CL, 20), mat.plastic, group);
  core.rotation.x = Math.PI / 2;
  core.position.z = CZ;
  return group;
}

/** Zuleitung von einer Spule zu einem Kommutatorsegment (Winkel des Segments im Rotor) */
function lead(start, segAngle, material, parent, around = 0) {
  const end = [CR * 0.8 * Math.cos(segAngle), CR * 0.8 * Math.sin(segAngle), CZ - CL / 2];
  const a = segAngle + around;
  const mid = [1.5 * Math.cos(a), 1.5 * Math.sin(a), CZ - CL / 2 - 0.9];
  makeCable([start, mid, end], material, parent, -100, 0.09);
}

// ---------------- Spule mit Eisenkern: gerader Eisenstab, eine Spule (mit kleiner Lücke für die Welle)
function buildSpule(body) {
  const B = GEO.barHalf, END = 0.75, H = GEO.armHeight;
  const bar = addMesh(new THREE.BoxGeometry(2 * (B - END), H, D), mat.ironRotor, body);
  bar.position.z = 0;
  const fronts = [];
  for (const sx of [1, -1]) {
    // Stabende: färbt sich als Pol (ganz, damit es auch von der Seite gut sichtbar ist)
    const end = addMesh(new THREE.BoxGeometry(END, H, D), mat.ironRotor, body);
    end.position.x = sx * (B - END / 2);
    fronts.push(end);
    const marker = addMesh(new THREE.BoxGeometry(0.25, H * 0.7, 0.14), sx > 0 ? mat.halfA : mat.halfB, body);
    marker.position.set(sx * (B - END - 0.2), 0, ZF + 0.07);   // Farbmarke wie die Kommutatorhälfte
  }
  const half = coil(0.35, B - END - 0.4, H / 2, ZF, 2, body);
  coil(-(B - END - 0.4), -0.35, H / 2, ZF, 2, body);
  const out = half.userData.outer;
  const def = ROTORS.spule;
  lead([0.9, out.y * 0.6, out.z], def.segOffset, mat.halfA, body);
  lead([-0.9, -out.y * 0.6, out.z], def.segOffset + Math.PI, mat.halfB, body);
  return {
    packs: [{ coil: 0, frame: 0, x0: 0.35, x1: B - END - 0.4, out }, { coil: 0, frame: 0, x0: -(B - END - 0.4), x1: -0.35, out }],
    arms: [{ front: fronts[0], labelR: B - END / 2, tipR: B }, { front: fronts[1], labelR: B - END / 2, tipR: B }],
  };
}

// ---------------- Doppel-T-Anker: Nabe, Arme, Polschuhe, zwei Spulen in Reihe
function buildDoppelT(body) {
  const hub = addMesh(new THREE.CylinderGeometry(1.0, 1.0, D, 24), mat.ironRotor, body);
  hub.rotation.x = Math.PI / 2;
  addMesh(new THREE.BoxGeometry(2 * ARM_IN, GEO.armHeight, D), mat.ironRotor, body);
  const arms = [];
  for (const [center, marker] of [[0, mat.halfA], [Math.PI, mat.halfB]]) {
    arcShell(ARM_IN, RR, center, GEO.rotorShoeHalf, -ZF, D, mat.ironRotor, body);
    const front = arcShell(ARM_IN + 0.02, RR - 0.02, center, GEO.rotorShoeHalf - 0.02, ZF, 0.12, mat.ironRotor, body);
    arcShell(ARM_IN - 0.35, ARM_IN, center, 0.32, ZF, 0.14, marker, body);   // Farbmarke wie die Kommutatorhälfte
    arms.push({ front, labelR: (ARM_IN + RR) / 2, tipR: RR });
  }
  // Wickelbereich: außerhalb der Nabe (r = 1) und vor der Innenkante der Polschuhe
  const X = [1.2, 2.55];
  const coilA = coil(X[0], X[1], GEO.armHeight / 2, ZF, 2, body);
  coil(-X[1], -X[0], GEO.armHeight / 2, ZF, 2, body);
  const out = coilA.userData.outer;
  rod([X[0] + 0.2, 1.05, -out.z], [-X[0] - 0.2, 1.05, -out.z], 0.1, mat.copper, body);   // Spulen hinten verbunden
  const def = ROTORS.doppelT;
  lead([X[0] + 0.4, out.y * 0.6, out.z], def.segOffset, mat.halfA, body);
  lead([-(X[0] + 0.4), -out.y * 0.6, out.z], def.segOffset + Math.PI, mat.halfB, body);
  return {
    packs: [{ coil: 0, frame: 0, x0: X[0], x1: X[1], out }, { coil: 0, frame: 0, x0: -X[1], x1: -X[0], out }],
    arms,
  };
}

// ---------------- Dreipoliger Anker: drei Arme mit Polschuhen und je einer Spule (Dreieckschaltung)
function buildDreipolig(body) {
  const hub = addMesh(new THREE.CylinderGeometry(1.0, 1.0, D, 24), mat.ironRotor, body);
  hub.rotation.x = Math.PI / 2;
  const def = ROTORS.dreipolig;
  const H = 1.4, X = [1.15, 2.5];
  const arms = [], packs = [];
  let out = null;
  def.arms.forEach((armDef, j) => {
    const frame = new THREE.Group();
    frame.rotation.z = armDef.angle;
    body.add(frame);
    const arm = addMesh(new THREE.BoxGeometry(ARM_IN - 0.6, H, D), mat.ironRotor, frame);
    arm.position.x = (ARM_IN + 0.6) / 2;
    arcShell(ARM_IN, RR, 0, GEO.rotorShoeHalf3, -ZF, D, mat.ironRotor, frame);
    const front = arcShell(ARM_IN + 0.02, RR - 0.02, 0, GEO.rotorShoeHalf3 - 0.02, ZF, 0.12, mat.ironRotor, frame);
    const c = coil(X[0], X[1], H / 2, ZF, 2, frame);
    out = c.userData.outer;
    arms.push({ front, labelR: (ARM_IN + RR) / 2, tipR: RR });
    packs.push({ coil: armDef.coil, frame: armDef.angle, x0: X[0], x1: X[1], out });
  });
  // Segment k verbindet die Spulen k−1 und k: Zuleitung von der Stelle zwischen diesen beiden Armen
  for (let k = 0; k < def.segments; k++) {
    const a = (k - 0.5) * 2 * Math.PI / 3;
    const start = [1.35 * Math.cos(a), 1.35 * Math.sin(a), out.z - 0.3];
    lead(start, def.segOffset + k * 2 * Math.PI / 3, SEGMENT_MATS[k], body, -0.7);
  }
  return { packs, arms };
}

const BUILDERS = { spule: buildSpule, doppelT: buildDoppelT, dreipolig: buildDreipolig };

/**
 * Rotor bauen. Rückgabe:
 *  group      – ganzer Rotor (Welle, Eisen, Spulen, Kommutator), dreht sich um z
 *  commutator – abnehmbare Gruppe (Kind von group, solange aufgesetzt)
 *  arms       – je Arm: front (Fläche für die Polfarbe), labelR, tipR
 *  packs      – Spulenpakete für die Stromrichtungs-Anzeige
 */
export function buildRotor(type) {
  const group = new THREE.Group();
  group.name = type;
  rod([0, 0, SHAFT.back], [0, 0, SHAFT.front], 0.22, mat.steel, group);
  const body = new THREE.Group();
  group.add(body);
  const parts = BUILDERS[type](body);
  const commutator = buildCommutator(ROTORS[type]);
  group.add(commutator);
  return { type, def: ROTORS[type], group, commutator, ...parts };
}
