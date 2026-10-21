// ------------------------------------------------------------------
// Netzgerät mit Stromanzeige, Drehknopf, Kontrolllampe und Kabeln
// Kabel zu den Bürsten (Rotor) und – beim Elektromagneten – zusätzlich zu den Feldspulen
// (parallel zum Rotor an denselben Buchsen). Die Anzeige zeigt den Rotorstrom: Am Totpunkt,
// wenn die Bürsten auf den Lücken liegen, springt sie auf 0. „Polung umkehren“ steckt die Kabel um.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO, RANGES } from './config.js';
import { state } from './state.js';
import { armatureCurrent } from './physik.js';
import { addMesh, canvasTexture, makeTextPlane, makeCable, formatNumber } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';
import { brushFoot, fieldSocket, BOARD_TOP } from './aufbau.js';

const W = 14, H = 9, D = 11;                     // Gehäuse in cm
const FLOOR = GEO.tableY;
const BOARD_EDGE = 12;                           // rechte Kante der Grundplatte (x)
const ZF_FRONT = GEO.depth / 2;                  // Vorderseite des Stators (z)

const group = new THREE.Group();
group.position.set(22.5, FLOOR, -1);             // rechts neben dem Motor
group.rotation.y = 0.25;                         // Vorderseite zur Startansicht
scene.add(group);

const housing = addMesh(new THREE.BoxGeometry(W, H, D), mat.housing, group);
housing.position.y = H / 2 + 0.4;
for (const fx of [-W / 2 + 1.5, W / 2 - 1.5]) for (const fz of [-D / 2 + 1.5, D / 2 - 1.5]) {
  const foot = addMesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 12), mat.knob, group);
  foot.position.set(fx, 0.2, fz);
}
const panel = addMesh(new THREE.BoxGeometry(W - 1.2, H - 1.2, 0.3), mat.panel, group);
panel.position.set(0, H / 2 + 0.4, D / 2 + 0.1);
const FRONT = D / 2 + 0.27;

const title = makeTextPlane('Netzgerät', 1.1, { color: '#ffffff' });
title.position.set(0, H - 0.9, FRONT);
group.add(title);

// Digitalanzeige (Rotorstrom)
const display = canvasTexture(320, 110);
const screen = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.1), new THREE.MeshBasicMaterial({ map: display.texture }));
screen.position.set(-2.6, H - 3.4, FRONT);
group.add(screen);
let shown = null;
function setDisplay(text) {
  if (text === shown) return;
  shown = text;
  const { ctx } = display;
  ctx.fillStyle = '#0d1a0d';
  ctx.fillRect(0, 0, 320, 110);
  ctx.fillStyle = '#5dff6a';
  ctx.font = 'bold 66px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 304, 58);
  display.texture.needsUpdate = true;
}

// Drehknopf (Stromstärke) mit Markierung
const knob = addMesh(new THREE.CylinderGeometry(1.4, 1.4, 1.1, 32), mat.knob, group);
knob.rotation.x = Math.PI / 2;
knob.position.set(3.9, H - 3.4, FRONT + 0.55);
const mark = addMesh(new THREE.BoxGeometry(0.25, 0.1, 1), mat.housing, knob);
mark.position.set(0, 0.56, -0.8);

// Kontrolllampe: leuchtet, wenn der Strom eingeschaltet ist
const led = addMesh(new THREE.SphereGeometry(0.35, 16, 12), mat.ledOff, group);
led.position.set(-4.8, 2.4, FRONT);
const ledLabel = makeTextPlane('ein', 0.7, { color: '#ffffff', bold: false });
ledLabel.position.set(-4.8, 3.4, FRONT);
group.add(ledLabel);

// Buchsen: Minus (blau) und Plus (rot)
const SOCKETS = { minus: { x: 0.9, material: mat.cableBlue, text: '−' }, plus: { x: 4.1, material: mat.cableRed, text: '+' } };
const socketWorld = {};
for (const [, { x, material, text }] of Object.entries(SOCKETS)) {
  const socket = addMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 20), material, group);
  socket.rotation.x = Math.PI / 2;
  socket.position.set(x, 2.4, FRONT + 0.45);
  const tag = makeTextPlane(text, 0.9, { color: '#ffffff' });
  tag.position.set(x, 3.6, FRONT);
  group.add(tag);
}
group.updateMatrixWorld(true);
for (const [name, { x }] of Object.entries(SOCKETS)) {
  socketWorld[name] = group.localToWorld(new THREE.Vector3(x, 2.4, FRONT + 0.9));
}
const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);   // aus der Frontplatte heraus

