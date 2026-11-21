import { MODULES, CLEFS, makeQuestion, record, levelProgress, loadProgress, newProgress, today, nameOf } from './theory.mjs';

const $ = (id) => document.getElementById(id);
const KEY = 'hoerschule.progress.v1', GOAL = 20, ROUND = 10;

let progress = load();
function load() { try { return loadProgress(JSON.parse(localStorage.getItem(KEY))); } catch { return newProgress(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* ohne Speicher läuft die Sitzung trotzdem */ } }

// ---------- Klang ----------
let ac = null, out = null;
function audio() {
  if (!ac) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    out = ac.createGain(); out.gain.value = 0.5;
    out.connect(comp).connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// Klavierähnlich: Grundton + Obertöne mit schnellem Anschlag und langem Ausklingen
function note(midi, at, dur = 1.6, vol = 0.22) {
  const f = 440 * Math.pow(2, (midi - 69) / 12), t = ac.currentTime + at;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12], [4, 'sine', 0.05]].forEach(([h, type, v]) => {
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = type; o.frequency.value = f * h; og.gain.value = v;
    o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.05);
  });
}
function playQuestion(q) {
  if (!q.play || !audio()) return;
  let at = 0.05;
  q.play.forEach((group, gi) => {
    if (q.arpeggio && gi === 0) { group.forEach((m, k) => note(m, at + k * 0.22, 1.2)); at += group.length * 0.22 + 0.45; }
    else { group.forEach((m) => note(m, at, 1.8, 0.22 / Math.sqrt(group.length))); at += 0.8; }
  });
}
function chime(ok) {
  if (!audio()) return;
  if (ok) { note(84, 0, 0.5, 0.08); note(88, 0.08, 0.6, 0.08); } else note(46, 0, 0.5, 0.1);
}

// ---------- Notensystem (SVG) ----------
const SHARP_STEPS = { treble: [38, 35, 39, 36, 33, 37, 34], bass: [24, 21, 25, 22, 19, 23, 20] };
const FLAT_STEPS = { treble: [34, 37, 33, 36, 32, 35, 31], bass: [20, 23, 19, 22, 18, 21, 17] };
function staffSVG({ clef, notes = [], keySig = 0 }) {
  const gap = 12, top = 46, W = 300, H = top + gap * 4 + 50;
  const bottom = CLEFS[clef].bottomLine, yOf = (s) => top + gap * 4 - (s - bottom) * (gap / 2);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W * 1.4}" role="img" aria-label="${CLEFS[clef].name}${keySig ? `, ${Math.abs(keySig)} ${keySig > 0 ? 'Kreuze' : 'B'}` : ''}${notes.length ? ', eine Note' : ''}">`;
  for (let i = 0; i < 5; i++) s += `<line x1="10" x2="${W - 10}" y1="${top + i * gap}" y2="${top + i * gap}" stroke="currentColor" stroke-width="1.2"/>`;
  s += clef === 'treble' ? trebleClef(18, top, gap) : bassClef(18, top, gap);
  const sigSteps = keySig > 0 ? SHARP_STEPS[clef] : FLAT_STEPS[clef];
  for (let i = 0; i < Math.abs(keySig); i++) s += `<text x="${66 + i * 13}" y="${yOf(sigSteps[i]) + (keySig > 0 ? 7 : 4)}" font-size="${keySig > 0 ? 24 : 26}" fill="currentColor" font-family="serif">${keySig > 0 ? '♯' : '♭'}</text>`;
  notes.forEach((n, k) => {
    const x = 175 + k * 40, y = yOf(n.step);
    // Hilfslinien
    for (let st = bottom - 2; st >= n.step; st -= 2) s += `<line x1="${x - 15}" x2="${x + 15}" y1="${yOf(st)}" y2="${yOf(st)}" stroke="currentColor" stroke-width="1.2"/>`;
    for (let st = bottom + 10; st <= n.step; st += 2) s += `<line x1="${x - 15}" x2="${x + 15}" y1="${yOf(st)}" y2="${yOf(st)}" stroke="currentColor" stroke-width="1.2"/>`;
    if (n.acc) s += `<text x="${x - 30}" y="${y + (n.acc > 0 ? 7 : 4)}" font-size="${n.acc > 0 ? 24 : 26}" fill="currentColor" font-family="serif">${n.acc > 0 ? '♯' : '♭'}</text>`;
    s += `<ellipse cx="${x}" cy="${y}" rx="7.6" ry="5.6" transform="rotate(-20 ${x} ${y})" fill="currentColor"/>`;
    const up = n.step < bottom + 4;
    s += up ? `<line x1="${x + 6.8}" x2="${x + 6.8}" y1="${y - 1}" y2="${y - 38}" stroke="currentColor" stroke-width="1.6"/>`
      : `<line x1="${x - 6.8}" x2="${x - 6.8}" y1="${y + 1}" y2="${y + 38}" stroke="currentColor" stroke-width="1.6"/>`;
  });
  return s + '</svg>';
}
// Schlüssel als Pfad, damit keine Musikschrift installiert sein muss
function trebleClef(x, top, gap) {
  // Koordinaten relativ zu gap = 12; der Bauch kreist um die G-Linie (2. Linie von unten)
  const k = gap / 12, P = (dx, dy) => `${(x + dx * k).toFixed(1)} ${(top + dy * k).toFixed(1)}`;
  return `<path d="M${P(9, 62)} Q${P(15, 64)} ${P(15, 54)} L${P(12, -6)} C${P(11, -20)} ${P(22, -24)} ${P(21, -12)}
    C${P(20, -2)} ${P(4, 6)} ${P(3, 26)} C${P(2, 46)} ${P(26, 52)} ${P(27, 36)} C${P(28, 24)} ${P(12, 22)} ${P(11, 34)}
    C${P(10, 42)} ${P(18, 44)} ${P(19, 38)}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${x + 9 * k}" cy="${top + 61 * k}" r="${3.4 * k}" fill="currentColor"/>`;
}
function bassClef(x, top, gap) {
  const f = top + gap; // F-Linie
  return `<path d="M${x + 4} ${f} c0 -9 18 -9 18 2 c0 12 -10 20 -20 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="${x + 5}" cy="${f}" r="3.6" fill="currentColor"/>
    <circle cx="${x + 29}" cy="${f - gap / 2}" r="2" fill="currentColor"/><circle cx="${x + 29}" cy="${f + gap / 2}" r="2" fill="currentColor"/>`;
}

