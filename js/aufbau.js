// ------------------------------------------------------------------
// 3D-Aufbau des Gleichstrommotors: Grundplatte, Lager, Doppel-T-Anker (zwei Spulen mit
// Eisenkern), Kommutator, Bürsten und Stator (Permanentmagnet oder Elektromagnet mit Feldspulen)
// sowie die einblendbaren Anzeigen (Feld, Pole, Stromrichtung, Kräfte).
// Koordinaten in cm: Drehachse = z-Achse (zum Betrachter), Statorfeld in x-Richtung.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO, COMMUTATOR } from './config.js';
import { state } from './state.js';
import { armatureCurrent, statorField, rotorPole, statorPole, poleForceX, fieldCurrent } from './physik.js';
import { addMesh, makeTextPlane, makeCable } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const D = GEO.depth, ZF = D / 2;                 // Tiefe, Vorderseite von Anker und Stator
const RR = GEO.rotorRadius, RS = RR + GEO.airGap;
const CZ = GEO.commZ, CR = GEO.commRadius, CL = GEO.commLength;
export const BOARD_TOP = GEO.tableY + 1.2;       // Oberkante der Holzgrundplatte

// ---------------- Hilfen
function rod(p, q, radius, material, parent) {
  const a = new THREE.Vector3(...p), b = new THREE.Vector3(...q);
  const mesh = addMesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 14), material, parent);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/** Kreisringsegment (Winkel in rad, gegen den Uhrzeigersinn ab +x), von z0 bis z0 + depth */
function arcShell(rIn, rOut, center, half, z0, depth, material, parent) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, center - half, center + half, false);
  shape.absarc(0, 0, rIn, center + half, center - half, true);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 });
  const mesh = addMesh(geo, material, parent);
  mesh.position.z = z0;
  return mesh;
}

/** Voller Kreisring von z0 bis z0 + depth */
function ring(rIn, rOut, z0, depth, material, parent) {
  const shape = new THREE.Shape().absarc(0, 0, rOut, 0, 2 * Math.PI);
  shape.holes.push(new THREE.Path().absarc(0, 0, rIn, 0, 2 * Math.PI, true));
  const mesh = addMesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 }), material, parent);
  mesh.position.z = z0;
  return mesh;
}

/**
 * Spule aus Windungen um einen Kern, dessen Achse in x-Richtung zeigt (Windungen in der y-z-Ebene).
 * x0..x1: Wickelbereich, hy/hz: halbe Kernquerschnitte, layers: Lagen übereinander.
 */
function coil(x0, x1, hy, hz, layers, parent, material = mat.copper) {
  const group = new THREE.Group();
  parent.add(group);
  const wire = 0.13, pitch = 2 * wire + 0.02;
  for (let layer = 0; layer < layers; layer++) {
    const o = 0.2 + wire + layer * pitch;              // Abstand der Windung vom Kern
    const r = 0.25 + layer * pitch;                    // Eckenrundung
    const a = hy + o - r, b = hz + o - r;
    const pts = [];
    for (let k = 0; k < 4; k++) {                      // abgerundetes Rechteck
      const cy = k === 0 || k === 3 ? a : -a, cz = k < 2 ? b : -b;
      for (let j = 0; j <= 6; j++) {
        const t = (k * Math.PI) / 2 + (j / 6) * (Math.PI / 2);
        pts.push(new THREE.Vector3(0, cy + r * Math.cos(t), cz + r * Math.sin(t)));
      }
    }
    const shape = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    const geo = new THREE.TubeGeometry(shape, 64, wire, 8, true);
    for (let x = x0 + wire; x <= x1 - wire + 1e-6; x += pitch) {
      const turn = addMesh(geo, layer % 2 ? mat.copperDark : material, group);
      turn.position.x = x;
    }
  }
  group.userData.outer = { y: hy + 0.2 + wire + (layers - 1) * pitch, z: hz + 0.2 + wire + (layers - 1) * pitch };
  return group;
}

function makeArrow(material, radius = 0.18) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), material);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(radius * 3, 1, 16), material);
  group.add(shaft, tip);
  group.userData = { shaft, tip };
  return group;
}
function setArrow(arrow, length, headLength = 1.0) {
  const { shaft, tip } = arrow.userData;
  const shaftLen = Math.max(0.01, length - headLength);
  shaft.scale.y = shaftLen;
  shaft.position.y = shaftLen / 2;
  tip.scale.y = headLength;
  tip.position.y = shaftLen + headLength / 2;
}

