// ------------------------------------------------------------------
// Austauschbare Teile: Ablage der Rotoren auf dem Tisch, Ein- und Ausbau mit Animation.
// Zwei Teile lassen sich bewegen:
//   – der Rotor (herausnehmen, einsetzen, gegen einen anderen tauschen)
//   – sein Kommutator (abnehmen und wieder aufsetzen; abgenommen liegt er in der Ablage)
// Dazu werden die Bürsten abgehoben und der vordere Lagerbock zur Seite geschoben.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO, START_ANGLE } from './config.js';
import { state } from './state.js';
import { ROTORS } from './physik.js';
import { addMesh, makeTextPlane } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';
import { buildRotor, SHAFT } from './rotoren.js';
import { frontBearing, brushes } from './aufbau.js';

export const ROTOR_TYPES = ['spule', 'doppelT', 'dreipolig'];
const TABLE = GEO.tableY, CZ = GEO.commZ, CR = GEO.commRadius;
const REST_Y = TABLE + 4.7;                       // Achshöhe der Rotoren in der Ablage
const PULL_Z = 9;                                  // so weit wird der Rotor nach vorne aus dem Stator gezogen
// Ablage links neben der Grundplatte: Die Rotoren liegen quer (Achse in x-Richtung) nebeneinander.
const SLOTS = {
  spule: new THREE.Vector3(-22, REST_Y, -12),
  doppelT: new THREE.Vector3(-22, REST_Y, -1.5),
  dreipolig: new THREE.Vector3(-22, REST_Y, 9),
};
const TRAY_RY = Math.PI / 2;                       // Drehung um y: Welle zeigt zur Grundplatte
const COMM_SLOT = new THREE.Vector3(-16, TABLE + 1.0 + CR, 17);   // Mitte des abgenommenen Kommutators
const BEARING_ASIDE = -6.5, BRUSH_SWING = 20 * Math.PI / 180;   // Bürsten nach außen schwenken

// ---------------- Rotor bauen und ablegen
export const rotors = {};
for (const type of ROTOR_TYPES) {
  const r = buildRotor(type);
  scene.add(r.group);
  rotors[type] = r;
  // Ablage: zwei Böcke unter der Welle und ein Schild auf dem Tisch
  const slot = SLOTS[type];
  for (const dx of [SHAFT.back + 0.8, SHAFT.front - 0.8]) {
    const stand = addMesh(new THREE.BoxGeometry(0.8, REST_Y - 0.22 - TABLE, 1.2), mat.plastic, scene);
    stand.position.set(slot.x + dx, (REST_Y - 0.22 + TABLE) / 2, slot.z);
  }
  const tag = makeTextPlane(ROTORS[type].name, 0.9, { color: '#1d2733' });
  tag.rotation.x = -Math.PI / 2;
  tag.position.set(slot.x + 1.8, TABLE + 0.02, slot.z + 4.9);
  scene.add(tag);
}
{
  const stand = addMesh(new THREE.BoxGeometry(2.4, 1.0, 1.6), mat.plastic, scene);
  stand.position.set(COMM_SLOT.x, TABLE + 0.5, COMM_SLOT.z);
  const tag = makeTextPlane('Kommutator', 0.9, { color: '#1d2733' });
  tag.rotation.x = -Math.PI / 2;
  tag.position.set(COMM_SLOT.x, TABLE + 0.02, COMM_SLOT.z + 3);
  scene.add(tag);
}
function placeInSlot(type) {
  const g = rotors[type].group;
  g.position.copy(SLOTS[type]);
  g.rotation.set(0, TRAY_RY, START_ANGLE);
}
for (const type of ROTOR_TYPES) {
  if (type === state.rotor && state.rotorInstalled) rotors[type].group.position.set(0, 0, 0);
  else placeInSlot(type);
}

// ---------------- Ablaufsteuerung: Schritte nacheinander, je mit Dauer und Verlauf
const queue = [];
let current = null, elapsed = 0;
const ease = t => t * t * (3 - 2 * t);
/** Schritt anhängen: begin() einmal zu Beginn, tick(t) mit t = 0 … 1, end() zum Schluss */
function addStep(duration, { begin, tick, end } = {}) { queue.push({ duration, begin, tick, end }); }

/**
 * Objekt bewegen: Position p, Drehung um die eigene Achse r (rotation.z) und Lage ry (rotation.y,
 * in der Ablage quer). arc: Höhe des Bogens nach oben.
 */
function moveTo(obj, getTarget, duration, arc = 0) {
  let from, to;
  addStep(duration, {
    begin: () => {
      from = { p: obj.position.clone(), r: obj.rotation.z, ry: obj.rotation.y };
      to = { ry: 0, ...getTarget() };
    },
    tick: t => {
      const e = ease(t);
      obj.position.lerpVectors(from.p, to.p, e);
      obj.position.y += arc * Math.sin(Math.PI * e);
      obj.rotation.z = from.r + (to.r - from.r) * e;
      obj.rotation.y = from.ry + (to.ry - from.ry) * e;
    },
  });
}

