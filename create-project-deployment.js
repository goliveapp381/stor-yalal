/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - DEPLOYMENT
====================================================

 مسؤول عن:
 - Deploy Button
 - Create Confirmation
 - Deployment Animation
 - Real API Deployment
 - Result
 - Copy URL
 - SSL Information Modal

====================================================
*/


// ================================================
// 1. DEPLOY STATE
// ================================================

let deployStageTimer =
    null;

let deployStageIndex =
    1;


// ================================================
// 2. ELEMENTS
// ================================================

const deploymentButton =
    document.getElementById(
        'deployBtn'
    );

const deploymentResultContainer =
    document.getElementById(
        'resultContainer'
    );

const deploymentConfirmButton =
    document.getElementById(
        'confirmCreateBtn'
    );

const deploymentCreateModal =
    document.getElementById(
        'createModal'
    );

const deploymentSiteNameInput =
    document.getElementById(
        'siteNameInput'
    );

const deploymentProjectTypeSelect =
    document.getElementById(
        'projectTypeSelect'
    );

const deploymentOverlay =
    document.getElementById(
        'deployOverlay'
    );

const deploymentOverlaySiteName =
    document.getElementById(
        'deployOverlaySiteName'
    );

const deploymentStageText =
    document.getElementById(
        'deployStageText'
    );

const deploymentCopyLinkButton =
    document.getElementById(
        'copyLinkBtn'
    );


// ================================================
// 3. SSL INFORMATION MODAL
// ================================================

function openSslInfoModal() {

    const modal =
        document.getElementById(
            'sslInfoModal'
        );

    const okButton =
        document.getElementById(
            'sslInfoOkBtn'
        );


    if (!modal) {

        console.warn(
            '⚠️ sslInfoModal not found.'
        );

        return;

    }


    /*
     * دعم Tailwind hidden/flex
     */

    modal.classList.remove(
        'hidden'
    );

    modal.classList.add(
        'flex'
    );


    /*
     * دعم display المباشر
     */

    modal.style.display =
        'flex';


    modal.setAttribute(
        'aria-hidden',
        'false'
    );


    /*
     * زر موافق
     */

    if (okButton) {

        /*
         * إزالة event سابق
         * لتجنب تكرار الأحداث
         */

        okButton.onclick =
            function(event) {

                if (event) {

                    event.preventDefault();

                }


                closeSslInfoModal();

            };


        /*
         * التركيز على الزر
         */

        setTimeout(
            function() {

                try {

                    okButton.focus();

                } catch (error) {

                    console.warn(
                        'SSL OK button focus failed:',
                        error
                    );

                }

            },
            50
        );

    }

}


// ================================================
// 4. CLOSE SSL MODAL
// ================================================

function closeSslInfoModal() {

    const modal =
        document.getElementById(
            'sslInfoModal'
        );


    if (!modal) {

        return;

    }


    /*
     * إخفاء النافذة
     */

    modal.classList.add(
        'hidden'
    );

    modal.classList.remove(
        'flex'
    );


    modal.style.display =
        'none';


    modal.setAttribute(
        'aria-hidden',
        'true'
    );

}


// ================================================
// 5. RESET DEPLOY STAGES
// ================================================

function resetDeployStages() {

    for (
        let i = 1;
        i <= 6;
        i++
    ) {

        const stage =
            document.getElementById(
                `stage${i}`
            );


        if (!stage) {

            continue;

        }


        stage.classList.remove(
            'active',
            'done'
        );


        stage.classList.add(
            'pending'
        );

    }


    const first =
        document.getElementById(
            'stage1'
        );


    if (first) {

        first.classList.remove(
            'pending'
        );


        first.classList.add(
            'active'
        );

    }


    if (deploymentStageText) {

        deploymentStageText.textContent =
            'تجهيز المشروع...';

    }


    deployStageIndex =
        1;

}


// ================================================
// 6. ACTIVATE DEPLOY STAGE
// ================================================

function activateDeployStage(
    index
) {

    for (
        let i = 1;
        i <= 6;
        i++
    ) {

        const stage =
            document.getElementById(
                `stage${i}`
            );


        if (!stage) {

            continue;

        }


        if (
            i < index
        ) {

            stage.classList.remove(
                'active',
                'pending'
            );


            stage.classList.add(
                'done'
            );

        } else if (
            i === index
        ) {

            stage.classList.remove(
                'pending',
                'done'
            );


            stage.classList.add(
                'active'
            );

        } else {

            stage.classList.remove(
                'active',
                'done'
            );


            stage.classList.add(
                'pending'
            );

        }

    }


    const messages = {

        1:
            'تجهيز المشروع...',

        2:
            'تطبيق القالب والملفات...',

        3:
            'نشر الموقع...',

        4:
            'إعداد النطاق...',

        5:
            'التحقق من الحماية SSL...',

        6:
            'إنهاء النشر...'

    };


    if (deploymentStageText) {

        deploymentStageText.textContent =
            messages[index] ||
            'جاري معالجة الموقع...';

    }

}


// ================================================
// 7. START DEPLOY ANIMATION
// ================================================

