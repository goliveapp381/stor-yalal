
'use strict';


// ==========================================
// 1. CONFIGURATION
// ==========================================

// رابط Backend الحقيقي على Render
const EDITOR_API_BASE_URL = (
    window.TEMPLATECRAFT_API_URL ||
    'https://templatecraft-backend.onrender.com'
).replace(/\/+$/, '');

const params = new URLSearchParams(window.location.search);

const siteId = params.get('siteId');

const storedUser = localStorage.getItem('user');

let user = null;
let currentSite = null;
let projectFiles = [];
let currentFile = null;

let selectedElement = null;

let notificationTimer = null;
let isSaving = false;
let frameReady = false;
let expectedFrameOrigin = null;


// ==========================================
// 2. ELEMENTS
// ==========================================

const frame = document.getElementById('site-frame');

const notification = document.getElementById('notification');

const saveStatus = document.getElementById('save-status');

const codeEditor = document.getElementById('code-editor');

const saveButton = document.getElementById('save-button');
const publishButton = document.getElementById('publish-button');
const publishLink = document.getElementById('publish-link');

const saveFileButton = document.getElementById('save-file-button');


// ==========================================
// 3. AUTHENTICATION
// ==========================================

try {
    user = JSON.parse(storedUser);
} catch (error) {
    user = null;
}

if (!user) {
    window.location.href = 'login.html';
}

const userId = user?.id || user?._id;

if (!siteId) {
    alert('معرف المشروع غير موجود.');
    window.location.href = 'profile.html';
}


// ==========================================
// 4. NOTIFICATIONS
// ==========================================

function showNotification(message, success = true) {

    notification.textContent = message;

    notification.classList.remove(
        'hidden',
        'bg-red-600',
        'bg-gray-900'
    );

    notification.classList.add(
        success ? 'bg-gray-900' : 'bg-red-600'
    );

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {
        notification.classList.add('hidden');
    }, 3500);
}


function setSaveStatus(message) {
    saveStatus.textContent = message;
}


// ==========================================
// 5. API CHECK
// ==========================================

function checkAPI() {

    if (typeof TemplateCraftAPI === 'undefined') {
        throw new Error('ملف client-api.js غير محمل');
    }

    const requiredMethods = [
        'getSite',
        'getSiteFiles',
        'saveSiteFile',
        'updateSite',
        'publish'
    ];

    for (const method of requiredMethods) {

        if (typeof TemplateCraftAPI[method] !== 'function') {
            throw new Error(
                `الدالة ${method} غير موجودة في client-api.js`
            );
        }

    }
}


// ==========================================
// 6. PREVIEW URL
// ==========================================

function getPreviewUrl() {

    if (!currentSite) {
        throw new Error('المشروع غير محمل');
    }

    const url = currentSite.liveUrl ||
        `${EDITOR_API_BASE_URL}/sites/${encodeURIComponent(currentSite.siteName)}/index.html`;

    const parsed = new URL(url, window.location.href);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('رابط المعاينة غير صالح');
    }

    parsed.searchParams.set('_preview', Date.now());

    return parsed.href;
}


// ==========================================
// 7. EDITOR BRIDGE COMMUNICATION
// ==========================================

function getFrameOrigin() {

    try {

        const previewUrl = getPreviewUrl();

        return new URL(previewUrl).origin;

    } catch (error) {

        return null;

    }

}


function sendMessageToFrame(type, data = {}) {

    if (!frame.contentWindow) {
        return false;
    }

    const origin = expectedFrameOrigin || getFrameOrigin();

    if (!origin) {
        return false;
    }

    frame.contentWindow.postMessage(
        {
            source: 'templatecraft-editor',
            type,
            ...data
        },
        origin
    );

    return true;
}


function enableVisualEditor() {

    if (!frame.contentWindow) return;

    expectedFrameOrigin = getFrameOrigin();

    if (!expectedFrameOrigin) return;

    frameReady = true;

    sendMessageToFrame('SET_EDIT_MODE', {
        enabled: true
    });

    console.log('TemplateCraft Editor Bridge: enabled');

}


function disableVisualEditor() {

    sendMessageToFrame('SET_EDIT_MODE', {
        enabled: false
    });

    frameReady = false;

}


