// 편집 모드 API
// POST /api/cms/login   {password}           → 로그인 쿠키 발급 (7일)
// POST /api/cms/logout                        → 로그아웃
// POST /api/cms/save    {file, data}         → content/{file}.json 을 깃허브에 저장
// POST /api/cms/upload  {type, data(base64)} → assets/uploads/ 에 사진 저장 후 경로 반환
const FILES = { site: '기본정보', home: '홈', reviews: '후기' };
const REPO = 'tambleofficial/ublack';
const WEEK = 7 * 24 * 3600 * 1000;

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

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

async function gh(env, path, init = {}) {
  return fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...init,
    headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'tamble-cms', 'content-type': 'application/json', ...(init.headers || {}) },
  });
}

async function putFile(env, branch, filePath, b64, message) {
  const cur = await gh(env, `contents/${filePath}?ref=${branch}`);
  const sha = cur.ok ? (await cur.json()).sha : undefined;
  const r = await gh(env, `contents/${filePath}`, { method: 'PUT', body: JSON.stringify({ message, content: b64, branch, sha }) });
  if (!r.ok) throw new Error('GitHub ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return (await r.json()).commit.sha;
}

export async function onRequestPost({ request, env, params }) {
  const action = (params.path || [])[0];
  let body = {};
  try { body = await request.json(); } catch (e) { /* 빈 요청 */ }

  if (action === 'login') {
    if (!env.CMS_PASSWORD || body.password !== env.CMS_PASSWORD) {
      await new Promise((r) => setTimeout(r, 800));
      return json({ ok: false }, 401);
    }
    const exp = Date.now() + WEEK;
    const sig = await hmac(env.CMS_PASSWORD, 'cms:' + exp);
    return json({ ok: true }, 200, { 'set-cookie': `ub_cms=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${WEEK / 1000}` });
  }
  if (action === 'logout') {
    return json({ ok: true }, 200, { 'set-cookie': 'ub_cms=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
  }

  if (!(await authed(request, env))) return json({ ok: false, error: '로그인이 필요해요' }, 401);
  const branch = branchOf(request, env);

  try {
    if (action === 'save') {
      if (!FILES[body.file] || typeof body.data !== 'object' || !body.data) return json({ ok: false, error: '잘못된 요청' }, 400);
      const text = JSON.stringify(body.data, null, 2) + '\n';
      if (text.length > 300000 || text.includes('data:image')) return json({ ok: false, error: '저장할 수 없는 내용이 있어요' }, 400);
      const commit = await putFile(env, branch, `content/${body.file}.json`, utf8ToB64(text), `편집 모드에서 ${FILES[body.file]} 수정`);
      return json({ ok: true, commit });
    }
    if (action === 'upload') {
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[body.type];
      if (!ext || typeof body.data !== 'string') return json({ ok: false, error: '사진 형식이 맞지 않아요' }, 400);
      if (body.data.length > 2_800_000) return json({ ok: false, error: '사진이 너무 커요' }, 400);
      const d = new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const name = `${d}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      await putFile(env, branch, `assets/uploads/${name}`, body.data, `편집 모드에서 사진 업로드 (${name})`);
      return json({ ok: true, path: `/assets/uploads/${name}` });
    }
  } catch (e) {
    return json({ ok: false, error: '저장 중 오류가 났어요. 잠시 후 다시 시도해주세요.', detail: String(e.message || e).slice(0, 200) }, 502);
  }
  return json({ ok: false, error: 'not found' }, 404);
}
