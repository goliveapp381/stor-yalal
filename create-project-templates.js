/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - TEMPLATES
====================================================

 مسؤول عن:
 - Templates
 - Load Templates From Backend
 - Select Template
 - Preview
 - Close Preview
 - Choose From Preview
 - Category Change

====================================================
*/


'use strict';


// ================================================
// 1. TEMPLATE CONFIGURATION
// ================================================

// Templates are now loaded from TemplateCraft Backend.
// No hardcoded template list is used here.

let templateList = [];

let selectedTemplateId = null;

let previewTemplateId = null;


// ================================================
// 2. TEMPLATE LOADING STATE
// ================================================

let templatesLoading = false;

let templatesLoaded = false;


// ================================================
// 3. ELEMENTS
// ================================================

const templateGridElement =
    document.getElementById(
        'templatesGrid'
    );

const projectTypeElement =
    document.getElementById(
        'projectTypeSelect'
    );

const selectedLabelElement =
    document.getElementById(
        'selectedLabel'
    );

const previewModalElement =
    document.getElementById(
        'previewModal'
    );

const previewFrameElement =
    document.getElementById(
        'previewFrame'
    );

const previewLoadingElement =
    document.getElementById(
        'previewLoading'
    );

const previewErrorElement =
    document.getElementById(
        'previewError'
    );

const resultContainerElement =
    document.getElementById(
        'resultContainer'
    );


// ================================================
// 4. API HELPER
// ================================================

function getTemplateAPI() {

    if (
        window.TemplateCraftAPI &&
        typeof window.TemplateCraftAPI.getTemplates ===
            'function'
    ) {

        return window.TemplateCraftAPI;

    }


    if (
        window.templateCraftAPI &&
        typeof window.templateCraftAPI.getTemplates ===
            'function'
    ) {

        return window.templateCraftAPI;

    }


    return null;

}


// ================================================
// 5. NORMALIZE TEMPLATE
// ================================================

function normalizeTemplate(
    template,
    index
) {

    if (!template) {

        return null;

    }


    const id =
        String(
            template.id ||
            template.templateId ||
            ''
        ).trim();


    if (!id) {

        return null;

    }


    const name =
        String(
            template.name ||
            `القالب ${index + 1}`
        );


    const description =
        String(
            template.description ||
            'تصميم احترافي'
        );


    const projectType =
        String(
            template.projectType ||
            template.category ||
            ''
        );


    const preview =
        String(
            template.previewUrl ||
            template.preview ||
            ''
        );


    const thumbnail =
        String(
            template.thumbnail ||
            ''
        );


    return {

        ...template,

        id,

        name,

        description,

        projectType,

        previewUrl:
            preview,

        thumbnail

    };

}


// ================================================
// 6. GET CURRENT PROJECT TYPE
// ================================================

function getCurrentProjectType() {

    if (
        !projectTypeElement
    ) {

        return '';

    }


    return String(
        projectTypeElement.value ||
        ''
    ).trim();

}


// ================================================
// 7. FILTER TEMPLATES BY CATEGORY
// ================================================

function getFilteredTemplates() {

    const projectType =
        getCurrentProjectType();


    if (!projectType) {

        return templateList;

    }


    const filtered =
        templateList.filter(
            function(template) {

                if (
                    !template.projectType
                ) {

                    return true;

                }


                return (
                    template.projectType
                        .toLowerCase() ===
                    projectType.toLowerCase()
                );

            }
        );


    /*
    ================================================
    FALLBACK
    ================================================

    إذا الـBackend رجع templates بدون
    projectType واضح، ما نخليوش Grid فارغ.

    ================================================
    */

    if (
        filtered.length === 0
    ) {

        return templateList;

    }


    return filtered;

}


// ================================================
// 8. GET TEMPLATE BY ID
// ================================================

function getTemplateById(
    templateId
) {

    return templateList.find(
        function(template) {

            return template.id ===
                templateId;

        }
    );

}


// ================================================
// 9. GET PREVIEW URL
// ================================================

