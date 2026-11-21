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


    // =================================================
    // 1. CONFIGURATION
    // =================================================

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
            'Invalid BACKEND_URL:',
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


    // =================================================
    // 2. STATE
    // =================================================

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


    let oauthPopup =
        null;


    let oauthCheckInterval =
        null;


    let refreshPromise =
        null;


    let oauthCompleted =
        false;


    // =================================================
    // 3. DOM HELPERS
    // =================================================

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
            'hidden'
        );

        element.classList.remove(
            'is-hidden'
        );

    }


    function hideElement(id) {

        const element =
            getElement(id);

        if (!element) {
            return;
        }

        element.classList.add(
            'hidden'
        );

        element.classList.add(
            'is-hidden'
        );

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


    // =================================================
    // 4. MESSAGE
    // =================================================

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


    // =================================================
    // 5. AUTH
    // =================================================

    function getToken() {

        return (
            localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            ''
        );

    }


    function isLoggedIn() {

        const token =
            getToken();


        if (!token) {
            return false;
        }


        let user =
            null;


        try {

            user =
                JSON.parse(
                    localStorage.getItem(
                        'user'
                    ) || 'null'
                );

        } catch (error) {

            user =
                null;
        }


        return Boolean(
            user &&
            (
                user.id ||
                user._id
            )
        );

    }


    // =================================================
    // 6. API
    // =================================================

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
                    'انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.'
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


        // ---------------------------------------------
        // Use client-api.js when available
        // ---------------------------------------------

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
                'وقع خطأ في الاتصال بالخادم.'
            );
        }


        // ---------------------------------------------
        // Fallback fetch
        // ---------------------------------------------

        const token =
            getToken();


        if (!token) {

            throw new Error(
                'خاصك تسجل الدخول أولاً.'
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


        let data =
            null;


        try {

            data =
                await responseObject.json();

        } catch (error) {

            data =
                {};
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
            'وقع خطأ في الاتصال بالخادم.'
        );

    }


    // =================================================
    // 7. TEAM HELPERS
    // =================================================

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
            !team ||
            !team.slug
        ) {

            return false;
        }


        netlifyState.teamSelected =
            true;


        netlifyState.teamDeleted =
            false;


        netlifyState.teamName =
            team.name ||
            team.slug ||
            'Netlify Team';


        netlifyState.teamSlug =
            String(
                team.slug
            );


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


    // =================================================
    // 8. TEAM PICKER
    // =================================================

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

            console.warn(
                'Netlify Team picker parent not found.'
            );

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
            'اختار Team للنشر';


        const description =
            document.createElement(
                'div'
            );


        description.className =
            'netlify-team-picker-description';


        description.textContent =
            'اختار Team اللي بغيتي TemplateCraft يستعملها لإنشاء المشاريع الجديدة.';


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
            'اختار Team...';


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
            'اختيار Team';


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
                        'اختار Team أولاً.',
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


                const name =
                    team.name ||
                    team.slug;


                option.textContent =
                    name === team.slug
                        ? name
                        : `${name} — ${team.slug}`;


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


        if (
            netlifyState.teamDeleted
        ) {

            showTeamPickerMessage(
                teams.length === 1
                    ? 'Team القديمة تحيدات. كاينة Team جديدة متاحة.'
                    : 'Team القديمة تحيدات. اختار Team جديدة.',
                false
            );

        }

    }


    // =================================================
    // 9. SELECT TEAM
    // =================================================

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

            // مهم:
            // هنا ما نبدلوش netlifyState.loading
            // إلى true لأن refreshStatus يمكن يكون خدام.
            // فقط زر الاختيار هو اللي يتقفل.

            if (button) {

                button.disabled =
                    true;


                button.textContent =
                    'جاري اختيار Team...';

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
                    'السيرفر لم يؤكد اختيار Team.'
                );
            }


            setMessage(
                'تم اختيار Team بنجاح. Netlify جاهز للنشر.'
            );


            renderNetlifyState();


            return true;

        } catch (error) {

            console.error(
                'Netlify team selection error:',
                error
            );


            showTeamPickerMessage(
                error.message ||
                'تعذر اختيار Team.',
                true
            );


            setMessage(
                error.message ||
                'تعذر اختيار Team.',
                true
            );


            return false;

        } finally {

            if (button) {

                button.textContent =
                    'اختيار Team';

            }

        }

    }


    // =================================================
    // 10. AUTO TEAM SELECTION
    // =================================================

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


        // ---------------------------------------------
        // No teams
        // ---------------------------------------------

        if (
            teams.length === 0
        ) {

            clearTeamSelection(
                deletedTeam
            );


            setMessage(
                deletedTeam
                    ? 'Team السابقة تحيدات وما كايناش Team متاحة حالياً.'
                    : 'ما لقيناش Team متاحة في حساب Netlify.',
                false,
                true
            );


            return false;
        }


        // ---------------------------------------------
        // One team
        // ---------------------------------------------

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
                'كاينة Team وحدة ولكن الاختيار الأوتوماتيكي فشل. اختارها يدوياً.',
                false,
                true
            );


            return false;
        }


        // ---------------------------------------------
        // Multiple teams
        // ---------------------------------------------

        clearTeamSelection(
            deletedTeam
        );


        setMessage(
            deletedTeam
                ? 'Team السابقة تحيدات. اختار Team جديدة.'
                : 'حساب Netlify فيه أكثر من Team. اختار Team للنشر.',
            false,
            true
        );


        return false;

    }


    // =================================================
    // 11. RENDER STATE
    // =================================================

    function renderNetlifyState() {

        const loading =
            netlifyState.loading;


        const connected =
            netlifyState.connected;


        const teamSelected =
            netlifyState.teamSelected;


        const teamName =
            netlifyState.teamName;


        // ---------------------------------------------
        // Status dot
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Status text
        // ---------------------------------------------

        if (loading) {

            setText(
                'netlifyStatusText',
                'جاري التحقق من Netlify...'
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
                'Team السابقة لم تعد متاحة — اختار Team جديدة'
            );

        } else if (
            connected
        ) {

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


        // ---------------------------------------------
        // Connected area
        // ---------------------------------------------

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
                        ? 'Team السابقة تحيدات'
                        : 'لم يتم تحديد Team'
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


        // ---------------------------------------------
        // Team picker
        // ---------------------------------------------

        renderTeamPicker();


        // ---------------------------------------------
        // Connect button
        // ---------------------------------------------

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
                ? 'جاري المعالجة...'
                : connected
                    ? 'تحديث اتصال Netlify'
                    : 'ربط حساب Netlify'
        );


        // ---------------------------------------------
        // Confirmation UI
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Notify other scripts
        // ---------------------------------------------

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


    // =================================================
    // 12. REFRESH STATUS
    // =================================================

    async function refreshStatus() {

        // منع refresh متكرر
        if (refreshPromise) {

            return refreshPromise;
        }


        refreshPromise =
            (async function () {

                netlifyState.loading =
                    true;


                renderNetlifyState();


                try {

                    if (
                        !isLoggedIn()
                    ) {

                        clearConnectionState();


                        throw new Error(
                            'خاصك تسجل الدخول باش تتحقق من Netlify.'
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
                        {};


                    // ---------------------------------
                    // Connection
                    // ---------------------------------

                    if (
                        netlify.connected !== true
                    ) {

                        clearConnectionState();


                        return {
                            ...netlifyState
                        };
                    }


                    netlifyState.connected =
                        true;


                    // ---------------------------------
                    // Teams
                    // ---------------------------------

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


                    // ---------------------------------
                    // Deleted Team
                    // ---------------------------------

                    netlifyState.teamDeleted =
                        netlify.teamDeleted === true;


                    // ---------------------------------
                    // Existing selected Team
                    // ---------------------------------

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


                    // ---------------------------------
                    // No valid selected Team
                    // ---------------------------------

                    clearTeamSelection(
                        netlifyState.teamDeleted
                    );


                    // ---------------------------------
                    // Resolve available Team
                    // ---------------------------------

                    await resolveTeam(
                        netlifyState.availableTeams,
                        netlifyState.teamDeleted
                    );


                    return {
                        ...netlifyState
                    };


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


    // =================================================
    // 13. CONNECT NETLIFY
    // =================================================

    async function connectNetlify() {

        if (
            netlifyState.loading
        ) {

            return;
        }


        clearMessage();


        if (
            !isLoggedIn()
        ) {

            setMessage(
                'خاصك تسجل الدخول قبل ربط Netlify.',
                true
            );


            return;
        }


        // ---------------------------------------------
        // Open popup immediately
        // ---------------------------------------------

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
                'المتصفح منع النافذة المنبثقة. سمح بـ Popups لهذا الموقع وحاول مرة أخرى.',
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


            if (
                !authorizationUrl
            ) {

                throw new Error(
                    'الخادم لم يرجع رابط تفويض Netlify.'
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
                'Netlify connect error:',
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
                'تعذر بدء ربط Netlify.',
                true
            );


        } finally {

            netlifyState.loading =
                false;


            renderNetlifyState();

        }

    }


    // =================================================
    // 14. POPUP WATCHER
    // =================================================

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
                            1000
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


    // =================================================
    // 15. OAUTH MESSAGE
    // =================================================

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

            } else if (
                netlifyState.connected &&
                netlifyState.availableTeams.length > 1
            ) {

                setMessage(
                    'تم ربط الحساب. اختار Team للنشر من اللائحة.',
                    false,
                    true
                );

            } else if (
                netlifyState.connected
            ) {

                setMessage(
                    'تم ربط الحساب، ولكن خاص تحديد Team قبل النشر.',
                    false,
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


    // =================================================
    // 16. DISCONNECT
    // =================================================

    async function disconnectNetlify() {

        if (
            netlifyState.loading
        ) {

            return;
        }


        const confirmed =
            window.confirm(
                'واش متأكد أنك باغي تقطع اتصال Netlify؟ المشاريع الموجودة ما غاديش تتمسح.'
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
                'Netlify disconnect error:',
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


    // =================================================
    // 17. PUBLIC API
    // =================================================

    window.TemplateCraftNetlify = {

        refreshStatus:
            refreshStatus,

        connect:
            connectNetlify,

        disconnect:
            disconnectNetlify,

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


    // =================================================
    // 18. BUTTONS
    // =================================================

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


    // =================================================
    // 19. INITIALIZATION
    // =================================================

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
