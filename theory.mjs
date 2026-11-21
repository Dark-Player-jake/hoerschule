// Musiktheorie und Fragengenerator, ohne DOM. Deutsche Notennamen (H statt B, B = Hes).

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

// step = diatonischer Index (Buchstabe + 7 * Oktave), acc = -1/0/+1
export function midiOf(step, acc = 0) {
  const oct = Math.floor(step / 7), l = ((step % 7) + 7) % 7;
  return 12 * (oct + 1) + LETTER_PC[l] + acc;
}

export function nameOf(step, acc = 0) {
  const l = LETTERS[((step % 7) + 7) % 7];
  if (acc === 0) return l;
  if (acc === 1) return l === 'H' ? 'His' : l + 'is';
  // Erniedrigt: E→Es, A→As, H→B, sonst +es
  return { E: 'Es', A: 'As', H: 'B' }[l] ?? l + 'es';
}

export const CLEFS = {
  treble: { name: 'Violinschlüssel', bottomLine: 2 + 7 * 4 }, // E4
  bass: { name: 'Bassschlüssel', bottomLine: 4 + 7 * 2 }, // G2
};

export const INTERVALS = [
  { semis: 0, name: 'Prime' }, { semis: 1, name: 'kleine Sekunde' }, { semis: 2, name: 'große Sekunde' },
  { semis: 3, name: 'kleine Terz' }, { semis: 4, name: 'große Terz' }, { semis: 5, name: 'Quarte' },
  { semis: 6, name: 'Tritonus' }, { semis: 7, name: 'Quinte' }, { semis: 8, name: 'kleine Sexte' },
  { semis: 9, name: 'große Sexte' }, { semis: 10, name: 'kleine Septime' }, { semis: 11, name: 'große Septime' },
  { semis: 12, name: 'Oktave' },
];

export const CHORDS = {
  dur: { name: 'Dur', notes: [0, 4, 7] },
  moll: { name: 'Moll', notes: [0, 3, 7] },
  verm: { name: 'vermindert', notes: [0, 3, 6] },
  ueber: { name: 'übermäßig', notes: [0, 4, 8] },
  dom7: { name: 'Dominantseptakkord', notes: [0, 4, 7, 10] },
  maj7: { name: 'großer Septakkord (maj7)', notes: [0, 4, 7, 11] },
  m7: { name: 'Moll-Septakkord', notes: [0, 3, 7, 10] },
};

// Quintenzirkel: Dur-Tonarten mit Anzahl Vorzeichen (+ Kreuze, − B)
export const KEYS = [
  { dur: 'C', moll: 'a', n: 0 }, { dur: 'G', moll: 'e', n: 1 }, { dur: 'D', moll: 'h', n: 2 },
  { dur: 'A', moll: 'fis', n: 3 }, { dur: 'E', moll: 'cis', n: 4 }, { dur: 'H', moll: 'gis', n: 5 },
  { dur: 'Fis', moll: 'dis', n: 6 }, { dur: 'Cis', moll: 'ais', n: 7 },
  { dur: 'F', moll: 'd', n: -1 }, { dur: 'B', moll: 'g', n: -2 }, { dur: 'Es', moll: 'c', n: -3 },
  { dur: 'As', moll: 'f', n: -4 }, { dur: 'Des', moll: 'b', n: -5 }, { dur: 'Ges', moll: 'es', n: -6 },
  { dur: 'Ces', moll: 'as', n: -7 },
];
export const accText = (n) => n === 0 ? 'keine Vorzeichen' : `${Math.abs(n)} ${n > 0 ? '♯' : '♭'}`;

export const MODULES = {
  noten: { title: 'Noten lesen', desc: 'Welche Note steht da?', levels: ['Violinschlüssel, Mitte', 'Violinschlüssel mit Hilfslinien', 'Bassschlüssel', 'Beide Schlüssel mit Vorzeichen'] },
  intervalle: { title: 'Intervalle hören', desc: 'Wie weit liegen zwei Töne auseinander?', levels: ['Terz, Quinte, Oktave', '+ kleine Terz, Quarte, Sekunde', '+ Sexten, abwärts', 'Alle, auch gleichzeitig'] },
  akkorde: { title: 'Akkorde hören', desc: 'Welcher Akkordtyp klingt?', levels: ['Dur oder Moll', '+ vermindert, übermäßig', '+ Septakkorde', '+ Umkehrungen'] },
  tonarten: { title: 'Quintenzirkel', desc: 'Vorzeichen und Tonarten', levels: ['Bis 2 Vorzeichen', 'Bis 4 Vorzeichen', 'Alle Dur-Tonarten', 'Mit Moll-Paralleltonarten'] },
};

