# Gleichstrommotor

3D-Simulation eines einfachen Gleichstrommotors für den Physikunterricht. Der **Anker** ist ein
Doppel-T-Anker: zwei Spulen auf einem Eisenkern, wie bei den üblichen Motormodellen der Lehrmittel.
Fließt Strom, wird der Anker zum Elektromagneten. Der **Stator** lässt sich als
**Permanentmagnet** oder als **Elektromagnet** (Feldspulen auf Eisenkernen) darstellen.

Erklärt wird im **Polmodell**: Gleichnamige Pole stoßen sich ab, ungleichnamige ziehen sich an.
Der **Kommutator** polt den Anker genau dann um, wenn seine Pole vor den Statorpolen stehen
(Totpunkt) – so dreht sich der Motor dauerhaft weiter.

Die Simulation hat bewusst **Simulationscharakter**: Bedient wird über Regler und einblendbare
Hilfen, der Stromkreis ist zusätzlich als **Schaltskizze** dargestellt. Im 3D-Bild steht ein
**Netzgerät** mit Kabeln, damit der Versuchsaufbau vollständig ist.

Aufbau und Bedienung entsprechen der Simulation „Leiterschleife im Magnetfeld“.

## Funktionen

- **Stromkreis:** Strom ein/aus, Stromstärke 0–5 A, Polung umkehren
- **Stator:** Permanentmagnet oder Elektromagnet
  - Permanentmagnet: „Magnet umdrehen (N ↔ S)“
  - Elektromagnet: Die Feldspulen hängen **parallel zum Anker** am selben Netzgerät (Nebenschluss).
    Jede Feldspule hat zwei Buchsen; die beiden Spulen sind mit einem **schwarzen Kabel** in Reihe
    verbunden, rote und blaue Kabel führen zum Netzgerät. „Feldspulen umpolen“ vertauscht nur ihren Anschluss.
- **Didaktischer Kern:**
  - Permanentmagnet: Umpolen ändert nur die Pole des Ankers → der Motor dreht **andersherum**.
  - Elektromagnet: Umpolen ändert die Pole von Anker **und** Stator → die Drehrichtung **bleibt gleich**
    (deshalb laufen solche Motoren auch mit Wechselstrom, „Universalmotor“).
  - Nur die Feldspulen umpolen → der Motor dreht andersherum.
- **Totpunkt:** Stehen die Ankerpole genau vor den Statorpolen, liegen die Bürsten auf den Lücken des
  Kommutators, der Anker ist stromlos. Steht der Motor dort, läuft er erst nach „Anstoßen“ an.
- **Netzgerät:** Die Anzeige zeigt den Ankerstrom (am Totpunkt 0 A), der Knopf folgt der Stromstärke,
  die Lampe leuchtet bei eingeschaltetem Strom. „Polung umkehren“ steckt die Kabel um.
- **Bewegung:** Anhalten/Weiter, Zeitlupe, Anstoßen, Zurücksetzen, Drehwinkel (angehalten)
- **Anzeigen:** Pole (N rot, S grün) an Anker und Stator, Magnetfeld des Stators, Stromrichtung in den
  Ankerspulen, Kräfte auf die Ankerpole, Schaltskizze (vergrößerbar)
- **Ansichten:** Gesamtansicht und „Blick von vorne“ (entlang der Achse, wie die Schaltskizze)

## Modell

- Drehmoment im Polmodell: τ = −K · I_Anker · B · sin φ (φ: Winkel des gold markierten Ankerpols A
  gegen die Waagrechte). Der Kommutator macht daraus ein Drehmoment mit immer gleichem Vorzeichen.
- Permanentmagnet: B = ±1 (relativ). Elektromagnet: B proportional zum Feldstrom; bei 3 A ist das
  Feld so stark wie beim Permanentmagneten. Beim Elektromagneten wächst das Drehmoment deshalb mit I².
- Vereinfachungen: Ankerstrom und Feldstrom sind beide gleich der eingestellten Stromstärke I;
  keine Gegenspannung (Induktion), Reibung proportional zur Drehgeschwindigkeit plus Haftreibung.
- Modellgrößen, Kommutatorlücke und 3D-Maße stehen in `js/config.js`.

## Starten

Die Seite lädt Three.js als ES-Modul über ein CDN und braucht deshalb einen lokalen Webserver:

```
python3 -m http.server
```

Dann `http://localhost:8000` öffnen.

## Tests

```
npm test
```

Die Tests prüfen die Physik ohne Browser (Kommutator, Pole, Drehrichtungen beim Umpolen,
Totpunkt, Dauerlauf).

## Dateien

```
├── index.html          # Seitengerüst, Bedienfeld, Schaltskizze
├── css/style.css
├── js/
│   ├── main.js         # Start und Render-Schleife
│   ├── config.js       # Modellgrößen, Reglerbereiche, 3D-Maße
│   ├── state.js        # Zustand (Strom, Polung, Stator, Winkel, Anzeigen, …)
│   ├── physik.js       # Ankerstrom, Feld, Pole, Drehmoment, Bewegung (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Licht, Tisch
│   ├── aufbau.js       # Grundplatte, Anker, Kommutator, Bürsten, Statoren, Anzeigen
│   ├── netzgeraet.js   # Netzgerät mit Stromanzeige und Kabeln (Anker, Feldspulen)
│   ├── schaltskizze.js # 2D-Schaltskizze im Blick entlang der Achse
│   ├── bedienfeld.js   # Regler, Knöpfe, Statusanzeigen
│   ├── hilfen.js       # Hilfsfunktionen
│   └── materialien.js  # Materialien und Farben
├── tests/physik.test.mjs
└── package.json
```
