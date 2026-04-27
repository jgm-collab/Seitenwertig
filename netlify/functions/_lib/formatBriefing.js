// Wandelt das collect()-Objekt aus briefing.html in einen strukturierten User-Prompt für Claude um.
// Fehlende Felder werden als "nicht angegeben" markiert.

export function formatBriefing(d) {
  const f = (val, fallback = "nicht angegeben") =>
    val && String(val).trim() ? String(val).trim() : fallback;

  const wbAktiv = d.wbOn === true || d.wbOn === "true";

  const wettbewerbsBlock = wbAktiv
    ? `\`wettbewerbsanalyse_gewuenscht: true\`
→ Führe eine Web-Recherche gemäß System-Prompt-Logik durch.

Vom Kunden genannte Wettbewerber: ${f(d.wettbewerber)}
Einzugsgebiet: ${f(d.einzugsgebiet)}
Google-Suchbegriffe: ${f(d.keywords)}`
    : `\`wettbewerbsanalyse_gewuenscht: false\`
→ Keine Web-Recherche. Positionierung aus Briefing + Branchenstandard ableiten.`;

  return `# KUNDEN-BRIEFING

## Grunddaten
- **Firmenname:** ${f(d.name)}
- **Branche:** ${f(d.branche)}
- **Standort:** ${f(d.ort)}
- **E-Mail des Kunden:** ${f(d.email)}

## Positionierung
- **USP / Stärken:** ${f(d.usp)}
- **Zielkunden:** ${f(d.zielkunden)}
- **Hauptziel:** ${f(d.hauptziel)}
- **Gewünschte Besucher-Aktion:** ${f(d.aktion)}
- **Aktuelles Problem:** ${f(d.problem)}
- **Erfolgsdefinition:** ${f(d.erfolg)}

## Inhalte & Struktur
- **Gewünschte Seiten:** ${f(d.seiten)}
- **Bestehende Website:** ${f(d.bestehtUrl)}
- **Logo:** ${f(d.logoLink)}
- **Bildlinks:** ${f(d.bildLinks)}
- **Vorhandene Texte:** ${f(d.texte)}

## Design-Präferenzen
- **Ausstrahlung:** ${f(d.ausstrahlung)}
- **Farbwünsche:** ${f(d.farben, "keine Vorgabe — wähle branchenpassend")}
- **Referenz-Websites:** ${f(d.referenzen)}
- **Vermeiden:** ${f(d.vermeiden)}

## Wettbewerbsanalyse
${wettbewerbsBlock}

---

**Aufgabe:** Generiere jetzt den vollständigen Lovable-Prompt gemäß System-Prompt-Struktur. Output startet direkt mit der Positionierungs-Sektion — keine Einleitung, kein Meta-Kommentar.`;
}
