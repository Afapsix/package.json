'use client';
import { useState, useRef } from 'react';

const CATS = ['Посуда и кухня','Одежда и обувь','Электроника','Спорт и отдых','Красота и уход','Товары для дома','Детские товары','Инструменты','Другое'];
const WBR = `- Заголовок до 60 символов, главный ключ в начале\n- Описание минимум 500 символов\n- Плотность ключей 3-5%\n- Избегать: лучший, уникальный, супер`;
const OZR = `- Название до 200 символов\n- Описание от 1000 символов\n- Ключи в описании и в атрибутах\n- Заполнить все поля категории`;
const WBSEO = `- Алгоритм: название 40%, описание 25%, атрибуты 20%\n- Главный ключ в первых 5 словах\n- Запрещено: caps lock, смайлы в заголовке`;
const OZSEO = `- Алгоритм: название 35%, описание 30%, атрибуты 25%\n- Поддерживает HTML теги в описании`;

const TABS = [
  { label: 'Генерация карточки', sub: 'AI создаст заголовок, описание и ключи' },
  { label: 'Анализ по ссылкам', sub: 'Парсим реальные карточки WB/Ozon' },
  { label: 'SEO-аудит', sub: 'Аудит с готовыми исправлениями' },
  { label: 'Массовая загрузка', sub: 'Генерация карточек из таблицы' },
];

