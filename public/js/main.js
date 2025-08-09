// ==== بداية الكود النهائي والمُصحح بالكامل لـ main.js (إصدار 23.1 - حركة عشوائية أسرع) ====

// الجزء الأول: كود نظام الحجز (كامل ومُصحح ليتوافق مع هيكل البيانات الجديد)
document.addEventListener('DOMContentLoaded', () => {
    // التأكد من وجود Firebase قبل استخدامه
    if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') {
        console.warn("Firebase or firebaseConfig not found. Booking system functionality will be disabled.");
    } else {
        try {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            // استدعاء دالة تهيئة نظام الحجز فقط إذا كانت العناصر موجودة
            if (document.getElementById('booking-container')) {
                initializeAppBookingSystem();
            }
        } catch (e) {
            console.error("Firebase initialization error:", e);
        }
    }
});


function initializeAppBookingSystem() {
    const db = firebase.database();
    let appState = { settings: {}, services: {}, publicBookings: {}, activeSlotsDate: null, barbers: [] };
    let currentDate = new Date();
    const ui = {
        loader: document.getElementById('loader'),
        bookingContainer: document.getElementById('booking-container'),
        headerLogo: document.getElementById('header-logo'),
        servicesCheckboxContainer: document.getElementById('services-checkbox-container'),
        totalPriceDisplay: document.getElementById('total-price'),
        calendarSection: document.getElementById('calendar-section'),
        calendarView: document.getElementById('calendar-view'),
        currentWeekDisplay: document.getElementById('current-week-display'),
        prevWeekBtn: document.getElementById('prev-week'),
        nextWeekBtn: document.getElementById('next-week'),
        bookingModal: document.getElementById('booking-modal'),
        closeBookingModalBtn: document.getElementById('close-booking-modal'),
        bookingForm: document.getElementById('booking-form'),
        selectedSlotDisplay: document.getElementById('selected-slot-display'),
        selectedServicesSummary: document.getElementById('selected-services-summary'),
        paymentMethodSelect: document.getElementById('payment-method'),
        slotsModal: document.getElementById('time-slots-modal'),
        closeSlotsModalBtn: document.getElementById('close-slots-modal'),
        slotsModalTitle: document.getElementById('slots-modal-title'),
        slotsContainer: document.getElementById('time-slots-container'),
        confirmationModal: document.getElementById('confirmation-modal'),
        closeConfirmationModalBtn: document.getElementById('close-confirmation-modal'),
        bookingCodeDisplay: document.getElementById('booking-code-display'),
        confirmationServicesSummary: document.getElementById('confirmation-services-summary'),
        paymentInfoDisplay: document.getElementById('payment-info-display'),
        confirmationHeader: document.getElementById('confirmation-header'),
        confirmationBarberDisplay: document.getElementById('confirmation-barber-display'),
        barberSelectLabel: document.getElementById('barber-select-label')
    };

    const toYYYYMMDD = (date) => date.toISOString().split('T')[0];
    function formatTo12Hour(timeString) { if (!timeString) return ''; const [hour, minute] = timeString.split(':').map(Number); const period = hour >= 12 ? ' م ' : ' ص '; const adjustedHour = hour % 12 === 0 ? 12 : hour % 12; return `${adjustedHour}:${String(minute).padStart(2, '0')} ${period}`; }
    function applyTheme() { if (typeof THEME_CONFIG === 'undefined') return; document.querySelectorAll('.theme-entity').forEach(el => el.textContent = THEME_CONFIG.entity); document.querySelectorAll('.theme-entity-plural').forEach(el => el.textContent = THEME_CONFIG.entityPlural); if (ui.barberSelectLabel) { ui.barberSelectLabel.textContent = `اختر الـ${THEME_CONFIG.entity} المفضل:`; } }
    function initializeApp() {
        applyTheme();
        Promise.all([db.ref('settings').once('value'), db.ref('services').once('value')])
            .then(([settingsSnap, servicesSnap]) => {
                appState.settings = settingsSnap.val() || {};
                appState.services = servicesSnap.val() || {};
                appState.barbers = (settingsSnap.val() && settingsSnap.val().barbers) || [];
                if (ui.headerLogo) ui.headerLogo.src = appState.settings.logoUrl || 'logo.png';
                populatePaymentMethods();
                renderServiceCheckboxes();
                ui.loader.style.display = 'none';
                ui.bookingContainer.style.display = 'block';
                db.ref('publicBookings').on('value', snap => {
                    appState.publicBookings = snap.val() || {};
                    if (ui.calendarSection && ui.calendarSection.style.display === 'block') renderCalendar();
                    if (ui.slotsModal && ui.slotsModal.style.display === 'block' && appState.activeSlotsDate) renderTimeSlots(appState.activeSlotsDate);
                });
            }).catch(err => { console.error("Firebase load error:", err); if (ui.loader) ui.loader.innerHTML = "<h2>حدث خطأ فادح في تحميل البيانات. الرجاء تحديث الصفحة.</h2>"; });
    }
    function handleServiceSelectionChange() { const { totalPrice } = getSelectedServicesInfo(); if (ui.totalPriceDisplay) ui.totalPriceDisplay.textContent = totalPrice; if (ui.calendarSection) { ui.calendarSection.style.display = totalPrice > 0 ? 'block' : 'none'; if (totalPrice > 0) renderCalendar(); } }
    function isDayFullyBooked(dateString) { const schedule = getDaySchedule(new Date(dateString + "T00:00:00")); if (!schedule.active) return true; const dayBookings = Object.values(appState.publicBookings).filter(b => b.date === dateString && (b.status === 'approved' || b.status === 'pending')); if (appState.settings.bookingModel === 'capacity') { return dayBookings.length >= (parseInt(appState.settings.dailyCapacity, 10) || 10); } if (appState.settings.bookingModel === 'slots') { const slotDuration = parseInt(appState.settings.slotDuration, 10) || 30; const slotCapacity = (appState.barbers && appState.barbers.length > 0) ? appState.barbers.length : 1; const timeToMinutes = t => { if (!t || !t.includes(':')) return 0; return t.split(':').map(Number).reduce((h, m) => h * 60 + m, 0) }; const start = timeToMinutes(schedule.open); const end = timeToMinutes(schedule.close); const breakStartMinutes = timeToMinutes(schedule.actualBreakStart); const breakEndMinutes = timeToMinutes(schedule.actualBreakEnd); const now = new Date(); const isToday = toYYYYMMDD(now) === dateString; const currentTimeMinutes = now.getHours() * 60 + now.getMinutes(); for (let time = start; time < end; time += slotDuration) { if (time >= breakStartMinutes && time < breakEndMinutes) continue; if (isToday && time < currentTimeMinutes) continue; const timeStr = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`; if (dayBookings.filter(b => b.time === timeStr).length < slotCapacity) { return false; } } return true; } return false; }
    function renderCalendar() { if (!ui.calendarView) return; ui.calendarView.innerHTML = ""; const weekStart = new Date(currentDate); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); if (ui.currentWeekDisplay) ui.currentWeekDisplay.textContent = `الأسبوع من ${weekStart.toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}`; const today = new Date(); today.setHours(0, 0, 0, 0); if (ui.prevWeekBtn) ui.prevWeekBtn.disabled = weekStart < today; for (let i = 0; i < 7; i++) { const dayDate = new Date(weekStart); dayDate.setDate(weekStart.getDate() + i); const dayString = toYYYYMMDD(dayDate); const schedule = getDaySchedule(dayDate); const dayDiv = document.createElement("div"); dayDiv.className = "day-slot"; dayDiv.dataset.date = dayString; dayDiv.innerHTML = `<strong>${dayDate.toLocaleDateString("ar-EG", { weekday: "long" })}</strong><br>${dayDate.toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}`; if (dayDate < today) { dayDiv.classList.add("disabled"); } else if (!schedule.active) { dayDiv.classList.add("off-day"); } else { if (isDayFullyBooked(dayString)) { dayDiv.classList.add("full"); dayDiv.innerHTML += "<br><small>مكتمل</small>"; } else { dayDiv.classList.add("available"); dayDiv.innerHTML += `<br><small>متاح للحجز</small>`; } } ui.calendarView.appendChild(dayDiv); } }
    function renderTimeSlots(dateString) { if (!ui.slotsContainer) return; ui.slotsContainer.innerHTML = ""; const schedule = getDaySchedule(new Date(dateString + "T00:00:00")); if (!schedule.active) { ui.slotsContainer.innerHTML = '<p class="note">لا توجد مواعيد متاحة.</p>'; return; } const slotDuration = parseInt(appState.settings.slotDuration, 10) || 30; const slotCapacity = (appState.barbers && appState.barbers.length > 0) ? appState.barbers.length : 1; const timeToMinutes = t => { if (!t || typeof t !== "string" || !t.includes(":")) return 0; return t.split(":").map(Number).reduce((h, m) => h * 60 + m, 0) }; const start = timeToMinutes(schedule.open); const end = timeToMinutes(schedule.close); const breakStartMinutes = timeToMinutes(schedule.actualBreakStart); const breakEndMinutes = timeToMinutes(schedule.actualBreakEnd); const now = new Date(); const isToday = toYYYYMMDD(now) === dateString; const currentTimeMinutes = now.getHours() * 60 + now.getMinutes(); let hasAvailableSlots = false; for (let time = start; time < end; time += slotDuration) { if (time >= breakStartMinutes && time < breakEndMinutes) continue; const timeStr = `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`; const slotDiv = document.createElement("div"); slotDiv.className = "time-slot"; const isPast = isToday && time < currentTimeMinutes; const bookingsForSlot = Object.values(appState.publicBookings).filter(b => b.date === dateString && b.time === timeStr && (b.status === 'approved' || b.status === 'pending')); const availableSpots = slotCapacity - bookingsForSlot.length; slotDiv.innerHTML = `<strong>${formatTo12Hour(timeStr)}</strong>`; if (isPast || availableSpots <= 0) { slotDiv.classList.add("approved"); slotDiv.innerHTML += `<small>مكتمل</small>`; } else { hasAvailableSlots = true; slotDiv.classList.add("available"); slotDiv.dataset.date = dateString; slotDiv.dataset.time = timeStr; slotDiv.innerHTML += `<small>متاح: ${availableSpots}</small>`; } ui.slotsContainer.appendChild(slotDiv); } if (!hasAvailableSlots) { ui.slotsContainer.innerHTML = '<p class="note">جميع المواعيد محجوزة.</p>'; } }
    function getDaySchedule(date) { const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]; const dayName = dayNames[date.getDay()]; const scheduleSettings = appState.settings.schedule || {}; const daySettings = scheduleSettings[dayName] || { active: !0, open: "09:00", close: "21:00" }; let actualBreakStart = "", actualBreakEnd = ""; if (scheduleSettings.breakMode === "unified") { actualBreakStart = scheduleSettings.unifiedBreakStart; actualBreakEnd = scheduleSettings.unifiedBreakEnd } else if (scheduleSettings.breakMode === "custom") { actualBreakStart = daySettings.breakStart; actualBreakEnd = daySettings.breakEnd } return { ...daySettings, actualBreakStart, actualBreakEnd } }
    function renderServiceCheckboxes() { if (!ui.servicesCheckboxContainer) return; ui.servicesCheckboxContainer.innerHTML = ""; if (Object.keys(appState.services).length === 0) { ui.servicesCheckboxContainer.innerHTML = '<p class="note">لا توجد خدمات متاحة.</p>'; return } for (const id in appState.services) { const service = appState.services[id]; const div = document.createElement("div"); div.className = "service-checkbox-item"; div.innerHTML = `<input type="checkbox" id="service-${id}" data-price="${service.price}" data-name="${service.name}"><label for="service-${id}"><span class="service-name">${service.name}</span><span class="service-price">${service.price} جنيه</span></label>`; ui.servicesCheckboxContainer.appendChild(div) } }
    function getSelectedServicesInfo() { const checkedBoxes = ui.servicesCheckboxContainer.querySelectorAll('input[type="checkbox"]:checked'); let totalPrice = 0; const selected = Array.from(checkedBoxes).map(box => { const price = parseFloat(box.dataset.price); totalPrice += price; return { id: box.id.replace('service-', ''), name: box.dataset.name, price: price } }); return { selected, totalPrice } }
    function populatePaymentMethods() { if (!ui.paymentMethodSelect) return; ui.paymentMethodSelect.innerHTML = ""; const firstOption = document.createElement("option"); firstOption.value = ""; firstOption.textContent = "اختر طريقة الدفع..."; firstOption.disabled = true; firstOption.selected = true; ui.paymentMethodSelect.appendChild(firstOption); const paymentMethods = appState.settings.paymentMethods || {}; for (const id in paymentMethods) { const method = paymentMethods[id]; const option = document.createElement("option"); option.value = method.name; option.textContent = method.name; ui.paymentMethodSelect.appendChild(option); } }
    function openBookingModal(date, time = null) { if (!ui.bookingForm || !ui.selectedSlotDisplay || !ui.selectedServicesSummary) return; ui.bookingForm.elements['date'].value = date; ui.bookingForm.elements['time'].value = time || ''; const [year, month, day] = date.split('-').map(Number); const correctDate = new Date(year, month - 1, day); ui.selectedSlotDisplay.innerHTML = `<div>📅 يوم ${correctDate.toLocaleDateString("ar-EG", { weekday: 'long', day: 'numeric', month: 'long' })}</div>` + (time ? `<div>⏰ الساعة ${formatTo12Hour(time)}</div>` : ""); const { selected, totalPrice } = getSelectedServicesInfo(); ui.selectedServicesSummary.innerHTML = `<h4>الخدمات المختارة</h4><p>${selected.map(s => s.name).join("، ")}</p><strong>الإجمالي: ${totalPrice} جنيه</strong>`; const barberSelectorContainer = document.getElementById('barber-selector-container'); const barberSelect = document.getElementById('barber-select'); const anyEntityText = `أي ${THEME_CONFIG.entity}`; if (barberSelectorContainer && barberSelect && appState.barbers && appState.barbers.length > 0) { const barberNames = appState.barbers.map(b => b.name); const bookedBarbers = Object.values(appState.publicBookings).filter(b => b.date === date && b.time === time && b.selectedBarber && b.selectedBarber !== anyEntityText).map(b => b.selectedBarber); const availableBarbers = barberNames.filter(b => !bookedBarbers.includes(b)); if (availableBarbers.length > 0) { barberSelect.innerHTML = `<option value="${anyEntityText}">${anyEntityText}</option>`; availableBarbers.forEach(barberName => { const option = document.createElement('option'); option.value = barberName; option.textContent = barberName; barberSelect.appendChild(option); }); barberSelectorContainer.style.display = 'block'; } else { barberSelectorContainer.style.display = 'none'; } } else if (barberSelectorContainer) { barberSelectorContainer.style.display = 'none'; } ui.slotsModal.style.display = "none"; ui.bookingModal.style.display = "block"; }
    function showConfirmationModal(bookingCode, newBookingData) { ui.confirmationHeader.textContent = appState.settings.requireConfirmation ? "تم إرسال طلبك بنجاح!" : "تم تأكيد حجزك بنجاح!"; ui.bookingCodeDisplay.textContent = bookingCode; if (ui.confirmationBarberDisplay && newBookingData.selectedBarber) { ui.confirmationBarberDisplay.textContent = newBookingData.selectedBarber; } const { services, totalPrice, paymentMethod } = newBookingData; ui.confirmationServicesSummary.innerHTML = `<h4>الخدمات المحجوزة</h4><p>${services.map(s => s.name).join("، ")}</p><strong>الإجمالي: ${totalPrice} جنيه</strong>`; ui.paymentInfoDisplay.style.display = "none"; const paymentMethods = appState.settings.paymentMethods || {}; const selectedMethod = Object.values(paymentMethods).find(m => m.name === paymentMethod); if (selectedMethod && selectedMethod.requiresProof === true) { const contactDetails = appState.settings.paymentContact; if (contactDetails) { let html = `<h4>الرجاء إتمام الدفع</h4>`; html += `<p>عن طريق <strong>${selectedMethod.name}</strong>: ${selectedMethod.details}</p>`; if (contactDetails.contactInfo) { let platform = contactDetails.contactPlatform === "other" ? contactDetails.contactOther || "الوسيلة المحددة" : contactDetails.contactPlatform; html += `<p>وإرسال إثبات التحويل إلى <strong>${platform}</strong> على: ${contactDetails.contactInfo}</p>`; } ui.paymentInfoDisplay.innerHTML = html; ui.paymentInfoDisplay.style.display = "block"; } } ui.confirmationModal.style.display = "block"; }
    if (ui.servicesCheckboxContainer) ui.servicesCheckboxContainer.addEventListener('change', handleServiceSelectionChange);
    if (ui.calendarView) { ui.calendarView.addEventListener('click', (e) => { const daySlot = e.target.closest('.day-slot.available'); if (!daySlot) return; const date = daySlot.dataset.date; if (appState.settings.bookingModel === 'slots') { const [year, month, day] = date.split('-').map(Number); const correctDate = new Date(year, month - 1, day); if (ui.slotsModalTitle) ui.slotsModalTitle.textContent = `المواعيد المتاحة ليوم ${correctDate.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}`; appState.activeSlotsDate = date; renderTimeSlots(date); ui.slotsModal.style.display = 'block'; } else { openBookingModal(daySlot.dataset.date); } }); }
    if (ui.slotsContainer) ui.slotsContainer.addEventListener('click', (e) => { const slot = e.target.closest('.time-slot.available'); if (slot) openBookingModal(slot.dataset.date, slot.dataset.time); });
    if (ui.bookingForm) { ui.bookingForm.addEventListener('submit', async (e) => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'جاري الحجز...'; const anyEntityText = `أي ${THEME_CONFIG.entity}`; try { const { selected, totalPrice } = getSelectedServicesInfo(); if (selected.length === 0) { throw new Error('الرجاء اختيار خدمة أولاً.'); } const dateForBooking = ui.bookingForm.elements.date.value; const timeForBooking = ui.bookingForm.elements.time.value || null; if (!dateForBooking) { throw new Error("تاريخ الحجز مفقود."); } let finalSelectedBarber; const barberSelectElement = document.getElementById('barber-select'); if (barberSelectElement && getComputedStyle(barberSelectElement.parentElement).display !== 'none') { const barberChoice = barberSelectElement.value; if (barberChoice !== anyEntityText) { finalSelectedBarber = barberChoice; } else { const barberNames = appState.barbers.map(b => b.name); const bookedBarbers = Object.values(appState.publicBookings).filter(b => b.date === dateForBooking && b.time === timeForBooking && b.selectedBarber && b.selectedBarber !== anyEntityText).map(b => b.selectedBarber); const availableBarbers = barberNames.filter(b => !bookedBarbers.includes(b)); if (availableBarbers.length > 0) { finalSelectedBarber = availableBarbers[0]; } else { throw new Error('عفواً، هذا الموعد تم حجزه بالكامل للتو.'); } } } else { finalSelectedBarber = (appState.barbers && appState.barbers.length > 0) ? appState.barbers[0].name : 'غير محدد'; } const counterRef = db.ref(`dayCounters/${dateForBooking}`); const { snapshot } = await counterRef.transaction(count => (count || 0) + 1); const newBookingData = { fullName: ui.bookingForm.elements.fullName.value, phone: ui.bookingForm.elements.phone.value, date: dateForBooking, time: timeForBooking, paymentMethod: ui.bookingForm.elements.paymentMethod.value, status: appState.settings.requireConfirmation ? 'pending' : 'approved', createdAt: firebase.database.ServerValue.TIMESTAMP, services: selected, totalPrice: totalPrice, bookingCode: snapshot.val(), selectedBarber: finalSelectedBarber }; const publicBookingData = { date: newBookingData.date, time: newBookingData.time, status: newBookingData.status, selectedBarber: finalSelectedBarber }; const newBookingKey = db.ref().child('bookings').push().key; const updates = { [`/bookings/${newBookingKey}`]: newBookingData, [`/publicBookings/${newBookingKey}`]: publicBookingData }; await db.ref().update(updates); ui.bookingModal.style.display = 'none'; ui.bookingForm.reset(); populatePaymentMethods(); handleServiceSelectionChange(); showConfirmationModal(newBookingData.bookingCode, newBookingData); } catch (error) { if (typeof showNotification !== 'undefined') showNotification(error.message || 'حدث خطأ أثناء الحجز.', 'error'); else alert(error.message || 'حدث خطأ أثناء الحجز.'); ui.bookingModal.style.display = 'none'; } finally { btn.disabled = false; btn.textContent = 'إرسال طلب الحجز'; } }); }
    if (ui.prevWeekBtn) ui.prevWeekBtn.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 7); renderCalendar(); });
    if (ui.nextWeekBtn) ui.nextWeekBtn.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 7); renderCalendar(); });
    if (ui.closeBookingModalBtn) ui.closeBookingModalBtn.onclick = () => { ui.bookingModal.style.display = "none"; };
    if (ui.closeSlotsModalBtn) ui.closeSlotsModalBtn.onclick = () => { ui.slotsModal.style.display = "none"; appState.activeSlotsDate = null; };
    if (ui.closeConfirmationModalBtn) ui.closeConfirmationModalBtn.onclick = () => { ui.confirmationModal.style.display = "none"; };
    window.onclick = (e) => { if (ui.bookingModal && e.target == ui.bookingModal) ui.bookingModal.style.display = "none"; if (ui.slotsModal && e.target == ui.slotsModal) { ui.slotsModal.style.display = "none"; appState.activeSlotsDate = null; } if (ui.confirmationModal && e.target == ui.confirmationModal) ui.confirmationModal.style.display = "none"; };

    initializeApp();
}


// الجزء الثاني: كود الحركة العشوائية الجديد (بالسرعة المعدلة)
window.addEventListener('load', () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const tools = document.querySelectorAll('.animated-tool');

    // دالة للحصول على رقم عشوائي ضمن نطاق معين
    function getRandom(min, max) {
        return Math.random() * (max - min) + min;
    }

    tools.forEach(tool => {
        const heroRect = hero.getBoundingClientRect();

        // 1. تحديد مكان وسرعة عشوائية عند بدء التشغيل
        let x = getRandom(0, heroRect.width - tool.offsetWidth);
        let y = getRandom(0, heroRect.height - tool.offsetHeight);

        // --- التعديل هنا لزيادة السرعة ---
        let speedX = getRandom(-5, 5); // زيادة النطاق من -1 إلى -2 و 1 إلى 2
        let speedY = getRandom(-5, 5); // زيادة النطاق من -1 إلى -2 و 1 إلى 2
        // ------------------------------------

        // التأكد من أن الحركة ليست بطيئة جداً أو متوقفة
        if (Math.abs(speedX) < 0.5) speedX = speedX > 0 ? 0.8 : -0.8; // زيادة أقل سرعة
        if (Math.abs(speedY) < 0.5) speedY = speedY > 0 ? 0.8 : -0.8; // زيادة أقل سرعة

        function animate() {
            // تحديث الإحداثيات
            x += speedX;
            y += speedY;

            // تحديد حدود منطقة الهيرو
            const rightWall = heroRect.width - tool.offsetWidth;
            const bottomWall = heroRect.height - tool.offsetHeight;
            const leftWall = 0;
            const topWall = 0;

            // منطق الارتداد عن الحواف
            if (x > rightWall) {
                x = rightWall;
                speedX *= -1;
            } else if (x < leftWall) {
                x = leftWall;
                speedX *= -1;
            }

            if (y > bottomWall) {
                y = bottomWall;
                speedY *= -1;
            } else if (y < topWall) {
                y = topWall;
                speedY *= -1;
            }

            // تطبيق الحركة على العنصر
            tool.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            requestAnimationFrame(animate); // استدعاء الإطار التالي للأنيميشن
        }

        // بدء الأنيميشن لهذه الأداة
        animate();
    });
});


// الجزء الثالث: كود إظهار العناصر عند التمرير وفريق العمل
document.addEventListener('DOMContentLoaded', () => {
    // إظهار العناصر عند التمرير
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            } else {
                entry.target.classList.remove('show');
            }
        });
    });
    const hiddenElements = document.querySelectorAll('.hidden');
    hiddenElements.forEach((el) => scrollObserver.observe(el));

    // جلب فريق العمل
    if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
        try {
            if (firebase.apps.length === 0) firebase.initializeApp(firebaseConfig);
            loadBarbers();
        } catch (e) { console.error("Firebase init error for barbers:", e); }
    } else {
        console.error("Firebase not loaded. Barbers section cannot be displayed.");
    }
});

function loadBarbers() {
    const db = firebase.database();
    const barbersRef = db.ref('settings/barbers');
    const barbersSection = document.getElementById('barbers-section');
    const container = document.getElementById('barbers-container');
    if (!barbersSection || !container) return;

    barbersRef.once('value').then((snapshot) => {
        const barbersArray = snapshot.val();
        if (barbersArray && Array.isArray(barbersArray) && barbersArray.length > 0) {
            container.innerHTML = '';
            barbersArray.forEach((barber) => {
                if (!barber || !barber.name || !barber.imageUrl || !barber.description) return;
                const card = document.createElement('div');
                card.className = 'barber-card';
                card.innerHTML = `
                    <img src="${barber.imageUrl}" alt="صورة ${barber.name}">
                    <h3>${barber.name}</h3>
                    <p>${barber.description}</p>
                `;
                container.appendChild(card);
            });
            barbersSection.style.display = 'block';
        } else {
            barbersSection.style.display = 'none';
        }
    }).catch((error) => {
        console.error("Error fetching barbers data for homepage:", error);
    });
}