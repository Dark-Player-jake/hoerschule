import { CLEFS } from './theory.mjs';

// ---------- Notensystem (SVG) ----------
const SHARP_STEPS = { treble: [38, 35, 39, 36, 33, 37, 34], bass: [24, 21, 25, 22, 19, 23, 20] };
const FLAT_STEPS = { treble: [34, 37, 33, 36, 32, 35, 31], bass: [20, 23, 19, 22, 18, 21, 17] };
// Lage relativ zur untersten Linie (0 = 1. Linie, 1 = 1. Zwischenraum …) als Text für Screenreader
function position(d) {
  if (d >= 0 && d <= 8) return d % 2 === 0 ? `auf der ${d / 2 + 1}. Linie` : `im ${(d + 1) / 2}. Zwischenraum`;
  if (d < 0) { const k = -d; return k % 2 === 0 ? `auf der ${k / 2}. Hilfslinie unten` : k === 1 ? 'direkt unter dem System' : `unter der ${(k - 1) / 2}. Hilfslinie unten`; }
  const k = d - 8; return k % 2 === 0 ? `auf der ${k / 2}. Hilfslinie oben` : k === 1 ? 'direkt über dem System' : `über der ${(k - 1) / 2}. Hilfslinie oben`;
}

export function staffSVG({ clef, notes = [], keySig = 0 }) {
  const gap = 12, top = 46, W = 300, H = top + gap * 4 + 50;
  const bottom = CLEFS[clef].bottomLine, yOf = (s) => top + gap * 4 - (s - bottom) * (gap / 2);
  const label = [CLEFS[clef].name];
  if (keySig) label.push(`${Math.abs(keySig)} ${keySig > 0 ? (Math.abs(keySig) === 1 ? 'Kreuz' : 'Kreuze') : 'b-Vorzeichen'}`);
  for (const n of notes) label.push(`eine Note ${position(n.step - bottom)}${n.acc ? (n.acc > 0 ? ' mit Kreuz' : ' mit b') : ''}`);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W * 1.4}" role="img" aria-label="${label.join(', ')}">`;
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

