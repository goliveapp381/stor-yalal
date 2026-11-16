
(() => {
    'use strict';

    // ==========================================
    // 1. AUTHENTICATION
    // ==========================================

    function clearAuthentication() {
        try {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
        } catch (error) {
            console.error('Clear authentication error:', error);
        }
    }

    let storedUser;
    let authToken;
    let user;

    try {
        storedUser = localStorage.getItem('user');

        authToken =
            localStorage.getItem('token') ||
            localStorage.getItem('authToken');

        if (!storedUser || !authToken) {
            throw new Error('بيانات تسجيل الدخول غير موجودة');
        }

        user = JSON.parse(storedUser);

        if (
            !user ||
            typeof user !== 'object' ||
            Array.isArray(user)
        ) {
            throw new Error('بيانات المستخدم غير صالحة');
        }

        if (!localStorage.getItem('token')) {
            localStorage.setItem('token', authToken);
        }

    } catch (error) {
        console.error('Authentication error:', error);
        clearAuthentication();
        window.location.replace('login.html');
        return;
    }


    // ==========================================
    // 2. USER INFORMATION
    // ==========================================

    const welcomeElement =
        document.getElementById('user-welcome');

    if (welcomeElement) {
        welcomeElement.textContent =
            user.username ||
            user.name ||
            user.email ||
            'مستخدم';
    }


    // ==========================================
    // 3. CONFIGURATION
    // ==========================================

    const CURRENT_DOMAIN_ROOT = 'templatecraftpro.com';

    const AUTO_REFRESH_INTERVAL = 30000;

    const DOMAIN_DIAGNOSTICS_ENDPOINT = siteId =>
        `/api/site/${encodeURIComponent(siteId)}/domain-status`;

    let isLoading = false;
    let autoRefreshTimer = null;
    let lastSites = [];

    const diagnosticsCache = new Map();
    const diagnosticsInProgress = new Set();


    // ==========================================
    // 4. GENERAL HELPERS
    // ==========================================

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }


    function normalizeHostname(hostname) {
        return String(hostname || '')
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//i, '')
            .split('/')[0]
            .split('?')[0]
            .split('#')[0]
            .replace(/:\d+$/, '')
            .replace(/\.+$/, '');
    }


    function isAllowedCustomDomain(hostname) {
        const normalized =
            normalizeHostname(hostname);

        if (
            !normalized ||
            normalized === CURRENT_DOMAIN_ROOT
        ) {
            return false;
        }

        return normalized.endsWith(
            '.' + CURRENT_DOMAIN_ROOT
        );
    }


    function getSafeProjectUrl(site) {
        if (!site || typeof site !== 'object') {
            return null;
        }

        if (
            String(site.domainStatus || '').toLowerCase() !==
            'active'
        ) {
            return null;
        }

        const rawUrl =
            site.customUrl ||
            site.customDomain;

        if (
            !rawUrl ||
            typeof rawUrl !== 'string'
        ) {
            return null;
        }

        try {
            const parsed = new URL(
                rawUrl.includes('://')
                    ? rawUrl
                    : `https://${rawUrl}`
            );

            if (
                parsed.protocol !== 'https:' ||
                parsed.username ||
                parsed.password ||
                parsed.port
            ) {
                return null;
            }

            const hostname =
                normalizeHostname(parsed.hostname);

            if (!isAllowedCustomDomain(hostname)) {
                return null;
            }

            parsed.hash = '';
            parsed.search = '';

            return parsed.href;

        } catch (error) {
            console.warn('Invalid project URL:', error);
            return null;
        }
    }


    function getProjectState(site) {
        return String(
            site?.publishStatus || ''
        ).toLowerCase();
    }


    function isProjectDeleting(site) {
        return getProjectState(site) === 'deleting';
    }


    function isProjectPublishing(site) {
        return getProjectState(site) === 'publishing';
    }


    function getProjectId(site) {
        return (
            site?._id ||
            site?.id ||
            site?.siteId ||
            null
        );
    }


    function getProjectName(site) {
        return (
            site?.variables?.displayName ||
            site?.siteName ||
            'مشروع بدون اسم'
        );
    }


    function getProjectDate(site) {
        if (!site?.createdAt) {
            return '-';
        }

        const date = new Date(site.createdAt);

        if (Number.isNaN(date.getTime())) {
            return '-';
        }

        return date.toLocaleDateString('ar-MA');
    }


    function normalizeSitesResponse(result) {
        if (!result || typeof result !== 'object') {
            return null;
        }

        if (Array.isArray(result.sites)) {
            return result.sites;
        }

        if (Array.isArray(result.projects)) {
            return result.projects;
        }

        if (Array.isArray(result.data)) {
            return result.data;
        }

        if (
            result.data &&
            typeof result.data === 'object'
        ) {
            if (Array.isArray(result.data.sites)) {
                return result.data.sites;
            }

            if (Array.isArray(result.data.projects)) {
                return result.data.projects;
            }

            if (Array.isArray(result.data.data)) {
                return result.data.data;
            }
        }

        return null;
    }


    // ==========================================
    // 5. STATISTICS
    // ==========================================

    function updateStatistics(sites) {
        const safeSites =
            Array.isArray(sites) ? sites : [];

        const total = safeSites.length;

        const published =
            safeSites.filter(site =>
                Boolean(getSafeProjectUrl(site))
            ).length;

        const pending =
            safeSites.filter(site =>
                !getSafeProjectUrl(site) &&
                !isProjectDeleting(site)
            ).length;

        const totalElement =
            document.getElementById('total-projects');

        const publishedElement =
            document.getElementById('published-projects');

        const pendingElement =
            document.getElementById('pending-projects');

        if (totalElement) {
            totalElement.textContent = total;
        }

        if (publishedElement) {
            publishedElement.textContent = published;
        }

        if (pendingElement) {
            pendingElement.textContent = pending;
        }
    }


    // ==========================================
    // 6. DOMAIN STATUS DISPLAY
    // ==========================================

    function getDomainStatus(site, projectUrl) {
        if (projectUrl) {
            return null;
        }

        if (isProjectDeleting(site)) {
            return {
                type: 'deleting',
                label: 'جاري حذف المشروع',
                description:
                    'يتم الآن حذف المشروع. يرجى الانتظار.',
                icon: '🗑️'
            };
        }

        if (isProjectPublishing(site)) {
            return {
                type: 'publishing',
                label: 'جاري نشر المشروع',
                description:
                    'يتم الآن نشر المشروع.',
                icon: '🚀'
            };
        }

        const status =
            String(site?.domainStatus || '').toLowerCase();

        if (
            status === 'failed' ||
            status === 'error'
        ) {
            return {
                type: 'error',
                label: 'تعذر تجهيز الدومين',
                description:
                    site.domainError ||
                    site.error ||
                    'تعذر إكمال إعداد الدومين. يرجى مراجعة حالة المشروع.',
                icon: '⚠️'
            };
        }

        if (status === 'active') {
            return {
                type: 'waiting',
                label: 'الدومين يحتاج إلى مراجعة',
                description:
                    'حالة الدومين نشطة لكن الرابط لم يجتز التحقق الأمني.',
                icon: '⚠️'
            };
        }

        return {
            type: 'waiting',
            label: 'جاري تجهيز الدومين',
            description:
                'يتم التحقق من إعداد الدومين وشهادة SSL. سيظهر الرابط عند اكتمال العملية.',
            icon: '⏳'
        };
    }


    // ==========================================
    // 7. AUTHENTICATION ERROR
    // ==========================================

    function getResponseStatus(result) {
        return Number(
            result?.status ||
            result?.statusCode ||
            result?.response?.status ||
            result?.response?.statusCode ||
            0
        );
    }


    function handleAuthenticationError(result) {
        const status = getResponseStatus(result);

        if (status === 401) {
            clearAuthentication();
            window.location.replace('login.html');
            return true;
        }

        return false;
    }


    // ==========================================
    // 8. EMPTY STATE
    // ==========================================

    function renderEmptyState() {
        const grid =
            document.getElementById('sites-grid');

        if (!grid) {
            return;
        }

        grid.innerHTML = `
            <div class="col-span-full text-center py-16">

                <div class="empty-icon">
                    <i class="fa-solid fa-rocket"></i>
                </div>

                <h3 class="text-lg font-bold mb-2">
                    مساحة عملك جاهزة!
                </h3>

                <p class="text-slate-400 text-sm mb-6">
                    لم تنشئ أي مشروع بعد. ابدأ مشروعك الأول الآن.
                </p>

                <a
                    href="create-project.html"
                    class="btn-primary inline-block px-6 py-3 rounded-xl text-sm font-bold"
                >
                    <i class="fa-solid fa-plus ml-2"></i>
                    إنشاء أول مشروع
                </a>

            </div>
        `;
    }


    // ==========================================
    // 9. SSL DIAGNOSTICS API
    // ==========================================

    async function requestDomainDiagnostics(siteId) {
        if (typeof TemplateCraftAPI === 'undefined') {
            throw new Error(
                'نظام الاتصال بالخادم غير متوفر.'
            );
        }

        if (!siteId) {
            throw new Error(
                'معرف المشروع غير موجود.'
            );
        }

        // الطريقة الأولى: الدالة المخصصة
        if (
            typeof TemplateCraftAPI.getDomainDiagnostics ===
            'function'
        ) {
            return await TemplateCraftAPI.getDomainDiagnostics(
                siteId
            );
        }

        // الطريقة الثانية: request العام
        if (
            typeof TemplateCraftAPI.request === 'function'
        ) {
            return await TemplateCraftAPI.request(
                DOMAIN_DIAGNOSTICS_ENDPOINT(siteId),
                {
                    method: 'GET'
                }
            );
        }

        throw new Error(
            'دالة الاتصال بفحص SSL غير موجودة في client-api.js.'
        );
    }


    function getDiagnosticPayload(result) {
        if (!result || typeof result !== 'object') {
            return {};
        }

        let payload = result;

        for (let i = 0; i < 3; i++) {
            if (
                payload.data &&
                typeof payload.data === 'object' &&
                !Array.isArray(payload.data)
            ) {
                payload = {
                    ...payload.data,
                    requestId:
                        payload.requestId ||
                        payload.data.requestId
                };
            } else {
                break;
            }
        }

        return payload;
    }


    function getDiagnosticChecks(payload) {
        return (
            payload?.checks ||
            payload?.diagnostics ||
            payload?.results ||
            {}
        );
    }


    function getCheckState(check) {
        if (
            !check ||
            typeof check !== 'object'
        ) {
            return 'unknown';
        }

        if (
            check.sslReady === true ||
            check.ok === true ||
            check.success === true
        ) {
            return 'success';
        }

        if (
            check.statusCheckSucceeded === false
        ) {
            return 'unknown';
        }

        if (
            check.ok === false ||
            check.success === false ||
            check.error ||
            check.readError
        ) {
            return 'error';
        }

        if (
            check.attached === false ||
            check.present === false ||
            check.matches === false ||
            check.domainMatches === false
        ) {
            return 'error';
        }

        return 'pending';
    }


    function getCheckIcon(state) {
        if (state === 'success') {
            return '✅';
        }

        if (state === 'error') {
            return '❌';
        }

        if (state === 'unknown') {
            return '❔';
        }

        return '⏳';
    }


    function getCheckLabel(key) {
        const labels = {
            database: 'اتصال قاعدة البيانات',
            netlifyCredentials: 'حساب Netlify OAuth',
            credentials: 'بيانات Netlify',
            netlifySite: 'وجود موقع Netlify',
            site: 'موقع Netlify',
            customDomain: 'ربط الدومين',
            domain: 'الدومين الخاص',
            dns: 'إعدادات DNS',
            cname: 'سجل CNAME',
            a: 'سجل A',
            aaaa: 'سجل AAAA',
            txt: 'سجل TXT للتحقق',
            txtChallenge: 'التحقق من TXT',
            challenge: 'التحقق من TXT',
            ssl: 'حالة SSL',
            certificate: 'شهادة SSL',
            cloudflare: 'Cloudflare',
            ownership: 'ملكية الموقع',
            verification: 'التحقق من الدومين'
        };

        return labels[key] || key;
    }


    // إخفاء الأسرار والقيم الحساسة فقط
    // مع السماح بعرض حالة فحص Netlify Credentials
    function isSensitiveDiagnosticKey(key) {
        return /access[_-]?token|refresh[_-]?token|client[_-]?secret|password|authorization|rawstatus|rawresponse|verification(?:value|token)|txt(?:content|value)|accesskey|privatekey|cookie|certificatepem|credential(?:value|secret)/i
            .test(String(key));
    }


    function formatDiagnosticValue(value) {
        if (value === true) return 'نعم';
        if (value === false) return 'لا';

        if (
            value === null ||
            value === undefined
        ) {
            return '-';
        }

        if (typeof value === 'object') {
            return '';
        }

        return String(value);
    }


    function renderDiagnosticDetails(object, depth = 0) {
        if (
            !object ||
            typeof object !== 'object' ||
            depth > 3
        ) {
            return '';
        }

        let html = '';

        Object.entries(object).forEach(([key, value]) => {
            if (isSensitiveDiagnosticKey(key)) {
                return;
            }

            if (
                key === 'ok' ||
                key === 'success' ||
                key === 'statusCheckSucceeded'
            ) {
                return;
            }

            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value)
            ) {
                html += `
                    <div class="mt-2">
                        <div class="text-xs font-bold text-slate-300 mb-1">
                            ${escapeHtml(getCheckLabel(key))}
                        </div>

                        ${renderDiagnosticDetails(value, depth + 1)}
                    </div>
                `;

                return;
            }

            if (Array.isArray(value)) {
                if (!value.length) {
                    return;
                }

                const safeValues = value
                    .filter(item =>
                        typeof item !== 'object' &&
                        !isSensitiveDiagnosticKey(key)
                    )
                    .map(item => String(item));

                if (safeValues.length) {
                    html += `
                        <div class="text-xs text-slate-400 mt-1 break-words">
                            ${escapeHtml(getCheckLabel(key))}:
                            ${escapeHtml(safeValues.join(', '))}
                        </div>
                    `;
                }

                return;
            }

            const formatted =
                formatDiagnosticValue(value);

            if (!formatted) {
                return;
            }

            html += `
                <div class="text-xs text-slate-400 mt-1 break-words">
                    ${escapeHtml(getCheckLabel(key))}:
                    ${escapeHtml(formatted)}
                </div>
            `;
        });

        return html;
    }


    function renderDiagnosticChecks(checks) {
        if (
            !checks ||
            typeof checks !== 'object' ||
            Array.isArray(checks)
        ) {
            return `
                <p class="text-xs text-slate-400">
                    لم يرجع السيرفر تفاصيل الفحوصات.
                </p>
            `;
        }

        let html = '';

        Object.entries(checks).forEach(([key, check]) => {
            if (isSensitiveDiagnosticKey(key)) {
                return;
            }

            if (
                !check ||
                typeof check !== 'object' ||
                Array.isArray(check)
            ) {
                return;
            }

            const state = getCheckState(check);

            html += `
                <div class="rounded-lg border border-white/10 bg-black/10 p-3 mb-2">

                    <div class="flex items-center gap-2">

                        <span>${getCheckIcon(state)}</span>

                        <strong class="text-sm text-white">
                            ${escapeHtml(getCheckLabel(key))}
                        </strong>

                    </div>

                    ${renderDiagnosticDetails(check)}

                </div>
            `;
        });

        return html || `
            <p class="text-xs text-slate-400">
                لا توجد تفاصيل فحص متاحة.
            </p>
        `;
    }


    function getOverallDiagnosticState(payload) {
        const overall =
            String(
                payload?.overall ||
                payload?.status ||
                ''
            ).toLowerCase();

        if (
            overall === 'ready' ||
            overall === 'active' ||
            overall === 'success'
        ) {
            return 'success';
        }

        if (
            overall === 'unknown' ||
            overall === 'unavailable'
        ) {
            return 'unknown';
        }

        if (
            overall === 'failed' ||
            overall === 'error'
        ) {
            const checks =
                getDiagnosticChecks(payload);

            const ssl = checks?.ssl;

            if (
                ssl &&
                typeof ssl === 'object' &&
                ssl.state === 'unknown'
            ) {
                return 'unknown';
            }

            return 'error';
        }

        const checks =
            getDiagnosticChecks(payload);

        const states =
            Object.values(checks)
                .filter(item =>
                    item && typeof item === 'object'
                )
                .map(getCheckState);

        if (states.includes('error')) {
            return 'error';
        }

        if (
            states.length &&
            states.every(state => state === 'success')
        ) {
            return 'success';
        }

        if (
            states.length &&
            states.every(state => state === 'unknown')
        ) {
            return 'unknown';
        }

        return 'pending';
    }


    function getOverallDiagnosticLabel(state) {
        if (state === 'success') {
            return 'الفحص مكتمل: SSL جاهز';
        }

        if (state === 'error') {
            return 'تم العثور على مشكلة';
        }

        if (state === 'unknown') {
            return 'تعذر التأكد من حالة SSL';
        }

        return 'الفحص مكتمل جزئياً أو ما زال قيد الانتظار';
    }


    // ==========================================
    // 10. DIAGNOSTICS PANEL
    // ==========================================

    function renderDiagnosticsPanel(siteId) {
        const state =
            diagnosticsCache.get(String(siteId));

        if (!state) {
            return '';
        }

        if (state.loading) {
            return `
                <div class="ssl-diagnostics-panel rounded-xl border border-blue-500/30 bg-slate-900 p-4 mt-4">

                    <div class="flex items-center gap-2 text-blue-300 font-bold text-sm">
                        <span class="loading-spinner"></span>
                        جاري فحص الدومين وSSL...
                    </div>

                    <p class="text-xs text-slate-400 mt-2">
                        يتم إجراء فحوصات قراءة فقط. لن يتم تعديل DNS أو إصدار شهادة جديدة.
                    </p>

                </div>
            `;
        }

        const payload =
            state.payload || {};

        const result =
            state.result || {};

        const overallState =
            state.error
                ? 'unknown'
                : getOverallDiagnosticState(payload);

        const requestId =
            payload.requestId ||
            result.requestId ||
            '';

        const message =
            payload.reason ||
            payload.message ||
            result.error ||
            result.message ||
            '';

        const checks =
            getDiagnosticChecks(payload);

        const borderClass =
            overallState === 'success'
                ? 'border-green-500/30'
                : overallState === 'error'
                    ? 'border-red-500/30'
                    : 'border-yellow-500/30';

        return `
            <div class="ssl-diagnostics-panel rounded-xl border ${borderClass} bg-slate-900 p-4 mt-4">

                <div class="flex items-center justify-between gap-2 mb-3">

                    <strong class="text-sm text-white">
                        ${escapeHtml(
                            getOverallDiagnosticLabel(overallState)
                        )}
                    </strong>

                    <span class="text-lg">
                        ${getCheckIcon(overallState)}
                    </span>

                </div>

                ${
                    message
                        ? `
                            <div class="text-xs text-slate-300 leading-6 mb-3 break-words">
                                ${escapeHtml(message)}
                            </div>
                        `
                        : ''
                }

                <div class="space-y-2">
                    ${renderDiagnosticChecks(checks)}
                </div>

                ${
                    requestId
                        ? `
                            <div class="mt-3 pt-3 border-t border-white/10 text-xs text-slate-500 break-all">
                                Request ID:
                                <span dir="ltr">${escapeHtml(requestId)}</span>
                            </div>
                        `
                        : ''
                }

                ${
                    state.error
                        ? `
                            <div class="mt-3 text-xs text-red-300 break-words">
                                ${escapeHtml(state.error)}
                            </div>
                        `
                        : ''
                }

                <div class="text-xs text-slate-500 mt-3">
                    هذا الفحص لا يغير إعدادات DNS ولا يطلب إصدار شهادة SSL.
                </div>

            </div>
        `;
    }


    // ==========================================
    // 11. FIND CURRENT PROJECT CARD
    // ==========================================

    function findProjectCard(siteId) {
        const grid =
            document.getElementById('sites-grid');

        if (!grid) {
            return null;
        }

        const cards =
            grid.querySelectorAll('.project-card');

        return Array.from(cards).find(card =>
            card.dataset.projectId === String(siteId)
        ) || null;
    }


    // ==========================================
    // 12. CHECK SSL ACTION
    // ==========================================

    async function checkProjectSSL(site, button) {
        const siteId = getProjectId(site);

        if (!siteId) {
            alert('معرف المشروع غير موجود.');
            return;
        }

        if (
            isProjectDeleting(site) ||
            isProjectPublishing(site)
        ) {
            alert(
                'لا يمكن فحص SSL أثناء حذف المشروع أو نشره.'
            );
            return;
        }

        const key = String(siteId);

        if (diagnosticsInProgress.has(key)) {
            return;
        }

        diagnosticsInProgress.add(key);

        diagnosticsCache.set(key, {
            loading: true
        });

        const oldText = button.innerHTML;

        button.disabled = true;
        button.classList.add('is-loading');

        button.innerHTML =
            '<span class="loading-spinner ml-1"></span> جاري الفحص';

        const originalCard =
            button.closest('.project-card');

        const originalPanel =
            originalCard?.querySelector(
                '.ssl-diagnostics-container'
            );

        if (originalPanel) {
            originalPanel.innerHTML =
                renderDiagnosticsPanel(siteId);
        }

        try {
            const result =
                await requestDomainDiagnostics(siteId);

            if (handleAuthenticationError(result)) {
                return;
            }

            const payload =
                getDiagnosticPayload(result);

            if (
                !result ||
                result.success === false ||
                result.ok === false
            ) {
                diagnosticsCache.set(key, {
                    loading: false,
                    result: result || {},
                    payload,
                    error:
                        result?.reason ||
                        result?.error ||
                        result?.message ||
                        'فشل طلب تشخيص SSL.'
                });

            } else {
                diagnosticsCache.set(key, {
                    loading: false,
                    result,
                    payload,
                    error: ''
                });
            }

        } catch (error) {
            console.error(
                'SSL diagnostics error:',
                error
            );

            if (handleAuthenticationError(error)) {
                return;
            }

            diagnosticsCache.set(key, {
                loading: false,
                payload: {},
                result: {},
                error:
                    error?.message ||
                    'حدث خطأ أثناء فحص SSL.'
            });

        } finally {
            diagnosticsInProgress.delete(key);

            if (button.isConnected) {
                button.disabled = false;
                button.classList.remove('is-loading');
                button.innerHTML = oldText;
            }

            // تحديث البطاقة الحالية حتى لو أعاد التحديث التلقائي
            // إنشاء البطاقة من جديد أثناء فحص SSL.
            const currentCard =
                findProjectCard(siteId);

            const currentButton =
                currentCard?.querySelector(
                    '.check-project-ssl'
                );

            const currentPanel =
                currentCard?.querySelector(
                    '.ssl-diagnostics-container'
                );

            if (currentButton) {
                currentButton.disabled = false;
                currentButton.classList.remove('is-loading');

                currentButton.innerHTML = `
                    <i class="fa-solid fa-shield-halved"></i>
                    Check SSL
                `;
            }

            if (currentPanel) {
                currentPanel.innerHTML =
                    renderDiagnosticsPanel(siteId);
            }
        }
    }


    // ==========================================
    // 13. PROJECT CARD
    // ==========================================

    function createProjectCard(site, index) {
        const siteId = getProjectId(site);

        const projectName = getProjectName(site);

        const projectType =
            site?.variables?.projectType ||
            'غير محدد';

        const templateId =
            site?.templateId ||
            'غير محدد';

        const date = getProjectDate(site);

        const projectUrl =
            getSafeProjectUrl(site);

        const domainStatus =
            getDomainStatus(site, projectUrl);

        const editorUrl =
            siteId
                ? `editor.html?siteId=${encodeURIComponent(siteId)}`
                : null;

        const deleting = isProjectDeleting(site);
        const publishing = isProjectPublishing(site);

        const card = document.createElement('div');

        card.className =
            'project-card p-6 flex flex-col justify-between';

        if (siteId) {
            card.dataset.projectId = String(siteId);
        }

        card.style.animationDelay =
            `${Math.min(index * 0.07, 0.5)}s`;


        // --------------------------------------
        // DOMAIN STATUS
        // --------------------------------------

        const statusHtml = domainStatus
            ? `
                <div class="${
                    domainStatus.type === 'waiting'
                        ? 'domain-waiting-card'
                        : domainStatus.type === 'error' ||
                          domainStatus.type === 'deleting'
                            ? 'border border-red-500/30 bg-red-500/10'
                            : 'border border-blue-500/30 bg-blue-500/10'
                } rounded-xl p-3 mb-4">

                    <div class="flex items-center gap-2 mb-1">

                        ${
                            domainStatus.type === 'waiting'
                                ? '<span class="hourglass-animation text-lg">⏳</span>'
                                : `<span class="text-lg">${escapeHtml(domainStatus.icon)}</span>`
                        }

                        <strong class="text-sm">
                            ${escapeHtml(domainStatus.label)}
                        </strong>

                    </div>

                    <p class="text-xs leading-6 text-slate-400">
                        ${escapeHtml(domainStatus.description)}
                    </p>

                </div>
            `
            : '';


        // --------------------------------------
        // EDIT BUTTON
        // --------------------------------------

        const editorButton =
            editorUrl && !deleting && !publishing
                ? `
                    <a
                        href="${escapeHtml(editorUrl)}"
                        class="col-span-2 block text-center bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition"
                    >
                        <i class="fa-solid fa-pen-to-square ml-1"></i>
                        تعديل المشروع
                    </a>
                `
                : `
                    <button
                        type="button"
                        disabled
                        class="col-span-2 bg-gray-200 text-gray-400 py-2.5 rounded-xl text-sm font-bold"
                    >
                        ${
                            deleting
                                ? 'المشروع قيد الحذف'
                                : publishing
                                    ? 'المشروع قيد النشر'
                                    : 'التعديل غير متاح'
                        }
                    </button>
                `;


        // --------------------------------------
        // PREVIEW BUTTON
        // --------------------------------------

        const previewButton =
            projectUrl && !deleting
                ? `
                    <a
                        href="${escapeHtml(projectUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold transition"
                    >
                        <i class="fa-regular fa-eye ml-1"></i>
                        معاينة
                    </a>
                `
                : `
                    <button
                        type="button"
                        disabled
                        class="bg-gray-100 text-gray-400 py-2.5 rounded-xl text-sm font-bold"
                    >
                        المعاينة غير متاحة
                    </button>
                `;


        // --------------------------------------
        // SSL BUTTON
        // --------------------------------------

        const sslButton =
            siteId && !deleting && !publishing
                ? `
                    <button
                        type="button"
                        class="check-project-ssl btn-check-ssl w-full py-3 px-4 rounded-xl text-sm font-bold transition"
                        data-check-ssl="${escapeHtml(siteId)}"
                    >
                        <i class="fa-solid fa-shield-halved"></i>
                        Check SSL
                    </button>
                `
                : '';


        // --------------------------------------
        // CARD HTML
        // --------------------------------------

        card.innerHTML = `

            <div>

                <div class="flex justify-between items-start gap-3 mb-4">

                    <h3 class="font-bold text-lg break-words">
                        ${escapeHtml(projectName)}
                    </h3>

                    <span class="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md font-bold whitespace-nowrap">
                        ${escapeHtml(templateId)}
                    </span>

                </div>


                <div class="text-sm text-gray-500 mb-2">

                    الصنف:

                    <strong class="text-gray-700">
                        ${escapeHtml(projectType)}
                    </strong>

                </div>


                <div class="text-xs text-gray-400 mb-4">
                    تاريخ الإنشاء:
                    ${escapeHtml(date)}
                </div>


                ${statusHtml}


                <div
                    class="${projectUrl ? 'domain-active-card' : ''} bg-gray-50 p-3 rounded-xl border text-xs font-mono truncate mb-5"
                    dir="ltr"
                    title="${escapeHtml(projectUrl || 'الدومين قيد التجهيز')}"
                >
                    ${
                        projectUrl
                            ? escapeHtml(projectUrl)
                            : deleting
                                ? 'المشروع قيد الحذف...'
                                : 'الدومين الخاص قيد التجهيز...'
                    }
                </div>


                ${sslButton}


                <div class="ssl-diagnostics-container">
                    ${
                        siteId
                            ? renderDiagnosticsPanel(siteId)
                            : ''
                    }
                </div>

            </div>


            <div class="grid grid-cols-2 gap-2 mt-4">

                ${editorButton}

                ${previewButton}


                <button
                    type="button"
                    class="copy-project-link bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold transition ${
                        !projectUrl || deleting
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                    }"
                    data-url="${escapeHtml(projectUrl || '')}"
                    ${!projectUrl || deleting ? 'disabled' : ''}
                >
                    <i class="fa-regular fa-copy ml-1"></i>
                    نسخ الرابط
                </button>


                <button
                    type="button"
                    class="delete-project-button col-span-2 bg-red-50 hover:bg-red-100 text-red-500 border border-red-500/20 py-2.5 rounded-xl text-sm font-bold transition"
                    ${deleting || publishing || !siteId ? 'disabled' : ''}
                >
                    ${
                        deleting
                            ? 'جاري الحذف...'
                            : publishing
                                ? 'النشر جارٍ...'
                                : '<i class="fa-regular fa-trash-can ml-1"></i> حذف المشروع'
                    }
                </button>

            </div>
        `;


        // --------------------------------------
        // DELETE BUTTON EVENT
        // --------------------------------------

        const deleteButton =
            card.querySelector('.delete-project-button');

        if (
            deleteButton &&
            !deleting &&
            !publishing &&
            siteId
        ) {
            deleteButton.addEventListener(
                'click',
                () => {
                    deleteProject(site, deleteButton);
                }
            );
        }


        // --------------------------------------
        // COPY BUTTON EVENT
        // --------------------------------------

        const copyButton =
            card.querySelector('.copy-project-link');

        if (copyButton && projectUrl) {
            copyButton.addEventListener(
                'click',
                async () => {
                    try {
                        if (!navigator.clipboard?.writeText) {
                            throw new Error(
                                'Clipboard API غير متوفر'
                            );
                        }

                        await navigator.clipboard.writeText(
                            projectUrl
                        );

                        const oldText =
                            copyButton.innerHTML;

                        copyButton.innerHTML =
                            '<i class="fa-solid fa-check ml-1"></i> تم النسخ';

                        setTimeout(() => {
                            if (copyButton.isConnected) {
                                copyButton.innerHTML = oldText;
                            }
                        }, 2000);

                    } catch (error) {
                        console.error(
                            'Copy URL error:',
                            error
                        );

                        window.prompt(
                            'انسخ الرابط:',
                            projectUrl
                        );
                    }
                }
            );
        }


        // --------------------------------------
        // CHECK SSL BUTTON EVENT
        // --------------------------------------

        const sslCheckButton =
            card.querySelector('.check-project-ssl');

        if (sslCheckButton && siteId) {
            sslCheckButton.addEventListener(
                'click',
                () => {
                    checkProjectSSL(
                        site,
                        sslCheckButton
                    );
                }
            );
        }


        return card;
    }


    // ==========================================
    // 14. DELETE PROJECT
    // ==========================================

    async function deleteProject(site, button) {
        const siteId = getProjectId(site);

        if (!siteId) {
            alert('معرف المشروع غير موجود.');
            return;
        }

        if (
            isProjectDeleting(site) ||
            isProjectPublishing(site)
        ) {
            alert(
                'المشروع قيد عملية أخرى حالياً.'
            );
            return;
        }

        const projectName = getProjectName(site);

        const confirmed = window.confirm(
            `هل أنت متأكد من حذف المشروع "${projectName}"؟\n\n` +
            'سيتم حذف المشروع والموارد المرتبطة به حسب إعدادات السيرفر.\n\n' +
            'هذا الإجراء لا يمكن التراجع عنه.'
        );

        if (!confirmed) {
            return;
        }

        const oldText = button.innerHTML;

        button.disabled = true;

        button.innerHTML =
            '<span class="delete-spinner ml-1"></span> جاري الحذف';

        try {
            if (
                typeof TemplateCraftAPI === 'undefined' ||
                typeof TemplateCraftAPI.deleteSite !== 'function'
            ) {
                throw new Error(
                    'Delete API غير متوفر'
                );
            }

            const result =
                await TemplateCraftAPI.deleteSite(siteId);

            if (handleAuthenticationError(result)) {
                return;
            }

            if (!result || !result.success) {
                throw new Error(
                    result?.error ||
                    result?.message ||
                    'تعذر حذف المشروع.'
                );
            }

            diagnosticsCache.delete(String(siteId));

            alert('تم حذف المشروع بنجاح.');

            await loadUserSites({
                force: true
            });

        } catch (error) {
            console.error(
                'Delete project error:',
                error
            );

            if (handleAuthenticationError(error)) {
                return;
            }

            alert(
                error.message ||
                'حدث خطأ أثناء حذف المشروع.'
            );

        } finally {
            if (button.isConnected) {
                button.disabled = false;
                button.innerHTML = oldText;
            }
        }
    }


    // ==========================================
    // 15. LOAD USER PROJECTS
    // ==========================================

    async function loadUserSites(options = {}) {
        if (isLoading) {
            return;
        }

        isLoading = true;

        const grid =
            document.getElementById('sites-grid');

        const refreshButton =
            document.getElementById('refresh-projects');

        const lastUpdated =
            document.getElementById('last-updated');

        if (!grid) {
            isLoading = false;
            return;
        }

        if (refreshButton) {
            refreshButton.disabled = true;

            refreshButton.innerHTML =
                '<span class="loading-spinner ml-1"></span> جاري التحديث';
        }

        if (
            !lastSites.length ||
            options.showLoading
        ) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-16 text-slate-400">
                    <span class="loading-spinner ml-2"></span>
                    جاري تحميل مشاريعك...
                </div>
            `;
        }

        try {
            if (
                typeof TemplateCraftAPI === 'undefined' ||
                typeof TemplateCraftAPI.getSites !== 'function'
            ) {
                throw new Error(
                    'نظام الاتصال بالخادم غير متوفر'
                );
            }

            const result =
                await TemplateCraftAPI.getSites();

            if (handleAuthenticationError(result)) {
                return;
            }

            if (
                !result ||
                result.success === false
            ) {
                throw new Error(
                    result?.error ||
                    result?.message ||
                    'تعذر جلب المشاريع'
                );
            }

            const sites =
                normalizeSitesResponse(result);

            if (!Array.isArray(sites)) {
                throw new Error(
                    'صيغة بيانات المشاريع غير صحيحة'
                );
            }

            lastSites = sites;

            updateStatistics(lastSites);

            if (lastSites.length === 0) {
                renderEmptyState();

            } else {
                grid.innerHTML = '';

                lastSites.forEach((site, index) => {
                    grid.appendChild(
                        createProjectCard(site, index)
                    );
                });
            }

            if (lastUpdated) {
                lastUpdated.textContent =
                    'آخر تحديث: ' +
                    new Date().toLocaleTimeString('ar-MA');
            }

        } catch (error) {
            console.error(
                'Load projects error:',
                error
            );

            if (handleAuthenticationError(error)) {
                return;
            }

            if (!lastSites.length) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-12">

                        <p class="text-red-400 font-bold mb-4">
                            ${escapeHtml(
                                error.message ||
                                'حدث خطأ أثناء تحميل المشاريع.'
                            )}
                        </p>

                        <button
                            type="button"
                            id="retry-projects"
                            class="btn-primary px-5 py-2 rounded-xl"
                        >
                            إعادة المحاولة
                        </button>

                    </div>
                `;

                document
                    .getElementById('retry-projects')
                    ?.addEventListener(
                        'click',
                        () => {
                            loadUserSites({
                                force: true,
                                showLoading: true
                            });
                        }
                    );

            } else if (lastUpdated) {
                lastUpdated.textContent =
                    'تعذر تحديث البيانات. يتم عرض آخر بيانات تم تحميلها.';
            }

        } finally {
            isLoading = false;

            if (refreshButton) {
                refreshButton.disabled = false;

                refreshButton.innerHTML =
                    '<i class="fa-solid fa-rotate ml-1"></i> تحديث';
            }
        }
    }


    // ==========================================
    // 16. LOGOUT
    // ==========================================

    const logoutButton =
        document.getElementById('logout-button');

    if (logoutButton) {
        logoutButton.addEventListener(
            'click',
            () => {
                if (autoRefreshTimer) {
                    clearInterval(autoRefreshTimer);
                }

                clearAuthentication();

                window.location.replace('login.html');
            }
        );
    }


    // ==========================================
    // 17. MANUAL REFRESH
    // ==========================================

    const refreshButton =
        document.getElementById('refresh-projects');

    if (refreshButton) {
        refreshButton.addEventListener(
            'click',
            () => {
                loadUserSites({
                    force: true
                });
            }
        );
    }


    // ==========================================
    // 18. AUTOMATIC REFRESH
    // ==========================================

    function startAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
        }

        autoRefreshTimer = setInterval(
            () => {
                if (
                    !document.hidden &&
                    !isLoading
                ) {
                    loadUserSites();
                }
            },
            AUTO_REFRESH_INTERVAL
        );
    }


    document.addEventListener(
        'visibilitychange',
        () => {
            if (
                !document.hidden &&
                !isLoading
            ) {
                loadUserSites();
            }
        }
    );


    window.addEventListener(
        'beforeunload',
        () => {
            if (autoRefreshTimer) {
                clearInterval(autoRefreshTimer);
            }
        }
    );


    // ==========================================
    // 19. START DASHBOARD
    // ==========================================

    loadUserSites({
        showLoading: true
    });

    startAutoRefresh();

})();