// ---------------- Grundplatte und Lager
const board = addMesh(new THREE.BoxGeometry(24, BOARD_TOP - GEO.tableY, 19), mat.wood, scene);
board.position.set(0, (BOARD_TOP + GEO.tableY) / 2, 2);
for (const z of [-5.2, CZ + 2.6]) {
  const post = addMesh(new THREE.BoxGeometry(1.2, -BOARD_TOP - 0.55, 1.2), mat.plastic, scene);
  post.position.set(0, (BOARD_TOP - 0.55) / 2, z);
  const eye = addMesh(new THREE.TorusGeometry(0.45, 0.18, 10, 24), mat.plastic, scene);
  eye.position.set(0, 0, z);
}

// ---------------- Anker (dreht sich): Doppel-T-Kern aus Eisen, zwei Spulen, Kommutator
export const rotor = new THREE.Group();
scene.add(rotor);
rod([0, 0, -5.8], [0, 0, CZ + 3.2], 0.22, mat.steel, rotor);
const hub = addMesh(new THREE.CylinderGeometry(1.0, 1.0, D, 24), mat.iron, rotor);
hub.rotation.x = Math.PI / 2;
const ARM_IN = RR - GEO.shoeThickness;             // Arme bis zu den Polschuhen
const arm = addMesh(new THREE.BoxGeometry(2 * ARM_IN, GEO.armHeight, D), mat.iron, rotor);
arm.position.z = 0;
// Polschuhe A (bei phi) und B (gegenüber) mit Frontplatten für die Polfarbe und Farbmarke
const shoeFront = {};
for (const [end, center, marker] of [['A', 0, mat.halfA], ['B', Math.PI, mat.halfB]]) {
  arcShell(ARM_IN, RR, center, GEO.shoeHalf, -ZF, D, mat.iron, rotor);
  shoeFront[end] = arcShell(ARM_IN + 0.02, RR - 0.02, center, GEO.shoeHalf - 0.02, ZF, 0.12, mat.neutral, rotor);
  arcShell(ARM_IN - 0.35, ARM_IN, center, 0.32, ZF, 0.14, marker, rotor);   // Farbmarke wie die Kommutatorhälfte
}
// Spulen auf beiden Armen (in Reihe, gleicher Wickelsinn)
// Wickelbereich: außerhalb der Nabe (r = 1) und vor der Innenkante der Polschuhe
const COIL_X = [1.2, 2.55];
const coilA = coil(COIL_X[0], COIL_X[1], GEO.armHeight / 2, ZF, 2, rotor);
const coilB = coil(-COIL_X[1], -COIL_X[0], GEO.armHeight / 2, ZF, 2, rotor);
const OUT = coilA.userData.outer;
// Verbindung der beiden Spulen hinten (an der Achse vorbei)
rod([COIL_X[0] + 0.2, 1.05, -OUT.z], [-COIL_X[0] - 0.2, 1.05, -OUT.z], 0.1, mat.copper, rotor);
// Kommutator: Hälfte A 90° vor Pol A, Lücken in Richtung der Pole
const GAP = COMMUTATOR.gapHalf;
const commutator = new THREE.Group();
rotor.add(commutator);
arcShell(CR * 0.55, CR, Math.PI / 2, Math.PI / 2 - GAP, CZ - CL / 2, CL, mat.halfA, commutator);
arcShell(CR * 0.55, CR, -Math.PI / 2, Math.PI / 2 - GAP, CZ - CL / 2, CL, mat.halfB, commutator);
const commCore = addMesh(new THREE.CylinderGeometry(CR * 0.55, CR * 0.55, CL, 20), mat.plastic, commutator);
commCore.rotation.x = Math.PI / 2;
commCore.position.z = CZ;
// Zuleitungen: Spule A → Hälfte A, Spule B → Hälfte B
for (const [sx, end] of [[1, 'A'], [-1, 'B']]) {
  const start = [sx * (COIL_X[0] + 0.4), sx * OUT.y * 0.6, OUT.z];
  const mid = [sx * 0.9, sx * 1.6, CZ - CL / 2 - 0.9];
  const endP = [0, sx * CR * 0.8, CZ - CL / 2];
  makeCable([start, mid, endP], end === 'A' ? mat.halfA : mat.halfB, rotor, -100, 0.09);
}

