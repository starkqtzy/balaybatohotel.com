/* PWA service-worker implementation. The root sw.js loads this file so the
   worker can control admin.html and admin_login.html. */
(function () {
  'use strict';

  var CACHE_NAME = 'balay-bato-admin-v4';
  var STATIC_ASSETS = [
    './admin.html',
    './admin_login.html',
    './frontdesk.html',
    './frontdesk_login.html',
    './sources/app/frontdesk.manifest',
    './sources/app/webmanifest.manifest',
    './sources/app/app.js',
    './sources/admin/admin.css',
    './sources/admin/admin.js',
    './sources/front_desk/frontdesk.css',
    './sources/front_desk/frontdesk.js',
    './sources/loginForm/admin_login.css',
    './sources/loginForm/admin_login.js',
    './sources/shared/database.js',
    './sources/shared/messages.js',
    './images/app_logo.jpg'
  ];

  self.addEventListener('install', function (event) {
    event.waitUntil(
      caches.open(CACHE_NAME).then(function (cache) {
        return Promise.all(STATIC_ASSETS.map(function (asset) {
          return cache.add(asset).catch(function (error) {
            console.warn('[Balay Bato SW] Could not cache:', asset, error);
          });
        }));
      }).then(function () {
        return self.skipWaiting();
      })
    );
  });

  self.addEventListener('activate', function (event) {
    event.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        }));
      }).then(function () {
        return self.clients.claim();
      })
    );
  });

  self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET') return;

    var requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    // Do not place a potentially large Windows installer in the application
    // cache. It should be streamed directly to the browser instead.
    if (requestUrl.pathname.indexOf('/downloads/') !== -1) {
      event.respondWith(fetch(event.request));
      return;
    }

    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).then(function (response) {
          if (response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        }).catch(function () {
          return caches.match(event.request).then(function (cached) {
            return cached || caches.match('./admin_login.html');
          });
        })
      );
      return;
    }

    event.respondWith(
      caches.match(event.request).then(function (cached) {
        return cached || fetch(event.request).then(function (response) {
          if (response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        });
      })
    );
  });
}());