function startDeployAnimation(
    siteName
) {

    if (
        deploymentOverlaySiteName
    ) {

        /*
         * العرض البصري فقط.
         * لا يغير الدومين الحقيقي في Backend.
         */

        deploymentOverlaySiteName.textContent =
            `${siteName}.templatecraftpro.com`;

    }


    resetDeployStages();


    if (
        deploymentOverlay
    ) {

        deploymentOverlay.classList.add(
            'active'
        );

    }


    /*
     * المراحل هنا بصرية فقط.
     * لا تعني أن كل مرحلة انتهت فعلياً.
     * انتهاء العملية الحقيقية يحدده Backend.
     */

    deployStageTimer =
        setInterval(
            function() {

                if (
                    deployStageIndex >=
                    5
                ) {

                    clearInterval(
                        deployStageTimer
                    );


                    deployStageTimer =
                        null;


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


// ================================================
// 8. STOP DEPLOY ANIMATION
// ================================================

function stopDeployAnimation(
    success = true
) {

    if (
        deployStageTimer
    ) {

        clearInterval(
            deployStageTimer
        );


        deployStageTimer =
            null;

    }


    if (success) {

        activateDeployStage(
            6
        );


        if (
            deploymentStageText
        ) {

            deploymentStageText.textContent =
                'تم إنشاء موقعك بنجاح! 🎉';

        }

    } else {

        if (
            deploymentStageText
        ) {

            deploymentStageText.textContent =
                'تعذر إكمال العملية.';

        }

    }


    setTimeout(
        function() {

            if (
                deploymentOverlay
            ) {

                deploymentOverlay.classList.remove(
                    'active'
                );

            }

        },
        success
            ? 700
            : 0
    );

}


// ================================================
// 9. DEPLOY BUTTON VALIDATION
// ================================================

async function handleDeployButton() {

    const siteName =
        deploymentSiteNameInput.value.trim();


    if (!siteName) {

        showStatus(
            'يرجى إدخال اسم الموقع أولاً.',
            'error'
        );


        deploymentSiteNameInput.focus();

        return;

    }


    if (
        !/^[a-zA-Z0-9_-]+$/.test(
            siteName
        )
    ) {

        showStatus(
            'اسم الموقع يجب أن يحتوي على حروف إنجليزية أو أرقام أو شرطة أو شرطة سفلية فقط.',
            'error'
        );


        deploymentSiteNameInput.focus();

        return;

    }


    const currentToken =
        localStorage.getItem(
            'token'
        );


    if (!currentToken) {

        localStorage.removeItem(
            'user'
        );

        localStorage.removeItem(
            'token'
        );


        alert(
            'جلسة الدخول غير موجودة. المرجو تسجيل الدخول مجدداً.'
        );


        window.location.replace(
            'login.html'
        );


        return;

    }


    if (
        typeof window.TemplateCraftAPI ===
            'undefined' ||

        typeof window.TemplateCraftAPI.deploy !==
            'function'
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
        !netlifyReady(
            netlifyState
        )
    ) {

        showStatus(
            getNetlifyReadinessMessage(
                netlifyState
            ),
            'error'
        );


        return;

    }


    await openCreateModal();

}


// ================================================
// 10. CONFIRM + REAL DEPLOY
// ================================================

async function handleConfirmCreate() {

    if (
        deploymentConfirmButton.disabled
    ) {

        return;

    }


    const siteName =
        deploymentSiteNameInput.value.trim();


    const projectType =
        deploymentProjectTypeSelect.value;


    if (!siteName) {

        closeCreateModal();


        showStatus(
            'يرجى إدخال اسم الموقع أولاً.',
            'error'
        );


        return;

    }


    if (
        !/^[a-zA-Z0-9_-]+$/.test(
            siteName
        )
    ) {

        closeCreateModal();


        showStatus(
            'اسم الموقع يجب أن يحتوي على حروف إنجليزية أو أرقام أو شرطة أو شرطة سفلية فقط.',
            'error'
        );


        return;

    }


    const currentToken =
        localStorage.getItem(
            'token'
        );


    if (!currentToken) {

        closeCreateModal();


        localStorage.removeItem(
            'user'
        );


        localStorage.removeItem(
            'token'
        );


        alert(
            'انتهت جلسة الدخول. المرجو تسجيل الدخول مجدداً.'
        );


        window.location.replace(
            'login.html'
        );


        return;

    }


    if (
        typeof window.TemplateCraftAPI ===
            'undefined' ||

        typeof window.TemplateCraftAPI.deploy !==
            'function'
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

    deploymentConfirmButton.disabled =
        true;


    deploymentConfirmButton.textContent =
        '⏳ التحقق من حساب Netlify...';


    const netlifyState =
        await refreshNetlifyState();


    if (
        !netlifyReady(
            netlifyState
        )
    ) {

        deploymentConfirmButton.disabled =
            true;


        deploymentConfirmButton.textContent =
            'خاصك تختار Netlify Team أولاً';


        if (
            typeof showNetlifyConfirmationWarning ===
                'function'
        ) {

            showNetlifyConfirmationWarning(
                getNetlifyReadinessMessage(
                    netlifyState
                )
            );

        }


        showStatus(
            getNetlifyReadinessMessage(
                netlifyState
            ),
            'error'
        );


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


    /*
     * إغلاق نافذة التأكيد.
     */

    closeCreateModal();


    if (
        deploymentResultContainer
    ) {

        deploymentResultContainer.classList.add(
            'hidden'
        );

    }


    publishedSiteUrl =
        null;


    createdSiteId =
        null;


    /*
     * تعطيل زر البداية.
     */

    deploymentButton.disabled =
        true;


    deploymentButton.textContent =
        '⏳ جاري إنشاء الموقع...';


    showStatus(
        'جاري إنشاء الموقع وإرساله إلى Netlify، المرجو الانتظار...',
        'loading'
    );


    startDeployAnimation(
        siteName
    );


    try {

        /*
         * لا نرسل userId من المتصفح.
         * Backend يستخرج هوية المستخدم من JWT.
         */

        const result =
            await TemplateCraftAPI.deploy({

                siteName:
                    siteName,

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

                stopDeployAnimation(
                    false
                );


                localStorage.removeItem(
                    'token'
                );


                localStorage.removeItem(
                    'user'
                );


                alert(
                    'انتهت جلسة الدخول. المرجو تسجيل الدخول مجدداً.'
                );


                window.location.replace(
                    'login.html'
                );


                return;

            }


            throw new Error(
                message
            );

        }


        const siteData =
            getSiteData(
                result
            );


        createdSiteId =
            siteData.siteId;


        stopDeployAnimation(
            true
        );


        showDeployResult(
            siteData
        );


        /*
         * ========================================
         * SSL INFORMATION MODAL
         * ========================================
         *
         * النشر نجح.
         * ننتظر قليلاً حتى تختفي نافذة النشر،
         * ثم نعرض نافذة SSL الثالثة.
         */

        setTimeout(
            function() {

                openSslInfoModal();

            },
            900
        );


    } catch (error) {

        console.error(
            'Project publishing error:',
            error
        );


        stopDeployAnimation(
            false
        );


        showStatus(
            error.message ||
            'حدث خطأ أثناء إنشاء الموقع. حاول مرة أخرى.',
            'error'
        );


    } finally {

        deploymentButton.disabled =
            false;


        deploymentButton.textContent =
            '🚀 إنشاء ونشر الموقع';


        deploymentConfirmButton.disabled =
            false;


        deploymentConfirmButton.textContent =
            '🚀 متابعة وإنشاء الموقع';

    }

}


// ================================================
// 11. COPY CUSTOM DOMAIN
// ================================================

async function handleCopyLink() {

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
                document.createElement(
                    'textarea'
                );


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
                document.execCommand(
                    'copy'
                );


            textArea.remove();


            if (!copied) {

                throw new Error(
                    'Copy failed'
                );

            }

        }


        if (
            deploymentCopyLinkButton
        ) {

            deploymentCopyLinkButton.textContent =
                '✅ تم نسخ الرابط';

        }


        setTimeout(
            function() {

                if (
                    deploymentCopyLinkButton
                ) {

                    deploymentCopyLinkButton.textContent =
                        '📋 نسخ الرابط';

                }

            },
            2000
        );


    } catch (error) {

        showStatus(
            'تعذر نسخ الرابط تلقائياً. يمكنك تحديده ونسخه يدوياً.',
            'error'
        );

    }

}


// ================================================
// 12. SSL MODAL EVENTS
// ================================================

function initializeSslModal() {

    const modal =
        document.getElementById(
            'sslInfoModal'
        );

    const okButton =
        document.getElementById(
            'sslInfoOkBtn'
        );


    if (!modal) {

        console.warn(
            '⚠️ sslInfoModal غير موجود في HTML.'
        );

        return;

    }


    /*
     * إغلاق عند الضغط خارج محتوى النافذة
     */

    modal.addEventListener(
        'click',
        function(event) {

            if (
                event.target ===
                modal
            ) {

                closeSslInfoModal();

            }

        }
    );


    /*
     * زر موافق
     */

    if (okButton) {

        okButton.addEventListener(
            'click',
            function(event) {

                event.preventDefault();

                closeSslInfoModal();

            }
        );

    }

}


// ================================================
// 13. DEPLOYMENT EVENTS
// ================================================

function initializeDeploymentSystem() {

    if (
        deploymentButton
    ) {

        deploymentButton.addEventListener(
            'click',
            handleDeployButton
        );

    }


    if (
        deploymentConfirmButton
    ) {

        deploymentConfirmButton.addEventListener(
            'click',
            handleConfirmCreate
        );

    }


    if (
        deploymentCopyLinkButton
    ) {

        deploymentCopyLinkButton.addEventListener(
            'click',
            handleCopyLink
        );

    }


    initializeSslModal();

}


// ================================================
// 14. PUBLIC
// ================================================

window.initializeDeploymentSystem =
    initializeDeploymentSystem;

window.openSslInfoModal =
    openSslInfoModal;

window.closeSslInfoModal =
    closeSslInfoModal;
