export const runtime = 'edge';

export async function POST(req) {
  const { cards, category } = await req.json();
  if (!cards?.length) return Response.json({ error: 'Нет карточек' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY не настроен' }, { status: 500 });

  const prompt = `Ты аналитик маркетплейсов с опытом 10 лет. Проанализируй РЕАЛЬНЫЕ карточки конкурентов.

КАТЕГОРИЯ: ${category || 'определи из карточек'}
КАРТОЧЕК: ${cards.length}

${cards.map((c, i) => `
=== Конкурент ${i + 1} (${c.marketplace}) ===
Название: ${c.title}
Бренд: ${c.brand || '—'}
Рейтинг: ${c.rating}/5 · ${c.reviews} отзывов
Цена: ${c.price} руб
Описание: ${(c.description || 'не получено').slice(0, 500)}
`).join('\n')}

Верни ТОЛЬКО JSON без markdown:
{
  "top_keywords": [{"keyword":"слово","frequency":2,"importance":"высокая"}],
  "title_patterns": ["паттерн 1","паттерн 2"],
  "common_benefits": ["выгода 1","выгода 2"],
  "gaps": ["возможность 1","возможность 2"],
  "price_range": "от X до Y руб",
  "avg_rating": 0,
  "winning_formula": "формула победной карточки",
  "recommended_title": "заголовок до 60 символов",
  "recommended_description": "описание 500-700 символов",
  "competitors_ranked": [{"pos":1,"title":"название","score":85,"strength":"сила"}]
}`;

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
    const clean = text.replace(/```json|```/g,
