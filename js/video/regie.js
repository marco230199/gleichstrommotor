// ------------------------------------------------------------------
// Regie des Erklärvideos „Der Gleichstrommotor – Rotor, Stator und Kommutator“
// (Drehbuch: videos/physik/gleichstrommotor_polmodell/drehbuch.md).
// Jede Szene ist eine Folge aus Sprechertext (sprich) und Aktionen in der Simulation.
// sprich() wartet, bis der Abschnitt gesprochen ist; was gleichzeitig passieren soll,
// wird ohne await gestartet.
// ------------------------------------------------------------------
import { GEO, START_ANGLE } from '../config.js';
import { state } from '../state.js';
import { insertRotor, busy, updateParts } from '../teile.js';
import { jetzt, warte, bis, animiere } from './ablauf.js';
import { kameraSetzen, kameraFahrt, kameraSchwenk } from './kamera.js';
import { blende, untertitel, kapitel, marke } from './einblendungen.js';
import { tafel } from './tafel.js';

const PAUSE = 0.35;                      // Pause nach jedem gesprochenen Abschnitt
const grad = g => g * Math.PI / 180;
const ZF = GEO.depth / 2;                // Vorderseite von Rotor und Stator
const RS = GEO.rotorRadius + GEO.airGap; // Innenradius des Stators
const CZ = GEO.commZ, CR = GEO.commRadius;
const $ = id => document.getElementById(id);

/** Punkt auf dem Rotor (Abstand r von der Achse, vorne), dreht mit */
const amRotor = (r, versatz = 0) => () => {
  const a = state.phi + versatz;
  return [r * Math.cos(a), r * Math.sin(a), ZF + 0.3];
};

