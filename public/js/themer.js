// js/themer.js

document.addEventListener('DOMContentLoaded', () => {
    if (typeof THEME_CONFIG === 'undefined') {
        console.error('THEME_CONFIG is not defined. Make sure config.js is loaded before themer.js');
        return;
    }

    // --- استخلاص الإعدادات لسهولة الاستخدام ---
    const { appName, entity, entityPlural, service, servicePlural } = THEME_CONFIG;
    const currentYear = new Date().getFullYear();

    // --- إنشاء وتضمين ملف Manifest ديناميكيًا ---
    const generateAndInjectManifest = () => {
        const manifestTemplate = {
            "name": appName,
            "short_name": appName.split(' ')[0], // استخدام أول كلمة كاسم مختصر
            "description": `The best ${service} experience in town. Book your appointment now!`,
            "start_url": "/index.html",
            "display": "standalone",
            "background_color": "#112A2A",
            "theme_color": "#1d1d1d",
            "icons": [
                { "src": "images/icons/icon-72x72.png", "sizes": "72x72", "type": "image/png" },
                { "src": "images/icons/icon-96x96.png", "sizes": "96x96", "type": "image/png" },
                { "src": "images/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
                { "src": "images/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
                { "src": "images/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
            ]
        };

        const manifestBlob = new Blob([JSON.stringify(manifestTemplate)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);

        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            manifestLink.href = manifestUrl;
        } else {
            const newLink = document.createElement('link');
            newLink.rel = 'manifest';
            newLink.href = manifestUrl;
            document.head.appendChild(newLink);
        }
    };
    generateAndInjectManifest();

    // --- دالة مساعدة لتحديث النصوص بأمان ---
    const setText = (selector, text) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = text;
    };

    // --- تحديث العناصر المشتركة ---
    document.querySelectorAll('footer p').forEach(p => {
        p.innerHTML = `© ${currentYear} ${appName}. جميع الحقوق محفوظة.`;
    });
    document.querySelectorAll('.logo').forEach(logo => {
        logo.alt = `${appName} Logo`;
    });

    // --- تحديثات خاصة بكل صفحة ---
    const pagePath = window.location.pathname.split('/').pop();

    // 1. index.html
    if (pagePath === '' || pagePath === 'index.html') {
        document.title = `${appName} - الرئيسية`;
        setText('.hero-title', appName);
        setText('.hero-subtitle', `أناقتك تبدأ من هنا. أفضل تجربة ${service} في المدينة.`);
    }

    // 2. login.html
    if (pagePath === 'login.html') {
        document.title = `تسجيل دخول الأدمن - ${appName}`;
    }

    // 3. services.html
    if (pagePath === 'services.html') {
        document.title = `${servicePlural} والحجز - ${appName}`;
        setText('#service-selection-section h2', `الخطوة 1: اختر ال${servicePlural} المطلوبة`);
        setText('#calendar-title', `الخطوة 2: اختر يوماً من التقويم`);
        setText('#barber-select-label', `اختر ال${entity} المفضل:`);

        const confirmationProviderText = document.getElementById('confirmation-provider-text');
        if (confirmationProviderText) {
            const strongElement = confirmationProviderText.querySelector('strong');
            confirmationProviderText.innerHTML = `سيقوم بخدمتك ال${entity}: <strong id="confirmation-barber-display" style="color: #2e7d32;">${strongElement.innerHTML}</strong>`;
        }
    }

    // 4. admin.html
    if (pagePath === 'admin.html') {
        document.title = `لوحة التحكم - ${appName}`;
        setText('#services-management-title', `إدارة ال${servicePlural}`);
        setText('#add-service-title', `إضافة ${service} جديدة`);
        setText('#service-name-label', `اسم ال${service}:`);
        setText('#current-services-title', `ال${servicePlural} الحالية`);
        setText('#loading-services-note', `جاري تحميل ال${servicePlural}...`);
        setText('#top-services-chart-title', `ال${servicePlural} الأكثر طلباً`);
        setText('#service-revenue-chart-title', `إيرادات كل ${service}`);
        setText('#edit-service-modal-title', `تعديل ال${service}`);
        setText('#edit-service-name-label', `اسم ال${service}:`);
        document.querySelectorAll('.theme-entity').forEach(el => el.textContent = entity);
        document.querySelectorAll('.theme-entity-plural').forEach(el => el.textContent = entityPlural);
    }
});