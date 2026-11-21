'use strict';

/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - DEPLOYMENT
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
        message: 'جاري إنشاء المشروع وتجهيز بياناته...'
    },

    {
        id: 'prepare-template',
        title: 'تجهيز ملفات القالب',
        message: 'جاري تجهيز ملفات القالب والصفحات...'
    },

    {
        id: 'configure-site',
        title: 'إعداد الموقع',
        message: 'جاري تطبيق إعدادات المشروع والقالب...'
    },

    {
        id: 'connect-settings',
        title: 'ربط الإعدادات',
        message: 'جاري ربط إعدادات المشروع والاستضافة...'
    },

    {
        id: 'publish-netlify',
        title: 'نشر الموقع',
        message: 'جاري إنشاء ونشر الموقع على Netlify...'
    },

    {
        id: 'complete',
        title: 'إتمام',
        message: 'تم إنشاء الموقع بنجاح.'
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
                            class="deployment-stage"
                            data-stage-index="${index}"
                        >

                            <div
                                class="deployment-stage-icon"
                            >
                                <span class="stage-number">
                                    ${index + 1}
                                </span>

                                <span class="stage-check">
                                    ✓
                                </span>
                            </div>

                            <div
                                class="deployment-stage-content"
                            >

                                <strong>
                                    ${escapeDeploymentHtml(
                                        stage.title
                                    )}
                                </strong>

                                <span>
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


            if (stageIndex < index) {

                stage.classList.add(
                    'completed'
                );

            } else if (stageIndex === index) {

                stage.classList.add(
                    state
                );

            } else {

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


    updateDeploymentProgress(index);

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
   RESET
================================================== */

function resetDeployment() {

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer = null;

    }


    deployStageIndex = 0;

    deploymentRunning = false;

    publishedSiteUrl = null;

    createdSiteId = null;


    createDeploymentStages();


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


    updateDeploymentStage(
        0,
        'active'
    );

}


/* ==================================================
   OPEN DEPLOYMENT
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

}


/* ==================================================
   CLOSE DEPLOYMENT
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

}


/* ==================================================
   START STAGE SIMULATION
================================================== */

function startDeploymentStages() {

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

    }


    deployStageIndex = 0;


    updateDeploymentStage(
        0,
        'active'
    );


    deployStageTimer =
        setInterval(
            function () {

                if (!deploymentRunning) {
                    return;
                }


                /*
                لا ندخلو لمرحلة إتمام
                حتى يرجع API بالنجاح.
                */

                if (deployStageIndex >= 4) {

                    clearInterval(
                        deployStageTimer
                    );

                    deployStageTimer = null;

                    return;

                }


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

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer = null;

    }


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


    deployStageIndex =
        DEPLOY_STAGES.length - 1;


    if (deploymentTitle) {

        deploymentTitle.textContent =
            'تم إنشاء الموقع بنجاح 🎉';

    }


    if (deploymentMessage) {

        deploymentMessage.textContent =
            'تم إنشاء ونشر موقعك بنجاح على Netlify.';

    }


    if (deploymentProgress) {

        deploymentProgress.style.width =
            '100%';

    }

}


/* ==================================================
   FAILED DEPLOYMENT
================================================== */

function failDeployment(message) {

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer = null;

    }


    deploymentRunning = false;


    if (deploymentTitle) {

        deploymentTitle.textContent =
            'تعذر إنشاء الموقع';

    }


    if (deploymentMessage) {

        deploymentMessage.textContent =
            message ||
            'حدث خطأ أثناء إنشاء الموقع.';

    }


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
   GET AUTH TOKEN
==================================================

 مهم:

 ما نفرضوش غير token واحد هنا.

 client-api.js هو المسؤول الحقيقي على
 Authorization.

 هاد الجزء فقط كيتأكد أن المستخدم عنده جلسة.
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

    if (deploymentRunning) {

        console.warn(
            '[TemplateCraft] Deployment already running.'
        );

        return;

    }


    const detail =
        event?.detail ||
        {};


    const siteName =
        String(
            detail.siteName || ''
        ).trim();


    const templateId =
        detail.templateId ||
        detail.template?.id ||
        null;


    const projectType =
        detail.projectType ||
        detail.template?.projectType ||
        detail.template?.category ||
        '';


    /* -----------------------------------------------
       VALIDATION
    ----------------------------------------------- */

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
            'انتهت جلسة الدخول. المرجو تسجيل الدخول مجدداً.'
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


    /* -----------------------------------------------
       API CHECK
    ----------------------------------------------- */

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
            'ملف client-api.js غير متصل أو API النشر غير متوفر.'
        );


        return;

    }


    /*
    مهم جداً:

    هنا يبدأ deployment الحقيقي.
    */

    deploymentRunning = true;


    /* -----------------------------------------------
       OPEN OVERLAY
    ----------------------------------------------- */

    openDeploymentOverlay();


    /* -----------------------------------------------
       CLOSE CREATE MODAL
    ----------------------------------------------- */

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


    /* -----------------------------------------------
       HIDE OLD RESULT
    ----------------------------------------------- */

    if (deploymentResultContainer) {

        deploymentResultContainer.classList.add(
            'hidden'
        );

    }


    /* -----------------------------------------------
       START UI ANIMATION
    ----------------------------------------------- */

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


        /* ===========================================
           REAL API REQUEST

           POST /api/deploy

           {
               siteName,
               templateId,
               variables: {
                   projectType
               }
           }
        =========================================== */

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


        /* -------------------------------------------
           CHECK API RESULT
        ------------------------------------------- */

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
                    status: result?.status,
                    message,
                    result
                }
            );


            /*
            Authentication error
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


        /* -------------------------------------------
           SUCCESS
        ------------------------------------------- */

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
        مهم:

        ما كنستناوش SSL.

        نجاح /api/deploy
        =
        الموقع تنشأ وتـنشر بنجاح.

        SSL غادي يتعالج من بعد.
        =================================================
        */

        completeDeployment();


        /* -------------------------------------------
           SHOW SUCCESS MOMENT
        ------------------------------------------- */

        await new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    850
                );

            }
        );


        /* -------------------------------------------
           CLOSE
        ------------------------------------------- */

        closeDeploymentOverlay();


        /* -------------------------------------------
           PROFILE
        ------------------------------------------- */

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
    أنشئ مراحل الـ UI
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
   IMPORTANT AUTO INITIALIZATION
==================================================

 هادي هي النقطة اللي كانت ناقصة فملفك.

 create-project.js كيطلق:

 templatecraft:create-project

 خاص deployment.js يكون مسجل listener
 قبل ما المستخدم يضغط على "إنشاء الموقع".

 بما أن script ديال deployment كيتحمل فـ HTML،
 كنقومو بالـ initialization مباشرة هنا.
================================================== */

initializeDeploymentSystem();


console.log(
    '[TemplateCraft] create-project-deployment.js loaded.'
);
