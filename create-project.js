'use strict';

/*
=========================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT
 PREMIUM CREATE CONFIRMATION MODAL
 --------------------------------------------------------
 مسؤول عن:
 - Authentication
 - Project information
 - Template selection
 - Premium confirmation modal
 - Netlify readiness
 - Dispatch create-project event
=========================================================
*/


// =====================================================
// 1. AUTHENTICATION
// =====================================================

function getCurrentUser() {
    try {
        return JSON.parse(
            localStorage.getItem('templatecraft_user') ||
            localStorage.getItem('user') ||
            'null'
        );
    } catch (error) {
        console.warn(
            '[TemplateCraft] Unable to parse current user:',
            error
        );

        return null;
    }
}


// =====================================================
// 2. STATE
// =====================================================

let createPageState = {
    siteName: '',
    selectedTemplate: null,
    netlifyReady: false,
    netlifyState: null
};


// =====================================================
// 3. ELEMENTS
// =====================================================

const siteNameInput =
    document.getElementById('siteName');

const createProjectBtn =
    document.getElementById('createProjectBtn');

const createModal =
    document.getElementById('createModal');

const createModalContent =
    document.getElementById('createModalContent');

const closeCreateModalBtn =
    document.getElementById('closeCreateModalBtn');

const cancelCreateBtn =
    document.getElementById('cancelCreateBtn');

const confirmCreateBtn =
    document.getElementById('confirmCreateBtn');

const createResult =
    document.getElementById('createResult');


// =====================================================
// 4. AUTH CHECK
// =====================================================

function ensureAuthenticated() {

    const user = getCurrentUser();

    if (user) {
        return true;
    }

    console.warn(
        '[TemplateCraft] No authenticated user found.'
    );

    if (createResult) {

        createResult.className =
            'state-message error';

        createResult.textContent =
            'خاصك تسجل الدخول أولاً قبل إنشاء المشروع.';
    }

    return false;
}


// =====================================================
// 5. SAFE HTML
// =====================================================

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// =====================================================
// 6. CREATE DOMAIN SLUG
// =====================================================

function createProjectSlug(siteName) {

    let slug = String(siteName || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);

    if (!slug) {
        slug = 'my-site';
    }

    return slug;
}


// =====================================================
// 7. CREATE DOMAIN
// =====================================================

function createProjectDomain(siteName) {

    const slug =
        createProjectSlug(siteName);

    return `${slug}.templatecraftpro.com`;
}


// =====================================================
// 8. TEMPLATE NAME
// =====================================================

function getTemplateDisplayName(template) {

    if (!template) {
        return 'غير محدد';
    }

    return (
        template.name ||
        template.title ||
        template.templateName ||
        template.id ||
        'قالب'
    );
}


// =====================================================
// 9. TEMPLATE CATEGORY
// =====================================================

function getTemplateCategory(template) {

    if (!template) {
        return 'غير محددة';
    }

    return (
        template.projectType ||
        template.category ||
        'عام'
    );
}


// =====================================================
// 10. NETLIFY STATE
// =====================================================

function getNetlifyState() {

    if (
        window.TemplateCraftNetlify &&
        typeof window.TemplateCraftNetlify.getState === 'function'
    ) {

        try {

            return window.TemplateCraftNetlify.getState();

        } catch (error) {

            console.warn(
                '[TemplateCraft] Unable to read Netlify state:',
                error
            );
        }
    }


    if (
        window.netlifyState &&
        typeof window.netlifyState === 'object'
    ) {

        return window.netlifyState;
    }


    return null;
}


// =====================================================
// 11. CHECK NETLIFY READY
// =====================================================

function isNetlifyReady(state) {

    if (!state) {
        return false;
    }

    if (state.ready === true) {
        return true;
    }

    if (state.connected === true) {
        return true;
    }

    if (state.isConnected === true) {
        return true;
    }

    if (
        state.teamId ||
        state.siteId ||
        state.accountId ||
        state.team
    ) {

        return true;
    }

    return false;
}


