// E-Mail-Versand via Resend.
// Resend ist einfach, hat EU-Region für DSGVO-Konformität und ist
// mit 3.000 Mails/Monat im Free-Tier für SeitenWertig mehr als ausreichend.

const PAKET_LABEL = {
  onepager: 'Paket 1 — Onepager (€ 890)',
  website:  'Paket 2 — Website (€ 1.290)',
  komplett: 'Paket 3 — Komplettpaket (€ 1.590)',
};

export async function sendResultEmail({
  to,
  from,
  briefing,
  lovablePrompt,
  usage,
  durationMs,
}) {
  const firma   = briefing.firmenname || '(ohne Firmenname)';
  const ort     = briefing.ort || '(ohne Ort)';
  const branche = briefing.branche || '(ohne Branche)';
  const paket   = PAKET_LABEL[briefing.paket] || briefing.paket || '(ohne Paket)';

  const subject = `[SeitenWertig] ${paket}: ${firma}, ${ort}`;

  // Kosten-Schätzung für Opus 4.7 (Stand April 2026)
  const INPUT_COST_PER_MTOK   = 15.0;
  const OUTPUT_COST_PER_MTOK  = 75.0;
  const CACHE_READ_PER_MTOK   = 1.5;
  const inputCost  = ((usage?.input_tokens || 0) / 1_000_000) * INPUT_COST_PER_MTOK;
  const cacheCost  = ((usage?.cache_read_input_tokens || 0) / 1_000_000) * CACHE_READ_PER_MTOK;
  const outputCost = ((usage?.output_tokens || 0) / 1_000_000) * OUTPUT_COST_PER_MTOK;
  const totalUsd   = inputCost + cacheCost + outputCost;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h1 style="font-size:22px;border-bottom:2px solid #eee;padding-bottom:12px">Neuer Lovable-Prompt generiert</h1>

  <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;margin:16px 0;border-radius:4px">
    <strong style="color:#065f46;font-size:15px">${escapeHtml(paket)}</strong>
  </div>

  <h2 style="font-size:16px;color:#555;margin-top:24px">Briefing</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%">
    <tr><td style="padding:4px 8px;color:#777;width:160px">Firma</td><td style="padding:4px 8px"><strong>${escapeHtml(firma)}</strong></td></tr>
    <tr><td style="padding:4px 8px;color:#777">Branche</td><td style="padding:4px 8px">${escapeHtml(branche)}</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Ort</td><td style="padding:4px 8px">${escapeHtml(ort)}</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Kontakt</td><td style="padding:4px 8px">${escapeHtml(briefing.email || '—')} / ${escapeHtml(briefing.telefon || '—')}</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Wettbewerbsanalyse</td><td style="padding:4px 8px">${briefing.wettbewerbsanalyse_gewuenscht ? 'ja' : 'nein'}</td></tr>
    ${briefing.domainwunsch ? `<tr><td style="padding:4px 8px;color:#777">Wunsch-Domain</td><td style="padding:4px 8px"><strong>${escapeHtml(briefing.domainwunsch)}</strong></td></tr>` : ''}
  </table>

  <h2 style="font-size:16px;color:#555;margin-top:24px">Generierung</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%">
    <tr><td style="padding:4px 8px;color:#777;width:160px">Dauer</td><td style="padding:4px 8px">${(durationMs / 1000).toFixed(1)} s</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Input-Tokens</td><td style="padding:4px 8px">${(usage?.input_tokens || 0).toLocaleString('de-DE')} (cache read: ${(usage?.cache_read_input_tokens || 0).toLocaleString('de-DE')})</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Output-Tokens</td><td style="padding:4px 8px">${(usage?.output_tokens || 0).toLocaleString('de-DE')}</td></tr>
    <tr><td style="padding:4px 8px;color:#777">Kosten</td><td style="padding:4px 8px">~$${totalUsd.toFixed(3)}</td></tr>
  </table>

  <h2 style="font-size:16px;color:#555;margin-top:24px">Lovable-Prompt (zum Einfügen in Lovable)</h2>
  <pre style="background:#f6f8fa;border:1px solid #e1e4e8;border-radius:6px;padding:16px;overflow-x:auto;font-size:13px;white-space:pre-wrap;word-wrap:break-word">${escapeHtml(lovablePrompt)}</pre>

  <p style="color:#888;font-size:12px;margin-top:32px">SeitenWertig · automatisch generiert</p>
</div>`.trim();

  const text = `Neuer Lovable-Prompt generiert\n\n${paket}\n\nFirma: ${firma}\nBranche: ${branche}\nOrt: ${ort}\n\n---\n\n${lovablePrompt}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }

  return res.json();
}

// Fehler-Mail an Jan, falls Pflichtfelder fehlen oder Claude-Call kracht
export async function sendErrorEmail({ to, from, briefing, error }) {
  const subject = `[SeitenWertig] ⚠️ Briefing-Fehler: ${briefing?.firmenname || '(ohne Firma)'}`;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h1 style="font-size:22px;color:#b91c1c">Briefing-Verarbeitung fehlgeschlagen</h1>
  <p style="color:#555">Ein Briefing kam an, aber die Generierung ist fehlgeschlagen. Hier alle Daten zur manuellen Bearbeitung:</p>

  <h2 style="font-size:16px;color:#555;margin-top:24px">Fehler</h2>
  <pre style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;font-size:13px;white-space:pre-wrap">${escapeHtml(String(error))}</pre>

  <h2 style="font-size:16px;color:#555;margin-top:24px">Briefing-Dump</h2>
  <pre style="background:#f6f8fa;border:1px solid #e1e4e8;border-radius:6px;padding:16px;overflow-x:auto;font-size:13px;white-space:pre-wrap">${escapeHtml(JSON.stringify(briefing, null, 2))}</pre>
</div>`.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text: `Briefing-Fehler: ${error}\n\n${JSON.stringify(briefing, null, 2)}`,
    }),
  });

  if (!res.ok) {
    console.error('Failed to send error email:', await res.text());
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
