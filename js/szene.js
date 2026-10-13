// ------------------------------------------------------------------
// Renderer, Szene, Kamera, Licht und Tisch
// ------------------------------------------------------------------
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { addMesh } from './hilfen.js';
import { mat } from './materialien.js';
import { GEO } from './config.js';

const container = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8edf2);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;

export const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 10;
controls.maxDistance = 120;

const VIEWS = {
  start: { position: [24, 27, 54], target: [-1, -5, 2] },    // Motor, Netzgerät und Teileablage
  front: { position: [0, 1, 44], target: [0, -1, 0] },       // Blick entlang der Achse wie in der Schaltskizze
};
export function setView(name = 'start') {
  const v = VIEWS[name];
  camera.position.set(...v.position);
  controls.target.set(...v.target);
  // Kamera per Adresse setzen (zum Prüfen): …/index.html#cam=x,y,z,zielX,zielY,zielZ
  const cam = name === 'start' && location.hash.match(/cam=([-\d.,]+)/);
  if (cam) {
    const c = cam[1].split(',').map(Number);
    camera.position.set(c[0], c[1], c[2]);
    controls.target.set(c[3], c[4], c[5]);
  }
}

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(25, 60, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 160 });
sun.shadow.bias = -0.0005;
scene.add(sun);

const table = addMesh(new THREE.BoxGeometry(110, 3, 80), mat.table, scene);
table.position.set(0, GEO.tableY - 1.5, 0);

// Größe anpassen; im Hochformat das Sichtfeld vergrößern
function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const BASE_FOV = 38;
  const BASE_ASPECT = 1.5;
  camera.fov = camera.aspect >= BASE_ASPECT
    ? BASE_FOV
    : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * BASE_ASPECT / camera.aspect));
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