function getPreviewUrl(
    templateId
) {

    const template =
        getTemplateById(
            templateId
        );


    if (
        template &&
        template.previewUrl
    ) {

        return String(
            template.previewUrl
        );

    }


    /*
    ================================================
    USE CLIENT API
    ================================================
    */

    if (
        window.TemplateCraftAPI &&
        typeof window.TemplateCraftAPI
            .getTemplatePreviewUrl ===
            'function'
    ) {

        return window.TemplateCraftAPI
            .getTemplatePreviewUrl(
                templateId
            );

    }


    if (
        window.templateCraftAPI &&
        typeof window.templateCraftAPI
            .getTemplatePreviewUrl ===
            'function'
    ) {

        return window.templateCraftAPI
            .getTemplatePreviewUrl(
                templateId
            );

    }


    /*
    ================================================
    DIRECT BACKEND FALLBACK
    ================================================
    */

    const baseUrl =
        String(
            window.TEMPLATECRAFT_API_BASE_URL ||
            'https://templatecraft-backend.onrender.com'
        ).replace(
            /\/+$/,
            ''
        );


    if (!templateId) {

        return '';

    }


    return (
        baseUrl +
        '/api/templates/' +
        encodeURIComponent(
            templateId
        ) +
        '/preview'
    );

}


// ================================================
// 10. SHOW TEMPLATE LOADING
// ================================================

function showTemplateLoading() {

    if (!templateGridElement) {

        return;

    }


    templateGridElement.innerHTML = `

        <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">

            <div
                class="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin">
            </div>

            <p class="mt-4 text-gray-600 font-bold">
                جاري تحميل القوالب...
            </p>

            <p class="mt-1 text-xs text-gray-400">
                يتم جلب القوالب من الخادم
            </p>

        </div>

    `;

}


// ================================================
// 11. SHOW TEMPLATE ERROR
// ================================================

function showTemplateError(
    message
) {

    if (!templateGridElement) {

        return;

    }


    templateGridElement.innerHTML = `

        <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">

            <div
                class="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl">
                ⚠️
            </div>

            <h3 class="mt-4 font-extrabold text-gray-900">
                تعذر تحميل القوالب
            </h3>

            <p class="mt-2 text-sm text-gray-500 max-w-md">
                ${
                    message ||
                    'حدث خطأ أثناء الاتصال بالخادم.'
                }
            </p>

            <button
                type="button"
                id="retryTemplatesButton"
                class="mt-5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-5 py-2 text-sm font-bold">
                إعادة المحاولة
            </button>

        </div>

    `;


    const retryButton =
        document.getElementById(
            'retryTemplatesButton'
        );


    if (retryButton) {

        retryButton.addEventListener(
            'click',
            function() {

                loadTemplates();

            }
        );

    }

}


// ================================================
// 12. LOAD TEMPLATES FROM BACKEND
// ================================================

