'use strict';

let deployStageTimer = null;
let deployStageIndex = 0;
let deploymentRunning = false;
let publishedSiteUrl = null;
let createdSiteId = null;

const deploymentResultContainer = document.getElementById('createResult');
const deploymentOverlay = document.getElementById('deploymentOverlay');
const deploymentTitle = document.getElementById('deploymentTitle');
const deploymentMessage = document.getElementById('deploymentMessage');
const deploymentProgress = document.getElementById('deploymentProgress');

const DEPLOY_STAGES = [
    { id: 'create-project', title: 'إنشاء المشروع', message: 'جارٍ إنشاء المشروع وتجهيز بياناته...' },
    { id: 'prepare-template', title: 'تجهيز ملفات القالب', message: 'جارٍ تجهيز ملفات القالب والصفحات...' },
    { id: 'configure-site', title: 'إعداد الموقع', message: 'جارٍ تطبيق إعدادات المشروع والقالب...' },
    { id: 'connect-settings', title: 'ربط الإعدادات', message: 'جارٍ ربط إعدادات المشروع والاستضافة...' },
    { id: 'publish-netlify', title: 'نشر الموقع', message: 'جارٍ إنشاء ونشر الموقع على Netlify...' },
    { id: 'complete', title: 'إتمام الإنشاء', message: 'تم إنشاء الموقع ونشره بنجاح.' }
];

function escapeDeploymentHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function createDeploymentStages() {
    if (!deploymentOverlay) return;
    const card = deploymentOverlay.querySelector('.deployment-card');
    if (!card || card.querySelector('.deployment-stages')) return;

    const stages = document.createElement('div');
    stages.className = 'deployment-stages';
    stages.innerHTML = DEPLOY_STAGES.map((stage, index) => `
        <div class="deployment-stage pending" data-stage-index="${index}">
            <div class="deployment-stage-icon stage-icon">
                <span class="stage-number">${index + 1}</span>
                <span class="stage-check">✓</span>
            </div>
            <div class="deployment-stage-content stage-content">
                <strong class="stage-title">${escapeDeploymentHtml(stage.title)}</strong>
                <span class="stage-message">${escapeDeploymentHtml(stage.message)}</span>
            </div>
        </div>
    `).join('');

    const progressWrap = card.querySelector('.deployment-progress-wrap');
    if (progressWrap && progressWrap.nextSibling) {
        card.insertBefore(stages, progressWrap.nextSibling);
    } else {
        card.appendChild(stages);
    }
}

function updateDeploymentStage(index, state = 'active') {
    const stages = deploymentOverlay?.querySelectorAll('.deployment-stage');
    if (!stages) return;

    stages.forEach((stage, stageIndex) => {
        stage.classList.remove('active', 'completed', 'pending');
        if (stageIndex < index) stage.classList.add('completed');
        else if (stageIndex === index) stage.classList.add(state);
        else stage.classList.add('pending');
    });

    const stage = DEPLOY_STAGES[index];
    if (!stage) return;

    if (deploymentTitle) deploymentTitle.textContent = stage.title;
    if (deploymentMessage) deploymentMessage.textContent = stage.message;
    updateDeploymentProgress(index);
}

function updateDeploymentProgress(index) {
    if (!deploymentProgress) return;
    const total = DEPLOY_STAGES.length;
    const percentage = Math.max(5, Math.min(100, Math.round((index / (total - 1)) * 100)));
    deploymentProgress.style.width = `${percentage}%`;
}

function resetDeployment() {
    if (deployStageTimer) {
        clearInterval(deployStageTimer);
        deployStageTimer = null;
    }
    deployStageIndex = 0;
    deploymentRunning = false;
    publishedSiteUrl = null;
    createdSiteId = null;

    createDeploymentStages();

    const stages = deploymentOverlay?.querySelectorAll('.deployment-stage');
    if (stages) {
        stages.forEach((stage) => {
            stage.classList.remove('active', 'completed', 'pending');
            stage.classList.add('pending');
        });
    }

    const card = deploymentOverlay?.querySelector('.deployment-card');
    if (card) card.classList.remove('deployment-success', 'deployment-error');
    if (deploymentTitle) deploymentTitle.textContent = 'جارٍ إنشاء المشروع...';
    if (deploymentMessage) deploymentMessage.textContent = 'يرجى الانتظار، ولا تغلق هذه الصفحة.';
    if (deploymentProgress) deploymentProgress.style.width = '5%';

    updateDeploymentStage(0, 'active');
}

function openDeploymentOverlay() {
    resetDeployment();
    if (!deploymentOverlay) return;
    deploymentOverlay.classList.add('active');
    deploymentOverlay.style.display = 'flex';
    deploymentOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
}

function closeDeploymentOverlay() {
    if (!deploymentOverlay) return;
    deploymentOverlay.classList.remove('active');
    deploymentOverlay.style.display = 'none';
    deploymentOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
}

function startDeploymentStages() {
    if (deployStageTimer) {
        clearInterval(deployStageTimer);
        deployStageTimer = null;
    }
    deployStageIndex = 0;
    updateDeploymentStage(0, 'active');

    deployStageTimer = setInterval(() => {
        if (!deploymentRunning) return;
        if (deployStageIndex >= 4) {
            clearInterval(deployStageTimer);
            deployStageTimer = null;
            return;
        }
        deployStageIndex++;
        updateDeploymentStage(deployStageIndex, 'active');
    }, 2200);
}

