/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - MAIN JAVASCRIPT
====================================================

 مسؤول عن:
 - Authentication
 - Templates
 - Preview
 - Create Confirmation
 - Deployment
 - Result
 - Netlify readiness check

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

const userId = user && (user.id || user._id);
const authToken = localStorage.getItem('token');

if (!user || !userId || !authToken) {

    localStorage.removeItem('user');
    localStorage.removeItem('token');

    alert(
        'انتهت جلسة تسجيل الدخول أو لم يتم تسجيل الدخول. المرجو تسجيل الدخول مجدداً.'
    );

    window.location.replace('login.html');

    throw new Error(
        'Authentication required: JWT token missing'
    );
}


// ================================================
// 2. TEMPLATE CONFIGURATION
// ================================================

const templateList = [

    {
        id: 'template-1',
        name: 'القالب الأول',
        description: 'تصميم احترافي'
    },

    {
        id: 'template-2',
        name: 'القالب الثاني',
        description: 'تصميم عصري'
    },

    {
        id: 'template-3',
        name: 'القالب الثالث',
        description: 'تصميم أنيق'
    },

    {
        id: 'template-4',
        name: 'القالب الرابع',
        description: 'تصميم متطور'
    },

    {
        id: 'template-5',
        name: 'القالب الخامس',
        description: 'تصميم مميز'
    },

    {
        id: 'template-6',
        name: 'القالب السادس',
        description: 'تصميم إبداعي'
    }

];


let selectedTemplateId = 'template-1';
let previewTemplateId = null;

let publishedSiteUrl = null;
let createdSiteId = null;

let deployStageTimer = null;
let deployStageIndex = 1;


// ================================================
// 3. ELEMENTS
// ================================================

const templatesGrid =
    document.getElementById('templatesGrid');

const projectTypeSelect =
    document.getElementById('projectTypeSelect');

const siteNameInput =
    document.getElementById('siteNameInput');

const selectedLabel =
    document.getElementById('selectedLabel');

const deployBtn =
    document.getElementById('deployBtn');

const statusMessage =
    document.getElementById('statusMessage');

const resultContainer =
    document.getElementById('resultContainer');

const resultTitle =
    document.getElementById('resultTitle');

const resultDescription =
    document.getElementById('resultDescription');

const resultUrl =
    document.getElementById('resultUrl');

const resultLink =
    document.getElementById('resultLink');

const resultPending =
    document.getElementById('resultPending');

const copyLinkBtn =
    document.getElementById('copyLinkBtn');

const previewModal =
    document.getElementById('previewModal');

const previewFrame =
    document.getElementById('previewFrame');

const previewLoading =
    document.getElementById('previewLoading');

const previewError =
    document.getElementById('previewError');


// CREATE MODAL

const createModal =
    document.getElementById('createModal');

const confirmCreateBtn =
    document.getElementById('confirmCreateBtn');

const cancelCreateBtn =
    document.getElementById('cancelCreateBtn');

const confirmSiteName =
    document.getElementById('confirmSiteName');

const confirmDomain =
    document.getElementById('confirmDomain');

const confirmNetlifyTeamBox =
    document.getElementById('confirmNetlifyTeamBox');

const confirmNetlifyTeamName =
    document.getElementById('confirmNetlifyTeamName');

const confirmNetlifyWarning =
    document.getElementById('confirmNetlifyWarning');


// DEPLOY OVERLAY

const deployOverlay =
    document.getElementById('deployOverlay');

const deployOverlaySiteName =
    document.getElementById('deployOverlaySiteName');

const deployStageText =
    document.getElementById('deployStageText');


// USER INFO

const userInfo =
    document.getElementById('userInfo');

const userEmail =
    document.getElementById('userEmail');


// ================================================
// 4. API CHECK
// ================================================

function apiAvailable() {

    return (
        typeof window.TemplateCraftAPI !== 'undefined' &&
        typeof window.TemplateCraftAPI.getTemplatePreviewUrl === 'function' &&
        typeof window.TemplateCraftAPI.deploy === 'function'
    );

}


// ================================================
// 5. NETLIFY INTEGRATION CHECK
// ================================================

function getNetlifyState() {

    if (
        !window.TemplateCraftNetlify ||
        typeof window.TemplateCraftNetlify.getState !== 'function'
    ) {
        return {
            connected: false,
            teamSelected: false,
            teamName: null
        };
    }

    return window.TemplateCraftNetlify.getState();

}


