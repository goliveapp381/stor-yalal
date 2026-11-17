/*
==================================================
 TEMPLATECRAFT PRO - NETLIFY FRONTEND
 File: create-project-netlify.js

 Features:
 - Netlify OAuth Popup
 - Secure OAuth postMessage validation
 - Netlify connection status
 - Automatic Team selection when ONE Team exists
 - Team picker when MULTIPLE Teams exist
 - Detect deleted / unavailable Team
 - Keep OAuth connection when Team is deleted
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

    const BACKEND_ORIGIN =
        new URL(BACKEND_URL).origin;

    const POPUP_NAME =
        'TemplateCraftNetlifyOAuth';

    const POPUP_WIDTH = 600;
    const POPUP_HEIGHT = 750;


    // ============================================
    // 2. STATE
    // ============================================

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


    // ============================================
    // 3. DOM HELPERS
    // ============================================

    function getElement(id) {

        return document.getElementById(id);
    }


    function showElement(id) {

        const element =
            getElement(id);

        if (element) {
            element.classList.remove('hidden');
        }
    }


    function hideElement(id) {

        const element =
            getElement(id);

        if (element) {
            element.classList.add('hidden');
        }
    }


    function setText(id, value) {

        const element =
            getElement(id);

        if (element) {
            element.textContent =
                value || '';
        }
    }


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

        if (!element) return;

        element.textContent =
            message || '';

        element.classList.remove(
            'hidden'
        );

        element.classList.toggle(
            'text-red-600',
            Boolean(isError)
        );

        element.classList.toggle(
            'text-yellow-600',
            Boolean(
                !isError &&
                isWarning
            )
        );

        element.classList.toggle(
            'text-green-600',
            Boolean(
                !isError &&
                !isWarning
            )
        );
    }


    function clearMessage() {

        netlifyState.message = '';

        hideElement(
            'netlifyConnectionMessage'
        );
    }


    // ============================================
    // 4. DYNAMIC TEAM PICKER
    // ============================================

    function ensureTeamPicker() {

        let picker =
            getElement(
                'netlifyTeamPicker'
            );

        if (picker) {
            return picker;
        }


        const connectedInfo =
            getElement(
                'netlifyConnectedInfo'
            );


        const mainTeamName =
            getElement(
                'netlifyMainTeamName'
            );


        const fallbackParent =
            mainTeamName?.parentElement ||
            getElement(
                'netlifyConnectionMessage'
            )?.parentElement ||
            getElement(
                'connectNetlifyBtn'
            )?.parentElement;


        const parent =
            connectedInfo ||
            fallbackParent;


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
            'hidden mt-4 p-4 rounded-xl border border-yellow-300 bg-yellow-50';


        // ----------------------------------------
        // Title
        // ----------------------------------------

        const title =
            document.createElement(
                'div'
            );

        title.className =
            'font-semibold text-gray-800 mb-2';

        title.textContent =
            'اختار Team للنشر';


        // ----------------------------------------
        // Description
        // ----------------------------------------

        const description =
            document.createElement(
                'div'
            );

        description.className =
            'text-sm text-gray-600 mb-3';

        description.textContent =
            'اختار Team اللي بغيتي TemplateCraft يستعملها لإنشاء المشاريع الجديدة.';


        // ----------------------------------------
        // Select
        // ----------------------------------------

        const select =
            document.createElement(
                'select'
            );

        select.id =
            'netlifyTeamSelect';

        select.className =
            'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';


        // ----------------------------------------
        // Default option
        // ----------------------------------------

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


        // ----------------------------------------
        // Button
        // ----------------------------------------

        const button =
            document.createElement(
                'button'
            );

        button.id =
            'selectNetlifyTeamBtn';

        button.type =
            'button';

        button.className =
            'mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';

        button.textContent =
            'اختيار Team';


        // ----------------------------------------
        // Picker message
        // ----------------------------------------

        const pickerMessage =
            document.createElement(
                'div'
            );

        pickerMessage.id =
            'netlifyTeamPickerMessage';

        pickerMessage.className =
            'hidden mt-2 text-sm';


        // ----------------------------------------
        // Build
        // ----------------------------------------

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
            pickerMessage
        );


        parent.appendChild(
            picker
        );


        // ----------------------------------------
        // Events
        // ----------------------------------------

        select.addEventListener(
            'change',
            function () {

                button.disabled =
                    !Boolean(
                        select.value
                    );
            }
        );


        button.addEventListener(
            'click',
            async function () {

                const slug =
                    String(
                        select.value ||
                        ''
                    ).trim();


                if (!slug) {

                    showTeamPickerMessage(
                        'اختار Team أولاً.',
                        true
                    );

                    return;
                }


                await selectTeam(
                    slug
                );
            }
        );


        return picker;
    }


    function showTeamPickerMessage(
        message,
        isError = false
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

        element.classList.remove(
            'hidden'
        );

        element.classList.toggle(
            'text-red-600',
            Boolean(isError)
        );

        element.classList.toggle(
            'text-green-600',
            !isError
        );
    }


    function clearTeamPickerMessage() {

        const element =
            getElement(
                'netlifyTeamPickerMessage'
            );

        if (!element) {
            return;
        }

        element.textContent =
            '';

        element.classList.add(
            'hidden'
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


        if (!select || !button) {
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

            picker.classList.add(
                'hidden'
            );

            return;
        }


        picker.classList.remove(
            'hidden'
        );


        // Rebuild options.
        while (
            select.options.length > 1
        ) {

            select.remove(
                select.options.length - 1
            );
        }


        teams.forEach(
            function (team) {

                if (!team?.slug) {
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
                    String(
                        team.name ||
                        team.slug
                    );


                const slug =
                    String(
                        team.slug
                    );


                option.textContent =
                    name === slug
                        ? name
                        : `${name} — ${slug}`;


                select.appendChild(
                    option
                );
            }
        );


        select.value =
            netlifyState.teamSlug &&
            teams.some(
                team =>
                    String(
                        team.slug || ''
                    ) ===
                    String(
                        netlifyState.teamSlug
                    )
            )
                ? netlifyState.teamSlug
                : '';


        button.disabled =
            !Boolean(
                select.value
            );


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


    // ============================================
    // 5. AUTHENTICATION
    // ============================================

    function getToken() {

        return (
            localStorage.getItem(
                'token'
            ) ||
            localStorage.getItem(
                'authToken'
            ) ||
            ''
        );
    }


    function isLoggedIn() {

        const token =
            getToken();

        let user = null;


        try {

            user =
                JSON.parse(
                    localStorage.getItem(
                        'user'
                    ) || 'null'
                );

        } catch (_) {

            user = null;
        }


        return Boolean(
            token &&
            user &&
            (
                user.id ||
                user._id
            )
        );
    }


    // ============================================
    // 6. API RESPONSE VALIDATION
    // ============================================

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


    async function callAPI(
        methodName,
        fallbackPath,
        options = {}
    ) {

        if (!API) {

            throw new Error(
                'ملف client-api.js غير محمّل.'
            );
        }


        let response;


        if (
            typeof API[methodName] ===
            'function'
        ) {

            response =
                await API[methodName](
                    ...(options.args || [])
                );

        } else {

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


            const fetchResponse =
                await fetch(
                    `${BACKEND_URL}${fallbackPath}`,
                    fetchOptions
                );


            try {

                response =
                    await fetchResponse.json();

            } catch (_) {

                response = {};
            }


            if (
                !fetchResponse.ok
            ) {

                response.success =
                    false;

                response.status =
                    fetchResponse.status;
            }
        }


        return validateResponse(
            response,
            'وقع خطأ في الاتصال بالخادم.'
        );
    }


    // ============================================
    // 7. RENDER NETLIFY STATE
    // ============================================

    function renderNetlifyState() {

        const {
            loading,
            connected,
            teamSelected,
            teamName
        } = netlifyState;


        // ----------------------------------------
        // Status indicator
        // ----------------------------------------

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


        // ----------------------------------------
        // Status text
        // ----------------------------------------

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


        // ----------------------------------------
        // Connected information
        // ----------------------------------------

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


        // ----------------------------------------
        // Team picker
        // ----------------------------------------

        renderTeamPicker();


        // ----------------------------------------
        // Connect button
        // ----------------------------------------

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


        // ----------------------------------------
        // Confirmation modal
        // ----------------------------------------

        setText(
            'confirmNetlifyTeamName',
            teamSelected
                ? teamName
                : 'غير محدد'
        );


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

        } else {

            hideElement(
                'confirmNetlifyTeamBox'
            );

            showElement(
                'confirmNetlifyWarning'
            );
        }


        // ----------------------------------------
        // Notify other frontend scripts
        // ----------------------------------------

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


    // ============================================
    // 8. CLEAR CONNECTION STATE
    // ============================================

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


    // ============================================
    // 9. CLEAR ONLY TEAM SELECTION
    // ============================================

    function clearTeamSelection(
        teamDeleted = false
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
            Boolean(
                teamDeleted
            );
    }


    // ============================================
    // 10. READ SELECTED TEAM
    // ============================================

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
            team.name || '';

        netlifyState.teamSlug =
            team.slug;

        netlifyState.teamId =
            team.id || '';


        return true;
    }


    // ============================================
    // 11. SELECT TEAM
    // ============================================

    async function selectTeam(
        accountSlug
    ) {

        const slug =
            String(
                accountSlug || ''
            ).trim();


        if (!slug) {

            showTeamPickerMessage(
                'اختيار Team غير صالح.',
                true
            );

            return false;
        }


        if (
            netlifyState.loading
        ) {

            return false;
        }


        const button =
            getElement(
                'selectNetlifyTeamBtn'
            );


        const pickerMessage =
            getElement(
                'netlifyTeamPickerMessage'
            );


        try {

            netlifyState.loading =
                true;


            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    'جاري اختيار Team...';
            }


            if (pickerMessage) {

                pickerMessage.classList.add(
                    'hidden'
                );
            }


            renderNetlifyState();


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
                    team =>
                        String(
                            team?.slug || ''
                        ) === slug
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

            netlifyState.loading =
                false;


            renderNetlifyState();


            const currentButton =
                getElement(
                    'selectNetlifyTeamBtn'
                );


            if (currentButton) {

                currentButton.textContent =
                    'اختيار Team';

                currentButton.disabled =
                    !Boolean(
                        getElement(
                            'netlifyTeamSelect'
                        )?.value
                    );
            }
        }
    }


    // ============================================
    // 12. AUTO SELECT ONLY ONE TEAM
    // ============================================

    async function trySelectSingleTeam(
        existingTeams = null,
        deletedTeam = false
    ) {

        let teamsResponse = null;


        if (
            Array.isArray(
                existingTeams
            )
        ) {

            teamsResponse = {

                teams:
                    existingTeams,

                selectedTeam:
                    null
            };

        } else {

            teamsResponse =
                await callAPI(
                    'getNetlifyTeams',
                    '/api/netlify/teams'
                );
        }


        const teams =
            Array.isArray(
                teamsResponse?.teams
            )
                ? teamsResponse.teams
                : [];


        netlifyState.availableTeams =
            teams;


        // ----------------------------------------
        // Backend already has a selected Team
        // ----------------------------------------

        if (
            teamsResponse?.selectedTeam &&
            teamsResponse.selectedTeam.slug
        ) {

            const applied =
                applySelectedTeam(
                    teamsResponse.selectedTeam
                );


            if (applied) {

                netlifyState.teamDeleted =
                    false;

                return true;
            }
        }


        // ----------------------------------------
        // Exactly one Team
        // ----------------------------------------

        if (
            teams.length === 1 &&
            teams[0]?.slug
        ) {

            const onlyTeam =
                teams[0];


            try {

                const selected =
                    await selectTeam(
                        onlyTeam.slug
                    );


                if (selected) {

                    return true;
                }

            } catch (error) {

                console.error(
                    'Automatic Team selection failed:',
                    error
                );
            }


            // If automatic selection failed,
            // keep the Team available in picker.
            clearTeamSelection(
                deletedTeam
            );


            setMessage(
                deletedTeam
                    ? 'Team القديمة تحيدات. اختار Team الجديدة.'
                    : 'كاينة Team وحدة ولكن الاختيار الأوتوماتيكي فشل. اختارها يدوياً.',
                false,
                true
            );


            return false;
        }


        // ----------------------------------------
        // Multiple Teams
        // ----------------------------------------

        if (
            teams.length > 1
        ) {

            clearTeamSelection(
                deletedTeam
            );


            setMessage(
                deletedTeam
                    ? 'Team السابقة تحيدات. اختار Team جديدة من اللائحة.'
                    : 'حساب Netlify فيه أكثر من Team. اختار Team للنشر من اللائحة.',
                false,
                true
            );


            return false;
        }


        // ----------------------------------------
        // Zero Teams
        // ----------------------------------------

        clearTeamSelection(
            deletedTeam
        );


        setMessage(
            deletedTeam
                ? 'Team السابقة تحيدات وما كايناش Team متاحة حالياً. أنشئ Team في Netlify ثم دير تحديث.'
                : 'ما لقيناش Team متاح في حساب Netlify. أنشئ Team في Netlify ثم دير تحديث.',
            false,
            true
        );


        return false;
    }


    // ============================================
    // 13. REFRESH NETLIFY STATUS
    // ============================================

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
                        {};


                    // --------------------------------
                    // Connection
                    // --------------------------------

                    netlifyState.connected =
                        netlify.connected === true;


                    if (
                        !netlifyState.connected
                    ) {

                        clearConnectionState();


                        return {
                            ...netlifyState
                        };
                    }


                    // --------------------------------
                    // Available Teams
                    // --------------------------------

                    netlifyState.availableTeams =
                        Array.isArray(
                            netlify.availableTeams
                        )
                            ? netlify.availableTeams
                            : [];


                    // --------------------------------
                    // Deleted Team flag
                    // --------------------------------

                    netlifyState.teamDeleted =
                        netlify.teamDeleted === true;


                    // --------------------------------
                    // Selected Team
                    // --------------------------------

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


                    // --------------------------------
                    // Valid selected Team
                    // --------------------------------

                    if (
                        netlifyState.teamSelected &&
                        netlifyState.teamSlug
                    ) {

                        netlifyState.teamDeleted =
                            false;


                        clearMessage();


                        return {
                            ...netlifyState
                        };
                    }


                    // --------------------------------
                    // No valid selected Team
                    // --------------------------------

                    clearTeamSelection(
                        netlifyState.teamDeleted
                    );


                    // --------------------------------
                    // Use Teams returned by /status
                    // --------------------------------

                    await trySelectSingleTeam(
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


    // ============================================
    // 14. CONNECT NETLIFY
    // ============================================

    async function connectNetlify() {

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


        if (
            netlifyState.loading
        ) {

            return;
        }


        // Open popup immediately inside the click event.
        // This helps prevent browser popup blocking.

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
                'المتصفح منع النافذة المنبثقة. سمح بفتح Popups لهذا الموقع وحاول مرة أخرى.',
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


            // Verify that the authorization URL is HTTPS.
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


    // ============================================
    // 15. POPUP WATCHER
    // ============================================

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


                        // OAuth callback may already have sent
                        // its message. Do not refresh twice.

                        if (
                            oauthCompleted
                        ) {

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


    // ============================================
    // 16. RECEIVE OAUTH CALLBACK MESSAGE
    // ============================================

    window.addEventListener(
        'message',
        async function (event) {

            // Only accept messages from our backend.
            if (
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


    // ============================================
    // 17. DISCONNECT NETLIFY
    // ============================================

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


        try {

            netlifyState.loading =
                true;


            renderNetlifyState();


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


    // ============================================
    // 18. PUBLIC INTERFACE
    // ============================================

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


    // ============================================
    // 19. BUTTON EVENTS
    // ============================================

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


    // ============================================
    // 20. INITIALIZATION
    // ============================================

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
            initialize
        );

    } else {

        initialize();
    }

})();
