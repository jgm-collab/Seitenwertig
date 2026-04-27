// Wandelt das Briefing-JSON in einen strukturierten User-Prompt für Claude um.
// Paket-aware: blendet Sektionen aus, die für das gewählte Paket nicht relevant sind,
// und gibt Claude explizit den Paket-Scope vor.

const PAKET_META = {
  onepager: {
    label: 'Paket 1 — Onepager',
    preis: '€ 890 zzgl. MwSt.',
    scope:
      'Onepager mit 3–4 Sektionen. KEINE Unterseiten. KEINE KI-Automation. ' +
      'Schlanke, fokussierte Visitenkarten-Site, mobil optimiert. ' +
      'Domain & Hosting werden vom Kunden gestellt — keine Setup-Anweisungen dafür im Output.',
  },
  website: {
    label: 'Paket 2 — Website',
    preis: '€ 1.290 zzgl. MwSt.',
    scope:
      'Vollständige Website mit mehreren Unterseiten. 1 KI-Automation einbinden. ' +
      'SEO-Grundoptimierung. 2 Revisionsrunden eingeplant. ' +
      'Domain & Hosting sind beim Kunden vorhanden — keine Setup-Anweisungen dafür im Output.',
  },
  komplett: {
    label: 'Paket 3 — Komplettpaket',
    preis: '€ 1.590 zzgl. MwSt.',
    scope:
      'Schlüsselfertige Website inkl. Domain-Registrierung, Hosting-Setup (Netlify, DE-Server), ' +
      'DNS-Konfiguration und E-Mail-Adresseinrichtung. ' +
      'Mehrere Unterseiten, 1 KI-Automation, 2 Revisionsrunden. ' +
      'Wettbewerbsanalyse ist FEST inkludiert.',
  },
};

export function formatBriefing(briefing) {
  const paket = briefing.paket && PAKET_META[briefing.paket]
    ? briefing.paket
    : 'website'; // sicherer Default

  const meta = PAKET_META[paket];

  const f = (val, fallback = 'nicht angegeben') =>
    val && String(val).trim() ? String(val).trim() : fallback;

  const arr = (val) =>
    Array.isArray(val) && val.length
      ? val.map((v) => `- ${v}`).join('\n')
      : '- nicht angegeben';

  // Wettbewerbsanalyse-Logik je Paket:
  // - onepager: immer false (egal was im Briefing steht)
  // - website:  user-gesteuert (nur wenn explizit gewünscht — sonst false)
  // - komplett: immer true (egal was im Briefing steht)
  let wettbewerbsanalyse;
  if (paket === 'komplett') wettbewerbsanalyse = true;
  else if (paket === 'onepager') wettbewerbsanalyse = false;
  else wettbewerbsanalyse = briefing.wettbewerbsanalyse_gewuenscht === true;

  // Paket-spezifische Sektionen
  const sectionUnterseiten =
    paket === 'onepager'
      ? ''
      : `## Unterseiten\n${arr(briefing.unterseiten)}\n\n`;

  const sectionKI =
    paket === 'onepager'
      ? ''
      : `## KI-Automation (1 Stück inkludiert)\n- **Wunsch:** ${f(
          briefing.ki_automation_wunsch,
          'noch offen — sinnvolle Empfehlung im Konzept vorschlagen'
        )}\n\n`;

  const sectionDomain =
    paket === 'komplett'
      ? `## Domain & E-Mail (im Komplettpaket inkludiert)\n` +
        `- **Wunsch-Domain:** ${f(briefing.domainwunsch)}\n` +
        `- **Gewünschte E-Mail-Adressen:**\n${arr(briefing.email_adressen)}\n\n`
      : '';

  const sectionWettbewerber =
    briefing.wettbewerber_urls && briefing.wettbewerber_urls.length
      ? `## Vom Kunden genannte Wettbewerber\n${briefing.wettbewerber_urls
          .map((u) => `- ${u}`)
          .join('\n')}\n→ Diese URLs bevorzugt analysieren (\`web_fetch\`).\n\n`
      : '';

  return `# KUNDEN-BRIEFING

## Gewähltes Paket
- **Paket:** ${meta.label}
- **Preis:** ${meta.preis}
- **Scope-Direktive:** ${meta.scope}

## Grunddaten
- **Firmenname:** ${f(briefing.firmenname)}
- **Branche:** ${f(briefing.branche)}
- **Standort (Ort):** ${f(briefing.ort)}
- **Region:** ${f(briefing.region, 'Oberfranken/Mittelfranken')}
- **Adresse:** ${f(briefing.adresse)}
- **Inhaber:** ${f(briefing.inhaber)}
- **Gründungsjahr:** ${f(briefing.gruendungsjahr)}

## Positionierung
- **USP / Alleinstellungsmerkmal:** ${f(briefing.usp)}
- **Zielgruppe:** ${f(briefing.zielgruppe)}
- **Ansprache:** ${f(briefing.ansprache, 'Sie')} (Du/Sie)

## Leistungen
${arr(briefing.leistungen)}

${sectionUnterseiten}${sectionKI}${sectionDomain}## Design-Präferenzen
- **Gewünschter Stil:** ${f(briefing.stil, 'modern, hochwertig, vertrauensbildend')}
- **Farbwünsche:** ${f(briefing.farben, 'keine Vorgabe — wähle branchenpassend')}
- **Referenzen / Inspiration:**
${arr(briefing.referenzen)}

## Kontaktkanäle
- **Telefon:** ${f(briefing.telefon)}
- **E-Mail:** ${f(briefing.email)}
- **WhatsApp:** ${f(briefing.whatsapp)}
- **Öffnungszeiten:** ${f(briefing.oeffnungszeiten)}

## CTA
- **Primärer Call-to-Action-Text:** ${f(briefing.cta_primaer, 'Jetzt Termin vereinbaren')}

## Besonderheiten / Auszeichnungen
${arr(briefing.besonderheiten)}

## Wettbewerbsanalyse
\`wettbewerbsanalyse_gewuenscht: ${wettbewerbsanalyse}\`
${
  wettbewerbsanalyse
    ? '→ Führe eine Web-Recherche gemäß System-Prompt-Logik durch.'
    : '→ Keine Web-Recherche. Leite die Positionierung aus Briefing + Branchenstandard ab.'
}

${sectionWettbewerber}## Freitextnotizen des Kunden
${f(briefing.freitext, 'keine')}

---

**Aufgabe:** Generiere jetzt den vollständigen Lovable-Prompt gemäß System-Prompt-Struktur — **konform zur oben genannten Paket-Scope-Direktive**. Output startet direkt mit der Positionierungs-Sektion (bzw. Fallback-Kommentar, falls zutreffend) — keine Einleitung, kein Meta-Kommentar.`;
}