// ==========================================
// 8. RECEIVE MESSAGES FROM IFRAME
// ==========================================

window.addEventListener('message', function(event) {

    // قبول الرسائل فقط من iframe الخاص بالمشروع
    if (event.source !== frame.contentWindow) {
        return;
    }

    const expectedOrigin = expectedFrameOrigin || getFrameOrigin();

    if (!expectedOrigin || event.origin !== expectedOrigin) {
        console.warn('تم رفض رسالة من مصدر غير معروف');
        return;
    }

    const data = event.data;

    if (!data || data.source !== 'templatecraft-editor-bridge') {
        return;
    }


    // Bridge ready
    if (data.type === 'BRIDGE_READY') {

        enableVisualEditor();

        showNotification('تم الاتصال بمعاينة الموقع');

        return;
    }


    // Element selected
    if (data.type === 'ELEMENT_SELECTED') {

        selectedElement = {
            selector: data.selector || '',
            tagName: data.tagName || 'element',
            text: data.text || '',
            src: data.src || '',
            alt: data.alt || '',
            href: data.href || '',
            color: data.color || '#333333',
            fontSize: data.fontSize || 16
        };

        document.getElementById('selected-element').textContent =
            `${selectedElement.tagName} — ${selectedElement.selector || 'عنصر محدد'}`;

        document.getElementById('element-text').value =
            selectedElement.text;

        document.getElementById('element-image').value =
            selectedElement.src;

        document.getElementById('element-link').value =
            selectedElement.href;

        document.getElementById('element-color').value =
            rgbToHex(selectedElement.color);

        document.getElementById('element-size').value =
            parseInt(selectedElement.fontSize) || 16;

        activateTab('element');

        return;
    }


    // Element updated
    if (data.type === 'ELEMENT_UPDATED') {

        showNotification('تم تطبيق التعديلات على المعاينة');

        return;
    }

});


// ==========================================
// 9. REFRESH PREVIEW
// ==========================================

function refreshPreview(showMessage = false) {

    try {

        disableVisualEditor();

        const url = getPreviewUrl();

        expectedFrameOrigin = new URL(url).origin;

        frame.src = url;

        if (showMessage) {
            showNotification('جاري تحديث المعاينة...');
        }

    } catch (error) {

        showNotification(error.message, false);

    }

}


// ==========================================
// 10. IFRAME LOAD
// ==========================================

frame.addEventListener('load', function() {

    frameReady = false;

    expectedFrameOrigin = getFrameOrigin();

    // نرسل التفعيل حتى إذا لم يرسل Bridge رسالة BRIDGE_READY
    setTimeout(() => {

        if (frame.contentWindow) {
            enableVisualEditor();
        }

    }, 300);

});


// ==========================================
// 11. LOAD PROJECT
// ==========================================

async function loadProject() {

    try {

        checkAPI();

        if (!userId) {
            throw new Error('معرف المستخدم غير موجود');
        }

        setSaveStatus('جاري تحميل المشروع...');

        const result = await TemplateCraftAPI.getSite(
            siteId,
            userId
        );

        if (!result || !result.success || !result.site) {
            throw new Error(
                result?.error || 'تعذر تحميل المشروع'
            );
        }

        currentSite = result.site;

        const projectName =
            currentSite.variables?.displayName ||
            currentSite.siteName ||
            'مشروع بدون اسم';

        document.getElementById('project-name').value = projectName;

        document.getElementById('project-title').textContent = projectName;

        refreshPreview();

        await loadProjectFiles();

        setSaveStatus('تم تحميل المشروع');

    } catch (error) {

        console.error(error);

        showNotification(error.message, false);

        setSaveStatus('تعذر تحميل المشروع');

    }

}


// ==========================================
// 12. LOAD PROJECT FILES
// ==========================================

