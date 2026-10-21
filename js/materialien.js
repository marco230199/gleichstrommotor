// ------------------------------------------------------------------
// Gemeinsam genutzte Materialien und Farben
// ------------------------------------------------------------------
import * as THREE from 'three';

// Farben der beiden Kommutatorhälften und der zugehörigen Rotorpole (auch in der Schaltskizze)
export const COLOR_A = '#e0a526';   // gold
export const COLOR_B = '#26a69a';   // türkis
export const COLOR_C = '#8e6bbf';   // violett (drittes Segment beim dreipoligen Anker)
// Pole: Nordpol rot, Südpol grün
export const COLOR_N = '#d32f2f';
export const COLOR_S = '#2e7d32';

export const mat = {
  table: new THREE.MeshStandardMaterial({ color: 0xc8a27a, roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x9c6b3c, roughness: 0.7 }),
  // Eisen: Stator dunkler, Rotor deutlich heller – so sind beide auch ohne Polfarben gut zu unterscheiden
  iron: new THREE.MeshStandardMaterial({ color: 0x5d656e, metalness: 0.35, roughness: 0.65 }),
  ironRotor: new THREE.MeshStandardMaterial({ color: 0xdde3ea, metalness: 0.15, roughness: 0.45 }),
  ironDark: new THREE.MeshStandardMaterial({ color: 0x4a5058, metalness: 0.35, roughness: 0.65 }),
  north: new THREE.MeshStandardMaterial({ color: COLOR_N, roughness: 0.45 }),
  south: new THREE.MeshStandardMaterial({ color: COLOR_S, roughness: 0.45 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xc8733a, metalness: 0.85, roughness: 0.35 }),
  copperDark: new THREE.MeshStandardMaterial({ color: 0xa65a26, metalness: 0.8, roughness: 0.4 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.9, roughness: 0.3 }),
  plastic: new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.5 }),
  carbon: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 }),
  halfA: new THREE.MeshStandardMaterial({ color: COLOR_A, metalness: 0.7, roughness: 0.35 }),
  halfB: new THREE.MeshStandardMaterial({ color: COLOR_B, metalness: 0.5, roughness: 0.35 }),
  halfC: new THREE.MeshStandardMaterial({ color: COLOR_C, metalness: 0.5, roughness: 0.35 }),
  cableRed: new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 }),
  cableBlue: new THREE.MeshStandardMaterial({ color: 0x1e5bc6, roughness: 0.5 }),
  cableBlack: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 }),
  // Netzgerät
  housing: new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.5 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x3b4450, roughness: 0.55 }),
  knob: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }),
  ledOff: new THREE.MeshStandardMaterial({ color: 0x1f4a24, roughness: 0.4 }),
  ledOn: new THREE.MeshStandardMaterial({ color: 0x39ff5a, emissive: 0x39ff5a, emissiveIntensity: 1.5 }),
  // Anzeigen
  field: new THREE.MeshBasicMaterial({ color: 0x1e88e5, transparent: true, opacity: 0.55, depthWrite: false }),
  current: new THREE.MeshBasicMaterial({ color: 0xffb300 }),
  force: new THREE.MeshBasicMaterial({ color: 0x7b1fa2 }),
};
