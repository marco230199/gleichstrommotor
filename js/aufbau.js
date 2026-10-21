// ------------------------------------------------------------------
// 3D-Aufbau des Gleichstrommotors: Grundplatte, Lager, Bürsten und Stator (Permanentmagnet oder
// Elektromagnet mit Feldspulen) sowie die einblendbaren Anzeigen (Feld, Pole, Stromrichtung, Kräfte).
// Die austauschbaren Rotoren mit ihren Kommutatoren stehen in rotoren.js, Ablage und Ein-/Ausbau in teile.js.
// Koordinaten in cm: Drehachse = z-Achse (zum Betrachter), Statorfeld in x-Richtung.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO, COMMUTATOR } from './config.js';
import { state } from './state.js';
import { rotorCurrents, statorField, rotorPole, statorPole, poleForceX, fieldCurrent } from './physik.js';
import { addMesh, makeTextPlane, makeCable } from './hilfen.js';
import { rod, arcShell, ring, coil, makeArrow, setArrow } from './bauteile.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const D = GEO.depth, ZF = D / 2;                 // Tiefe, Vorderseite von Rotor und Stator
const RR = GEO.rotorRadius, RS = RR + GEO.airGap;
const CZ = GEO.commZ, CR = GEO.commRadius, CL = GEO.commLength;
export const BOARD_TOP = GEO.tableY + 1.2;       // Oberkante der Holzgrundplatte

// ---------------- Grundplatte und Lager
const board = addMesh(new THREE.BoxGeometry(24, BOARD_TOP - GEO.tableY, 19), mat.wood, scene);
board.position.set(0, (BOARD_TOP + GEO.tableY) / 2, 2);
// Lagerböcke hinten und vorne; der vordere lässt sich zum Ein- und Ausbauen zur Seite schieben
export const frontBearing = new THREE.Group();
scene.add(frontBearing);
for (const z of [-5.2, CZ + 2.6]) {
  const parent = z > 0 ? frontBearing : scene;
  const post = addMesh(new THREE.BoxGeometry(1.2, -BOARD_TOP - 0.55, 1.2), mat.plastic, parent);
  post.position.set(0, (BOARD_TOP - 0.55) / 2, z);
  const eye = addMesh(new THREE.TorusGeometry(0.45, 0.18, 10, 24), mat.plastic, parent);
  eye.position.set(0, 0, z);
}

// ---------------- Bürsten mit Haltern
/**
 * Bürsten mit Haltern. Jede Gruppe hat ihren Drehpunkt am Fuß des Halters auf der Grundplatte
 * (dort ist auch das Kabel angeschlossen): rotation.z = −side · Winkel schwenkt die Bürste nach außen.
 */
export const brushes = {};
for (const side of [-1, 1]) {
  const group = new THREE.Group();
  group.position.set(side * (CR + 1.4), BOARD_TOP, CZ);
  scene.add(group);
  const top = -BOARD_TOP;                                   // Höhe der Achse über dem Fuß
  const brush = addMesh(new THREE.BoxGeometry(1.2, 2 * CR * Math.tan(COMMUTATOR.brushHalf), 0.9), mat.carbon, group);
  brush.position.set(-side * 0.8, top, 0);
  const holder = addMesh(new THREE.BoxGeometry(0.3, top, 0.3), mat.steel, group);
  holder.position.set(0, top / 2, 0);
  rod([-side * 0.2, top, 0], [0, top, 0], 0.15, mat.steel, group);
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
  statorFront[side] = arcShell(RS + 0.02, E_CORE_IN - 0.02, side < 0 ? Math.PI : 0, GEO.shoeHalf - 0.02, ZF, 0.12, mat.iron, electro);
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

// Pole des Rotors als Buchstaben (stehen immer aufrecht), für bis zu drei Arme
const MAX_ARMS = 3;
const rotorLabels = [];
for (let k = 0; k < MAX_ARMS; k++) {
  rotorLabels.push({ N: makeTextPlane('N', 1.2, { color: '#ffffff' }), S: makeTextPlane('S', 1.2, { color: '#ffffff' }) });
  for (const l of Object.values(rotorLabels[k])) { l.renderOrder = 6; scene.add(l); }
}

// Stromrichtung: wandernde Spitzen auf der Vorderseite der Rotorspulen (in Weltkoordinaten)
const currentMarks = [];
for (let k = 0; k < 3 * 4; k++) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 12), mat.current);
  scene.add(cone);
  currentMarks.push(cone);
}

