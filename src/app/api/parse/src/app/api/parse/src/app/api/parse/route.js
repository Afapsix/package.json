export const runtime = 'edge';

function extractWbId(link) {
  const m = link.match(/catalog\/(\d+)/);
  if (m) return m[1];
  if (/^\d{6,}$/.test(link.trim())) return link.trim();
  return null;
}

async function parseWbCard(productId) {
  const resp = await fetch(
    `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${productId}`,
    { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' }, signal: AbortSignal.timeout(10000) }
  );
  if (!resp.ok) throw new Error(`WB API вернул ${resp.status}`);
  const data = await resp.json();
  const product = data?.data?.products?.[0];
  if (!product) throw new Error(`WB: товар #${productId} не найден`);

  let description = '';
  const vol = Math.floor(parseInt(productId) / 100000);
  const part = Math.floor(parseInt(productId) / 1000);
  for (let b = 1; b <= 18; b++) {
    try {
      const dr = await fetch(
        `https://basket-${String(b).padStart(2,'0')}.wbbasket.ru/vol${vol}/part${part}/${productId}/info/ru/description.json`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (dr.ok) {
        const text = await dr.text();
        if (text && text.length > 20 && !text.includes('<html')) {
          try { description = JSON.parse(text); } catch { description = text; }
          break;
        }
      }
    } catch { continue; }
  }

  return {
    marketplace: 'Wildberries',
    id: String(productId),
    url: `https://www.wildberries.ru/catalog/${productId}/detail.aspx`,
    title: [product.brand, product.name].filter(Boolean).join(' '),
    brand: product.brand || '',
    rating: product.reviewRating || 0,
    reviews: product.feedbacks || 0,
    price: product.salePriceU ? Math.round(product.salePriceU / 100) : 0,
    category: product.subjectName || '',
    description: typeof description === 'string' ? description : '',
  };
}

function extractOzonId(link) {
  const m1 = link.match(/\/product\/[^\/]*?-(\d{6,})\/?/);
  if (m1) return m1[1];
  const m2 = link.match(/\/product\/(\d{6,})\/?/);
  if (m2) return m2[1];
  return null;
}

async function parseOzonCard(productId) {
  const resp = await fetch(
    `https://api.ozon.ru/composer-api.bx/page/json/v2?url=/product/${productId}/`,
    {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0', 'x-o3-app-name': 'ozon-front' },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!resp.ok) throw new Error(`Ozon API вернул ${resp.status}`);
  const data = await resp.json();
  const states = data?.widgetStates || {};
  let title = '', description = '', brand = '', price = 0, rating = 0, reviews = 0;

  for (const key of Object.keys(states)) {
    try {
      const w = JSON.parse(states[key]);
      if (!title && w?.title?.textContent) title = w.title.textContent;
      if (!title && typeof w?.name === 'string' && w.name.length > 5) title = w.name;
      if (!price && w?.price?.value) price = parseInt(String(w.price.value).replace(/\D/g, '')) || 0;
      if (!rating && w?.rating) rating = parseFloat(w.rating) || 0;
      if (!reviews && w?.reviewsCount) reviews = parseInt(w.reviewsCount) || 0;
      if (!description && w?.description) description = w.description;
      if (!brand && w?.brand?.name) brand = w.brand.name;
    } catch { continue; }
  }

  if (!title) throw new Error(`Ozon: не удалось получить данные товара
