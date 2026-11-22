'use strict';

/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - DEPLOYMENT
 PREMIUM CINEMATIC DEPLOYMENT SYSTEM
====================================================

 مسؤول عن:

 - استقبال طلب إنشاء المشروع
 - Deployment الحقيقي عبر API
 - مراحل الإنشاء
 - Progress
 - نجاح إنشاء الموقع
 - الانتقال إلى صفحة المشاريع

 مهم:
 SSL لا يتم انتظاره هنا.

 بمجرد نجاح إنشاء / نشر الموقع في Netlify:
 → يتم إنهاء العملية
 → تغلق نافذة التجهيز
 → ينتقل المستخدم إلى صفحة المشاريع

 SSL يتم التحقق منه لاحقاً من صفحة المشاريع.

 مهم جداً:
 لا يتم تغيير API أو Backend أو Authentication.
====================================================
*/


/* ==================================================
   STATE
================================================== */

let deployStageTimer = null;

let deployStageIndex = 0;

let deploymentRunning = false;

let publishedSiteUrl = null;

let createdSiteId = null;


/* ==================================================
   ELEMENTS
================================================== */

const deploymentResultContainer =
    document.getElementById('createResult');

const deploymentOverlay =
    document.getElementById('deploymentOverlay');

const deploymentTitle =
    document.getElementById('deploymentTitle');

const deploymentMessage =
    document.getElementById('deploymentMessage');

const deploymentProgress =
    document.getElementById('deploymentProgress');


/* ==================================================
   DEPLOYMENT STAGES
================================================== */

const DEPLOY_STAGES = [

    {
        id: 'create-project',

        title: 'إنشاء المشروع',

        message:
            'جارٍ إنشاء المشروع وتجهيز بياناته...'
    },

    {
        id: 'prepare-template',

        title: 'تجهيز ملفات القالب',

        message:
            'جارٍ تجهيز ملفات القالب والصفحات...'
    },

    {
        id: 'configure-site',

        title: 'إعداد الموقع',

        message:
            'جارٍ تطبيق إعدادات المشروع والقالب...'
    },

    {
        id: 'connect-settings',

        title: 'ربط الإعدادات',

        message:
            'جارٍ ربط إعدادات المشروع والاستضافة...'
    },

    {
        id: 'publish-netlify',

        title: 'نشر الموقع',

        message:
            'جارٍ إنشاء ونشر الموقع على Netlify...'
    },

    {
        id: 'complete',

        title: 'إتمام الإنشاء',

        message:
            'تم إنشاء الموقع ونشره بنجاح.'
    }

];


/* ==================================================
   SAFE HTML
================================================== */

function escapeDeploymentHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}


/* ==================================================
   CREATE STAGES UI
================================================== */

function createDeploymentStages() {

    if (!deploymentOverlay) {

        return;

    }


    const card =
        deploymentOverlay.querySelector(
            '.deployment-card'
        );


    if (!card) {

        console.warn(
            '[TemplateCraft] .deployment-card not found.'
        );

        return;

    }


    let stages =
        card.querySelector(
            '.deployment-stages'
        );


    /*
    إذا كانت المراحل موجودة بالفعل
    فلا ننشئها مرة أخرى.
    */

    if (stages) {

        return;

    }


    stages =
        document.createElement('div');


    stages.className =
        'deployment-stages';


    stages.innerHTML =
        DEPLOY_STAGES
            .map(
                function (stage, index) {

                    return `
                        <div
                            class="deployment-stage pending"
                            data-stage-index="${index}"
                        >

                            <div
                                class="deployment-stage-icon stage-icon"
                            >

                                <span
                                    class="stage-number"
                                >
                                    ${index + 1}
                                </span>

                                <span
                                    class="stage-check"
                                >
                                    ✓
                                </span>

                            </div>


                            <div
                                class="deployment-stage-content stage-content"
                            >

                                <strong
                                    class="stage-title"
                                >
                                    ${escapeDeploymentHtml(
                                        stage.title
                                    )}
                                </strong>

                                <span
                                    class="stage-message"
                                >
                                    ${escapeDeploymentHtml(
                                        stage.message
                                    )}
                                </span>

                            </div>

                        </div>
                    `;

                }
            )
            .join('');


    /*
    --------------------------------------------------
    إدراج المراحل قبل شريط التقدم
    --------------------------------------------------
    */

    const progressContainer =
        deploymentProgress?.parentElement;


    if (progressContainer) {

        card.insertBefore(
            stages,
            progressContainer
        );

    } else {

        card.appendChild(
            stages
        );

    }

}


