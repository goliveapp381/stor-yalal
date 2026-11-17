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
 - Create Modal Core
 - Status
 - Initialization

 الملفات المساعدة:
 - create-project-templates.js
 - create-project-netlify-ui.js
 - create-project-deployment.js

====================================================
*/


// ================================================
// 1. AUTHENTICATION
// ================================================

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
        'Authentication required: JWT token missing'
    );

}


// ================================================
// 2. CORE STATE
// ================================================

let publishedSiteUrl = null;

let createdSiteId = null;


// ================================================
// 3. CORE ELEMENTS
// ================================================

const templatesGrid =
    document.getElementById(
        'templatesGrid'
    );

const projectTypeSelect =
    document.getElementById(
        'projectTypeSelect'
    );

const siteNameInput =
    document.getElementById(
        'siteNameInput'
    );

const selectedLabel =
    document.getElementById(
        'selectedLabel'
    );

const deployBtn =
    document.getElementById(
        'deployBtn'
    );

const statusMessage =
    document.getElementById(
        'statusMessage'
    );

const resultContainer =
    document.getElementById(
        'resultContainer'
    );

const resultTitle =
    document.getElementById(
        'resultTitle'
    );

const resultDescription =
    document.getElementById(
        'resultDescription'
    );

const resultUrl =
    document.getElementById(
        'resultUrl'
    );

const resultLink =
    document.getElementById(
        'resultLink'
    );

const resultPending =
    document.getElementById(
        'resultPending'
    );

const copyLinkBtn =
    document.getElementById(
        'copyLinkBtn'
    );


// ================================================
// PREVIEW ELEMENTS
// ================================================

const previewModal =
    document.getElementById(
        'previewModal'
    );

const previewFrame =
    document.getElementById(
        'previewFrame'
    );

const previewLoading =
    document.getElementById(
        'previewLoading'
    );

const previewError =
    document.getElementById(
        'previewError'
    );


// ================================================
// CREATE MODAL
// ================================================

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

const confirmSiteName =
    document.getElementById(
        'confirmSiteName'
    );

const confirmDomain =
    document.getElementById(
        'confirmDomain'
    );

const confirmNetlifyTeamBox =
    document.getElementById(
        'confirmNetlifyTeamBox'
    );

const confirmNetlifyTeamName =
    document.getElementById(
        'confirmNetlifyTeamName'
    );

const confirmNetlifyWarning =
    document.getElementById(
        'confirmNetlifyWarning'
    );


// ================================================
// USER INFO
// ================================================

const userInfo =
    document.getElementById(
        'userInfo'
    );

const userEmail =
    document.getElementById(
        'userEmail'
    );


// ================================================
// 4. API CHECK
// ================================================

function apiAvailable() {

    return (

        typeof window.TemplateCraftAPI !==
            'undefined'

        &&

        typeof window.TemplateCraftAPI
            .getTemplatePreviewUrl ===
            'function'

        &&

        typeof window.TemplateCraftAPI.deploy ===
            'function'

    );

}


// ================================================
// 5. NETLIFY STATE
// ================================================

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


// ================================================
// 6. NETLIFY READY
// ================================================

function netlifyReady(state) {

    return (

        state &&

        state.connected === true &&

        state.teamSelected === true &&

        Boolean(
            state.teamSlug
        )

    );

}


// ================================================
// 7. NETLIFY READINESS MESSAGE
// ================================================

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
                'الـ Team السابق لم يعد موجوداً. اختر Team جديد من القائمة ثم حاول إنشاء الموقع.'
            );

        }


        return (
            'الـ Team السابق لم يعد موجوداً ولا يوجد حالياً أي Team متاح. أنشئ Team جديد في Netlify ثم حدّث الصفحة.'
        );

    }


    if (
        Array.isArray(
            state.availableTeams
        ) &&

        state.availableTeams.length > 1 &&

        !state.teamSelected
    ) {

        return (
            'عندك أكثر من Team في Netlify. اختار Team الذي تريد استعماله قبل إنشاء الموقع.'
        );

    }


    if (
        Array.isArray(
            state.availableTeams
        ) &&

        state.availableTeams.length === 0
    ) {

        return (
            'ما كاين حتى Team في حساب Netlify. أنشئ Team في Netlify ثم حدّث الصفحة.'
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
        'تعذر تأكيد Netlify Team. حاول تحديث الحالة ثم أعد المحاولة.'
    );

}


