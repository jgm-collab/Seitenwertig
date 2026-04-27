# SeitenWertig Prompt-Generator (v2 — paket-aware)

Netlify Background Function, die aus einem Kunden-Briefing automatisch einen fertigen Lovable-Prompt generiert — paket-spezifisch (Onepager / Website / Komplettpaket).

## Was ist neu in v2

- **Paket-Logik**: Das Briefing ist jetzt paket-aware. Onepager bekommt ein schlankes Briefing und einen schlanken Prompt. Komplettpaket erhebt zusätzlich Domain-Wunsch und E-Mail-Adressen. Der System-Prompt sagt Claude explizit, welchen Scope er einhalten soll.
- **Wettbewerbsanalyse-Tiering**: Onepager → nicht verfügbar. Website → optional via Upgrade-Modal. Komplettpaket → fest aktiv.
- **Bessere Paketnamen**: S/A/B → 1/2/3 mit sprechenden Suffixen (Onepager / Website / Komplettpaket).
- **Make.com raus**: Direkter Resend-Versand aus der Function.
- **Error-Handling**: Pflichtfeld-Validierung pro Paket, Fehler-Mail an Jan bei jedem Problem.

## Architektur

```
Briefing-Formular (briefing.html)
  └─ ?paket=onepager|website|komplett
        │
        │ POST /.netlify/functions/generate-prompt-background
        ▼
┌─────────────────────────────────────────┐
│  Netlify Background Function (15 min)   │
│  ┌───────────────────────────────────┐  │
│  │  Claude Opus 4.7                  │  │
│  │  + web_search Tool (paket-bedingt)│  │
│  │  + Prompt Caching                 │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
        │
        ▼
   E-Mail an Jan (via Resend)
```

## Setup

### 1. Dependencies

```bash
npm install
```

### 2. Environment-Variablen in Netlify

Im Netlify-Dashboard unter **Site settings → Environment variables**:

| Variable | Zweck |
|----------|-------|
| `ANTHROPIC_API_KEY` | Claude API Key |
| `RESEND_API_KEY` | Resend API Key |
| `RECIPIENT_EMAIL` | z. B. `jan@seitenwertig.de` |
| `SENDER_EMAIL` | z. B. `noreply@seitenwertig.de` |
| `CLAUDE_MODEL` | optional, Default `claude-opus-4-7` |

**Resend-Setup**: Domain `seitenwertig.de` in Resend verifizieren (SPF, DKIM, DMARC im INWX setzen). EU-Region in den Resend-Einstellungen aktivieren.

### 3. Deployment

Push auf den Default-Branch des verknüpften GitHub-Repos → Netlify deployt automatisch.

## Briefing-Schema

Pflichtfelder pro Paket:

| Feld | Onepager | Website | Komplettpaket |
|------|----------|---------|---------------|
| `paket` | ✅ | ✅ | ✅ |
| `firmenname`, `branche`, `ort`, `usp`, `leistungen`, `telefon`, `email` | ✅ | ✅ | ✅ |
| `domainwunsch` | — | — | ✅ |
| `wettbewerbsanalyse_gewuenscht` | (ignoriert → false) | optional | (ignoriert → true) |

Alle anderen Felder sind optional — fehlende Angaben werden als "nicht angegeben" markiert. Claude trifft begründete Annahmen und kennzeichnet sie mit `[ANNAHME: ...]`.

## Lokal testen

```bash
netlify dev
# In zweitem Terminal:
npm run test:komplett   # vollständiges Beispiel
npm run test:onepager   # minimales Beispiel
```

Die E-Mail wird auch lokal versendet, sofern `RESEND_API_KEY` gesetzt ist.

## Kosten

Erwartung pro Generation:
- **Onepager**: ~0,10–0,15 $ (kein Web-Search, kürzerer Output)
- **Website ohne Wettbewerbsanalyse**: ~0,15–0,20 $
- **Website mit Wettbewerbsanalyse**: ~0,30–0,40 $
- **Komplettpaket**: ~0,30–0,40 $

Modell wechseln (zur Kostenreduktion um ~80 %):

```
CLAUDE_MODEL=claude-sonnet-4-6
```

## Fehlerfälle

- **Pflichtfelder fehlen** → Error-Mail an Jan mit Briefing-Dump
- **Claude-Call schlägt fehl** → Error-Mail an Jan mit Fehlermeldung
- **Resend-Versand schlägt fehl** → Log in Netlify Function Logs

Kein Briefing verschwindet lautlos.

## Anpassungen

- **System-Prompt**: `netlify/functions/_lib/systemPrompt.js`
- **Briefing-Format für Claude**: `netlify/functions/_lib/formatBriefing.js`
- **E-Mail-Templates**: `netlify/functions/_lib/sendEmail.js`
- **Paket-Namen / Frontend**: `public/briefing.html` und das Pricing-Snippet auf der Startseite

Änderung → commit → Netlify deployt automatisch.