// =====================================================
// 12. REFRESH NETLIFY
// =====================================================

async function refreshNetlifyState() {

    const state =
        getNetlifyState();

    createPageState.netlifyState =
        state;

    createPageState.netlifyReady =
        isNetlifyReady(state);

    return state;
}


// =====================================================
// 13. PREMIUM FEATURE CARD
// =====================================================

function premiumFeature(
    icon,
    title,
    description,
    className = ''
) {

    return `
        <div class="create-premium-feature ${escapeHtml(className)}">

            <div class="create-premium-feature-icon">
                ${icon}
            </div>

            <div class="create-premium-feature-content">

                <strong>
                    ${escapeHtml(title)}
                </strong>

                <span>
                    ${escapeHtml(description)}
                </span>

            </div>

        </div>
    `;
}


// =====================================================
// 14. OPEN PREMIUM CREATE MODAL
// =====================================================

async function openCreateModal() {

    if (!ensureAuthenticated()) {
        return;
    }


    const selected =
        window.TemplateCraftCreatePage &&
        typeof window.TemplateCraftCreatePage.getSelectedTemplate === 'function'
            ? window.TemplateCraftCreatePage.getSelectedTemplate()
            : null;


    const siteName =
        siteNameInput
            ? siteNameInput.value.trim()
            : '';


    if (!siteName) {

        if (createResult) {

            createResult.className =
                'state-message error';

            createResult.textContent =
                'دخل اسم المشروع أولاً.';
        }

        if (siteNameInput) {
            siteNameInput.focus();
        }

        return;
    }


    if (!selected) {

        if (createResult) {

            createResult.className =
                'state-message error';

            createResult.textContent =
                'اختار قالب أولاً قبل إنشاء المشروع.';
        }

        return;
    }


    createPageState.siteName =
        siteName;

    createPageState.selectedTemplate =
        selected;


    await refreshNetlifyState();


    const templateName =
        getTemplateDisplayName(selected);

    const category =
        getTemplateCategory(selected);

    const domain =
        createProjectDomain(siteName);

    const netlifyReady =
        createPageState.netlifyReady;


    // =================================================
    // MODAL CONTENT
    // =================================================

    if (createModalContent) {

        createModalContent.innerHTML = `

            <div class="create-premium-wrapper">


                <!-- HEADER -->

                <div class="create-premium-header">

                    <div class="create-premium-header-icon">
                        🚀
                    </div>

                    <div class="create-premium-header-content">

                        <div class="create-premium-eyebrow">
                            TEMPLATECRAFT PRO
                        </div>

                        <h4>
                            موقعك الاحترافي جاهز للانطلاق
                        </h4>

                        <p>
                            غادي ننشئو ليك موقع احترافي باستعمال
                            القالب اللي اخترتي،
                            ونجهزوه للنشر على Netlify.
                        </p>

                    </div>

                </div>


                <!-- PROJECT SUMMARY -->

                <div class="create-premium-summary">

                    <div class="create-premium-summary-title">
                        📋 معلومات المشروع
                    </div>

                    <div class="create-premium-summary-grid">

                        <div class="create-premium-summary-item">

                            <span>
                                اسم المشروع
                            </span>

                            <strong>
                                ${escapeHtml(siteName)}
                            </strong>

                        </div>


                        <div class="create-premium-summary-item">

                            <span>
                                القالب
                            </span>

                            <strong>
                                ${escapeHtml(templateName)}
                            </strong>

                        </div>


                        <div class="create-premium-summary-item">

                            <span>
                                الفئة
                            </span>

                            <strong>
                                ${escapeHtml(category)}
                            </strong>

                        </div>

                    </div>

                </div>


                <!-- DOMAIN -->

                <div class="create-premium-domain">

                    <div class="create-premium-domain-left">

                        <div class="create-premium-domain-icon">
                            🌐
                        </div>

                        <div>

                            <span>
                                عنوان الموقع
                            </span>

                            <strong>
                                ${escapeHtml(domain)}
                            </strong>

                            <small>
                                عنوان مجاني مقترح لموقعك
                            </small>

                        </div>

                    </div>

                    <div class="create-premium-domain-badge">
                        FREE
                    </div>

                </div>


                <!-- FEATURES TITLE -->

                <div class="create-premium-section-title">

                    <div>
                        ✨
                    </div>

                    <div>

                        <strong>
                            موقع TemplateCraft Pro يمنحك
                        </strong>

                        <span>
                            مجموعة من المميزات الجاهزة مع المشروع
                        </span>

                    </div>

                </div>


                <!-- FEATURES -->

                <div class="create-premium-features">

                    ${premiumFeature(
                        '🌐',
                        'دومين مجاني',
                        'عنوان مجاني مقترح لموقعك لسهولة الوصول إليه.'
                    )}

                    ${premiumFeature(
                        '🎨',
                        'قالب Premium ديناميكي',
                        'تصميم احترافي قابل للتخصيص ومجهز للمحتوى.'
                    )}

                    ${premiumFeature(
                        '🔐',
                        'شهادة SSL',
                        'سيتم تجهيز والتحقق من SSL بعد نشر الموقع.'
                    )}

                    ${premiumFeature(
                        '🛡️',
                        'حماية الموقع',
                        'إعدادات أساسية للمساعدة في حماية الموقع.'
                    )}

                    ${premiumFeature(
                        '⚡',
                        'أداء سريع',
                        'الموقع مجهز ليعمل بسرعة واستجابة جيدة.'
                    )}

                    ${premiumFeature(
                        '📱',
                        'Responsive',
                        'كيخدم بشكل مناسب على الهاتف والتابلت والكمبيوتر.'
                    )}

                    ${premiumFeature(
                        '🚀',
                        'نشر تلقائي',
                        'إنشاء ونشر المشروع مباشرة عبر Netlify.'
                    )}

                    ${premiumFeature(
                        '🔄',
                        'دومين خاص لاحقاً',
                        'يمكنك ربط دومين خاص بالمشروع مستقبلاً.'
                    )}

                </div>


                <!-- NETLIFY -->

                <div class="create-premium-netlify ${netlifyReady ? 'ready' : 'not-ready'}">

                    <div class="create-premium-netlify-icon">
                        ${netlifyReady ? '✓' : '⚠️'}
                    </div>

                    <div class="create-premium-netlify-content">

                        <strong>
                            ${netlifyReady
                                ? 'Netlify جاهز للنشر'
                                : 'Netlify غير جاهز بعد'}
                        </strong>

                        <span>
                            ${netlifyReady
                                ? 'يمكن الآن بدء عملية إنشاء ونشر الموقع.'
                                : 'خاصك تربط Netlify قبل ما نبدأو النشر.'}
                        </span>

                    </div>

                    <div class="create-premium-netlify-status">
                        ${netlifyReady ? 'READY' : 'WAITING'}
                    </div>

                </div>


                <!-- SSL -->

                <div class="create-premium-info">

                    <div class="create-premium-info-icon">
                        🔒
                    </div>

                    <div>

                        <strong>
                            ملاحظة مهمة حول SSL
                        </strong>

                        <span>
                            عملية إنشاء الموقع ما غاديش توقف بسبب SSL.
                            من بعد نجاح النشر، غادي يبقى SSL كيتحقق بشكل مستقل
                            ويمكن عرض حالته في صفحة المشاريع.
                        </span>

                    </div>

                </div>


                <!-- FINAL -->

                <div class="create-premium-final">

                    <span class="create-premium-final-icon">
                        💎
                    </span>

                    <div>

                        <strong>
                            كلشي واجد؟
                        </strong>

                        <span>
                            ضغط على "إنشاء الموقع"
                            باش نبدأو عملية إنشاء المشروع ونشره.
                        </span>

                    </div>

                </div>


            </div>
        `;
    }


    // =================================================
    // CONFIRM BUTTON
    // =================================================

    if (confirmCreateBtn) {

        confirmCreateBtn.disabled =
            !netlifyReady;

        confirmCreateBtn.innerHTML =
            netlifyReady
                ? '🚀 إنشاء الموقع'
                : '🔗 ربط Netlify أولاً';
    }


    // =================================================
    // OPEN MODAL
    // =================================================

    if (createModal) {

        createModal.classList.add('active');

        // مهم:
        // ما بقيناش كنستعملو createModal.style.display
        // CSS هو المسؤول على إظهار وإخفاء الـ modal.
    }
}


