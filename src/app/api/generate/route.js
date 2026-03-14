export const runtime = 'edge';

export async function POST(req) {
  const { prompt } = await req.json();
  if (!prompt) return Response.json({ error: 'Нет промпта' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY не настроен' }, { status: 500 });

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    const text = (data.content || []).map(c => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    try {
      return Response.json(JSON.parse(clean));
    } catch {
      return Response.json({ error: 'Claude вернул не JSON', raw: text }, { status: 500 });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
