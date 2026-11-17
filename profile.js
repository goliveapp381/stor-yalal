'use strict';

/*
=========================================================
 TEMPLATECRAFT PRO - PROFILE DASHBOARD
 FIXED DOMAIN / SSL / NETLIFY URL DETECTION

 IMPORTANT:
 - No automatic 30-second refresh
 - Manual refresh only
 - Reads custom URL from diagnostics
 - Supports checks.netlifySite.url
 - Supports checks.netlifySite.attachedDomains
 - READY diagnostics => active domain
 - SSL ready => published
=========================================================
*/

(() => {

    // =====================================================
    // 1. CONFIG
    // =====================================================

    const DOMAIN_ROOT = 'templatecraftpro.com';

    let lastSites = [];
    let diagnosticsCache = new Map();
    let domainStatusInProgress = new Set();

    // =====================================================
    // 2. DOM HELPERS
    // =====================================================

    function $(selector) {
        return document.querySelector(selector);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function safeText(value, fallback = '') {
        return value === undefined ||
               value === null ||
               value === ''
            ? fallback
            : String(value);
    }

    // =====================================================
    // 3. RESPONSE HELPERS
    // =====================================================

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
                payload = payload.data;

                if (
                    outer.requestId &&
                    !payload.requestId
                ) {
                    payload = {
                        ...payload,
                        requestId: outer.requestId
                    };
                }

                continue;
            }

            break;
        }

        return payload || {};
    }

    // =====================================================
    // 4. DOMAIN HELPERS
    // =====================================================

    function normalizeHostname(hostname) {

        if (!hostname) {
            return '';
        }

        let value = String(hostname)
            .trim()
            .toLowerCase();

        value = value
            .replace(/^https?:\/\//, '')
            .split('/')[0]
            .split('?')[0]
            .split('#')[0]
            .split(':')[0]
            .replace(/\.$/, '');

        return value;
    }


    function isAllowedCustomDomain(hostname) {

        const host = normalizeHostname(hostname);

        if (!host) {
            return false;
        }

        return (
            host === DOMAIN_ROOT ||
            host.endsWith('.' + DOMAIN_ROOT)
        );
    }


    function domainFromUrl(raw) {

        if (!raw) {
            return '';
        }

        try {

            let value = String(raw).trim();

            if (!value.includes('://')) {
                value = 'https://' + value;
            }

            const url = new URL(value);

            const hostname = normalizeHostname(url.hostname);

            if (!isAllowedCustomDomain(hostname)) {
                return '';
            }

            return hostname;

        } catch {
            return '';
        }
    }


    function canonicalCustomUrl(raw) {

        const hostname = domainFromUrl(raw);

        if (!hostname) {
            return '';
        }

        return `https://${hostname}/`;
    }


    function firstValidDomain(...values) {

        const flattened = [];

        function collect(value) {

            if (!value) {
                return;
            }

            if (Array.isArray(value)) {

                value.forEach(collect);

                return;
            }

            if (typeof value === 'object') {

                collect(value.url);
                collect(value.hostname);
                collect(value.domain);
                collect(value.customDomain);
                collect(value.customUrl);

                return;
            }

            flattened.push(value);
        }

        values.forEach(collect);

        for (const value of flattened) {

            const hostname = domainFromUrl(value);

            if (hostname) {
                return hostname;
            }
        }

        return '';
    }


    function getSiteChecks(payload) {

        if (!payload || typeof payload !== 'object') {
            return {};
        }

        return (
            payload.checks ||
            payload.diagnostics?.checks ||
            payload.result?.checks ||
            {}
        );
    }


    // =====================================================
    // 5. CRITICAL FIX
    // Extract domain from diagnostics
    // =====================================================

    function extractDiagnosticDomain(payload) {

        const checks = getSiteChecks(payload);

        const netlifySite =
            checks.netlifySite ||
            checks.netlify ||
            checks.site ||
            {};

        const customDomainCheck =
            checks.customDomain ||
            checks.domain ||
            {};

        const project =
            payload.project ||
            {};

        const hostname = firstValidDomain(

            // Top-level
            payload.customDomain,
            payload.customUrl,
            payload.liveUrl,
            payload.domain,
            payload.hostname,

            // Project
            project.customDomain,
            project.customUrl,
            project.liveUrl,
            project.domain,
            project.hostname,

            // Custom domain diagnostic
            customDomainCheck.hostname,
            customDomainCheck.domain,
            customDomainCheck.customDomain,
            customDomainCheck.customUrl,
            customDomainCheck.url,

            // Netlify diagnostic
            netlifySite.customDomain,
            netlifySite.customUrl,
            netlifySite.liveUrl,
            netlifySite.domain,
            netlifySite.hostname,

            // ⭐ THIS IS THE IMPORTANT ONE
            netlifySite.url,

            // ⭐ AND THIS ONE
            netlifySite.attachedDomains,

            // Other possible names
            checks.hostname,
            checks.domain,
            checks.customDomain,
            checks.customUrl
        );

        return hostname;
    }


    function extractDiagnosticCustomUrl(payload) {

        const hostname = extractDiagnosticDomain(payload);

        if (!hostname) {
            return '';
        }

        return `https://${hostname}/`;
    }


    // =====================================================
    // 6. DIAGNOSTICS READY
    // =====================================================

    function isDiagnosticsReady(payload) {

        if (!payload || typeof payload !== 'object') {
            return false;
        }

        const checks = getSiteChecks(payload);

        const overall = String(
            payload.result ||
            payload.status ||
            payload.overall ||
            payload.state ||
            payload.diagnostics?.result ||
            ''
        ).toLowerCase();

        const ssl =
            checks.ssl ||
            payload.ssl ||
            {};

        const sslState = String(
            ssl.state ||
            ssl.sslState ||
            payload.sslState ||
            ''
        ).toLowerCase();

        const sslReady =
            sslState === 'ready' ||
            ssl.state === 'ready' ||
            ssl.sslState === 'ready' ||
            ssl.certificateExists === true &&
            ssl.domainMatches === true;

        const readyByOverall = [
            'ready',
            'active',
            'success',
            'completed',
            'verified'
        ].includes(overall);

        return readyByOverall || sslReady;
    }


    // =====================================================
    // 7. APPLY DIAGNOSTICS TO SITE
    // =====================================================

    function applyDiagnosticsToSite(site, payload) {

        const updated = {
            ...site
        };

        if (!payload) {
            return updated;
        }

        const checks = getSiteChecks(payload);

        const netlifySite =
            checks.netlifySite ||
            checks.netlify ||
            checks.site ||
            {};

        const ssl =
            checks.ssl ||
            payload.ssl ||
            {};

        const customDomainCheck =
            checks.customDomain ||
            checks.domain ||
            {};

        const discoveredDomain =
            extractDiagnosticDomain(payload);

        const discoveredUrl =
            discoveredDomain
                ? `https://${discoveredDomain}/`
                : extractDiagnosticCustomUrl(payload);

        const diagnosticsReady =
            isDiagnosticsReady(payload);

        const sslState = String(
            ssl.state ||
            ssl.sslState ||
            payload.sslState ||
            ''
        ).toLowerCase();

        const sslReady =
            sslState === 'ready' ||
            ssl.state === 'ready' ||
            ssl.sslState === 'ready' ||
            ssl.certificateExists === true &&
            ssl.domainMatches === true;


        // =================================================
        // CRITICAL:
        // Diagnostics says READY + found custom domain
        // => force canonical active state
        // =================================================

        if (discoveredDomain) {

            updated.customDomain = discoveredDomain;

            updated.customUrl = discoveredUrl;

            updated.liveUrl = discoveredUrl;

        }


        if (diagnosticsReady) {

            updated.__diagnosticsReady = true;

        }


        if (sslReady) {

            updated.sslReady = true;

            updated.sslState = 'ready';

        }


        if (
            diagnosticsReady &&
            discoveredDomain
        ) {

            updated.domainStatus = 'active';

        }


        // Netlify URL fallback
        if (!updated.liveUrl) {

            updated.liveUrl =
                discoveredUrl ||
                netlifySite.url ||
                '';

        }


        // TXT warning is NOT a failure
        const txt =
            checks.dns?.txtChallenge ||
            checks.txtChallenge ||
            {};

        updated.__txtWarning =
            txt.status === 'warning' ||
            (
                txt.present === true &&
                txt.verified === false
            );


        updated.__diagnostics = payload;

        updated.__diagnosticsChecks = checks;

        updated.__netlifySite = netlifySite;

        updated.__customDomainCheck = customDomainCheck;

        return updated;
    }


    // =====================================================
    // 8. SAFE PROJECT URL
    // =====================================================

    function getSafeProjectUrl(site) {

        if (!site || typeof site !== 'object') {
            return null;
        }

        const possibleUrls = [

            site.customUrl,

            site.customDomain,

            site.liveUrl,

            site.url,

            site.__netlifySite?.url,

            site.__netlifySite?.attachedDomains

        ];

        let url = '';

        for (const candidate of possibleUrls) {

            const canonical =
                canonicalCustomUrl(candidate);

            if (canonical) {

                url = canonical;

                break;

            }
        }


        if (!url) {
            return null;
        }


        const domainStatus = String(
            site.domainStatus ||
            site.status ||
            ''
        ).toLowerCase();

        const sslState = String(
            site.sslState ||
            ''
        ).toLowerCase();


        const readyState = [
            'active',
            'ready',
            'live',
            'verified',
            'connected'
        ].includes(domainStatus);


        const ready =
            readyState ||
            site.sslReady === true ||
            sslState === 'ready' ||
            site.__diagnosticsReady === true;


        /*
         * If backend already supplied a valid
         * TemplateCraft domain, accept it.
         *
         * This prevents the dashboard from showing
         * "domain pending" when diagnostics already
         * proves the domain is working.
         */

        if (ready || url) {
            return url;
        }

        return null;
    }


    // =====================================================
    // 9. DOMAIN STATUS
    // =====================================================

    function getDomainStatus(site, projectUrl) {

        if (projectUrl) {
            return null;
        }

        const status = String(
            site?.domainStatus ||
            site?.status ||
            ''
        ).toLowerCase();

        if (
            status === 'failed' ||
            status === 'error'
        ) {

            return {
                type: 'error',
                icon: '❌',
                title: 'تعذر تجهيز الدومين',
                text:
                    site.domainError ||
                    'حدث خطأ أثناء تجهيز الدومين.'
            };

        }


        if (
            status === 'active' ||
            status === 'ready' ||
            status === 'live' ||
            status === 'verified' ||
            status === 'connected' ||
            site?.sslReady === true ||
            String(site?.sslState || '').toLowerCase() === 'ready'
        ) {

            return {
                type: 'waiting',
                icon: '🔄',
                title: 'جاري تحميل رابط الدومين',
                text:
                    'الدومين جاهز، جاري تحميل الرابط.'
            };

        }


        return {
            type: 'waiting',
            icon: '⏳',
            title: 'جاري تجهيز الدومين',
            text:
                'يتم التحقق من إعداد الدومين وشهادة SSL. سيظهر الرابط عند اكتمال العملية.'
        };
    }


    // =====================================================
    // 10. GET DOMAIN STATUS FROM API
    // =====================================================

    async function fetchDomainStatus(site) {

        if (!site?.id) {
            return site;
        }

        try {

            if (
                !window.TemplateCraftAPI ||
                typeof TemplateCraftAPI.getDomainStatus !== 'function'
            ) {
                return site;
            }


            const result =
                await TemplateCraftAPI.getDomainStatus(site.id);

            if (
                !result ||
                result.success === false
            ) {
                return site;
            }


            const payload =
                unwrapResponse(result);


            const updated = {
                ...site
            };


            const status =
                payload.domainStatus ||
                payload.status ||
                payload.state ||
                payload;


            if (typeof status === 'string') {

                updated.domainStatus =
                    status.toLowerCase();

            }


            if (payload.customDomain) {

                updated.customDomain =
                    firstValidDomain(
                        payload.customDomain
                    ) ||
                    updated.customDomain;

            }


            if (payload.customUrl) {

                updated.customUrl =
                    canonicalCustomUrl(
                        payload.customUrl
                    ) ||
                    updated.customUrl;

            }


            if (payload.liveUrl) {

                updated.liveUrl =
                    canonicalCustomUrl(
                        payload.liveUrl
                    ) ||
                    updated.liveUrl;

            }


            if (
                payload.sslReady === true
            ) {

                updated.sslReady = true;

            }


            if (payload.sslState) {

                updated.sslState =
                    String(
                        payload.sslState
                    ).toLowerCase();

            }


            return updated;

        } catch (error) {

            console.warn(
                '[PROFILE] domain status error:',
                error
            );

            return site;
        }
    }


    // =====================================================
    // 11. FETCH DIAGNOSTICS
    // =====================================================

    async function fetchDiagnostics(site) {

        if (!site?.id) {
            return site;
        }

        try {

            if (
                !window.TemplateCraftAPI ||
                typeof TemplateCraftAPI.getDomainDiagnostics !== 'function'
            ) {
                return site;
            }


            const result =
                await TemplateCraftAPI.getDomainDiagnostics(site.id);


            if (
                !result ||
                result.success === false
            ) {
                return site;
            }


            const payload =
                unwrapResponse(result);


            diagnosticsCache.set(
                site.id,
                payload
            );


            return applyDiagnosticsToSite(
                site,
                payload
            );

        } catch (error) {

            console.warn(
                '[PROFILE] diagnostics error:',
                error
            );

            return site;
        }
    }


    // =====================================================
    // 12. ENRICH PROJECT
    // =====================================================

    async function enrichProject(site) {

        let current = {
            ...site
        };


        // First get normal domain status
        current =
            await fetchDomainStatus(current);


        /*
         * IMPORTANT:
         *
         * Do NOT stop just because status says READY
         * if the URL is missing.
         *
         * Diagnostics will discover the URL.
         */

        const existingUrl =
            getSafeProjectUrl(current);


        const statusReady =
            [
                'active',
                'ready',
                'live',
                'verified',
                'connected'
            ].includes(
                String(
                    current.domainStatus ||
                    ''
                ).toLowerCase()
            );


        const sslReady =
            current.sslReady === true ||
            String(
                current.sslState || ''
            ).toLowerCase() === 'ready';


        if (
            !existingUrl ||
            !statusReady ||
            !sslReady
        ) {

            domainStatusInProgress.add(
                site.id
            );

            try {

                current =
                    await fetchDiagnostics(
                        current
                    );

            } finally {

                domainStatusInProgress.delete(
                    site.id
                );

            }

        }


        /*
         * One final URL extraction from
         * cached diagnostics.
         */

        const cached =
            diagnosticsCache.get(
                site.id
            );


        if (
            cached &&
            !getSafeProjectUrl(current)
        ) {

            current =
                applyDiagnosticsToSite(
                    current,
                    cached
                );

        }


        return current;
    }


    // =====================================================
    // 13. FORMAT DATE
    // =====================================================

    function formatDate(value) {

        if (!value) {
            return '--';
        }

        try {

            return new Intl.DateTimeFormat(
                'ar-MA',
                {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }
            ).format(
                new Date(value)
            );

        } catch {

            return String(value);
        }
    }


    // =====================================================
    // 14. UPDATE STATS
    // =====================================================

    function updateStats(sites) {

        const total =
            sites.length;

        let published = 0;

        let unpublished = 0;

        let customDomains = 0;


        sites.forEach(site => {

            const url =
                getSafeProjectUrl(site);


            if (url) {

                published++;

                customDomains++;

            } else {

                unpublished++;

            }

        });


        const totalEl =
            $('#total-sites');

        const publishedEl =
            $('#published-sites');

        const unpublishedEl =
            $('#unpublished-sites');

        const customDomainsEl =
            $('#custom-domains');


        if (totalEl) {
            totalEl.textContent = total;
        }

        if (publishedEl) {
            publishedEl.textContent = published;
        }

        if (unpublishedEl) {
            unpublishedEl.textContent = unpublished;
        }

        if (customDomainsEl) {
            customDomainsEl.textContent =
                customDomains;
        }

    }


    // =====================================================
    // 15. DIAGNOSTIC HTML
    // =====================================================

    function renderDiagnosticValue(
        label,
        value
    ) {

        return `
            <div class="text-xs text-slate-400 leading-6">
                <span class="text-slate-500">
                    ${escapeHtml(label)}:
                </span>
                <span class="text-slate-300 break-all">
                    ${escapeHtml(
                        value === undefined ||
                        value === null ||
                        value === ''
                            ? '-'
                            : value
                    )}
                </span>
            </div>
        `;
    }


    function renderDiagnostics(
        payload
    ) {

        if (!payload) {
            return '';
        }


        const checks =
            getSiteChecks(payload);


        const database =
            checks.database ||
            {};

        const netlifySite =
            checks.netlifySite ||
            checks.netlify ||
            checks.site ||
            {};

        const customDomain =
            checks.customDomain ||
            checks.domain ||
            {};

        const dns =
            checks.dns ||
            {};

        const cname =
            dns.cname ||
            checks.cname ||
            {};

        const txt =
            dns.txtChallenge ||
            checks.txtChallenge ||
            {};

        const ssl =
            checks.ssl ||
            payload.ssl ||
            {};


        const ready =
            isDiagnosticsReady(payload);


        const reason =
            payload.reason ||
            payload.message ||
            payload.resultReason ||
            '';


        const requestId =
            payload.requestId ||
            '';


        return `
            <div class="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800">

                <div class="flex items-center gap-2 mb-3">

                    <span class="text-green-400">
                        ${ready ? '✅' : '⚠️'}
                    </span>

                    <strong class="text-sm">
                        ${
                            ready
                                ? 'الفحص مكتمل: SSL جاهز'
                                : 'نتيجة فحص SSL'
                        }
                    </strong>

                </div>


                ${
                    reason
                        ? `
                            <p class="text-xs text-slate-300 leading-6 mb-4">
                                ${escapeHtml(reason)}
                            </p>
                        `
                        : ''
                }


                <div class="space-y-3">


                    <div>
                        <div class="text-sm font-bold mb-1">
                            ${
                                database.error
                                    ? '❌'
                                    : '✅'
                            }
                            اتصال قاعدة البيانات
                        </div>

                        ${
                            database.error
                                ? renderDiagnosticValue(
                                    'error',
                                    database.error
                                )
                                : ''
                        }
                    </div>


                    <div>
                        <div class="text-sm font-bold mb-1">
                            ${
                                netlifySite.error
                                    ? '❌'
                                    : '✅'
                            }
                            وجود موقع Netlify
                        </div>

                        ${renderDiagnosticValue(
                            'siteId',
                            netlifySite.siteId ||
                            netlifySite.id
                        )}

                        ${renderDiagnosticValue(
                            'name',
                            netlifySite.name
                        )}

                        ${renderDiagnosticValue(
                            'url',
                            netlifySite.url
                        )}

                        ${renderDiagnosticValue(
                            'attachedDomains',
                            Array.isArray(
                                netlifySite.attachedDomains
                            )
                                ? netlifySite.attachedDomains.join(', ')
                                : netlifySite.attachedDomains
                        )}

                        ${renderDiagnosticValue(
                            'error',
                            netlifySite.error
                        )}

                        ${renderDiagnosticValue(
                            'httpStatus',
                            netlifySite.httpStatus
                        )}

                        ${renderDiagnosticValue(
                            'code',
                            netlifySite.code
                        )}
                    </div>


                    <div>
                        <div class="text-sm font-bold mb-1">
                            ${
                                customDomain.error
                                    ? '❌'
                                    : '✅'
                            }
                            ربط الدومين
                        </div>

                        ${renderDiagnosticValue(
                            'hostname',
                            customDomain.hostname ||
                            customDomain.domain
                        )}

                        ${renderDiagnosticValue(
                            'attached',
                            customDomain.attached === true
                                ? 'نعم'
                                : customDomain.attached === false
                                    ? 'لا'
                                    : '-'
                        )}

                        ${renderDiagnosticValue(
                            'attachedDomains',
                            Array.isArray(
                                customDomain.attachedDomains
                            )
                                ? customDomain.attachedDomains.join(', ')
                                : customDomain.attachedDomains
                        )}

                        ${renderDiagnosticValue(
                            'error',
                            customDomain.error
                        )}
                    </div>


                    <div>
                        <div class="text-sm font-bold mb-1">
                            ${
                                cname.error
                                    ? '❌'
                                    : '✅'
                            }
                            إعدادات DNS
                        </div>

                        ${renderDiagnosticValue(
                            'الدومين الخاص',
                            customDomain.hostname ||
                            customDomain.domain
                        )}

                        <div class="mt-2 text-xs font-semibold text-slate-400">
                            سجل CNAME
                        </div>

                        ${renderDiagnosticValue(
                            'expectedTarget',
                            cname.expectedTarget
                        )}

                        ${renderDiagnosticValue(
                            'error',
                            cname.error
                        )}


                        <div class="mt-3 text-xs font-semibold text-slate-400">
                            TXT Challenge
                        </div>

                        ${renderDiagnosticValue(
                            'hostname',
                            txt.hostname
                        )}

                        ${renderDiagnosticValue(
                            'present',
                            txt.present === true
                                ? 'نعم'
                                : txt.present === false
                                    ? 'لا'
                                    : '-'
                        )}

                        ${renderDiagnosticValue(
                            'matches',
                            txt.matches
                        )}

                        ${renderDiagnosticValue(
                            'verified',
                            txt.verified
                        )}

                        ${renderDiagnosticValue(
                            'status',
                            txt.status
                        )}

                        ${
                            txt.warning
                                ? `
                                    <div class="mt-2 text-xs text-yellow-400 leading-6">
                                        warning:
                                        ${escapeHtml(txt.warning)}
                                    </div>
                                `
                                : ''
                        }

                        ${renderDiagnosticValue(
                            'error',
                            txt.error
                        )}
                    </div>


                    <div>
                        <div class="text-sm font-bold mb-1">
                            ${
                                ssl.error
                                    ? '❌'
                                    : '✅'
                            }
                            حالة SSL
                        </div>

                        ${renderDiagnosticValue(
                            'state',
                            ssl.state
                        )}

                        ${renderDiagnosticValue(
                            'certificateExists',
                            ssl.certificateExists
                        )}

                        ${renderDiagnosticValue(
                            'anyCertificateExists',
                            ssl.anyCertificateExists
                        )}

                        ${renderDiagnosticValue(
                            'domainMatches',
                            ssl.domainMatches
                        )}

                        ${renderDiagnosticValue(
                            'sslState',
                            ssl.sslState
                        )}

                        ${renderDiagnosticValue(
                            'error',
                            ssl.error
                        )}

                        ${renderDiagnosticValue(
                            'httpStatus',
                            ssl.httpStatus
                        )}

                        ${renderDiagnosticValue(
                            'code',
                            ssl.code
                        )}
                    </div>


                    ${
                        requestId
                            ? `
                                <div class="text-xs text-slate-500 pt-2 border-t border-slate-800">
                                    Request ID:
                                    ${escapeHtml(requestId)}
                                </div>
                            `
                            : ''
                    }

                </div>


                <p class="text-xs text-slate-500 leading-6 mt-4">
                    هذا الفحص لا يغير إعدادات DNS ولا يطلب إصدار شهادة SSL.
                </p>

            </div>
        `;
    }


    // =====================================================
    // 16. PROJECT CARD
    // =====================================================

    function createProjectCard(
        site,
        index
    ) {

        const projectUrl =
            getSafeProjectUrl(site);


        const domainStatus =
            getDomainStatus(
                site,
                projectUrl
            );


        const domainName =
            projectUrl
                ? projectUrl.replace(
                    /^https?:\/\//,
                    ''
                ).replace(
                    /\/$/,
                    ''
                )
                : (
                    site.customDomain ||
                    site.customUrl ||
                    'الدومين الخاص قيد التجهيز...'
                );


        const diagnostics =
            diagnosticsCache.get(
                site.id
            );


        const isBusy =
            site.status === 'deleting' ||
            site.status === 'publishing';


        const cardId =
            `project-card-${index}`;


        return `
            <article
                id="${cardId}"
                class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">

                <div class="flex items-start justify-between gap-4 mb-4">

                    <div class="min-w-0">

                        <h4 class="text-lg font-extrabold truncate">
                            ${escapeHtml(
                                site.siteName ||
                                site.name ||
                                'مشروع بدون اسم'
                            )}
                        </h4>

                        <p class="text-sm text-slate-400 mt-1">
                            ${escapeHtml(
                                site.templateId ||
                                site.template ||
                                'template'
                            )}
                        </p>

                    </div>


                    <div class="shrink-0 text-blue-400">
                        <i class="fa-solid fa-layer-group"></i>
                    </div>

                </div>


                <div class="space-y-2 text-sm mb-5">

                    <div class="text-slate-400">
                        الصنف:
                        <span class="text-slate-300">
                            ${escapeHtml(
                                site.category ||
                                site.type ||
                                '-'
                            )}
                        </span>
                    </div>


                    <div class="text-slate-400">
                        تاريخ الإنشاء:
                        <span class="text-slate-300">
                            ${escapeHtml(
                                formatDate(
                                    site.createdAt ||
                                    site.created_at
                                )
                            )}
                        </span>
                    </div>

                </div>


                ${
                    projectUrl
                        ? `
                            <div class="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">

                                <div class="flex items-center gap-2 mb-2">

                                    <span class="text-green-400">
                                        ✅
                                    </span>

                                    <strong class="text-sm text-green-300">
                                        الدومين جاهز
                                    </strong>

                                </div>

                                <a
                                    href="${escapeHtml(projectUrl)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-sm text-blue-400 hover:text-blue-300 break-all">
                                    ${escapeHtml(domainName)}
                                </a>

                                <div class="text-xs text-green-400 mt-2">
                                    SSL: جاهز
                                </div>

                            </div>
                        `
                        : `
                            <div class="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">

                                <div class="flex items-center gap-2 mb-2">

                                    <span>
                                        ${domainStatus?.icon || '⏳'}
                                    </span>

                                    <strong class="text-sm text-yellow-300">
                                        ${
                                            domainStatus?.title ||
                                            'جاري تجهيز الدومين'
                                        }
                                    </strong>

                                </div>

                                <p class="text-xs text-slate-400 leading-6">
                                    ${
                                        domainStatus?.text ||
                                        'يتم التحقق من إعداد الدومين وشهادة SSL.'
                                    }
                                </p>

                            </div>
                        `
                }


                ${
                    projectUrl
                        ? `
                            <div class="mb-4">

                                <div class="text-xs text-slate-500 mb-1">
                                    الدومين الخاص
                                </div>

                                <a
                                    href="${escapeHtml(projectUrl)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-sm text-blue-400 hover:text-blue-300 break-all">
                                    ${escapeHtml(projectUrl)}
                                </a>

                            </div>
                        `
                        : ''
                }


                <div class="space-y-3">


                    <button
                        type="button"
                        class="btn-check-ssl w-full px-4 py-2.5 rounded-xl text-sm font-bold"
                        data-action="check-ssl"
                        data-site-id="${escapeHtml(site.id)}"
                        ${isBusy ? 'disabled' : ''}>

                        <i class="fa-solid fa-shield-halved ml-1"></i>
                        Check SSL

                    </button>


                    ${
                        diagnostics
                            ? renderDiagnostics(
                                diagnostics
                            )
                            : ''
                    }


                    <div class="grid grid-cols-2 gap-2 pt-2">


                        <button
                            type="button"
                            data-action="edit"
                            data-site-id="${escapeHtml(site.id)}"
                            class="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold">

                            <i class="fa-solid fa-pen ml-1"></i>
                            تعديل المشروع

                        </button>


                        ${
                            projectUrl
                                ? `
                                    <a
                                        href="${escapeHtml(projectUrl)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="px-3 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-sm font-bold text-center">

                                        <i class="fa-solid fa-eye ml-1"></i>
                                        المعاينة

                                    </a>
                                `
                                : `
                                    <button
                                        type="button"
                                        disabled
                                        class="px-3 py-2 rounded-xl bg-slate-800 text-slate-500 text-sm font-bold cursor-not-allowed">

                                        <i class="fa-solid fa-eye ml-1"></i>
                                        المعاينة غير متاحة

                                    </button>
                                `
                        }


                        ${
                            projectUrl
                                ? `
                                    <button
                                        type="button"
                                        data-action="copy"
                                        data-url="${escapeHtml(projectUrl)}"
                                        class="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-bold">

                                        <i class="fa-solid fa-copy ml-1"></i>
                                        نسخ الرابط

                                    </button>
                                `
                                : `
                                    <button
                                        type="button"
                                        disabled
                                        class="px-3 py-2 rounded-xl bg-slate-800 text-slate-500 text-sm font-bold cursor-not-allowed">

                                        <i class="fa-solid fa-copy ml-1"></i>
                                        نسخ الرابط

                                    </button>
                                `
                        }


                        <button
                            type="button"
                            data-action="delete"
                            data-site-id="${escapeHtml(site.id)}"
                            class="px-3 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-sm font-bold">

                            <i class="fa-solid fa-trash ml-1"></i>
                            حذف المشروع

                        </button>

                    </div>

                </div>

            </article>
        `;
    }


    // =====================================================
    // 17. RENDER PROJECTS
    // =====================================================

    function renderProjects(sites) {

        const grid =
            $('#sites-grid');

        if (!grid) {
            return;
        }


        if (!sites.length) {

            grid.innerHTML = `
                <div class="col-span-full text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">

                    <i class="fa-solid fa-folder-open text-4xl text-slate-600 mb-4"></i>

                    <p class="text-slate-400">
                        لا توجد مشاريع حالياً
                    </p>

                </div>
            `;

            updateStats([]);

            return;
        }


        grid.innerHTML =
            sites
                .map(
                    (site, index) =>
                        createProjectCard(
                            site,
                            index
                        )
                )
                .join('');


        updateStats(sites);

        attachCardEvents();

    }


    // =====================================================
    // 18. COPY URL
    // =====================================================

    async function copyUrl(url) {

        if (!url) {
            return;
        }

        try {

            await navigator.clipboard.writeText(
                url
            );

            alert(
                'تم نسخ رابط الموقع بنجاح'
            );

        } catch {

            const textarea =
                document.createElement('textarea');

            textarea.value = url;

            textarea.style.position =
                'fixed';

            textarea.style.opacity =
                '0';

            document.body.appendChild(
                textarea
            );

            textarea.select();

            try {
                document.execCommand(
                    'copy'
                );
            } catch {}

            textarea.remove();

            alert(
                'تم نسخ الرابط'
            );
        }
    }


    // =====================================================
    // 19. EDIT PROJECT
    // =====================================================

    function editProject(siteId) {

        if (!siteId) {
            return;
        }

        window.location.href =
            `./editor.html?siteId=${encodeURIComponent(siteId)}`;
    }


    // =====================================================
    // 20. DELETE PROJECT
    // =====================================================

    async function deleteProject(siteId) {

        if (!siteId) {
            return;
        }


        const site =
            lastSites.find(
                item =>
                    String(item.id) ===
                    String(siteId)
            );


        const name =
            site?.siteName ||
            site?.name ||
            'هذا المشروع';


        const confirmed =
            window.confirm(
                `هل أنت متأكد من حذف المشروع "${name}"؟\n\nسيتم حذف المشروع نهائياً.`
            );


        if (!confirmed) {
            return;
        }


        try {

            if (
                !window.TemplateCraftAPI ||
                typeof TemplateCraftAPI.deleteSite !== 'function'
            ) {

                alert(
                    'واجهة حذف المشروع غير متاحة.'
                );

                return;
            }


            const result =
                await TemplateCraftAPI.deleteSite(
                    siteId
                );


            if (
                !result ||
                result.success === false
            ) {

                throw new Error(
                    result?.message ||
                    result?.error ||
                    'فشل حذف المشروع'
                );

            }


            alert(
                'تم حذف المشروع بنجاح'
            );


            await loadUserSites();


        } catch (error) {

            console.error(
                '[PROFILE] delete error:',
                error
            );

            alert(
                error?.message ||
                'تعذر حذف المشروع'
            );
        }
    }


    // =====================================================
    // 21. CHECK SSL
    // =====================================================

    async function checkProjectSSL(
        siteId,
        button
    ) {

        if (!siteId) {
            return;
        }


        if (
            domainStatusInProgress.has(
                siteId
            )
        ) {
            return;
        }


        const originalText =
            button
                ? button.innerHTML
                : 'Check SSL';


        if (button) {

            button.disabled = true;

            button.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin ml-1"></i>
                جاري الفحص...
            `;

        }


        try {

            if (
                !window.TemplateCraftAPI ||
                typeof TemplateCraftAPI.getDomainDiagnostics !== 'function'
            ) {

                throw new Error(
                    'واجهة فحص SSL غير متاحة.'
                );

            }


            domainStatusInProgress.add(
                siteId
            );


            const result =
                await TemplateCraftAPI.getDomainDiagnostics(
                    siteId
                );


            if (
                !result ||
                result.success === false
            ) {

                throw new Error(
                    result?.message ||
                    result?.error ||
                    'فشل فحص SSL'
                );

            }


            const payload =
                unwrapResponse(result);


            diagnosticsCache.set(
                siteId,
                payload
            );


            const index =
                lastSites.findIndex(
                    site =>
                        String(site.id) ===
                        String(siteId)
                );


            if (index !== -1) {

                lastSites[index] =
                    applyDiagnosticsToSite(
                        lastSites[index],
                        payload
                    );

            }


            /*
             * Re-render immediately.
             *
             * This is important because the first
             * diagnostics check can discover the URL.
             */

            renderProjects(
                lastSites
            );


        } catch (error) {

            console.error(
                '[PROFILE] SSL check error:',
                error
            );

            alert(
                error?.message ||
                'تعذر فحص SSL'
            );

        } finally {

            domainStatusInProgress.delete(
                siteId
            );


            if (
                button &&
                document.body.contains(button)
            ) {

                button.disabled = false;

                button.innerHTML =
                    originalText;

            }

        }
    }


    // =====================================================
    // 22. CARD EVENTS
    // =====================================================

    function attachCardEvents() {

        const grid =
            $('#sites-grid');

        if (!grid) {
            return;
        }


        grid
            .querySelectorAll(
                '[data-action]'
            )
            .forEach(element => {

                element.addEventListener(
                    'click',
                    async event => {

                        const action =
                            element.dataset.action;


                        if (
                            action === 'copy'
                        ) {

                            await copyUrl(
                                element.dataset.url
                            );

                            return;
                        }


                        const siteId =
                            element.dataset.siteId;


                        if (
                            action === 'edit'
                        ) {

                            editProject(
                                siteId
                            );

                            return;
                        }


                        if (
                            action === 'delete'
                        ) {

                            await deleteProject(
                                siteId
                            );

                            return;
                        }


                        if (
                            action === 'check-ssl'
                        ) {

                            await checkProjectSSL(
                                siteId,
                                element
                            );

                        }

                    }
                );

            });

    }


    // =====================================================
    // 23. LOAD PROJECTS
    // =====================================================

    async function loadUserSites() {

        const grid =
            $('#sites-grid');


        if (grid) {

            grid.innerHTML = `
                <div class="col-span-full text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">

                    <i class="fa-solid fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>

                    <p class="text-slate-400">
                        جاري تحميل المشاريع...
                    </p>

                </div>
            `;

        }


        try {

            if (
                !window.TemplateCraftAPI ||
                typeof TemplateCraftAPI.getSites !== 'function'
            ) {

                throw new Error(
                    'TemplateCraftAPI غير متاحة. تأكد من تحميل client-api.js قبل profile.js.'
                );

            }


            const result =
                await TemplateCraftAPI.getSites();


            if (
                !result ||
                result.success === false
            ) {

                throw new Error(
                    result?.message ||
                    result?.error ||
                    'تعذر تحميل المشاريع'
                );

            }


            const payload =
                unwrapResponse(result);


            let sites =
                payload.sites ||
                payload.projects ||
                payload.data ||
                payload ||
                [];


            if (!Array.isArray(sites)) {

                sites = [];

            }


            /*
             * Normalize ID.
             */

            sites =
                sites.map(site => ({
                    ...site,

                    id:
                        site.id ||
                        site._id ||
                        site.siteId ||
                        site.projectId
                }));


            /*
             * Enrich every project.
             *
             * Diagnostics will be called only when
             * the normal project data doesn't already
             * contain a usable domain.
             */

            const enriched = [];

            for (
                const site of sites
            ) {

                try {

                    const result =
                        await enrichProject(
                            site
                        );

                    enriched.push(
                        result
                    );

                } catch (error) {

                    console.warn(
                        '[PROFILE] project enrichment failed:',
                        site,
                        error
                    );

                    enriched.push(
                        site
                    );

                }

            }


            lastSites =
                enriched;


            renderProjects(
                lastSites
            );


            const updated =
                $('#last-updated');


            if (updated) {

                updated.textContent =
                    `آخر تحديث: ${new Date().toLocaleTimeString(
                        'ar-MA'
                    )}`;

            }


        } catch (error) {

            console.error(
                '[PROFILE] load projects error:',
                error
            );


            if (grid) {

                grid.innerHTML = `
                    <div class="col-span-full text-center py-16 bg-slate-900 border border-red-500/20 rounded-2xl">

                        <i class="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-4"></i>

                        <p class="text-red-300 font-bold mb-2">
                            تعذر تحميل المشاريع
                        </p>

                        <p class="text-sm text-slate-500">
                            ${escapeHtml(
                                error?.message ||
                                'حدث خطأ غير معروف'
                            )}
                        </p>

                    </div>
                `;

            }

        }

    }


    // =====================================================
    // 24. LOGOUT
    // =====================================================

    function setupLogout() {

        const button =
            $('#logout-button');

        if (!button) {
            return;
        }


        button.addEventListener(
            'click',
            async () => {

                try {

                    if (
                        window.TemplateCraftAPI &&
                        typeof TemplateCraftAPI.logout === 'function'
                    ) {

                        await TemplateCraftAPI.logout();

                    }

                } catch (error) {

                    console.warn(
                        '[PROFILE] logout error:',
                        error
                    );

                } finally {

                    localStorage.removeItem(
                        'templatecraft_token'
                    );

                    localStorage.removeItem(
                        'token'
                    );

                    sessionStorage.clear();

                    window.location.href =
                        './index.html';

                }

            }
        );

    }


    // =====================================================
    // 25. MANUAL REFRESH
    // =====================================================

    function setupRefresh() {

        const button =
            $('#refresh-projects');

        if (!button) {
            return;
        }


        button.addEventListener(
            'click',
            async () => {

                if (button.disabled) {
                    return;
                }


                const original =
                    button.innerHTML;


                button.disabled = true;

                button.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin ml-1"></i>
                    جاري التحديث...
                `;


                try {

                    await loadUserSites();

                } finally {

                    button.disabled = false;

                    button.innerHTML =
                        original;

                }

            }
        );

    }


    // =====================================================
    // 26. INIT
    // =====================================================

    async function init() {

        setupLogout();

        setupRefresh();

        /*
         * ONLY ONE INITIAL LOAD.
         *
         * NO setInterval
         * NO automatic 30-second refresh
         * NO visibility refresh
         */

        await loadUserSites();

    }


    // =====================================================
    // 27. START
    // =====================================================

    if (
        document.readyState === 'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            init,
            {
                once: true
            }
        );

    } else {

        init();

    }

})();
