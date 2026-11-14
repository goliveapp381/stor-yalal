
/*
==================================================
 TEMPLATECRAFT PRO - NETLIFY FRONTEND
 File: create-project-netlify.js

 المسؤوليات:
 - ربط حساب Netlify عبر OAuth Popup
 - استقبال نتيجة OAuth من Backend
 - التحقق من حالة الاتصال
 - جلب Team المختار وعرض اسمه
 - اختيار Team باستعمال accountSlug عند الحاجة
 - قطع الاتصال
 - توفير واجهة TemplateCraftNetlify للملفات الأخرى

 لا توجد قائمة لاختيار Teams في الواجهة.
==================================================
*/

(function () {
    'use strict';

    const API = window.TemplateCraftAPI;

    const BACKEND_URL =
        window.TEMPLATECRAFT_API_BASE_URL ||
        'https://templatecraft-backend.onrender.com';

    const FRONTEND_ORIGIN = window.location.origin;

    const POPUP_NAME = 'TemplateCraftNetlifyOAuth';

    const POPUP_WIDTH = 600;
    const POPUP_HEIGHT = 750;

    let netlifyState = {
        loading: false,
        connected: false,
        teamSelected: false,
        teamName: '',
        teamSlug: '',
        teamId: '',
        message: ''
    };

    let oauthPopup = null;
    let oauthCheckInterval = null;
    let refreshPromise = null;

    // ============================================
    // 1. DOM HELPERS
    // ============================================

    function getElement(id) {
        return document.getElementById(id);
    }

    function showElement(id) {
        const element = getElement(id);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    function hideElement(id) {
        const element = getElement(id);
        if (element) {
            element.classList.add('hidden');
        }
    }

    function setText(id, value) {
        const element = getElement(id);
        if (element) {
            element.textContent = value || '';
        }
    }

    function setMessage(message, isError = false) {
        netlifyState.message = message || '';

        const element = getElement('netlifyConnectionMessage');

        if (!element) return;

        element.textContent = message || '';
        element.classList.remove('hidden');

        element.classList.toggle('text-red-600', isError);
        element.classList.toggle('text-green-600', !isError);
    }

    function clearMessage() {
        hideElement('netlifyConnectionMessage');
    }

    // ============================================
    // 2. API HELPERS
    // ============================================

    async function apiRequest(path, options = {}) {
        if (!API) {
            throw new Error(
                'ملف client-api.js غير محمّل.'
            );
        }

        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error(
                'خاصك تسجل الدخول أولاً.'
            );
        }

        const response = await fetch(
            `${BACKEND_URL}${path}`,
            {
                method: options.method || 'GET',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...(options.headers || {})
                },

                body: options.body
                    ? JSON.stringify(options.body)
                    : undefined
            }
        );

        let data = {};

        try {
            data = await response.json();
        } catch (_) {
            data = {};
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message ||
                data.error ||
                `خطأ في الاتصال بالخادم (${response.status})`
            );
        }

        return data;
    }

    // ============================================
    // 3. UPDATE NETLIFY UI
    // ============================================

    function renderNetlifyState() {
        const {
            loading,
            connected,
            teamSelected,
            teamName
        } = netlifyState;

        const dot = getElement('netlifyStatusDot');

        if (dot) {
            dot.classList.remove(
                'bg-green-500',
                'bg-red-500',
                'bg-yellow-500',
                'bg-gray-400'
            );

            if (loading) {
                dot.classList.add('bg-yellow-500');
            } else if (connected && teamSelected) {
                dot.classList.add('bg-green-500');
            } else if (connected) {
                dot.classList.add('bg-yellow-500');
            } else {
                dot.classList.add('bg-gray-400');
            }
        }

        if (loading) {
            setText(
                'netlifyStatusText',
                'جاري التحقق من Netlify...'
            );
        } else if (connected && teamSelected) {
            setText(
                'netlifyStatusText',
                'Netlify متصل وجاهز للنشر'
            );
        } else if (connected) {
            setText(
                'netlifyStatusText',
                'Netlify متصل، خاص اختيار Team'
            );
        } else {
            setText(
                'netlifyStatusText',
                'Netlify غير متصل'
            );
        }

        if (connected) {
            showElement('netlifyConnectedInfo');
            hideElement('netlifyNotConnectedInfo');

            setText(
                'netlifyMainTeamName',
                teamSelected ? teamName : 'لم يتم تحديد Team'
            );
        } else {
            hideElement('netlifyConnectedInfo');
            showElement('netlifyNotConnectedInfo');

            setText(
                'netlifyMainTeamName',
                ''
            );
        }

        const button = getElement('connectNetlifyBtn');

        if (button) {
            button.disabled = loading;

            button.classList.toggle(
                'opacity-50',
                loading
            );

            button.classList.toggle(
                'cursor-not-allowed',
                loading
            );
        }

        setText(
            'connectNetlifyBtnText',
            loading
                ? 'جاري المعالجة...'
                : connected
                    ? 'تحديث اتصال Netlify'
                    : 'ربط حساب Netlify'
        );

        // تحديث معلومات نافذة التأكيد
        setText(
            'confirmNetlifyTeamName',
            teamSelected ? teamName : 'غير محدد'
        );

        if (connected && teamSelected) {
            showElement('confirmNetlifyTeamBox');
            hideElement('confirmNetlifyWarning');
        } else {
            hideElement('confirmNetlifyTeamBox');
            showElement('confirmNetlifyWarning');
        }

        // إشعار الملفات الأخرى بتغيير الحالة
        window.dispatchEvent(
            new CustomEvent('templatecraft:netlify-state', {
                detail: { ...netlifyState }
            })
        );
    }

    // ============================================
    // 4. REFRESH NETLIFY STATUS
    // ============================================

    async function refreshStatus() {
        if (refreshPromise) {
            return refreshPromise;
        }

        refreshPromise = (async function () {
            netlifyState.loading = true;
            renderNetlifyState();

            try {
                let statusData;

                if (API && typeof API.getNetlifyStatus === 'function') {
                    statusData = await API.getNetlifyStatus();
                } else {
                    statusData = await apiRequest(
                        '/api/netlify/status'
                    );
                }

                const netlify = statusData.netlify || {};

                netlifyState.connected =
                    netlify.connected === true;

                netlifyState.teamSelected =
                    netlify.teamSelected === true;

                netlifyState.teamName =
                    netlify.teamName ||
                    netlify.accountName ||
                    netlify.selectedTeam?.name ||
                    '';

                netlifyState.teamSlug =
                    netlify.teamSlug ||
                    netlify.accountSlug ||
                    netlify.selectedTeam?.slug ||
                    '';

                netlifyState.teamId =
                    netlify.teamId ||
                    netlify.accountId ||
                    netlify.selectedTeam?.id ||
                    '';

                // إذا كان الحساب متصلاً ولم يتم تحديد Team،
                // نتحقق واش كاين Team واحد فقط.
                if (
                    netlifyState.connected &&
                    !netlifyState.teamSelected
                ) {
                    await trySelectSingleTeam();
                }

                return { ...netlifyState };

            } catch (error) {
                console.error(
                    'Netlify status error:',
                    error
                );

                netlifyState.connected = false;
                netlifyState.teamSelected = false;
                netlifyState.teamName = '';
                netlifyState.teamSlug = '';
                netlifyState.teamId = '';

                setMessage(
                    error.message ||
                    'تعذر التحقق من اتصال Netlify.',
                    true
                );

                return { ...netlifyState };

            } finally {
                netlifyState.loading = false;
                renderNetlifyState();
                refreshPromise = null;
            }
        })();

        return refreshPromise;
    }

    // ============================================
    // 5. AUTO SELECT ONLY IF ONE TEAM EXISTS
    // ============================================

    async function trySelectSingleTeam() {
        try {
            let teamsData;

            if (API && typeof API.getNetlifyTeams === 'function') {
                teamsData = await API.getNetlifyTeams();
            } else {
                teamsData = await apiRequest(
                    '/api/netlify/teams'
                );
            }

            const teams = Array.isArray(teamsData.teams)
                ? teamsData.teams
                : [];

            const selectedTeam = teamsData.selectedTeam;

            if (selectedTeam && selectedTeam.slug) {
                netlifyState.teamSelected = true;
                netlifyState.teamName =
                    selectedTeam.name || '';

                netlifyState.teamSlug =
                    selectedTeam.slug;

                netlifyState.teamId =
                    selectedTeam.id || '';

                return true;
            }

            // اختيار تلقائي مسموح فقط إذا كان هناك Team واحد.
            if (teams.length === 1 && teams[0].slug) {
                const onlyTeam = teams[0];

                let result;

                if (
                    API &&
                    typeof API.selectNetlifyTeam === 'function'
                ) {
                    result = await API.selectNetlifyTeam(
                        onlyTeam.slug
                    );
                } else {
                    result = await apiRequest(
                        '/api/netlify/team',
                        {
                            method: 'POST',
                            body: {
                                accountSlug: onlyTeam.slug
                            }
                        }
                    );
                }

                const selected =
                    result.selectedTeam ||
                    result.team ||
                    onlyTeam;

                netlifyState.teamSelected = true;
                netlifyState.teamName =
                    selected.name || onlyTeam.name || '';

                netlifyState.teamSlug =
                    selected.slug || onlyTeam.slug;

                netlifyState.teamId =
                    selected.id || onlyTeam.id || '';

                return true;
            }

            // إذا كان عند المستخدم أكثر من Team،
            // لا نختار أي واحد بشكل عشوائي.
            netlifyState.teamSelected = false;
            netlifyState.teamName = '';
            netlifyState.teamSlug = '';
            netlifyState.teamId = '';

            if (teams.length > 1) {
                setMessage(
                    'حساب Netlify فيه أكثر من Team. خاص تحديد Team من إعدادات الحساب.',
                    true
                );
            } else {
                setMessage(
                    'ما لقيناش Team متاح في حساب Netlify.',
                    true
                );
            }

            return false;

        } catch (error) {
            console.error(
                'Netlify team selection error:',
                error
            );

            netlifyState.teamSelected = false;
            return false;
        }
    }

    // ============================================
    // 6. CONNECT NETLIFY
    // ============================================

    async function connectNetlify() {
        clearMessage();

        try {
            const user = JSON.parse(
                localStorage.getItem('user') || 'null'
            );

            const token = localStorage.getItem('token');

            if (!user || !token) {
                throw new Error(
                    'خاصك تسجل الدخول قبل ربط Netlify.'
                );
            }

            netlifyState.loading = true;
            renderNetlifyState();

            let result;

            if (
                API &&
                typeof API.connectNetlify === 'function'
            ) {
                result = await API.connectNetlify();
            } else {
                result = await apiRequest(
                    '/api/netlify/connect',
                    {
                        method: 'POST'
                    }
                );
            }

            const authorizationUrl =
                result.authorizationUrl;

            if (!authorizationUrl) {
                throw new Error(
                    'الخادم لم يرجع رابط تفويض Netlify.'
                );
            }

            const left = Math.max(
                0,
                (window.screen.width - POPUP_WIDTH) / 2
            );

            const top = Math.max(
                0,
                (window.screen.height - POPUP_HEIGHT) / 2
            );

            oauthPopup = window.open(
                authorizationUrl,
                POPUP_NAME,
                [
                    `width=${POPUP_WIDTH}`,
                    `height=${POPUP_HEIGHT}`,
                    `left=${left}`,
                    `top=${top}`,
                    'resizable=yes',
                    'scrollbars=yes'
                ].join(',')
            );

            if (!oauthPopup) {
                throw new Error(
                    'المتصفح منع النافذة المنبثقة. سمح بفتح Popups لهذا الموقع وحاول مرة أخرى.'
                );
            }

            startPopupWatcher();

        } catch (error) {
            console.error(
                'Netlify connect error:',
                error
            );

            setMessage(
                error.message ||
                'تعذر بدء ربط Netlify.',
                true
            );

        } finally {
            netlifyState.loading = false;
            renderNetlifyState();
        }
    }

    // ============================================
    // 7. POPUP WATCHER
    // ============================================

    function startPopupWatcher() {
        stopPopupWatcher();

        oauthCheckInterval = window.setInterval(
            function () {
                if (!oauthPopup || oauthPopup.closed) {
                    stopPopupWatcher();

                    oauthPopup = null;

                    // ننتظر لحظة حتى يكمل Backend حفظ الاتصال.
                    window.setTimeout(
                        async function () {
                            await refreshStatus();

                            if (
                                netlifyState.connected &&
                                netlifyState.teamSelected
                            ) {
                                setMessage(
                                    'تم ربط Netlify بنجاح.'
                                );
                            }
                        },
                        800
                    );
                }
            },
            700
        );
    }

    function stopPopupWatcher() {
        if (oauthCheckInterval) {
            window.clearInterval(oauthCheckInterval);
            oauthCheckInterval = null;
        }
    }

    // ============================================
    // 8. RECEIVE OAUTH RESULT
    // ============================================

    window.addEventListener(
        'message',
        async function (event) {
            // لا نقبل الرسائل إلا من Backend الموثوق.
            let backendOrigin;

            try {
                backendOrigin = new URL(BACKEND_URL).origin;
            } catch (_) {
                return;
            }

            if (event.origin !== backendOrigin) {
                return;
            }

            const data = event.data || {};

            if (
                data.type !==
                'TEMPLATECRAFT_NETLIFY_OAUTH'
            ) {
                return;
            }

            if (oauthPopup && !oauthPopup.closed) {
                oauthPopup.close();
            }

            oauthPopup = null;
            stopPopupWatcher();

            if (data.success !== true) {
                setMessage(
                    data.error ||
                    'لم يكتمل ربط حساب Netlify.',
                    true
                );

                await refreshStatus();
                return;
            }

            setMessage(
                'تمت المصادقة مع Netlify. جاري التحقق من Team...'
            );

            await refreshStatus();

            if (
                netlifyState.connected &&
                netlifyState.teamSelected
            ) {
                setMessage(
                    'تم ربط Netlify بنجاح.'
                );
            } else if (netlifyState.connected) {
                setMessage(
                    'تم ربط الحساب، ولكن خاص تحديد Team قبل النشر.',
                    true
                );
            }
        }
    );

    // ============================================
    // 9. DISCONNECT NETLIFY
    // ============================================

    async function disconnectNetlify() {
        const confirmed = window.confirm(
            'واش متأكد أنك باغي تقطع اتصال Netlify؟'
        );

        if (!confirmed) return;

        clearMessage();

        try {
            netlifyState.loading = true;
            renderNetlifyState();

            if (
                API &&
                typeof API.disconnectNetlify === 'function'
            ) {
                await API.disconnectNetlify();
            } else {
                await apiRequest(
                    '/api/netlify/disconnect',
                    {
                        method: 'POST'
                    }
                );
            }

            netlifyState.connected = false;
            netlifyState.teamSelected = false;
            netlifyState.teamName = '';
            netlifyState.teamSlug = '';
            netlifyState.teamId = '';

            setMessage(
                'تم قطع اتصال Netlify.'
            );

        } catch (error) {
            setMessage(
                error.message ||
                'تعذر قطع اتصال Netlify.',
                true
            );

        } finally {
            netlifyState.loading = false;
            renderNetlifyState();
        }
    }

    // ============================================
    // 10. PUBLIC INTERFACE
    // ============================================

    window.TemplateCraftNetlify = {
        refreshStatus: refreshStatus,

        connect: connectNetlify,

        disconnect: disconnectNetlify,

        getState: function () {
            return { ...netlifyState };
        },

        isReady: function () {
            return (
                netlifyState.connected === true &&
                netlifyState.teamSelected === true &&
                Boolean(netlifyState.teamSlug)
            );
        }
    };

    // ============================================
    // 11. BUTTON EVENTS
    // ============================================

    function initializeButtons() {
        const connectButton =
            getElement('connectNetlifyBtn');

        if (connectButton) {
            connectButton.addEventListener(
                'click',
                connectNetlify
            );
        }

        const disconnectButton =
            getElement('disconnectNetlifyBtn');

        if (disconnectButton) {
            disconnectButton.addEventListener(
                'click',
                disconnectNetlify
            );
        }
    }

    // ============================================
    // 12. INITIALIZATION
    // ============================================

    async function initialize() {
        initializeButtons();

        await refreshStatus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initialize
        );
    } else {
        initialize();
    }

})();
