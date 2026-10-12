// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, scene, camera, controls, setView } from './szene.js';
import { syncApparatus } from './aufbau.js';
import { syncSupply } from './netzgeraet.js';
import { drawSketch } from './schaltskizze.js';
import { initUi, refresh, updateLive } from './bedienfeld.js';
import { state } from './state.js';
import { step } from './physik.js';

initUi();
refresh();
setView('start');
document.getElementById('viewStart').addEventListener('click', () => setView('start'));
document.getElementById('viewFront').addEventListener('click', () => setView('front'));

const clock = new THREE.Clock();
let textTimer = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const factor = state.slowMotion ? 0.2 : 1;
  if (state.playing) step(state, dt * factor);
  syncApparatus(state.playing ? dt * factor : 0);
  syncSupply();
  if (state.showSketch) drawSketch();
  textTimer += dt;
  if (textTimer > 0.1) { updateLive(); textTimer = 0; }   // Texte nicht in jedem Bild neu setzen
  controls.update();
  renderer.render(scene, camera);
});
