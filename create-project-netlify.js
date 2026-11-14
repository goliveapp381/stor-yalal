/*
==================================================
 TEMPLATECRAFT PRO - NETLIFY FRONTEND
 File: create-project-netlify.js

 Features:
 - Netlify OAuth Popup
 - Secure OAuth postMessage validation
 - Netlify connection status
 - Automatic Team selection only when ONE Team exists
 - Display selected Team name
 - Disconnect Netlify
 - TemplateCraftNetlify public interface

 Compatible with client-api.js
==================================================
*/

(function () {
    'use strict';

    // ============================================
    // 1. CONFIGURATION
    // ============================================

    const API = window.TemplateCraftAPI;

    const BACKEND_URL =
        window.TEMPLATECRAFT_API_BASE_URL ||
        'https://templatecraft-backend.onrender.com';

    const BACKEND_ORIGIN = new URL(BACKEND_URL).origin;

    const POPUP_NAME = 'TemplateCraftNetlifyOAuth';

    const POPUP_WIDTH = 600;
    const POPUP_HEIGHT = 750;

    // ============================================
    // 2. STATE
    // ============================================

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
    let oauthCompleted = false;

    // ============================================
    // 3. DOM HELPERS
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

        const element = getElement(
            'netlifyConnectionMessage'
        );

        if (!element) return;

        element.textContent = message || '';

        element.classList.remove('hidden');

        element.classList.toggle(
            'text-red-600',
            isError
        );

        element.classList.toggle(
            'text-green-600',
            !isError
        );
    }

    function clearMessage() {
        netlifyState.message = '';

        hideElement('netlifyConnectionMessage');
    }

    // ============================================
    // 4. AUTHENTICATION
    // ============================================

    function getToken() {
        return (
            localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            ''
        );
    }

    function isLoggedIn() {
        const token = getToken();

        let user = null;

        try {
            user = JSON.parse(
                localStorage.getItem('user') || 'null'
            );
        } catch (_) {
            user = null;
        }

        return Boolean(
            token &&
            user &&
            (user.id || user._id)
        );
    }

    // ============================================
    // 5. API RESPONSE VALIDATION
    // ============================================

    function validateResponse(response, defaultMessage) {
        if (!response || typeof response !== 'object') {
            throw new Error(defaultMessage);
        }

        if (response.success !== true) {
            throw new Error(
                response.message ||
                response.error ||
                defaultMessage
            );
        }

        return response;
    }

    async function callAPI(methodName, fallbackPath, options = {}) {
        if (!API) {
            throw new Error(
                'ملف client-api.js غير محمّل.'
            );
        }

        let response;

        if (typeof API[methodName] === 'function') {
            response = await API[methodName](
                ...(options.args || [])
            );
        } else {
            const token = getToken();

            if (!token) {
                throw new Error(
                    'خاصك تسجل الدخول أولاً.'
                );
            }

            const fetchOptions = {
                method: options.method || 'GET',

                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            if (options.body !== undefined) {
                fetchOptions.headers['Content-Type'] =
                    'application/json';

                fetchOptions.body = JSON.stringify(
                    options.body
                );
            }

            const fetchResponse = await fetch(
                `${BACKEND_URL}${fallbackPath}`,
                fetchOptions
            );

            try {
                response = await fetchResponse.json();
            } catch (_) {
                response = {};
            }

            if (!fetchResponse.ok) {
                response.success = false;
                response.status = fetchResponse.status;
            }
        }

        return validateResponse(
            response,
            'وقع خطأ في الاتصال بالخادم.'
        );
    }

    // ============================================
    // 6. RENDER NETLIFY STATE
    // ============================================

    function renderNetlifyState() {
        const {
            loading,
            connected,
            teamSelected,
            teamName
        } = netlifyState;

        // Status indicator
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

        // Status text
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
                'Netlify متصل، ولكن Team غير محدد'
            );

        } else {
            setText(
                'netlifyStatusText',
                'Netlify غير متصل'
            );
        }

        // Connected information
        if (connected) {
            showElement('netlifyConnectedInfo');
            hideElement('netlifyNotConnectedInfo');

            setText(
                'netlifyMainTeamName',
                teamSelected
                    ? teamName
                    : 'لم يتم تحديد Team'
            );

        } else {
            hideElement('netlifyConnectedInfo');
            showElement('netlifyNotConnectedInfo');

            setText(
                'netlifyMainTeamName',
                ''
            );
        }

        // Connect button
        const connectButton = getElement(
            'connectNetlifyBtn'
        );

        if (connectButton) {
            connectButton.disabled = loading;

            connectButton.classList.toggle(
                'opacity-50',
                loading
            );

            connectButton.classList.toggle(
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

        // Confirmation modal
        setText(
            'confirmNetlifyTeamName',
            teamSelected
                ? teamName
                : 'غير محدد'
        );

        if (connected && teamSelected) {
            showElement('confirmNetlifyTeamBox');
            hideElement('confirmNetlifyWarning');
        } else {
            hideElement('confirmNetlifyTeamBox');
            showElement('confirmNetlifyWarning');
        }

        // Notify other frontend scripts
        window.dispatchEvent(
            new CustomEvent(
                'templatecraft:netlify-state',
                {
                    detail: { ...netlifyState }
                }
            )
        );
    }

    // ============================================
    // 7. CLEAR CONNECTION STATE
    // ============================================

    function clearConnectionState() {
        netlifyState.connected = false;
        netlifyState.teamSelected = false;
        netlifyState.teamName = '';
        netlifyState.teamSlug = '';
        netlifyState.teamId = '';
    }

    // ============================================
    // 8. READ SELECTED TEAM
    // ============================================

    function applySelectedTeam(team) {
        if (!team || !team.slug) {
            return false;
        }

        netlifyState.teamSelected = true;

        netlifyState.teamName =
            team.name || '';

        netlifyState.teamSlug =
            team.slug;

        netlifyState.teamId =
            team.id || '';

        return true;
    }

    // ============================================
    // 9. AUTO SELECT ONLY ONE TEAM
    // ============================================

    async function trySelectSingleTeam() {
        const teamsResponse = await callAPI(
            'getNetlifyTeams',
            '/api/netlify/teams'
        );

        const teams = Array.isArray(
            teamsResponse.teams
        )
            ? teamsResponse.teams
            : [];

        // Backend already has a selected Team
        if (
            teamsResponse.selectedTeam &&
            teamsResponse.selectedTeam.slug
        ) {
            return applySelectedTeam(
                teamsResponse.selectedTeam
            );
        }

        // Exactly one Team: safe automatic selection
        if (
            teams.length === 1 &&
            teams[0].slug
        ) {
            const onlyTeam = teams[0];

            const selectionResponse = await callAPI(
                'selectNetlifyTeam',
                '/api/netlify/team',
                {
                    args: [onlyTeam.slug],
                    method: 'POST',
                    body: {
                        accountSlug: onlyTeam.slug
                    }
                }
            );

            const selectedTeam =
                selectionResponse.selectedTeam ||
                selectionResponse.team ||
                onlyTeam;

            if (
                !applySelectedTeam(selectedTeam)
            ) {
                throw new Error(
                    'السيرفر لم يؤكد اختيار Team.'
                );
            }

            return true;
        }

        // Multiple Teams: never select randomly
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
    }

    // ============================================
    // 10. REFRESH NETLIFY STATUS
    // ============================================

    async function refreshStatus() {
        if (refreshPromise) {
            return refreshPromise;
        }

        refreshPromise = (async function () {
            netlifyState.loading = true;

            renderNetlifyState();

            try {
                if (!isLoggedIn()) {
                    clearConnectionState();

                    throw new Error(
                        'خاصك تسجل الدخول باش تتحقق من Netlify.'
                    );
                }

                const response = await callAPI(
                    'getNetlifyStatus',
                    '/api/netlify/status'
                );

                const netlify = response.netlify || {};

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

                if (!netlifyState.connected) {
                    clearConnectionState();

                    return { ...netlifyState };
                }

                // If backend says a Team is selected,
                // make sure the slug is available.
                if (
                    netlifyState.teamSelected &&
                    netlifyState.teamSlug
                ) {
                    return { ...netlifyState };
                }

                // Verify teams and select only if exactly one exists.
                netlifyState.teamSelected = false;

                netlifyState.teamName = '';
                netlifyState.teamSlug = '';
                netlifyState.teamId = '';

                await trySelectSingleTeam();

                return { ...netlifyState };

            } catch (error) {
                console.error(
                    'Netlify status error:',
                    error
                );

                clearConnectionState();

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
    // 11. CONNECT NETLIFY
    // ============================================

    async function connectNetlify() {
        clearMessage();

        if (!isLoggedIn()) {
            setMessage(
                'خاصك تسجل الدخول قبل ربط Netlify.',
                true
            );

            return;
        }

        if (netlifyState.loading) {
            return;
        }

        // Open popup immediately inside the click event.
        // This helps prevent browser popup blocking.
        const left = Math.max(
            0,
            (window.screen.width - POPUP_WIDTH) / 2
        );

        const top = Math.max(
            0,
            (window.screen.height - POPUP_HEIGHT) / 2
        );

        oauthPopup = window.open(
            'about:blank',
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
            setMessage(
                'المتصفح منع النافذة المنبثقة. سمح بفتح Popups لهذا الموقع وحاول مرة أخرى.',
                true
            );

            return;
        }

        oauthCompleted = false;

        netlifyState.loading = true;

        renderNetlifyState();

        try {
            const response = await callAPI(
                'connectNetlify',
                '/api/netlify/connect',
                {
                    method: 'POST'
                }
            );

            const authorizationUrl =
                response.authorizationUrl;

            if (!authorizationUrl) {
                throw new Error(
                    'الخادم لم يرجع رابط تفويض Netlify.'
                );
            }

            // Verify that the authorization URL is HTTPS.
            const authUrl = new URL(
                authorizationUrl
            );

            if (authUrl.protocol !== 'https:') {
                throw new Error(
                    'رابط Netlify غير آمن.'
                );
            }

            oauthPopup.location.href =
                authUrl.href;

            startPopupWatcher();

        } catch (error) {
            console.error(
                'Netlify connect error:',
                error
            );

            if (
                oauthPopup &&
                !oauthPopup.closed
            ) {
                oauthPopup.close();
            }

            oauthPopup = null;

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
    // 12. POPUP WATCHER
    // ============================================

    function startPopupWatcher() {
        stopPopupWatcher();

        oauthCheckInterval = window.setInterval(
            function () {
                if (
                    oauthPopup &&
                    oauthPopup.closed
                ) {
                    stopPopupWatcher();

                    oauthPopup = null;

                    // OAuth callback may already have sent
                    // its message. Do not refresh twice.
                    if (oauthCompleted) {
                        return;
                    }

                    window.setTimeout(
                        async function () {
                            await refreshStatus();
                        },
                        1000
                    );
                }
            },
            700
        );
    }

    function stopPopupWatcher() {
        if (oauthCheckInterval) {
            window.clearInterval(
                oauthCheckInterval
            );

            oauthCheckInterval = null;
        }
    }

    // ============================================
    // 13. RECEIVE OAUTH CALLBACK MESSAGE
    // ============================================

    window.addEventListener(
        'message',
        async function (event) {
            // Only accept messages from our backend.
            if (event.origin !== BACKEND_ORIGIN) {
                return;
            }

            const data = event.data || {};

            if (
                data.type !==
                'TEMPLATECRAFT_NETLIFY_OAUTH'
            ) {
                return;
            }

            oauthCompleted = true;

            stopPopupWatcher();

            if (
                oauthPopup &&
                !oauthPopup.closed
            ) {
                oauthPopup.close();
            }

            oauthPopup = null;

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

            } else {
                setMessage(
                    'وصلت نتيجة OAuth، ولكن السيرفر لم يؤكد الاتصال.',
                    true
                );
            }
        }
    );

    // ============================================
    // 14. DISCONNECT NETLIFY
    // ============================================

    async function disconnectNetlify() {
        if (netlifyState.loading) {
            return;
        }

        const confirmed = window.confirm(
            'واش متأكد أنك باغي تقطع اتصال Netlify؟ المشاريع الموجودة ما غاديش تتمسح.'
        );

        if (!confirmed) {
            return;
        }

        clearMessage();

        try {
            netlifyState.loading = true;

            renderNetlifyState();

            await callAPI(
                'disconnectNetlify',
                '/api/netlify/disconnect',
                {
                    method: 'POST'
                }
            );

            clearConnectionState();

            setMessage(
                'تم قطع اتصال Netlify بنجاح.'
            );

        } catch (error) {
            console.error(
                'Netlify disconnect error:',
                error
            );

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
    // 15. PUBLIC INTERFACE
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
    // 16. BUTTON EVENTS
    // ============================================

    function initializeButtons() {
        const connectButton = getElement(
            'connectNetlifyBtn'
        );

        if (
            connectButton &&
            !connectButton.dataset.netlifyBound
        ) {
            connectButton.dataset.netlifyBound = 'true';

            connectButton.addEventListener(
                'click',
                connectNetlify
            );
        }

        const disconnectButton = getElement(
            'disconnectNetlifyBtn'
        );

        if (
            disconnectButton &&
            !disconnectButton.dataset.netlifyBound
        ) {
            disconnectButton.dataset.netlifyBound = 'true';

            disconnectButton.addEventListener(
                'click',
                disconnectNetlify
            );
        }
    }

    // ============================================
    // 17. INITIALIZATION
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