export default function Home() {
  const [tab, setTab] = useState(0);
  const [mkt, setMkt] = useState('wb');
  const [mode, setMode] = useState('standard');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [loadStep, setLoadStep] = useState(-1);
  const [loadSteps, setLoadSteps] = useState([]);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const stepTimer = useRef(null);

  const [t0Name, setT0Name] = useState('');
  const [t0Cat, setT0Cat] = useState('');
  const [t0Feat, setT0Feat] = useState('');
  const [t0Aud, setT0Aud] = useState('');

  const [t1Links, setT1Links] = useState('');
  const [t1Manual, setT1Manual] = useState('');
  const [t1Cat, setT1Cat] = useState('');

  const [t2Title, setT2Title] = useState('');
  const [t2Desc, setT2Desc] = useState('');
  const [t2Cat, setT2Cat] = useState('');
  const [t2Kw, setT2Kw] = useState('');

  const [t3Rows, setT3Rows] = useState([
    { article: '', name: '', features: '' },
    { article: '', name: '', features: '' },
  ]);
  const [t3Voice, setT3Voice] = useState('нейтральный');

  const mn = mkt === 'wb' ? 'Wildberries' : 'Ozon';

  function startLoad(steps) {
    setLoadSteps(steps); setLoadStep(0); setStatus('loading');
    let i = 0;
    const tick = () => { i++; if (i < steps.length) { setLoadStep(i); stepTimer.current = setTimeout(tick, 900); } };
    stepTimer.current = setTimeout(tick, 900);
  }
  function stopLoad() { clearTimeout(stepTimer.current); }
  async function post(path, data) {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  }
  function copy(key, text) { navigator.clipboard.writeText(text).then(() => { setCopiedKey(key); setTimeout(() => setCopiedKey(''), 2000); }); }
  function bc(v) { return v >= 75 ? '#3ddc84' : v >= 50 ? '#ffaa00' : '#ff4422'; }

  async function run() {
    stopLoad(); setError('');

    if (tab === 0) {
      if (!t0Name.trim()) { alert('Введите название товара'); return; }
      startLoad(['Анализирую категорию...', 'Изучаю требования ' + mn + '...', 'Пишу заголовок...', 'Составляю описание...', 'Подбираю ключевые слова...', 'Считаю SEO-баллы...']);
      const prompt = `Ты эксперт по продающим карточкам маркетплейсов с опытом 10 лет.\nМаркетплейс: ${mn}. Товар: ${t0Name}. Категория: ${t0Cat || 'не указана'}. Характеристики: ${t0Feat || 'не указаны'}. Аудитория: ${t0Aud || 'широкая'}. Режим: ${mode === 'seo' ? 'максимум SEO-плотности' : 'баланс читаемости и SEO'}.\nТребования: ${mkt === 'wb' ? WBR : OZR}\nФормула текста: боль покупателя → решение → выгоды → характеристики → призыв к действию.\nВерни ТОЛЬКО JSON без markdown: {"title":"заголовок до 60 символов","description":"описание 500-800 символов","bullet_points":["✓ выгода 1 с цифрой","✓ выгода 2","✓ выгода 3","✓ выгода 4","✓ выгода 5"],"keywords":["15 ключей по убыванию частотности"],"seo":{"title_score":0,"keyword_density":0,"readability":0,"completeness":0},"total_score":0,"tips":["совет 1","совет 2","совет 3"]}`;
      try {
        const r = await post('/api/generate', { prompt });
        if (r.error) throw new Error(r.error);
        stopLoad(); setResult({ type: 0, data: r, name: t0Name }); setStatus('result');
      } catch (e) { stopLoad(); setError(e.message); setStatus('error'); }
    }

    else if (tab === 1) {
      const links = t1Links.split('\n').map(l => l.trim()).filter(Boolean);
      if (!links.length && !t1Manual.trim()) { alert('Вставьте ссылки или текст карточек вручную'); return; }
      startLoad(['Парсим ссылки...', 'Получаем данные из WB...', 'Получаем данные из Ozon...', 'Передаём в Claude AI...', 'Анализируем паттерны...', 'Формируем рекомендации...']);
      try {
        let cards = [], errors = [];

        // Пробуем парсинг по ссылкам
        if (links.length) {
          const parseRes = await post('/api/parse', { links });
          cards = parseRes.cards || [];
          errors = parseRes.errors || [];
        }

        // Если парсинг не сработал — используем ручной ввод
        if (!cards.length) {
          if (t1Manual.trim()) {
            // Разбиваем ручной текст на отдельные карточки
            const manualCards = t1Manual.split(/\n{2,}/).map((block, i) => ({
              marketplace: 'Ручной ввод',
              id: String(i + 1),
              url: '',
              title: block.split('\n')[0].replace(/^(Название:|Заголовок:)\s*/i, '').trim(),
              brand: '',
              rating: 0,
              reviews: 0,
              price: 0,
              category: t1Cat || '',
              description: block,
            })).filter(c => c.title);
            cards = manualCards.length ? manualCards : [{
              marketplace: 'Ручной ввод',
              id: '1',
              url: '',
              title: 'Ручной ввод',
              brand: '',
              rating: 0,
              reviews: 0,
              price: 0,
              category: t1Cat || '',
              description: t1Manual,
            }];
          } else {
            stopLoad();
            setError('Не удалось спарсить ссылки.\n' + errors.map(e => e.link + ': ' + e.error).join('\n') + '\n\nВставьте текст карточек вручную в поле ниже.');
            setStatus('error'); return;
          }
        }

        const r = await post('/api/analyze', { cards, category: t1Cat });
        if (r.error) throw new Error(r.error);
        stopLoad(); setResult({ type: 1, data: r, cards, errors }); setStatus('result');
      } catch (e) { stopLoad(); setError(e.message); setStatus('error'); }
    }

    else if (tab === 2) {
      if (!t2Title.trim()) { alert('Введите текущий заголовок'); return; }
      startLoad(['Читаю карточку...', 'Анализирую заголовок...', 'Проверяю описание...', 'Ищу упущенные ключи...', 'Формирую рекомендации...']);
      const prompt = `Ты SEO-специалист по ${mn} с опытом 10 лет. Проведи полный аудит карточки.\nМаркетплейс: ${mn}. Заголовок: ${t2Title}. Описание: ${t2Desc || 'не указано'}. Категория: ${t2Cat || 'не указана'}. Ключи: ${t2Kw || 'не указаны'}.\nКритерии: ${mkt === 'wb' ? WBSEO : OZSEO}\nВерни ТОЛЬКО JSON без markdown: {"audit":{"title":{"score":0,"issues":["проблема"],"fixed_version":"исправленный заголовок"},"description":{"score":0,"keyword_density":"X%","issues":["проблема"],"fixed_version":"исправленное описание 500+ символов"},"keywords":{"score":0,"missing_high_freq":["ключ"],"optimized_list":["ключ1","ключ2"]}},"total_before":0,"total_after":0,"ranking_forecast":"прогноз позиций","priority_actions":[{"action":"что сделать","impact":"высокий","effort":"5 мин"}]}`;
      try {
        const r = await post('/api/generate', { prompt });
        if (r.error) throw new Error(r.error);
        stopLoad(); setResult({ type: 2, data: r }); setStatus('result');
      } catch (e) { stopLoad(); setError(e.message); setStatus('error'); }
    }

    else if (tab === 3) {
      const items = t3Rows.filter(r => r.name.trim());
      if (!items.length) { alert('Добавьте хотя бы один товар'); return; }
      startLoad(['Обрабатываю ' + items.length + ' товаров...', 'Генерирую заголовки...', 'Составляю описания...', 'Подбираю ключевые слова...', 'Финализирую...']);
      const prompt = `Эксперт по карточкам для ${mn}. Стиль: ${t3Voice}. Маркетплейс: ${mn}.\nТовары: ${items.map((it, i) => `${i + 1}. Артикул: ${it.article || '—'} | ${it.name} | ${it.features || '—'}`).join('\n')}\nВерни ТОЛЬКО JSON массив без markdown: [{"article":"арт","title":"заголовок до 60 символов","description":"описание 400-600 символов","keywords":["5-8 ключей"],"seo_score":0}]`;
      try {
        const r = await post('/api/generate', { prompt });
        if (r.error) throw new Error(r.error);
        const arr = Array.isArray(r) ? r : [r];
        stopLoad(); setResult({ type: 3, data: arr }); setStatus('result');
      } catch (e) { stopLoad(); setError(e.message); setStatus('error'); }
    }
  }

  const css = {
    root: { display: 'flex', minHeight: '100vh', background: '#0d0d14', color: '#dddaf0', fontFamily: "'Raleway', sans-serif", fontSize: 14 },
    sb: { width: 320, minWidth: 320, background: '#13131e', borderRight: '1px solid #2a2840', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, overflowY: 'auto' },
    sbHead: { padding: '18px 20px 14px', borderBottom: '1px solid #2a2840' },
    logo: { fontWeight: 900, fontSize: 18, color: '#fff' },
    logoEm: { color: '#ff4422', fontStyle: 'normal', fontSize: 9, fontWeight: 700, letterSpacing: 3, verticalAlign: 'super', textTransform: 'uppercase' },
    nav: { display: 'flex', flexDirection: 'column', gap: 2, padding: 10 },
    navBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', background: active ? '#1a1a28' : 'transparent', color: active ? '#fff' : '#9490b8', fontFamily: "'Raleway', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .15s' }),
    navNum: (active) => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, width: 20, height: 20, borderRadius: '50%', background: active ? '#ff4422' : '#2a2840', color: active ? '#fff' : '#9490b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
    sbBody: { padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 },
    mktRow: { display: 'flex', gap: 4, background: '#1a1a28', borderRadius: 8, padding: 4 },
    mktBtn: (a) => ({ flex: 1, padding: '7px', textAlign: 'center', borderRadius: 6, border: 'none', background: a ? '#ff4422' : 'transparent', color: a ? '#fff' : '#9490b8', fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer' }),
    field: { display: 'flex', flexDirection: 'column', gap: 5 },
    label: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9490b8' },
    input: { width: '100%', background: '#1a1a28', border: '1px solid #2a2840', color: '#dddaf0', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontFamily: "'Raleway', sans-serif", outline: 'none' },
    textarea: { width: '100%', background: '#1a1a28', border: '1px solid #2a2840', color: '#dddaf0', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontFamily: "'Raleway', sans-serif", outline: 'none', resize: 'vertical', minHeight: 80, lineHeight: 1.5 },
    select: { width: '100%', background: '#1a1a28', border: '1px solid #2a2840', color: '#dddaf0', padding: '9px 12px', borderRadius: 8, fontSize: 13, outline: 'none' },
    btnRun: (dis) => ({ width: '100%', background: dis ? '#2a2840' : 'linear-gradient(135deg,#ff4422,#ff8800)', color: dis ? '#9490b8' : '#fff', border: 'none', padding: 13, borderRadius: 10, fontFamily: "'Raleway', sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', cursor: dis ? 'not-allowed' : 'pointer', marginTop: 'auto' }),
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
    mHead: { padding: '18px 28px', borderBottom: '1px solid #2a2840', background: '#13131e', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    mBody: { flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 },
    card: { background: '#13131e', border: '1px solid #2a2840', borderRadius: 14, overflow: 'hidden' },
    cardHead: { padding: '9px 16px', background: '#1a1a28', borderBottom: '1px solid #2a2840', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    cardLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#9490b8' },
    cardBody: { padding: '14px 16px' },
    btnCopy: (ok) => ({ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${ok ? '#3ddc84' : '#2a2840'}`, background: 'transparent', color: ok ? '#3ddc84' : '#9490b8', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }),
    chip: { display: 'inline-block', fontSize: 11, padding: '3px 9px', borderRadius: 4, border: '1px solid rgba(255,68,34,.25)', background: 'rgba(255,68,34,.08)', color: '#ff8866', margin: '3px 3px 0 0', fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer' },
    tip: { fontSize: 13, color: '#dddaf0', padding: '9px 12px', background: '#1a1a28', borderRadius: 6, borderLeft: '2px solid #ff8800', marginBottom: 8, lineHeight: 1.5 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    barRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
    empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 60, color: '#9490b8' },
    loading: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 },
    errBox: { background: 'rgba(255,68,34,.07)', border: '1px solid rgba(255,68,34,.25)', borderRadius: 10, padding: 16, color: '#ff8866', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
    divider: { display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' },
    dividerLine: { flex: 1, height: 1, background: '#2a2840' },
    dividerText: { fontSize: 11, color: '#9490b8' },
  };

  const R = result;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder, textarea::placeholder { color: #2a2840; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2840; border-radius: 2px; }
        select option { background: #1a1a28; }
        input:focus, textarea:focus, select:focus { border-color: #ff4422 !important; outline: none; }
        @media(max-width:860px) { .app-grid { grid-template-columns: 1fr !important; } .sb { position: static !important; height: auto !important; } .grid2 { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={css.root} className="app-grid">
        <aside style={css.sb}>
          <div style={css.sbHead}>
            <div style={css.logo}>Card<em style={css.logoEm}>AI</em></div>
          </div>
          <div style={css.nav}>
            {TABS.map((t, i) => (
              <button key={i} style={css.navBtn(tab === i)} onClick={() => { setTab(i); setStatus('idle'); setResult(null); }}>
                <span style={css.navNum(tab === i)}>{i + 1}</span>
                {t.label}
              </button>
            ))}
          </div>
          <div style={css.sbBody}>
            <div style={css.field}>
              <div style={css.label}>Маркетплейс</div>
              <div style={css.mktRow}>
                <button style={css.mktBtn(mkt === 'wb')} onClick={() => setMkt('wb')}>Wildberries</button>
                <button style={css.mktBtn(mkt === 'ozon')} onClick={() => setMkt('ozon')}>Ozon</button>
              </div>
            </div>

            {tab === 0 && <>
              <div style={css.field}><label style={css.label}>Название товара *</label><input style={css.input} value={t0Name} onChange={e => setT0Name(e.target.value)} placeholder="Термокружка 500мл антипролив" onKeyDown={e => e.key === 'Enter' && run()} /></div>
              <div style={css.field}><label style={css.label}>Категория</label><select style={css.select} value={t0Cat} onChange={e => setT0Cat(e.target.value)}><option value="">— выберите —</option>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
              <div style={css.field}><label style={css.label}>Характеристики</label><textarea style={css.textarea} value={t0Feat} onChange={e => setT0Feat(e.target.value)} placeholder="Материал, объём, размер, особенности..." /></div>
              <div style={css.field}><label style={css.label}>Целевая аудитория</label><input style={css.input} value={t0Aud} onChange={e => setT0Aud(e.target.value)} placeholder="Офисные работники, туристы" /></div>
              <div style={css.field}><label style={css.label}>Режим</label><div style={css.mktRow}><button style={css.mktBtn(mode === 'standard')} onClick={() => setMode('standard')}>Стандарт</button><button style={css.mktBtn(mode === 'seo')} onClick={() => setMode('seo')}>SEO-макс</button></div></div>
            </>}

            {tab === 1 && <>
              <div style={{ fontSize: 12, color: '#9490b8', background: '#1a1a28', padding: '10px 12px', borderRadius: 8, lineHeight: 1.6 }}>
                Вставьте ссылки WB/Ozon — или текст карточек вручную если ссылки не работают.
              </div>
              <div style={css.field}>
                <label style={css.label}>Ссылки (каждая с новой строки)</label>
                <textarea style={{ ...css.textarea, minHeight: 90 }} value={t1Links} onChange={e => setT1Links(e.target.value)} placeholder={'https://www.wildberries.ru/catalog/12345678/detail.aspx\nhttps://www.ozon.ru/product/nazvanie-123456789/'} />
              </div>
              <div style={css.divider}>
                <div style={css.dividerLine}></div>
                <div style={css.dividerText}>или вручную</div>
                <div style={css.dividerLine}></div>
              </div>
              <div style={css.field}>
                <label style={css.label}>Текст карточек вручную</label>
                <textarea style={{ ...css.textarea, minHeight: 110 }} value={t1Manual} onChange={e => setT1Manual(e.target.value)} placeholder={'Карточка 1:\nТермокружка 500мл антипролив\nВакуумная кружка из стали...\n\nКарточка 2:\nКружка с клапаном 350мл\n...'} />
              </div>
              <div style={css.field}><label style={css.label}>Категория (опц.)</label><input style={css.input} value={t1Cat} onChange={e => setT1Cat(e.target.value)} placeholder="Термокружки" /></div>
            </>}

            {tab === 2 && <>
              <div style={css.field}><label style={css.label}>Текущий заголовок *</label><input style={css.input} value={t2Title} onChange={e => setT2Title(e.target.value)} placeholder="Термокружка стальная 500мл" /></div>
              <div style={css.field}><label style={css.label}>Текущее описание</label><textarea style={css.textarea} value={t2Desc} onChange={e => setT2Desc(e.target.value)} placeholder="Вставьте текущее описание карточки..." /></div>
              <div style={css.field}><label style={css.label}>Категория</label><input style={css.input} value={t2Cat} onChange={e => setT2Cat(e.target.value)} placeholder="Посуда и кухня" /></div>
              <div style={css.field}><label style={css.label}>Текущие ключевые слова</label><input style={css.input} value={t2Kw} onChange={e => setT2Kw(e.target.value)} placeholder="термокружка, кружка, сталь" /></div>
            </>}

            {tab === 3 && <>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 6, marginBottom: 4 }}>
                {['Артикул', 'Название', 'Характеристики'].map(l => <div key={l} style={{ fontSize: 10, color: '#9490b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{l}</div>)}
              </div>
              {t3Rows.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 6, marginBottom: 6 }}>
                  <input style={css.input} value={row.article} onChange={e => { const r = [...t3Rows]; r[i] = { ...r[i], article: e.target.value }; setT3Rows(r); }} placeholder="АРТ-001" />
                  <input style={css.input} value={row.name} onChange={e => { const r = [...t3Rows]; r[i] = { ...r[i], name: e.target.value }; setT3Rows(r); }} placeholder="Название" />
                  <input style={css.input} value={row.features} onChange={e => { const r = [...t3Rows]; r[i] = { ...r[i], features: e.target.value }; setT3Rows(r); }} placeholder="Характеристики" />
                </div>
              ))}
              <button onClick={() => setT3Rows([...t3Rows, { article: '', name: '', features: '' }])} style={{ fontSize: 12, color: '#9490b8', border: '1px dashed #2a2840', background: 'transparent', padding: 8, borderRadius: 8, cursor: 'pointer', width: '100%', fontFamily: "'Raleway', sans-serif" }}>+ добавить товар</button>
              <div style={css.field}><label style={css.label}>Стиль текста</label><select style={css.select} value={t3Voice} onChange={e => setT3Voice(e.target.value)}><option>нейтральный</option><option>экспертный</option><option>дружелюбный</option><option>премиум</option></select></div>
            </>}

            <button style={css.btnRun(status === 'loading')} onClick={run} disabled={status === 'loading'}>
              {status === 'loading' ? '⏳ Обрабатываю...' : ['✦ Сгенерировать', '🔍 Парсить и анализировать', '📊 Провести аудит', '⚡ Сгенерировать все'][tab]}
            </button>
          </div>
        </aside>

        <main style={css.main}>
          <div style={css.mHead}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>{TABS[tab].label}</div>
              <div style={{ fontSize: 12, color: '#9490b8', marginTop: 2 }}>{TABS[tab].sub} · {mn}</div>
            </div>
            {status === 'result' && <button style={css.btnCopy(false)} onClick={() => { setStatus('idle'); setResult(null); }}>✕ Очистить</button>}
          </div>
          <div style={css.mBody}>
            {status === 'idle' && <div style={css.empty}><div style={{ fontSize: 40, opacity: .15, marginBottom: 12 }}>◈</div><div style={{ fontSize: 16, fontWeight: 700, opacity: .3, color: '#fff' }}>Здесь появится результат</div><div style={{ fontSize: 13, marginTop: 8 }}>Заполните форму слева и нажмите кнопку</div></div>}
            {status === 'loading' && <div style={css.loading}><div style={{ width: 32, height: 32, border: '2px solid #2a2840', borderTopColor: '#ff4422', borderRadius: '50%', animation: 'spin .7s linear infinite' }}></div><div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{loadSteps.map((s, i) => <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: i < loadStep ? '#3ddc84' : i === loadStep ? '#fff' : '#4a4870', transition: 'all .3s' }}>{i < loadStep ? '✓ ' : '· '}{s}</div>)}</div></div>}
            {status === 'error' && <div style={css.errBox}><strong style={{ color: '#ff4422', display: 'block', marginBottom: 8 }}>Ошибка</strong>{error}</div>}

            {status === 'result' && R?.type === 0 && (() => { const r = R.data; return <><div style={{ fontSize: 11, color: '#9490b8', fontFamily: "'JetBrains Mono', monospace" }}>{mn} · {R.name}</div><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Заголовок</div><button style={css.btnCopy(copiedKey === 't')} onClick={() => copy('t', r.title)}>{copiedKey === 't' ? '✓ скопировано' : 'копировать'}</button></div><div style={css.cardBody}><div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 6 }}>{r.title}</div><div style={{ fontSize: 11, color: '#9490b8' }}>Символов: {r.title?.length} {r.title?.length <= 60 ? '· норма' : '· длинный'}</div></div></div><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Описание</div><button style={css.btnCopy(copiedKey === 'd')} onClick={() => copy('d', r.description)}>{copiedKey === 'd' ? '✓ скопировано' : 'копировать'}</button></div><div style={css.cardBody}><div style={{ fontSize: 13, lineHeight: 1.75, marginBottom: 6 }}>{r.description}</div><div style={{ fontSize: 11, color: '#9490b8' }}>Символов: {r.description?.length}</div></div></div><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Ключевые преимущества</div></div><div style={css.cardBody}>{(r.bullet_points || []).map((b, i) => <div key={i} style={{ fontSize: 13, padding: '5px 0', borderBottom: '1px solid #2a2840' }}>{b}</div>)}</div></div><div style={css.grid2} className="grid2"><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Ключи</div><button style={css.btnCopy(copiedKey === 'k')} onClick={() => copy('k', (r.keywords || []).join(', '))}>{copiedKey === 'k' ? '✓' : 'копировать'}</button></div><div style={css.cardBody}>{(r.keywords || []).map((k, i) => <span key={i} style={css.chip} onClick={() => copy('kw' + i, k)}>{k}</span>)}</div></div><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>SEO-анализ</div></div><div style={css.cardBody}>{[['Заголовок', r.seo?.title_score || 0], ['Плотность ключей', r.seo?.keyword_density || 0], ['Читаемость', r.seo?.readability || 0], ['Полнота', r.seo?.completeness || 0]].map(([n, v]) => <div key={n} style={css.barRow}><div style={{ fontSize: 12, color: '#dddaf0', width: 130, flexShrink: 0 }}>{n}</div><div style={{ flex: 1, height: 4, background: '#2a2840', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: v + '%', height: 4, background: bc(v), borderRadius: 2, transition: 'width 1s ease' }}></div></div><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: bc(v), width: 28, textAlign: 'right' }}>{Math.round(v)}</div></div>)}</div></div></div><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Итог и советы</div></div><div style={{ ...css.cardBody, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'start' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, color: '#fff' }}>{r.total_score || 0}</div><div style={{ fontSize: 11, color: '#9490b8', marginTop: 4 }}>из 100</div><div style={{ fontSize: 12, marginTop: 8, color: bc(r.total_score || 0) }}>{(r.total_score || 0) >= 80 ? 'Отлично' : (r.total_score || 0) >= 60 ? 'Хорошо' : 'Нужна доработка'}</div></div><div>{(r.tips || []).map((t, i) => <div key={i} style={css.tip}>{t}</div>)}</div></div></div></>; })()}

            {status === 'result' && R?.type === 1 && (() => { const r = R.data, cards = R.cards, errors = R.errors; return <>{errors.length > 0 && <div style={{ ...css.errBox, marginBottom: 0 }}><strong style={{ color: '#ffaa00' }}>⚠ Не удалось спарсить ({errors.length}) — использован ручной ввод</strong></div>}{cards.length > 0 && <div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Спаршено карточек: {cards.length}</div></div><div style={css.cardBody}>{cards.map((c, i) => <div key={i} style={{ background: '#1a1a28', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", background: c.marketplace === 'Wildberries' ? 'rgba(204,0,76,.15)' : c.marketplace === 'Ozon' ? 'rgba(0,91,255,.1)' : 'rgba(255,170,0,.1)', color: c.marketplace === 'Wildberries' ? '#ff4499' : c.marketplace === 'Ozon' ? '#4499ff' : '#ffaa00', border: `1px solid ${c.marketplace === 'Wildberries' ? 'rgba(204,0,76,.3)' : c.marketplace === 'Ozon' ? 'rgba(0,91,255,.25)' : 'rgba(255,170,0,.3)'}` }}>{c.marketplace}</span><span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.title.slice(0, 55)}{c.title.length > 55 ? '…' : ''}</span></div><div style={{ fontSize: 11, color: '#9490b8' }}>⭐ {c.rating} · {c.reviews} отз · {c.price} руб</div>{c.description && <div style={{ fontSize: 12, color: '#9490b8', marginTop: 6, lineHeight: 1.5 }}>{c.description.slice(0, 180)}{c.description.length > 180 ? '…' : ''}</div>}</div>)}</div></div>}<div style={css.grid2} className="grid2"><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Топ ключевые слова</div></div><div style={css.cardBody}>{(r.top_keywords || []).slice(0, 12).map((k, i) => <span key={i} style={css.chip}>{k.keyword}</span>)}</div></div><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Пробелы рынка</div></div><div style={css.cardBody}>{(r.gaps || []).map((g, i) => <div key={i} style={css.tip}>{g}</div>)}</div></div></div><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Рейтинг конкурентов</div></div><div style={css.cardBody}>{(r.competitors_ranked || cards.map((c, i) => ({ pos: i + 1, title: c.title.slice(0, 45), score: Math.round(80 - i * 8), strength: '—' }))).map((c, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #2a2840' }}><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: c.pos <= 3 ? '#ff4422' : '#2a2840', width: 24 }}>{c.pos}</div><div style={{ flex: 1 }}><div style={{ fontSize: 13, color: '#fff', marginBottom: 2 }}>{c.title}</div><div style={{ fontSize: 11, color: '#9490b8' }}>{c.strength}</div></div><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: bc(c.score) }}>{c.score}</div></div>)}</div></div><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Формула победной карточки</div></div><div style={css.cardBody}><div style={{ fontSize: 13, lineHeight: 1.7 }}>{r.winning_formula}</div></div></div><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Рекомендуемый заголовок</div><button style={css.btnCopy(copiedKey === 'rt')} onClick={() => copy('rt', r.recommended_title)}>{copiedKey === 'rt' ? '✓' : 'копировать'}</button></div><div style={css.cardBody}><div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{r.recommended_title}</div></div></div>{r.recommended_description && <div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Рекомендуемое описание</div><button style={css.btnCopy(copiedKey === 'rd')} onClick={() => copy('rd', r.recommended_description)}>{copiedKey === 'rd' ? '✓' : 'копировать'}</button></div><div style={css.cardBody}><div style={{ fontSize: 13, lineHeight: 1.75 }}>{r.recommended_description}</div></div></div>}</>; })()}

            {status === 'result' && R?.type === 2 && (() => { const r = R.data, a = r.audit || {}; return <><div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Общая оценка</div></div><div style={{ ...css.cardBody, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', textAlign: 'center' }}><div><div style={{ fontSize: 11, color: '#9490b8', marginBottom: 4 }}>Сейчас</div><div style={{ fontSize: 40, fontWeight: 700, color: '#ff4422' }}>{r.total_before || 0}</div></div><div style={{ fontSize: 20, color: '#9490b8' }}>→</div><div><div style={{ fontSize: 11, color: '#9490b8', marginBottom: 4 }}>После правок</div><div style={{ fontSize: 40, fontWeight: 700, color: '#3ddc84' }}>{r.total_after || 0}</div></div></div><div style={{ padding: '0 16px 14px', fontSize: 13, color: '#9490b8' }}>{r.ranking_forecast}</div></div>{a.title && <div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Заголовок · {a.title.score || 0}/100</div><button style={css.btnCopy(copiedKey === 'at')} onClick={() => copy('at', a.title.fixed_version)}>{copiedKey === 'at' ? '✓' : 'копировать исправленный'}</button></div><div style={css.cardBody}>{(a.title.issues || []).map((iss, i) => <div key={i} style={{ fontSize: 12, color: '#ffaa00', marginBottom: 4 }}>⚠ {iss}</div>)}<div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: '#fff' }}>{a.title.fixed_version}</div></div></div>}{a.description && <div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Описание · {a.description.score || 0}/100</div><button style={css.btnCopy(copiedKey === 'ad')} onClick={() => copy('ad', a.description.fixed_version)}>{copiedKey === 'ad' ? '✓' : 'копировать'}</button></div><div style={css.cardBody}>{(a.description.issues || []).map((iss, i) => <div key={i} style={{ fontSize: 12, color: '#ffaa00', marginBottom: 4 }}>⚠ {iss}</div>)}<div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.75 }}>{a.description.fixed_version}</div></div></div>}{a.keywords && <div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Ключи · {a.keywords.score || 0}/100</div><button style={css.btnCopy(copiedKey === 'ak')} onClick={() => copy('ak', (a.keywords.optimized_list || []).join(', '))}>{copiedKey === 'ak' ? '✓' : 'копировать'}</button></div><div style={css.cardBody}>{(a.keywords.missing_high_freq || []).length > 0 && <div style={{ fontSize: 12, color: '#ffaa00', marginBottom: 8 }}>⚠ Отсутствуют: {a.keywords.missing_high_freq.join(', ')}</div>}{(a.keywords.optimized_list || []).map((k, i) => <span key={i} style={css.chip}>{k}</span>)}</div></div>}<div style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>Приоритетные действия</div></div><div style={css.cardBody}>{(r.priority_actions || []).map((p, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #2a2840' }}><div style={{ flex: 1, fontSize: 13 }}>{p.action}</div><div style={{ fontSize: 11, color: '#9490b8' }}>{p.effort}</div><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", background: p.impact === 'высокий' ? 'rgba(61,220,132,.1)' : 'rgba(255,170,0,.1)', color: p.impact === 'высокий' ? '#3ddc84' : '#ffaa00', border: `1px solid ${p.impact === 'высокий' ? 'rgba(61,220,132,.25)' : 'rgba(255,170,0,.25)'}` }}>{p.impact}</span></div>)}</div></div></>; })()}

            {status === 'result' && R?.type === 3 && <><div style={{ fontSize: 11, color: '#9490b8', fontFamily: "'JetBrains Mono', monospace" }}>{mn} · Сгенерировано: {R.data.length} карточек</div>{R.data.map((r, i) => <div key={i} style={css.card}><div style={css.cardHead}><div style={css.cardLabel}>{r.article || 'Товар ' + (i + 1)} <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", background: 'rgba(61,220,132,.1)', color: '#3ddc84', border: '1px solid rgba(61,220,132,.2)', marginLeft: 8 }}>{r.seo_score || 0}/100</span></div><button style={css.btnCopy(copiedKey === 'b' + i)} onClick={() => copy('b' + i, `ЗАГОЛОВОК:\n${r.title}\n\nОПИСАНИЕ:\n${r.description}\n\nКЛЮЧИ:\n${(r.keywords || []).join(', ')}`)}>{copiedKey === 'b' + i ? '✓ скопировано' : 'копировать'}</button></div><div style={css.cardBody}><div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{r.title}</div><div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>{r.description}</div><div>{(r.keywords || []).map((k, j) => <span key={j} style={css.chip}>{k}</span>)}</div></div></div>)}</>}
          </div>
        </main>
      </div>
    </>
  );
}