function completeDeployment() {
    if (deployStageTimer) {
        clearInterval(deployStageTimer);
        deployStageTimer = null;
    }

    const card = deploymentOverlay?.querySelector('.deployment-card');
    if (card) {
        card.classList.remove('deployment-error');
        card.classList.add('deployment-success');
    }

    const stages = deploymentOverlay?.querySelectorAll('.deployment-stage');
    if (stages) {
        stages.forEach((stage) => {
            stage.classList.remove('active', 'pending');
            stage.classList.add('completed');
        });
    }

    deployStageIndex = DEPLOY_STAGES.length - 1;
    if (deploymentTitle) deploymentTitle.textContent = 'تم إنشاء الموقع بنجاح 🎉';
    if (deploymentMessage) deploymentMessage.textContent = 'تم إنشاء موقعك ونشره بنجاح على Netlify.';
    if (deploymentProgress) deploymentProgress.style.width = '100%';
}

function failDeployment(message) {
    if (deployStageTimer) {
        clearInterval(deployStageTimer);
        deployStageTimer = null;
    }
    deploymentRunning = false;

    const card = deploymentOverlay?.querySelector('.deployment-card');
    if (card) {
        card.classList.remove('deployment-success');
        card.classList.add('deployment-error');
    }

    if (deploymentTitle) deploymentTitle.textContent = 'تعذر إنشاء الموقع';
    if (deploymentMessage) deploymentMessage.textContent = message || 'حدث خطأ أثناء إنشاء الموقع.';

    setTimeout(() => closeDeploymentOverlay(), 1400);
}

function getDeploymentSiteData(result) {
    const site = result?.site || result?.data?.site || result?.data || result?.project || result || {};
    return {
        siteId: site.siteId || site._id || site.id || result?.siteId || result?.id || null,
        url: site.url || site.liveUrl || site.siteUrl || site.deployUrl || result?.url || result?.liveUrl || result?.siteUrl || null,
        netlifySiteId: site.netlifySiteId || result?.netlifySiteId || null,
        name: site.siteName || site.name || result?.siteName || null
    };
}

function getFrontendAuthToken() {
    return (
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('templatecraft_token') ||
        ''
    );
}

async function handleCreateProject(event) {
    if (deploymentRunning) return;

    const detail = event?.detail || {};
    const siteName = String(detail.siteName || '').trim();
    const templateId = detail.templateId || detail.template?.id || null;
    const projectType = detail.projectType || detail.template?.projectType || detail.template?.category || '';

    if (!siteName) {
        alert('اسم المشروع غير موجود.');
        return;
    }

    if (!templateId) {
        alert('القالب غير محدد.');
        return;
    }

    const token = getFrontendAuthToken();
    if (!token) {
        alert('انتهت جلسة الدخول. يرجى تسجيل الدخول مجدداً.');
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('templatecraft_token');
        localStorage.removeItem('user');
        localStorage.removeItem('templatecraft_user');
        window.location.replace('login.html');
        return;
    }

    if (typeof window.TemplateCraftAPI === 'undefined' || typeof window.TemplateCraftAPI.deploy !== 'function') {
        alert('ملف client-api.js غير متصل أو خدمة النشر غير متاحة.');
        return;
    }

    deploymentRunning = true;
    openDeploymentOverlay();

    const createModal = document.getElementById('createModal');
    if (createModal) {
        createModal.classList.remove('show', 'active');
        createModal.style.display = 'none';
    }

    if (deploymentResultContainer) {
        deploymentResultContainer.classList.add('hidden');
    }

    startDeploymentStages();

    try {
        const result = await window.TemplateCraftAPI.deploy({
            siteName,
            templateId,
            variables: { projectType }
        });

        if (!result || result.success !== true) {
            const message = result?.error || result?.message || 'تعذر إنشاء أو نشر الموقع.';
            if (result?.status === 401 || result?.status === 403 || /token|unauthorized|غير مصرح|تسجيل الدخول|انتهت الجلسة/i.test(message)) {
                failDeployment('انتهت جلسة الدخول.');
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                localStorage.removeItem('templatecraft_token');
                localStorage.removeItem('user');
                localStorage.removeItem('templatecraft_user');
                setTimeout(() => window.location.replace('login.html'), 1000);
                return;
            }
            throw new Error(message);
        }

        const siteData = getDeploymentSiteData(result);
        createdSiteId = siteData.siteId;
        publishedSiteUrl = siteData.url;

        completeDeployment();
        await new Promise((resolve) => setTimeout(resolve, 850));
        closeDeploymentOverlay();
        window.location.replace('profile.html');
    } catch (error) {
        failDeployment(error?.message || 'حدث خطأ أثناء إنشاء الموقع.');
    } finally {
        deploymentRunning = false;
    }
}

function initializeDeploymentSystem() {
    createDeploymentStages();
    if (window.__templateCraftDeploymentInitialized) return;
    window.addEventListener('templatecraft:create-project', handleCreateProject);
    window.__templateCraftDeploymentInitialized = true;
}

window.initializeDeploymentSystem = initializeDeploymentSystem;
window.openDeploymentOverlay = openDeploymentOverlay;
window.closeDeploymentOverlay = closeDeploymentOverlay;
window.getCreatedSiteId = () => createdSiteId;
window.getPublishedSiteUrl = () => publishedSiteUrl;

initializeDeploymentSystem();