async function loadTemplates() {

    if (templatesLoading) {

        return;

    }


    templatesLoading =
        true;


    showTemplateLoading();


    try {

        const api =
            getTemplateAPI();


        if (!api) {

            throw new Error(
                'TemplateCraftAPI غير متوفر. تأكد من تحميل client-api.js قبل create-project-templates.js.'
            );

        }


        const response =
            await api.getTemplates();


        /*
        ============================================
        SUPPORT DIFFERENT API RESPONSE SHAPES
        ============================================
        */

        let templates = [];


        if (
            Array.isArray(
                response
            )
        ) {

            templates =
                response;

        } else if (
            response &&
            Array.isArray(
                response.templates
            )
        ) {

            templates =
                response.templates;

        } else if (
            response &&
            response.data &&
            Array.isArray(
                response.data.templates
            )
        ) {

            templates =
                response.data.templates;

        } else if (
            response &&
            response.data &&
            Array.isArray(
                response.data
            )
        ) {

            templates =
                response.data;

        }


        templateList =
            templates
                .map(
                    normalizeTemplate
                )
                .filter(
                    Boolean
                );


        if (
            templateList.length === 0
        ) {

            throw new Error(
                'لم يتم العثور على أي قالب في الخادم.'
            );

        }


        /*
        ============================================
        SELECT FIRST TEMPLATE
        ============================================
        */

        const firstFilteredTemplate =
            getFilteredTemplates()[0];


        if (
            !selectedTemplateId ||
            !getTemplateById(
                selectedTemplateId
            )
        ) {

            selectedTemplateId =
                firstFilteredTemplate
                    ? firstFilteredTemplate.id
                    : templateList[0].id;

        }


        /*
        ============================================
        IF SELECTED TEMPLATE IS NOT IN CURRENT
        CATEGORY, SELECT FIRST CATEGORY TEMPLATE
        ============================================
        */

        const currentFilteredTemplates =
            getFilteredTemplates();


        if (
            currentFilteredTemplates.length > 0 &&
            !currentFilteredTemplates.some(
                function(template) {

                    return (
                        template.id ===
                        selectedTemplateId
                    );

                }
            )
        ) {

            selectedTemplateId =
                currentFilteredTemplates[0].id;

        }


        templatesLoaded =
            true;


        renderTemplates();


    } catch (error) {

        console.error(
            '[TemplateCraft] Failed to load templates:',
            error
        );


        templatesLoaded =
            false;


        showTemplateError(
            error &&
            error.message
                ? error.message
                : 'تعذر تحميل القوالب من الخادم.'
        );


    } finally {

        templatesLoading =
            false;

    }

}


// ================================================
// 13. RENDER TEMPLATES
// ================================================

