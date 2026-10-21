// ------------------------------------------------------------------
// Modellgrößen und Maße
// Simulationscharakter: Die Werte sind so gewählt, dass die Bewegung gut zu beobachten ist.
// ------------------------------------------------------------------

// Physikalisches Modell (Polmodell): Drehmoment τ = K · I_Rotor · B · sin(Winkel zwischen Rotor und Feld)
export const MODEL = {
  torqueConstant: 8e-4,    // K in N·m pro A (bei B = 1, also beim Permanentmagneten)
  fieldReference: 3,       // Elektromagnet: bei diesem Feldstrom (A) ist das Feld so stark wie beim Permanentmagneten
  inertia: 6e-4,           // Trägheitsmoment des Rotors in kg·m²
  damping: 4e-4,           // Reibung proportional zur Drehgeschwindigkeit in N·m·s
  staticFriction: 6e-5,    // Haftreibung (Mindestdrehmoment zum Anlaufen) in N·m
};

// Kommutator: Lücken zwischen den Hälften und Breite der Bürsten (Winkel um die Achse).
// Die Lücken liegen in Richtung der Rotorpole. Kein Strom, solange eine Bürste ganz über
// einer Lücke liegt: |Abstand zur Lückenmitte| < halbe Lücke − halbe Bürstenbreite.
export const COMMUTATOR = {
  gapHalf: 20 * Math.PI / 180,     // halbe Breite einer Lücke (Lücke insgesamt 40°)
  brushHalf: 10 * Math.PI / 180,   // halbe Breite einer Bürste
  // Dreipoliger Anker: dreiteiliger Kommutator mit schmalen Lücken; Lage von Segment 0 relativ zu Arm 0
  threePoleGapHalf: 6 * Math.PI / 180,
  threePoleOffset: 120 * Math.PI / 180,   // so dreht der Rotor in jeder Stellung in dieselbe Richtung
};
MODEL.gapAngle = COMMUTATOR.gapHalf - COMMUTATOR.brushHalf;   // 10°: stromlos je ±10° um den Totpunkt

// Regler
export const RANGES = {
  current: { min: 0, max: 5, step: 0.1, start: 3 },    // Stromstärke in A
  angle: { min: 0, max: 360, step: 1 },               // Drehwinkel in Grad (nur angehalten)
};
export const START_ANGLE = 60 * Math.PI / 180;         // Startstellung des Rotors
export const PUSH_SPEED = 2.5;                        // „Anstoßen“: Winkelgeschwindigkeit in rad/s

// 3D-Maße in cm (1 Einheit = 1 cm); Drehachse = z-Achse (zum Betrachter), Feld in x-Richtung
export const GEO = {
  depth: 7,                // Tiefe von Rotor und Stator (z)
  rotorRadius: 4.0,        // Außenradius der Rotorpolschuhe
  shoeThickness: 1.0,      // Dicke der Polschuhe
  shoeHalf: 55 * Math.PI / 180,   // halbe Breite der Statorpole
  rotorShoeHalf: 30 * Math.PI / 180,   // halbe Breite der Polschuhe des Doppel-T-Ankers
  rotorShoeHalf3: 35 * Math.PI / 180,  // halbe Breite der Polschuhe des dreipoligen Ankers
  barHalf: 3.7,            // Spule mit Eisenkern: halbe Länge des Eisenstabs
  armHeight: 1.6,          // Höhe der Rotorarme (y)
  airGap: 0.35,            // Luftspalt zwischen Rotor und Stator
  commZ: 6.3,              // Mitte des Kommutators auf der Achse (z)
  commRadius: 1.1,
  commLength: 2.0,
  axisY: 0,                // Höhe der Drehachse
  tableY: -12,             // Oberkante des Tischs
};