/* ==================================================
   UPDATE STAGE
================================================== */

function updateDeploymentStage(
    index,
    state = 'active'
) {

    const stages =
        deploymentOverlay?.querySelectorAll(
            '.deployment-stage'
        );


    if (!stages) {

        return;

    }


    stages.forEach(
        function (stage, stageIndex) {

            stage.classList.remove(
                'active',
                'completed',
                'pending'
            );


            /*
            كل مرحلة قبل الحالية = مكتملة
            */

            if (stageIndex < index) {

                stage.classList.add(
                    'completed'
                );

            }


            /*
            المرحلة الحالية
            */

            else if (stageIndex === index) {

                stage.classList.add(
                    state
                );

            }


            /*
            المراحل القادمة
            */

            else {

                stage.classList.add(
                    'pending'
                );

            }

        }
    );


    const stage =
        DEPLOY_STAGES[index];


    if (!stage) {

        return;

    }


    if (deploymentTitle) {

        deploymentTitle.textContent =
            stage.title;

    }


    if (deploymentMessage) {

        deploymentMessage.textContent =
            stage.message;

    }


    updateDeploymentProgress(
        index
    );

}


/* ==================================================
   PROGRESS
================================================== */

function updateDeploymentProgress(index) {

    if (!deploymentProgress) {

        return;

    }


    const total =
        DEPLOY_STAGES.length;


    const percentage =
        Math.max(
            5,
            Math.min(
                100,
                Math.round(
                    (
                        index /
                        (total - 1)
                    ) * 100
                )
            )
        );


    deploymentProgress.style.width =
        `${percentage}%`;

}


/* ==================================================
   RESET DEPLOYMENT
================================================== */

function resetDeployment() {

    /*
    إيقاف أي مؤقت سابق
    */

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer = null;

    }


    /*
    إعادة الحالة
    */

    deployStageIndex = 0;

    deploymentRunning = false;

    publishedSiteUrl = null;

    createdSiteId = null;


    /*
    إنشاء المراحل
    */

    createDeploymentStages();


    /*
    إعادة حالة المراحل
    */

    const stages =
        deploymentOverlay?.querySelectorAll(
            '.deployment-stage'
        );


    if (stages) {

        stages.forEach(
            function (stage) {

                stage.classList.remove(
                    'active',
                    'completed',
                    'pending'
                );

                stage.classList.add(
                    'pending'
                );

            }
        );

    }


    /*
    إزالة حالات النجاح والخطأ
    */

    const card =
        deploymentOverlay?.querySelector(
            '.deployment-card'
        );


    if (card) {

        card.classList.remove(
            'deployment-success',
            'deployment-error'
        );

    }


    /*
    إعادة العنوان والرسالة
    */

    if (deploymentTitle) {

        deploymentTitle.textContent =
            'جارٍ إنشاء المشروع...';

    }


    if (deploymentMessage) {

        deploymentMessage.textContent =
            'يرجى الانتظار، ولا تغلق هذه الصفحة.';

    }


    /*
    إعادة شريط التقدم
    */

    if (deploymentProgress) {

        deploymentProgress.style.width =
            '5%';

    }


    /*
    تفعيل المرحلة الأولى
    */

    updateDeploymentStage(
        0,
        'active'
    );

}


/* ==================================================
   OPEN DEPLOYMENT OVERLAY
================================================== */

function openDeploymentOverlay() {

    resetDeployment();


    if (!deploymentOverlay) {

        return;

    }


    deploymentOverlay.classList.add(
        'active'
    );


    deploymentOverlay.style.display =
        'flex';


    deploymentOverlay.setAttribute(
        'aria-hidden',
        'false'
    );


    /*
    منع تمرير الصفحة خلف النافذة
    */

    document.body.classList.add(
        'no-scroll'
    );

}


/* ==================================================
   CLOSE DEPLOYMENT OVERLAY
================================================== */