function renderTemplates() {

    if (!templateGridElement) {

        return;

    }


    templateGridElement.innerHTML =
        '';


    const templates =
        getFilteredTemplates();


    if (
        templates.length === 0
    ) {

        templateGridElement.innerHTML = `

            <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">

                <div
                    class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                    📦
                </div>

                <h3 class="mt-4 font-extrabold text-gray-900">
                    لا توجد قوالب
                </h3>

                <p class="mt-2 text-sm text-gray-500">
                    لا توجد قوالب متاحة لهذه الفئة حالياً.
                </p>

            </div>

        `;


        updateSelectedLabel();

        return;

    }


    templates.forEach(
        function(template, index) {

            const card =
                document.createElement(
                    'div'
                );


            card.className =
                'template-card border-2 border-gray-200 rounded-2xl bg-white' +

                (
                    template.id ===
                    selectedTemplateId
                        ? ' selected'
                        : ''
                );


            card.dataset.template =
                template.id;


            const previewUrl =
                getPreviewUrl(
                    template.id
                );


            /*
            ========================================
            THUMBNAIL / PREVIEW
            ========================================
            */

            let previewContent = '';


            if (
                template.thumbnail
            ) {

                previewContent = `

                    <img
                        class="preview-frame w-full h-full object-cover"
                        src="${template.thumbnail}"
                        alt="${escapeHtml(template.name)}"
                        loading="lazy"
                        onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');">

                    <iframe
                        class="preview-frame hidden w-full h-full"
                        src="${previewUrl || 'about:blank'}"
                        title="${escapeHtml(template.name)}"
                        loading="lazy"
                        tabindex="-1">
                    </iframe>

                `;

            } else {

                previewContent = `

                    <iframe
                        class="preview-frame w-full h-full"
                        src="${previewUrl || 'about:blank'}"
                        title="${escapeHtml(template.name)}"
                        loading="lazy"
                        tabindex="-1">
                    </iframe>

                `;

            }


            card.innerHTML = `

                <div class="selectedGlowLine"></div>

                <div class="relative bg-gray-100 overflow-hidden min-h-[220px]">

                    ${previewContent}

                    <div
                        class="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/10 to-transparent">
                    </div>

                    <span
                        class="absolute top-3 right-3 bg-white text-purple-700 font-extrabold rounded-lg px-3 py-1 text-sm shadow">
                        ${index + 1}
                    </span>

                    ${
                        template.id ===
                        selectedTemplateId
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
                            ${escapeHtml(template.name)}
                        </h3>

                        <span class="selectedMark text-xs font-bold text-purple-700">
                            ${
                                template.id ===
                                selectedTemplateId
                                    ? '✓ محدد'
                                    : ''
                            }
                        </span>

                    </div>

                    <p class="text-xs text-gray-500 mt-1">
                        ${escapeHtml(template.description)}
                    </p>

                    ${
                        template.projectType
                            ? `
                                <div class="mt-2">
                                    <span class="inline-flex bg-purple-50 text-purple-700 text-[11px] font-bold rounded-md px-2 py-1">
                                        ${escapeHtml(template.projectType)}
                                    </span>
                                </div>
                            `
                            : ''
                    }

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


            card.addEventListener(
                'click',
                function(event) {

                    if (
                        event.target.closest(
                            '.previewButton'
                        ) ||

                        event.target.closest(
                            '.selectButton'
                        )
                    ) {

                        return;

                    }


                    selectTemplate(
                        template.id
                    );

                }
            );


            const previewButton =
                card.querySelector(
                    '.previewButton'
                );


            if (previewButton) {

                previewButton.addEventListener(
                    'click',
                    function(event) {

                        event.stopPropagation();

                        openPreview(
                            template.id
                        );

                    }
                );

            }


            const selectButton =
                card.querySelector(
                    '.selectButton'
                );


            if (selectButton) {

                selectButton.addEventListener(
                    'click',
                    function(event) {

                        event.stopPropagation();

                        selectTemplate(
                            template.id
                        );

                    }
                );

            }


            templateGridElement.appendChild(
                card
            );

        }
    );


    updateSelectedLabel();

}


// ================================================
// 14. HTML ESCAPE
// ================================================

function escapeHtml(
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


// ================================================
// 15. SELECT TEMPLATE
// ================================================

function selectTemplate(
    templateId
) {

    if (
        !templateList.some(
            function(item) {

                return item.id ===
                    templateId;

            }
        )
    ) {

        return;

    }


    selectedTemplateId =
        templateId;


    document
        .querySelectorAll(
            '.template-card'
        )
        .forEach(
            function(card) {

                const selected =
                    card.dataset.template ===
                    templateId;


                card.classList.toggle(
                    'selected',
                    selected
                );


                const mark =
                    card.querySelector(
                        '.selectedMark'
                    );


                if (mark) {

                    mark.textContent =
                        selected
                            ? '✓ محدد'
                            : '';

                }


                const glowLine =
                    card.querySelector(
                        '.selectedGlowLine'
                    );


                if (glowLine) {

                    glowLine.style.display =
                        selected
                            ? 'block'
                            : 'none';

                }

            }
        );


    updateSelectedLabel();

}


// ================================================
// 16. UPDATE SELECTED LABEL
// ================================================

function updateSelectedLabel() {

    if (!selectedLabelElement) {

        return;

    }


    if (!selectedTemplateId) {

        selectedLabelElement.textContent =
            'لم يتم اختيار قالب';

        return;

    }


    const template =
        getTemplateById(
            selectedTemplateId
        );


    if (template) {

        selectedLabelElement.textContent =
            `${template.name} محدد`;

        return;

    }


    const number =
        selectedTemplateId.replace(
            'template-',
            ''
        );


    selectedLabelElement.textContent =
        `القالب ${number} محدد`;

}


// ================================================
// 17. OPEN PREVIEW
// ================================================

function openPreview(
    templateId
) {

    previewTemplateId =
        templateId;


    const template =
        getTemplateById(
            templateId
        );


    const previewTitle =
        document.getElementById(
            'previewTitle'
        );


    if (previewTitle) {

        previewTitle.textContent =
            template
                ? template.name
                : 'معاينة القالب';

    }


    if (!previewModalElement) {

        return;

    }


    previewModalElement.classList.add(
        'active'
    );


    if (previewFrameElement) {

        previewFrameElement.classList.add(
            'hidden'
        );

    }


    if (previewErrorElement) {

        previewErrorElement.classList.add(
            'hidden'
        );

    }


    if (previewLoadingElement) {

        previewLoadingElement.classList.remove(
            'hidden'
        );

    }


    const url =
        getPreviewUrl(
            templateId
        );


    if (!url) {

        if (previewLoadingElement) {

            previewLoadingElement.classList.add(
                'hidden'
            );

        }


        if (previewErrorElement) {

            previewErrorElement.classList.remove(
                'hidden'
            );

        }

        return;

    }


    if (previewFrameElement) {

        previewFrameElement.onload =
            function() {

                if (previewLoadingElement) {

                    previewLoadingElement.classList.add(
                        'hidden'
                    );

                }


                if (previewErrorElement) {

                    previewErrorElement.classList.add(
                        'hidden'
                    );

                }


                previewFrameElement.classList.remove(
                    'hidden'
                );

            };


        previewFrameElement.onerror =
            function() {

                if (previewLoadingElement) {

                    previewLoadingElement.classList.add(
                        'hidden'
                    );

                }


                if (previewErrorElement) {

                    previewErrorElement.classList.remove(
                        'hidden'
                    );

                }

            };


        previewFrameElement.src =
            url;

    }

}


// ================================================
// 18. CLOSE PREVIEW
// ================================================

function closePreview() {

    if (previewModalElement) {

        previewModalElement.classList.remove(
            'active'
        );

    }


    if (previewFrameElement) {

        previewFrameElement.src =
            'about:blank';

    }


    previewTemplateId =
        null;

}


// ================================================
// 19. PREVIEW EVENTS
// ================================================

function initializePreviewEvents() {

    const closePreviewBtn =
        document.getElementById(
            'closePreviewBtn'
        );


    if (closePreviewBtn) {

        closePreviewBtn.addEventListener(
            'click',
            closePreview
        );

    }


    if (previewModalElement) {

        previewModalElement.addEventListener(
            'click',
            function(event) {

                if (
                    event.target ===
                    previewModalElement
                ) {

                    closePreview();

                }

            }
        );

    }


    const choosePreviewBtn =
        document.getElementById(
            'choosePreviewBtn'
        );


    if (choosePreviewBtn) {

        choosePreviewBtn.addEventListener(
            'click',
            function() {

                if (!previewTemplateId) {

                    return;

                }


                selectTemplate(
                    previewTemplateId
                );


                closePreview();


                if (
                    typeof showStatus ===
                    'function'
                ) {

                    showStatus(
                        'تم اختيار القالب بنجاح.',
                        'success'
                    );

                }

            }
        );

    }

}


// ================================================
// 20. CATEGORY CHANGE
// ================================================

function initializeCategoryEvents() {

    if (!projectTypeElement) {

        return;

    }


    projectTypeElement.addEventListener(
        'change',
        function() {

            if (
                resultContainerElement
            ) {

                resultContainerElement.classList.add(
                    'hidden'
                );

            }


            /*
            ========================================
            IMPORTANT
            ========================================

            Templates are already loaded from backend.
            We only filter them here.

            No local templates are used.

            ========================================
            */

            renderTemplates();

        }
    );

}


// ================================================
// 21. ESCAPE KEY
// ================================================

function initializeTemplateKeyboardEvents() {

    document.addEventListener(
        'keydown',
        function(event) {

            if (
                event.key !==
                'Escape'
            ) {

                return;

            }


            closePreview();


            if (
                typeof closeCreateModal ===
                    'function' &&

                typeof createModal !==
                    'undefined' &&

                createModal &&
                createModal.classList.contains(
                    'active'
                )
            ) {

                closeCreateModal();

            }

        }
    );

}


// ================================================
// 22. INITIALIZE TEMPLATE SYSTEM
// ================================================

async function initializeTemplateSystem() {

    initializePreviewEvents();

    initializeCategoryEvents();

    initializeTemplateKeyboardEvents();

    await loadTemplates();

}


// ================================================
// 23. PUBLIC
// ================================================

window.initializeTemplateSystem =
    initializeTemplateSystem;


window.loadTemplateCraftTemplates =
    loadTemplates;


window.getSelectedTemplateId =
    function() {

        return selectedTemplateId;

    };


window.getSelectedTemplate =
    function() {

        return getTemplateById(
            selectedTemplateId
        );

    };