export async function regie({ texte, sprechdauer, protokoll }) {
  const sprich = async (key, nachher = PAUSE) => {
    protokoll.ton.push({ key, t: jetzt() });
    untertitel(texte[key]);
    await warte(sprechdauer[key]);
    untertitel('');
    await warte(nachher);
  };
  const neuesKapitel = async text => {
    await blende('kapitel', 0, 0.3);
    kapitel(text);
    await blende('kapitel', 1, 0.4);
  };
  const zeigeTafel = async modus => {
    tafel.modus = modus;
    tafel.wert = 0;
    await blende('tafel', 1, 0.5);
  };
  /** Rotor tauschen und warten, bis er eingebaut ist */
  const tauschen = async typ => {
    insertRotor(typ);
    await bis(() => !busy() && state.rotor === typ && state.rotorInstalled, 15);
  };

  // ---------------- Ausgangslage: Spule mit Eisenkern, Permanentmagnet, Strom aus, Rotor bei 60°
  // Die Simulation startet mit dem Doppel-T-Anker: Spule einbauen, Tausch sofort abschließen.
  insertRotor('spule');
  while (busy()) updateParts(10);
  Object.assign(state, {
    powerOn: false, current: 3, polarity: 1, stator: 'permanent',
    commutatorOn: true, magnet: 1, playing: false, slowMotion: false, phi: START_ANGLE, omega: 0,
    showField: false, showPoles: false, showCurrent: false, showForces: false, showSketch: true,
  });
  kameraSetzen('gesamt');
  kameraSchwenk(-20, 0.01);
  $('titelkarte').style.opacity = 1;

  // ---------------- Titel
  kameraSchwenk(20, 3.8);
  await warte(3);
  await blende('titelkarte', 0, 0.8);

  // ---------------- Szene 1: Von der Leiterschleife zur Spule
  neuesKapitel('1  Von der Leiterschleife zur Spule');
  kameraFahrt('motorRechts', 2.5);
  zeigeTafel('windungen');
  await sprich('intro1');
  animiere(1.2, p => { tafel.wert = 0.5 * p; });
  await sprich('intro2');
  animiere(1.2, p => { tafel.wert = 0.5 + 0.5 * p; });
  await sprich('intro3');
  blende('tafel', 0, 0.5);
  kameraFahrt('nah', 2.5);
  const magnetMarke = marke('Magnet', [-(RS + 0.75), 2.6, ZF], [-140, -150]);
  const spuleMarke = marke('Spule mit Eisenkern', amRotor(1.6), [170, -190]);
  warte(2).then(() => magnetMarke.zeigen());
  warte(2.8).then(() => spuleMarke.zeigen());
  await sprich('intro4');
  magnetMarke.weg(); spuleMarke.weg();
  const kommMarke = marke('Kommutator', [0, CR, CZ], [-150, -170]);
  const kontaktMarke = marke('Schleifkontakte', [1.9, 0.3, CZ + 0.45], [-120, 250], { weitere: [[-1.9, 0.3, CZ + 0.45]] });
  kommMarke.zeigen();
  warte(1).then(() => kontaktMarke.zeigen());
  await sprich('intro5');
  kommMarke.weg(); kontaktMarke.weg();

  // ---------------- Szene 2: Die Spule wird zum Magneten
  neuesKapitel('2  Die Spule wird zum Magneten');
  kameraFahrt('motorRechts', 2.5);
  zeigeTafel('stabmagnet');
  state.powerOn = true;
  state.showCurrent = true;
  await sprich('magnet1');
  animiere(1.2, p => { tafel.wert = p; });
  await sprich('magnet2');
  await sprich('magnet3');
  blende('tafel', 0, 0.5);
  kameraFahrt('vorne', 2.5);
  state.showPoles = true;
  await sprich('magnet4');
  warte(3.2).then(() => { state.polarity = -1; });
  await sprich('magnet5', 1.5);
  state.polarity = 1;
  await warte(1);

  // ---------------- Szene 3: Rotor und Stator
  neuesKapitel('3  Rotor und Stator');
  const statorMarke = marke('Stator (steht fest)', [-(RS + 0.75), 2.6, ZF], [-170, -170], { weitere: [[RS + 0.75, 2.6, ZF]] });
  const rotorMarke = marke('Rotor (dreht sich)', amRotor(2.8), [150, -230]);
  statorMarke.zeigen();
  warte(1.5).then(() => rotorMarke.zeigen());
  await sprich('namen1');
  await sprich('namen2');
  statorMarke.weg(); rotorMarke.weg();

  // ---------------- Szene 4: Warum dreht sich der Rotor?
  neuesKapitel('4  Warum dreht sich der Rotor?');
  state.showField = true;
  blende('sketch', 1, 0.8);
  await sprich('pole1');
  await sprich('pole2');
  state.showForces = true;
  await sprich('pole3');
  tafel.winkel = 60;
  zeigeTafel('kompass');
  warte(1.2).then(() => animiere(3, p => { tafel.winkel = 60 * (1 - p); }));
  await sprich('pole4');
  await blende('tafel', 0, 0.5);
  // Rotor in Zeitlupe loslassen: Er dreht im Uhrzeigersinn auf den Südpol des Stators zu
  state.slowMotion = true;
  state.playing = true;
  let vorher = state.phi;
  await bis(() => {
    const ja = vorher > grad(12) && state.phi <= grad(12);
    vorher = state.phi;
    return ja;
  }, 20);
  state.playing = false;
  await warte(0.6);

  // ---------------- Szene 5: Auch hier braucht man den Kommutator
  neuesKapitel('5  Der Kommutator polt den Rotor um');
  await sprich('komm1');
  await sprich('komm2');
  const start = state.phi;
  animiere(2.5, p => { state.phi = start * (1 - p); });          // in den Totpunkt: kein Strom
  const luecke = marke('kein Strom', [-CR - 0.6, 0, CZ], [-200, 140], { farbe: '#d32f2f' });
  warte(2).then(() => luecke.zeigen());
  await sprich('komm3');
  luecke.weg();
  animiere(3, p => { state.phi = 2 * Math.PI - grad(14) * p; }); // durch den Totpunkt: umgepolt
  await sprich('komm4');
  await sprich('komm5');
  state.slowMotion = false;
  state.playing = true;
  await sprich('komm6');
  await warte(2);

  // ---------------- Szene 6: Motoren in der Praxis
  neuesKapitel('6  Motoren in der Praxis');
  state.showForces = false;
  kameraFahrt('nah', 2.5);
  state.stator = 'elektro';
  const feldMarke = marke('Feldspulen', [-6.5, 1.9, ZF], [-120, -170], { weitere: [[6.5, 1.9, ZF]] });
  warte(1).then(() => feldMarke.zeigen());
  await sprich('praxis1');
  feldMarke.weg();
  // Luftspalt: Rotor waagrecht anhalten
  kameraFahrt('vorne', 2.5);
  state.playing = false;
  const von = state.phi, nach = state.phi > Math.PI ? 2 * Math.PI : 0;
  animiere(1.5, p => { state.phi = von + (nach - von) * p; });
  const spalt = marke('Luftspalt', [(GEO.barHalf + RS) / 2, 0, ZF + 0.3], [170, -210]);
  warte(2).then(() => spalt.zeigen());
  await sprich('praxis2');
  await sprich('praxis3');
  spalt.weg();
  // Doppel-T-Anker einsetzen
  kameraFahrt('tausch', 2.5);
  await tauschen('doppelT');
  kameraFahrt('vorne', 2.5);
  const spaltT = marke('schmaler Luftspalt', amRotor(GEO.rotorRadius + GEO.airGap / 2), [210, -150]);
  warte(2).then(() => spaltT.zeigen());
  await sprich('praxis4');
  spaltT.weg();
  state.playing = true;
  await warte(2.5);
  // Dreipoliger Anker
  kameraFahrt('tausch', 2.5);
  const dreipolig = tauschen('dreipolig');
  await sprich('praxis5');
  await dreipolig;
  kameraFahrt('vorne', 2.5);
  state.playing = true;
  await sprich('praxis6');
  await sprich('praxis7');
  await warte(2);
  await blende('kapitel', 0, 0.4);
  await blende('schlusskarte', 1, 0.8);
  await warte(8);
}
