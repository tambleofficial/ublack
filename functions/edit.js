// 편집 모드 페이지 (/edit)
// - 로그인 전: 비밀번호 입력 화면
// - 로그인 후: 실제 홈페이지 화면 + 편집 도구(/cms-editor.js)
// 콘텐츠는 배포된 파일에서 바로 읽어요 (깃허브를 거치지 않아 빠름). 저장 후에는 편집 도구가 배포 완료를 기다렸다가 새로고침해요.
// 편집할 페이지: /edit?page=brand 처럼 지정 (없으면 홈)
const PAGES = { home: ['/', ['home', 'reviews']], brand: ['/brand', ['brand']], program: ['/program', ['program']], cases: ['/cases', ['cases']], academy: ['/academy', ['academy']], reviews: ['/reviews', ['reviewsPage', 'reviews']], contact: ['/contact', ['contact']] };
const REPO = 'tambleofficial/ublack';

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function authed(request, env) {
  const c = request.headers.get('cookie') || '';
  const m = c.match(/(?:^|;\s*)ub_cms=(\d+)\.([0-9a-f]{64})/);
  if (!m || !env.CMS_PASSWORD) return false;
  if (+m[1] < Date.now()) return false;
  return (await hmac(env.CMS_PASSWORD, 'cms:' + m[1])) === m[2];
}

function branchOf(request, env) {
  if (env.GITHUB_BRANCH) return env.GITHUB_BRANCH;
  return new URL(request.url).hostname.startsWith('cms.') ? 'cms' : 'main';
}

function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const LOGIN_HTML = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>홈페이지 편집 로그인</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f4f2;font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;color:#111}
form{background:#fff;padding:40px 36px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.08);width:min(360px,90vw)}
h1{font-size:20px;margin:0 0 6px}p{margin:0 0 24px;color:#666;font-size:14px;line-height:1.6}
input{width:100%;box-sizing:border-box;padding:14px 16px;border:1px solid #ddd;border-radius:10px;font-size:16px}
button{width:100%;margin-top:12px;padding:14px;border:0;border-radius:10px;background:#111;color:#fff;font-size:16px;font-weight:600;cursor:pointer}
.err{color:#d33;font-size:13px;margin-top:10px;min-height:18px}</style></head>
<body><form id="f"><h1>홈페이지 편집</h1><p>안내받은 편집 비밀번호를 입력해주세요.</p>
<input id="pw" type="password" placeholder="편집 비밀번호" autocomplete="current-password" autofocus>
<button>편집 시작하기</button><div class="err" id="err"></div></form>
<script>document.getElementById('f').onsubmit=async e=>{e.preventDefault();const r=await fetch('/api/cms/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})});if(r.ok)location.reload();else document.getElementById('err').textContent='비밀번호가 맞지 않아요.';};</script>
</body></html>`;

export async function onRequestGet({ request, env }) {
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
  if (!(await authed(request, env))) return new Response(LOGIN_HTML, { headers });

  const branch = branchOf(request, env);
  const pageKey = PAGES[new URL(request.url).searchParams.get('page')] ? new URL(request.url).searchParams.get('page') : 'home';
  const [pagePath, pageFiles] = PAGES[pageKey];
  const data = {};
  await Promise.all(['site', ...pageFiles].map(async (name) => {
    const r = await env.ASSETS.fetch(new URL('/content/' + name + '.json', request.url));
    if (r.ok) data[name] = await r.json();
  }));

  const page = await env.ASSETS.fetch(new URL(pagePath, request.url));
  let html = await page.text();
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  html = html.replace(/<head>/i, (m) => m + '<meta name="robots" content="noindex"><script>window.__CMS=' + json + ';window.__CMS_EDIT={branch:' + JSON.stringify(branch) + ',page:' + JSON.stringify(pageKey) + '};</script>');
  html = html.replace(/<\/body>/i, '<script src="/cms-editor.js?v=3"></script></body>');
  return new Response(html, { headers });
}