function closeDeploymentOverlay() {

    if (!deploymentOverlay) {

        return;

    }


    deploymentOverlay.classList.remove(
        'active'
    );


    deploymentOverlay.style.display =
        'none';


    deploymentOverlay.setAttribute(
        'aria-hidden',
        'true'
    );


    /*
    إعادة تمرير الصفحة
    */

    document.body.classList.remove(
        'no-scroll'
    );

}


/* ==================================================
   START STAGE SIMULATION
================================================== */

function startDeploymentStages() {

    /*
    إلغاء المؤقت السابق
    */

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer = null;

    }


    deployStageIndex = 0;


    /*
    المرحلة الأولى
    */

    updateDeploymentStage(
        0,
        'active'
    );


    /*
    الانتقال بين المراحل بشكل بصري
    */

    deployStageTimer =
        setInterval(
            function () {

                /*
                إذا توقف النشر
                لا نكمل المراحل.
                */

                if (!deploymentRunning) {

                    return;

                }


                /*
                لا ندخل إلى مرحلة الإتمام
                قبل نجاح API الحقيقي.
                */

                if (
                    deployStageIndex >= 4
                ) {

                    clearInterval(
                        deployStageTimer
                    );

                    deployStageTimer =
                        null;

                    return;

                }


                /*
                المرحلة التالية
                */

                deployStageIndex++;


                updateDeploymentStage(
                    deployStageIndex,
                    'active'
                );

            },
            2200
        );

}


/* ==================================================
   COMPLETE DEPLOYMENT
================================================== */

function completeDeployment() {

    /*
    إيقاف محاكاة المراحل
    */

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer = null;

    }


    /*
    حالة النجاح
    */

    const card =
        deploymentOverlay?.querySelector(
            '.deployment-card'
        );


    if (card) {

        card.classList.remove(
            'deployment-error'
        );

        card.classList.add(
            'deployment-success'
        );

    }


    /*
    جميع المراحل مكتملة
    */

    const stages =
        deploymentOverlay?.querySelectorAll(
            '.deployment-stage'
        );


    if (stages) {

        stages.forEach(
            function (stage) {

                stage.classList.remove(
                    'active',
                    'pending'
                );

                stage.classList.add(
                    'completed'
                );

            }
        );

    }


    /*
    المرحلة الأخيرة
    */

    deployStageIndex =
        DEPLOY_STAGES.length - 1;


    /*
    العنوان
    */

    if (deploymentTitle) {

        deploymentTitle.textContent =
            'تم إنشاء الموقع بنجاح 🎉';

    }


    /*
    الرسالة
    */

    if (deploymentMessage) {

        deploymentMessage.textContent =
            'تم إنشاء موقعك ونشره بنجاح على Netlify.';

    }


    /*
    التقدم 100%
    */

    if (deploymentProgress) {

        deploymentProgress.style.width =
            '100%';

    }

}


/* ==================================================
   FAILED DEPLOYMENT
================================================== */

function failDeployment(message) {

    /*
    إيقاف المؤقت
    */

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer = null;

    }


    deploymentRunning = false;


    /*
    حالة الخطأ بصرياً
    */

    const card =
        deploymentOverlay?.querySelector(
            '.deployment-card'
        );


    if (card) {

        card.classList.remove(
            'deployment-success'
        );

        card.classList.add(
            'deployment-error'
        );

    }


    /*
    العنوان
    */

    if (deploymentTitle) {

        deploymentTitle.textContent =
            'تعذر إنشاء الموقع';

    }


    /*
    الرسالة
    */

    if (deploymentMessage) {

        deploymentMessage.textContent =
            message ||
            'حدث خطأ أثناء إنشاء الموقع.';

    }


    /*
    إغلاق النافذة بعد لحظة قصيرة
    */

    setTimeout(
        function () {

            closeDeploymentOverlay();

        },
        1400
    );

}


/* ==================================================
   GET SITE DATA
================================================== */

