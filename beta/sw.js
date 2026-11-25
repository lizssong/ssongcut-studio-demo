/* 쏭컷 AI 스튜디오 service worker */
const VERSION = 'ssongcut-v2';
const SHELL = ['./', './index.html', './studio.html', './cut.html', './studio.css', './studio.js', './cut.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const SHARE_CACHE = 'ssongcut-share';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== SHARE_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function handleShare(req) {
  try {
    const form = await req.formData();
    const f = form.getAll('video').find((v) => v && typeof v === 'object' && v.size > 0);
    if (f) {
      const c = await caches.open(SHARE_CACHE);
      await c.put('./__shared-video', new Response(f, { headers: {
        'content-type': f.type || 'video/mp4',
        'x-file-name': encodeURIComponent(f.name || 'shared-video.mp4')
      } }));
      return Response.redirect('./?source=share', 303);
    }
  } catch (err) { /* fall through */ }
  return Response.redirect('./?source=share-empty', 303);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // CDN, Firebase, Gemini: 그대로 통과
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) { e.respondWith(handleShare(req)); return; }
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {                               // 항상 최신 페이지, 오프라인일 때만 저장본
    const sub = /\/(studio|cut)\.html$/.exec(url.pathname);           // 편집 도구 페이지는 자기 이름으로 저장
    const key = sub ? './' + sub[1] + '.html' : './';
    e.respondWith(fetch(req).then((res) => {
      if (res.ok && !url.search) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(key, copy)); }
      return res;
    }).catch(() => caches.match(key, { ignoreSearch: true }).then((hit) => hit || caches.match('./', { ignoreSearch: true }))));
    return;
  }
  if (/\.(js|css)$/.test(url.pathname)) {                        // 편집 도구 코드는 항상 최신, 오프라인일 때만 저장본
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(url.pathname.split('/').pop(), copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  if (SHELL.some((p) => url.pathname.endsWith(p.replace('./', '/')) && p !== './')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
