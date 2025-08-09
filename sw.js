// استيراد ملف الإعدادات ليكون متاحاً في نطاق عامل الخدمة
importScripts('/js/config.js');

// إنشاء اسم ديناميكي للكاش بناءً على اسم التطبيق
const sanitizedAppName = THEME_CONFIG.appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
const CACHE_NAME = `${sanitizedAppName}-cache-v1`;

const urlsToCache = [
  '/',
  '/index.html',
  '/services.html',
  '/login.html',
  '/admin.html',
  '/css/index-style.css',
  '/css/services-style.css?v=1.4', // تأكد من مطابقة الإصدارات
  '/css/login-style.css',
  '/css/admin-style.css?v=1.6', // تأكد من مطابقة الإصدارات
  '/js/main.js?v=11.0', // تأكد من مطابقة الإصدارات
  '/js/admin.js?v=2.9', // تأكد من مطابقة الإصدارات
  '/js/utils.js',
  '/js/config.js',
  '/js/themer.js',
  '/logo.png',
  '/images/logo-main.png',
  '/images/scissors.png',
  '/manifest.json'
  // يمكنك إضافة روابط الأيقونات هنا
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('push', event => {
  const data = event.data.json();
  console.log('Push Received.', data);

  // استخدام اسم التطبيق من ملف الإعدادات كعنوان افتراضي
  const title = data.title || THEME_CONFIG.appName;
  const options = {
    body: data.body || 'لديك إشعار جديد.',
    icon: 'images/icons/icon-192x192.png',
    badge: 'images/icons/icon-72x72.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});