// Kräfte auf die Rotorpole (Polmodell): waagrecht, in Weltkoordinaten
const forceArrows = [], forceLabels = [];
for (let k = 0; k < MAX_ARMS; k++) {
  forceArrows.push(makeArrow(mat.force, 0.2));
  forceLabels.push(makeTextPlane('F', 1.2, { color: '#7b1fa2' }));
  scene.add(forceArrows[k], forceLabels[k]);
}

// ---------------- Abgleich mit dem Zustand (jedes Bild)
// Polfarbe; ohne Pol (oder ohne Polanzeige) die Eisenfarbe des Teils
const poleMat = (pole, iron) => (pole === 'N' ? mat.north : pole === 'S' ? mat.south : iron);
let flow = 0;

/**
 * rotor: der eingebaute Rotor aus teile.js (oder null, wenn keiner eingebaut ist bzw. gerade bewegt wird).
 * Seine Drehung setzt teile.js; hier werden Pole, Stromrichtung und Kräfte angezeigt.
 */
export function syncApparatus(dt, rotor) {
  const phi = state.phi;
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
      statorFront[side].material = state.showPoles ? poleMat(pole, mat.iron) : mat.iron;
      statorLabels[side].N.visible = state.showPoles && pole === 'N';
      statorLabels[side].S.visible = state.showPoles && pole === 'S';
    }
  }

  // Feldlinien: von N nach S, Dichte (Deckkraft) nach Feldstärke
  const b = statorField(state);
  fieldGroup.visible = state.showField && b !== 0;
  fieldGroup.rotation.y = b > 0 ? 0 : Math.PI;
  fieldMat.opacity = 0.25 + 0.4 * Math.min(1, Math.abs(b));
  fieldLabel.rotation.y = b > 0 ? 0 : Math.PI;                     // Beschriftung nicht spiegeln

  // Rotor: Pole (Farbe der Polflächen und aufrechte Buchstaben), Stromrichtung, Kräfte
  const arms = rotor ? rotor.arms : [];
  const armDefs = rotor ? rotor.def.arms : [];
  const coils = rotor ? rotorCurrents(phi, state).coils : [];
  for (let k = 0; k < MAX_ARMS; k++) {
    const arm = arms[k], def = armDefs[k];
    const pole = arm ? rotorPole(k, phi, state) : null;
    if (arm) arm.front.material = state.showPoles ? poleMat(pole, mat.ironRotor) : mat.ironRotor;
    const a = def ? phi + def.angle : 0;
    for (const p of ['N', 'S']) {
      const label = rotorLabels[k][p];
      label.visible = !!arm && state.showPoles && pole === p;
      if (label.visible) label.position.set(arm.labelR * Math.cos(a), arm.labelR * Math.sin(a), ZF + 0.2);
    }
    const f = arm ? poleForceX(k, phi, state) : 0;
    const arrow = forceArrows[k], flabel = forceLabels[k];
    arrow.visible = flabel.visible = !!arm && state.showForces && f !== 0;
    if (arrow.visible) {
      const x = arm.tipR * Math.cos(a), y = arm.tipR * Math.sin(a);
      const len = 1.6 + 1.6 * Math.min(2, Math.abs(f) / 3);
      setArrow(arrow, len, 0.8);
      arrow.rotation.z = f > 0 ? -Math.PI / 2 : Math.PI / 2;
      arrow.position.set(x, y, ZF + 0.9);
      flabel.position.set(x + Math.sign(f) * (len + 0.7), y + 0.6, ZF + 0.9);
    }
  }

  // Stromrichtung in den Rotorspulen: vorne bei positivem Strom in −y (Koordinaten des Spulenpakets)
  flow += dt * 1.6;
  const packs = rotor ? rotor.packs : [];
  for (const [k, cone] of currentMarks.entries()) {
    const pack = packs[Math.floor(k / 3)];
    const i = pack ? coils[pack.coil] : 0;
    cone.visible = !!pack && state.showCurrent && Math.abs(i) > 1e-9;
    if (!cone.visible) continue;
    const t = (flow + (k % 3) / 3) % 1;
    const dir = -Math.sign(i);
    const lx = (pack.x0 + pack.x1) / 2, ly = dir * (-pack.out.y + t * 2 * pack.out.y);
    const a = phi + pack.frame;
    cone.position.set(lx * Math.cos(a) - ly * Math.sin(a), lx * Math.sin(a) + ly * Math.cos(a), pack.out.z + 0.25);
    cone.rotation.z = a + (dir > 0 ? 0 : Math.PI);                 // Kegel zeigt entlang ±y des Pakets
  }

  // Feldstrom anzeigen: Feldspulen nur beim Elektromagneten
  electro.userData.fieldCurrent = fieldCurrent(state);
}
