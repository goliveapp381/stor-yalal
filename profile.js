
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
            console.error('Authentication cleanup:', error);
        }
    }

    let user;

    try {
        const storedUser = localStorage.getItem('user');

        const token =
            localStorage.getItem('token') ||
            localStorage.getItem('authToken');

        if (!storedUser || !token) {
            throw new Error('بيانات تسجيل الدخول غير موجودة');
        }

        user = JSON.parse(storedUser);

        if (!user || typeof user !== 'object' || Array.isArray(user)) {
            throw new Error('بيانات المستخدم غير صالحة');
        }

        if (!localStorage.getItem('token')) {
            localStorage.setItem('token', token);
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

    const DOMAIN_ROOT = 'templatecraftpro.com';

    let isLoading = false;
    let lastSites = [];

    const diagnosticsCache = new Map();
    const diagnosticsInProgress = new Set();
    const domainStatusInProgress = new Set();


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


    function normalizeHostname(value) {
        let hostname = String(value || '').trim().toLowerCase();

        if (!hostname) return '';

        try {
            const parsed = new URL(
                hostname.includes('://')
                    ? hostname
                    : `https://${hostname}`
            );

            hostname = parsed.hostname;

        } catch (_) {
            hostname = hostname
                .replace(/^https?:\/\//i, '')
                .split('/')[0]
                .split('?')[0]
                .split('#')[0]
                .replace(/:\d+$/, '');
        }

        return hostname.replace(/\.+$/, '');
    }


    function isAllowedCustomDomain(value) {
        const hostname = normalizeHostname(value);

        return Boolean(
            hostname &&
            hostname !== DOMAIN_ROOT &&
            hostname.endsWith('.' + DOMAIN_ROOT)
        );
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
            site?.name ||
            'مشروع بدون اسم'
        );
    }


    function getProjectState(site) {
        return String(
            site?.publishStatus ||
            site?.status ||
            ''
        ).toLowerCase();
    }


    function isProjectDeleting(site) {
        return getProjectState(site) === 'deleting';
    }


    function isProjectPublishing(site) {
        return getProjectState(site) === 'publishing';
    }


    function getProjectDate(site) {
        if (!site?.createdAt) return '-';

        const date = new Date(site.createdAt);

        if (Number.isNaN(date.getTime())) return '-';

        return date.toLocaleDateString('ar-MA');
    }


    function firstNonEmpty(...values) {
        for (const value of values) {
            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ''
            ) {
                return value;
            }
        }

        return '';
    }


    function isReadyState(value) {
        return [
            'active',
            'ready',
            'live',
            'verified',
            'connected',
            'success'
        ].includes(
            String(value || '').trim().toLowerCase()
        );
    }


    // ==========================================
    // 5. SAFE PROJECT URL
    // ==========================================

    function getSafeProjectUrl(site) {
        if (!site || typeof site !== 'object') {
            return null;
        }

        const rawUrl = firstNonEmpty(
            site.customUrl,
            site.customDomain,
            site.hostname,
            site.liveUrl
        );

        if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
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

            const hostname = normalizeHostname(parsed.hostname);

            if (!isAllowedCustomDomain(hostname)) {
                return null;
            }

            const ready =
                isReadyState(site.domainStatus) ||
                isReadyState(site.status) ||
                isReadyState(site.overall) ||
                site.sslReady === true ||
                String(site.sslState || '').toLowerCase() === 'ready' ||
                site.__diagnosticsReady === true;

            if (!ready) {
                return null;
            }

            parsed.hash = '';
            parsed.search = '';

            return parsed.href;

        } catch (error) {
            console.warn('Invalid custom domain:', error);
            return null;
        }
    }


    // ==========================================
    // 6. API RESPONSE HELPERS
    // ==========================================

    function getResponseStatus(result) {
        return Number(
            result?.status ||
            result?.statusCode ||
            result?.response?.status ||
            0
        );
    }


    function handleAuthenticationError(result) {
        if (getResponseStatus(result) !== 401) {
            return false;
        }

        clearAuthentication();
        window.location.replace('login.html');

        return true;
    }


    function unwrapResponse(result) {
        let payload = result;

        for (let i = 0; i < 6; i++) {
            if (
                payload &&
                typeof payload === 'object' &&
                !Array.isArray(payload) &&
                payload.data &&
                typeof payload.data === 'object'
            ) {
                const outer = payload;
                const inner = payload.data;

                payload = {
                    ...inner,

                    requestId:
                        inner.requestId ||
                        outer.requestId,

                    success:
                        outer.success === false ||
                        inner.success === false
                            ? false
                            : (
                                inner.success ??
                                outer.success
                            ),

                    status:
                        inner.status ??
                        outer.status
                };

            } else {
                break;
            }
        }

        return payload || {};
    }


    function normalizeSitesResponse(result) {
        const payload = unwrapResponse(result);

        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.sites)) return payload.sites;
        if (Array.isArray(payload.projects)) return payload.projects;
        if (Array.isArray(payload.data)) return payload.data;

        return null;
    }


    function normalizeDomainStatus(result) {
        return unwrapResponse(result);
    }


    // ==========================================
    // 7. DOMAIN STATUS NORMALIZATION
    // ==========================================

    function normalizeDomainData(site, status = {}) {
        const nestedProject =
            status.project ||
            status.site ||
            {};

        const nestedDomain =
            status.domain ||
            status.customDomainInfo ||
            {};

        const rawState = firstNonEmpty(
            status.domainStatus,
            status.overall,
            status.status,
            nestedDomain.status,
            site.domainStatus,
            site.status,
            'unknown'
        );

        const sslState = String(
            firstNonEmpty(
                status.sslState,
                status.ssl?.state,
                status.ssl?.status,
                site.sslState,
                'unknown'
            )
        ).toLowerCase();

        const sslReady =
            status.sslReady === true ||
            status.ssl?.sslReady === true ||
            status.ssl?.ready === true ||
            sslState === 'ready' ||
            site.sslReady === true ||
            String(site.sslState || '').toLowerCase() === 'ready';

        const customDomain = firstNonEmpty(
            status.customDomain,
            status.hostname,
            status.domainName,
            nestedDomain.hostname,
            nestedDomain.domain,
            nestedProject.customDomain,
            site.customDomain
        );

        const customUrl = firstNonEmpty(
            status.customUrl,
            status.liveUrl,
            status.url,
            nestedDomain.customUrl,
            nestedProject.customUrl,
            site.customUrl,
            site.liveUrl
        );

        const overallReady =
            isReadyState(rawState) ||
            isReadyState(status.overall) ||
            isReadyState(status.result) ||
            sslReady;

        const domainStatus = overallReady
            ? 'active'
            : String(rawState).toLowerCase();

        return {
            customDomain,
            customUrl,

            domainStatus,

            sslReady,

            sslState: sslReady
                ? 'ready'
                : sslState,

            cnameVisible:
                status.cnameVisible ??
                status.cname?.visible ??
                site.cnameVisible,

            liveUrl: firstNonEmpty(
                status.liveUrl,
                status.url,
                site.liveUrl
            ),

            domainError: firstNonEmpty(
                status.error,
                status.reason,
                status.message && !overallReady
                    ? status.message
                    : '',
                site.domainError
            ),

            __diagnosticsReady:
                site.__diagnosticsReady === true ||
                isReadyState(status.overall) ||
                isReadyState(status.result)
        };
    }


    // ==========================================
    // 8. DOMAIN STATUS API
    // ==========================================

    async function requestDomainStatus(siteId) {
        if (!siteId) {
            throw new Error('معرف المشروع غير موجود.');
        }

        if (
            typeof TemplateCraftAPI === 'undefined' ||
            typeof TemplateCraftAPI.getDomainStatus !== 'function'
        ) {
            throw new Error(
                'getDomainStatus غير موجودة في client-api.js'
            );
        }

        return TemplateCraftAPI.getDomainStatus(siteId);
    }


    async function refreshProjectDomainStatus(site) {
        const siteId = getProjectId(site);

        if (!siteId) return site;

        const key = String(siteId);

        if (domainStatusInProgress.has(key)) {
            return site;
        }

        domainStatusInProgress.add(key);

        try {
            const result = await requestDomainStatus(siteId);

            if (handleAuthenticationError(result)) {
                return site;
            }

            const status = normalizeDomainStatus(result);

            if (
                !result ||
                result.success === false ||
                status.success === false ||
                result.ok === false
            ) {
                console.warn(
                    'Domain status unavailable:',
                    result?.error || result?.message
                );

                return site;
            }

            const normalized = normalizeDomainData(
                site,
                status
            );

            return {
                ...site,
                ...normalized
            };

        } catch (error) {
            console.error('Domain status refresh error:', error);
            return site;

        } finally {
            domainStatusInProgress.delete(key);
        }
    }


    // ==========================================
    // 9. DIAGNOSTICS API
    // ==========================================

    async function requestDomainDiagnostics(siteId) {
        if (!siteId) {
            throw new Error('معرف المشروع غير موجود.');
        }

        if (
            typeof TemplateCraftAPI === 'undefined' ||
            typeof TemplateCraftAPI.getDomainDiagnostics !== 'function'
        ) {
            throw new Error(
                'getDomainDiagnostics غير موجودة في client-api.js'
            );
        }

        return TemplateCraftAPI.getDomainDiagnostics(siteId);
    }


    function getDiagnosticPayload(result) {
        return unwrapResponse(result);
    }


    function getDiagnosticChecks(payload) {
        return (
            payload?.checks ||
            payload?.diagnostics ||
            payload?.results ||
            {}
        );
    }


    // ==========================================
    // 10. EXTRACT DOMAIN FROM DIAGNOSTICS
    // ==========================================

    function extractDiagnosticDomain(payload) {
        if (!payload || typeof payload !== 'object') {
            return '';
        }

        const checks = getDiagnosticChecks(payload);

        const candidates = [
            payload.customDomain,
            payload.customUrl,
            payload.domain,
            payload.hostname,
            payload.liveUrl,

            payload.project?.customDomain,
            payload.project?.customUrl,
            payload.project?.hostname,

            payload.site?.customDomain,
            payload.site?.customUrl,

            checks.customDomain?.hostname,
            checks.customDomain?.domain,
            checks.customDomain?.customDomain,
            checks.customDomain?.customUrl,

            checks.domain?.hostname,
            checks.domain?.domain,
            checks.domain?.customDomain,

            checks.netlifySite?.customDomain,
            checks.netlifySite?.url,

            checks.site?.customDomain,
            checks.site?.url
        ];

        for (const candidate of candidates) {
            if (
                typeof candidate === 'string' &&
                isAllowedCustomDomain(candidate)
            ) {
                return candidate;
            }
        }

        return '';
    }


    // ==========================================
    // 11. DETECT READY DIAGNOSTICS
    // ==========================================

    function isDiagnosticsReady(payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }

        const overall = String(
            firstNonEmpty(
                payload.overall,
                payload.result,
                payload.status,
                payload.domainStatus
            )
        ).toLowerCase();

        if (isReadyState(overall)) {
            return true;
        }

        const checks = getDiagnosticChecks(payload);

        const ssl =
            checks.ssl ||
            checks.certificate ||
            payload.ssl ||
            {};

        const certificateReady =
            ssl.sslReady === true ||
            ssl.ready === true ||
            ssl.state === 'ready' ||
            ssl.sslState === 'ready' ||
            ssl.certificateExists === true ||
            ssl.anyCertificateExists === true;

        const domainReady =
            ssl.domainMatches === true ||
            ssl.domainMatches === undefined;

        if (certificateReady && domainReady) {
            return true;
        }

        return false;
    }


    // ==========================================
    // 12. APPLY DIAGNOSTICS TO PROJECT
    // ==========================================

    function applyDiagnosticsToSite(site, payload) {
        if (
            !site ||
            !payload ||
            typeof payload !== 'object'
        ) {
            return site;
        }

        if (!isDiagnosticsReady(payload)) {
            return site;
        }

        const checks = getDiagnosticChecks(payload);

        const netlifySite =
            checks.netlifySite ||
            checks.site ||
            {};

        const discoveredDomain =
            extractDiagnosticDomain(payload) ||
            site.customDomain ||
            site.customUrl ||
            '';

        const hostname = normalizeHostname(
            discoveredDomain
        );

        const validDomain =
            isAllowedCustomDomain(hostname);

        const customDomain = validDomain
            ? hostname
            : firstNonEmpty(site.customDomain, '');

        const customUrl = validDomain
            ? `https://${hostname}`
            : firstNonEmpty(site.customUrl, '');

        return {
            ...site,

            domainStatus: 'active',

            sslReady: true,

            sslState: 'ready',

            __diagnosticsReady: true,

            customDomain,

            customUrl,

            liveUrl: firstNonEmpty(
                customUrl,
                site.liveUrl,
                netlifySite.url
            ),

            domainError: '',

            __txtWarning: Boolean(
                checks?.txtChallenge?.warning ||
                checks?.txt?.warning
            )
        };
    }


    // ==========================================
    // 13. ENRICH PROJECT DOMAIN
    // ==========================================

    async function enrichProjectDomain(site) {
        let current = await refreshProjectDomainStatus(site);

        const siteId = getProjectId(current);

        if (!siteId) return current;

        /*
         * إذا كان الرابط جاهزاً فعلاً،
         * لا نحتاج إلى فحص إضافي أثناء التحميل.
         */

        if (getSafeProjectUrl(current)) {
            return current;
        }

        /*
         * إذا لم تكن الحالة واضحة، نطلب Diagnostics.
         */

        try {
            const result = await requestDomainDiagnostics(siteId);

            if (handleAuthenticationError(result)) {
                return current;
            }

            const payload = getDiagnosticPayload(result);

            if (
                !result ||
                result.success === false ||
                payload.success === false ||
                result.ok === false
            ) {
                return current;
            }

            if (isDiagnosticsReady(payload)) {
                current = applyDiagnosticsToSite(
                    current,
                    payload
                );

                diagnosticsCache.set(
                    String(siteId),
                    {
                        loading: false,
                        result,
                        payload,
                        error: ''
                    }
                );
            }

        } catch (error) {
            console.warn(
                'Domain diagnostics during project load:',
                error
            );
        }

        return current;
    }


    async function refreshAllProjectDomains(sites) {
        if (!Array.isArray(sites)) return [];

        return Promise.all(
            sites.map(site => enrichProjectDomain(site))
        );
    }


    // ==========================================
    // 14. STATISTICS
    // ==========================================

    function updateStatistics(sites) {
        const safeSites = Array.isArray(sites) ? sites : [];

        const total = safeSites.length;

        const published = safeSites.filter(
            site => Boolean(getSafeProjectUrl(site))
        ).length;

        const unpublished = safeSites.filter(
            site =>
                !getSafeProjectUrl(site) &&
                !isProjectDeleting(site)
        ).length;

        const customDomains = safeSites.filter(
            site => {
                const domain = firstNonEmpty(
                    site.customDomain,
                    site.customUrl
                );

                return isAllowedCustomDomain(domain);
            }
        ).length;

        const elements = {
            total: document.getElementById('total-sites'),
            published: document.getElementById('published-sites'),
            unpublished: document.getElementById('unpublished-sites'),
            customDomains: document.getElementById('custom-domains')
        };

        if (elements.total) {
            elements.total.textContent = total;
        }

        if (elements.published) {
            elements.published.textContent = published;
        }

        if (elements.unpublished) {
            elements.unpublished.textContent = unpublished;
        }

        if (elements.customDomains) {
            elements.customDomains.textContent = customDomains;
        }
    }


    // ==========================================
    // 15. DOMAIN STATUS DISPLAY
    // ==========================================

    function getDomainStatus(site, projectUrl) {
        if (projectUrl) return null;

        if (isProjectDeleting(site)) {
            return {
                type: 'deleting',
                label: 'جاري حذف المشروع',
                description: 'يتم الآن حذف المشروع.',
                icon: '🗑️'
            };
        }

        if (isProjectPublishing(site)) {
            return {
                type: 'publishing',
                label: 'جاري نشر المشروع',
                description: 'يتم الآن نشر المشروع.',
                icon: '🚀'
            };
        }

        const status = String(
            site?.domainStatus || ''
        ).toLowerCase();

        if (status === 'failed' || status === 'error') {
            return {
                type: 'error',
                label: 'تعذر تجهيز الدومين',
                description:
                    site.domainError ||
                    site.error ||
                    'راجع إعدادات الدومين في السيرفر.',
                icon: '⚠️'
            };
        }

        /*
         * الحالات الجاهزة لا تعرض رسالة الانتظار.
         */

        if (
            isReadyState(status) ||
            site.sslReady === true ||
            String(site.sslState || '').toLowerCase() === 'ready'
        ) {
            return null;
        }

        if (
            status === 'pending' ||
            status === 'provisioning'
        ) {
            return {
                type: 'waiting',
                label: 'جاري تجهيز الدومين',
                description:
                    'السيرفر يقوم بإعداد الدومين والتحقق منه.',
                icon: '⏳'
            };
        }

        if (
            !site.customDomain &&
            !site.customUrl
        ) {
            return {
                type: 'waiting',
                label: 'الدومين غير مجهز بعد',
                description:
                    'سيظهر الدومين بعد إتمام عملية نشر المشروع وتجهيزه.',
                icon: '🌐'
            };
        }

        return {
            type: 'waiting',
            label: 'في انتظار التحقق من الدومين',
            description:
                'يتم التحقق من إعدادات الدومين وDNS وSSL.',
            icon: '⏳'
        };
    }


    // ==========================================
    // 16. EMPTY STATE
    // ==========================================

    function renderEmptyState() {
        const grid = document.getElementById('sites-grid');

        if (!grid) return;

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
    // 17. DIAGNOSTIC STATES
    // ==========================================

    function getCheckState(check) {
        if (!check || typeof check !== 'object') {
            return 'unknown';
        }

        if (
            check.state === 'unknown' ||
            check.statusCheckSucceeded === false
        ) {
            return 'unknown';
        }

        if (
            check.sslReady === true ||
            check.ok === true ||
            check.success === true ||
            check.attached === true ||
            check.present === true ||
            check.domainMatches === true
        ) {
            return 'success';
        }

        if (
            check.status === 'warning' ||
            check.warning
        ) {
            return 'unknown';
        }

        if (
            check.ok === false ||
            check.success === false ||
            check.error ||
            check.readError ||
            check.attached === false ||
            check.present === false ||
            check.matches === false ||
            check.domainMatches === false
        ) {
            return 'error';
        }

        if (
            check.state === 'failed' ||
            check.state === 'error'
        ) {
            return 'error';
        }

        return 'pending';
    }


    function getCheckIcon(state) {
        if (state === 'success') return '✅';
        if (state === 'error') return '❌';
        if (state === 'unknown') return '❔';

        return '⏳';
    }


    function getCheckLabel(key) {
        const labels = {
            database: 'اتصال قاعدة البيانات',
            netlifyCredentials: 'حساب Netlify OAuth',
            credentials: 'بيانات Netlify',
            netlifySite: 'موقع Netlify',
            site: 'موقع Netlify',
            customDomain: 'ربط الدومين',
            domain: 'الدومين الخاص',
            dns: 'إعدادات DNS',
            cname: 'سجل CNAME',
            a: 'سجل A',
            aaaa: 'سجل AAAA',
            txt: 'سجل TXT',
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


    // ==========================================
    // 18. SENSITIVE DATA FILTER
    // ==========================================

    function isSensitiveDiagnosticKey(key) {
        return /access[_-]?token|refresh[_-]?token|client[_-]?secret|password|authorization|rawstatus|rawresponse|verification(?:value|token)|txt(?:content|value)|accesskey|privatekey|cookie|certificatepem|credential(?:value|secret)/i
            .test(String(key));
    }


    function formatDiagnosticValue(value) {
        if (value === true) return 'نعم';
        if (value === false) return 'لا';

        if (
            value === null ||
            value === undefined ||
            typeof value === 'object'
        ) {
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
            if (isSensitiveDiagnosticKey(key)) return;

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
                const safeValues = value.filter(
                    item =>
                        item === null ||
                        ['string', 'number', 'boolean'].includes(typeof item)
                );

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

            const formatted = formatDiagnosticValue(value);

            if (!formatted) return;

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
            if (
                isSensitiveDiagnosticKey(key) ||
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


    // ==========================================
    // 19. OVERALL DIAGNOSTIC STATE
    // ==========================================

    function getOverallDiagnosticState(payload) {
        const overall = String(
            payload?.overall ||
            payload?.status ||
            ''
        ).toLowerCase();

        if (isReadyState(overall)) {
            return 'success';
        }

        if (
            overall === 'unknown' ||
            overall === 'unavailable'
        ) {
            return 'unknown';
        }

        const checks = getDiagnosticChecks(payload);

        const states = Object.values(checks)
            .filter(item => item && typeof item === 'object')
            .map(getCheckState);

        if (
            overall === 'failed' ||
            overall === 'error'
        ) {
            if (states.includes('error')) return 'error';

            if (
                states.includes('unknown') &&
                !states.includes('pending')
            ) {
                return 'unknown';
            }

            return 'error';
        }

        if (overall === 'pending') {
            return 'pending';
        }

        if (states.includes('error')) {
            return 'error';
        }

        if (
            states.length &&
            states.every(
                state =>
                    state === 'success' ||
                    state === 'unknown'
            )
        ) {
            return 'success';
        }

        return 'pending';
    }


    function getOverallDiagnosticLabel(state) {
        if (state === 'success') return 'الفحص مكتمل: SSL جاهز';
        if (state === 'error') return 'تم العثور على مشكلة';
        if (state === 'unknown') return 'تعذر التأكد من حالة SSL';

        return 'الفحص قيد الانتظار أو مكتمل جزئياً';
    }


    // ==========================================
    // 20. DIAGNOSTICS PANEL
    // ==========================================

    function renderDiagnosticsPanel(siteId) {
        const state = diagnosticsCache.get(String(siteId));

        if (!state) return '';

        if (state.loading) {
            return `
                <div class="ssl-diagnostics-panel rounded-xl border border-blue-500/30 bg-slate-900 p-4 mt-4">

                    <div class="flex items-center gap-2 text-blue-300 font-bold text-sm">
                        <span class="loading-spinner"></span>
                        جاري فحص الدومين وSSL...
                    </div>

                    <p class="text-xs text-slate-400 mt-2">
                        الفحص للقراءة فقط، ولا يغير DNS أو يصدر شهادة SSL.
                    </p>

                </div>
            `;
        }

        const payload = state.payload || {};
        const result = state.result || {};

        const overallState = state.error
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

        const checks = getDiagnosticChecks(payload);

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
                        ${escapeHtml(getOverallDiagnosticLabel(overallState))}
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
                    هذا الفحص للقراءة فقط ولا يغير DNS ولا يطلب إصدار شهادة SSL.
                </div>

            </div>
        `;
    }


    // ==========================================
    // 21. FIND PROJECT CARD
    // ==========================================

    function findProjectCard(siteId) {
        const grid = document.getElementById('sites-grid');

        if (!grid) return null;

        return Array.from(
            grid.querySelectorAll('.project-card')
        ).find(
            card => card.dataset.projectId === String(siteId)
        ) || null;
    }


    // ==========================================
    // 22. CHECK SSL MANUALLY
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
            alert('لا يمكن فحص SSL أثناء حذف المشروع أو نشره.');
            return;
        }

        const key = String(siteId);

        if (diagnosticsInProgress.has(key)) return;

        diagnosticsInProgress.add(key);

        diagnosticsCache.set(key, {
            loading: true
        });

        const oldText = button.innerHTML;

        button.disabled = true;
        button.classList.add('is-loading');

        button.innerHTML =
            '<span class="loading-spinner ml-1"></span> جاري الفحص';

        const originalPanel = button
            .closest('.project-card')
            ?.querySelector('.ssl-diagnostics-container');

        if (originalPanel) {
            originalPanel.innerHTML =
                renderDiagnosticsPanel(siteId);
        }

        try {
            const result = await requestDomainDiagnostics(siteId);

            if (handleAuthenticationError(result)) {
                return;
            }

            const payload = getDiagnosticPayload(result);

            if (
                !result ||
                result.success === false ||
                payload.success === false ||
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

                const currentIndex = lastSites.findIndex(
                    item => String(getProjectId(item)) === key
                );

                if (
                    currentIndex !== -1 &&
                    isDiagnosticsReady(payload)
                ) {
                    lastSites[currentIndex] =
                        applyDiagnosticsToSite(
                            lastSites[currentIndex],
                            payload
                        );

                    updateStatistics(lastSites);
                }
            }

        } catch (error) {
            console.error('SSL diagnostics error:', error);

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

            const currentCard = findProjectCard(siteId);

            const currentButton =
                currentCard?.querySelector('.check-project-ssl');

            const currentPanel =
                currentCard?.querySelector('.ssl-diagnostics-container');

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
    // 23. PROJECT CARD
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

        const projectUrl = getSafeProjectUrl(site);

        const domainStatus = getDomainStatus(
            site,
            projectUrl
        );

        const editorUrl = siteId
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
                        <span class="text-lg">
                            ${escapeHtml(domainStatus.icon)}
                        </span>

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

        const domainName = projectUrl ||
            firstNonEmpty(
                site.customDomain,
                site.customUrl,
                'الدومين قيد التجهيز'
            );

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
                    class="${
                        projectUrl ? 'domain-active-card' : ''
                    } bg-gray-50 p-3 rounded-xl border text-xs font-mono truncate mb-5"
                    dir="ltr"
                    title="${escapeHtml(domainName)}"
                >
                    ${escapeHtml(domainName)}
                </div>

                ${
                    site.sslReady === true ||
                    String(site.sslState || '').toLowerCase() === 'ready'
                        ? `
                            <div class="text-xs text-green-400 mb-3">
                                <i class="fa-solid fa-lock"></i>
                                SSL جاهز
                            </div>
                        `
                        : ''
                }

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
                    ${
                        !projectUrl || deleting
                            ? 'disabled'
                            : ''
                    }
                >
                    <i class="fa-regular fa-copy ml-1"></i>
                    نسخ الرابط
                </button>

                <button
                    type="button"
                    class="delete-project-button col-span-2 bg-red-50 hover:bg-red-100 text-red-500 border border-red-500/20 py-2.5 rounded-xl text-sm font-bold transition"
                    ${
                        deleting || publishing || !siteId
                            ? 'disabled'
                            : ''
                    }
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


        // DELETE

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
                () => deleteProject(site, deleteButton)
            );
        }


        // COPY URL

        const copyButton =
            card.querySelector('.copy-project-link');

        if (copyButton && projectUrl) {
            copyButton.addEventListener('click', async () => {
                try {
                    if (!navigator.clipboard?.writeText) {
                        throw new Error('Clipboard API غير متوفر');
                    }

                    await navigator.clipboard.writeText(projectUrl);

                    const oldText = copyButton.innerHTML;

                    copyButton.innerHTML =
                        '<i class="fa-solid fa-check ml-1"></i> تم النسخ';

                    setTimeout(() => {
                        if (copyButton.isConnected) {
                            copyButton.innerHTML = oldText;
                        }
                    }, 2000);

                } catch (error) {
                    console.error('Copy URL error:', error);

                    window.prompt('انسخ الرابط:', projectUrl);
                }
            });
        }


        // CHECK SSL

        const sslCheckButton =
            card.querySelector('.check-project-ssl');

        if (sslCheckButton && siteId) {
            sslCheckButton.addEventListener(
                'click',
                () => checkProjectSSL(site, sslCheckButton)
            );
        }

        return card;
    }


    // ==========================================
    // 24. DELETE PROJECT
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
            alert('المشروع قيد عملية أخرى حالياً.');
            return;
        }

        const projectName = getProjectName(site);

        const confirmed = window.confirm(
            `هل أنت متأكد من حذف المشروع "${projectName}"؟\n\n` +
            'سيتم حذف المشروع والموارد المرتبطة به حسب إعدادات السيرفر.\n\n' +
            'هذا الإجراء لا يمكن التراجع عنه.'
        );

        if (!confirmed) return;

        const oldText = button.innerHTML;

        button.disabled = true;
        button.innerHTML =
            '<span class="delete-spinner ml-1"></span> جاري الحذف';

        try {
            if (
                typeof TemplateCraftAPI === 'undefined' ||
                typeof TemplateCraftAPI.deleteSite !== 'function'
            ) {
                throw new Error('Delete API غير متوفر');
            }

            const result = await TemplateCraftAPI.deleteSite(siteId);

            if (handleAuthenticationError(result)) return;

            if (!result || result.success === false) {
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
            console.error('Delete project error:', error);

            if (handleAuthenticationError(error)) return;

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
    // 25. LOAD USER PROJECTS
    // ==========================================

    async function loadUserSites(options = {}) {
        if (isLoading) return;

        isLoading = true;

        const grid = document.getElementById('sites-grid');

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

        if (!lastSites.length || options.showLoading) {
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
                throw new Error('نظام الاتصال بالخادم غير متوفر.');
            }

            const result = await TemplateCraftAPI.getSites();

            if (handleAuthenticationError(result)) return;

            if (!result || result.success === false) {
                throw new Error(
                    result?.error ||
                    result?.message ||
                    'تعذر جلب المشاريع.'
                );
            }

            let sites = normalizeSitesResponse(result);

            if (!Array.isArray(sites)) {
                throw new Error('صيغة بيانات المشاريع غير صحيحة.');
            }

            /*
             * تحديث حالة الدومين ثم Diagnostics عند الحاجة.
             * هذا يحدث عند التحميل الأول أو عند الضغط اليدوي فقط.
             */

            sites = await refreshAllProjectDomains(sites);

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
            console.error('Load projects error:', error);

            if (handleAuthenticationError(error)) return;

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
                    ?.addEventListener('click', () => {
                        loadUserSites({
                            force: true,
                            showLoading: true
                        });
                    });

            } else if (lastUpdated) {
                lastUpdated.textContent =
                    'تعذر التحديث. يتم عرض آخر بيانات محملة.';
            }

        } finally {
            isLoading = false;

            if (refreshButton) {
                refreshButton.disabled = false;

                refreshButton.innerHTML =
                    '<i class="fa-solid fa-rotate ml-1"></i> تحديث المشاريع';
            }
        }
    }


    // ==========================================
    // 26. LOGOUT
    // ==========================================

    const logoutButton =
        document.getElementById('logout-button');

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            clearAuthentication();
            window.location.replace('login.html');
        });
    }


    // ==========================================
    // 27. MANUAL REFRESH ONLY
    // ==========================================

    const refreshButton =
        document.getElementById('refresh-projects');

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadUserSites({
                force: true,
                showLoading: false
            });
        });
    }


    // ==========================================
    // 28. NO AUTOMATIC REFRESH
    // ==========================================

    /*
     * لا يوجد:
     *
     * setInterval
     * setTimeout لإعادة تحميل المشاريع
     * visibilitychange
     *
     * التحديث يتم فقط:
     * 1. عند فتح الصفحة أول مرة.
     * 2. عندما يضغط المستخدم على زر تحديث المشاريع.
     */


    // ==========================================
    // 29. START DASHBOARD
    // ==========================================

    loadUserSites({
        showLoading: true
    });

})();
