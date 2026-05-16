const CACHE = 'genba-box-v17';
const REPORT_SCRIPT = '<script src="report.js?v=17"></script>';
const ASSETS = ['./', './index.html', './styles.css?v=16', './app.js?v=16', './report.js?v=17', './manifest.json?v=16', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function shouldInjectReportScript(request) {
  if (request.mode !== 'navigate') return false;
  const url = new URL(request.url);
  return url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
}

function injectReportScript(html) {
  if (html.includes('report.js')) return html;
  return html.replace('</body>', `${REPORT_SCRIPT}\n</body>`);
}

async function htmlResponseWithReports(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    const html = injectReportScript(await response.clone().text());
    const injected = new Response(html, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
    cache.put(request, injected.clone());
    return injected;
  } catch (error) {
    const cached = await cache.match(request) || await cache.match('./index.html');
    if (!cached) throw error;
    const html = injectReportScript(await cached.clone().text());
    return new Response(html, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (shouldInjectReportScript(event.request)) {
    event.respondWith(htmlResponseWithReports(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
