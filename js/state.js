// ------------------------------------------------------------------
// Zustand der Simulation
// ------------------------------------------------------------------
import { RANGES, START_ANGLE } from './config.js';

export const state = {
  powerOn: false,                 // Schalter im Stromkreis
  current: RANGES.current.start,  // Stromstärke in A (Anker; beim Elektromagneten auch in den Feldspulen)
  polarity: 1,                    // +1: Pluspol an der linken Bürste
  stator: 'permanent',            // 'permanent' oder 'elektro'
  // Permanentmagnet: +1 Nordpol links (Feld zeigt nach rechts), −1 umgedreht.
  // Elektromagnet: Anschluss der Feldspulen (+1 normal, −1 umgepolt).
  magnet: 1,
  playing: true,
  slowMotion: false,
  // Bewegung des Ankers: Winkel des gold markierten Ankerpols A gegen die Waagrechte
  // (gegen den Uhrzeigersinn, Blick von vorne) und Winkelgeschwindigkeit
  phi: START_ANGLE,
  omega: 0,
  // Anzeigen
  showField: false,               // Feldlinien erst auf Wunsch
  showPoles: true,                // Pole N/S an Anker und Stator
  showCurrent: true,
  showForces: true,
  showSketch: true,
  sketchLarge: false,             // Schaltskizze vergrößert
};