// ================================================
// 8. REFRESH NETLIFY
// ================================================

async function refreshNetlifyState() {

    if (
        window.TemplateCraftNetlify &&

        typeof window.TemplateCraftNetlify
            .refreshStatus ===
            'function'
    ) {

        try {

            await window.TemplateCraftNetlify
                .refreshStatus();

        } catch (error) {

            console.error(
                'Netlify status refresh error:',
                error
            );

        }

    }


    return getNetlifyState();

}


// ================================================
// 9. TEMPLATE PREVIEW URL
// ================================================

function getPreviewUrl(
    templateId
) {

    if (!apiAvailable()) {

        return null;

    }


    return TemplateCraftAPI
        .getTemplatePreviewUrl(
            templateId
        );

}


// ================================================
// 10. USER INFORMATION
// ================================================

function initializeUserInfo() {

    if (userInfo) {

        userInfo.classList.remove(
            'hidden'
        );

    }


    if (userEmail) {

        userEmail.textContent =
            user.email ||
            user.username ||
            '';

    }

}


// ================================================
// 11. SITE DATA
// ================================================

function getSiteData(
    result
) {

    const site =
        result?.site ||
        result?.project ||
        {};


    return {

        siteId:
            site._id ||
            site.id ||
            result?.siteId ||
            result?.projectId ||
            null,

        customUrl:
            result?.customUrl ||
            result?.publicUrl ||
            site.customUrl ||
            site.publicUrl ||
            null,

        customDomain:
            result?.customDomain ||
            site.customDomain ||
            null,

        domainStatus:
            result?.domainStatus ||
            site.domainStatus ||
            'pending',

        liveUrl:
            result?.liveUrl ||
            result?.deployUrl ||
            site.liveUrl ||
            null

    };

}


// ================================================
// 12. SAFE CUSTOM URL
// ================================================

function getSafeCustomUrl(
    url,
    domainStatus
) {

    if (
        domainStatus !== 'active' ||
        !url ||
        typeof url !== 'string'
    ) {

        return null;

    }


    try {

        const parsed =
            new URL(url);


        if (
            parsed.protocol !== 'https:'
        ) {

            return null;

        }


        const hostname =
            parsed.hostname.toLowerCase();


        if (
            !hostname.endsWith(
                '.gollivetv.com'
            ) ||

            hostname ===
                'gollivetv.com'
        ) {

            return null;

        }


        return parsed.href;

    } catch (error) {

        return null;

    }

}


// ================================================
// 13. SHOW DEPLOY RESULT
// ================================================

function showDeployResult(
    siteData
) {

    const verifiedUrl =
        getSafeCustomUrl(
            siteData.customUrl,
            siteData.domainStatus
        );


    publishedSiteUrl =
        verifiedUrl;


    if (resultContainer) {

        resultContainer.classList.remove(
            'hidden'
        );

    }


    if (resultUrl) {

        resultUrl.textContent =
            '';

        resultUrl.removeAttribute(
            'href'
        );

    }


    if (resultLink) {

        resultLink.classList.add(
            'hidden'
        );

    }


    if (resultPending) {

        resultPending.classList.add(
            'hidden'
        );

    }


    if (copyLinkBtn) {

        copyLinkBtn.disabled =
            true;

    }


    if (verifiedUrl) {

        if (resultTitle) {

            resultTitle.textContent =
                '✅ تم نشر موقعك والدومين جاهز!';

        }


        if (resultDescription) {

            resultDescription.textContent =
                'موقعك متاح الآن عبر الدومين الخاص بك.';

        }


        if (resultUrl) {

            resultUrl.textContent =
                verifiedUrl;

            resultUrl.href =
                verifiedUrl;

        }


        if (resultLink) {

            resultLink.href =
                verifiedUrl;

            resultLink.classList.remove(
                'hidden'
            );

        }


        if (copyLinkBtn) {

            copyLinkBtn.disabled =
                false;

        }


        showStatus(
            'تم نشر الموقع وتأكيد الدومين وشهادة SSL بنجاح! 🎉',
            'success'
        );

    } else {

        if (resultTitle) {

            resultTitle.textContent =
                '✅ تم إنشاء مشروعك بنجاح!';

        }


        if (resultDescription) {

            resultDescription.textContent =
                'تم إنشاء المشروع. الدومين الخاص مازال قيد التجهيز.';

        }


        if (resultPending) {

            resultPending.classList.remove(
                'hidden'
            );

        }


        showStatus(
            'تم إنشاء المشروع. الدومين الخاص وSSL مازال قيد التجهيز. يمكنك متابعة الحالة من صفحة مشاريعي.',
            'success'
        );

    }


    if (
        resultContainer
    ) {

        resultContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

    }

}


