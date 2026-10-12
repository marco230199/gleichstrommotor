// ------------------------------------------------------------------
// Modellgrößen und Maße
// Simulationscharakter: Die Werte sind so gewählt, dass die Bewegung gut zu beobachten ist.
// ------------------------------------------------------------------

// Physikalisches Modell (Polmodell): Drehmoment τ = K · I_Anker · B · sin(Winkel zwischen Anker und Feld)
export const MODEL = {
  torqueConstant: 8e-4,    // K in N·m pro A (bei B = 1, also beim Permanentmagneten)
  fieldReference: 3,       // Elektromagnet: bei diesem Feldstrom (A) ist das Feld so stark wie beim Permanentmagneten
  inertia: 6e-4,           // Trägheitsmoment des Ankers in kg·m²
  damping: 4e-4,           // Reibung proportional zur Drehgeschwindigkeit in N·m·s
  staticFriction: 6e-5,    // Haftreibung (Mindestdrehmoment zum Anlaufen) in N·m
};

// Kommutator: Lücken zwischen den Hälften und Breite der Bürsten (Winkel um die Achse).
// Die Lücken liegen in Richtung der Ankerpole. Kein Strom, solange eine Bürste ganz über
// einer Lücke liegt: |Abstand zur Lückenmitte| < halbe Lücke − halbe Bürstenbreite.
export const COMMUTATOR = {
  gapHalf: 20 * Math.PI / 180,     // halbe Breite einer Lücke (Lücke insgesamt 40°)
  brushHalf: 10 * Math.PI / 180,   // halbe Breite einer Bürste
};
MODEL.gapAngle = COMMUTATOR.gapHalf - COMMUTATOR.brushHalf;   // 10°: stromlos je ±10° um den Totpunkt

// Regler
export const RANGES = {
  current: { min: 0, max: 5, step: 0.1, start: 3 },    // Stromstärke in A
  angle: { min: 0, max: 360, step: 1 },               // Drehwinkel in Grad (nur angehalten)
};
export const START_ANGLE = 60 * Math.PI / 180;         // Startstellung des Ankers
export const PUSH_SPEED = 2.5;                        // „Anstoßen“: Winkelgeschwindigkeit in rad/s

// 3D-Maße in cm (1 Einheit = 1 cm); Drehachse = z-Achse (zum Betrachter), Feld in x-Richtung
export const GEO = {
  depth: 7,                // Tiefe von Anker und Stator (z)
  rotorRadius: 4.0,        // Außenradius der Ankerpolschuhe
  shoeThickness: 1.0,      // Dicke der Polschuhe
  shoeHalf: 55 * Math.PI / 180,   // halbe Breite der Polschuhe (Anker und Stator)
  armHeight: 1.6,          // Höhe der Ankerarme (y)
  airGap: 0.35,            // Luftspalt zwischen Anker und Stator
  commZ: 6.3,              // Mitte des Kommutators auf der Achse (z)
  commRadius: 1.1,
  commLength: 2.0,
  axisY: 0,                // Höhe der Drehachse
  tableY: -12,             // Oberkante des Tischs
};
