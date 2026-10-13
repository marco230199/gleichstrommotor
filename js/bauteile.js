// ------------------------------------------------------------------
// Geometrie-Helfer für die 3D-Bauteile (Stab, Kreisringsegment, Ring, Spule, Pfeil)
// Koordinaten in cm: Drehachse = z-Achse (zum Betrachter).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { addMesh } from './hilfen.js';
import { mat } from './materialien.js';

/** Zylinder von p nach q */
export function rod(p, q, radius, material, parent) {
  const a = new THREE.Vector3(...p), b = new THREE.Vector3(...q);
  const mesh = addMesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 14), material, parent);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/** Kreisringsegment (Winkel in rad, gegen den Uhrzeigersinn ab +x), von z0 bis z0 + depth */
export function arcShell(rIn, rOut, center, half, z0, depth, material, parent) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, center - half, center + half, false);
  shape.absarc(0, 0, rIn, center + half, center - half, true);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 });
  const mesh = addMesh(geo, material, parent);
  mesh.position.z = z0;
  return mesh;
}

/** Voller Kreisring von z0 bis z0 + depth */
export function ring(rIn, rOut, z0, depth, material, parent) {
  const shape = new THREE.Shape().absarc(0, 0, rOut, 0, 2 * Math.PI);
  shape.holes.push(new THREE.Path().absarc(0, 0, rIn, 0, 2 * Math.PI, true));
  const mesh = addMesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 }), material, parent);
  mesh.position.z = z0;
  return mesh;
}

/**
 * Spule aus Windungen um einen Kern, dessen Achse in x-Richtung zeigt (Windungen in der y-z-Ebene).
 * x0..x1: Wickelbereich, hy/hz: halbe Kernquerschnitte, layers: Lagen übereinander.
 */
export function coil(x0, x1, hy, hz, layers, parent, material = mat.copper) {
  const group = new THREE.Group();
  parent.add(group);
  const wire = 0.13, pitch = 2 * wire + 0.02;
  for (let layer = 0; layer < layers; layer++) {
    const o = 0.2 + wire + layer * pitch;              // Abstand der Windung vom Kern
    const r = 0.25 + layer * pitch;                    // Eckenrundung
    const a = hy + o - r, b = hz + o - r;
    const pts = [];
    for (let k = 0; k < 4; k++) {                      // abgerundetes Rechteck
      const cy = k === 0 || k === 3 ? a : -a, cz = k < 2 ? b : -b;
      for (let j = 0; j <= 6; j++) {
        const t = (k * Math.PI) / 2 + (j / 6) * (Math.PI / 2);
        pts.push(new THREE.Vector3(0, cy + r * Math.cos(t), cz + r * Math.sin(t)));
      }
    }
    const shape = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    const geo = new THREE.TubeGeometry(shape, 64, wire, 8, true);
    for (let x = x0 + wire; x <= x1 - wire + 1e-6; x += pitch) {
      const turn = addMesh(geo, layer % 2 ? mat.copperDark : material, group);
      turn.position.x = x;
    }
  }
  group.userData.outer = { y: hy + 0.2 + wire + (layers - 1) * pitch, z: hz + 0.2 + wire + (layers - 1) * pitch };
  return group;
}

/** Pfeil (Schaft + Spitze) entlang +y, Länge 1; wird mit setArrow gestreckt */
export function makeArrow(material, radius = 0.18) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), material);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(radius * 3, 1, 16), material);
  group.add(shaft, tip);
  group.userData = { shaft, tip };
  return group;
}
export function setArrow(arrow, length, headLength = 1.0) {
  const { shaft, tip } = arrow.userData;
  const shaftLen = Math.max(0.01, length - headLength);
  shaft.scale.y = shaftLen;
  shaft.position.y = shaftLen / 2;
  tip.scale.y = headLength;
  tip.position.y = shaftLen + headLength / 2;
}
