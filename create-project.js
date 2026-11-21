/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - MAIN JAVASCRIPT
====================================================

 مسؤول عن:

 - Authentication
 - Core Elements
 - API Check
 - Netlify Readiness
 - User Information
 - Site Data
 - Create Modal
 - Status
 - Initialization

====================================================
*/

'use strict';


// ====================================================
// 1. AUTHENTICATION
// ====================================================

let user = null;

try {

    user = JSON.parse(
        localStorage.getItem('user') || 'null'
    );

} catch (error) {

    user = null;

}


const userId =
    user &&
    (user.id || user._id);

const authToken =
    localStorage.getItem('token');


if (
    !user ||
    !userId ||
    !authToken
) {

    localStorage.removeItem('user');
    localStorage.removeItem('token');

    alert(
        'انتهت جلسة تسجيل الدخول أو لم يتم تسجيل الدخول. المرجو تسجيل الدخول مجدداً.'
    );

    window.location.replace(
        'login.html'
    );

    throw new Error(
        'Authentication required'
    );

}


// ====================================================
// 2. STATE
// ====================================================

let publishedSiteUrl = null;

let createdSiteId = null;


// ====================================================
// 3. CORE ELEMENTS
// ====================================================

const templatesGrid =
    document.getElementById(
        'templatesGrid'
    );

const projectTypeSelect =
    document.getElementById(
        'projectTypeSelect'
    );


/*
 IMPORTANT:
 HTML عندك id="siteName"
*/

const siteNameInput =
    document.getElementById(
        'siteName'
    );


const selectedLabel =
    document.getElementById(
        'selectedLabel'
    );


const createProjectBtn =
    document.getElementById(
        'createProjectBtn'
    );


const createResult =
    document.getElementById(
        'createResult'
    );


const statusMessage =
    document.getElementById(
        'netlifyStatusDescription'
    );


// ====================================================
// 4. CREATE MODAL
// ====================================================

const createModal =
    document.getElementById(
        'createModal'
    );

const confirmCreateBtn =
    document.getElementById(
        'confirmCreateBtn'
    );

const cancelCreateBtn =
    document.getElementById(
        'cancelCreateBtn'
    );

const closeCreateModalBtn =
    document.getElementById(
        'closeCreateModalBtn'
    );

const createModalContent =
    document.getElementById(
        'createModalContent'
    );


// ====================================================
// 5. NETLIFY ELEMENTS
// ====================================================

const netlifyStatusTitle =
    document.getElementById(
        'netlifyStatusTitle'
    );

const netlifyStatusDescription =
    document.getElementById(
        'netlifyStatusDescription'
    );

const netlifyStatusBadge =
    document.getElementById(
        'netlifyStatusBadge'
    );

const netlifyConnectContainer =
    document.getElementById(
        'netlifyConnectContainer'
    );

const connectNetlifyBtn =
    document.getElementById(
        'connectNetlifyBtn'
    );

const netlifyTeamsContainer =
    document.getElementById(
        'netlifyTeamsContainer'
    );

const netlifyTeamSelect =
    document.getElementById(
        'netlifyTeamSelect'
    );


// ====================================================
// 6. DEPLOYMENT ELEMENTS
// ====================================================

const deploymentOverlay =
    document.getElementById(
        'deploymentOverlay'
    );

const deploymentTitle =
    document.getElementById(
        'deploymentTitle'
    );

const deploymentMessage =
    document.getElementById(
        'deploymentMessage'
    );

const deploymentProgress =
    document.getElementById(
        'deploymentProgress'
    );


// ====================================================
// 7. API CHECK
// ====================================================

function apiAvailable() {

    return (
        typeof window.TemplateCraftAPI !==
            'undefined'
    );

}


// ====================================================
// 8. NETLIFY STATE
// ====================================================

function getNetlifyState() {

    if (
        !window.TemplateCraftNetlify ||
        typeof window.TemplateCraftNetlify.getState !==
            'function'
    ) {

        return {

            connected: false,

            teamSelected: false,

            teamDeleted: false,

            teamName: null,

            teamSlug: null,

            teamId: null,

            availableTeams: []

        };

    }


    const state =
        window.TemplateCraftNetlify.getState();


    return {

        connected:
            state?.connected === true,

        teamSelected:
            state?.teamSelected === true,

        teamDeleted:
            state?.teamDeleted === true,

        teamName:
            state?.teamName || null,

        teamSlug:
            state?.teamSlug || null,

        teamId:
            state?.teamId || null,

        availableTeams:
            Array.isArray(
                state?.availableTeams
            )
                ? state.availableTeams
                : []

    };

}


// ====================================================
// 9. NETLIFY READY
// ====================================================

