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
    document.getElementById(
        'createResult'
    );

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
        document.createElement(
            'div'
        );


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
        deploymentProgress
            ?.parentElement;


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
   UPDATE STAGE UI
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


            if (
                stageIndex < index
            ) {

                stage.classList.add(
                    'completed'
                );

            } else if (
                stageIndex === index
            ) {

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


    updateDeploymentProgress(
        index
    );

}


/* ==================================================
   PROGRESS
================================================== */

function updateDeploymentProgress(
    index
) {

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
                    ) *
                    100
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

        deployStageTimer =
            null;

    }


    deployStageIndex =
        0;


    deploymentRunning =
        false;


    publishedSiteUrl =
        null;


    createdSiteId =
        null;


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


    if (deploymentOverlay) {

        deploymentOverlay.classList.add(
            'active'
        );

        deploymentOverlay.setAttribute(
            'aria-hidden',
            'false'
        );

    }

}


/* ==================================================
   CLOSE DEPLOYMENT
================================================== */

function closeDeploymentOverlay() {

    if (deploymentOverlay) {

        deploymentOverlay.classList.remove(
            'active'
        );

        deploymentOverlay.setAttribute(
            'aria-hidden',
            'true'
        );

    }

}


/* ==================================================
   START STAGE SIMULATION
==================================================

 ملاحظة:

 هاد timer غير كيعطي animation للواجهة.

 ما كيقرر والو على نجاح Netlify.

 النجاح الحقيقي كيجي من API.
================================================== */

function startDeploymentStages() {

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

    }


    deployStageIndex =
        0;


    updateDeploymentStage(
        0,
        'active'
    );


    deployStageTimer =
        setInterval(
            function () {

                if (
                    !deploymentRunning
                ) {

                    return;

                }


                /*
                ما ندخلوش لمرحلة النجاح
                حتى يرجع API.
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
                قبل Netlify:
                1 → 2 → 3 → 4 → 5
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

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer =
            null;

    }


    /*
    جميع المراحل السابقة completed
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
    آخر مرحلة = إتمام
    */

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

function failDeployment(
    message
) {

    if (deployStageTimer) {

        clearInterval(
            deployStageTimer
        );

        deployStageTimer =
            null;

    }


    deploymentRunning =
        false;


    if (deploymentTitle) {

        deploymentTitle.textContent =
            'تعذر إنشاء الموقع';

    }


    if (deploymentMessage) {

        deploymentMessage.textContent =
            message ||
            'حدث خطأ أثناء إنشاء الموقع.';

    }


    /*
    بعد شوية نسدو نافذة التجهيز
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

function getDeploymentSiteData(
    result
) {

    const site =
        result?.site ||
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
   HANDLE CREATE EVENT
================================================== */

async function handleCreateProject(
    event
) {

    if (
        deploymentRunning
    ) {

        return;

    }


    const detail =
        event?.detail ||
        {};


    const siteName =
        String(
            detail.siteName ||
            ''
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


    const token =
        localStorage.getItem(
            'token'
        );


    if (!token) {

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

        alert(
            'ملف client-api.js غير متصل أو API النشر غير متوفر.'
        );

        return;

    }


    deploymentRunning =
        true;


    /*
    --------------------------------------------------
    افتح نافذة التجهيز
    --------------------------------------------------
    */

    openDeploymentOverlay();


    /*
    --------------------------------------------------
    تأكد أن modal التأكيد تسد
    --------------------------------------------------
    */

    const createModal =
        document.getElementById(
            'createModal'
        );


    if (createModal) {

        createModal.classList.remove(
            'show',
            'active'
        );

    }


    /*
    --------------------------------------------------
    أخفي النتيجة القديمة
    --------------------------------------------------
    */

    if (deploymentResultContainer) {

        deploymentResultContainer.classList.add(
            'hidden'
        );

    }


    /*
    --------------------------------------------------
    Animation
    --------------------------------------------------
    */

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


        /*
        ------------------------------------------------
        API DEPLOY
        ------------------------------------------------
        */

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


        /*
        ------------------------------------------------
        تحقق من النتيجة
        ------------------------------------------------
        */

        if (
            !result ||
            result.success !== true
        ) {

            const message =
                result?.error ||
                result?.message ||
                'تعذر إنشاء أو نشر الموقع.';


            /*
            Authentication
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
                    'user'
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


        /*
        ------------------------------------------------
        الموقع تم إنشاؤه بنجاح
        ------------------------------------------------
        */

        const siteData =
            getDeploymentSiteData(
                result
            );


        createdSiteId =
            siteData.siteId;


        publishedSiteUrl =
            siteData.url;


        /*
        ------------------------------------------------
        مهم جداً:

        ما نسناوش SSL.

        نجاح Netlify = نجاح الإنشاء.
        ------------------------------------------------
        */

        completeDeployment();


        /*
        ------------------------------------------------
        نعطي الواجهة لحظة قصيرة باش تبين ✓
        ------------------------------------------------
        */

        await new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    850
                );

            }
        );


        /*
        ------------------------------------------------
        CLOSE
        ------------------------------------------------
        */

        closeDeploymentOverlay();


        /*
        ------------------------------------------------
        انتقال إلى صفحة المشاريع
        ------------------------------------------------
        */

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

        deploymentRunning =
            false;

    }

}


/* ==================================================
   SAFE HTML
================================================== */

function escapeDeploymentHtml(
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


/* ==================================================
   INITIALIZE
================================================== */

function initializeDeploymentSystem() {

    /*
    --------------------------------------------------
    مهم:

    ما نربطوش createProjectBtn
    وما نربطوش confirmCreateBtn.

    create-project.js هو المسؤول عليهم.

    هنا نستقبل فقط الحدث:
    templatecraft:create-project
    --------------------------------------------------
    */

    createDeploymentStages();


    /*
    منع التسجيل المكرر
    */

    if (
        window.__templateCraftDeploymentInitialized
    ) {

        return;

    }


    window.__templateCraftDeploymentInitialized =
        true;


    window.addEventListener(
        'templatecraft:create-project',
        handleCreateProject
    );


    console.log(
        '[TemplateCraft] Deployment system initialized'
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
