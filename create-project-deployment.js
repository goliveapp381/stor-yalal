'use strict';

/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - DEPLOYMENT
====================================================

 مسؤول عن:
 - Create Confirmation
 - Real API Deployment
 - Deployment Animation
 - Result
 - Copy URL
 - SSL Information
====================================================
*/

let deployStageTimer = null;
let deployStageIndex = 1;


/* ==================================================
   ELEMENTS
================================================== */

const deploymentButton =
    document.getElementById('createProjectBtn');

const deploymentResultContainer =
    document.getElementById('createResult');

const deploymentConfirmButton =
    document.getElementById('confirmCreateBtn');

const deploymentCreateModal =
    document.getElementById('createModal');

const deploymentSiteNameInput =
    document.getElementById('siteName');

const deploymentProjectTypeSelect =
    document.getElementById('projectTypeSelect');

const deploymentOverlay =
    document.getElementById('deploymentOverlay');

const deploymentStageText =
    document.getElementById('deploymentMessage');

const deploymentTitle =
    document.getElementById('deploymentTitle');


/* ==================================================
   STATE
================================================== */

let publishedSiteUrl = null;
let createdSiteId = null;


/* ==================================================
   SSL MODAL
================================================== */

function openSslInfoModal() {

    const modal =
        document.getElementById('sslPreparationModal');

    if (!modal) {
        return;
    }

    modal.classList.add('active');

    modal.setAttribute(
        'aria-hidden',
        'false'
    );
}


function closeSslInfoModal() {

    const modal =
        document.getElementById('sslPreparationModal');

    if (!modal) {
        return;
    }

    modal.classList.remove('active');

    modal.setAttribute(
        'aria-hidden',
        'true'
    );
}


/* ==================================================
   RESET DEPLOY STAGES
================================================== */

function resetDeployStages() {

    deployStageIndex = 1;

    if (deploymentStageText) {
        deploymentStageText.textContent =
            'تجهيز المشروع...';
    }

    if (deploymentTitle) {
        deploymentTitle.textContent =
            'جاري إنشاء المشروع...';
    }
}


/* ==================================================
   ACTIVATE DEPLOY STAGE
================================================== */

function activateDeployStage(index) {

    const messages = {

        1: 'تجهيز المشروع...',

        2: 'تطبيق القالب والملفات...',

        3: 'نشر الموقع...',

        4: 'إعداد النطاق...',

        5: 'التحقق من الحماية SSL...',

        6: 'إنهاء النشر...'

    };

    deployStageIndex = index;

    if (deploymentStageText) {

        deploymentStageText.textContent =
            messages[index] ||
            'جاري معالجة الموقع...';
    }
}


/* ==================================================
   START DEPLOY ANIMATION
================================================== */

function startDeployAnimation(siteName) {

    resetDeployStages();

    if (deploymentOverlay) {

        deploymentOverlay.classList.add(
            'active'
        );
    }

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );
    }

    deployStageTimer = setInterval(
        function () {

            if (deployStageIndex >= 5) {

                clearInterval(
                    deployStageTimer
                );

                deployStageTimer = null;

                return;
            }

            deployStageIndex++;

            activateDeployStage(
                deployStageIndex
            );

        },
        3000
    );
}


/* ==================================================
   STOP DEPLOY ANIMATION
================================================== */

function stopDeployAnimation(success = true) {

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer = null;
    }

    if (success) {

        activateDeployStage(6);

        if (deploymentStageText) {

            deploymentStageText.textContent =
                'تم إنشاء موقعك بنجاح! 🎉';
        }

        setTimeout(
            function () {

                if (deploymentOverlay) {

                    deploymentOverlay.classList.remove(
                        'active'
                    );
                }

            },
            700
        );

    } else {

        if (deploymentStageText) {

            deploymentStageText.textContent =
                'تعذر إكمال العملية.';
        }

        if (deploymentOverlay) {

            deploymentOverlay.classList.remove(
                'active'
            );
        }
    }
}


/* ==================================================
   DEPLOY BUTTON
================================================== */

