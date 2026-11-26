// ===== 검색 노출(SEO) 처리 — 탬블 2026-11 =====
// 1) www 주소는 대표 주소로 301  2) 네이버·구글 소유확인 파일은 .html 그대로 200
// 3) 검색로봇에게는 방문자 화면을 미리 그려 둔 seo/*.html 을 보냄(내용 동일)  4) 페이지별 canonical·제목·설명 정리
const SEO_APEX = 'ublack.kr';
const SEO_BOT = /Yeti|NaverBot|Googlebot|Google-InspectionTool|AdsBot-Google|Storebot-Google|bingbot|BingPreview|msnbot|Daumoa|Daum|kakaotalk-scrap|Applebot|DuckDuckBot|YandexBot|Baiduspider|Slurp|facebookexternalhit|Twitterbot|LinkedInBot|Pinterest/i;
const SEO_PAGES = {"":{"file":"home","path":"/"},"brand":{"file":"brand","path":"/brand"},"program":{"file":"program","path":"/program"},"cases":{"file":"cases","path":"/cases"},"academy":{"file":"academy","path":"/academy"},"reviews":{"file":"reviews","path":"/reviews"},"contact":{"file":"contact","path":"/contact"}};
// 페이지별 제목·설명 (비어 있으면 원래 값 유지)
const SEO_META = {
 "": {
  "title": "울산 두피문신·SMP 헤어라인 | 유블랙 스칼프 디자인",
  "desc": "울산 북구 유블랙. 두상과 기존 모발의 흐름을 보고 필요한 범위만큼 디자인하는 SMP 두피문신 스튜디오입니다."
 },
 "brand": {
  "title": "울산 두피문신 스튜디오 유블랙, 대표원장 조영진",
  "desc": "프랜차이즈에 속하지 않은 울산 두피문신 스튜디오 유블랙. 상담부터 사후관리까지 조영진 대표원장이 직접 진행합니다."
 },
 "program": {
  "title": "울산 SMP 두피문신 | 헤어라인·정수리·흉터 커버",
  "desc": "울산 유블랙의 SMP 두피문신 프로그램. 남성·여성 헤어라인, M자, 정수리, 가르마, 흉터 커버를 범위별로 안내합니다."
 },
 "cases": {
  "title": "울산 헤어라인문신·정수리 실제 사례 | 유블랙",
  "desc": "울산 유블랙의 헤어라인문신, 정수리, M자, 흉터 커버 실제 사례. 같은 고객을 같은 각도에서 촬영한 사진입니다."
 },
 "academy": {
  "title": "두피문신 학원·SMP 교육 | 울산 유블랙 아카데미",
  "desc": "대한두피문신전문가협회 인증기관 유블랙 아카데미의 두피문신 교육 분야와 세미나, 학생 작업을 소개합니다."
 },
 "reviews": {
  "title": "울산 두피문신 고객 후기 | 유블랙",
  "desc": "울산 유블랙에서 SMP 두피문신을 받은 고객 후기. 헤어라인, 정수리, 흉터 커버 작업 후기를 확인하세요."
 },
 "contact": {
  "title": "유블랙 상담·오시는 길 | 울산 북구 신천로",
  "desc": "유블랙 상담·예약 채널과 오시는 길. 울산광역시 북구 신천로 55-22, 404호. 예약제 상담, 010-3924-0143."
 }
};
const SEO_SCHEMA = "{\"@context\":\"https://schema.org\",\"@type\":\"BeautySalon\",\"name\":\"유블랙 U.BLACK\",\"url\":\"https://ublack.kr/\",\"telephone\":\"+82-10-3924-0143\",\"image\":\"https://ublack.kr/assets/logo-black.png\",\"address\":{\"@type\":\"PostalAddress\",\"streetAddress\":\"신천로 55-22, 404호 (신천동, 신천수테라스타운)\",\"addressLocality\":\"북구\",\"addressRegion\":\"울산광역시\",\"addressCountry\":\"KR\"},\"sameAs\":[\"https://www.instagram.com/u.black_scalp\",\"https://youtube.com/@u.black_sclap\",\"https://m.blog.naver.com/nnn0100\",\"https://naver.me/xoHQXTFw\"]}";
const seoEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function seoKey(p) { return p.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '').replace(/^index$/, ''); }
function seoSetMeta(html, attr, name, content) {
  const re = new RegExp('<meta[^>]+' + attr + '="' + name + '"[^>]*>', 'i');
  const tag = '<meta ' + attr + '="' + name + '" content="' + seoEsc(content) + '">';
  return re.test(html) ? html.replace(re, tag) : html.replace(/<\/head>/i, tag + '\n</head>');
}
function seoFix(html, key) {
  const pg = SEO_PAGES[key];
  if (!pg) return html;
  const canon = 'https://' + SEO_APEX + pg.path;
  html = /<link[^>]+rel="canonical"[^>]*>/i.test(html)
    ? html.replace(/<link[^>]+rel="canonical"[^>]*>/i, '<link rel="canonical" href="' + canon + '">')
    : html.replace(/<\/head>/i, '<link rel="canonical" href="' + canon + '">\n</head>');
  html = seoSetMeta(html, 'property', 'og:url', canon);
  const m = SEO_META[key];
  if (m && m.title) {
    html = /<title>[\s\S]*?<\/title>/i.test(html) ? html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + seoEsc(m.title) + '</title>') : html.replace(/<\/head>/i, '<title>' + seoEsc(m.title) + '</title>\n</head>');
    html = seoSetMeta(html, 'property', 'og:title', m.title);
  }
  if (m && m.desc) {
    html = seoSetMeta(html, 'name', 'description', m.desc);
    html = seoSetMeta(html, 'property', 'og:description', m.desc);
  }
  if (!/application\/ld\+json/i.test(html)) html = html.replace(/<\/head>/i, '<script type="application/ld+json">' + SEO_SCHEMA + '</script>\n</head>');
  return html;
}

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  const p = url.pathname;
  if (url.hostname === 'www.' + SEO_APEX) return Response.redirect('https://' + SEO_APEX + p + url.search, 301);
  if (/^\/(naver|google)[0-9a-f]+\.html$/.test(p)) {
    const r = await ctx.env.ASSETS.fetch(new URL(p.replace(/\.html$/, ''), url));
    if (r.ok) return new Response(await r.text(), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } });
  }
  if (p === '/seo' || p.startsWith('/seo/')) return new Response('Not found', { status: 404 });
  const key = seoKey(p);
  const pg = SEO_PAGES[key];
  const isRead = ctx.request.method === 'GET' || ctx.request.method === 'HEAD';
  if (pg && isRead && SEO_BOT.test(ctx.request.headers.get('user-agent') || '')) {
    const r = await ctx.env.ASSETS.fetch(new URL('/seo/' + pg.file, url));
    if (r.ok) return new Response(seoFix(await r.text(), key), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'vary': 'User-Agent', 'cache-control': 'public, max-age=0, must-revalidate', 'x-sj-render': 'prerender' } });
  }
  const res = await siteOnRequest(ctx);
  if (!pg) return res;
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html') || res.status !== 200) return res;
  const html = seoFix(await res.text(), key);
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('etag');
  headers.set('vary', 'User-Agent');
  return new Response(html, { status: 200, headers });
}
// ===== 아래는 원래 미들웨어 (편집 모드 내용 반영) =====
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

async function siteOnRequest(ctx) {
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