// ---------- Elementpools je Stufe ----------
function notePool(level) {
  const items = [];
  const add = (clef, from, to, accs) => {
    for (let s = from; s <= to; s++) for (const a of accs) items.push({ key: `n:${clef}:${s}:${a}`, clef, step: s, acc: a });
  };
  const T = CLEFS.treble.bottomLine, B = CLEFS.bass.bottomLine;
  if (level === 1) add('treble', T - 2, T + 8, [0]); // C4 bis F5... nur Linien/Zwischenräume plus C4
  if (level === 2) add('treble', T - 5, T + 11, [0]); // mit Hilfslinien
  if (level === 3) add('bass', B - 2, B + 10, [0]);
  if (level === 4) { add('treble', T - 2, T + 8, [-1, 0, 1]); add('bass', B - 1, B + 9, [-1, 0, 1]); }
  // Vorzeichen, die keine gebräuchlichen Namen haben, weglassen
  return items.filter((i) => !(i.acc === 1 && ['E', 'H'].includes(LETTERS[i.step % 7])) && !(i.acc === -1 && ['C', 'F'].includes(LETTERS[i.step % 7])));
}

const INTERVAL_LEVELS = [[4, 7, 12], [2, 3, 4, 5, 7, 12], [1, 2, 3, 4, 5, 7, 8, 9, 12], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]];
const CHORD_LEVELS = [['dur', 'moll'], ['dur', 'moll', 'verm', 'ueber'], ['dur', 'moll', 'verm', 'ueber', 'dom7', 'maj7', 'm7'], ['dur', 'moll', 'verm', 'ueber', 'dom7', 'maj7', 'm7']];

export function pool(module, level) {
  if (module === 'noten') return notePool(level);
  if (module === 'intervalle') return INTERVAL_LEVELS[level - 1].map((s) => ({ key: `i:${s}`, semis: s }));
  if (module === 'akkorde') return CHORD_LEVELS[level - 1].map((c) => ({ key: `c:${c}`, chord: c }));
  if (module === 'tonarten') {
    const max = [2, 4, 7, 7][level - 1];
    const keys = KEYS.filter((k) => Math.abs(k.n) <= max);
    const items = keys.flatMap((k) => [{ key: `k:acc:${k.dur}`, k, ask: 'acc' }, { key: `k:name:${k.dur}`, k, ask: 'name' }]);
    if (level === 4) items.push(...keys.map((k) => ({ key: `k:moll:${k.dur}`, k, ask: 'moll' })));
    return items;
  }
  return [];
}

// ---------- Fortschritt ----------
export function newProgress() {
  const p = { xp: 0, streak: 0, lastDay: null, today: 0, todayDate: null, modules: {}, items: {} };
  for (const m of Object.keys(MODULES)) p.modules[m] = { level: 1, recent: [] };
  return p;
}

// Gewicht: unbekannte und oft falsche Elemente kommen häufiger dran.
export function weight(stat) {
  if (!stat) return 3;
  const err = (stat.seen - stat.right) / stat.seen;
  return 1 + err * 6 + (stat.seen < 3 ? 1 : 0);
}

export function pickItem(items, progress, r = Math.random, avoidKey = null) {
  const cands = items.length > 1 ? items.filter((i) => i.key !== avoidKey) : items;
  const ws = cands.map((i) => weight(progress.items[i.key]));
  let x = r() * ws.reduce((a, b) => a + b, 0);
  for (let k = 0; k < cands.length; k++) if ((x -= ws[k]) <= 0) return cands[k];
  return cands.at(-1);
}

function shuffle(a, r) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function choices(correct, wrongPool, n, r) {
  const wrong = shuffle([...new Set(wrongPool.filter((w) => w !== correct))], r).slice(0, n - 1);
  const opts = shuffle([correct, ...wrong], r);
  return { options: opts, answer: opts.indexOf(correct) };
}