// =====================================================
// 15. CLOSE MODAL
// =====================================================

function closeCreateModal() {

    if (!createModal) {
        return;
    }

    createModal.classList.remove('active');

    // لا inline style هنا.
}


// =====================================================
// 16. CONFIRM CREATE
// =====================================================

async function handleConfirmCreate() {

    if (!ensureAuthenticated()) {
        return;
    }


    const selected =
        createPageState.selectedTemplate ||
        (
            window.TemplateCraftCreatePage &&
            typeof window.TemplateCraftCreatePage.getSelectedTemplate === 'function'
                ? window.TemplateCraftCreatePage.getSelectedTemplate()
                : null
        );


    const siteName =
        createPageState.siteName ||
        (
            siteNameInput
                ? siteNameInput.value.trim()
                : ''
        );


    if (!siteName) {

        alert(
            'دخل اسم المشروع أولاً.'
        );

        return;
    }


    if (!selected) {

        alert(
            'اختار قالب أولاً.'
        );

        return;
    }


    const state =
        await refreshNetlifyState();

    const netlifyReady =
        createPageState.netlifyReady;


    if (!netlifyReady) {

        if (confirmCreateBtn) {

            confirmCreateBtn.disabled =
                false;

            confirmCreateBtn.innerHTML =
                '🔗 ربط Netlify أولاً';
        }

        return;
    }


    if (confirmCreateBtn) {

        confirmCreateBtn.disabled =
            true;

        confirmCreateBtn.innerHTML =
            '⏳ جاري بدء الإنشاء...';
    }


    closeCreateModal();


    window.dispatchEvent(
        new CustomEvent(
            'templatecraft:create-project',
            {
                detail: {
                    siteName,
                    template: selected,
                    templateId: selected.id,
                    projectType:
                        selected.projectType ||
                        selected.category,
                    netlify: state
                }
            }
        )
    );
}


