// ------------------------------------------------------------------
// Zustand der Simulation
// ------------------------------------------------------------------
import { RANGES, START_ANGLE } from './config.js';

export const state = {
  powerOn: false,                 // Schalter im Stromkreis
  current: RANGES.current.start,  // Stromstärke in A (Rotor; beim Elektromagneten auch in den Feldspulen)
  polarity: 1,                    // +1: Pluspol an der linken Bürste
  stator: 'permanent',            // 'permanent' oder 'elektro'
  rotor: 'spule',                 // eingebauter (bzw. zuletzt gewählter) Rotor: 'spule', 'doppelT', 'dreipolig'
  rotorInstalled: true,           // Rotor im Motor (sonst in der Ablage)
  commutatorOn: true,             // Kommutator auf der Welle (sonst abgenommen in der Ablage)
  // Permanentmagnet: +1 Nordpol links (Feld zeigt nach rechts), −1 umgedreht.
  // Elektromagnet: Anschluss der Feldspulen (+1 normal, −1 umgepolt).
  magnet: 1,
  playing: true,
  slowMotion: true,
  // Bewegung des Rotors: Winkel des gold markierten Rotorpols A gegen die Waagrechte
  // (gegen den Uhrzeigersinn, Blick von vorne) und Winkelgeschwindigkeit
  phi: START_ANGLE,
  omega: 0,
  // Anzeigen
  showField: false,               // Anzeigen erst auf Wunsch
  showPoles: false,               // Pole N/S an Rotor und Stator
  showCurrent: false,
  showForces: false,
  showSketch: false,
  sketchLarge: false,             // Schaltskizze vergrößert
};