function netlifyReady(state) {

    return (
        state &&
        state.connected === true &&
        state.teamSelected === true &&
        Boolean(state.teamSlug)
    );

}


// ====================================================
// 10. NETLIFY MESSAGE
// ====================================================

function getNetlifyReadinessMessage(
    state
) {

    if (
        !state ||
        !state.connected
    ) {

        return (
            'خاصك تربط حساب Netlify أولاً قبل إنشاء الموقع.'
        );

    }


    if (
        state.teamDeleted
    ) {

        if (
            Array.isArray(
                state.availableTeams
            ) &&
            state.availableTeams.length > 0
        ) {

            return (
                'الـ Team السابق لم يعد موجوداً. اختار Team جديد.'
            );

        }


        return (
            'ما كاين حتى Team متاح حالياً في Netlify.'
        );

    }


    if (
        Array.isArray(
            state.availableTeams
        ) &&
        state.availableTeams.length === 0
    ) {

        return (
            'ما كاين حتى Team في حساب Netlify.'
        );

    }


    if (
        !state.teamSelected ||
        !state.teamSlug
    ) {

        return (
            'خاصك تختار Netlify Team قبل إنشاء الموقع.'
        );

    }


    return (
        'تعذر تأكيد حالة Netlify.'
    );

}


// ====================================================
// 11. TIMEOUT HELPER
// ====================================================

function withTimeout(
    promise,
    milliseconds = 8000
) {

    return Promise.race([

        promise,

        new Promise(
            (_, reject) => {

                setTimeout(
                    () => {

                        reject(
                            new Error(
                                'TIMEOUT'
                            )
                        );

                    },
                    milliseconds
                );

            }
        )

    ]);

}


// ====================================================
// 12. REFRESH NETLIFY STATE
// ====================================================

async function refreshNetlifyState() {

    /*
    ----------------------------------------------------
    مهم جداً:

    ما نخليوش الصفحة عالقة للأبد
    فـ "جاري التحقق..."
    ----------------------------------------------------
    */

    if (
        !window.TemplateCraftNetlify ||
        typeof window.TemplateCraftNetlify
            .refreshStatus !==
            'function'
    ) {

        updateNetlifyUI(
            getNetlifyState()
        );

        return getNetlifyState();

    }


    try {

        await withTimeout(

            window.TemplateCraftNetlify
                .refreshStatus(),

            8000

        );

    } catch (error) {

        console.error(
            '[TemplateCraft] Netlify refresh:',
            error
        );

    }


    const state =
        getNetlifyState();


    updateNetlifyUI(
        state
    );


    return state;

}


// ====================================================
// 13. NETLIFY UI
// ====================================================

function updateNetlifyUI(
    state
) {

    if (
        !netlifyStatusBadge ||
        !netlifyStatusDescription
    ) {

        return;

    }


    /*
    -----------------------------------------------
    Connected
    -----------------------------------------------
    */

    if (
        netlifyReady(state)
    ) {

        netlifyStatusTitle.textContent =
            'Netlify متصل';

        netlifyStatusDescription.textContent =
            `Team: ${
                state.teamName ||
                state.teamSlug
            }`;

        netlifyStatusBadge.textContent =
            '✓ متصل وجاهز';

        netlifyStatusBadge.className =
            'status-badge success';


        netlifyConnectContainer?.classList.add(
            'hidden'
        );


        if (
            Array.isArray(
                state.availableTeams
            ) &&
            state.availableTeams.length > 0
        ) {

            netlifyTeamsContainer?.classList.remove(
                'hidden'
            );

        }


        populateNetlifyTeams(
            state
        );


        return;

    }


    /*
    -----------------------------------------------
    Not connected
    -----------------------------------------------
    */

    if (
        !state.connected
    ) {

        netlifyStatusTitle.textContent =
            'Netlify غير متصل';

        netlifyStatusDescription.textContent =
            'خاصك تربط حساب Netlify باش تقدر تنشر المشروع.';

        netlifyStatusBadge.textContent =
            '⚠ غير متصل';

        netlifyStatusBadge.className =
            'status-badge warning';


        netlifyConnectContainer?.classList.remove(
            'hidden'
        );


        netlifyTeamsContainer?.classList.add(
            'hidden'
        );


        return;

    }


    /*
    -----------------------------------------------
    Connected but Team missing
    -----------------------------------------------
    */

    netlifyStatusTitle.textContent =
        'Netlify متصل';

    netlifyStatusDescription.textContent =
        getNetlifyReadinessMessage(
            state
        );

    netlifyStatusBadge.textContent =
        '⚠ اختار Team';

    netlifyStatusBadge.className =
        'status-badge warning';


    netlifyConnectContainer?.classList.add(
        'hidden'
    );


    if (
        Array.isArray(
            state.availableTeams
        ) &&
        state.availableTeams.length > 0
    ) {

        netlifyTeamsContainer?.classList.remove(
            'hidden'
        );

    }

    populateNetlifyTeams(
        state
    );

}