// ---------------- Bürsten (feststehend) mit Haltern
const brushes = {};
for (const side of [-1, 1]) {
  const group = new THREE.Group();
  group.position.z = CZ;
  scene.add(group);
  const brush = addMesh(new THREE.BoxGeometry(1.2, 2 * CR * Math.tan(COMMUTATOR.brushHalf), 0.9), mat.carbon, group);
  brush.position.set(side * (CR + 0.6), 0, 0);
  const holder = addMesh(new THREE.BoxGeometry(0.3, -BOARD_TOP, 0.3), mat.steel, group);
  holder.position.set(side * (CR + 1.4), BOARD_TOP / 2, 0);
  rod([side * (CR + 1.2), 0, 0], [side * (CR + 1.4), 0, 0], 0.15, mat.steel, group);
  brushes[side] = group;
}
/** Fußpunkt eines Bürstenhalters auf der Grundplatte, side −1 links, +1 rechts */
export function brushFoot(side) {
  return new THREE.Vector3(side * (CR + 1.4), BOARD_TOP, CZ);
}

/** Fuß von der Grundplatte bis an einen Ring (Innenradius rIn), bei x = ±xc, Breite w */
function ringFeet(xc, w, rIn, parent) {
  const top = -Math.sqrt(rIn * rIn - (xc - w / 2) ** 2);
  for (const side of [-1, 1]) {
    const foot = addMesh(new THREE.BoxGeometry(w, top - BOARD_TOP, D), mat.ironDark, parent);
    foot.position.set(side * xc, (top + BOARD_TOP) / 2, 0);
  }
}

// ---------------- Stator A: Permanentmagnet (zwei Magnetschalen in einem Eisenring)
const permanent = new THREE.Group();
scene.add(permanent);
const P_OUT = RS + 1.5;
ring(P_OUT, P_OUT + 1.0, -ZF, D, mat.ironDark, permanent);
const magnets = {};
const magnetLabels = {};
for (const side of [-1, 1]) {
  magnets[side] = arcShell(RS, P_OUT, side < 0 ? Math.PI : 0, GEO.shoeHalf, -ZF, D, mat.north, permanent);
  magnetLabels[side] = { N: makeTextPlane('N', 1.6, { color: '#ffffff' }), S: makeTextPlane('S', 1.6, { color: '#ffffff' }) };
  for (const label of Object.values(magnetLabels[side])) {
    label.position.set(side * (RS + P_OUT) / 2, 0, ZF + 0.02);
    permanent.add(label);
  }
}
ringFeet(2.6, 2.0, P_OUT, permanent);

