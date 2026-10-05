var CACHE = "yiri-shouzhang-v7";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("message", function(e){
  if(e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if(url.pathname.indexOf("/api/") === 0) return; // 云同步接口不缓存

  /* 页面/清单一律 network-first：保证新版本即时生效，离线时回退缓存 */
  var isPage = e.request.mode === "navigate" ||
    url.pathname === "/" || url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/manifest.json");
  if(isPage){
    e.respondWith(
      fetch(e.request).then(function(resp){
        if(resp && resp.status === 200){
          var copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return resp;
      }).catch(function(){
        return caches.match(e.request, {ignoreSearch: true}).then(function(hit){
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  /* 静态资源（图标等）：cache-first */
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(resp){
        if(resp && resp.status === 200 && url.origin === location.origin){
          var copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return resp;
      }).catch(function(){
        return caches.match("./index.html");
      });
    })
  );
});