// =====================================================
// 17. EVENT LISTENERS
// =====================================================

if (createProjectBtn) {

    createProjectBtn.addEventListener(
        'click',
        function () {
            openCreateModal();
        }
    );
}


if (closeCreateModalBtn) {

    closeCreateModalBtn.addEventListener(
        'click',
        function () {
            closeCreateModal();
        }
    );
}


if (cancelCreateBtn) {

    cancelCreateBtn.addEventListener(
        'click',
        function () {
            closeCreateModal();
        }
    );
}


if (confirmCreateBtn) {

    confirmCreateBtn.addEventListener(
        'click',
        function () {
            handleConfirmCreate();
        }
    );
}


if (createModal) {

    createModal.addEventListener(
        'click',
        function (event) {

            if (event.target === createModal) {
                closeCreateModal();
            }

        }
    );
}


document.addEventListener(
    'keydown',
    function (event) {

        if (
            event.key === 'Escape' &&
            createModal &&
            createModal.classList.contains('active')
        ) {

            closeCreateModal();
        }

    }
);


// =====================================================
// 18. INITIALIZATION & GLOBAL API
// =====================================================

function initializeCreateProjectPage() {

    if (!ensureAuthenticated()) {
        return;
    }

    refreshNetlifyState();
}


window.TemplateCraftCreateProject = {

    openModal:
        openCreateModal,

    closeModal:
        closeCreateModal,

    confirm:
        handleConfirmCreate,

    getState: function () {

        return {
            ...createPageState
        };

    }

};


if (
    document.readyState === 'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initializeCreateProjectPage,
        {
            once: true
        }
    );

} else {

    initializeCreateProjectPage();

}