// ---------- Klaviatur ----------
const LO = 36, HI = 84;
function buildPiano() {
  const el = $('piano');
  const whites = [];
  for (let m = LO; m <= HI; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) whites.push(m);
  const w = 100 / whites.length;
  let html = '';
  whites.forEach((m, i) => { html += `<div class="w" data-m="${m}" style="left:${i * w}%;width:${w}%"></div>`; });
  for (let m = LO; m <= HI; m++) if ([1, 3, 6, 8, 10].includes(m % 12)) {
    const i = whites.indexOf(m - 1);
    html += `<div class="b" data-m="${m}" style="left:${(i + 1) * w - w * 0.3}%;width:${w * 0.6}%"></div>`;
  }
  el.innerHTML = html;
}
function highlight(notes) {
  for (const k of $('piano').children) k.classList.toggle('hit', notes.includes(+k.dataset.m));
}

// ---------- Ansichten ----------
function show(id) { for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== id; }

function renderHome() {
  const d = today();
  const done = progress.todayDate === d ? progress.today : 0;
  $('goalRing').setAttribute('stroke-dasharray', `${Math.min(100, (done / GOAL) * 100)} 100`);
  $('goalText').textContent = `${Math.min(done, 999)}/${GOAL}`;
  const alive = progress.lastDay && (Date.parse(d) - Date.parse(progress.lastDay)) / 864e5 <= 1;
  const streak = alive ? progress.streak : 0;
  $('streak').textContent = `${streak} ${streak === 1 ? 'Tag' : 'Tage'}`;
  $('xp').textContent = progress.xp;
  $('modules').innerHTML = Object.entries(MODULES).map(([id, m]) => {
    const lvl = progress.modules[id].level, max = m.levels.length, pct = Math.round(levelProgress(progress, id) * 100);
    return `<button type="button" class="module" data-id="${id}">
      <h3>${m.title}</h3><p>${m.desc}</p>
      <div class="lvl"><span>Stufe <b>${lvl}</b>/${max}: ${m.levels[lvl - 1]}</span><span>${lvl >= max ? 'Höchste Stufe' : pct + ' %'}</span></div>
      <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <div class="dots" aria-hidden="true">${m.levels.map((_, i) => `<span class="${i < lvl ? 'on' : ''}"></span>`).join('')}</div>
    </button>`;
  }).join('');
  for (const b of $('modules').querySelectorAll('.module')) b.addEventListener('click', () => startRound(b.dataset.id));
  show('home');
}

