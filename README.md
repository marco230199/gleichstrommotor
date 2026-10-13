# Gleichstrommotor

3D-Simulation eines einfachen Gleichstrommotors für den Physikunterricht. Der **Anker** besteht aus
Spulen mit Eisenkern; fließt Strom, wird er zum Elektromagneten. Drei Anker stehen zur Auswahl und
lassen sich wie bei einem Baukasten austauschen:

- **Spule mit Eisenkern:** ein Eisenstab mit einer Spule – der Übergang von der Leiterschleife
- **Doppel-T-Anker:** zwei Spulen in Reihe, Polschuhe – wie bei den üblichen Lehrmittel-Motormodellen
- **Dreipoliger Anker:** drei Spulen, dreiteiliger Kommutator – **kein Totpunkt**, läuft aus jeder Stellung an
 Der **Stator** lässt sich als
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
- **Anker austauschen:** Auswahl Spule / Doppel-T / Dreipolig. Die Anker, die nicht eingebaut sind, liegen
  links neben dem Motor in einer Ablage. Beim Tausch schwenken die Bürsten nach außen, der vordere
  Lagerbock fährt zur Seite, der alte Anker wird herausgezogen und abgelegt, der neue eingesetzt
  (animiert). „Anker herausnehmen“ lässt den Motor leer.
- **Kommutator abnehmen:** Der Kommutator lässt sich von der Welle ziehen und wieder aufsetzen; abgenommen
  liegt er in der Ablage. Dann berühren die Bürsten nichts, der Anker ist stromlos – und der Blick auf
  Anker, Spulen und Anschlüsse ist frei. Zum Tauschen des Ankers muss der Kommutator aufgesetzt sein.
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

- Jeder Anker ist in `js/physik.js` (`ROTORS`) beschrieben: Kommutatorsegmente (Zahl, Lage, Lücken),
  Spulen (zwischen welchen Segmenten, Richtung ihrer Magnetisierung) und Arme mit ihren Polen.
- Aus den Segmenten, die die Bürsten gerade berühren, wird der Strom in jeder Spule berechnet
  (Spulen gleich groß). Beim dreipoligen Anker teilt er sich auf: eine Spule 2/3, die beiden anderen
  je 1/3. Überbrückt eine Bürste zwei Segmente, ist die Spule dazwischen kurz stromlos.
- Drehmoment im Polmodell: τ = −K · f · B · Σ I_Spule · sin(φ + Spulenwinkel) (φ: Ankerwinkel).
  Der Kommutator macht daraus ein Drehmoment mit immer gleichem Vorzeichen. Die Spule mit Eisenkern
  (ohne Polschuhe) hat den Faktor f = 0,75, die anderen f = 1.
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
Totpunkt, Dauerlauf, die drei Anker, Stromaufteilung beim dreipoligen Anker, abgenommener Kommutator
und ausgebauter Anker).

## Dateien

```
├── index.html          # Seitengerüst, Bedienfeld, Schaltskizze
├── css/style.css
├── js/
│   ├── main.js         # Start und Render-Schleife
│   ├── config.js       # Modellgrößen, Reglerbereiche, 3D-Maße
│   ├── state.js        # Zustand (Strom, Polung, Stator, Anker, Kommutator, Winkel, Anzeigen, …)
│   ├── physik.js       # Ankerstrom, Feld, Pole, Drehmoment, Bewegung (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Licht, Tisch
│   ├── aufbau.js       # Grundplatte, Lager, Bürsten, Statoren, Anzeigen
│   ├── rotoren.js      # die drei Anker als 3D-Bauteile, je mit abnehmbarem Kommutator
│   ├── teile.js        # Teileablage, Ein- und Ausbau von Anker und Kommutator (Animation)
│   ├── bauteile.js     # Geometrie-Helfer (Kreisringsegment, Spule, Pfeil, …)
│   ├── netzgeraet.js   # Netzgerät mit Stromanzeige und Kabeln (Anker, Feldspulen)
│   ├── schaltskizze.js # 2D-Schaltskizze im Blick entlang der Achse
│   ├── bedienfeld.js   # Regler, Knöpfe, Statusanzeigen
│   ├── hilfen.js       # Hilfsfunktionen
│   └── materialien.js  # Materialien und Farben
├── tests/physik.test.mjs
└── package.json
```