async function handleDeployButton() {

    const siteName =
        deploymentSiteNameInput
            ? deploymentSiteNameInput.value.trim()
            : '';

    if (!siteName) {

        if (typeof showStatus === 'function') {

            showStatus(
                'يرجى إدخال اسم الموقع أولاً.',
                'error'
            );
        }

        if (deploymentSiteNameInput) {
            deploymentSiteNameInput.focus();
        }

        return;
    }


    if (!/^[a-zA-Z0-9_-]+$/.test(siteName)) {

        if (typeof showStatus === 'function') {

            showStatus(
                'اسم الموقع يجب أن يحتوي على حروف إنجليزية أو أرقام أو شرطة أو شرطة سفلية فقط.',
                'error'
            );
        }

        if (deploymentSiteNameInput) {
            deploymentSiteNameInput.focus();
        }

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

        window.location.replace(
            'login.html'
        );

        return;
    }


    if (
        typeof window.TemplateCraftAPI === 'undefined' ||
        typeof window.TemplateCraftAPI.deploy !== 'function'
    ) {

        if (typeof showStatus === 'function') {

            showStatus(
                'ملف client-api.js غير متصل أو لم يتم تحميله.',
                'error'
            );
        }

        return;
    }


    const netlifyState =
        typeof refreshNetlifyState === 'function'
            ? await refreshNetlifyState()
            : null;


    if (
        typeof netlifyReady === 'function' &&
        !netlifyReady(netlifyState)
    ) {

        if (typeof showStatus === 'function') {

            showStatus(
                typeof getNetlifyReadinessMessage === 'function'
                    ? getNetlifyReadinessMessage(netlifyState)
                    : 'خاصك تربط Netlify أولاً.',
                'error'
            );
        }

        return;
    }


    await openCreateModal();
}


/* ==================================================
   CONFIRM CREATE
================================================== */

async function handleConfirmCreate() {

    if (
        deploymentConfirmButton &&
        deploymentConfirmButton.disabled
    ) {
        return;
    }


    const siteName =
        deploymentSiteNameInput
            ? deploymentSiteNameInput.value.trim()
            : '';


    const projectType =
        deploymentProjectTypeSelect
            ? deploymentProjectTypeSelect.value
            : '';


    const selectedTemplate =
        typeof window.getSelectedTemplate === 'function'
            ? window.getSelectedTemplate()
            : null;


    const selectedTemplateId =
        selectedTemplate
            ? selectedTemplate.id
            : (
                typeof window.getSelectedTemplateId === 'function'
                    ? window.getSelectedTemplateId()
                    : null
            );


    if (!siteName) {

        closeCreateModal();

        if (typeof showStatus === 'function') {

            showStatus(
                'يرجى إدخال اسم الموقع أولاً.',
                'error'
            );
        }

        return;
    }


    if (!/^[a-zA-Z0-9_-]+$/.test(siteName)) {

        closeCreateModal();

        if (typeof showStatus === 'function') {

            showStatus(
                'اسم الموقع يجب أن يحتوي على حروف إنجليزية أو أرقام أو شرطة أو شرطة سفلية فقط.',
                'error'
            );
        }

        return;
    }


    if (!selectedTemplateId) {

        closeCreateModal();

        if (typeof showStatus === 'function') {

            showStatus(
                'يرجى اختيار قالب أولاً.',
                'error'
            );
        }

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

        window.location.replace(
            'login.html'
        );

        return;
    }


    if (
        typeof window.TemplateCraftAPI === 'undefined' ||
        typeof window.TemplateCraftAPI.deploy !== 'function'
    ) {

        closeCreateModal();

        if (typeof showStatus === 'function') {

            showStatus(
                'ملف client-api.js غير متصل أو لم يتم تحميله.',
                'error'
            );
        }

        return;
    }


    if (deploymentConfirmButton) {

        deploymentConfirmButton.disabled =
            true;

        deploymentConfirmButton.textContent =
            '⏳ التحقق من Netlify...';
    }


    try {

        const netlifyState =
            typeof refreshNetlifyState === 'function'
                ? await refreshNetlifyState()
                : null;


        if (
            typeof netlifyReady === 'function' &&
            !netlifyReady(netlifyState)
        ) {

            if (
                typeof showNetlifyConfirmationWarning ===
                'function'
            ) {

                showNetlifyConfirmationWarning(
                    typeof getNetlifyReadinessMessage === 'function'
                        ? getNetlifyReadinessMessage(netlifyState)
                        : 'خاصك تختار Netlify Team أولاً.'
                );
            }


            if (typeof showStatus === 'function') {

                showStatus(
                    typeof getNetlifyReadinessMessage === 'function'
                        ? getNetlifyReadinessMessage(netlifyState)
                        : 'خاصك تختار Netlify Team أولاً.',
                    'error'
                );
            }


            return;
        }


        if (
            typeof updateNetlifyConfirmationUI ===
            'function'
        ) {

            updateNetlifyConfirmationUI(
                netlifyState
            );
        }


        closeCreateModal();


        if (deploymentResultContainer) {

            deploymentResultContainer.classList.add(
                'hidden'
            );
        }


        publishedSiteUrl = null;
        createdSiteId = null;


        if (deploymentButton) {

            deploymentButton.disabled =
                true;

            deploymentButton.textContent =
                '⏳ جاري إنشاء الموقع...';
        }


        if (typeof showStatus === 'function') {

            showStatus(
                'جاري إنشاء الموقع وإرساله إلى Netlify، المرجو الانتظار...',
                'loading'
            );
        }


        startDeployAnimation(
            siteName
        );


        const result =
            await window.TemplateCraftAPI.deploy({

                siteName: siteName,

                templateId:
                    selectedTemplateId,

                variables: {

                    projectType:
                        projectType

                }

            });


        if (
            !result ||
            !result.success
        ) {

            const message =
                result?.error ||
                result?.message ||
                'تعذر إنشاء أو نشر الموقع.';


            if (
                result?.status === 401 ||
                result?.status === 403 ||
                /token|unauthorized|غير مصرح|تسجيل الدخول|انتهت الجلسة/i.test(
                    message
                )
            ) {

                stopDeployAnimation(false);

                localStorage.removeItem('token');
                localStorage.removeItem('user');

                alert(
                    'انتهت جلسة الدخول. المرجو تسجيل الدخول مجدداً.'
                );

                window.location.replace(
                    'login.html'
                );

                return;
            }


            throw new Error(message);
        }


        const siteData =
            getSiteData(result);


        createdSiteId =
            siteData.siteId;


        publishedSiteUrl =
            siteData.url ||
            siteData.liveUrl ||
            siteData.siteUrl ||
            null;


        stopDeployAnimation(true);


        showDeployResult(
            siteData
        );


        setTimeout(
            function () {

                openSslInfoModal();

            },
            900
        );


    } catch (error) {

        console.error(
            'Project publishing error:',
            error
        );


        stopDeployAnimation(false);


        if (typeof showStatus === 'function') {

            showStatus(
                error.message ||
                'حدث خطأ أثناء إنشاء الموقع. حاول مرة أخرى.',
                'error'
            );
        }


    } finally {

        if (deploymentButton) {

            deploymentButton.disabled =
                false;

            deploymentButton.textContent =
                '🚀 إنشاء المشروع ونشره';
        }


        if (deploymentConfirmButton) {

            deploymentConfirmButton.disabled =
                false;

            deploymentConfirmButton.textContent =
                'تأكيد الإنشاء';
        }
    }
}


