# hoerschule – Projektsteckbrief

- **Zielgruppe:** Einsteiger und Wiedereinsteiger in Musiktheorie, deutsche Notennamen.
- **Kernaktion:** Eine Runde mit 10 Fragen beantworten und dabei eine Stufe aufsteigen.
- **Nicht-Ziele:** Kein Konto, keine Rhythmus-/Gesangsübungen, keine Noten-Eingabe per Mikrofon.

## Architekturentscheidungen

Fragen werden aus Stufen-Pools erzeugt, Gewichtung nach Fehlerquote; Stufenaufstieg bei 10 von 12 richtig; Fortschritt in localStorage, robust geladen.

## Risiken

Klavierklang nicht angehört; Notensatz (Vorzeichen, Hilfslinien) nur stichprobenartig angesehen.

## MVP / Erfolgstest

Erfolgstest: `node --test` grün und die Kernaktion im Browser ohne Konsolenfehler bedienbar.
