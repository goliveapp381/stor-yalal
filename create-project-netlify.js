/*
==================================================
 TEMPLATECRAFT PRO - NETLIFY FRONTEND
 File: create-project-netlify.js

 مسؤول عن:
 - Netlify OAuth
 - Netlify connection
 - Netlify status
 - Team detection
 - Automatic single Team selection
 - Multiple Team picker
 - Deleted Team handling
 - Disconnect
 - Public Netlify API
==================================================
*/

(function () {

    'use strict';


    /* =================================================
       1. CONFIGURATION
    ================================================= */

    const API =
        window.TemplateCraftAPI || null;


    const BACKEND_URL =
        window.TEMPLATECRAFT_API_BASE_URL ||
        'https://templatecraft-backend.onrender.com';


    let BACKEND_ORIGIN = '';


    try {

        BACKEND_ORIGIN =
            new URL(
                BACKEND_URL
            ).origin;

    } catch (error) {

        console.error(
            '[TemplateCraft] Invalid BACKEND_URL:',
            error
        );

    }


    const POPUP_NAME =
        'TemplateCraftNetlifyOAuth';


    const POPUP_WIDTH =
        600;


    const POPUP_HEIGHT =
        750;


    const API_TIMEOUT =
        20000;


    /* =================================================
       2. STATE
    ================================================= */

    let netlifyState = {

        loading: false,

        connected: false,

        teamSelected: false,

        teamDeleted: false,

        teamName: '',

        teamSlug: '',

        teamId: '',

        availableTeams: [],

        message: ''

    };


    let oauthPopup = null;

    let oauthCheckInterval = null;

    let refreshPromise = null;

    let oauthCompleted = false;


    /* =================================================
       3. DOM HELPERS
    ================================================= */

    function getElement(id) {

        return document.getElementById(id);

    }


    function showElement(id) {

        const element =
            getElement(id);


        if (!element) {
            return;
        }


        element.classList.remove(
            'hidden',
            'is-hidden'
        );


        element.style.display =
            '';

    }


    function hideElement(id) {

        const element =
            getElement(id);


        if (!element) {
            return;
        }


        element.classList.add(
            'hidden',
            'is-hidden'
        );


        element.style.display =
            'none';

    }


    function setText(
        id,
        value
    ) {

        const element =
            getElement(id);


        if (!element) {
            return;
        }


        element.textContent =
            value == null
                ? ''
                : String(value);

    }


    /* =================================================
       4. MESSAGE
    ================================================= */

    function setMessage(
        message,
        isError = false,
        isWarning = false
    ) {

        netlifyState.message =
            message || '';


        const element =
            getElement(
                'netlifyConnectionMessage'
            );


        if (!element) {
            return;
        }


        element.textContent =
            message || '';


        showElement(
            'netlifyConnectionMessage'
        );


        element.classList.remove(
            'text-red-600',
            'text-yellow-600',
            'text-green-600'
        );


        if (isError) {

            element.classList.add(
                'text-red-600'
            );

        } else if (isWarning) {

            element.classList.add(
                'text-yellow-600'
            );

        } else {

            element.classList.add(
                'text-green-600'
            );

        }

    }


    function clearMessage() {

        netlifyState.message =
            '';


        hideElement(
            'netlifyConnectionMessage'
        );

    }


    /* =================================================
       5. AUTH
    ================================================= */

    function getToken() {

        return (
            localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('templatecraft_token') ||
            ''
        );

    }


    function isLoggedIn() {

        const token =
            getToken();


        if (!token) {
            return false;
        }


        let user = null;


        try {

            user =
                JSON.parse(
                    localStorage.getItem(
                        'user'
                    ) ||
                    localStorage.getItem(
                        'templatecraft_user'
                    ) ||
                    'null'
                );

        } catch (error) {

            user = null;

        }


        /*
        إذا كان عندنا Token صالح،
        لا نفرض وجود user object هنا.
        */

        return true;

    }


    /* =================================================
       6. API
    ================================================= */

    function validateResponse(
        response,
        defaultMessage
    ) {

        if (
            !response ||
            typeof response !== 'object'
        ) {

            throw new Error(
                defaultMessage
            );

        }


        if (
            response.success !== true
        ) {

            throw new Error(
                response.message ||
                response.error ||
                defaultMessage
            );

        }


        return response;

    }


    async function fetchWithTimeout(
        url,
        options = {}
    ) {

        const controller =
            new AbortController();


        const timeout =
            window.setTimeout(
                function () {

                    controller.abort();

                },
                API_TIMEOUT
            );


        try {

            return await fetch(
                url,
                {
                    ...options,
                    signal:
                        controller.signal
                }
            );

        } catch (error) {

            if (
                error &&
                error.name === 'AbortError'
            ) {

                throw new Error(
                    'انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.'
                );

            }


            throw error;

        } finally {

            window.clearTimeout(
                timeout
            );

        }

    }


    async function callAPI(
        methodName,
        fallbackPath,
        options = {}
    ) {

        let response;


        /* ---------------------------------------------
           client-api.js
        --------------------------------------------- */

        if (
            API &&
            typeof API[methodName] ===
            'function'
        ) {

            response =
                await API[methodName](
                    ...(options.args || [])
                );


            return validateResponse(
                response,
                'تعذر الاتصال بالخادم.'
            );

        }


        /* ---------------------------------------------
           fallback fetch
        --------------------------------------------- */

        const token =
            getToken();


        if (!token) {

            throw new Error(
                'يرجى تسجيل الدخول أولاً.'
            );

        }


        const fetchOptions = {

            method:
                options.method ||
                'GET',

            headers: {

                'Accept':
                    'application/json',

                'Authorization':
                    `Bearer ${token}`

            }

        };


        if (
            options.body !==
            undefined
        ) {

            fetchOptions.headers[
                'Content-Type'
            ] =
                'application/json';


            fetchOptions.body =
                JSON.stringify(
                    options.body
                );

        }


        const responseObject =
            await fetchWithTimeout(
                `${BACKEND_URL}${fallbackPath}`,
                fetchOptions
            );


        let data = null;


        try {

            data =
                await responseObject.json();

        } catch (error) {

            data = {};

        }


        if (
            !responseObject.ok
        ) {

            data.success =
                false;

            data.status =
                responseObject.status;

        }


        return validateResponse(
            data,
            'تعذر الاتصال بالخادم.'
        );

    }


    /* =================================================
       7. TEAM STATE
    ================================================= */

    function clearTeamSelection(
        deleted = false
    ) {

        netlifyState.teamSelected =
            false;

        netlifyState.teamName =
            '';

        netlifyState.teamSlug =
            '';

        netlifyState.teamId =
            '';

        netlifyState.teamDeleted =
            Boolean(deleted);

    }


    function applySelectedTeam(
        team
    ) {

        if (
            !team
        ) {

            return false;

        }


        const slug =
            team.slug ||
            team.account_slug ||
            team.id ||
            '';


        if (!slug) {
            return false;
        }


        netlifyState.teamSelected =
            true;


        netlifyState.teamDeleted =
            false;


        netlifyState.teamName =
            team.name ||
            team.account_name ||
            slug ||
            'فريق Netlify';


        netlifyState.teamSlug =
            String(slug);


        netlifyState.teamId =
            team.id ||
            '';


        return true;

    }


    function clearConnectionState() {

        netlifyState.connected =
            false;

        netlifyState.teamSelected =
            false;

        netlifyState.teamDeleted =
            false;

        netlifyState.teamName =
            '';

        netlifyState.teamSlug =
            '';

        netlifyState.teamId =
            '';

        netlifyState.availableTeams =
            [];

    }


    /* =================================================
       8. TEAM PICKER
    ================================================= */

    function ensureTeamPicker() {

        let picker =
            getElement(
                'netlifyTeamPicker'
            );


        if (picker) {
            return picker;
        }


        const parent =
            getElement(
                'netlifyConnectedInfo'
            ) ||
            getElement(
                'netlifyTeamsContainer'
            );


        if (!parent) {

            return null;

        }


        picker =
            document.createElement(
                'div'
            );


        picker.id =
            'netlifyTeamPicker';


        picker.dir =
            'rtl';


        picker.className =
            'netlify-team-picker is-hidden';


        const title =
            document.createElement(
                'div'
            );


        title.className =
            'netlify-team-picker-title';


        title.textContent =
            'اختيار فريق النشر';


        const description =
            document.createElement(
                'div'
            );


        description.className =
            'netlify-team-picker-description';


        description.textContent =
            'اختر الفريق الذي سيُستخدم لإنشاء مشاريعك الجديدة.';


        const select =
            document.createElement(
                'select'
            );


        select.id =
            'netlifyTeamSelect';


        select.className =
            'netlify-team-select';


        const defaultOption =
            document.createElement(
                'option'
            );


        defaultOption.value =
            '';


        defaultOption.textContent =
            'اختر فريقاً...';


        defaultOption.disabled =
            true;


        defaultOption.selected =
            true;


        select.appendChild(
            defaultOption
        );


        const button =
            document.createElement(
                'button'
            );


        button.id =
            'selectNetlifyTeamBtn';


        button.type =
            'button';


        button.className =
            'netlify-team-select-button';


        button.textContent =
            'اختيار الفريق';


        const message =
            document.createElement(
                'div'
            );


        message.id =
            'netlifyTeamPickerMessage';


        message.className =
            'netlify-team-picker-message is-hidden';


        picker.appendChild(
            title
        );


        picker.appendChild(
            description
        );


        picker.appendChild(
            select
        );


        picker.appendChild(
            button
        );


        picker.appendChild(
            message
        );


        parent.appendChild(
            picker
        );


        select.addEventListener(
            'change',
            function () {

                button.disabled =
                    !select.value;

            }
        );


        button.addEventListener(
            'click',
            async function () {

                if (!select.value) {

                    showTeamPickerMessage(
                        'يرجى اختيار فريق أولاً.',
                        true
                    );

                    return;

                }


                await selectTeam(
                    select.value
                );

            }
        );


        return picker;

    }


    function showTeamPickerMessage(
        message,
        error = false
    ) {

        const element =
            getElement(
                'netlifyTeamPickerMessage'
            );


        if (!element) {
            return;
        }


        element.textContent =
            message || '';


        showElement(
            'netlifyTeamPickerMessage'
        );


        element.classList.remove(
            'text-red-600',
            'text-green-600'
        );


        element.classList.add(
            error
                ? 'text-red-600'
                : 'text-green-600'
        );

    }


    function clearTeamPickerMessage() {

        hideElement(
            'netlifyTeamPickerMessage'
        );

    }


    function renderTeamPicker() {

        const picker =
            ensureTeamPicker();


        if (!picker) {
            return;
        }


        const select =
            getElement(
                'netlifyTeamSelect'
            );


        const button =
            getElement(
                'selectNetlifyTeamBtn'
            );


        if (
            !select ||
            !button
        ) {

            return;

        }


        const teams =
            Array.isArray(
                netlifyState.availableTeams
            )
                ? netlifyState.availableTeams
                : [];


        const shouldShow =
            netlifyState.connected === true &&
            netlifyState.teamSelected !== true &&
            teams.length > 0;


        if (!shouldShow) {

            hideElement(
                'netlifyTeamPicker'
            );

            return;

        }


        showElement(
            'netlifyTeamPicker'
        );


        while (
            select.options.length > 1
        ) {

            select.remove(
                select.options.length - 1
            );

        }


        teams.forEach(
            function (team) {

                if (
                    !team ||
                    !team.slug
                ) {

                    return;

                }


                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    String(
                        team.slug
                    );


                option.textContent =
                    team.name ||
                    team.slug;


                select.appendChild(
                    option
                );

            }
        );


        select.value =
            '';


        button.disabled =
            true;


        clearTeamPickerMessage();

    }


    /* =================================================
       9. SELECT TEAM
    ================================================= */

    async function selectTeam(
        slug
    ) {

        slug =
            String(
                slug || ''
            ).trim();


        if (!slug) {
            return false;
        }


        const button =
            getElement(
                'selectNetlifyTeamBtn'
            );


        try {

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    'جارٍ اختيار الفريق...';

            }


            clearTeamPickerMessage();


            const response =
                await callAPI(
                    'selectNetlifyTeam',
                    '/api/netlify/team',
                    {
                        args: [
                            slug
                        ],

                        method:
                            'POST',

                        body: {
                            accountSlug:
                                slug
                        }

                    }
                );


            const selectedTeam =
                response.selectedTeam ||
                response.team ||
                netlifyState.availableTeams.find(
                    function (team) {

                        return String(
                            team?.slug || ''
                        ) === slug;

                    }
                );


            if (
                !applySelectedTeam(
                    selectedTeam
                )
            ) {

                throw new Error(
                    'لم يؤكد الخادم اختيار الفريق.'
                );

            }


            setMessage(
                'تم اختيار الفريق بنجاح. Netlify جاهز للنشر.'
            );


            renderNetlifyState();


            return true;

        } catch (error) {

            console.error(
                '[TemplateCraft] Team selection error:',
                error
            );


            showTeamPickerMessage(
                error.message ||
                'تعذر اختيار الفريق.',
                true
            );


            setMessage(
                error.message ||
                'تعذر اختيار الفريق.',
                true
            );


            return false;

        } finally {

            if (button) {

                button.textContent =
                    'اختيار الفريق';

            }

        }

    }


    /* =================================================
       10. AUTO TEAM SELECTION
    ================================================= */

    async function resolveTeam(
        teams,
        deletedTeam = false
    ) {

        teams =
            Array.isArray(teams)
                ? teams
                : [];


        netlifyState.availableTeams =
            teams;


        if (!teams.length) {

            clearTeamSelection(
                deletedTeam
            );


            setMessage(
                deletedTeam
                    ? 'الفريق السابق لم يعد متاحاً، ولا يوجد فريق متاح حالياً.'
                    : 'لم يتم العثور على أي فريق متاح في حساب Netlify.',
                false,
                true
            );


            return false;

        }


        /* ===========================================
           فريق واحد → اختيار تلقائي
        =========================================== */

        if (
            teams.length === 1 &&
            teams[0]?.slug
        ) {

            const success =
                await selectTeam(
                    teams[0].slug
                );


            if (success) {
                return true;
            }


            clearTeamSelection(
                deletedTeam
            );


            setMessage(
                'يوجد فريق واحد، لكن تعذر اختياره تلقائياً. يرجى اختياره يدوياً.',
                false,
                true
            );


            return false;

        }


        /* ===========================================
           أكثر من فريق
        =========================================== */

        clearTeamSelection(
            deletedTeam
        );


        setMessage(
            deletedTeam
                ? 'الفريق السابق لم يعد متاحاً. يرجى اختيار فريق جديد.'
                : 'يوجد أكثر من فريق في حساب Netlify. يرجى اختيار فريق للنشر.',
            false,
            true
        );


        return false;

    }


    /* =================================================
       11. RENDER STATE
    ================================================= */

    function renderNetlifyState() {

        const loading =
            netlifyState.loading;


        const connected =
            netlifyState.connected;


        const teamSelected =
            netlifyState.teamSelected;


        const teamName =
            netlifyState.teamName;


        /* ---------------------------------------------
           Status dot
        --------------------------------------------- */

        const dot =
            getElement(
                'netlifyStatusDot'
            );


        if (dot) {

            dot.classList.remove(
                'bg-green-500',
                'bg-red-500',
                'bg-yellow-500',
                'bg-gray-400'
            );


            if (loading) {

                dot.classList.add(
                    'bg-yellow-500'
                );

            } else if (
                connected &&
                teamSelected
            ) {

                dot.classList.add(
                    'bg-green-500'
                );

            } else if (
                connected
            ) {

                dot.classList.add(
                    'bg-yellow-500'
                );

            } else {

                dot.classList.add(
                    'bg-gray-400'
                );

            }

        }


        /* ---------------------------------------------
           Status text
        --------------------------------------------- */

        if (loading) {

            setText(
                'netlifyStatusText',
                'جاري التحقق من اتصال Netlify...'
            );

        } else if (
            connected &&
            teamSelected
        ) {

            setText(
                'netlifyStatusText',
                'Netlify متصل وجاهز للنشر'
            );

        } else if (
            connected &&
            netlifyState.teamDeleted
        ) {

            setText(
                'netlifyStatusText',
                'الفريق السابق لم يعد متاحاً — يرجى اختيار فريق جديد'
            );

        } else if (
            connected
        ) {

            setText(
                'netlifyStatusText',
                'Netlify متصل، ولكن لم يتم تحديد فريق'
            );

        } else {

            setText(
                'netlifyStatusText',
                'Netlify غير متصل'
            );

        }


        /* ---------------------------------------------
           Connected area
        --------------------------------------------- */

        if (connected) {

            showElement(
                'netlifyConnectedInfo'
            );


            hideElement(
                'netlifyNotConnectedInfo'
            );


            setText(
                'netlifyMainTeamName',
                teamSelected
                    ? teamName
                    : netlifyState.teamDeleted
                        ? 'الفريق السابق لم يعد متاحاً'
                        : 'لم يتم تحديد فريق'
            );

        } else {

            hideElement(
                'netlifyConnectedInfo'
            );


            showElement(
                'netlifyNotConnectedInfo'
            );


            setText(
                'netlifyMainTeamName',
                ''
            );

        }


        renderTeamPicker();


        /* ---------------------------------------------
           Connect button
        --------------------------------------------- */

        const connectButton =
            getElement(
                'connectNetlifyBtn'
            );


        if (connectButton) {

            connectButton.disabled =
                loading;


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
                ? 'جارٍ التحقق...'
                : connected
                    ? 'تحديث اتصال Netlify'
                    : 'ربط حساب Netlify'
        );


        /* ---------------------------------------------
           Confirmation
        --------------------------------------------- */

        if (
            connected &&
            teamSelected
        ) {

            showElement(
                'confirmNetlifyTeamBox'
            );


            hideElement(
                'confirmNetlifyWarning'
            );


            setText(
                'confirmNetlifyTeamName',
                teamName
            );

        } else {

            hideElement(
                'confirmNetlifyTeamBox'
            );


            showElement(
                'confirmNetlifyWarning'
            );

        }


        /* ---------------------------------------------
           Notify UI
        --------------------------------------------- */

        window.dispatchEvent(
            new CustomEvent(
                'templatecraft:netlify-state',
                {
                    detail: {
                        ...netlifyState
                    }
                }
            )
        );

    }


    /* =================================================
       12. REFRESH STATUS
    ================================================= */

    async function refreshStatus() {

        if (refreshPromise) {

            return refreshPromise;

        }


        refreshPromise =
            (async function () {

                netlifyState.loading =
                    true;


                renderNetlifyState();


                try {

                    if (!isLoggedIn()) {

                        clearConnectionState();


                        throw new Error(
                            'يرجى تسجيل الدخول للتحقق من اتصال Netlify.'
                        );

                    }


                    const response =
                        await callAPI(
                            'getNetlifyStatus',
                            '/api/netlify/status'
                        );


                    const netlify =
                        response.netlify ||
                        response.data ||
                        response ||
                        {};


                    /* =================================
                       NOT CONNECTED
                    ================================= */

                    if (
                        netlify.connected !== true
                    ) {

                        clearConnectionState();


                        setMessage(
                            'لم يتم ربط حساب Netlify بعد.',
                            false,
                            true
                        );


                        return {
                            ...netlifyState
                        };

                    }


                    netlifyState.connected =
                        true;


                    /* =================================
                       TEAMS
                    ================================= */

                    netlifyState.availableTeams =
                        Array.isArray(
                            netlify.availableTeams
                        )
                            ? netlify.availableTeams
                            : Array.isArray(
                                netlify.teams
                            )
                                ? netlify.teams
                                : [];


                    /* =================================
                       DELETED TEAM
                    ================================= */

                    netlifyState.teamDeleted =
                        netlify.teamDeleted === true;


                    /* =================================
                       SELECTED TEAM
                    ================================= */

                    const selectedTeam =
                        netlify.selectedTeam ||
                        null;


                    const selectedSlug =
                        netlify.teamSlug ||
                        netlify.accountSlug ||
                        selectedTeam?.slug ||
                        '';


                    const selectedName =
                        netlify.teamName ||
                        netlify.accountName ||
                        selectedTeam?.name ||
                        '';


                    const selectedId =
                        netlify.teamId ||
                        netlify.accountId ||
                        selectedTeam?.id ||
                        '';


                    if (
                        selectedSlug &&
                        !netlifyState.teamDeleted
                    ) {

                        netlifyState.teamSelected =
                            true;


                        netlifyState.teamSlug =
                            String(
                                selectedSlug
                            );


                        netlifyState.teamName =
                            selectedName ||
                            selectedSlug;


                        netlifyState.teamId =
                            selectedId ||
                            '';


                        clearMessage();


                        return {
                            ...netlifyState
                        };

                    }


                    /* =================================
                       NO SELECTED TEAM
                    ================================= */

                    clearTeamSelection(
                        netlifyState.teamDeleted
                    );


                    await resolveTeam(
                        netlifyState.availableTeams,
                        netlifyState.teamDeleted
                    );


                    return {
                        ...netlifyState
                    };


                } catch (error) {

                    console.error(
                        '[TemplateCraft] Netlify status error:',
                        error
                    );


                    clearConnectionState();


                    setMessage(
                        error.message ||
                        'تعذر التحقق من اتصال Netlify.',
                        true
                    );


                    return {
                        ...netlifyState
                    };


                } finally {

                    netlifyState.loading =
                        false;


                    renderNetlifyState();


                    refreshPromise =
                        null;

                }

            })();


        return refreshPromise;

    }


    /* =================================================
       13. CONNECT NETLIFY
    ================================================= */

    async function connectNetlify() {

        if (netlifyState.loading) {
            return;
        }


        clearMessage();


        if (!isLoggedIn()) {

            setMessage(
                'يرجى تسجيل الدخول قبل ربط حساب Netlify.',
                true
            );


            return;

        }


        const left =
            Math.max(
                0,
                (
                    window.screen.width -
                    POPUP_WIDTH
                ) / 2
            );


        const top =
            Math.max(
                0,
                (
                    window.screen.height -
                    POPUP_HEIGHT
                ) / 2
            );


        oauthPopup =
            window.open(
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
                'تم منع النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مرة أخرى.',
                true
            );


            return;

        }


        oauthCompleted =
            false;


        netlifyState.loading =
            true;


        renderNetlifyState();


        try {

            const response =
                await callAPI(
                    'connectNetlify',
                    '/api/netlify/connect',
                    {
                        method:
                            'POST'
                    }
                );


            const authorizationUrl =
                response.authorizationUrl;


            if (!authorizationUrl) {

                throw new Error(
                    'لم يُرجع الخادم رابط تفويض Netlify.'
                );

            }


            const authUrl =
                new URL(
                    authorizationUrl
                );


            if (
                authUrl.protocol !==
                'https:'
            ) {

                throw new Error(
                    'رابط Netlify غير آمن.'
                );

            }


            oauthPopup.location.href =
                authUrl.href;


            startPopupWatcher();


        } catch (error) {

            console.error(
                '[TemplateCraft] Netlify connect error:',
                error
            );


            if (
                oauthPopup &&
                !oauthPopup.closed
            ) {

                oauthPopup.close();

            }


            oauthPopup =
                null;


            setMessage(
                error.message ||
                'تعذر بدء ربط حساب Netlify.',
                true
            );


        } finally {

            netlifyState.loading =
                false;


            renderNetlifyState();

        }

    }


    /* =================================================
       14. POPUP WATCHER
    ================================================= */

    function startPopupWatcher() {

        stopPopupWatcher();


        oauthCheckInterval =
            window.setInterval(
                function () {

                    if (
                        oauthPopup &&
                        oauthPopup.closed
                    ) {

                        stopPopupWatcher();


                        oauthPopup =
                            null;


                        if (
                            oauthCompleted
                        ) {

                            return;

                        }


                        window.setTimeout(
                            function () {

                                refreshStatus();

                            },
                            700
                        );

                    }

                },
                700
            );

    }


    function stopPopupWatcher() {

        if (
            oauthCheckInterval
        ) {

            window.clearInterval(
                oauthCheckInterval
            );


            oauthCheckInterval =
                null;

        }

    }


    /* =================================================
       15. OAUTH MESSAGE
    ================================================= */

    window.addEventListener(
        'message',
        async function (event) {

            if (
                !BACKEND_ORIGIN ||
                event.origin !==
                BACKEND_ORIGIN
            ) {

                return;

            }


            const data =
                event.data || {};


            if (
                data.type !==
                'TEMPLATECRAFT_NETLIFY_OAUTH'
            ) {

                return;

            }


            oauthCompleted =
                true;


            stopPopupWatcher();


            if (
                oauthPopup &&
                !oauthPopup.closed
            ) {

                oauthPopup.close();

            }


            oauthPopup =
                null;


            if (
                data.success !== true
            ) {

                setMessage(
                    data.error ||
                    'لم يكتمل ربط حساب Netlify.',
                    true
                );


                await refreshStatus();


                return;

            }


            setMessage(
                'تمت المصادقة مع Netlify. جارٍ التحقق من الحساب والفريق...'
            );


            await refreshStatus();


            if (
                netlifyState.connected &&
                netlifyState.teamSelected
            ) {

                setMessage(
                    'تم ربط Netlify بنجاح وأصبح جاهزاً للنشر.'
                );

            } else if (
                netlifyState.connected &&
                netlifyState.availableTeams.length > 1
            ) {

                setMessage(
                    'تم ربط الحساب. يرجى اختيار فريق للنشر.',
                    false,
                    true
                );

            } else if (
                netlifyState.connected
            ) {

                setMessage(
                    'تم ربط الحساب، ولكن يجب تحديد فريق قبل النشر.',
                    false,
                    true
                );

            } else {

                setMessage(
                    'تمت المصادقة، ولكن لم يؤكد الخادم اتصال Netlify.',
                    true
                );

            }

        }
    );


    /* =================================================
       16. DISCONNECT
    ================================================= */

    async function disconnectNetlify() {

        if (netlifyState.loading) {
            return;
        }


        const confirmed =
            window.confirm(
                'هل أنت متأكد من رغبتك في قطع اتصال Netlify؟ لن يتم حذف المشاريع الموجودة.'
            );


        if (!confirmed) {
            return;
        }


        clearMessage();


        netlifyState.loading =
            true;


        renderNetlifyState();


        try {

            await callAPI(
                'disconnectNetlify',
                '/api/netlify/disconnect',
                {
                    method:
                        'POST'
                }
            );


            clearConnectionState();


            setMessage(
                'تم قطع اتصال Netlify بنجاح.'
            );


        } catch (error) {

            console.error(
                '[TemplateCraft] Netlify disconnect error:',
                error
            );


            setMessage(
                error.message ||
                'تعذر قطع اتصال Netlify.',
                true
            );


        } finally {

            netlifyState.loading =
                false;


            renderNetlifyState();

        }

    }


    /* =================================================
       17. PUBLIC API
    ================================================= */

    window.TemplateCraftNetlify = {

        refreshStatus:
            refreshStatus,

        connect:
            connectNetlify,

        disconnect:
            disconnectNetlify,

        selectTeam:
            selectTeam,

        getState:
            function () {

                return {
                    ...netlifyState
                };

            },

        isReady:
            function () {

                return (
                    netlifyState.connected === true &&
                    netlifyState.teamSelected === true &&
                    Boolean(
                        netlifyState.teamSlug
                    )
                );

            }

    };


    /* =================================================
       18. BUTTONS
    ================================================= */

    function initializeButtons() {

        const connectButton =
            getElement(
                'connectNetlifyBtn'
            );


        if (
            connectButton &&
            !connectButton.dataset.netlifyBound
        ) {

            connectButton.dataset.netlifyBound =
                'true';


            connectButton.addEventListener(
                'click',
                connectNetlify
            );

        }


        const disconnectButton =
            getElement(
                'disconnectNetlifyBtn'
            );


        if (
            disconnectButton &&
            !disconnectButton.dataset.netlifyBound
        ) {

            disconnectButton.dataset.netlifyBound =
                'true';


            disconnectButton.addEventListener(
                'click',
                disconnectNetlify
            );

        }

    }


    /* =================================================
       19. INITIALIZATION
    ================================================= */

    async function initialize() {

        initializeButtons();


        await refreshStatus();

    }


    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();

    }

})();
