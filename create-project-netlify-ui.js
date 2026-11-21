/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - NETLIFY UI
====================================================

 مسؤول عن:
 - واجهة حالة Netlify
 - حالة الاتصال
 - الفريق المحدد
 - تحذيرات الفريق
 - عرض الفرق المتاحة
 - مزامنة حالة Netlify

 ملاحظة:
 create-project-netlify.js مسؤول عن:
 - OAuth
 - الاتصال
 - اختيار الفريق
 - حالة Netlify
====================================================
*/

'use strict';


/* =================================================
   1. ELEMENTS
================================================= */

const netlifyUi = {

    container:
        document.getElementById(
            'netlifyStatusContainer'
        ),

    title:
        document.getElementById(
            'netlifyStatusTitle'
        ),

    description:
        document.getElementById(
            'netlifyStatusDescription'
        ),

    badge:
        document.getElementById(
            'netlifyStatusBadge'
        ),

    connectContainer:
        document.getElementById(
            'netlifyConnectContainer'
        ),

    connectButton:
        document.getElementById(
            'connectNetlifyBtn'
        ),

    teamsContainer:
        document.getElementById(
            'netlifyTeamsContainer'
        ),

    teamSelect:
        document.getElementById(
            'netlifyTeamSelect'
        )

};


/* =================================================
   2. HELPERS
================================================= */

function netlifyUiSetVisible(
    element,
    visible
) {

    if (!element) {
        return;
    }

    element.classList.toggle(
        'hidden',
        !visible
    );

    element.classList.toggle(
        'is-hidden',
        !visible
    );

    element.style.display =
        visible ? '' : 'none';

}


function netlifyUiSetText(
    element,
    value
) {

    if (!element) {
        return;
    }

    element.textContent =
        value || '';

}


function netlifyUiNormalizeState(
    state
) {

    return (
        state &&
        typeof state === 'object'
    )
        ? state
        : {};

}


/* =================================================
   3. UPDATE MAIN NETLIFY UI
================================================= */

function updateNetlifyConfirmationUI(
    state
) {

    state =
        netlifyUiNormalizeState(
            state
        );


    const connected =
        state.connected === true;


    const loading =
        state.loading === true;


    const teamName =
        state.teamName ||
        state.teamSlug ||
        '';


    const teams =
        Array.isArray(
            state.availableTeams
        )
            ? state.availableTeams
            : [];


    const teamSelected =
        Boolean(
            state.teamSelected === true ||
            state.teamId ||
            state.teamSlug
        );


    const message =
        state.message ||
        '';


    netlifyUiSetVisible(
        netlifyUi.container,
        true
    );


    /* =============================================
       CHECKING
    ============================================= */

    if (loading) {

        netlifyUiSetText(
            netlifyUi.title,
            'جاري التحقق من اتصال Netlify...'
        );


        netlifyUiSetText(
            netlifyUi.description,
            'يرجى الانتظار حتى يتم التحقق من الحساب والفريق المحدد.'
        );


        if (netlifyUi.badge) {

            netlifyUi.badge.textContent =
                'جارٍ التحقق';

            netlifyUi.badge.className =
                'netlify-status-badge loading';

        }


        netlifyUiSetVisible(
            netlifyUi.connectContainer,
            false
        );


        netlifyUiSetVisible(
            netlifyUi.teamsContainer,
            false
        );


        return;

    }


    /* =============================================
       CONNECTED + TEAM READY
    ============================================= */

    if (
        connected &&
        teamSelected
    ) {

        netlifyUiSetText(
            netlifyUi.title,
            'Netlify متصل وجاهز للنشر'
        );


        netlifyUiSetText(
            netlifyUi.description,
            `تم الاتصال بحساب Netlify بنجاح. الفريق المحدد: ${teamName}.`
        );


        if (netlifyUi.badge) {

            netlifyUi.badge.textContent =
                'جاهز';

            netlifyUi.badge.className =
                'netlify-status-badge connected';

        }


        netlifyUiSetVisible(
            netlifyUi.connectContainer,
            false
        );


        netlifyUiSetVisible(
            netlifyUi.teamsContainer,
            teams.length > 1
        );


        if (
            netlifyUi.teamSelect &&
            teams.length
        ) {

            renderNetlifyTeams(
                teams,
                state
            );

        }


        return;

    }


    /* =============================================
       CONNECTED BUT NO TEAM
    ============================================= */

    if (connected) {

        netlifyUiSetText(
            netlifyUi.title,
            'Netlify متصل'
        );


        netlifyUiSetText(
            netlifyUi.description,
            message ||
            'تم الاتصال بحساب Netlify. يرجى اختيار فريق قبل إنشاء المشروع.'
        );


        if (netlifyUi.badge) {

            netlifyUi.badge.textContent =
                'اختر الفريق';

            netlifyUi.badge.className =
                'netlify-status-badge warning';

        }


        netlifyUiSetVisible(
            netlifyUi.connectContainer,
            false
        );


        netlifyUiSetVisible(
            netlifyUi.teamsContainer,
            teams.length > 0
        );


        if (
            netlifyUi.teamSelect &&
            teams.length
        ) {

            renderNetlifyTeams(
                teams,
                state
            );

        }


        return;

    }


    /* =============================================
       DISCONNECTED
    ============================================= */

    netlifyUiSetText(
        netlifyUi.title,
        'Netlify غير متصل'
    );


    netlifyUiSetText(
        netlifyUi.description,
        message ||
        'يرجى ربط حساب Netlify حتى تتمكن من إنشاء ونشر المشروع.'
    );


    if (netlifyUi.badge) {

        netlifyUi.badge.textContent =
            'غير متصل';

        netlifyUi.badge.className =
            'netlify-status-badge disconnected';

    }


    netlifyUiSetVisible(
        netlifyUi.connectContainer,
        true
    );


    netlifyUiSetVisible(
        netlifyUi.teamsContainer,
        false
    );

}