async function loadProjectFiles() {

    const container = document.getElementById('files-list');

    container.innerHTML =
        '<p class="text-gray-400 text-xs">جاري تحميل الملفات...</p>';

    try {

        const result = await TemplateCraftAPI.getSiteFiles(
            siteId,
            userId
        );

        if (!result || !result.success) {
            throw new Error(
                result?.error || 'تعذر جلب الملفات'
            );
        }

        projectFiles = result.files || [];

        container.innerHTML = '';

        if (!projectFiles.length) {

            container.innerHTML =
                '<p class="text-gray-400 text-xs">لا توجد ملفات.</p>';

            return;
        }

        projectFiles.forEach(file => {

            const path = typeof file === 'string'
                ? file
                : file.path;

            if (!path) return;

            const button = document.createElement('button');

            button.type = 'button';

            button.className =
                'w-full text-right p-3 bg-gray-50 hover:bg-purple-50 rounded-lg border text-xs break-all';

            button.textContent = '📄 ' + path;

            button.addEventListener('click', () => {
                loadFile(path);
            });

            container.appendChild(button);

        });

    } catch (error) {

        console.error(error);

        container.innerHTML = '';

        const errorText = document.createElement('p');

        errorText.className = 'text-red-500 text-xs';

        errorText.textContent = error.message;

        container.appendChild(errorText);

    }

}


// ==========================================
// 13. SAFE FILE URL
// ==========================================

function getFileUrl(filePath) {

    const safePath = filePath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    return `${EDITOR_API_BASE_URL}/sites/${encodeURIComponent(currentSite.siteName)}/${safePath}`;

}


// ==========================================
// 14. LOAD FILE CONTENT
// ==========================================