// ====================================================
// 14. POPULATE NETLIFY TEAMS
// ====================================================

function populateNetlifyTeams(
    state
) {

    if (
        !netlifyTeamSelect
    ) {

        return;

    }


    const teams =
        Array.isArray(
            state?.availableTeams
        )
            ? state.availableTeams
            : [];


    netlifyTeamSelect.innerHTML =
        '';


    if (
        teams.length === 0
    ) {

        netlifyTeamSelect.innerHTML =
            `
            <option value="">
                لا توجد فرق متاحة
            </option>
            `;

        return;

    }


    const placeholder =
        document.createElement(
            'option'
        );

    placeholder.value = '';

    placeholder.textContent =
        'اختار Team';


    netlifyTeamSelect.appendChild(
        placeholder
    );


    teams.forEach(
        team => {

            const option =
                document.createElement(
                    'option'
                );


            const id =
                team.id ||
                team.teamId ||
                team.slug;


            const name =
                team.name ||
                team.slug ||
                id;


            option.value =
                id || '';


            option.textContent =
                name;


            if (
                state.teamId &&
                String(id) ===
                String(state.teamId)
            ) {

                option.selected =
                    true;

            }


            netlifyTeamSelect.appendChild(
                option
            );

        }
    );

}


// ====================================================
// 15. CONNECT NETLIFY
// ====================================================

if (
    connectNetlifyBtn
) {

    connectNetlifyBtn.addEventListener(
        'click',
        async function () {

            if (
                !window.TemplateCraftNetlify
            ) {

                return;

            }


            try {

                if (
                    typeof window.TemplateCraftNetlify
                        .connect ===
                        'function'
                ) {

                    await window.TemplateCraftNetlify
                        .connect();

                }


                await refreshNetlifyState();

            } catch (error) {

                console.error(
                    '[TemplateCraft] Netlify connect:',
                    error
                );

            }

        }
    );

}


// ====================================================
// 16. SELECT TEAM
// ====================================================

if (
    netlifyTeamSelect
) {

    netlifyTeamSelect.addEventListener(
        'change',
        async function () {

            const teamId =
                netlifyTeamSelect.value;


            if (!teamId) {
                return;
            }


            if (
                !window.TemplateCraftNetlify
            ) {

                return;

            }


            try {

                if (
                    typeof window.TemplateCraftNetlify
                        .selectTeam ===
                        'function'
                ) {

                    await window.TemplateCraftNetlify
                        .selectTeam(
                            teamId
                        );

                }


                await refreshNetlifyState();

            } catch (error) {

                console.error(
                    '[TemplateCraft] Select Netlify team:',
                    error
                );

            }

        }
    );

}


// ====================================================
// 17. OPEN CREATE MODAL
// ====================================================

async function openCreateModal() {

    const siteName =
        String(
            siteNameInput?.value || ''
        ).trim();


    const selected =
        window.TemplateCraftCreatePage?.getSelectedTemplate?.();


    if (!siteName) {

        alert(
            'دخل اسم المشروع أولاً.'
        );

        siteNameInput?.focus();

        return;

    }


    if (!selected) {

        alert(
            'اختار قالب أولاً.'
        );

        return;

    }


    /*
    -----------------------------------------------
    Modal content
    -----------------------------------------------
    */

    if (
        createModalContent
    ) {

        createModalContent.innerHTML =
            `
            <div
                style="
                    display:grid;
                    gap:10px;
                "
            >

                <div>
                    <strong>اسم المشروع</strong>
                    <div
                        style="
                            color:#64748b;
                            margin-top:3px;
                        "
                    >
                        ${escapeHtmlSafe(siteName)}
                    </div>
                </div>

                <div>
                    <strong>القالب</strong>
                    <div
                        style="
                            color:#64748b;
                            margin-top:3px;
                        "
                    >
                        ${escapeHtmlSafe(selected.name)}
                    </div>
                </div>

                <div>
                    <strong>الفئة</strong>
                    <div
                        style="
                            color:#64748b;
                            margin-top:3px;
                        "
                    >
                        ${escapeHtmlSafe(
                            selected.projectType ||
                            selected.category ||
                            ''
                        )}
                    </div>
                </div>

            </div>
            `;

    }


    if (
        createModal
    ) {

        createModal.classList.add(
            'show'
        );

        createModal.classList.add(
            'active'
        );

    }


    if (
        confirmCreateBtn
    ) {

        confirmCreateBtn.disabled =
            true;

        confirmCreateBtn.textContent =
            '⏳ جاري التحقق من Netlify...';

    }


    /*
    -----------------------------------------------
    Refresh with timeout
    -----------------------------------------------
    */

    const state =
        await refreshNetlifyState();


    if (
        netlifyReady(state)
    ) {

        if (
            confirmCreateBtn
        ) {

            confirmCreateBtn.disabled =
                false;

            confirmCreateBtn.textContent =
                '🚀 تأكيد إنشاء المشروع';

        }

    } else {

        if (
            confirmCreateBtn
        ) {

            confirmCreateBtn.disabled =
                true;

            confirmCreateBtn.textContent =
                '⚠ خاصك تجهيز Netlify أولاً';

        }


        if (
            createModalContent
        ) {

            createModalContent.innerHTML +=
                `
                <div
                    style="
                        margin-top:15px;
                        padding:12px;
                        border-radius:12px;
                        background:#fff7ed;
                        color:#9a3412;
                        font-size:12px;
                        font-weight:700;
                    "
                >
                    ${escapeHtmlSafe(
                        getNetlifyReadinessMessage(
                            state
                        )
                    )}
                </div>
                `;

        }

    }

}


