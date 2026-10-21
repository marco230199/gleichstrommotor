// ------------------------------------------------------------------
// Kamera im Video: feste Ansichten, Fahrten und Schwenks (in Videozeit)
// ------------------------------------------------------------------
import * as THREE from 'three';
import { camera } from '../szene.js';
import { animiere } from './ablauf.js';

export const ANSICHTEN = {
  gesamt: { pos: [24, 27, 54], ziel: [-1, -5, 2] },         // Motor, Netzgerät und Teileablage
  motorRechts: { pos: [-14, 12, 40], ziel: [-9, -2, 2] },   // Motor rechts im Bild, links Platz für die Tafel
  vorne: { pos: [-6, 5, 34], ziel: [3, -0.5, 0] },          // fast von vorne, rechts Platz für die Skizze
  nah: { pos: [10, 9, 30], ziel: [0, -1, 3] },              // Motor mit Kommutator und Schleifkontakten
  tausch: { pos: [4, 22, 52], ziel: [-9, -6, 2] },          // Motor und Teileablage (Tausch des Rotors)
}
const blickZiel = new THREE.Vector3();
export function kameraSetzen(name) {
  const a = ANSICHTEN[name];
  camera.position.set(...a.pos);
  blickZiel.set(...a.ziel);
}
export function kameraFahrt(name, sek = 2) {
  const a = ANSICHTEN[name];
  const p0 = camera.position.clone(), z0 = blickZiel.clone();
  const p1 = new THREE.Vector3(...a.pos), z1 = new THREE.Vector3(...a.ziel);
  return animiere(sek, p => {
    camera.position.lerpVectors(p0, p1, p);
    blickZiel.lerpVectors(z0, z1, p);
  });
}
/** Kamera langsam um die senkrechte Achse durch das Blickziel schwenken (Winkel in Grad) */
export function kameraSchwenk(grad, sek) {
  const start = camera.position.clone().sub(blickZiel);
  return animiere(sek, p => {
    const r = start.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(grad) * p);
    camera.position.copy(blickZiel).add(r);
  });
}

/** Jedes Bild: Kamera auf das Blickziel richten */
export function kameraAusrichten() {
  camera.lookAt(blickZiel);
  camera.updateMatrixWorld();   // Beschriftungen werden vor dem Rendern projiziert
}
