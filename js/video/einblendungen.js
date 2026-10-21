// ------------------------------------------------------------------
// Einblendungen für das Video: Beschriftungen mit Hinweislinie (an 3D-Punkten),
// Bogenpfeile für die Drehrichtung und die Linie durch den Totpunkt (3D),
// Untertitel und Ein-/Ausblenden von Kästen.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { scene, camera, renderer } from '../szene.js';
import { animiere } from './ablauf.js';

const $ = id => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';

// ---------------- Kästen ein- und ausblenden (opacity; die Zeit läuft über animiere)
const deckkraft = el => Number(el.style.opacity || getComputedStyle(el).opacity);
export function blende(id, ziel, sek = 0.5) {
  const el = typeof id === 'string' ? $(id) : id;
  const von = deckkraft(el);
  return animiere(sek, p => { el.style.opacity = von + (ziel - von) * p; });
}

export function untertitel(text) {
  $('untertitel').textContent = text;
}

export function kapitel(text) {
  $('kapitel').textContent = text;
}

// ---------------- Beschriftungen an 3D-Punkten
const marken = new Set();

/**
 * Beschriftung, die auf einen Punkt im 3D-Bild zeigt (mit weitere: auf mehrere Punkte).
 * punkt: [x, y, z] oder Funktion, die [x, y, z] bzw. einen THREE.Vector3 liefert; versatz in Pixeln.
 */
export function marke(text, punkt, versatz = [0, -90], { gross = false, farbe = '#33404d', weitere = [] } = {}) {
  const el = document.createElement('div');
  el.className = 'marke' + (gross ? ' gross' : '');
  el.textContent = text;
  el.style.opacity = 0;
  $('beschriftungen').appendChild(el);
  const ziele = [punkt, ...weitere].map(p => {
    const linie = document.createElementNS(SVG, 'line');
    linie.setAttribute('stroke', farbe);
    linie.setAttribute('stroke-width', 3);
    const kreis = document.createElementNS(SVG, 'circle');
    kreis.setAttribute('r', 6);
    kreis.setAttribute('fill', farbe);
    $('linien').append(linie, kreis);
    return { p, linie, kreis };
  });
  const m = { el, ziele, versatz, sichtbar: 0 };
  marken.add(m);
  m.zeigen = (sek = 0.4) => animiere(sek, p => { m.sichtbar = p; });
  m.weg = (sek = 0.4) => animiere(sek, p => { m.sichtbar = 1 - p; }).then(() => {
    marken.delete(m);
    el.remove();
    for (const z of ziele) { z.linie.remove(); z.kreis.remove(); }
  });
  return m;
}

const v = new THREE.Vector3();
function bildpunkt(punkt, w, h) {
  const p = typeof punkt === 'function' ? punkt() : punkt;
  if (Array.isArray(p)) v.set(...p); else v.copy(p);
  v.project(camera);
  return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h];
}
export function markenAktualisieren() {
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  for (const m of marken) {
    const [x, y] = bildpunkt(m.ziele[0].p, w, h);
    const lx = x + m.versatz[0], ly = y + m.versatz[1];
    m.el.style.left = `${lx}px`;
    m.el.style.top = `${ly}px`;
    m.el.style.opacity = m.sichtbar;
    const mitLinie = m.versatz[0] !== 0 || m.versatz[1] !== 0;
    for (const z of m.ziele) {
      const [px, py] = bildpunkt(z.p, w, h);
      for (const [k, val] of Object.entries({ x1: px, y1: py, x2: lx, y2: ly })) z.linie.setAttribute(k, val);
      z.kreis.setAttribute('cx', px);
      z.kreis.setAttribute('cy', py);
      z.linie.style.opacity = z.kreis.style.opacity = mitLinie ? m.sichtbar : 0;
    }
  }
}

// ---------------- Bogenpfeil um die Drehachse (Blick von vorne), Winkel in Grad
export function bogenPfeil(radius, von, bis, farbe, z = 6) {
  const material = new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0, depthTest: false });
  const gruppe = new THREE.Group();
  const a0 = THREE.MathUtils.degToRad(von), a1 = THREE.MathUtils.degToRad(bis);
  const richtung = Math.sign(a1 - a0);
  const spitzeLaenge = 1.4;
  const aEnde = a1 - richtung * spitzeLaenge / radius;     // Bogen endet vor der Spitze
  const punkte = [];
  for (let k = 0; k <= 48; k++) {
    const a = a0 + (aEnde - a0) * k / 48;
    punkte.push(new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), z));
  }
  const bogen = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punkte), 64, 0.22, 10), material);
  const spitze = new THREE.Mesh(new THREE.ConeGeometry(0.6, spitzeLaenge, 16), material);
  spitze.position.set(radius * Math.cos(a1 - richtung * spitzeLaenge / 2 / radius), radius * Math.sin(a1 - richtung * spitzeLaenge / 2 / radius), z);
  // Kegelspitze (+y) zeigt tangential in Drehrichtung
  spitze.rotation.z = a1 + (richtung > 0 ? 0 : Math.PI);
  for (const mesh of [bogen, spitze]) { mesh.renderOrder = 15; gruppe.add(mesh); }
  scene.add(gruppe);
  return {
    gruppe,
    zeigen: (sek = 0.5) => animiere(sek, p => { material.opacity = 0.9 * p; }),
    weg: (sek = 0.5) => animiere(sek, p => { material.opacity = 0.9 * (1 - p); }).then(() => scene.remove(gruppe)),
  };
}

// ---------------- Gestrichelte Linie aus kurzen Zylindern (WebGL-Linien wären nur 1 px breit)
export function strichLinie(p, q, farbe = '#33404d', strich = 0.8, luecke = 0.5) {
  const material = new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0, depthTest: false });
  const a = new THREE.Vector3(...p), b = new THREE.Vector3(...q);
  const richtung = b.clone().sub(a);
  const laenge = richtung.length();
  richtung.normalize();
  const gruppe = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.13, 0.13, strich, 8);
  for (let s = 0; s + strich <= laenge; s += strich + luecke) {
    const stueck = new THREE.Mesh(geo, material);
    stueck.position.copy(a).addScaledVector(richtung, s + strich / 2);
    stueck.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), richtung);
    stueck.renderOrder = 15;
    gruppe.add(stueck);
  }
  scene.add(gruppe);
  return {
    zeigen: (sek = 0.5) => animiere(sek, s => { material.opacity = s; }),
    weg: (sek = 0.5) => animiere(sek, s => { material.opacity = 1 - s; }).then(() => scene.remove(gruppe)),
  };
}
