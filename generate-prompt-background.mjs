// Netlify Background Function — bis zu 15 Minuten Laufzeit.
// Endpoint: POST /.netlify/functions/generate-prompt-background
//
// Flow:
//   1. Briefing aus Body parsen
//   2. Pflichtfelder validieren (paket-spezifisch)
//   3. Anthropic API aufrufen (Opus 4.7 + optional web_search)
//   4. Resend → E-Mail an Jan
//   5. Bei Fehler: Error-Mail an Jan (kein Briefing geht verloren)

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './_lib/systemPrompt.js';
import { formatBriefing } from './_lib/formatBriefing.js';
import { sendResultEmail, sendErrorEmail } from './_lib/sendEmail.js';

const MODEL  = process.env.CLAUDE_MODEL || 'claude-opus-4-7';
const FROM   = process.env.SENDER_EMAIL || 'noreply@seitenwertig.de';
const TO     = process.env.RECIPIENT_EMAIL || 'jan@seitenwertig.de';

// Pflichtfelder pro Paket
const REQUIRED_FIELDS = {
  base:     ['firmenname', 'branche', 'ort', 'usp', 'leistungen', 'telefon', 'email'],
  onepager: [],
  website:  [],
  komplett: ['domainwunsch'],
};

export default async (req) => {
  const startTime = Date.now();
  let briefing = null;

  try {
    // ---- 1. Body parsen ----
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    briefing = await req.json();

    // ---- 2. Validierung ----
    const paket = briefing.paket;
    if (!paket || !REQUIRED_FIELDS[paket]) {
      throw new Error(
        `Ungültiges Paket: "${paket}". Erlaubt: onepager, website, komplett`
      );
    }

    const missing = [
      ...REQUIRED_FIELDS.base,
      ...REQUIRED_FIELDS[paket],
    ].filter((f) => {
      const v = briefing[f];
      if (Array.isArray(v)) return v.length === 0;
      return !v || !String(v).trim();
    });

    if (missing.length) {
      throw new Error(
        `Pflichtfelder fehlen: ${missing.join(', ')}`
      );
    }

    // ---- 3. Anthropic-Call ----
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userPrompt = formatBriefing(briefing);

    // Wettbewerbsanalyse-Logik:
    // - komplett: immer aktiv
    // - website + Flag: aktiv
    // - onepager: nie
    const useWebSearch =
      paket === 'komplett' ||
      (paket === 'website' && briefing.wettbewerbsanalyse_gewuenscht === true);

    const requestParams = {
      model: MODEL,
      max_tokens: 8192,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // Prompt-Caching: System-Prompt wird gecached, spart 90% Input-Kosten ab Call 2
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        { role: 'user', content: userPrompt },
      ],
    };

    if (useWebSearch) {
      requestParams.tools = [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ];
    }

    const response = await client.messages.create(requestParams);

    // Den Text aus allen Text-Content-Blöcken zusammenführen
    const lovablePrompt = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!lovablePrompt) {
      throw new Error('Claude lieferte leeren Output');
    }

    // ---- 4. E-Mail an Jan ----
    await sendResultEmail({
      to: TO,
      from: FROM,
      briefing,
      lovablePrompt,
      usage: response.usage,
      durationMs: Date.now() - startTime,
    });

    // Background Functions geben 202 zurück
    return new Response(null, { status: 202 });

  } catch (err) {
    console.error('[generate-prompt-background] Fehler:', err);

    // Fehler-Mail an Jan — damit kein Briefing lautlos verschwindet
    try {
      await sendErrorEmail({
        to: TO,
        from: FROM,
        briefing: briefing || { error: 'Body konnte nicht geparst werden' },
        error: err.message || String(err),
      });
    } catch (mailErr) {
      console.error('Auch Error-Mail-Versand fehlgeschlagen:', mailErr);
    }

    // Trotz Fehler: 202 — der User soll Bestätigung sehen, Jan kümmert sich manuell
    return new Response(null, { status: 202 });
  }
};

export const config = {
  // Background-Function-Modus: Netlify gibt sofort 202, läuft bis zu 15 Min im Hintergrund
  // Aktiviert über das Suffix "-background" im Dateinamen.
};