function getDeploymentSiteData(result) {

    const site =
        result?.site ||
        result?.data?.site ||
        result?.data ||
        result?.project ||
        result ||
        {};


    return {

        siteId:
            site.siteId ||
            site._id ||
            site.id ||
            result?.siteId ||
            result?.id ||
            null,


        url:
            site.url ||
            site.liveUrl ||
            site.siteUrl ||
            site.deployUrl ||
            result?.url ||
            result?.liveUrl ||
            result?.siteUrl ||
            null,


        netlifySiteId:
            site.netlifySiteId ||
            result?.netlifySiteId ||
            null,


        name:
            site.siteName ||
            site.name ||
            result?.siteName ||
            null

    };

}


/* ==================================================
   GET FRONTEND AUTH TOKEN
==================================================

 مهم:

 لا نفرض Token معيناً هنا.

 client-api.js هو المسؤول الحقيقي
 عن Authorization.

 هذا الجزء فقط يتحقق من وجود جلسة.
================================================== */

function getFrontendAuthToken() {

    return (
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('templatecraft_token') ||
        ''
    );

}


/* ==================================================
   HANDLE CREATE EVENT
================================================== */

async function handleCreateProject(event) {

    /*
    منع إنشاء أكثر من مشروع في نفس الوقت
    */

    if (deploymentRunning) {

        console.warn(
            '[TemplateCraft] Deployment already running.'
        );

        return;

    }


    const detail =
        event?.detail ||
        {};


    /*
    اسم المشروع
    */

    const siteName =
        String(
            detail.siteName || ''
        ).trim();


    /*
    القالب
    */

    const templateId =
        detail.templateId ||
        detail.template?.id ||
        null;


    /*
    نوع المشروع
    */

    const projectType =
        detail.projectType ||
        detail.template?.projectType ||
        detail.template?.category ||
        '';


    /* ================================================
       VALIDATION
    ================================================ */

    if (!siteName) {

        alert(
            'اسم المشروع غير موجود.'
        );

        return;

    }


    if (!templateId) {

        alert(
            'القالب غير محدد.'
        );

        return;

    }


    /*
    لا نعتمد على هذا التوكن لإرسال الطلب.
    client-api.js هو المسؤول عن Authorization.
    */

    const token =
        getFrontendAuthToken();


    if (!token) {

        console.warn(
            '[TemplateCraft] No frontend auth token found.'
        );


        alert(
            'انتهت جلسة الدخول. يرجى تسجيل الدخول مجدداً.'
        );


        localStorage.removeItem(
            'token'
        );

        localStorage.removeItem(
            'authToken'
        );

        localStorage.removeItem(
            'templatecraft_token'
        );

        localStorage.removeItem(
            'user'
        );

        localStorage.removeItem(
            'templatecraft_user'
        );


        window.location.replace(
            'login.html'
        );


        return;

    }


    /* ================================================
       API CHECK
    ================================================ */

    if (
        typeof window.TemplateCraftAPI ===
        'undefined' ||

        typeof window.TemplateCraftAPI.deploy !==
        'function'
    ) {

        console.error(
            '[TemplateCraft] TemplateCraftAPI.deploy is unavailable.'
        );


        alert(
            'ملف client-api.js غير متصل أو خدمة النشر غير متاحة.'
        );


        return;

    }


    /*
    ================================================
    بدء عملية النشر الحقيقية
    ================================================
    */

    deploymentRunning = true;


    /* ================================================
       OPEN DEPLOYMENT OVERLAY
    ================================================ */

    openDeploymentOverlay();


    /* ================================================
       CLOSE CREATE MODAL
    ================================================ */

    const createModal =
        document.getElementById(
            'createModal'
        );


    if (createModal) {

        createModal.classList.remove(
            'show',
            'active'
        );


        createModal.style.display =
            'none';

    }


    /* ================================================
       HIDE OLD RESULT
    ================================================ */

    if (deploymentResultContainer) {

        deploymentResultContainer.classList.add(
            'hidden'
        );

    }


    /* ================================================
       START VISUAL STAGES
    ================================================ */

    startDeploymentStages();


    try {

        console.log(
            '[TemplateCraft] Starting deployment:',
            {
                siteName,
                templateId,
                projectType
            }
        );


        /* ============================================
           REAL API REQUEST

           POST /api/deploy

           {
               siteName,
               templateId,
               variables: {
                   projectType
               }
           }
        ============================================ */

        const result =
            await window.TemplateCraftAPI.deploy({

                siteName:
                    siteName,

                templateId:
                    templateId,

                variables: {

                    projectType:
                        projectType

                }

            });


        console.log(
            '[TemplateCraft] Deployment result:',
            result
        );


        /* ============================================
           CHECK API RESULT
        ============================================ */

        if (
            !result ||
            result.success !== true
        ) {

            const message =
                result?.error ||
                result?.message ||
                'تعذر إنشاء أو نشر الموقع.';


            console.error(
                '[TemplateCraft] Deployment failed:',
                {
                    status:
                        result?.status,

                    message,

                    result
                }
            );


            /*
            --------------------------------------------
            Authentication error
            --------------------------------------------
            */

            if (
                result?.status === 401 ||
                result?.status === 403 ||

                /token|unauthorized|غير مصرح|تسجيل الدخول|انتهت الجلسة/i.test(
                    message
                )
            ) {

                failDeployment(
                    'انتهت جلسة الدخول.'
                );


                localStorage.removeItem(
                    'token'
                );

                localStorage.removeItem(
                    'authToken'
                );

                localStorage.removeItem(
                    'templatecraft_token'
                );

                localStorage.removeItem(
                    'user'
                );

                localStorage.removeItem(
                    'templatecraft_user'
                );


                setTimeout(
                    function () {

                        window.location.replace(
                            'login.html'
                        );

                    },
                    1000
                );


                return;

            }


            throw new Error(
                message
            );

        }


        /* ============================================
           SUCCESS
        ============================================ */

        const siteData =
            getDeploymentSiteData(
                result
            );


        createdSiteId =
            siteData.siteId;


        publishedSiteUrl =
            siteData.url;


        console.log(
            '[TemplateCraft] Site created successfully:',
            siteData
        );


        /*
        =================================================
        مهم جداً:

        لا ننتظر SSL.

        نجاح /api/deploy
        =
        تم إنشاء ونشر الموقع بنجاح.

        SSL سيتم التحقق منه لاحقاً
        من صفحة المشاريع.
        =================================================
        */

        completeDeployment();


        /* ============================================
           SUCCESS MOMENT
        ============================================ */

        await new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    850
                );

            }
        );


        /* ============================================
           CLOSE OVERLAY
        ============================================ */

        closeDeploymentOverlay();


        /* ============================================
           GO TO PROFILE
        ============================================ */

        window.location.replace(
            'profile.html'
        );


    } catch (error) {

        console.error(
            '[TemplateCraft] Project deployment error:',
            error
        );


        failDeployment(
            error?.message ||
            'حدث خطأ أثناء إنشاء الموقع.'
        );


    } finally {

        deploymentRunning = false;

    }

}


