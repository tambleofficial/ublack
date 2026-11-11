// 탬블 홈페이지 편집 모드 (화면 위에서 바로 고치기)
// 글자: data-cms="파일.경로"  /  사진: data-cms-img="파일.경로"
(function () {
  if (!window.__CMS_EDIT || window.__cmsEditor) return;
  window.__cmsEditor = 1;
  const data = window.__CMS || {};
  const dirty = new Set();      // 바뀐 파일 (home, site, reviews)
  const pendingImg = new Map(); // 경로 → 새 사진(dataURL), 저장할 때 업로드
  let saving = false;

  // ---------- 데이터 읽기/쓰기 ----------
  const getAt = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), data);
  function setAt(p, v) {
    const ks = p.split('.');
    let o = data;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) return; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
    dirty.add(ks[0]);
    updateBar();
  }

  // ---------- 스타일 ----------
  const st = document.createElement('style');
  st.textContent = `
  [data-cms]{outline:1.5px dashed rgba(240,90,36,.6)!important;outline-offset:4px;cursor:text!important;border-radius:2px;min-width:20px;min-height:1em}
  [data-cms]:hover{outline:2px solid #F05A24!important;background:rgba(240,90,36,.07)}
  [data-cms]:focus{outline:2px solid #F05A24!important;background:rgba(240,90,36,.1)}
  [data-cms].cms-changed{outline-color:#1a8f4e!important}
  #cms-imgbadge{position:fixed;z-index:2147483646;pointer-events:none;display:none;align-items:center;justify-content:center;border:3px solid #F05A24;background:rgba(240,90,36,.12);border-radius:4px;box-sizing:border-box}
  #cms-imgbadge span{background:#F05A24;color:#fff;font:600 14px/1 Pretendard,-apple-system,sans-serif;padding:10px 14px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25)}
  #cms-bar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;
    background:#111;color:#fff;padding:10px 12px 10px 18px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:500 14px/1.3 Pretendard,-apple-system,'Apple SD Gothic Neo',sans-serif;max-width:calc(100vw - 24px)}
  #cms-bar b{color:#F05A24}
  #cms-bar button{all:unset;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:600;font-size:14px}
  #cms-bar .s{background:#F05A24;color:#fff}#cms-bar .s[disabled]{opacity:.45;cursor:default}
  #cms-bar .g{background:#2a2a2a;color:#ddd}
  #cms-help{color:#bbb;font-size:13px}
  @media(max-width:700px){#cms-help{display:none}}`;
  document.head.appendChild(st);

  // ---------- 하단 도구 막대 ----------
  const bar = document.createElement('div');
  bar.id = 'cms-bar';
  bar.innerHTML = '<span><b>편집 모드</b> <span id="cms-help">· 글자는 눌러서 고치고, 사진은 눌러서 바꾸세요</span></span><span id="cms-count"></span>' +
    '<button class="g" id="cms-undo">되돌리기</button><button class="s" id="cms-save" disabled>저장하기</button><button class="g" id="cms-exit">나가기</button>';
  document.body.appendChild(bar);
  const $ = (id) => document.getElementById(id);
  function updateBar(msg) {
    const n = dirty.size;
    $('cms-count').textContent = msg || (n ? `· 바뀐 곳 있음` : '');
    $('cms-save').disabled = saving || !n;
  }
  $('cms-undo').onclick = () => { if (!dirty.size || confirm('저장하지 않은 수정 내용을 모두 되돌릴까요?')) { dirty.clear(); location.reload(); } };
  $('cms-exit').onclick = () => { if (!dirty.size || confirm('저장하지 않은 수정 내용이 있어요. 그래도 나갈까요?')) { dirty.clear(); location.href = '/'; } };
  window.addEventListener('beforeunload', (e) => { if (dirty.size && !saving) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- 글자 편집 (누른 글자만 그때 편집 가능하게 → 페이지가 가벼움) ----------
  function prep(el) {
    if (el.__cms) return;
    el.__cms = 1;
    el.setAttribute('contenteditable', 'plaintext-only');
    el.setAttribute('spellcheck', 'false');
    el.addEventListener('focus', () => { el.__orig = el.innerText; });
    el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') el.blur(); });
    el.addEventListener('blur', () => {
      const p = el.getAttribute('data-cms');
      if (!p) return;
      const v = el.innerText.replace(/\n+$/, '');
      if (v !== (getAt(p) ?? '')) { setAt(p, v); el.classList.add('cms-changed'); }
    });
  }
  document.addEventListener('mousedown', (e) => {
    const el = e.target.closest && e.target.closest('[data-cms]');
    if (el && !el.__cms) prep(el);
  }, true);
  document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('[data-cms]'); if (el && !el.__cms) prep(el); });

  // 편집 중에는 링크 이동 막기 (수정 내용이 사라지지 않게)
  document.addEventListener('click', (e) => {
    if (e.target.closest('#cms-bar')) return;
    const a = e.target.closest('a[href]');
    if (a) e.preventDefault();
  }, true);

  // ---------- 사진 편집 ----------
  const badge = document.createElement('div');
  badge.id = 'cms-imgbadge';
  badge.innerHTML = '<span>📷 사진 바꾸기</span>';
  document.body.appendChild(badge);
  // 마우스 아래 사진 찾기: 무거운 화면 전체 검사 대신, 마우스가 올라간 요소에서 바로 찾음
  function imgFrom(target) {
    if (!target || !target.closest) return null;
    if (target.closest('#cms-bar') || target.closest('[data-cms]')) return null;
    if (target.tagName === 'IMG' && target.hasAttribute('data-cms-img')) return target;
    const box = target.closest('[data-reveal-img]') || target.parentElement;
    if (!box) return null;
    const imgs = box.querySelectorAll('img[data-cms-img]');
    for (let i = imgs.length - 1; i >= 0; i--) { const p = imgs[i].parentElement; if (!p || p.style.opacity !== '0') return imgs[i]; }
    return null;
  }
  let hoverImg = null, mmTarget = null, mmQueued = false;
  function showBadge() {
    mmQueued = false;
    const img = imgFrom(mmTarget);
    if (img === hoverImg) return;
    hoverImg = img;
    if (!img) { badge.style.display = 'none'; return; }
    const b = (img.parentElement || img).getBoundingClientRect();
    Object.assign(badge.style, { display: 'flex', left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
  }
  document.addEventListener('mouseover', (e) => { mmTarget = e.target; if (!mmQueued) { mmQueued = true; requestAnimationFrame(showBadge); } }, { passive: true });
  window.addEventListener('scroll', () => { if (hoverImg) { hoverImg = null; badge.style.display = 'none'; } }, { passive: true });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#cms-bar') || e.target.closest('[data-cms]')) return;
    const img = imgFrom(e.target);
    if (!img) return;
    e.preventDefault(); e.stopPropagation();
    pickImage(img);
  }, true);

  function resize(file) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const M = 1600, s = Math.min(1, M / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      im.onerror = () => rej(new Error('사진을 읽을 수 없어요'));
      im.src = URL.createObjectURL(file);
    });
  }
  function pickImage(img) {
    const p = img.getAttribute('data-cms-img');
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        const url = await resize(f);
        pendingImg.set(p, url);
        setAt(p, url);
        document.querySelectorAll('img[data-cms-img="' + p + '"]').forEach((el) => { el.src = url; });
      } catch (err) { alert(err.message); }
    };
    inp.click();
  }

  // ---------- 저장 ----------
  async function api(action, body) {
    const r = await fetch('/api/cms/' + action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { alert('로그인 시간이 지났어요. 다시 로그인해주세요.'); location.reload(); throw new Error('auth'); }
    if (!r.ok || !j.ok) throw new Error(j.error || '저장 실패');
    return j;
  }
  $('cms-save').onclick = async () => {
    if (saving || !dirty.size) return;
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    saving = true; updateBar('· 저장 중…');
    try {
      const out = JSON.parse(JSON.stringify(data, (k, v) => v));
      let i = 0;
      for (const [p, url] of pendingImg) {
        updateBar(`· 사진 올리는 중 (${++i}/${pendingImg.size})`);
        const r = await api('upload', { type: 'image/jpeg', data: url.split(',')[1] });
        const ks = p.split('.'); let o = out; for (let k = 0; k < ks.length - 1; k++) o = o[ks[k]]; o[ks[ks.length - 1]] = r.path;
      }
      const files = [...dirty];
      for (const f of files) { updateBar('· 저장 중…'); await api('save', { file: f, data: out[f] }); }
      dirty.clear(); pendingImg.clear();
      updateBar('· 저장 완료! 홈페이지에 반영 중이에요 (보통 20초)');
      await waitDeploy(files, out);
      saving = false;
      updateBar('· 반영 완료');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      saving = false;
      if (err.message !== 'auth') { alert(err.message); updateBar(); }
    }
  };
  async function waitDeploy(files, out) {
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const ok = await Promise.all(files.map(async (f) => {
          const live = await (await fetch('/content/' + f + '.json?t=' + Date.now(), { cache: 'no-store' })).json();
          return JSON.stringify(live) === JSON.stringify(out[f]);
        }));
        if (ok.every(Boolean)) return;
      } catch (e) { /* 배포 중 */ }
    }
  }
})();