// ---------------- Stator B: Elektromagnet (Eisenjoch, Polkerne mit Feldspulen, Polschuhe)
const electro = new THREE.Group();
scene.add(electro);
const E_CORE_IN = RS + 0.8, E_YOKE = 8.2;
ring(E_YOKE, E_YOKE + 1.0, -ZF, D, mat.ironDark, electro);
const statorFront = {};
const statorLabels = {};
const CORE_H = 2.4;
for (const side of [-1, 1]) {
  const core = addMesh(new THREE.BoxGeometry(E_YOKE + 0.1 - E_CORE_IN, CORE_H, D), mat.iron, electro);
  core.position.x = side * (E_CORE_IN + E_YOKE + 0.1) / 2;
  arcShell(RS, E_CORE_IN, side < 0 ? Math.PI : 0, GEO.shoeHalf, -ZF, D, mat.iron, electro);
  statorFront[side] = arcShell(RS + 0.02, E_CORE_IN - 0.02, side < 0 ? Math.PI : 0, GEO.shoeHalf - 0.02, ZF, 0.12, mat.neutral, electro);
  coil(side < 0 ? -E_YOKE + 0.5 : E_CORE_IN + 0.3, side < 0 ? -E_CORE_IN - 0.3 : E_YOKE - 0.5, CORE_H / 2, ZF, 3, electro);
  statorLabels[side] = { N: makeTextPlane('N', 1.2, { color: '#ffffff' }), S: makeTextPlane('S', 1.2, { color: '#ffffff' }) };
  for (const label of Object.values(statorLabels[side])) {
    label.position.set(side * (RS + E_CORE_IN) / 2, 0, ZF + 0.16);
    electro.add(label);
  }
}
ringFeet(3.8, 1.6, E_YOKE, electro);
// Buchsen der Feldspulen: je Spule eine kleine Platte mit zwei Buchsen unter der Spule, am Joch befestigt.
// Von der Spule führen nur die kurzen Wicklungsenden zur Platte; alle Verbindungen sind Kabel.
const SOCKET_Y = -4.2, SOCKET_DX = 0.65, PLATE_X = 6.6;
const FIELD_OUTER = CORE_H / 2 + 0.2 + 0.13 + 2 * 0.28;          // äußerste Windungslage (y)
for (const side of [-1, 1]) {
  const plate = addMesh(new THREE.BoxGeometry(2.6, 1.1, 0.4), mat.plastic, electro);
  plate.position.set(side * PLATE_X, SOCKET_Y, ZF + 0.2);
  for (const dx of [-SOCKET_DX, SOCKET_DX]) {
    const x = side * PLATE_X + dx;
    const socket = addMesh(new THREE.CylinderGeometry(0.32, 0.32, 0.6, 16), mat.carbon, electro);
    socket.rotation.x = Math.PI / 2;
    socket.position.set(x, SOCKET_Y, ZF + 0.7);
    rod([x, -FIELD_OUTER - 0.05, ZF + 0.35], [x, SOCKET_Y + 0.55, ZF + 0.2], 0.07, mat.copper, electro);  // Wicklungsende
  }
}
/** Buchse einer Feldspule (side −1 links, +1 rechts; 'outer' außen, 'inner' zur Mitte), Steckerspitze */
export function fieldSocket(side, which) {
  const x = side * (PLATE_X + (which === 'outer' ? SOCKET_DX : -SOCKET_DX));
  return new THREE.Vector3(x, SOCKET_Y, ZF + 1.0);
}
// Schwarzes Kabel zwischen den Spulen (Reihenschaltung): innere Buchse links → innere Buchse rechts.
// Es liegt vorne auf der Grundplatte und läuft in einem Bogen über die Kabel zu den Bürsten.
{
  const l = fieldSocket(-1, 'inner'), r = fieldSocket(1, 'inner');
  const down = (p, s) => [[p.x, p.y, p.z], [p.x, p.y - 0.4, p.z + 0.7], [p.x + s * 0.3, -6.8, ZF + 2.0], [p.x + s * 0.5, BOARD_TOP + 0.3, ZF + 3.2]];
  makeCable([
    ...down(l, 1),
    [-3.8, BOARD_TOP + 0.3, 7.3], [-2.5, BOARD_TOP + 1.1, 7.3], [0, BOARD_TOP + 1.3, 7.4],
    [2.5, BOARD_TOP + 1.1, 7.3], [3.8, BOARD_TOP + 0.3, 7.3],
    ...down(r, -1).reverse(),
  ], mat.cableBlack, electro, BOARD_TOP, 0.25);
}

// ---------------- Anzeigen
// Feldlinien des Stators (vor dem Motor, immer sichtbar)
const fieldGroup = new THREE.Group();
scene.add(fieldGroup);
const fieldMat = mat.field.clone();
fieldMat.depthTest = false;
for (const y of [-3.0, -1.0, 1.0, 3.0]) {
  const arrow = makeArrow(fieldMat, 0.1);
  setArrow(arrow, 2 * RS - 0.6, 0.9);
  arrow.rotation.z = -Math.PI / 2;
  arrow.position.set(-RS + 0.3, y, ZF + 1.4);
  arrow.renderOrder = 5;
  for (const m of [arrow.userData.shaft, arrow.userData.tip]) m.renderOrder = 5;
  fieldGroup.add(arrow);
}
const fieldLabel = makeTextPlane('B', 1.3, { color: '#1e88e5' });
fieldLabel.position.set(RS - 1.2, 4.1, ZF + 1.4);
fieldGroup.add(fieldLabel);

// Pole des Ankers als Buchstaben (stehen immer aufrecht)
const rotorLabels = {};
for (const end of ['A', 'B']) {
  rotorLabels[end] = { N: makeTextPlane('N', 1.2, { color: '#ffffff' }), S: makeTextPlane('S', 1.2, { color: '#ffffff' }) };
  for (const l of Object.values(rotorLabels[end])) { l.renderOrder = 6; scene.add(l); }
}

// Stromrichtung: wandernde Spitzen auf der Vorderseite der Ankerspulen
const currentMarks = [];
for (const sx of [1, -1]) {
  for (let k = 0; k < 3; k++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 12), mat.current);
    cone.position.set(sx * (COIL_X[0] + COIL_X[1]) / 2, 0, OUT.z + 0.25);
    rotor.add(cone);
    currentMarks.push(cone);
  }
}