// ================================================
// 14. CREATE MODAL
// ================================================

async function openCreateModal() {

    const siteName =
        siteNameInput.value.trim();


    confirmSiteName.textContent =
        siteName || '—';


    /*
    ==================================================
    IMPORTANT:

    هذا التغيير خاص فقط بالدومين الذي يظهر
    داخل نافذة تأكيد إنشاء المشروع.

    لا يغير:
    - Backend
    - Netlify
    - Cloudflare
    - getSafeCustomUrl()
    - domain validation
    - أي استعمال آخر لـ gollivetv.com
    ==================================================
    */

    confirmDomain.textContent =
        siteName
            ? `${siteName}.templatecraftpro.com`
            : '—';


    confirmNetlifyTeamBox.classList.add(
        'hidden'
    );


    confirmNetlifyWarning.classList.add(
        'hidden'
    );


    confirmCreateBtn.disabled =
        true;


    confirmCreateBtn.textContent =
        '⏳ جاري التحقق من Netlify...';


    createModal.classList.add(
        'active'
    );


    const netlifyState =
        await refreshNetlifyState();


    if (
        netlifyReady(
            netlifyState
        )
    ) {

        if (
            typeof window.updateNetlifyConfirmationUI ===
                'function'
        ) {

            window.updateNetlifyConfirmationUI(
                netlifyState
            );

        } else {

            confirmNetlifyTeamName.textContent =
                netlifyState.teamName ||
                netlifyState.teamSlug ||
                'Netlify Team';

            confirmNetlifyTeamBox.classList.remove(
                'hidden'
            );

        }


        confirmNetlifyWarning.classList.add(
            'hidden'
        );


        confirmCreateBtn.disabled =
            false;


        confirmCreateBtn.textContent =
            '🚀 متابعة وإنشاء الموقع';

    } else {

        confirmNetlifyTeamBox.classList.add(
            'hidden'
        );


        confirmNetlifyWarning.classList.remove(
            'hidden'
        );


        confirmNetlifyWarning.textContent =
            getNetlifyReadinessMessage(
                netlifyState
            );


        confirmCreateBtn.disabled =
            true;


        confirmCreateBtn.textContent =
            'خاصك تختار Netlify Team أولاً';

    }

}


// ================================================
// 15. CLOSE CREATE MODAL
// ================================================

function closeCreateModal() {

    createModal.classList.remove(
        'active'
    );

}


// ================================================
// 16. CREATE MODAL EVENTS
// ================================================

function initializeCreateModalEvents() {

    if (cancelCreateBtn) {

        cancelCreateBtn.addEventListener(
            'click',
            closeCreateModal
        );

    }


    if (createModal) {

        createModal.addEventListener(
            'click',
            function(event) {

                if (
                    event.target ===
                    createModal
                ) {

                    closeCreateModal();

                }

            }
        );

    }

}


// ================================================
// 17. STATUS MESSAGE
// ================================================

function showStatus(
    message,
    type
) {

    if (!statusMessage) {

        return;

    }


    statusMessage.textContent =
        message;


    statusMessage.className =
        'mt-5 text-center text-sm font-bold';


    if (
        type === 'success'
    ) {

        statusMessage.classList.add(
            'text-green-600'
        );

    } else if (
        type === 'error'
    ) {

        statusMessage.classList.add(
            'text-red-600'
        );

    } else {

        statusMessage.classList.add(
            'text-blue-600'
        );

    }

}


// ================================================
// 18. INITIALIZE
// ================================================

async function initializeCreateProjectPage() {

    if (!apiAvailable()) {

        showStatus(
            'تعذر تحميل API. تأكد من ملف client-api.js.',
            'error'
        );

    }


    initializeUserInfo();

    initializeCreateModalEvents();


    if (
        typeof window.initializeTemplateSystem ===
            'function'
    ) {

        window.initializeTemplateSystem();

    }


    await refreshNetlifyState();


    if (
        typeof window.initializeDeploymentSystem ===
            'function'
    ) {

        window.initializeDeploymentSystem();

    }

}


window.addEventListener(
    'DOMContentLoaded',
    function() {

        initializeCreateProjectPage();

    }
);
