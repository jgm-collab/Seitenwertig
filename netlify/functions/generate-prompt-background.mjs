// Netlify Background Function
// Dateiname *-background.mjs → Netlify gibt 15 min Laufzeit, antwortet sofort mit 202.

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./_lib/systemPrompt.js";
import { formatBriefing } from "./_lib/formatBriefing.js";
import { sendResultEmail } from "./_lib/sendEmail.js";

export default async function handler(req) {
  // ── Parse body ──────────────────────────────────────────────────────────────
  let briefing;
  try {
    briefing = await req.json();
  } catch {
    await sendError("JSON-Parse-Fehler", "Request-Body ist kein gültiges JSON.", null);
    return new Response(null, { status: 202 });
  }

  // ── Pflichtfelder ────────────────────────────────────────────────────────────
  if (!briefing.branche || !briefing.ort) {
    await sendError("Pflichtfelder fehlen", JSON.stringify(briefing, null, 2), briefing);
    return new Response(null, { status: 202 });
  }

  const start = Date.now();

  try {
    const userPrompt = formatBriefing(briefing);
    const wbAktiv = briefing.wbOn === true || briefing.wbOn === "true";

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Tools nur wenn Wettbewerbsanalyse gewünscht
    const tools = wbAktiv ? [{ type: "web_search_20250305", name: "web_search" }] : undefined;

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-opus-4-5-20251101",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
      ...(tools ? { tools } : {}),
    });

    // Text aus Response extrahieren (auch wenn Tool-Calls dazwischen sind)
    const lovablePrompt = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    await sendResultEmail({
      to:   process.env.RECIPIENT_EMAIL || "jan@seitenwertig.de",
      from: process.env.SENDER_EMAIL   || "noreply@seitenwertig.de",
      briefing,
      lovablePrompt,
      usage:      response.usage,
      durationMs: Date.now() - start,
    });

    console.log(`[OK] ${briefing.name || briefing.branche}, ${briefing.ort} — ${((Date.now() - start) / 1000).toFixed(1)}s`);

  } catch (err) {
    console.error("[ERROR]", err.message);
    await sendError("Generierungs-Fehler", err.message, briefing);
  }

  return new Response(null, { status: 202 });
}

// ── Fehler-Mail an Jan ────────────────────────────────────────────────────────
async function sendError(titel, details, briefing) {
  try {
    const firma = briefing?.name || briefing?.firmenname || "(unbekannt)";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.SENDER_EMAIL || "noreply@seitenwertig.de",
        to:   [process.env.RECIPIENT_EMAIL || "jan@seitenwertig.de"],
        subject: `[SeitenWertig] FEHLER: ${titel} — ${firma}`,
        html: `<pre style="font-family:monospace;font-size:13px">${titel}\n\n${details}\n\nBriefing:\n${JSON.stringify(briefing, null, 2)}</pre>`,
      }),
    });
  } catch (e) {
    console.error("[errorEmail]", e.message);
  }
}