/* ==================================================
   COPY LINK
================================================== */

async function handleCopyLink() {

    if (!publishedSiteUrl) {

        if (typeof showStatus === 'function') {

            showStatus(
                'الرابط غير جاهز للنسخ بعد.',
                'error'
            );
        }

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

            textArea.value =
                publishedSiteUrl;

            textArea.style.position =
                'fixed';

            textArea.style.opacity =
                '0';

            document.body.appendChild(
                textArea
            );

            textArea.select();

            const copied =
                document.execCommand('copy');

            textArea.remove();

            if (!copied) {
                throw new Error('Copy failed');
            }
        }


        const button =
            document.getElementById('copyLinkBtn');

        if (button) {

            button.textContent =
                '✅ تم نسخ الرابط';

            setTimeout(
                function () {

                    button.textContent =
                        '📋 نسخ الرابط';

                },
                2000
            );
        }


    } catch (error) {

        if (typeof showStatus === 'function') {

            showStatus(
                'تعذر نسخ الرابط تلقائياً.',
                'error'
            );
        }
    }
}


/* ==================================================
   SSL EVENTS
================================================== */

function initializeSslModal() {

    const modal =
        document.getElementById(
            'sslPreparationModal'
        );

    if (!modal) {
        return;
    }


    modal.addEventListener(
        'click',
        function (event) {

            if (
                event.target === modal
            ) {

                closeSslInfoModal();
            }
        }
    );
}


/* ==================================================
   DEPLOYMENT EVENTS
================================================== */

function initializeDeploymentSystem() {

    if (deploymentButton) {

        deploymentButton.addEventListener(
            'click',
            handleDeployButton
        );
    }


    if (deploymentConfirmButton) {

        deploymentConfirmButton.addEventListener(
            'click',
            handleConfirmCreate
        );
    }


    initializeSslModal();
}


/* ==================================================
   PUBLIC
================================================== */

window.initializeDeploymentSystem =
    initializeDeploymentSystem;

window.openSslInfoModal =
    openSslInfoModal;

window.closeSslInfoModal =
    closeSslInfoModal;