/* =================================================
   4. RENDER TEAMS
================================================= */

function renderNetlifyTeams(
    teams,
    state
) {

    if (!netlifyUi.teamSelect) {
        return;
    }


    if (!Array.isArray(teams)) {
        teams = [];
    }


    state =
        state || {};


    const currentValue =
        state.teamSlug ||
        state.teamId ||
        '';


    netlifyUi.teamSelect.innerHTML =
        '';


    /* =============================================
       NO TEAMS
    ============================================= */

    if (!teams.length) {

        const option =
            document.createElement(
                'option'
            );

        option.value = '';

        option.textContent =
            'لا توجد فرق متاحة في حساب Netlify';

        netlifyUi.teamSelect.appendChild(
            option
        );

        netlifyUi.teamSelect.disabled =
            true;

        return;

    }


    netlifyUi.teamSelect.disabled =
        false;


    /* =============================================
       PLACEHOLDER
    ============================================= */

    if (teams.length > 1) {

        const placeholder =
            document.createElement(
                'option'
            );

        placeholder.value = '';

        placeholder.textContent =
            'اختر فريق Netlify';

        placeholder.selected =
            !currentValue;

        netlifyUi.teamSelect.appendChild(
            placeholder
        );

    }


    /* =============================================
       TEAMS
    ============================================= */

    teams.forEach(
        function (team) {

            if (!team) {
                return;
            }


            const value =
                team.slug ||
                team.id ||
                team.account_slug ||
                '';


            if (!value) {
                return;
            }


            const name =
                team.name ||
                team.slug ||
                team.account_name ||
                'فريق Netlify';


            const option =
                document.createElement(
                    'option'
                );


            option.value =
                value;


            option.textContent =
                name;


            if (
                currentValue &&
                String(value) ===
                String(currentValue)
            ) {

                option.selected =
                    true;

            }


            netlifyUi.teamSelect.appendChild(
                option
            );

        }
    );

}


/* =================================================
   5. WARNING
================================================= */

function showNetlifyConfirmationWarning(
    message
) {

    netlifyUiSetVisible(
        netlifyUi.container,
        true
    );


    netlifyUiSetText(
        netlifyUi.title,
        'إعداد Netlify مطلوب'
    );


    netlifyUiSetText(
        netlifyUi.description,
        message ||
        'يرجى إكمال إعداد Netlify قبل إنشاء المشروع.'
    );


    if (netlifyUi.badge) {

        netlifyUi.badge.textContent =
            'إجراء مطلوب';

        netlifyUi.badge.className =
            'netlify-status-badge warning';

    }


    netlifyUiSetVisible(
        netlifyUi.connectContainer,
        true
    );


    netlifyUiSetVisible(
        netlifyUi.teamsContainer,
        false
    );

}


