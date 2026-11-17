/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - NETLIFY UI
====================================================

 مسؤول عن:
 - Netlify confirmation UI
 - Selected Team display
 - Team warning
 - Team deleted messages
 - Available Teams messages

 create-project-netlify.js يبقى مسؤول عن:
 - OAuth
 - Team picker
 - Connection
 - Team selection
 - Netlify state

====================================================
*/


// ================================================
// 1. ELEMENTS
// ================================================

const netlifyUiTeamBox =
    document.getElementById(
        'confirmNetlifyTeamBox'
    );

const netlifyUiTeamName =
    document.getElementById(
        'confirmNetlifyTeamName'
    );

const netlifyUiWarning =
    document.getElementById(
        'confirmNetlifyWarning'
    );


// ================================================
// 2. UPDATE TEAM UI
// ================================================

function updateNetlifyConfirmationUI(
    state
) {

    if (!state) {

        return;

    }


    if (
        netlifyUiTeamName
    ) {

        netlifyUiTeamName.textContent =
            state.teamName ||
            state.teamSlug ||
            'Netlify Team';

    }


    if (
        netlifyUiTeamBox
    ) {

        netlifyUiTeamBox.classList.remove(
            'hidden'
        );

    }


    if (
        netlifyUiWarning
    ) {

        netlifyUiWarning.classList.add(
            'hidden'
        );

        netlifyUiWarning.textContent =
            '';

    }

}


// ================================================
// 3. SHOW WARNING
// ================================================

function showNetlifyConfirmationWarning(
    message
) {

    if (
        netlifyUiTeamBox
    ) {

        netlifyUiTeamBox.classList.add(
            'hidden'
        );

    }


    if (
        netlifyUiWarning
    ) {

        netlifyUiWarning.classList.remove(
            'hidden'
        );

        netlifyUiWarning.textContent =
            message || '';

    }

}


// ================================================
// 4. HIDE WARNING
// ================================================

function hideNetlifyConfirmationWarning() {

    if (
        netlifyUiWarning
    ) {

        netlifyUiWarning.classList.add(
            'hidden'
        );

        netlifyUiWarning.textContent =
            '';

    }

}


// ================================================
// 5. SYNC NETLIFY UI
// ================================================

function syncNetlifyConfirmationUI(
    state
) {

    if (
        typeof netlifyReady !==
            'function'
    ) {

        return;

    }


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

    }

}


// ================================================
// 6. REFRESH UI
// ================================================

async function refreshNetlifyConfirmationUI() {

    if (
        typeof refreshNetlifyState !==
            'function'
    ) {

        return null;

    }


    const state =
        await refreshNetlifyState();


    syncNetlifyConfirmationUI(
        state
    );


    return state;

}


// ================================================
// 7. PUBLIC API
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