export function makeQuestion(module, progress, r = Math.random, avoidKey = null) {
  const level = progress.modules[module].level;
  const items = pool(module, level);
  const it = pickItem(items, progress, r, avoidKey);
  const q = { module, level, key: it.key };
  if (module === 'noten') {
    q.prompt = 'Wie heißt diese Note?';
    q.staff = { clef: it.clef, notes: [{ step: it.step, acc: it.acc }] };
    q.play = [[midiOf(it.step, it.acc)]];
    const correct = nameOf(it.step, it.acc);
    if (level < 4) { q.options = [...LETTERS]; q.answer = LETTERS.indexOf(correct); }
    else Object.assign(q, choices(correct, items.map((i) => nameOf(i.step, i.acc)), 4, r));
  } else if (module === 'intervalle') {
    const lo = 55 + Math.floor(r() * 12); // G3 bis F#4
    const down = level >= 3 && r() < 0.35, together = level === 4 && r() < 0.35;
    const a = down ? lo + it.semis : lo, b = down ? lo : lo + it.semis;
    q.play = together ? [[a, b]] : [[a], [b]];
    q.prompt = together ? 'Zwei Töne gleichzeitig: welches Intervall?' : `Welches Intervall hörst du (${down ? 'abwärts' : 'aufwärts'})?`;
    const names = INTERVAL_LEVELS[level - 1].map((s) => INTERVALS[s].name);
    q.options = names; q.answer = names.indexOf(INTERVALS[it.semis].name);
  } else if (module === 'akkorde') {
    const root = 52 + Math.floor(r() * 10);
    let notes = CHORDS[it.chord].notes.map((n) => root + n);
    if (level === 4 && r() < 0.5) { const inv = 1 + Math.floor(r() * (notes.length - 1)); for (let k = 0; k < inv; k++) notes = [...notes.slice(1), notes[0] + 12]; }
    q.play = [notes.slice(), notes]; // erst gebrochen, dann zusammen
    q.arpeggio = true;
    q.prompt = 'Welcher Akkord ist das?';
    const names = CHORD_LEVELS[level - 1].map((c) => CHORDS[c].name);
    q.options = names; q.answer = names.indexOf(CHORDS[it.chord].name);
  } else if (module === 'tonarten') {
    const keys = KEYS.filter((k) => Math.abs(k.n) <= [2, 4, 7, 7][level - 1]);
    if (it.ask === 'acc') {
      q.prompt = `Wie viele Vorzeichen hat ${it.k.dur}-Dur?`;
      Object.assign(q, choices(accText(it.k.n), keys.map((k) => accText(k.n)), 4, r));
    } else if (it.ask === 'name') {
      q.prompt = `Welche Dur-Tonart hat ${accText(it.k.n)}?`;
      q.staff = { clef: 'treble', keySig: it.k.n, notes: [] };
      Object.assign(q, choices(`${it.k.dur}-Dur`, keys.map((k) => `${k.dur}-Dur`), 4, r));
    } else {
      q.prompt = `Wie heißt die Moll-Paralleltonart von ${it.k.dur}-Dur?`;
      Object.assign(q, choices(`${it.k.moll}-Moll`, keys.map((k) => `${k.moll}-Moll`), 4, r));
    }
  }
  return q;
}

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// Antwort verbuchen. Gibt zurück, ob die Stufe gestiegen ist.
export function record(progress, q, correct, date = today()) {
  const st = progress.items[q.key] ??= { seen: 0, right: 0 };
  st.seen++; if (correct) st.right++;
  if (progress.todayDate !== date) {
    progress.streak = progress.lastDay && dayDiff(progress.lastDay, date) === 1 ? progress.streak + 1 : 1;
    progress.todayDate = date; progress.today = 0;
  }
  progress.lastDay = date;
  progress.today++;
  progress.xp += correct ? 10 + (q.level - 1) * 5 : 1;
  const m = progress.modules[q.module];
  m.recent.push(correct ? 1 : 0);
  if (m.recent.length > 12) m.recent.shift();
  const maxLevel = MODULES[q.module].levels.length;
  if (m.level < maxLevel && m.recent.length >= 12 && m.recent.reduce((a, b) => a + b, 0) >= 10) {
    m.level++; m.recent = [];
    return { levelUp: true, level: m.level };
  }
  return { levelUp: false };
}

// Fortschritt in der aktuellen Stufe, 0 bis 1
export function levelProgress(progress, module) {
  const m = progress.modules[module];
  if (m.level >= MODULES[module].levels.length) return 1;
  const right = m.recent.reduce((a, b) => a + b, 0);
  return Math.min(1, right / 10);
}

// Gespeicherten Stand robust einlesen: fehlende Felder ergänzen, Unsinn verwerfen.
export function loadProgress(raw) {
  const fresh = newProgress();
  if (!raw || typeof raw !== 'object') return fresh;
  const p = { ...fresh, ...raw, modules: { ...fresh.modules }, items: typeof raw.items === 'object' && raw.items ? raw.items : {} };
  for (const m of Object.keys(MODULES)) {
    const src = raw.modules?.[m];
    const lvl = Number.isInteger(src?.level) ? Math.min(MODULES[m].levels.length, Math.max(1, src.level)) : 1;
    p.modules[m] = { level: lvl, recent: Array.isArray(src?.recent) ? src.recent.slice(-12) : [] };
  }
  for (const k of ['xp', 'streak', 'today']) if (!Number.isFinite(p[k])) p[k] = 0;
  return p;
}