// Kräfte auf die Ankerpole (Polmodell): waagrecht, in Weltkoordinaten
const forceArrows = { A: makeArrow(mat.force, 0.2), B: makeArrow(mat.force, 0.2) };
const forceLabels = { A: makeTextPlane('F', 1.2, { color: '#7b1fa2' }), B: makeTextPlane('F', 1.2, { color: '#7b1fa2' }) };
for (const end of ['A', 'B']) scene.add(forceArrows[end], forceLabels[end]);

// ---------------- Abgleich mit dem Zustand (jedes Bild)
const poleMat = pole => (pole === 'N' ? mat.north : pole === 'S' ? mat.south : mat.neutral);
let flow = 0;
export function syncApparatus(dt) {
  const phi = state.phi;
  rotor.rotation.z = phi;
  const elektro = state.stator === 'elektro';
  permanent.visible = !elektro;
  electro.visible = elektro;

  // Stator: Pole
  for (const side of [-1, 1]) {
    const pole = statorPole(side, state);
    if (!elektro) {
      magnets[side].material = pole === 'N' ? mat.north : mat.south;
      magnetLabels[side].N.visible = pole === 'N';
      magnetLabels[side].S.visible = pole === 'S';
    } else {
      statorFront[side].material = state.showPoles ? poleMat(pole) : mat.iron;
      statorLabels[side].N.visible = state.showPoles && pole === 'N';
      statorLabels[side].S.visible = state.showPoles && pole === 'S';
    }
  }

  // Anker: Pole (Farbe der Polschuhe vorne und aufrechte Buchstaben)
  const i = armatureCurrent(phi, state).armature;
  for (const end of ['A', 'B']) {
    const pole = rotorPole(end, phi, state);
    shoeFront[end].material = state.showPoles ? poleMat(pole) : mat.iron;
    const a = phi + (end === 'A' ? 0 : Math.PI), r = (ARM_IN + RR) / 2;
    for (const p of ['N', 'S']) {
      const label = rotorLabels[end][p];
      label.visible = state.showPoles && pole === p;
      label.position.set(r * Math.cos(a), r * Math.sin(a), ZF + 0.2);
    }
  }

  // Feldlinien: von N nach S, Dichte (Deckkraft) nach Feldstärke
  const b = statorField(state);
  fieldGroup.visible = state.showField && b !== 0;
  fieldGroup.rotation.y = b > 0 ? 0 : Math.PI;
  fieldMat.opacity = 0.25 + 0.4 * Math.min(1, Math.abs(b));
  fieldLabel.rotation.y = b > 0 ? 0 : Math.PI;                     // Beschriftung nicht spiegeln

  // Stromrichtung in den Ankerspulen: vorne bei positivem Strom in −y (Anker-Koordinaten)
  flow += dt * 1.6;
  for (const [k, cone] of currentMarks.entries()) {
    cone.visible = state.showCurrent && i !== 0;
    if (!cone.visible) continue;
    const t = (flow + (k % 3) / 3) % 1;
    const dir = -Math.sign(i);
    cone.position.y = dir * (-OUT.y + t * 2 * OUT.y);
    cone.rotation.z = dir > 0 ? 0 : Math.PI;                      // Kegel zeigt entlang +y bzw. −y
  }

  // Kräfte auf die Ankerpole
  for (const end of ['A', 'B']) {
    const f = poleForceX(end, phi, state);
    const arrow = forceArrows[end], label = forceLabels[end];
    arrow.visible = label.visible = state.showForces && f !== 0;
    if (!arrow.visible) continue;
    const a = phi + (end === 'A' ? 0 : Math.PI);
    const x = RR * Math.cos(a), y = RR * Math.sin(a);
    const len = 1.6 + 1.6 * Math.min(2, Math.abs(f) / 3);
    setArrow(arrow, len, 0.8);
    arrow.rotation.z = f > 0 ? -Math.PI / 2 : Math.PI / 2;
    arrow.position.set(x, y, ZF + 0.9);
    label.position.set(x + Math.sign(f) * (len + 0.7), y + 0.6, ZF + 0.9);
  }

  // Feldstrom anzeigen: Feldspulen nur beim Elektromagneten
  electro.userData.fieldCurrent = fieldCurrent(state);
}