/* ==================================================
   INITIALIZE DEPLOYMENT SYSTEM
================================================== */

function initializeDeploymentSystem() {

    /*
    --------------------------------------------------
    إنشاء واجهة المراحل
    --------------------------------------------------
    */

    createDeploymentStages();


    /*
    --------------------------------------------------
    منع التسجيل المكرر
    --------------------------------------------------
    */

    if (
        window.__templateCraftDeploymentInitialized
    ) {

        console.log(
            '[TemplateCraft] Deployment system already initialized.'
        );

        return;

    }


    /*
    --------------------------------------------------
    تسجيل Listener
    --------------------------------------------------
    */

    window.addEventListener(
        'templatecraft:create-project',
        handleCreateProject
    );


    /*
    --------------------------------------------------
    حفظ حالة التهيئة
    --------------------------------------------------
    */

    window.__templateCraftDeploymentInitialized =
        true;


    console.log(
        '[TemplateCraft] Deployment system initialized successfully.'
    );

}


/* ==================================================
   PUBLIC API
================================================== */

window.initializeDeploymentSystem =
    initializeDeploymentSystem;


window.openDeploymentOverlay =
    openDeploymentOverlay;


window.closeDeploymentOverlay =
    closeDeploymentOverlay;


window.getCreatedSiteId =
    function () {

        return createdSiteId;

    };


window.getPublishedSiteUrl =
    function () {

        return publishedSiteUrl;

    };


/* ==================================================
   AUTO INITIALIZATION
================================================== */

initializeDeploymentSystem();


console.log(
    '[TemplateCraft] create-project-deployment.js loaded.'
);
