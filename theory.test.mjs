import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  midiOf, nameOf, CLEFS, MODULES, pool, newProgress, makeQuestion, record, levelProgress, loadProgress,
  pickItem, INTERVALS, CHORDS, KEYS,
} from './theory.mjs';

test('MIDI-Nummern und deutsche Namen', () => {
  assert.equal(midiOf(7 * 4), 60); // C4
  assert.equal(midiOf(5 + 7 * 4), 69); // A4
  assert.equal(midiOf(6 + 7 * 4, -1), 70); // B4
  assert.equal(midiOf(CLEFS.treble.bottomLine), 64); // E4
  assert.equal(midiOf(CLEFS.bass.bottomLine), 43); // G2
  assert.equal(nameOf(6), 'H');
  assert.equal(nameOf(6, -1), 'B');
  assert.equal(nameOf(2, -1), 'Es');
  assert.equal(nameOf(5, -1), 'As');
  assert.equal(nameOf(3, 1), 'Fis');
  assert.equal(nameOf(1, -1), 'Des');
});

test('Jede Frage jeder Stufe hat genau eine richtige, eindeutige Antwort', () => {
  let n = 0;
  for (const m of Object.keys(MODULES)) for (let lvl = 1; lvl <= MODULES[m].levels.length; lvl++) {
    const p = newProgress();
    p.modules[m].level = lvl;
    assert.ok(pool(m, lvl).length >= 2, `${m} ${lvl}: Pool`);
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion(m, p);
      assert.ok(q.answer >= 0 && q.answer < q.options.length, `${m} ${lvl}: Antwort im Bereich (${q.prompt})`);
      assert.equal(new Set(q.options).size, q.options.length, `${m} ${lvl}: keine doppelten Optionen`);
      assert.ok(q.options.length >= 2);
      if (q.play) for (const chord of q.play) for (const k of chord) assert.ok(k >= 21 && k <= 108, 'Ton im Klavierumfang');
      n++;
    }
  }
  assert.ok(n > 3000);
});

test('Intervallfrage passt zum gespielten Abstand', () => {
  const p = newProgress();
  p.modules.intervalle.level = 4;
  for (let i = 0; i < 300; i++) {
    const q = makeQuestion('intervalle', p);
    const notes = q.play.flat();
    const semis = Math.abs(notes[1] - notes[0]);
    assert.equal(q.options[q.answer], INTERVALS[semis].name);
  }
});

test('Akkordfrage passt zur Struktur (Grundstellung)', () => {
  const p = newProgress();
  p.modules.akkorde.level = 3;
  for (let i = 0; i < 200; i++) {
    const q = makeQuestion('akkorde', p);
    const notes = q.play[1], rel = notes.map((x) => x - notes[0]);
    const found = Object.values(CHORDS).find((c) => c.notes.join() === rel.join());
    assert.equal(q.options[q.answer], found.name);
  }
});

test('Notenfrage: richtige Antwort ist der Name der gezeigten Note', () => {
  const p = newProgress();
  for (const lvl of [1, 2, 3, 4]) {
    p.modules.noten.level = lvl;
    for (let i = 0; i < 100; i++) {
      const q = makeQuestion('noten', p);
      const { step, acc } = q.staff.notes[0];
      assert.equal(q.options[q.answer], nameOf(step, acc));
      assert.equal(q.play[0][0], midiOf(step, acc));
    }
  }
});

test('Quintenzirkel ist vollständig und eindeutig', () => {
  assert.equal(KEYS.length, 15);
  assert.equal(new Set(KEYS.map((k) => k.n)).size, 15);
});

test('Stufenaufstieg nach 10 von 12 richtig', () => {
  const p = newProgress();
  const q = makeQuestion('intervalle', p);
  for (let i = 0; i < 11; i++) record(p, q, i !== 3, '2026-11-21');
  assert.equal(p.modules.intervalle.level, 1);
  assert.ok(levelProgress(p, 'intervalle') > 0.9);
  const r = record(p, q, true, '2026-11-21');
  assert.equal(r.levelUp, true);
  assert.equal(p.modules.intervalle.level, 2);
  assert.equal(levelProgress(p, 'intervalle'), 0);
});

test('Kein Aufstieg bei vielen Fehlern, nicht über die letzte Stufe', () => {
  const p = newProgress();
  const q = makeQuestion('akkorde', p);
  for (let i = 0; i < 40; i++) record(p, q, i % 2 === 0, '2026-11-21');
  assert.equal(p.modules.akkorde.level, 1);
  p.modules.akkorde.level = 4;
  const q4 = makeQuestion('akkorde', p);
  for (let i = 0; i < 30; i++) record(p, q4, true, '2026-11-21');
  assert.equal(p.modules.akkorde.level, 4);
  assert.equal(levelProgress(p, 'akkorde'), 1);
});

test('Tagesserie zählt aufeinanderfolgende Tage', () => {
  const p = newProgress();
  const q = makeQuestion('noten', p);
  record(p, q, true, '2026-11-20');
  record(p, q, true, '2026-11-20');
  assert.equal(p.streak, 1);
  assert.equal(p.today, 2);
  record(p, q, true, '2026-11-21');
  assert.equal(p.streak, 2);
  assert.equal(p.today, 1);
  record(p, q, true, '2026-11-24');
  assert.equal(p.streak, 1);
});

test('Falsch beantwortete Elemente kommen häufiger dran', () => {
  const p = newProgress();
  const items = pool('akkorde', 2);
  for (const it of items) p.items[it.key] = { seen: 10, right: it.key === 'c:verm' ? 2 : 10 };
  let verm = 0;
  for (let i = 0; i < 4000; i++) if (pickItem(items, p).key === 'c:verm') verm++;
  assert.ok(verm / 4000 > 0.45, `vermindert oft (${verm})`);
});

test('Gespeicherter Stand wird robust geladen', () => {
  assert.deepEqual(loadProgress(null).modules.noten, { level: 1, recent: [] });
  const p = loadProgress({ xp: 'x', modules: { noten: { level: 99, recent: [1, 1] }, akkorde: 'kaputt' }, items: null });
  assert.equal(p.xp, 0);
  assert.equal(p.modules.noten.level, 4);
  assert.equal(p.modules.akkorde.level, 1);
  assert.deepEqual(p.items, {});
});
