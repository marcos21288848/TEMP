// ==== بداية الكود النهائي والمُصحح بالكامل لـ admin.js (إصدار 24.1 - إصلاح نهائي لدالة الرفع) ====
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebaseConfig === 'undefined' || typeof THEME_CONFIG === 'undefined') {
        console.error("خطأ فادح: ملف config.js لم يتم تحميله قبل admin.js");
        alert("خطأ في تحميل الإعدادات الرئيسية. لا يمكن عرض لوحة التحكم.");
        return;
    }

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const auth = firebase.auth();
    const storage = firebase.storage();

    let charts = {};
    let upcomingCurrentPage = 1;
    let pastCurrentPage = 1;
    const ITEMS_PER_PAGE = 5;

    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('admin-content').style.display = 'block';
            initializeAdminPanel();
        } else {
            window.location.replace('login.html');
        }
    });

    function applyTheme() {
        document.querySelectorAll('.theme-entity').forEach(el => el.textContent = THEME_CONFIG.entity);
        document.querySelectorAll('.theme-entity-plural').forEach(el => el.textContent = THEME_CONFIG.entityPlural);
    }

    function formatTo12Hour(timeString) { if (!timeString) return ''; const [hour, minute] = timeString.split(':').map(Number); const period = hour >= 12 ? ' م ' : ' ص '; const adjustedHour = hour % 12 === 0 ? 12 : hour % 12; return `${adjustedHour}:${String(minute).padStart(2, '0')} ${period}`; }
    const toYYYYMMDD = (d) => d.toISOString().split("T")[0];

    function initializeAdminPanel() {
        applyTheme();
        const pageLoadTimestamp = Date.now();
        const originalTitle = document.title;
        const notificationSound = document.getElementById('notification-sound');

        db.ref('bookings').on('child_added', (snapshot) => {
            const newBooking = snapshot.val();
            if (newBooking && newBooking.createdAt && newBooking.createdAt > pageLoadTimestamp) {
                document.title = `(1) حجز جديد! | ${originalTitle}`;
                showNotification(`لديك حجز جديد من ${newBooking.fullName || 'عميل'}!`, 'success');
                if (notificationSound) { notificationSound.play().catch(e => console.log("Audio play failed", e)); }
            }
        });

        function enableAudioInteraction() { if (notificationSound && notificationSound.paused) { notificationSound.muted = true; notificationSound.play().then(() => { notificationSound.pause(); notificationSound.currentTime = 0; notificationSound.muted = false; window.removeEventListener('click', enableAudioInteraction); }).catch(() => { }); } }
        window.addEventListener('click', enableAudioInteraction, { once: true });
        window.addEventListener('focus', () => { document.title = originalTitle; });

        const elements = {
            headerLogo: document.getElementById('header-logo'),
            logoutButton: document.getElementById('logout-btn'),
            bookingsManagementSection: document.getElementById('bookings-management-section'),
            pendingList: document.getElementById('pending-bookings-list'),
            toggleToday: document.getElementById('toggle-today-bookings'),
            toggleUpcoming: document.getElementById('toggle-upcoming-bookings'),
            togglePast: document.getElementById('toggle-past-bookings'),
            todayBookingsContent: document.getElementById('today-bookings-content'),
            upcomingBookingsContent: document.getElementById('upcoming-bookings-content'),
            pastBookingsContent: document.getElementById('past-bookings-content'),
            todayBookingsList: document.getElementById('today-bookings-list'),
            upcomingBookingsList: document.getElementById('upcoming-bookings-list'),
            pastBookingsList: document.getElementById('past-bookings-list'),
            upcomingPagination: document.getElementById('upcoming-pagination'),
            pastPagination: document.getElementById('past-pagination'),
            startDatePicker: document.getElementById('start-date-picker'),
            endDatePicker: document.getElementById('end-date-picker'),
            bookingCountDisplay: document.getElementById('booking-count'),
            viewerResultsContainer: document.getElementById('viewer-results-container'),
            pendingCount: document.getElementById('pending-count'),
            todayCount: document.getElementById('today-count'),
            totalCount: document.getElementById('total-count'),
            logoForm: document.getElementById('logo-form'),
            logoUrlInput: document.getElementById('logo-url'),
            changePasswordBtn: document.getElementById('change-password-btn'),
            paymentContactForm: document.getElementById('payment-contact-form'),
            contactPlatformSelect: document.getElementById('contact-platform'),
            contactInfoInput: document.getElementById('contact-info'),
            contactOtherInput: document.getElementById('contact-other'),
            addPaymentMethodForm: document.getElementById('add-payment-method-form'),
            paymentMethodNameInput: document.getElementById('payment-method-name'),
            paymentMethodDetailsInput: document.getElementById('payment-method-details'),
            paymentMethodRequiresProofInput: document.getElementById('payment-method-requires-proof'),
            paymentMethodsList: document.getElementById('payment-methods-list'),
            bookingModelForm: document.getElementById('booking-model-form'),
            bookingModelSelect: document.getElementById('booking-model-select'),
            slotsInputContainer: document.getElementById('slots-input-container'),
            slotDurationInput: document.getElementById('slot-duration'),
            capacityInputContainer: document.getElementById('capacity-input-container'),
            dailyCapacityInput: document.getElementById('daily-capacity'),
            scheduleForm: document.getElementById('schedule-form'),
            requireConfirmationToggle: document.getElementById('require-confirmation-toggle'),
            addServiceForm: document.getElementById('add-service-form'),
            serviceNameInput: document.getElementById('service-name'),
            servicePriceInput: document.getElementById('service-price'),
            servicesList: document.getElementById('services-list'),
            addBarberForm: document.getElementById('add-barber-form'),
            barbersListContainer: document.getElementById('barbers-list'),
            editServiceModal: document.getElementById('edit-service-modal'),
            closeEditServiceModalBtn: document.getElementById('close-edit-service-modal'),
            editServiceForm: document.getElementById('edit-service-form'),
            editServiceIdInput: document.getElementById('edit-service-id'),
            editServiceNameInput: document.getElementById('edit-service-name'),
            editServicePriceInput: document.getElementById('edit-service-price'),
            editPaymentMethodModal: document.getElementById('edit-payment-method-modal'),
            closeEditPaymentMethodModalBtn: document.getElementById('close-edit-payment-method-modal'),
            editPaymentMethodForm: document.getElementById('edit-payment-method-form'),
            editPaymentMethodIdInput: document.getElementById('edit-payment-method-id'),
            editPaymentMethodNameInput: document.getElementById('edit-payment-method-name'),
            editPaymentMethodDetailsInput: document.getElementById('edit-payment-method-details'),
            editPaymentMethodRequiresProofInput: document.getElementById('edit-payment-method-requires-proof'),
        };

        setupToggleState(elements);
        db.ref('settings').on('value', (snapshot) => { updateUIFromSettings(snapshot.val() || {}, elements); });
        db.ref('services').on('value', (snapshot) => { renderServices(snapshot.val() || {}, elements); });
        db.ref('bookings').orderByChild('createdAt').on('value', (snapshot) => {
            const allBookingsData = snapshot.val() || {};
            const bookingsArray = Object.entries(allBookingsData).map(([id, booking]) => ({ id, ...booking }));
            renderAllBookingLists(bookingsArray, elements);
            renderAdvancedCharts(bookingsArray);
            if (elements.startDatePicker.value && elements.endDatePicker.value) { handleDateRangeSelection(db, elements); }
        });
        setupEventListeners(elements, auth, db, storage);
    }

    function setupToggleState(elements) {
        const toggles = { today: { checkbox: elements.toggleToday, content: elements.todayBookingsContent, default: true }, upcoming: { checkbox: elements.toggleUpcoming, content: elements.upcomingBookingsContent, default: false }, past: { checkbox: elements.togglePast, content: elements.pastBookingsContent, default: false } };
        for (const key in toggles) { const { checkbox, content, default: defaultState } = toggles[key]; if (!checkbox || !content) continue; const savedState = localStorage.getItem(`toggle_${key}`); const isChecked = savedState !== null ? JSON.parse(savedState) : defaultState; checkbox.checked = isChecked; content.style.display = isChecked ? 'block' : 'none'; }
    }

    function renderAllBookingLists(bookings, elements) {
        const lists = { pending: [], today: [], upcoming: [], past: [] };
        const todayStr = toYYYYMMDD(new Date());
        const todayDate = new Date(todayStr + "T00:00:00");
        bookings.forEach(b => { const bookingDate = new Date(b.date + 'T00:00:00'); if (b.status === 'pending') lists.pending.push(b); else if (b.status === 'approved') { if (b.date === todayStr) lists.today.push(b); else if (bookingDate > todayDate) lists.upcoming.push(b); else if (bookingDate < todayDate) lists.past.push(b); } });
        const renderList = (container, data, sortFn) => { if (!container) return; container.innerHTML = ''; if (data.length > 0) { data.sort(sortFn).forEach(b => container.appendChild(createBookingItem(b))); } else { container.innerHTML = '<p class="note">لا توجد حجوزات لعرضها هنا.</p>'; } };
        renderList(elements.pendingList, lists.pending, (a, b) => a.createdAt - b.createdAt);
        renderList(elements.todayBookingsList, lists.today, (a, b) => (a.time || '').localeCompare(b.time || ''));
        const renderUpcoming = () => renderPaginatedList(elements.upcomingBookingsList, elements.upcomingPagination, lists.upcoming, upcomingCurrentPage, ITEMS_PER_PAGE, (a, b) => (a.date + (a.time || 'A')).localeCompare(b.date + (b.time || 'A')), (newPage) => { upcomingCurrentPage = newPage; renderUpcoming(); });
        renderUpcoming();
        const renderPast = () => renderPaginatedList(elements.pastBookingsList, elements.pastPagination, lists.past, pastCurrentPage, ITEMS_PER_PAGE, (a, b) => (b.date + (b.time || 'Z')).localeCompare(a.date + (a.time || 'Z')), (newPage) => { pastCurrentPage = newPage; renderPast(); });
        renderPast();
        updateDashboard(bookings, elements);
    }

    function renderPaginatedList(listContainer, paginationContainer, data, currentPage, itemsPerPage, sortFn, pageChangeCallback) {
        if (!listContainer || !paginationContainer) return;
        listContainer.innerHTML = ''; paginationContainer.innerHTML = '';
        const sortedData = [...data].sort(sortFn);
        const totalPages = Math.ceil(sortedData.length / itemsPerPage);
        if (sortedData.length === 0) { listContainer.innerHTML = '<p class="note">لا توجد حجوزات لعرضها هنا.</p>'; return; }
        currentPage = Math.max(1, Math.min(currentPage, totalPages));
        const startIndex = (currentPage - 1) * itemsPerPage;
        const pageItems = sortedData.slice(startIndex, startIndex + itemsPerPage);
        pageItems.forEach(b => listContainer.appendChild(createBookingItem(b)));
        if (totalPages > 1) {
            const prevButton = document.createElement('button'); prevButton.textContent = 'السابق'; prevButton.className = 'btn'; prevButton.disabled = currentPage === 1; prevButton.onclick = () => pageChangeCallback(currentPage - 1);
            const pageInfo = document.createElement('span'); pageInfo.textContent = `صفحة ${currentPage} من ${totalPages}`;
            const nextButton = document.createElement('button'); nextButton.textContent = 'التالي'; nextButton.className = 'btn'; nextButton.disabled = currentPage === totalPages; nextButton.onclick = () => pageChangeCallback(currentPage + 1);
            paginationContainer.appendChild(prevButton); paginationContainer.appendChild(pageInfo); paginationContainer.appendChild(nextButton);
        }
    }

    function setupEventListeners(elements, auth, db, storage) {
        const { toggleToday, todayBookingsContent, toggleUpcoming, upcomingBookingsContent, togglePast, pastBookingsContent, logoutButton, startDatePicker, endDatePicker, changePasswordBtn, logoForm, contactPlatformSelect, bookingModelForm, scheduleForm, requireConfirmationToggle, addServiceForm, editServiceForm, paymentContactForm, addPaymentMethodForm, editPaymentMethodForm, closeEditServiceModalBtn, closeEditPaymentMethodModalBtn, addBarberForm, barbersListContainer } = elements;
        if (toggleToday) toggleToday.addEventListener('change', (e) => { const isVisible = e.target.checked; todayBookingsContent.style.display = isVisible ? 'block' : 'none'; localStorage.setItem('toggle_today', isVisible); });
        if (toggleUpcoming) toggleUpcoming.addEventListener('change', (e) => { const isVisible = e.target.checked; upcomingBookingsContent.style.display = isVisible ? 'block' : 'none'; localStorage.setItem('toggle_upcoming', isVisible); });
        if (togglePast) togglePast.addEventListener('change', (e) => { const isVisible = e.target.checked; pastBookingsContent.style.display = isVisible ? 'block' : 'none'; localStorage.setItem('toggle_past', isVisible); });
        if (logoutButton) logoutButton.addEventListener('click', () => auth.signOut());
        if (startDatePicker && endDatePicker) { const dateRangeChangeHandler = () => handleDateRangeSelection(db, elements); startDatePicker.addEventListener('change', dateRangeChangeHandler); endDatePicker.addEventListener('change', dateRangeChangeHandler); }
        if (changePasswordBtn) changePasswordBtn.addEventListener('click', () => { auth.sendPasswordResetEmail(auth.currentUser.email).then(() => showNotification('تم إرسال رابط التغيير.', 'success')).catch(err => showNotification('خطأ: ' + err.message, 'error')); });
        if (logoForm) logoForm.addEventListener('submit', (e) => { e.preventDefault(); db.ref('settings/logoUrl').set(elements.logoUrlInput.value).then(() => showNotification('تم تحديث الشعار.', 'success')); });
        if (contactPlatformSelect) contactPlatformSelect.addEventListener('change', () => toggleContactInputs(elements));
        if (paymentContactForm) paymentContactForm.addEventListener('submit', (e) => { e.preventDefault(); db.ref('settings/paymentContact').set({ contactPlatform: elements.contactPlatformSelect.value, contactInfo: elements.contactInfoInput.value, contactOther: elements.contactOtherInput.value }).then(() => showNotification('تم حفظ بيانات التواصل.', 'success')); });
        if (addPaymentMethodForm) addPaymentMethodForm.addEventListener('submit', (e) => { e.preventDefault(); const name = elements.paymentMethodNameInput.value.trim(); const details = elements.paymentMethodDetailsInput.value.trim(); const requiresProof = elements.paymentMethodRequiresProofInput.checked; if (name) { db.ref('settings/paymentMethods').push({ name, details, requiresProof }).then(() => { showNotification('تمت إضافة طريقة الدفع.', 'success'); addPaymentMethodForm.reset(); }); } });
        if (editPaymentMethodForm) editPaymentMethodForm.addEventListener('submit', (e) => { e.preventDefault(); const id = elements.editPaymentMethodIdInput.value; const name = elements.editPaymentMethodNameInput.value.trim(); const details = elements.editPaymentMethodDetailsInput.value.trim(); const requiresProof = elements.editPaymentMethodRequiresProofInput.checked; if (id && name) { db.ref(`settings/paymentMethods/${id}`).update({ name, details, requiresProof }).then(() => { showNotification('تم تعديل طريقة الدفع.', 'success'); elements.editPaymentMethodModal.style.display = 'none'; }); } });
        if (elements.bookingModelSelect) elements.bookingModelSelect.addEventListener('change', () => toggleModelInputs(elements));
        if (bookingModelForm) bookingModelForm.addEventListener('submit', (e) => { e.preventDefault(); db.ref('settings').update({ bookingModel: elements.bookingModelSelect.value, slotDuration: parseInt(elements.slotDurationInput.value, 10), dailyCapacity: parseInt(elements.dailyCapacityInput.value, 10) }).then(() => showNotification('تم حفظ النموذج.', 'success')); });
        if (requireConfirmationToggle) requireConfirmationToggle.addEventListener('change', (e) => { const isEnabled = e.target.checked; if (elements.bookingsManagementSection) elements.bookingsManagementSection.style.display = isEnabled ? 'block' : 'none'; db.ref('settings/requireConfirmation').set(isEnabled).then(() => showNotification('تم تحديث نظام التأكيد.', 'success')); });
        if (scheduleForm) { document.querySelectorAll('input[name="workday_mode"], input[name="break_mode"]').forEach(radio => radio.addEventListener('change', toggleScheduleControls)); scheduleForm.addEventListener('change', (e) => { if (e.target.classList.contains('active-checkbox')) { const dayItem = e.target.closest('.day-schedule-item'); if (dayItem) dayItem.querySelector('.day-inputs').style.display = e.target.checked ? 'flex' : 'none'; } }); scheduleForm.addEventListener('submit', (e) => { e.preventDefault(); const scheduleSettings = { workdayMode: document.querySelector('input[name="workday_mode"]:checked').value, breakMode: document.querySelector('input[name="break_mode"]:checked').value, unifiedBreakStart: scheduleForm.querySelector('#unified-break-start').value, unifiedBreakEnd: scheduleForm.querySelector('#unified-break-end').value }; document.querySelector('.schedule-grid').querySelectorAll('.day-schedule-item').forEach(item => { const dayCheckbox = item.querySelector('.active-checkbox'); const day = dayCheckbox.dataset.day; const inputs = item.querySelectorAll('input[type="time"]'); scheduleSettings[day] = { active: dayCheckbox.checked, open: inputs[0].value, close: inputs[1].value, breakStart: inputs[2].value, breakEnd: inputs[3].value }; }); db.ref('settings/schedule').set(scheduleSettings).then(() => showNotification('تم حفظ أوقات العمل.', 'success')); }); }
        if (addServiceForm) addServiceForm.addEventListener('submit', (e) => { e.preventDefault(); const name = elements.serviceNameInput.value.trim(); const price = parseFloat(elements.servicePriceInput.value); if (name && !isNaN(price) && price >= 0) { db.ref('services').push({ name, price }).then(() => { showNotification('تمت إضافة الخدمة.', 'success'); addServiceForm.reset(); }); } else { showNotification('بيانات غير صحيحة.', 'error'); } });
        if (editServiceForm) editServiceForm.addEventListener('submit', (e) => { e.preventDefault(); const serviceId = elements.editServiceIdInput.value; const newName = elements.editServiceNameInput.value.trim(); const newPrice = parseFloat(elements.editServicePriceInput.value); if (serviceId && newName && !isNaN(newPrice)) { db.ref(`services/${serviceId}`).update({ name: newName, price: newPrice }).then(() => { showNotification('تم تعديل الخدمة.', 'success'); elements.editServiceModal.style.display = 'none'; }); } });

        // --- المستمعون الجدد لنظام فريق العمل (النسخة الصحيحة) ---
        if (addBarberForm) { addBarberForm.addEventListener('submit', (e) => handleAddBarber(e, db, storage)); }
        if (barbersListContainer) { barbersListContainer.addEventListener('click', (e) => handleDeleteBarber(e, db, storage)); }

        if (closeEditServiceModalBtn) closeEditServiceModalBtn.onclick = () => { elements.editServiceModal.style.display = 'none'; };
        if (closeEditPaymentMethodModalBtn) closeEditPaymentMethodModalBtn.onclick = () => { elements.editPaymentMethodModal.style.display = 'none'; };
        window.onclick = (e) => { if (e.target == elements.editServiceModal) elements.editServiceModal.style.display = "none"; if (e.target == elements.editPaymentMethodModal) elements.editPaymentMethodModal.style.display = "none"; };

        window.openEditServiceModal = (id, name, price) => { elements.editServiceIdInput.value = id; elements.editServiceNameInput.value = name; elements.editServicePriceInput.value = price; elements.editServiceModal.style.display = 'block'; };
        window.openEditPaymentMethodModal = (id, name, details, requiresProof) => { elements.editPaymentMethodIdInput.value = id; elements.editPaymentMethodNameInput.value = name; elements.editPaymentMethodDetailsInput.value = details; elements.editPaymentMethodRequiresProofInput.checked = requiresProof; elements.editPaymentMethodModal.style.display = 'block'; };
        window.handlePaymentMethodAction = (id) => { if (confirm('هل أنت متأكد من حذف طريقة الدفع هذه؟')) { db.ref(`settings/paymentMethods/${id}`).remove().then(() => showNotification('تم حذف طريقة الدفع.', 'success')); } };
        window.handleBooking = (id, action) => { const updates = {}; if (action === 'approve') { updates[`/bookings/${id}/status`] = 'approved'; updates[`/publicBookings/${id}/status`] = 'approved'; db.ref().update(updates).then(() => showNotification('تم قبول الحجز.', 'success')); } else if (action === 'delete' || action === 'reject') { if (!confirm('هل أنت متأكد من حذف هذا الحجز نهائياً؟')) return; updates[`/bookings/${id}`] = null; updates[`/publicBookings/${id}`] = null; db.ref().update(updates).then(() => showNotification('تم حذف الحجز.', 'success')); } };
        window.handleServiceAction = (id) => { if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) { db.ref(`services/${id}`).remove().then(() => showNotification('تم حذف الخدمة.', 'success')); } };
    }

    function updateUIFromSettings(settings, elements) {
        if (elements.headerLogo) elements.headerLogo.src = settings.logoUrl || 'logo.png';
        if (elements.logoUrlInput) elements.logoUrlInput.value = settings.logoUrl || '';
        if (settings.paymentContact) {
            if (elements.contactPlatformSelect) elements.contactPlatformSelect.value = settings.paymentContact.contactPlatform || 'whatsapp';
            if (elements.contactInfoInput) elements.contactInfoInput.value = settings.paymentContact.contactInfo || '';
            if (elements.contactOtherInput) elements.contactOtherInput.value = settings.paymentContact.contactOther || '';
            toggleContactInputs(elements);
        }
        renderPaymentMethods(settings.paymentMethods || {}, elements);
        renderBarbersList(settings.barbers || [], elements);
        if (elements.bookingModelSelect) elements.bookingModelSelect.value = settings.bookingModel || 'slots';
        toggleModelInputs(elements);
        if (elements.slotDurationInput) elements.slotDurationInput.value = settings.slotDuration || 30;
        if (elements.dailyCapacityInput) elements.dailyCapacityInput.value = settings.dailyCapacity || 15;
        const isConfirmationRequired = (settings.requireConfirmation === undefined) ? true : settings.requireConfirmation;
        if (elements.requireConfirmationToggle) elements.requireConfirmationToggle.checked = isConfirmationRequired;
        if (elements.bookingsManagementSection) elements.bookingsManagementSection.style.display = isConfirmationRequired ? 'block' : 'none';
        const scheduleSettings = settings.schedule || {};
        renderScheduleGrid(scheduleSettings);
        const workdayMode = scheduleSettings.workdayMode || 'all';
        const breakMode = scheduleSettings.breakMode || 'unified';
        const workdayRadio = document.querySelector(`input[name="workday_mode"][value="${workdayMode}"]`); if (workdayRadio) workdayRadio.checked = true;
        const breakRadio = document.querySelector(`input[name="break_mode"][value="${breakMode}"]`); if (breakRadio) breakRadio.checked = true;
        const scheduleForm = document.getElementById('schedule-form');
        if (scheduleForm) {
            scheduleForm.querySelector('#unified-break-start').value = scheduleSettings.unifiedBreakStart || '14:00';
            scheduleForm.querySelector('#unified-break-end').value = scheduleSettings.unifiedBreakEnd || '15:00';
        }
        toggleScheduleControls();
    }

    function renderScheduleGrid(scheduleData = {}) { const scheduleGrid = document.querySelector('.schedule-grid'); if (!scheduleGrid) return; scheduleGrid.innerHTML = ''; const days = { saturday: 'السبت', sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة' }; for (const day in days) { const dayData = scheduleData[day] || { active: true, open: '09:00', close: '21:00', breakStart: '', breakEnd: '' }; const dayDiv = document.createElement('div'); dayDiv.className = 'day-schedule-item'; dayDiv.innerHTML = `<h4>${days[day]}</h4><div class="day-controls"><label class="workday-checkbox-label" style="display:none;"><input type="checkbox" data-day="${day}" class="active-checkbox" ${dayData.active ? 'checked' : ''}> يوم عمل</label></div><div class="day-inputs" style="display:${dayData.active ? 'flex' : 'none'}"><div class="time-input-group"><div class="time-pair"><label>من:</label><input type="time" data-day="${day}" data-type="open" value="${dayData.open}"></div><div class="time-pair"><label>إلى:</label><input type="time" data-day="${day}" data-type="close" value="${dayData.close}"></div></div><div class="break-inputs" style="display:none;"><label>فترة الراحة:</label><div class="time-input-group"><div class="time-pair"><label>من:</label><input type="time" data-day="${day}" data-type="breakStart" value="${dayData.breakStart}"></div><div class="time-pair"><label>إلى:</label><input type="time" data-day="${day}" data-type="breakEnd" value="${dayData.breakEnd}"></div></div></div></div>`; scheduleGrid.appendChild(dayDiv); } }
    function toggleScheduleControls() { const scheduleGrid = document.querySelector('.schedule-grid'); const unifiedBreakInputsContainer = document.getElementById('unified-break-inputs'); if (!scheduleGrid || !unifiedBreakInputsContainer) return; const workdayMode = document.querySelector('input[name="workday_mode"]:checked').value; const breakMode = document.querySelector('input[name="break_mode"]:checked').value; scheduleGrid.querySelectorAll('.workday-checkbox-label').forEach(label => label.style.display = (workdayMode === 'custom') ? 'flex' : 'none'); if (workdayMode === 'all') { scheduleGrid.querySelectorAll('.active-checkbox').forEach(chk => { chk.checked = true; const dayItem = chk.closest('.day-schedule-item'); if (dayItem) dayItem.querySelector('.day-inputs').style.display = 'flex'; }); } unifiedBreakInputsContainer.style.display = (breakMode === 'unified') ? 'block' : 'none'; scheduleGrid.querySelectorAll('.break-inputs').forEach(div => div.style.display = (breakMode === 'custom') ? 'block' : 'none'); }
    function createBookingItem(booking) { const item = document.createElement('div'); item.className = `booking-item ${booking.status || 'default'}`; const timeDisplay = booking.time ? `<strong>${formatTo12Hour(booking.time)}</strong>` : 'غير محدد'; const services = booking.services || []; const servicesDisplay = services.length > 0 ? services.map(s => `${s.name} (${s.price} ج)`).join('، ') : 'خدمة غير محددة'; let actionButtons = ''; if (booking.status === 'pending') { actionButtons = `<button class="btn btn-primary" onclick="window.handleBooking('${booking.id}', 'approve')">قبول</button> <button class="btn btn-danger" onclick="window.handleBooking('${booking.id}', 'reject')">رفض</button>`; } else if (booking.status === 'approved') { actionButtons = `<button class="btn btn-danger" onclick="window.handleBooking('${booking.id}', 'reject')">إلغاء الحجز</button>`; } item.innerHTML = `<div class="booking-details"><strong>${booking.fullName}</strong><br><small><strong>الهاتف:</strong> ${booking.phone || 'غير مسجل'}</small><br><small><strong>رقم الحجز:</strong> #${booking.bookingCode || 'N/A'}</small><hr><small><strong>التاريخ:</strong> ${booking.date} - <strong>الوقت:</strong> ${timeDisplay}</small><br><small><strong>${THEME_CONFIG.entity}:</strong> ${booking.selectedBarber || 'غير محدد'}</small><br><small><strong>الخدمات:</strong> ${servicesDisplay}</small><br><small><strong>الإجمالي:</strong> ${booking.totalPrice !== undefined ? `<strong>${booking.totalPrice} جنيه</strong>` : 'غير محدد'}</small><br><small><strong>الدفع:</strong> ${booking.paymentMethod || 'غير محدد'}</small></div><div class="booking-actions">${actionButtons}</div>`; return item; }
    function handleDateRangeSelection(db, elements) { const { startDatePicker, endDatePicker, viewerResultsContainer, bookingCountDisplay } = elements; const startDate = startDatePicker.value; const endDate = endDatePicker.value; viewerResultsContainer.innerHTML = '<p class="note">الرجاء اختيار فترة زمنية.</p>'; bookingCountDisplay.textContent = 0; if (!startDate || !endDate || endDate < startDate) return; db.ref('bookings').orderByChild('date').startAt(startDate).endAt(endDate).once('value', snapshot => { const bookingsData = snapshot.val() || {}; const filtered = Object.values(bookingsData).filter(b => b.status === 'approved').sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))); viewerResultsContainer.innerHTML = ''; bookingCountDisplay.textContent = filtered.length; if (filtered.length > 0) filtered.forEach(booking => viewerResultsContainer.appendChild(createBookingItem(booking))); else viewerResultsContainer.innerHTML = '<p class="note">لا توجد حجوزات مؤكدة في هذه الفترة.</p>'; }); }
    function updateDashboard(bookings, elements) { const { pendingCount, todayCount, totalCount } = elements; if (!pendingCount || !todayCount || !totalCount) return; const todayStr = toYYYYMMDD(new Date()); const thirtyDaysAgoStr = toYYYYMMDD(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); pendingCount.textContent = bookings.filter(b => b.status === 'pending').length; todayCount.textContent = bookings.filter(b => b.date === todayStr && b.status === 'approved').length; totalCount.textContent = bookings.filter(b => b.date >= thirtyDaysAgoStr && b.status === 'approved').length; }
    function toggleContactInputs(elements) { const { contactPlatformSelect, contactOtherInput, contactInfoInput } = elements; if (!contactPlatformSelect || !contactOtherInput || !contactInfoInput) return; contactOtherInput.style.display = (contactPlatformSelect.value === 'other') ? 'block' : 'none'; contactInfoInput.placeholder = (contactPlatformSelect.value === 'other') ? 'اكتب الوسيلة هنا...' : 'اكتب الرقم هنا...'; }
    function toggleModelInputs(elements) { const { bookingModelSelect, capacityInputContainer, slotsInputContainer } = elements; if (!bookingModelSelect || !capacityInputContainer || !slotsInputContainer) return; slotsInputContainer.style.display = (bookingModelSelect.value === 'slots') ? 'block' : 'none'; capacityInputContainer.style.display = (bookingModelSelect.value === 'capacity') ? 'block' : 'none'; }
    function renderServices(servicesData, elements) { const { servicesList } = elements; if (!servicesList) return; servicesList.innerHTML = ''; const serviceIds = Object.keys(servicesData); if (serviceIds.length === 0) { servicesList.innerHTML = `<p class="note">لا توجد خدمات.</p>`; return; } serviceIds.forEach(id => { const service = servicesData[id]; const item = document.createElement('div'); item.className = 'service-item'; item.innerHTML = `<span><strong>${service.name}</strong> - ${service.price} جنيه</span><div><button class="btn btn-primary btn-small" onclick="window.openEditServiceModal('${id}', '${service.name}', ${service.price})">تعديل</button><button class="btn btn-danger btn-small" onclick="window.handleServiceAction('${id}')">حذف</button></div>`; servicesList.appendChild(item); }); }

    function renderBarbersList(barbersArray = [], elements) {
        const { barbersListContainer } = elements;
        if (!barbersListContainer) return;

        barbersListContainer.innerHTML = '';
        if (barbersArray && Array.isArray(barbersArray) && barbersArray.length > 0) {
            barbersArray.forEach((barber, index) => {
                if (!barber) return;
                const item = document.createElement('div');
                item.className = 'list-item barber-list-item';
                item.innerHTML = `
                    <img src="${barber.imageUrl}" alt="${barber.name}" class="barber-list-avatar">
                    <div class="barber-list-details">
                        <strong>${barber.name}</strong>
                        <p>${barber.description || 'لا يوجد وصف.'}</p>
                    </div>
                    <button class="btn btn-danger delete-barber-btn" data-index="${index}">حذف</button>
                `;
                barbersListContainer.appendChild(item);
            });
        } else {
            barbersListContainer.innerHTML = `<p class="note">لا يوجد ${THEME_CONFIG.entityPlural} مضافين حالياً.</p>`;
        }
    }

    async function handleAddBarber(e, db, storage) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'جاري الرفع...';

        const name = document.getElementById('new-barber-name').value.trim();
        const description = document.getElementById('new-barber-description').value.trim();
        const photoFile = document.getElementById('new-barber-photo').files[0];

        if (!name || !description || !photoFile) {
            showNotification('الرجاء ملء جميع الحقول ورفع صورة.', 'error');
            btn.disabled = false;
            btn.textContent = 'إضافة العضو';
            return;
        }

        try {
            const photoPath = `barber_photos/${Date.now()}_${photoFile.name}`;
            const uploadTask = storage.ref(photoPath).put(photoFile);
            await uploadTask;
            const imageUrl = await uploadTask.snapshot.ref.getDownloadURL();
            const barbersRef = db.ref('settings/barbers');
            const snapshot = await barbersRef.once('value');
            const currentBarbers = snapshot.val() || [];
            const newBarber = { name, description, imageUrl, photoPath };
            currentBarbers.push(newBarber);
            await barbersRef.set(currentBarbers);
            showNotification('تمت إضافة العضو بنجاح!', 'success');
            e.target.reset();
        } catch (error) {
            console.error("Error adding barber:", error);
            showNotification('حدث خطأ أثناء إضافة العضو.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'إضافة العضو';
        }
    }

    async function handleDeleteBarber(e, db, storage) {
        if (!e.target.classList.contains('delete-barber-btn')) return;
        if (!confirm(`هل أنت متأكد من رغبتك في حذف هذا الـ${THEME_CONFIG.entity}؟ سيتم حذف بياناته وصورته نهائيًا.`)) return;

        const indexToDelete = parseInt(e.target.dataset.index, 10);
        const barbersRef = db.ref('settings/barbers');

        try {
            const snapshot = await barbersRef.once('value');
            const currentBarbers = snapshot.val() || [];
            const barberToDelete = currentBarbers[indexToDelete];
            if (barberToDelete && barberToDelete.photoPath) {
                await storage.ref(barberToDelete.photoPath).delete().catch(err => {
                    if (err.code !== 'storage/object-not-found') throw err;
                });
            }
            currentBarbers.splice(indexToDelete, 1);
            await barbersRef.set(currentBarbers);
            showNotification('تم حذف العضو بنجاح.', 'success');
        } catch (error) {
            console.error("Error deleting barber:", error);
            showNotification('حدث خطأ أثناء حذف العضو.', 'error');
        }
    }

    function renderPaymentMethods(methodsData = {}, elements) { const { paymentMethodsList } = elements; if (!paymentMethodsList) return; paymentMethodsList.innerHTML = ''; const methodIds = Object.keys(methodsData); if (methodIds.length === 0) { paymentMethodsList.innerHTML = '<p class="note">لا توجد طرق دفع.</p>'; return; } methodIds.forEach(id => { const method = methodsData[id]; const item = document.createElement('div'); item.className = 'service-item'; let proofText = method.requiresProof ? '<br><small style="color: #c6a328; font-weight: bold;">(يتطلب إثبات دفع)</small>' : '<br><small style="color: #66bb6a;">(لا يتطلب إثبات دفع)</small>'; item.innerHTML = `<span><strong>${method.name}</strong><br><small>${method.details || '...'}</small>${proofText}</span><div><button class="btn btn-primary btn-small" onclick="window.openEditPaymentMethodModal('${id}', '${method.name}', '${method.details || ''}', ${!!method.requiresProof})">تعديل</button><button class="btn btn-danger btn-small" onclick="window.handlePaymentMethodAction('${id}')">حذف</button></div>`; paymentMethodsList.appendChild(item); }); }
    function renderAdvancedCharts(bookingsArray) { const approvedBookings = bookingsArray.filter(b => b.status === 'approved'); const monthlyCtx = document.getElementById('monthlyBookingsChart').getContext('2d'); const monthlyCounts = approvedBookings.reduce((acc, booking) => { const month = booking.date.substring(0, 7); acc[month] = (acc[month] || 0) + 1; return acc; }, {}); if (charts.monthly) charts.monthly.destroy(); charts.monthly = new Chart(monthlyCtx, { type: 'bar', data: { labels: Object.keys(monthlyCounts).sort(), datasets: [{ label: 'إجمالي الحجوزات', data: Object.values(monthlyCounts), backgroundColor: 'rgba(212, 175, 55, 0.7)', borderColor: 'rgba(212, 175, 55, 1)', borderWidth: 1 }] }, options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } }); const servicesCtx = document.getElementById('topServicesChart').getContext('2d'); const serviceCounts = approvedBookings.flatMap(b => b.services || []).reduce((acc, service) => { acc[service.name] = (acc[service.name] || 0) + 1; return acc; }, {}); if (charts.services) charts.services.destroy(); charts.services = new Chart(servicesCtx, { type: 'doughnut', data: { labels: Object.keys(serviceCounts), datasets: [{ label: 'عدد الطلبات', data: Object.values(serviceCounts), backgroundColor: ['#d4af37', '#3e6e6e', '#f0f0f0', '#1d1d1d', '#c8a02b'], }] } }); const revenueCtx = document.getElementById('serviceRevenueChart').getContext('2d'); const serviceRevenue = approvedBookings.flatMap(b => b.services || []).reduce((acc, service) => { acc[service.name] = (acc[service.name] || 0) + service.price; return acc; }, {}); if (charts.revenue) charts.revenue.destroy(); charts.revenue = new Chart(revenueCtx, { type: 'bar', data: { labels: Object.keys(serviceRevenue), datasets: [{ label: `إجمالي الإيرادات (بالجنيه)`, data: Object.values(serviceRevenue), backgroundColor: 'rgba(46, 125, 50, 0.7)', borderColor: 'rgba(46, 125, 50, 1)', borderWidth: 1 }] }, options: { scales: { y: { beginAtZero: true } } } }); const daysCtx = document.getElementById('busiestDaysChart').getContext('2d'); const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; const dayCounts = [0, 0, 0, 0, 0, 0, 0]; approvedBookings.forEach(booking => { const dayIndex = new Date(booking.date).getUTCDay(); dayCounts[dayIndex]++; }); if (charts.days) charts.days.destroy(); charts.days = new Chart(daysCtx, { type: 'bar', data: { labels: dayNames, datasets: [{ label: 'عدد الحجوزات', data: dayCounts, backgroundColor: 'rgba(29, 29, 29, 0.8)', borderColor: 'rgba(29, 29, 29, 1)', borderWidth: 1 }] }, options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } }); }
});