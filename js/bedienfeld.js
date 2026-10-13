// ------------------------------------------------------------------
// Bedienfeld: Regler, Knöpfe, Statusanzeigen
// ------------------------------------------------------------------
import { RANGES, START_ANGLE, PUSH_SPEED } from './config.js';
import { state } from './state.js';
import { armatureCurrent, statorField, statorPole, rotorOf } from './physik.js';
import { busy, removeRotor, insertRotor, removeCommutator, attachCommutator } from './teile.js';
import { formatNumber } from './hilfen.js';
import { sketchStatus } from './schaltskizze.js';

const $ = id => document.getElementById(id);
const deg = rad => Math.round(rad * 180 / Math.PI) % 360;
const CHECKS = [['fieldCheck', 'showField'], ['polesCheck', 'showPoles'], ['currentCheck', 'showCurrent'],
  ['forceCheck', 'showForces'], ['sketchCheck', 'showSketch']];

export function refresh() {
  const elektro = state.stator === 'elektro';
  const power = $('powerBtn');
  power.classList.toggle('on', state.powerOn);
  power.textContent = state.powerOn ? 'Strom ausschalten' : 'Strom einschalten';
  power.setAttribute('aria-pressed', String(state.powerOn));
  $('currentSlider').value = state.current;
  $('currentOut').textContent = `${formatNumber(state.current, 1)} A`;
  $('polarityStatus').textContent = state.polarity > 0 ? 'Pluspol an der linken Bürste' : 'Pluspol an der rechten Bürste';

  for (const button of document.querySelectorAll('[data-stator]')) {
    const active = button.dataset.stator === state.stator;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('magnetBtn').textContent = elektro ? 'Feldspulen umpolen' : 'Magnet umdrehen (N ↔ S)';
  $('magnetStatus').textContent = statorText();
  $('statorNote').innerHTML = elektro
    ? 'Die Feldspulen hängen <strong>parallel</strong> zum Anker am selben Netzgerät. Beim <strong>Umpolen</strong> ändern Anker <em>und</em> Stator ihre Pole – die Drehrichtung bleibt gleich. Probiere es aus!'
    : 'Der Permanentmagnet behält seine Pole. Beim <strong>Umpolen</strong> ändert nur der Anker seine Pole – der Motor dreht sich andersherum.';

  refreshParts();

  const play = $('playBtn');
  play.textContent = state.playing ? 'Anhalten' : 'Weiter';
  play.classList.toggle('on', state.playing);
  $('slowCheck').checked = state.slowMotion;
  $('angleSlider').disabled = state.playing;
  $('angleBox').classList.toggle('disabled', state.playing);
  for (const [id, key] of CHECKS) $(id).checked = state[key];
  $('sketch').hidden = !state.showSketch;
  $('sketch').classList.toggle('large', state.sketchLarge);
  $('sketchSizeBtn').textContent = state.sketchLarge ? 'Kleiner' : 'Größer';
  $('sketchSizeBtn').setAttribute('aria-pressed', String(state.sketchLarge));
}

const ROTOR_NOTES = {
  spule: 'Eine <strong>Spule auf einem Eisenstab</strong> – wie die Leiterschleife, nur mit vielen Windungen. Der Eisenkern verstärkt das Magnetfeld der Spule: Der Stab wird zum Elektromagneten. Am <strong>Totpunkt</strong> ist er stromlos und braucht Schwung.',
  doppelT: 'Zwei Spulen in Reihe auf einem <strong>Doppel-T-Kern</strong>. Die Polschuhe führen das Feld nah an den Stator heran, der Motor zieht kräftiger. Am <strong>Totpunkt</strong> ist der Anker stromlos und braucht Schwung.',
  dreipolig: 'Drei Spulen auf drei Armen, <strong>dreiteiliger Kommutator</strong>: Es fließt immer Strom, und es gibt in jeder Stellung ein Drehmoment. <strong>Kein Totpunkt</strong> – der Motor läuft aus jeder Stellung an und dreht gleichmäßiger.',
};

/** Knöpfe und Hinweise zu Anker und Kommutator (auch während des Umbaus aktualisiert) */
function refreshParts() {
  const moving = busy();
  for (const button of document.querySelectorAll('[data-rotor]')) {
    const active = button.dataset.rotor === state.rotor && state.rotorInstalled;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = moving || !state.commutatorOn;
  }
  const rotorBtn = $('rotorBtn'), commBtn = $('commBtn');
  rotorBtn.textContent = state.rotorInstalled ? 'Anker herausnehmen' : `${rotorOf(state).name} einsetzen`;
  rotorBtn.disabled = moving || !state.commutatorOn;
  commBtn.textContent = state.commutatorOn ? 'Kommutator abnehmen' : 'Kommutator aufsetzen';
  commBtn.disabled = moving || !state.rotorInstalled;
  $('pushBtn').disabled = !state.rotorInstalled;
  let note;
  if (moving) note = 'Umbau läuft …';
  else if (!state.rotorInstalled) note = 'Der Motor ist leer. Wähle oben einen Anker aus, um ihn einzusetzen.';
  else if (!state.commutatorOn) {
    note = 'Ohne Kommutator berühren die Bürsten nichts: Der Anker bekommt <strong>keinen Strom</strong>. Jetzt siehst du Anker, Spulen und ihre Anschlüsse gut. Zum Tauschen des Ankers den Kommutator wieder aufsetzen.';
  } else note = ROTOR_NOTES[state.rotor];
  if ($('rotorNote').innerHTML !== note) $('rotorNote').innerHTML = note;
}

function statorText() {
  if (state.stator !== 'elektro') {
    return state.magnet > 0 ? 'Nordpol links: Das Feld zeigt nach rechts.' : 'Nordpol rechts: Das Feld zeigt nach links.';
  }
  const left = statorPole(-1, state);
  if (!left) return 'Ohne Strom sind die Feldspulen kein Magnet.';
  return left === 'N' ? 'Feldspulen: Nordpol links, das Feld zeigt nach rechts.' : 'Feldspulen: Nordpol rechts, das Feld zeigt nach links.';
}

// Laufend aktualisierte Texte (Winkel, Status)
export function updateLive() {
  $('angleSlider').value = deg(state.phi);
  $('angleOut').textContent = `${deg(state.phi)}°`;
  $('sketchStatus').textContent = sketchStatus();
  $('motionStatus').textContent = motionText();
  $('motionStatus').classList.toggle('warn', motionWarn());
  $('magnetStatus').textContent = statorText();
  refreshParts();
}

function motionWarn() {
  return state.playing && state.powerOn && state.current > 0 && state.omega === 0 && state.rotorInstalled && !busy()
    && armatureCurrent(state.phi, state).gap;
}

function motionText() {
  const w = state.omega;
  if (busy()) return 'Umbau läuft …';
  if (!state.rotorInstalled) return 'Kein Anker eingebaut.';
  if (!state.playing) return 'Angehalten: Mit dem Regler „Drehwinkel“ kannst du den Anker in jede Stellung drehen.';
  if (!state.commutatorOn && Math.abs(state.omega) < 0.05) return 'Ohne Kommutator: Die Bürsten berühren nichts, der Anker ist stromlos.';
  if (motionWarn()) {
    return 'Totpunkt: Die Pole des Ankers stehen genau vor den Statorpolen, die Bürsten liegen auf den Lücken. Stoße den Anker an!';
  }
  if (Math.abs(w) < 0.05) return state.powerOn ? 'Der Anker steht still.' : 'Kein Strom: Der Anker steht still.';
  const dir = w > 0 ? 'gegen den Uhrzeigersinn' : 'im Uhrzeigersinn';
  return `Der Motor dreht sich ${dir} (Blick von vorne).`;
}

/** Schritt beim Antippen; gedrückt halten wiederholt ihn */
function holdRepeat(button, step) {
  let timer = null;
  const stop = () => { clearTimeout(timer); clearInterval(timer); timer = null; };
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    step();
    timer = setTimeout(() => { timer = setInterval(step, 80); }, 400);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(type, stop);
  button.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') step(); });
}

export function initUi() {
  const slider = $('currentSlider');
  Object.assign(slider, RANGES.current);
  slider.value = state.current;
  slider.addEventListener('input', () => { state.current = Number(slider.value); refresh(); });
  for (const button of document.querySelectorAll('.stepper button[data-dir]')) {
    holdRepeat(button, () => {
      const r = RANGES.current;
      state.current = Math.min(r.max, Math.max(r.min, Math.round((state.current + Number(button.dataset.dir) * r.step) * 10) / 10));
      refresh();
    });
  }
  $('powerBtn').addEventListener('click', () => { state.powerOn = !state.powerOn; refresh(); });
  $('polarityBtn').addEventListener('click', () => { state.polarity *= -1; refresh(); });
  $('magnetBtn').addEventListener('click', () => { state.magnet *= -1; refresh(); });
  for (const button of document.querySelectorAll('[data-stator]')) {
    button.addEventListener('click', () => { state.stator = button.dataset.stator; refresh(); });
  }
  // Anker wählen: eingebaut → austauschen, sonst diesen Anker einsetzen
  for (const button of document.querySelectorAll('[data-rotor]')) {
    button.addEventListener('click', () => {
      if (!state.rotorInstalled) state.rotor = button.dataset.rotor;
      insertRotor(button.dataset.rotor);
      refresh();
    });
  }
  $('rotorBtn').addEventListener('click', () => {
    if (state.rotorInstalled) removeRotor(); else insertRotor(state.rotor);
    refresh();
  });
  $('commBtn').addEventListener('click', () => {
    if (state.commutatorOn) removeCommutator(); else attachCommutator();
    refresh();
  });
  $('playBtn').addEventListener('click', () => { state.playing = !state.playing; refresh(); });
  $('slowCheck').addEventListener('change', e => { state.slowMotion = e.target.checked; });
  $('pushBtn').addEventListener('click', () => {
    // in die Richtung anstoßen, in die der Motor gerade antreiben würde
    const dir = -state.polarity * Math.sign(statorField(state)) || -1;
    state.omega += dir * PUSH_SPEED;
    state.playing = true;
    refresh();
  });
  $('resetBtn').addEventListener('click', () => {
    state.phi = START_ANGLE;
    state.omega = 0;
    refresh();
  });
  const angle = $('angleSlider');
  Object.assign(angle, RANGES.angle);
  angle.addEventListener('input', () => {
    state.phi = Number(angle.value) * Math.PI / 180;
    state.omega = 0;
  });
  $('sketchSizeBtn').addEventListener('click', () => { state.sketchLarge = !state.sketchLarge; refresh(); });
  for (const [id, key] of CHECKS) {
    $(id).addEventListener('change', e => { state[key] = e.target.checked; refresh(); });
  }
}