// ====================================================
// 18. CLOSE CREATE MODAL
// ====================================================

function closeCreateModal() {

    if (
        createModal
    ) {

        createModal.classList.remove(
            'show'
        );

        createModal.classList.remove(
            'active'
        );

    }

}


// ====================================================
// 19. MODAL EVENTS
// ====================================================

cancelCreateBtn?.addEventListener(
    'click',
    closeCreateModal
);


closeCreateModalBtn?.addEventListener(
    'click',
    closeCreateModal
);


createModal?.addEventListener(
    'click',
    function (event) {

        if (
            event.target ===
            createModal
        ) {

            closeCreateModal();

        }

    }
);


// ====================================================
// 20. CREATE PROJECT BUTTON
// ====================================================

createProjectBtn?.addEventListener(
    'click',
    async function () {

        await openCreateModal();

    }
);


// ====================================================
// 21. CONFIRM CREATE
// ====================================================

confirmCreateBtn?.addEventListener(
    'click',
    async function () {

        if (
            confirmCreateBtn.disabled
        ) {

            return;

        }


        const selected =
            window.TemplateCraftCreatePage
                ?.getSelectedTemplate?.();


        const siteName =
            String(
                siteNameInput?.value || ''
            ).trim();


        if (
            !selected ||
            !siteName
        ) {

            return;

        }


        const state =
            await refreshNetlifyState();


        if (
            !netlifyReady(state)
        ) {

            alert(
                getNetlifyReadinessMessage(
                    state
                )
            );

            return;

        }


        confirmCreateBtn.disabled =
            true;

        confirmCreateBtn.textContent =
            '⏳ جاري إنشاء المشروع...';


        /*
        ------------------------------------------------
        هنا نخلي ملفات deployment الحالية
        هي اللي تتكلف بعملية الإنشاء.
        ------------------------------------------------
        */

        window.dispatchEvent(
            new CustomEvent(
                'templatecraft:create-project',
                {
                    detail: {

                        siteName,

                        template:
                            selected,

                        templateId:
                            selected.id,

                        projectType:
                            selected.projectType ||
                            selected.category,

                        netlify:
                            state

                    }

                }
            )
        );


        /*
        إذا كان create-project-deployment.js
        عندو API معروف، يستقبل الحدث أعلاه.
        */

    }
);


// ====================================================
// 22. SAFE HTML
// ====================================================

function escapeHtmlSafe(
    value
) {

    return String(
        value ?? ''
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );

}


// ====================================================
// 23. USER INFO
// ====================================================

function initializeUserInfo() {

    /*
    HTML الحالي ما فيهومش userInfo/userEmail،
    لذلك ما نديروش أي error.
    */

}


// ====================================================
// 24. INITIALIZE
// ====================================================

async function initializeCreateProjectPage() {

    console.log(
        '[TemplateCraft] Create Project initialized'
    );


    if (
        !apiAvailable()
    ) {

        console.warn(
            '[TemplateCraft] TemplateCraftAPI not available'
        );

    }


    initializeUserInfo();


    /*
    -----------------------------------------------
    Netlify
    -----------------------------------------------
    */

    await refreshNetlifyState();


    /*
    -----------------------------------------------
    Deployment system
    -----------------------------------------------
    */

    if (
        typeof window.initializeDeploymentSystem ===
            'function'
    ) {

        try {

            window.initializeDeploymentSystem();

        } catch (error) {

            console.error(
                '[TemplateCraft] Deployment initialization:',
                error
            );

        }

    }

}


// ====================================================
// 25. DOM READY
// ====================================================

window.addEventListener(
    'DOMContentLoaded',
    function () {

        initializeCreateProjectPage();

    }
);
