/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - NETLIFY UI
====================================================

 مسؤول عن:
 - Netlify status UI
 - Connected / disconnected state
 - Selected Team display
 - Team warning
 - Team deleted messages
 - Available Teams messages

 create-project-netlify.js يبقى مسؤول عن:
 - OAuth
 - Connection
 - Team picker
 - Team selection
 - Netlify state

====================================================
*/


'use strict';


// ================================================
// 1. ELEMENTS
// ================================================

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


// ================================================
// 2. HELPERS
// ================================================

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

    return state || {};

}


// ================================================
// 3. UPDATE MAIN NETLIFY UI
// ================================================

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
        'Netlify Team';


    const message =
        state.message ||
        '';


    // --------------------------------------------
    // Container
    // --------------------------------------------

    netlifyUiSetVisible(
        netlifyUi.container,
        true
    );


    // --------------------------------------------
    // Loading
    // --------------------------------------------

    if (loading) {

        netlifyUiSetText(
            netlifyUi.title,
            'جاري التحقق من Netlify...'
        );


        netlifyUiSetText(
            netlifyUi.description,
            'يرجى الانتظار قليلاً حتى يتم التحقق من اتصال Netlify.'
        );


        if (netlifyUi.badge) {

            netlifyUi.badge.textContent =
                'جاري التحقق';

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


    // --------------------------------------------
    // CONNECTED
    // --------------------------------------------

    if (connected) {

        netlifyUiSetText(
            netlifyUi.title,
            'Netlify متصل'
        );


        if (teamName) {

            netlifyUiSetText(
                netlifyUi.description,
                'تم الاتصال بحساب Netlify بنجاح. الفريق المحدد: ' +
                teamName
            );

        } else {

            netlifyUiSetText(
                netlifyUi.description,
                message ||
                'تم الاتصال بحساب Netlify بنجاح.'
            );

        }


        if (netlifyUi.badge) {

            netlifyUi.badge.textContent =
                'متصل';

            netlifyUi.badge.className =
                'netlify-status-badge connected';

        }


        netlifyUiSetVisible(
            netlifyUi.connectContainer,
            false
        );


        // إذا كان هناك أكثر من فريق
        // يبقى اختيار الفريق ظاهراً.

        const teams =
            Array.isArray(
                state.availableTeams
            )
                ? state.availableTeams
                : [];


        const hasMultipleTeams =
            teams.length > 1;


        const hasSelectedTeam =
            Boolean(
                state.teamId ||
                state.teamSlug ||
                state.teamSelected
            );


        if (
            hasMultipleTeams &&
            !hasSelectedTeam
        ) {

            netlifyUiSetVisible(
                netlifyUi.teamsContainer,
                true
            );

        } else {

            netlifyUiSetVisible(
                netlifyUi.teamsContainer,
                hasMultipleTeams
            );

        }


        // تحديث select إذا كان موجوداً

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


    // --------------------------------------------
    // DISCONNECTED
    // --------------------------------------------

    netlifyUiSetText(
        netlifyUi.title,
        'Netlify غير متصل'
    );


    netlifyUiSetText(
        netlifyUi.description,
        message ||
        'قم بربط حساب Netlify حتى تتمكن من نشر مشروعك.'
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


// ================================================
// 4. RENDER TEAMS
// ================================================

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


    const currentSlug =
        state &&
        (
            state.teamSlug ||
            state.teamId
        );


    netlifyUi.teamSelect.innerHTML =
        '';


    // --------------------------------------------
    // No teams
    // --------------------------------------------

    if (!teams.length) {

        const option =
            document.createElement(
                'option'
            );

        option.value =
            '';

        option.textContent =
            'لا توجد فرق Netlify متاحة';

        netlifyUi.teamSelect.appendChild(
            option
        );

        netlifyUi.teamSelect.disabled =
            true;

        return;

    }


    netlifyUi.teamSelect.disabled =
        false;


    // --------------------------------------------
    // Placeholder
    // --------------------------------------------

    if (teams.length > 1) {

        const placeholder =
            document.createElement(
                'option'
            );

        placeholder.value =
            '';

        placeholder.textContent =
            'اختر فريق Netlify';

        placeholder.disabled =
            false;

        placeholder.selected =
            !currentSlug;

        netlifyUi.teamSelect.appendChild(
            placeholder
        );

    }


    // --------------------------------------------
    // Teams
    // --------------------------------------------

    teams.forEach(
        function (team) {

            if (!team) {

                return;

            }


            const option =
                document.createElement(
                    'option'
                );


            const value =
                team.slug ||
                team.id ||
                team.account_slug ||
                '';


            const name =
                team.name ||
                team.slug ||
                team.account_name ||
                'Netlify Team';


            option.value =
                value;


            option.textContent =
                name;


            if (
                currentSlug &&
                String(value) ===
                String(currentSlug)
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


// ================================================
// 5. WARNING
// ================================================

function showNetlifyConfirmationWarning(
    message
) {

    netlifyUiSetVisible(
        netlifyUi.container,
        true
    );


    netlifyUiSetText(
        netlifyUi.title,
        'تنبيه Netlify'
    );


    netlifyUiSetText(
        netlifyUi.description,
        message ||
        'يرجى إكمال إعداد Netlify قبل إنشاء المشروع.'
    );


    if (netlifyUi.badge) {

        netlifyUi.badge.textContent =
            'تنبيه';

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


// ================================================
// 6. HIDE WARNING
// ================================================

function hideNetlifyConfirmationWarning() {

    const state =
        typeof getNetlifyState ===
        'function'
            ? getNetlifyState()
            : null;


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


// ================================================
// 7. SYNC UI
// ================================================

function syncNetlifyConfirmationUI(
    state
) {

    state =
        netlifyUiNormalizeState(
            state
        );


    // إذا كانت الدالة موجودة
    // نستعملها لمعرفة هل Netlify جاهز.

    if (
        typeof netlifyReady ===
        'function'
    ) {

        if (
            netlifyReady(
                state
            )
        ) {

            updateNetlifyConfirmationUI(
                state
            );

            return;

        }


        if (
            typeof getNetlifyReadinessMessage ===
            'function'
        ) {

            showNetlifyConfirmationWarning(
                getNetlifyReadinessMessage(
                    state
                )
            );

            return;

        }

    }


    // fallback
    updateNetlifyConfirmationUI(
        state
    );

}


// ================================================
// 8. REFRESH UI
// ================================================

async function refreshNetlifyConfirmationUI() {

    if (
        typeof refreshNetlifyState !==
        'function'
    ) {

        return null;

    }


    try {

        const state =
            await refreshNetlifyState();


        syncNetlifyConfirmationUI(
            state
        );


        return state;

    } catch (error) {

        console.error(
            'Netlify UI refresh error:',
            error
        );


        showNetlifyConfirmationWarning(
            'تعذر التحقق من حالة Netlify. حاول مرة أخرى.'
        );


        return null;

    }

}


// ================================================
// 9. TEAM SELECT CHANGE
// ================================================

if (netlifyUi.teamSelect) {

    netlifyUi.teamSelect.addEventListener(
        'change',
        async function () {

            const value =
                this.value;


            if (!value) {

                return;

            }


            // create-project-netlify.js
            // مسؤول عن عملية اختيار الفريق.

            if (
                typeof selectTeam ===
                'function'
            ) {

                try {

                    await selectTeam(
                        value
                    );

                } catch (error) {

                    console.error(
                        'Netlify team selection error:',
                        error
                    );

                }

                return;

            }


            if (
                window.TemplateCraftNetlify &&
                typeof window.TemplateCraftNetlify.selectTeam ===
                'function'
            ) {

                try {

                    await window.TemplateCraftNetlify.selectTeam(
                        value
                    );

                } catch (error) {

                    console.error(
                        'Netlify team selection error:',
                        error
                    );

                }

            }

        }
    );

}


// ================================================
// 10. NETLIFY STATE EVENTS
// ================================================

window.addEventListener(
    'netlify:state',
    function (event) {

        if (
            event &&
            event.detail
        ) {

            syncNetlifyConfirmationUI(
                event.detail
            );

        }

    }
);


// ================================================
// 11. PUBLIC API
// ================================================

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


// ================================================
// 12. INITIAL UI
// ================================================

document.addEventListener(
    'DOMContentLoaded',
    function () {

        // لا نبقى في "جاري التحقق"
        // إذا لم تكن هناك حالة بعد.

        if (
            netlifyUi.title &&
            !netlifyUi.title.textContent.trim()
        ) {

            netlifyUi.title.textContent =
                'Netlify';

        }

    }
);
