import { staffSVG } from './staff.mjs';
import { MODULES, makeQuestion, record, levelProgress, loadProgress, newProgress, today, nameOf } from './theory.mjs';

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
    try { ac = new AC(); } catch { return null; }
    const comp = ac.createDynamicsCompressor();
    out = ac.createGain(); out.gain.value = 0.5;
    out.connect(comp).connect(ac.destination);
  }
  if (ac.state !== 'running') ac.resume().catch(() => {});
  return ac;
}
// Jede Frage bekommt einen eigenen Ausgang; beim Wechsel wird der alte sanft stummgeschaltet,
// damit nichts in die nächste Frage oder die Übersicht hineinklingt.
let voice = null, timers = [];
function stopSound() {
  timers.forEach(clearTimeout); timers = [];
  if (voice && ac) { voice.gain.setTargetAtTime(0, ac.currentTime, 0.03); const v = voice; setTimeout(() => v.disconnect(), 300); }
  voice = null;
}
function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
// Klavierähnlich: Grundton + Obertöne mit schnellem Anschlag und langem Ausklingen
function note(midi, at, dur = 1.6, vol = 0.22, dest = null) {
  const f = 440 * Math.pow(2, (midi - 69) / 12), t = ac.currentTime + at;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (dest) g.connect(dest);
  else { if (!voice) { voice = ac.createGain(); voice.connect(out); } g.connect(voice); }
  [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12], [4, 'sine', 0.05]].forEach(([h, type, v]) => {
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = type; o.frequency.value = f * h; og.gain.value = v;
    o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.05);
  });
}
function playQuestion(q) {
  if (!q.play) return;
  if (!audio()) { if (q.module !== 'noten') $('feedback').textContent = 'Dein Browser spielt hier keinen Ton ab. Die Hörmodule brauchen Audio.'; return; }
  if (voice) { stopSound(); } // erneutes Abspielen ersetzt statt zu überlagern
  let at = 0.05;
  q.play.forEach((group, gi) => {
    if (q.arpeggio && gi === 0) { group.forEach((m, k) => note(m, at + k * 0.22, 1.2)); at += group.length * 0.22 + 0.45; }
    else { group.forEach((m) => note(m, at, 1.8, 0.22 / Math.sqrt(group.length))); at += 0.8; }
  });
}
function chime(ok) {
  if (!audio()) return;
  // direkt an out statt an voice: die nächste Frage bricht sonst den Bestätigungston ab
  if (ok) { note(84, 0, 0.5, 0.08, out); note(88, 0.08, 0.6, 0.08, out); } else note(46, 0, 0.5, 0.1, out);
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
  stopSound();
  // Uhr zurückgestellt: record bucht dann weiter auf lastDay, die Anzeige muss denselben Tag nehmen
  const d = progress.lastDay && progress.lastDay > today() ? progress.lastDay : today();
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
  show('quiz'); // erst sichtbar machen, sonst kann die Frage keinen Fokus bekommen
  nextQuestion();
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
  opts.className = 'options' + (module === 'noten' && q.options.length === 7 ? ' letters' : '');
  // Tastenhinweis für die ersten neun Antworten (Ziffern 1–9), für Screenreader verborgen
  opts.innerHTML = q.options.map((o, i) => `<button type="button" data-i="${i}">${o}${i < 9 ? ` <kbd aria-hidden="true">${i + 1}</kbd>` : ''}</button>`).join('');
  for (const b of opts.children) b.addEventListener('click', () => answer(+b.dataset.i));
  $('feedback').textContent = ''; $('feedback').className = 'feedback';
  $('nextQ').hidden = true;
  $('piano').hidden = !q.play;
  highlight([]);
  $('qcount').textContent = `${round.n + 1}/${ROUND}`;
  $('qbar').style.width = `${(round.n / ROUND) * 100}%`;
  $('qbar').parentElement.setAttribute('aria-valuenow', round.n);
  if (listen) later(() => playQuestion(q), 150);
  // Fokus auf die Frage statt auf Antwort 1: Screenreader liest sie vor, ein doppeltes Enter antwortet nicht versehentlich
  $('qprompt').focus();
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
  if (q.play) { highlight(q.play.flat()); if (round.module === 'noten') later(() => playQuestion(q), 350); }
  round.n++;
  $('qbar').style.width = `${(round.n / ROUND) * 100}%`;
  $('nextQ').hidden = false;
  $('nextQ').focus();
}

function explain(q) {
  if (q.module === 'noten') { const n = q.staff.notes[0]; return `Klingt als ${nameOf(n.step, n.acc)} in der ${Math.floor(n.step / 7)}. Oktave (C4 = eingestrichenes c).`; }
  if (q.module === 'intervalle') { const [a, b] = q.play.flat(); return `${Math.abs(b - a)} Halbtonschritte.`; }
  return '';
}

function next() {
  if (!round?.answered) return;
  stopSound();
  if (round.n >= ROUND) return finish();
  nextQuestion();
}

function finish() {
  stopSound();
  const { right, levelUps, module } = round;
  $('sumTitle').textContent = right === ROUND ? 'Fehlerfrei!' : right >= 8 ? 'Stark!' : right >= 5 ? 'Gut dabei.' : 'Dranbleiben lohnt sich.';
  $('sumText').textContent = `${right} von ${ROUND} richtig in „${MODULES[module].title}".` + (levelUps.length ? ` Neu: Stufe ${levelUps.at(-1)}.` : '');
  show('summary');
  $('again').focus();
}

$('replay').addEventListener('click', () => playQuestion(round.q));
$('nextQ').addEventListener('click', next);
$('back').addEventListener('click', () => { stopSound(); renderHome(); });
$('home2').addEventListener('click', renderHome);
$('again').addEventListener('click', () => startRound(round.module));
$('reset').addEventListener('click', () => {
  if (!confirm('Gesamten Fortschritt löschen?')) return;
  progress = newProgress(); save(); renderHome();
});

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  if (e.key === 'Escape' && (!$('quiz').hidden || !$('summary').hidden)) { stopSound(); renderHome(); return; }
  if ($('quiz').hidden) return;
  // Enter auf anderen Knöpfen (Übersicht, Nochmal hören) löst diese aus, nicht "Weiter"
  const onOtherButton = e.target.closest('button') && e.target.id !== 'nextQ';
  if (!round.answered && /^[1-9]$/.test(e.key)) { const i = +e.key - 1; if (i < round.q.options.length) answer(i); }
  else if (e.key === 'Enter' && round.answered && !onOtherButton) { e.preventDefault(); next(); }
  else if (e.key.toLowerCase() === 'r' && !$('replay').hidden) playQuestion(round.q);
});

buildPiano();
renderHome();