async function loadFile(filePath) {

    try {

        const file = projectFiles.find(item => {

            return (
                typeof item === 'string'
                    ? item
                    : item.path
            ) === filePath;

        });

        if (!file) {
            throw new Error('الملف غير موجود في القائمة');
        }

        if (
            file.type &&
            file.type !== 'text' &&
            file.type !== 'code'
        ) {
            throw new Error('هذا الملف ليس ملفاً نصياً قابلاً للتحرير');
        }

        const response = await fetch(
            getFileUrl(filePath),
            {
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error('تعذر قراءة الملف');
        }

        const content = await response.text();

        currentFile = filePath;

        codeEditor.value = content;

        document.getElementById('current-file').textContent =
            '📄 ' + filePath;

        activateTab('code');

        setSaveStatus('تم تحميل الملف');

    } catch (error) {

        console.error(error);

        showNotification(error.message, false);

    }

}


// ==========================================
// 15. SAVE CURRENT FILE
// ==========================================

async function saveCurrentFile(options = {}) {

    const showMessage = options.showMessage !== false;

    if (!currentFile) {

        if (showMessage) {
            showNotification('اختر ملفاً أولاً', false);
        }

        return false;
    }

    try {

        setSaveStatus('جاري حفظ الملف...');

        saveFileButton.disabled = true;

        const result = await TemplateCraftAPI.saveSiteFile(
            siteId,
            {
                userId,
                filePath: currentFile,
                content: codeEditor.value
            }
        );

        if (!result || !result.success) {
            throw new Error(
                result?.error || 'تعذر حفظ الملف'
            );
        }

        setSaveStatus('تم حفظ الملف');

        if (showMessage) {

            showNotification(
                'تم حفظ الملف بنجاح. يمكنك الآن معاينة التعديلات.'
            );

        }

        return true;

    } catch (error) {

        console.error(error);

        setSaveStatus('فشل الحفظ');

        if (showMessage) {
            showNotification(error.message, false);
        }

        return false;

    } finally {

        saveFileButton.disabled = false;

    }

}


// ==========================================
// 16. UPDATE PROJECT NAME
// ==========================================

async function saveProjectName() {

    const name = document
        .getElementById('project-name')
        .value
        .trim();

    if (!name) {
        throw new Error('أدخل اسم المشروع');
    }

    const result = await TemplateCraftAPI.updateSite(
        siteId,
        {
            userId,
            siteName: name
        }
    );

    if (!result || !result.success) {
        throw new Error(
            result?.error || 'تعذر تحديث اسم المشروع'
        );
    }

    currentSite.variables = {
        ...(currentSite.variables || {}),
        displayName: name
    };

    document.getElementById('project-title').textContent = name;

    return true;

}


// ==========================================
// 17. SAVE ALL
// ==========================================

async function saveAll() {

    if (isSaving) return;

    isSaving = true;

    saveButton.disabled = true;

    try {

        setSaveStatus('جاري حفظ التعديلات...');

        if (currentFile) {

            const fileSaved = await saveCurrentFile({
                showMessage: false
            });

            if (!fileSaved) {
                throw new Error('تعذر حفظ الملف المفتوح');
            }

        }

        await saveProjectName();

        setSaveStatus('تم الحفظ بنجاح');

        showNotification(
            'تم حفظ التعديلات بنجاح. اضغط على معاينة لمشاهدة النتيجة.'
        );

    } catch (error) {

        console.error(error);

        setSaveStatus('فشل الحفظ');

        showNotification(error.message, false);

    } finally {

        isSaving = false;

        saveButton.disabled = false;

    }

}


// ==========================================

// ==========================================
// PUBLISH PROJECT TO NETLIFY
// ==========================================

async function publishProject() {

    if (isSaving) {
        showNotification('Ø§Ù†ØªØ¸Ø± Ø­ØªÙ‰ ØªÙ†ØªÙ‡ÙŠ Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø­ÙØ¸ Ø§Ù„Ø­Ø§Ù„ÙŠØ©.', false);
        return;
    }

    if (!currentSite || !siteId || !userId) {
        showNotification('Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ Ø£Ùˆ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø©.', false);
        return;
    }

    const confirmed = window.confirm(
        'Ø³ÙŠØªÙ… Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø«Ù… Ù†Ø´Ø± Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø¹Ù„Ù‰ Netlify. Ù‡Ù„ ØªØ±ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©ØŸ'
    );

    if (!confirmed) return;

    isSaving = true;
    publishButton.disabled = true;
    saveButton.disabled = true;

    try {

        checkAPI();

        setSaveStatus('Ø¬Ø§Ø±ÙŠ ØªØ¬Ù‡ÙŠØ² Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ù„Ù„Ù†Ø´Ø±...');

        // Save currently opened file
        if (currentFile) {
            const fileSaved = await saveCurrentFile({
                showMessage: false
            });

            if (!fileSaved) {
                throw new Error('ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…ÙØªÙˆØ­. Ù„Ù… ÙŠØªÙ… Ø§Ù„Ù†Ø´Ø±.');
            }
        }

        // Save project name
        await saveProjectName();

        setSaveStatus('Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù†Ø´Ø± Ø¹Ù„Ù‰ Netlify...');

        const result = await TemplateCraftAPI.publish(
            siteId,
            userId
        );

        if (!result || !result.success) {
            throw new Error(
                result?.error || 'ÙØ´Ù„ Ù†Ø´Ø± Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø¹Ù„Ù‰ Netlify'
            );
        }

        const liveUrl = result.liveUrl || result.url;

        if (!liveUrl) {
            throw new Error(
                'Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø§Ù„Ø®Ø§Ø¯Ù… Ø±Ø§Ø¨Ø· Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ù…Ù†Ø´ÙˆØ±. ØªØ­Ù‚Ù‚ Ù…Ù† Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø´Ø±.'
            );
        }

        const parsedUrl = new URL(liveUrl);

        if (
            parsedUrl.protocol !== 'https:' &&
            parsedUrl.protocol !== 'http:'
        ) {
            throw new Error('Ø±Ø§Ø¨Ø· Ø§Ù„Ù†Ø´Ø± ØºÙŠØ± ØµØ§Ù„Ø­.');
        }

        currentSite.liveUrl = parsedUrl.href;
        currentSite.publishStatus = result.publishStatus || 'published';

        publishLink.href = parsedUrl.href;
        publishLink.classList.remove('hidden');

        setSaveStatus('ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ù†ØªÙŠØ¬Ø© Ø§Ù„Ù†Ø´Ø± Ø¨Ù†Ø¬Ø§Ø­');

        showNotification(
            'ØªÙ… Ø§Ù„Ù†Ø´Ø± Ø­Ø³Ø¨ Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø®Ø§Ø¯Ù…. Ø§ÙØªØ­ Ø§Ù„Ø±Ø§Ø¨Ø· Ù„Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù…ÙˆÙ‚Ø¹.'
        );

        console.log('Netlify publish result:', result);

    } catch (error) {

        console.error('Publish error:', error);

        setSaveStatus('ÙØ´Ù„ Ø§Ù„Ù†Ø´Ø±');

        showNotification(
            error.message || 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ù†Ø´Ø±.',
            false
        );

    } finally {

        isSaving = false;
        publishButton.disabled = false;
        saveButton.disabled = false;

    }
}


// ==========================================
// END NETLIFY PUBLISH
// ==========================================

// 18. EDITOR TABS
// ==========================================

function activateTab(tabName) {

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    const targetTab = document.getElementById(
        `${tabName}-tab`
    );

    const targetButton = document.querySelector(
        `[data-tab="${tabName}"]`
    );

    if (targetTab) {
        targetTab.classList.remove('hidden');
    }

    if (targetButton) {
        targetButton.classList.add('active');
    }

}


document.querySelectorAll('.tab-button').forEach(button => {

    button.addEventListener('click', () => {
        activateTab(button.dataset.tab);
    });

});


// ==========================================
// 19. COLOR CONVERTER
// ==========================================

function rgbToHex(color) {

    if (!color) return '#333333';

    if (color.startsWith('#')) {
        return color;
    }

    const values = color.match(/\d+/g);

    if (!values || values.length < 3) {
        return '#333333';
    }

    return '#' + values.slice(0, 3).map(value => {

        return Number(value)
            .toString(16)
            .padStart(2, '0');

    }).join('');

}


// ==========================================
// 20. VALIDATE URL
// ==========================================

function validateHttpUrl(value) {

    if (!value) return '';

    const parsed = new URL(
        value,
        window.location.origin
    );

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('الرابط غير صالح');
    }

    return parsed.href;

}


