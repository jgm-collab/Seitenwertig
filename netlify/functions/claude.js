// netlify/functions/claude.js
// Proxy für Anthropic Claude API — schützt den API-Key server-seitig.
// Env var: ANTHROPIC_API_KEY (in Netlify Dashboard unter Site Settings → Environment Variables setzen)

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://seitenwertig.de',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY nicht gesetzt');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API-Key nicht konfiguriert. Bitte in Netlify → Environment Variables setzen.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiger Request-Body' }) };
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Kein Prompt angegeben' }) };
  }

  // Sicherheit: Prompt-Länge begrenzen (max ~8000 Zeichen = ca. 2000 Token Input)
  if (prompt.length > 12000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Prompt zu lang' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API Fehler:', response.status, err);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Claude nicht erreichbar. Bitte später erneut versuchen.' }),
      };
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || '';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://seitenwertig.de',
      },
      body: JSON.stringify({ text }),
    };

  } catch (err) {
    console.error('Fetch-Fehler:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Netzwerkfehler beim Erreichen der Claude API' }),
    };
  }
};
