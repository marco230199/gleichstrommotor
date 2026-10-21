// ------------------------------------------------------------------
// Videozeit: Die Zeit läuft nur weiter, wenn ein Bild berechnet wird (tick).
// So ist jede Aufnahme gleich, egal wie lange das Rendern eines Bildes dauert.
// Die Regie wartet mit warte(), bis() und animiere() auf diese Videozeit.
// ------------------------------------------------------------------

let t = 0;
const wartende = [];
const animationen = [];

export const jetzt = () => t;
export const glatt = p => p * p * (3 - 2 * p);

/** sek Sekunden Videozeit warten */
export function warte(sek) {
  const ende = t + sek;
  return new Promise(fertig => wartende.push({ test: () => t >= ende - 1e-9, fertig }));
}

/** Warten, bis test() erfüllt ist (höchstens max Sekunden) */
export function bis(test, max = Infinity) {
  const ende = t + max;
  return new Promise(fertig => wartende.push({ test: () => test() || t >= ende - 1e-9, fertig }));
}

/** Über sek Sekunden schritt(p) mit p von 0 bis 1 aufrufen (geglättet) */
export function animiere(sek, schritt, verlauf = glatt) {
  schritt(0);
  return new Promise(fertig => animationen.push({ start: t, sek, schritt, verlauf, fertig }));
}

/** Videozeit um dt weiterschalten, Animationen und Wartende bedienen */
export function tick(dt) {
  t += dt;
  for (const a of [...animationen]) {
    const p = a.sek > 0 ? Math.min(1, (t - a.start) / a.sek) : 1;
    a.schritt(a.verlauf(p));
    if (p >= 1) {
      animationen.splice(animationen.indexOf(a), 1);
      a.fertig();
    }
  }
  for (const w of [...wartende]) {
    if (w.test()) {
      wartende.splice(wartende.indexOf(w), 1);
      w.fertig();
    }
  }
}