// ==========================================
// 21. APPLY VISUAL CHANGES
// ==========================================

document.getElementById('apply-element').addEventListener(
    'click',
    function() {

        if (!selectedElement || !selectedElement.selector) {

            showNotification(
                'اختر عنصراً من معاينة الموقع أولاً.',
                false
            );

            return;
        }

        const text = document.getElementById('element-text').value;

        const imageInput = document
            .getElementById('element-image')
            .value
            .trim();

        const linkInput = document
            .getElementById('element-link')
            .value
            .trim();

        const color = document.getElementById('element-color').value;

        const size = Number(
            document.getElementById('element-size').value
        );

        let image = '';
        let link = '';

        try {

            if (imageInput) {
                image = validateHttpUrl(imageInput);
            }

            if (linkInput) {
                link = validateHttpUrl(linkInput);
            }

        } catch (error) {

            showNotification(error.message, false);

            return;

        }

        if (size < 8 || size > 100 || !Number.isFinite(size)) {

            showNotification(
                'حجم الخط يجب أن يكون بين 8 و100.',
                false
            );

            return;
        }

        const updateData = {
            selector: selectedElement.selector,
            text,
            src: image,
            href: link,
            color,
            fontSize: size
        };

        const sent = sendMessageToFrame(
            'UPDATE_ELEMENT',
            updateData
        );

        if (!sent) {

            showNotification(
                'تعذر الاتصال بمعاينة الموقع. حدّث المعاينة.',
                false
            );

            return;
        }

        showNotification(
            'تم إرسال التعديلات إلى المعاينة. لحفظها بشكل دائم، عدّل الملف من تبويب الكود.'
        );

    }
);


// ==========================================
// 22. BUTTON EVENTS
// ==========================================

saveButton.addEventListener('click', saveAll);
publishButton.addEventListener('click', publishProject);


saveFileButton.addEventListener('click', async function() {

    const saved = await saveCurrentFile();

    if (saved) {
        setSaveStatus('تم الحفظ - في انتظار المعاينة');
    }

});


document.getElementById('reload-preview').addEventListener(
    'click',
    function() {

        refreshPreview(true);

    }
);


document.getElementById('preview-button').addEventListener(
    'click',
    function() {

        try {

            const previewUrl = getPreviewUrl();

            window.open(
                previewUrl,
                '_blank',
                'noopener,noreferrer'
            );

            showNotification(
                'تم فتح المعاينة. التغييرات المحفوظة فقط هي التي ستظهر.'
            );

        } catch (error) {

            showNotification(error.message, false);

        }

    }
);


document.getElementById('desktop-preview').addEventListener(
    'click',
    function() {

        frame.style.width = '100%';

        frame.style.maxWidth = '100%';

        showNotification('تم تفعيل معاينة سطح المكتب');

    }
);


// ==========================================
// 23. START EDITOR
// ==========================================

if (userId && siteId) {
    loadProject();
}