let round = null;
function startRound(module) {
  audio();
  round = { module, n: 0, right: 0, q: null, answered: false, levelUps: [] };
  nextQuestion();
  show('quiz');
}

function nextQuestion() {
  const { module } = round;
  round.q = makeQuestion(module, progress, Math.random, round.q?.key);
  round.answered = false;
  const q = round.q;
  $('qmodule').textContent = `${MODULES[module].title} · Stufe ${q.level}`;
  $('qprompt').textContent = q.prompt;
  $('qvisual').innerHTML = q.staff ? staffSVG(q.staff) : '';
  const listen = module === 'intervalle' || module === 'akkorde';
  $('replay').hidden = !listen;
  const opts = $('options');
  opts.className = 'options' + (q.options.length === 7 ? ' letters' : '');
  opts.innerHTML = q.options.map((o, i) => `<button type="button" data-i="${i}">${o}${q.options.length <= 9 ? ` <kbd>${i + 1}</kbd>` : ''}</button>`).join('');
  for (const b of opts.children) b.addEventListener('click', () => answer(+b.dataset.i));
  $('feedback').textContent = ''; $('feedback').className = 'feedback';
  $('nextQ').hidden = true;
  $('piano').hidden = !q.play;
  highlight([]);
  $('qcount').textContent = `${round.n + 1}/${ROUND}`;
  $('qbar').style.width = `${(round.n / ROUND) * 100}%`;
  $('qbar').parentElement.setAttribute('aria-valuenow', round.n);
  if (listen) setTimeout(() => playQuestion(q), 150);
  opts.firstElementChild?.focus();
}

function answer(i) {
  if (round.answered) return;
  round.answered = true;
  const q = round.q, ok = i === q.answer;
  if (ok) round.right++;
  const res = record(progress, q, ok);
  if (res.levelUp) round.levelUps.push(res.level);
  save();
  const btns = [...$('options').children];
  btns.forEach((b, k) => { b.disabled = true; if (k === q.answer) b.classList.add('ok'); else if (k === i) b.classList.add('bad'); });
  const fb = $('feedback');
  fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
  fb.textContent = (ok ? 'Richtig. ' : `Leider nein, es war ${q.options[q.answer]}. `) + explain(q);
  if (res.levelUp) fb.textContent += ` Stufe ${res.level} freigeschaltet!`;
  chime(ok);
  if (q.play) { highlight(q.play.flat()); if (round.module === 'noten') setTimeout(() => playQuestion(q), 350); }
  round.n++;
  $('qbar').style.width = `${(round.n / ROUND) * 100}%`;
  $('nextQ').hidden = false;
  $('nextQ').focus();
}

function explain(q) {
  if (q.module === 'noten') { const n = q.staff.notes[0]; return `Klingt als ${nameOf(n.step, n.acc)}${Math.floor(n.step / 7)}.`; }
  if (q.module === 'intervalle') { const [a, b] = q.play.flat(); return `${Math.abs(b - a)} Halbtonschritte.`; }
  return '';
}

function next() {
  if (!round?.answered) return;
  if (round.n >= ROUND) return finish();
  nextQuestion();
}

function finish() {
  const { right, levelUps, module } = round;
  $('sumTitle').textContent = right === ROUND ? 'Fehlerfrei!' : right >= 8 ? 'Stark!' : right >= 5 ? 'Gut dabei.' : 'Dranbleiben lohnt sich.';
  $('sumText').textContent = `${right} von ${ROUND} richtig in „${MODULES[module].title}".` + (levelUps.length ? ` Neu: Stufe ${levelUps.at(-1)}.` : '');
  show('summary');
  $('again').focus();
}

$('replay').addEventListener('click', () => playQuestion(round.q));
$('nextQ').addEventListener('click', next);
$('back').addEventListener('click', renderHome);
$('home2').addEventListener('click', renderHome);
$('again').addEventListener('click', () => startRound(round.module));
$('reset').addEventListener('click', () => {
  if (!confirm('Gesamten Fortschritt löschen?')) return;
  progress = newProgress(); save(); renderHome();
});

addEventListener('keydown', (e) => {
  if ($('quiz').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!round.answered && /^[1-9]$/.test(e.key)) { const i = +e.key - 1; if (i < round.q.options.length) answer(i); }
  else if (e.key === 'Enter' && round.answered) { e.preventDefault(); next(); }
  else if (e.key.toLowerCase() === 'r' && !$('replay').hidden) playQuestion(round.q);
  else if (e.key === 'Escape') renderHome();
});

buildPiano();
renderHome();
