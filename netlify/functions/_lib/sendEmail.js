export async function sendResultEmail({ to, from, briefing, lovablePrompt, usage, durationMs }) {
  const firma = briefing.name || briefing.firmenname || "(ohne Firmenname)";
  const ort   = briefing.ort   || "(ohne Ort)";
  const branche = briefing.branche || "(ohne Branche)";

  const subject = `[SeitenWertig] Lovable-Prompt: ${firma}, ${ort}`;

  // Kosten-Schätzung für claude-opus-4-5 (Stand April 2026)
  const INPUT_COST_PER_MTOK  = 15.0;
  const OUTPUT_COST_PER_MTOK = 75.0;
  const CACHE_READ_PER_MTOK  = 1.5;
  const inputCost  = ((usage?.input_tokens || 0) / 1_000_000) * INPUT_COST_PER_MTOK;
  const cacheCost  = ((usage?.cache_read_input_tokens || 0) / 1_000_000) * CACHE_READ_PER_MTOK;
  const outputCost = ((usage?.output_tokens || 0) / 1_000_000) * OUTPUT_COST_PER_MTOK;
  const totalUsd   = inputCost + cacheCost + outputCost;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h1 style="font-size:22px;border-bottom:2px solid #eee;padding-bottom:12px">Neuer Lovable-Prompt generiert</h1>

  <h2 style="font-size:16px;color:#555;margin-top:24px">Briefing</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%">
    <tr><td style="padding:4px 8px;color:#777;width:160px">Firma</td><td style="padding:4px 8px"><strong>${esc(firma)}</strong></td></tr>
    <tr><td style="padding:4px 8px;color:#777">Branche</td><td style="padding:4px 8px">${esc(branche)}</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Ort</td><td style="padding:4px 8px">${esc(ort)}</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Kontakt</td><td style="padding:4px 8px">${esc(briefing.email || "—")}</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Wettbewerbsanalyse</td><td style="padding:4px 8px">${briefing.wbOn ? "ja" : "nein"}</td></tr>
  </table>

  <h2 style="font-size:16px;color:#555;margin-top:24px">Generierung</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%">
    <tr><td style="padding:4px 8px;color:#777;width:160px">Dauer</td><td style="padding:4px 8px">${(durationMs / 1000).toFixed(1)} s</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Input-Tokens</td><td style="padding:4px 8px">${(usage?.input_tokens || 0).toLocaleString("de-DE")} (cache read: ${(usage?.cache_read_input_tokens || 0).toLocaleString("de-DE")})</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Output-Tokens</td><td style="padding:4px 8px">${(usage?.output_tokens || 0).toLocaleString("de-DE")}</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Kosten</td><td style="padding:4px 8px">~$${totalUsd.toFixed(3)}</td></tr>
  </table>

  <h2 style="font-size:16px;color:#555;margin-top:24px">Lovable-Prompt</h2>
  <pre style="background:#f6f8fa;border:1px solid #e1e4e8;border-radius:6px;padding:16px;overflow-x:auto;font-size:13px;white-space:pre-wrap;word-wrap:break-word">${esc(lovablePrompt)}</pre>

  <p style="color:#888;font-size:12px;margin-top:32px">SeitenWertig · automatisch generiert</p>
</div>`.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return res.json();
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