let motorOpen = false;
function openMotor() {
  if (motorOpen) return;
  motorOpen = true;
  addStep(0.45, { tick: t => { for (const side of [-1, 1]) brushes[side].rotation.z = -side * BRUSH_SWING * ease(t); } });
  addStep(0.45, { tick: t => { frontBearing.position.x = BEARING_ASIDE * ease(t); } });
}
function closeMotor() {
  addStep(0.45, { tick: t => { frontBearing.position.x = BEARING_ASIDE * (1 - ease(t)); } });
  addStep(0.45, { tick: t => { for (const side of [-1, 1]) brushes[side].rotation.z = -side * BRUSH_SWING * (1 - ease(t)); } });
  addStep(0, { end: () => { motorOpen = false; } });
}

export const busy = () => current !== null || queue.length > 0;

/** Der eingebaute Rotor, solange er ruhig im Motor sitzt (sonst null) */
export function installedRotor() {
  return state.rotorInstalled && !busy() ? rotors[state.rotor] : null;
}

// ---------------- Aktionen (Knöpfe)
/** Polflächen eines Rotors wieder eisengrau (außerhalb des Motors ist er kein Magnet) */
function unpole(type) {
  for (const arm of rotors[type].arms) arm.front.material = mat.ironRotor;
}

function removeSteps(type) {
  const g = rotors[type].group;
  addStep(0, { begin: () => { state.rotorInstalled = false; unpole(type); } });
  moveTo(g, () => ({ p: new THREE.Vector3(0, 0, PULL_Z), r: g.rotation.z }), 0.9);
  moveTo(g, () => ({ p: SLOTS[type].clone(), r: START_ANGLE, ry: TRAY_RY }), 1.4, 4);
}
function insertSteps(type) {
  const g = rotors[type].group;
  moveTo(g, () => ({ p: new THREE.Vector3(0, 0, PULL_Z), r: START_ANGLE }), 1.4, 4);
  moveTo(g, () => ({ p: new THREE.Vector3(0, 0, 0), r: START_ANGLE }), 0.9);
  addStep(0, { end: () => { state.rotor = type; state.phi = START_ANGLE; state.rotorInstalled = true; } });
}

/** Rotor herausnehmen (nur mit aufgesetztem Kommutator; der bleibt am Rotor) */
export function removeRotor() {
  if (busy() || !state.rotorInstalled || !state.commutatorOn) return false;
  state.omega = 0;
  openMotor();
  removeSteps(state.rotor);
  closeMotor();
  return true;
}

/** Rotor einsetzen bzw. gegen einen anderen tauschen */
export function insertRotor(type) {
  if (busy() || !state.commutatorOn) return false;
  if (state.rotorInstalled && type === state.rotor) return false;
  state.omega = 0;
  openMotor();
  if (state.rotorInstalled) removeSteps(state.rotor);
  insertSteps(type);
  closeMotor();
  return true;
}

/** Kommutator abnehmen und in die Ablage legen (der Motor bleibt danach geöffnet) */
export function removeCommutator() {
  if (busy() || !state.rotorInstalled || !state.commutatorOn) return false;
  const comm = rotors[state.rotor].commutator;
  state.omega = 0;
  openMotor();
  addStep(0, { begin: () => { state.commutatorOn = false; unpole(state.rotor); scene.attach(comm); } });
  moveTo(comm, () => ({ p: new THREE.Vector3(0, 0, 5.5), r: comm.rotation.z }), 0.7);
  moveTo(comm, () => ({ p: COMM_SLOT.clone().setZ(COMM_SLOT.z - CZ), r: 0 }), 1.1, 3);
  // Bürsten und vorderer Lagerbock bleiben aufgeklappt: freie Sicht auf den Rotor.
  // Beim Aufsetzen des Kommutators werden sie wieder geschlossen.
  return true;
}

/** Kommutator wieder auf die Welle des eingebauten Rotors setzen */
export function attachCommutator() {
  if (busy() || !state.rotorInstalled || state.commutatorOn) return false;
  const r = rotors[state.rotor], comm = r.commutator;
  state.omega = 0;
  openMotor();
  moveTo(comm, () => ({ p: new THREE.Vector3(0, 0, 5.5), r: r.group.rotation.z }), 1.1, 3);
  moveTo(comm, () => ({ p: new THREE.Vector3(0, 0, 0), r: r.group.rotation.z }), 0.7);
  addStep(0, {
    end: () => {
      r.group.attach(comm);
      comm.position.set(0, 0, 0);
      comm.rotation.set(0, 0, 0);
      state.commutatorOn = true;
    },
  });
  closeMotor();
  return true;
}

// ---------------- Jedes Bild: Ablauf weiterführen, eingebauten Rotor drehen
export function updateParts(dt) {
  if (!current && queue.length) {
    current = queue.shift();
    elapsed = 0;
    current.begin?.();
  }
  if (current) {
    elapsed += dt;
    const t = current.duration > 0 ? Math.min(1, elapsed / current.duration) : 1;
    current.tick?.(t);
    if (t >= 1) {
      current.end?.();
      current = null;
      if (queue.length) updateParts(0);           // nächsten Schritt sofort beginnen
    }
  }
  const r = installedRotor();
  if (r) r.group.rotation.z = state.phi;
}
