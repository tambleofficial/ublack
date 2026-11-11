// Pages CMS 콘텐츠(content/*.json)를 페이지에 끼워 넣는 클라우드플레어 미들웨어.
// 방문자 브라우저가 따로 JSON을 받아오지 않도록, HTML을 보내기 전에 서버(엣지)에서 한 번에 넣어줍니다.
const FILES = ['site', 'home', 'reviews'];

export async function onRequest(ctx) {
  const res = await ctx.next();
  const url = new URL(ctx.request.url);
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html') || url.pathname.endsWith('.dc.html')) return res;
  const data = {};
  await Promise.all(FILES.map(async (name) => {
    try {
      const r = await ctx.env.ASSETS.fetch(new URL('/content/' + name + '.json', url));
      if (r.ok) data[name] = await r.json();
    } catch (e) { /* 파일이 없으면 건너뜀 */ }
  }));
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return new HTMLRewriter()
    .on('head', { element(el) { el.prepend('<script>window.__CMS=' + json + ';</script>', { html: true }); } })
    .transform(res);
}