/* =================================================
   6. HIDE WARNING
================================================= */

function hideNetlifyConfirmationWarning() {

    const state =
        typeof getNetlifyState ===
        'function'
            ? getNetlifyState()
            : (
                window.TemplateCraftNetlify &&
                typeof window.TemplateCraftNetlify.getState ===
                'function'
                    ? window.TemplateCraftNetlify.getState()
                    : null
            );


    if (state) {

        updateNetlifyConfirmationUI(
            state
        );

        return;

    }


    if (netlifyUi.description) {

        netlifyUi.description.textContent =
            '';

    }

}


/* =================================================
   7. SYNC UI
================================================= */

function syncNetlifyConfirmationUI(
    state
) {

    state =
        netlifyUiNormalizeState(
            state
        );


    updateNetlifyConfirmationUI(
        state
    );

}


/* =================================================
   8. REFRESH UI
================================================= */

async function refreshNetlifyConfirmationUI() {

    if (
        window.TemplateCraftNetlify &&
        typeof window.TemplateCraftNetlify.refreshStatus ===
        'function'
    ) {

        try {

            const state =
                await window.TemplateCraftNetlify.refreshStatus();


            syncNetlifyConfirmationUI(
                state
            );


            return state;

        } catch (error) {

            console.error(
                '[TemplateCraft] Netlify UI refresh error:',
                error
            );


            showNetlifyConfirmationWarning(
                'تعذر التحقق من حالة Netlify. يرجى المحاولة مرة أخرى.'
            );


            return null;

        }

    }


    if (
        typeof refreshNetlifyState ===
        'function'
    ) {

        try {

            const state =
                await refreshNetlifyState();


            syncNetlifyConfirmationUI(
                state
            );


            return state;

        } catch (error) {

            console.error(
                '[TemplateCraft] Netlify state refresh error:',
                error
            );

        }

    }


    return null;

}


/* =================================================
   9. TEAM SELECT CHANGE
================================================= */

if (netlifyUi.teamSelect) {

    netlifyUi.teamSelect.addEventListener(
        'change',
        async function () {

            const value =
                this.value;


            if (!value) {
                return;
            }


            if (
                window.TemplateCraftNetlify &&
                typeof window.TemplateCraftNetlify.selectTeam ===
                'function'
            ) {

                await window.TemplateCraftNetlify.selectTeam(
                    value
                );

                return;

            }


            if (
                typeof selectTeam ===
                'function'
            ) {

                await selectTeam(
                    value
                );

            }

        }
    );

}


/* =================================================
   10. STATE EVENTS
=================================================

 ندعمو الحدثين:

 templatecraft:netlify-state
 netlify:state

 حتى ما يكون حتى تعارض بين الملفات.
================================================= */

function handleNetlifyStateEvent(
    event
) {

    if (
        event &&
        event.detail
    ) {

        syncNetlifyConfirmationUI(
            event.detail
        );

    }

}


window.addEventListener(
    'templatecraft:netlify-state',
    handleNetlifyStateEvent
);


window.addEventListener(
    'netlify:state',
    handleNetlifyStateEvent
);


/* =================================================
   11. PUBLIC API
================================================= */

window.updateNetlifyConfirmationUI =
    updateNetlifyConfirmationUI;


window.showNetlifyConfirmationWarning =
    showNetlifyConfirmationWarning;


window.hideNetlifyConfirmationWarning =
    hideNetlifyConfirmationWarning;


window.syncNetlifyConfirmationUI =
    syncNetlifyConfirmationUI;


window.refreshNetlifyConfirmationUI =
    refreshNetlifyConfirmationUI;


window.renderNetlifyTeams =
    renderNetlifyTeams;


/* =================================================
   12. INITIAL
================================================= */

function initializeNetlifyUI() {

    const existingState =
        window.TemplateCraftNetlify &&
        typeof window.TemplateCraftNetlify.getState ===
        'function'
            ? window.TemplateCraftNetlify.getState()
            : null;


    if (existingState) {

        syncNetlifyConfirmationUI(
            existingState
        );

    }

}


if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initializeNetlifyUI,
        {
            once: true
        }
    );

} else {

    initializeNetlifyUI();

}