async function refreshNetlifyState() {

    if (
        window.TemplateCraftNetlify &&
        typeof window.TemplateCraftNetlify.refreshStatus === 'function'
    ) {
        try {
            await window.TemplateCraftNetlify.refreshStatus();
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
// 6. TEMPLATE PREVIEW URL
// ================================================

function getPreviewUrl(templateId) {

    if (!apiAvailable()) {
        return null;
    }

    /*
     * client-api.js يستقبل templateId فقط.
     * لا نرسل projectType كوسيط ثاني.
     */

    return TemplateCraftAPI.getTemplatePreviewUrl(
        templateId
    );

}


// ================================================
// 7. RENDER TEMPLATE CARDS
// ================================================

function renderTemplates() {

    templatesGrid.innerHTML = '';

    templateList.forEach((template, index) => {

        const card = document.createElement('div');

        card.className =
            'template-card border-2 border-gray-200 rounded-2xl bg-white' +
            (
                template.id === selectedTemplateId
                    ? ' selected'
                    : ''
            );

        card.dataset.template = template.id;

        const previewUrl =
            getPreviewUrl(template.id);


        card.innerHTML = `

            <div class="selectedGlowLine"></div>

            <div class="relative bg-gray-100 overflow-hidden">

                <iframe
                    class="preview-frame"
                    src="${previewUrl || 'about:blank'}"
                    title="${template.name}"
                    loading="lazy"
                    tabindex="-1">
                </iframe>

                <div
                    class="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/10 to-transparent">
                </div>

                <span
                    class="absolute top-3 right-3 bg-white text-purple-700 font-extrabold rounded-lg px-3 py-1 text-sm shadow">
                    ${index + 1}
                </span>

                ${
                    template.id === selectedTemplateId
                        ? `
                            <span
                                class="absolute bottom-3 left-3 bg-slate-900/85 text-white text-xs font-bold rounded-lg px-3 py-2 backdrop-blur">
                                ✓ القالب المختار
                            </span>
                        `
                        : ''
                }

            </div>

            <div class="p-4">

                <div class="flex justify-between items-center gap-2">

                    <h3 class="font-extrabold text-gray-900">
                        ${template.name}
                    </h3>

                    <span class="selectedMark text-xs font-bold text-purple-700">
                        ${
                            template.id === selectedTemplateId
                                ? '✓ محدد'
                                : ''
                        }
                    </span>

                </div>

                <p class="text-xs text-gray-500 mt-1">
                    ${template.description}
                </p>

                <div class="grid grid-cols-2 gap-2 mt-4">

                    <button
                        type="button"
                        class="previewButton bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-bold">
                        👁️ معاينة
                    </button>

                    <button
                        type="button"
                        class="selectButton bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-sm font-bold">
                        اختيار
                    </button>

                </div>

            </div>

        `;


        card.addEventListener('click', function(event) {

            if (
                event.target.closest('.previewButton') ||
                event.target.closest('.selectButton')
            ) {
                return;
            }

            selectTemplate(template.id);

        });


        card.querySelector('.previewButton')
            .addEventListener('click', function(event) {

                event.stopPropagation();

                openPreview(template.id);

            });


        card.querySelector('.selectButton')
            .addEventListener('click', function(event) {

                event.stopPropagation();

                selectTemplate(template.id);

            });


        templatesGrid.appendChild(card);

    });

    updateSelectedLabel();

}


// ================================================
// 8. SELECT TEMPLATE
// ================================================

function selectTemplate(templateId) {

    if (
        !templateList.some(item => item.id === templateId)
    ) {
        return;
    }

    selectedTemplateId = templateId;

    document
        .querySelectorAll('.template-card')
        .forEach(card => {

            const selected =
                card.dataset.template === templateId;

            card.classList.toggle(
                'selected',
                selected
            );

            const mark =
                card.querySelector('.selectedMark');

            if (mark) {
                mark.textContent =
                    selected ? '✓ محدد' : '';
            }

            const glowLine =
                card.querySelector('.selectedGlowLine');

            if (glowLine) {
                glowLine.style.display =
                    selected ? 'block' : 'none';
            }

        });

    updateSelectedLabel();

}


function updateSelectedLabel() {

    const number =
        selectedTemplateId.replace('template-', '');

    selectedLabel.textContent =
        `القالب ${number} محدد`;

}


// ================================================
// 9. OPEN PREVIEW
// ================================================

function openPreview(templateId) {

    previewTemplateId = templateId;

    const template =
        templateList.find(
            item => item.id === templateId
        );

    document.getElementById('previewTitle').textContent =
        template ? template.name : 'معاينة القالب';

    previewModal.classList.add('active');

    previewFrame.classList.add('hidden');

    previewError.classList.add('hidden');

    previewLoading.classList.remove('hidden');

    const url = getPreviewUrl(templateId);

    if (!url) {

        previewLoading.classList.add('hidden');

        previewError.classList.remove('hidden');

        return;

    }

    previewFrame.onload = function() {

        previewLoading.classList.add('hidden');

        previewError.classList.add('hidden');

        previewFrame.classList.remove('hidden');

    };

    previewFrame.onerror = function() {

        previewLoading.classList.add('hidden');

        previewError.classList.remove('hidden');

    };

    previewFrame.src = url;

}


// ================================================
// 10. CLOSE PREVIEW
// ================================================

function closePreview() {

    previewModal.classList.remove('active');

    previewFrame.src = 'about:blank';

    previewTemplateId = null;

}


document.getElementById('closePreviewBtn')
    .addEventListener('click', closePreview);


previewModal.addEventListener('click', function(event) {

    if (event.target === previewModal) {
        closePreview();
    }

});


document.addEventListener('keydown', function(event) {

    if (event.key === 'Escape') {

        closePreview();

        if (createModal.classList.contains('active')) {
            closeCreateModal();
        }

    }

});


// ================================================
// 11. CHOOSE FROM PREVIEW
// ================================================

document.getElementById('choosePreviewBtn')
    .addEventListener('click', function() {

        if (!previewTemplateId) {
            return;
        }

        selectTemplate(previewTemplateId);

        closePreview();

        showStatus(
            'تم اختيار القالب بنجاح.',
            'success'
        );

    });


// ================================================
// 12. CATEGORY CHANGE
// ================================================

projectTypeSelect.addEventListener('change', function() {

    resultContainer.classList.add('hidden');

    renderTemplates();

});


// ================================================
// 13. USER INFORMATION
// ================================================

userInfo.classList.remove('hidden');

userEmail.textContent =
    user.email ||
    user.username ||
    '';


// ================================================
// 14. GET SITE INFORMATION
// ================================================

function getSiteData(result) {

    const site =
        result?.site ||
        result?.project ||
        {};

    return {

        siteId:
            site._id ||
            site.id ||
            result.siteId ||
            result.projectId ||
            null,

        customUrl:
            result.customUrl ||
            result.publicUrl ||
            site.customUrl ||
            site.publicUrl ||
            null,

        customDomain:
            result.customDomain ||
            site.customDomain ||
            null,

        domainStatus:
            result.domainStatus ||
            site.domainStatus ||
            'pending',

        liveUrl:
            result.liveUrl ||
            result.deployUrl ||
            site.liveUrl ||
            null

    };

}


// ================================================
// 15. VALIDATE CUSTOM DOMAIN
// ================================================

function getSafeCustomUrl(url, domainStatus) {

    if (
        domainStatus !== 'active' ||
        !url ||
        typeof url !== 'string'
    ) {
        return null;
    }

    try {

        const parsed = new URL(url);

        if (parsed.protocol !== 'https:') {
            return null;
        }

        const hostname =
            parsed.hostname.toLowerCase();

        if (
            !hostname.endsWith('.gollivetv.com') ||
            hostname === 'gollivetv.com'
        ) {
            return null;
        }

        return parsed.href;

    } catch (error) {

        return null;

    }

}


// ================================================
// 16. SHOW DEPLOY RESULT
// ================================================

function showDeployResult(siteData) {

    const verifiedUrl =
        getSafeCustomUrl(
            siteData.customUrl,
            siteData.domainStatus
        );

    publishedSiteUrl = verifiedUrl;

    resultContainer.classList.remove('hidden');

    resultUrl.textContent = '';

    resultUrl.removeAttribute('href');

    resultLink.classList.add('hidden');

    resultPending.classList.add('hidden');

    copyLinkBtn.disabled = true;


    if (verifiedUrl) {

        resultTitle.textContent =
            '✅ تم نشر موقعك والدومين جاهز!';

        resultDescription.textContent =
            'موقعك متاح الآن عبر الدومين الخاص بك.';

        resultUrl.textContent = verifiedUrl;

        resultUrl.href = verifiedUrl;

        resultLink.href = verifiedUrl;

        resultLink.classList.remove('hidden');

        copyLinkBtn.disabled = false;

        showStatus(
            'تم نشر الموقع وتأكيد الدومين وشهادة SSL بنجاح! 🎉',
            'success'
        );

    } else {

        resultTitle.textContent =
            '✅ تم إنشاء مشروعك بنجاح!';

        resultDescription.textContent =
            'تم إنشاء المشروع. الدومين الخاص مازال قيد التجهيز.';

        resultPending.classList.remove('hidden');

        showStatus(
            'تم إنشاء المشروع. الدومين الخاص وSSL مازال قيد التجهيز. يمكنك متابعة الحالة من صفحة مشاريعي.',
            'success'
        );

    }

    resultContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

}


// ================================================
// 17. CREATE MODAL
// ================================================

async function openCreateModal() {

    const siteName =
        siteNameInput.value.trim();

    confirmSiteName.textContent =
        siteName || '—';

    confirmDomain.textContent =
        siteName
            ? `${siteName}.gollivetv.com`
            : '—';

    confirmNetlifyTeamBox.classList.add('hidden');

    confirmNetlifyWarning.classList.add('hidden');

    confirmCreateBtn.disabled = true;

    confirmCreateBtn.textContent =
        '⏳ جاري التحقق من Netlify...';

    createModal.classList.add('active');


    const netlifyState =
        await refreshNetlifyState();


    if (
        netlifyState.connected &&
        netlifyState.teamSelected &&
        netlifyState.teamName
    ) {

        confirmNetlifyTeamName.textContent =
            netlifyState.teamName;

        confirmNetlifyTeamBox.classList.remove('hidden');

        confirmNetlifyWarning.classList.add('hidden');

        confirmCreateBtn.disabled = false;

        confirmCreateBtn.textContent =
            '🚀 متابعة وإنشاء الموقع';

    } else {

        confirmNetlifyTeamBox.classList.add('hidden');

        confirmNetlifyWarning.classList.remove('hidden');

        confirmCreateBtn.disabled = true;

        confirmCreateBtn.textContent =
            'خاصك تربط Netlify أولاً';

    }

}


function closeCreateModal() {

    createModal.classList.remove('active');

}


cancelCreateBtn.addEventListener(
    'click',
    closeCreateModal
);


createModal.addEventListener('click', function(event) {

    if (event.target === createModal) {
        closeCreateModal();
    }

});


// ================================================
// 18. DEPLOY ANIMATION
// ================================================

function resetDeployStages() {

    for (let i = 1; i <= 6; i++) {

        const stage =
            document.getElementById(`stage${i}`);

        if (!stage) continue;

        stage.classList.remove('active', 'done');

        stage.classList.add('pending');

    }

    const first =
        document.getElementById('stage1');

    first.classList.remove('pending');

    first.classList.add('active');

    deployStageText.textContent =
        'تجهيز المشروع...';

    deployStageIndex = 1;

}


function activateDeployStage(index) {

    for (let i = 1; i <= 6; i++) {

        const stage =
            document.getElementById(`stage${i}`);

        if (!stage) continue;

        if (i < index) {

            stage.classList.remove('active', 'pending');

            stage.classList.add('done');

        } else if (i === index) {

            stage.classList.remove('pending', 'done');

            stage.classList.add('active');

        } else {

            stage.classList.remove('active', 'done');

            stage.classList.add('pending');

        }

    }


    const messages = {

        1: 'تجهيز المشروع...',

        2: 'تطبيق القالب والملفات...',

        3: 'نشر الموقع...',

        4: 'إعداد النطاق...',

        5: 'التحقق من الحماية SSL...',

        6: 'إنهاء النشر...'

    };

    deployStageText.textContent =
        messages[index] || 'جاري معالجة الموقع...';

}


function startDeployAnimation(siteName) {

    deployOverlaySiteName.textContent =
        `${siteName}.gollivetv.com`;

    resetDeployStages();

    deployOverlay.classList.add('active');

    /*
     * المراحل هنا بصرية فقط.
     * لا تعني أن كل مرحلة انتهت فعلياً.
     * انتهاء العملية الحقيقية يحدده رد Backend.
     */

    deployStageTimer = setInterval(function() {

        if (deployStageIndex >= 5) {

            clearInterval(deployStageTimer);

            deployStageTimer = null;

            return;

        }

        deployStageIndex++;

        activateDeployStage(deployStageIndex);

    }, 3000);

}


function stopDeployAnimation(success = true) {

    if (deployStageTimer) {

        clearInterval(deployStageTimer);

        deployStageTimer = null;

    }

    if (success) {

        activateDeployStage(6);

        deployStageText.textContent =
            'تم إنشاء موقعك بنجاح! 🎉';

    } else {

        deployStageText.textContent =
            'تعذر إكمال العملية.';

    }

    setTimeout(function() {

        deployOverlay.classList.remove('active');

    }, success ? 700 : 0);

}


// ================================================
// 19. DEPLOY BUTTON
// ================================================

deployBtn.addEventListener('click', async function() {

    const siteName =
        siteNameInput.value.trim();


    if (!siteName) {

        showStatus(
            'يرجى إدخال اسم الموقع أولاً.',
            'error'
        );

        siteNameInput.focus();

        return;

    }


    if (!/^[a-zA-Z0-9_-]+$/.test(siteName)) {

        showStatus(
            'اسم الموقع يجب أن يحتوي على حروف إنجليزية أو أرقام أو شرطة فقط.',
            'error'
        );

        siteNameInput.focus();

        return;

    }


    const currentToken =
        localStorage.getItem('token');


    if (!currentToken) {

        localStorage.removeItem('user');

        localStorage.removeItem('token');

        alert(
            'جلسة الدخول غير موجودة. المرجو تسجيل الدخول مجدداً.'
        );

        window.location.replace('login.html');

        return;

    }


    if (
        typeof window.TemplateCraftAPI === 'undefined' ||
        typeof TemplateCraftAPI.deploy !== 'function'
    ) {

        showStatus(
            'ملف client-api.js غير متصل أو لم يتم تحميله.',
            'error'
        );

        return;

    }


    const netlifyState =
        await refreshNetlifyState();


    if (
        !netlifyState.connected ||
        !netlifyState.teamSelected ||
        !netlifyState.teamName
    ) {

        showStatus(
            'خاصك تربط حساب Netlify وتتأكد من إعداد Team قبل إنشاء الموقع.',
            'error'
        );

        return;

    }


    await openCreateModal();

});


// ================================================
// 20. CONFIRM CREATE + REAL API DEPLOY
// ================================================

confirmCreateBtn.addEventListener('click', async function() {

    if (confirmCreateBtn.disabled) {
        return;
    }

    const siteName =
        siteNameInput.value.trim();

    const projectType =
        projectTypeSelect.value;


    if (!siteName) {

        closeCreateModal();

        showStatus(
            'يرجى إدخال اسم الموقع أولاً.',
            'error'
        );

        return;

    }


    if (!/^[a-zA-Z0-9_-]+$/.test(siteName)) {

        closeCreateModal();

        showStatus(
            'اسم الموقع يجب أن يحتوي على حروف إنجليزية أو أرقام أو شرطة فقط.',
            'error'
        );

        return;

    }


    const currentToken =
        localStorage.getItem('token');


    if (!currentToken) {

        closeCreateModal();

        localStorage.removeItem('user');

        localStorage.removeItem('token');

        alert(
            'انتهت جلسة الدخول. المرجو تسجيل الدخول مجدداً.'
        );

        window.location.replace('login.html');

        return;

    }


    if (
        typeof window.TemplateCraftAPI === 'undefined' ||
        typeof TemplateCraftAPI.deploy !== 'function'
    ) {

        closeCreateModal();

        showStatus(
            'ملف client-api.js غير متصل أو لم يتم تحميله.',
            'error'
        );

        return;

    }


    /*
     * إعادة التأكد من Netlify مباشرة قبل الإرسال.
     */

    confirmCreateBtn.disabled = true;

    confirmCreateBtn.textContent =
        '⏳ التحقق من حساب Netlify...';

    const netlifyState =
        await refreshNetlifyState();


    if (
        !netlifyState.connected ||
        !netlifyState.teamSelected ||
        !netlifyState.teamName
    ) {

        confirmCreateBtn.disabled = true;

        confirmCreateBtn.textContent =
            'خاصك تربط Netlify أولاً';

        confirmNetlifyTeamBox.classList.add('hidden');

        confirmNetlifyWarning.classList.remove('hidden');

        showStatus(
            'تعذر تأكيد Team الخاص بحساب Netlify. تحقق من الاتصال وحاول مجدداً.',
            'error'
        );

        return;

    }


    confirmNetlifyTeamName.textContent =
        netlifyState.teamName;

    confirmNetlifyTeamBox.classList.remove('hidden');

    confirmNetlifyWarning.classList.add('hidden');


    /*
     * إغلاق نافذة التأكيد.
     */

    closeCreateModal();


    resultContainer.classList.add('hidden');

    publishedSiteUrl = null;

    createdSiteId = null;


    /*
     * تعطيل زر البداية.
     */

    deployBtn.disabled = true;

    deployBtn.textContent =
        '⏳ جاري إنشاء الموقع...';

    showStatus(
        'جاري إنشاء الموقع وإرساله إلى Netlify، المرجو الانتظار...',
        'loading'
    );


    startDeployAnimation(siteName);


    try {

        /*
         * لا نرسل userId من المتصفح.
         * Backend يستخرج هوية المستخدم من JWT.
         */

        const result =
            await TemplateCraftAPI.deploy({

                siteName: siteName,

                templateId: selectedTemplateId,

                variables: {

                    projectType: projectType

                }

            });


        if (!result || !result.success) {

            const message =
                result?.error ||
                result?.message ||
                'تعذر إنشاء أو نشر الموقع.';


            if (
                result?.status === 401 ||
                result?.status === 403 ||
                /token|unauthorized|غير مصرح|تسجيل الدخول|انتهت الجلسة/i.test(message)
            ) {

                stopDeployAnimation(false);

                localStorage.removeItem('token');

                localStorage.removeItem('user');

                alert(
                    'انتهت جلسة الدخول. المرجو تسجيل الدخول مجدداً.'
                );

                window.location.replace('login.html');

                return;

            }

            throw new Error(message);

        }


        const siteData =
            getSiteData(result);

        createdSiteId =
            siteData.siteId;


        stopDeployAnimation(true);

        showDeployResult(siteData);


    } catch (error) {

        console.error(
            'Project publishing error:',
            error
        );

        stopDeployAnimation(false);

        showStatus(
            error.message ||
            'حدث خطأ أثناء إنشاء الموقع. حاول مرة أخرى.',
            'error'
        );

    } finally {

        deployBtn.disabled = false;

        deployBtn.textContent =
            '🚀 إنشاء ونشر الموقع';

        confirmCreateBtn.disabled = false;

        confirmCreateBtn.textContent =
            '🚀 متابعة وإنشاء الموقع';

    }

});


// ================================================
// 21. COPY CUSTOM DOMAIN URL
// ================================================

copyLinkBtn.addEventListener('click', async function() {

    if (!publishedSiteUrl) {

        showStatus(
            'الدومين الخاص لم يصبح جاهزاً للنسخ بعد.',
            'error'
        );

        return;

    }


    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator.clipboard.writeText(
                publishedSiteUrl
            );

        } else {

            const textArea =
                document.createElement('textarea');

            textArea.value = publishedSiteUrl;

            textArea.style.position = 'fixed';

            textArea.style.opacity = '0';

            document.body.appendChild(textArea);

            textArea.select();

            const copied =
                document.execCommand('copy');

            textArea.remove();

            if (!copied) {
                throw new Error('Copy failed');
            }

        }


        copyLinkBtn.textContent =
            '✅ تم نسخ الرابط';

        setTimeout(function() {

            copyLinkBtn.textContent =
                '📋 نسخ الرابط';

        }, 2000);


    } catch (error) {

        showStatus(
            'تعذر نسخ الرابط تلقائياً. يمكنك تحديده ونسخه يدوياً.',
            'error'
        );

    }

});


// ================================================
// 22. STATUS MESSAGE
// ================================================

function showStatus(message, type) {

    statusMessage.textContent = message;

    statusMessage.className =
        'mt-5 text-center text-sm font-bold';


    if (type === 'success') {

        statusMessage.classList.add('text-green-600');

    } else if (type === 'error') {

        statusMessage.classList.add('text-red-600');

    } else {

        statusMessage.classList.add('text-blue-600');

    }

}


// ================================================
// 23. INITIALIZE PAGE
// ================================================

async function initializeCreateProjectPage() {

    if (!apiAvailable()) {

        showStatus(
            'تعذر تحميل API. تأكد من ملف client-api.js.',
            'error'
        );

    }

    renderTemplates();

    /*
     * تحديث حالة Netlify.
     * create-project-netlify.js هو المسؤول عن
     * تعريف TemplateCraftNetlify.
     */

    await refreshNetlifyState();

}


initializeCreateProjectPage();
