// Pages CMS 콘텐츠(content/*.json)를 페이지에 넣어주는 클라우드플레어 미들웨어.
// 1) window.__CMS 로 데이터를 넣어주고
// 2) 화면 틀에 있는 {{ }} 자리표시(문구·사진 주소)를 서버에서 실제 값으로 미리 채워서 보냅니다.
//    → 브라우저가 사진을 처음부터 바로 받기 시작해서 등장 효과가 원본처럼 자연스럽고, 검색엔진도 실제 문구를 읽어요.
const PAGE_FILES = { '': ['home', 'reviews'], index: ['home', 'reviews'], brand: ['brand'], program: ['program'], cases: ['cases'], academy: ['academy'], reviews: ['reviewsPage', 'reviews'], contact: ['contact'] };
const PAGE_KEY = { brand: 'brand', program: 'program', cases: 'cases', academy: 'academy', reviews: 'reviewsPage', contact: 'contact' };
const HOME_ROOTS = { hero: 'hero', director: 'director', statement: 'statement', casesSec: 'cases', whySec: 'why', progSec: 'programs', recSec: 'records', procSec: 'process', studySec: 'studies', revSec: 'reviews', academy: 'academy', journalSec: 'journal', spaceSec: 'space', faqSec: 'faq' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function fill(html, key, data) {
  const cut = html.indexOf('<script type="text/x-dc"');
  if (cut < 0) return html;
  let tpl = html.slice(0, cut);
  const site = data.site || {};
  const CS = Object.assign({}, site, { tel: 'tel:' + String(site.phone || '').replace(/[^0-9]/g, '') });
  const CT = ((data[PAGE_KEY[key]] || {}).t) || {};
  const home = data.home || {};
  const computed = (key === '' || key === 'index') ? {
    blogUrl: site.blog_url || '#',
    spaceLine: [site.address, site.booking_note].filter(Boolean).join(' · '),
    mapTitle: '유블랙 위치 — ' + (site.address || ''),
    mapSrc: 'https://maps.google.com/maps?q=' + encodeURIComponent(site.address || '') + '&hl=ko&z=17&output=embed',
  } : {};
  tpl = tpl.replace(/\{\{ ([A-Za-z_]+)(?:\.([A-Za-z0-9_]+))? \}\}/g, (m, root, field) => {
    let v;
    if (!field) v = computed[root];
    else if (root === 'CT') v = CT[field];
    else if (root === 'CS') v = CS[field];
    else if ((key === '' || key === 'index') && HOME_ROOTS[root]) v = (home[HOME_ROOTS[root]] || {})[field];
    return (typeof v === 'string' || typeof v === 'number') ? esc(v) : m;
  });
  return tpl + html.slice(cut);
}

export async function onRequest(ctx) {
  const res = await ctx.next();
  const url = new URL(ctx.request.url);
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html') || url.pathname.endsWith('.dc.html') || url.pathname.startsWith('/edit') || url.pathname.startsWith('/api/')) return res;
  const key = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
  const files = ['site', ...(PAGE_FILES[key] || [])];
  const data = {};
  await Promise.all(files.map(async (name) => {
    try {
      const r = await ctx.env.ASSETS.fetch(new URL('/content/' + name + '.json', url));
      if (r.ok) data[name] = await r.json();
    } catch (e) { /* 파일이 없으면 건너뜀 */ }
  }));
  let html = await res.text();
  html = fill(html, key, data);
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  html = html.replace(/<head>/i, (m) => m + '<script>window.__CMS=' + json + ';</script>');
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('etag');
  return new Response(html, { status: res.status, headers });
}
