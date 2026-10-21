// ------------------------------------------------------------------
// Erklärvideo aus der Simulation: Start, Bildberechnung und Steuerung für die Aufnahme.
//
// Vorschau: video.html im Browser öffnen (läuft in Echtzeit, ohne Ton, Sprechdauer geschätzt).
// Aufnahme: video.html?aufnahme – das Aufnahme-Skript ruft window.video.starte(…) und dann
//           Bild für Bild window.video.bild() auf.
// ------------------------------------------------------------------
import { renderer, camera, scene } from '../szene.js';
import { syncApparatus } from '../aufbau.js';
import { updateParts, installedRotor, busy } from '../teile.js';
import { syncSupply } from '../netzgeraet.js';
import { drawSketch } from '../schaltskizze.js';
import { state } from '../state.js';
import { step } from '../physik.js';
import { tick, jetzt } from './ablauf.js';
import { kameraAusrichten } from './kamera.js';
import { markenAktualisieren } from './einblendungen.js';
import { tafelZeichnen } from './tafel.js';
import { regie } from './regie.js';

const BILDRATE = 30;
const DT = 1 / BILDRATE;

renderer.setPixelRatio(1);
window.dispatchEvent(new Event('resize'));

// ---------------- Ein Bild berechnen
let fertig = false;
async function bild() {
  tick(DT);
  await new Promise(r => setTimeout(r, 0));   // Regie reagiert, bevor das Bild entsteht
  const zeitfaktor = state.slowMotion ? 0.2 : 1;
  updateParts(DT);
  if (state.playing && !busy()) step(state, DT * zeitfaktor);
  syncApparatus(DT * zeitfaktor, installedRotor());
  syncSupply();
  drawSketch();
  tafelZeichnen();
  kameraAusrichten();
  markenAktualisieren();
  renderer.render(scene, camera);
  return { t: jetzt(), fertig };
}

// ---------------- Start
const aufnahme = new URLSearchParams(location.search).has('aufnahme');

// Sprechdauer: bei der Aufnahme aus den Tondateien, sonst geschätzt (≈ 14 Zeichen pro Sekunde)
async function starte({ dauer = null, abspann = '' } = {}) {
  document.getElementById('abspann').textContent = abspann;
  const texte = await (await fetch('video/texte.json')).json();
  const sprechdauer = dauer || Object.fromEntries(Object.entries(texte).map(([k, s]) => [k, s.length / 14]));
  const protokoll = { ton: [], marken: {} };
  regie({ texte, sprechdauer, protokoll }).then(() => { fertig = true; });
  return protokoll;
}

window.video = { starte, bild, bildrate: BILDRATE, protokoll: null };

if (!aufnahme) {
  // Vorschau in Echtzeit
  await starte();
  let rest = 0, zuletzt = performance.now();
  const schleife = async now => {
    rest += Math.min(0.2, (now - zuletzt) / 1000);
    zuletzt = now;
    while (rest >= DT && !fertig) { await bild(); rest -= DT; }
    if (!fertig) requestAnimationFrame(schleife);
  };
  requestAnimationFrame(schleife);
}