// ---------------- Kabel
let cables = [];
let cableKey = null;

/** Kabel von einer Buchse über die Tischplatte und die rechte Kante der Grundplatte zu einem Anschluss */
function cable(socket, target, laneZ, approach, material, lift = 0) {
  const s = socket.clone().setY(socket.y + lift);
  const p1 = s.clone().addScaledVector(outward, 2.2).setY(s.y - 0.8);
  const p2 = s.clone().addScaledVector(outward, 4.5).setY(FLOOR);
  const pts = [
    s.toArray(), p1.toArray(), p2.toArray(),
    [BOARD_EDGE + 2, FLOOR, laneZ],
    [BOARD_EDGE + 0.4, BOARD_TOP + 0.4, laneZ],
    [BOARD_EDGE - 1.5, BOARD_TOP, laneZ],
    ...approach,
    target.toArray(),
  ];
  cables.push(makeCable(pts, material, scene, FLOOR, 0.25));
}

function buildCables() {
  for (const c of cables) { scene.remove(c); c.geometry.dispose(); }
  cables = [];
  // Rotor: linke Bürste am Pluspol bei polarity +1; das Kabel zur linken Bürste läuft weiter vorne
  for (const side of [-1, 1]) {
    const plus = side === -state.polarity;
    const foot = brushFoot(side);
    const lane = side < 0 ? 10.6 : 8.0;
    cable(socketWorld[plus ? 'plus' : 'minus'], foot.clone().setY(BOARD_TOP + 0.9),
      lane, [[foot.x + 1.5, BOARD_TOP, lane], [foot.x, BOARD_TOP, foot.z + 1.2], [foot.x, BOARD_TOP + 0.3, foot.z + 0.3]],
      plus ? mat.cableRed : mat.cableBlue);
  }
  // Feldspulen (Elektromagnet): parallel zum Rotor an denselben Buchsen des Netzgeräts,
  // jeweils an die äußere Buchse der Spule (die inneren verbindet das schwarze Kabel).
  // Die linke Spule liegt am Pluspol, wenn magnet · polarity = +1.
  if (state.stator === 'elektro') {
    for (const side of [-1, 1]) {
      const plus = (side < 0) === (state.magnet * state.polarity > 0);
      const t = fieldSocket(side, 'outer');
      // links ganz vorne an allem vorbei, rechts hinter den Kabeln zu den Bürsten
      const lane = side < 0 ? 11.3 : 6.9;
      const up = [[t.x + side * 0.4, BOARD_TOP + 0.3, ZF_FRONT + 3.2], [t.x + side * 0.3, -6.8, ZF_FRONT + 2.0],
        [t.x, t.y - 0.4, t.z + 0.7]];
      const approach = side < 0
        ? [[t.x - 1.6, BOARD_TOP, lane], [t.x - 1.0, BOARD_TOP, 9.0], ...up]
        : [[t.x + 1.4, BOARD_TOP, lane], ...up];
      cable(socketWorld[plus ? 'plus' : 'minus'], t, lane, approach, plus ? mat.cableRed : mat.cableBlue, 0.35);
    }
  }
}

// ---------------- Abgleich mit dem Zustand (jedes Bild)
export function syncSupply() {
  const key = `${state.stator}|${state.polarity}|${state.magnet}`;
  if (key !== cableKey) { cableKey = key; buildCables(); }
  const i = Math.abs(armatureCurrent(state.phi, state).armature);
  setDisplay(`${formatNumber(i, 2)} A`);
  led.material = state.powerOn ? mat.ledOn : mat.ledOff;
  // Knopf von −135° (0 A) bis +135° (Höchstwert)
  knob.rotation.y = THREE.MathUtils.degToRad(135 - 270 * state.current / RANGES.current.max);
}
