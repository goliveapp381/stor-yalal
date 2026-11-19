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
 - Category-aware Preview URLs
 - Dynamic Template Registry
====================================================
*/

'use strict';


// ================================================
// 1. TEMPLATE CONFIGURATION
// ================================================

// Templates are loaded dynamically from TemplateCraft Backend.
// No hardcoded template list is used here.

let templateList = [];

let selectedTemplateId = null;

let selectedTemplateProjectType = null;

let previewTemplateId = null;

let previewTemplateProjectType = null;


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

    if (
        !template ||
        typeof template !== 'object' ||
        Array.isArray(template)
    ) {

        return null;

    }


    /*
    ================================================
    TEMPLATE ID
    ================================================
    */

    const id =
        String(
            template.id ||
            template.templateId ||
            template.slug ||
            ''
        ).trim();


    if (!id) {

        return null;

    }


    /*
    ================================================
    TEMPLATE NAME
    ================================================
    */

    const name =
        String(
            template.name ||
            template.title ||
            `القالب ${index + 1}`
        ).trim();


    /*
    ================================================
    DESCRIPTION
    ================================================
    */

    const description =
        String(
            template.description ||
            template.desc ||
            'تصميم احترافي'
        ).trim();


    /*
    ================================================
    PROJECT TYPE
    ================================================
    */

    const projectType =
        String(
            template.projectType ||
            template.category ||
            template.type ||
            ''
        ).trim();


    /*
    ================================================
    PREVIEW URL
    ================================================
    */

    const preview =
        String(
            template.previewUrl ||
            template.preview ||
            ''
        ).trim();


    /*
    ================================================
    THUMBNAIL
    ================================================
    */

    const thumbnail =
        String(
            template.thumbnail ||
            template.thumbnailUrl ||
            template.image ||
            ''
        ).trim();


    /*
    ================================================
    RETURN NORMALIZED TEMPLATE
    ================================================
    */

    return {

        ...template,

        id,

        templateId:
            id,

        name,

        title:
            String(
                template.title ||
                name
            ).trim(),

        description,

        projectType,

        category:
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

    if (!projectTypeElement) {

        return '';

    }


    return String(
        projectTypeElement.value ||
        ''
    ).trim();

}


// ================================================
// 7. NORMALIZE PROJECT TYPE
// ================================================

function normalizeProjectType(
    projectType
) {

    return String(
        projectType ||
        ''
    )
        .trim()
        .toLowerCase();

}


// ================================================
// 8. FILTER TEMPLATES BY CATEGORY
// ================================================

function getFilteredTemplates() {

    const projectType =
        normalizeProjectType(
            getCurrentProjectType()
        );


    /*
    ================================================
    NO CATEGORY SELECTED
    ================================================
    */

    if (!projectType) {

        return templateList;

    }


    /*
    ================================================
    STRICT CATEGORY FILTER
    ================================================
    */

    return templateList.filter(
        function(template) {

            const templateProjectType =
                normalizeProjectType(
                    template.projectType
                );


            if (!templateProjectType) {

                return false;

            }


            return (
                templateProjectType ===
                projectType
            );

        }
    );

}


// ================================================
// 9. GET TEMPLATE BY ID
// ================================================

function getTemplateById(
    templateId,
    projectType = ''
) {

    if (!templateId) {

        return null;

    }


    const cleanTemplateId =
        String(
            templateId
        ).trim();


    const normalizedProjectType =
        normalizeProjectType(
            projectType ||
            getCurrentProjectType()
        );


    /*
    ================================================
    FIRST:
    MATCH ID + PROJECT TYPE
    ================================================
    */

    if (normalizedProjectType) {

        const exactMatch =
            templateList.find(
                function(template) {

                    return (
                        template.id ===
                        cleanTemplateId &&

                        normalizeProjectType(
                            template.projectType
                        ) ===
                        normalizedProjectType
                    );

                }
            );


        if (exactMatch) {

            return exactMatch;

        }

    }


    /*
    ================================================
    SECOND:
    MATCH ID ONLY
    ================================================

    This keeps compatibility with old templates.
    ================================================
    */

    return templateList.find(
        function(template) {

            return (
                template.id ===
                cleanTemplateId
            );

        }
    ) || null;

}


// ================================================
// 10. GET PREVIEW URL
// ================================================

function getPreviewUrl(
    templateId,
    projectType = ''
) {

    if (!templateId) {

        return '';

    }


    const cleanTemplateId =
        String(
            templateId
        ).trim();


    if (!cleanTemplateId) {

        return '';

    }


    /*
    ================================================
    DETERMINE PROJECT TYPE
    ================================================
    */

    const cleanProjectType =
        String(
            projectType ||
            getCurrentProjectType() ||
            ''
        ).trim();


    /*
    ================================================
    GET TEMPLATE
    ================================================
    */

    const template =
        getTemplateById(
            cleanTemplateId,
            cleanProjectType
        );


    const templateProjectType =
        String(
            template?.projectType ||
            cleanProjectType ||
            ''
        ).trim();


    /*
    ================================================
    IMPORTANT:
    PREFER CATEGORY-AWARE URL
    ================================================
    */

    if (
        templateProjectType &&
        window.TemplateCraftAPI &&
        typeof window.TemplateCraftAPI
            .getTemplatePreviewUrl ===
            'function'
    ) {

        return window.TemplateCraftAPI
            .getTemplatePreviewUrl(
                cleanTemplateId,
                templateProjectType
            );

    }


    /*
    ================================================
    SECOND API ALIAS
    ================================================
    */

    if (
        templateProjectType &&
        window.templateCraftAPI &&
        typeof window.templateCraftAPI
            .getTemplatePreviewUrl ===
            'function'
    ) {

        return window.templateCraftAPI
            .getTemplatePreviewUrl(
                cleanTemplateId,
                templateProjectType
            );

    }


    /*
    ================================================
    USE BACKEND previewUrl ONLY IF VALID
    ================================================
    */

    if (
        template &&
        template.previewUrl
    ) {

        const backendPreview =
            String(
                template.previewUrl
            ).trim();


        if (
            backendPreview &&
            backendPreview !== '#' &&
            backendPreview !== 'about:blank'
        ) {

            return backendPreview;

        }

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


    /*
    ================================================
    CATEGORY-AWARE FALLBACK
    ================================================
    */

    if (templateProjectType) {

        return (
            baseUrl +
            '/api/templates/' +
            encodeURIComponent(
                templateProjectType
            ) +
            '/' +
            encodeURIComponent(
                cleanTemplateId
            ) +
            '/preview'
        );

    }


    /*
    ================================================
    LEGACY FALLBACK
    ================================================
    */

    return (
        baseUrl +
        '/api/templates/' +
        encodeURIComponent(
            cleanTemplateId
        ) +
        '/preview'
    );

}


// ================================================
// 11. SHOW TEMPLATE LOADING
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
// 12. SHOW TEMPLATE ERROR
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
                    escapeHtml(
                        message ||
                        'حدث خطأ أثناء الاتصال بالخادم.'
                    )
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
// 13. LOAD TEMPLATES FROM BACKEND
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
        CHECK API ERROR
        ============================================
        */

        if (
            response &&
            response.success === false
        ) {

            throw new Error(
                response.error ||
                response.message ||
                'تعذر تحميل القوالب من الخادم.'
            );

        }


        /*
        ============================================
        SUPPORT DIFFERENT RESPONSE SHAPES
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


        /*
        ============================================
        NORMALIZE
        ============================================
        */

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
        CURRENT CATEGORY
        ============================================
        */

        const filteredTemplates =
            getFilteredTemplates();


        /*
        ============================================
        FIRST TEMPLATE
        ============================================
        */

        const firstTemplate =
            filteredTemplates[0] ||
            templateList[0];


        /*
        ============================================
        KEEP EXISTING SELECTION IF VALID
        ============================================
        */

        const currentSelected =
            selectedTemplateId
                ? getTemplateById(
                    selectedTemplateId,
                    selectedTemplateProjectType ||
                    getCurrentProjectType()
                )
                : null;


        if (!currentSelected) {

            if (firstTemplate) {

                selectedTemplateId =
                    firstTemplate.id;

                selectedTemplateProjectType =
                    firstTemplate.projectType ||
                    null;

            } else {

                selectedTemplateId =
                    null;

                selectedTemplateProjectType =
                    null;

            }

        }


        /*
        ============================================
        MAKE SURE SELECTED TEMPLATE BELONGS TO
        CURRENT CATEGORY
        ============================================
        */

        const currentFilteredTemplates =
            getFilteredTemplates();


        if (
            currentFilteredTemplates.length > 0
        ) {

            const selectedExists =
                currentFilteredTemplates.some(
                    function(template) {

                        return (
                            template.id ===
                            selectedTemplateId
                        );

                    }
                );


            if (!selectedExists) {

                const replacement =
                    currentFilteredTemplates[0];


                selectedTemplateId =
                    replacement.id;


                selectedTemplateProjectType =
                    replacement.projectType ||
                    null;

            }

        } else {

            /*
            ========================================
            NO TEMPLATES IN CURRENT CATEGORY
            ========================================
            */

            if (
                getCurrentProjectType()
            ) {

                selectedTemplateId =
                    null;

                selectedTemplateProjectType =
                    null;

            }

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
// 14. RENDER TEMPLATES
// ================================================

function renderTemplates() {

    if (!templateGridElement) {

        return;

    }


    templateGridElement.innerHTML =
        '';


    const templates =
        getFilteredTemplates();


    /*
    ================================================
    NO TEMPLATES
    ================================================
    */

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


    /*
    ================================================
    RENDER EACH TEMPLATE
    ================================================
    */

    templates.forEach(
        function(template, index) {

            const card =
                document.createElement(
                    'div'
                );


            const isSelected =
                (
                    template.id ===
                    selectedTemplateId &&

                    (
                        !template.projectType ||
                        !selectedTemplateProjectType ||
                        normalizeProjectType(
                            template.projectType
                        ) ===
                        normalizeProjectType(
                            selectedTemplateProjectType
                        )
                    )
                );


            card.className =
                'template-card border-2 border-gray-200 rounded-2xl bg-white' +

                (
                    isSelected
                        ? ' selected'
                        : ''
                );


            card.dataset.template =
                template.id;


            card.dataset.projectType =
                template.projectType ||
                '';


            const previewUrl =
                getPreviewUrl(
                    template.id,
                    template.projectType ||
                    getCurrentProjectType()
                );


            /*
            ========================================
            THUMBNAIL / LIVE PREVIEW
            ========================================
            */

            let previewContent =
                '';


            if (
                template.thumbnail
            ) {

                previewContent = `

                    <img
                        class="preview-frame w-full h-full object-cover"
                        src="${escapeHtml(template.thumbnail)}"
                        alt="${escapeHtml(template.name)}"
                        loading="lazy"
                        onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');">

                    <iframe
                        class="preview-frame hidden w-full h-full border-0"
                        src="${escapeHtml(previewUrl || 'about:blank')}"
                        title="${escapeHtml(template.name)}"
                        loading="lazy"
                        tabindex="-1"
                        frameborder="0">
                    </iframe>

                `;

            } else {

                previewContent = `

                    <iframe
                        class="preview-frame w-full h-full border-0"
                        src="${escapeHtml(previewUrl || 'about:blank')}"
                        title="${escapeHtml(template.name)}"
                        loading="lazy"
                        tabindex="-1"
                        frameborder="0">
                    </iframe>

                `;

            }


            /*
            ========================================
            CARD HTML
            ========================================
            */

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
                        isSelected
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
                                isSelected
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


            /*
            ========================================
            CARD CLICK
            ========================================
            */

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
                        template.id,
                        template.projectType
                    );

                }
            );


            /*
            ========================================
            PREVIEW BUTTON
            ========================================
            */

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
                            template.id,
                            template.projectType
                        );

                    }
                );

            }


            /*
            ========================================
            SELECT BUTTON
            ========================================
            */

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
                            template.id,
                            template.projectType
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
// 15. HTML ESCAPE
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
// 16. SELECT TEMPLATE
// ================================================

function selectTemplate(
    templateId,
    projectType = ''
) {

    const currentProjectType =
        String(
            projectType ||
            getCurrentProjectType() ||
            ''
        ).trim();


    const template =
        getTemplateById(
            templateId,
            currentProjectType
        );


    if (!template) {

        console.warn(
            '[TemplateCraft] Template not found:',
            {
                templateId,
                projectType:
                    currentProjectType
            }
        );

        return;

    }


    selectedTemplateId =
        template.id;


    selectedTemplateProjectType =
        template.projectType ||
        currentProjectType ||
        null;


    /*
    ================================================
    UPDATE ALL CARDS
    ================================================
    */

    document
        .querySelectorAll(
            '.template-card'
        )
        .forEach(
            function(card) {

                const cardTemplateId =
                    card.dataset.template ||
                    '';


                const cardProjectType =
                    card.dataset.projectType ||
                    '';


                const selected =
                    cardTemplateId ===
                        template.id &&

                    (
                        !selectedTemplateProjectType ||

                        normalizeProjectType(
                            cardProjectType
                        ) ===
                        normalizeProjectType(
                            selectedTemplateProjectType
                        )
                    );


                card.classList.toggle(
                    'selected',
                    selected
                );


                /*
                ====================================
                SELECTED MARK
                ====================================
                */

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


                /*
                ====================================
                GLOW LINE
                ====================================
                */

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


    /*
    ================================================
    OPTIONAL GLOBAL EVENT
    ================================================

    Other create-project scripts can listen to:

    template:selected
    ================================================
    */

    try {

        window.dispatchEvent(
            new CustomEvent(
                'template:selected',
                {
                    detail: {

                        templateId:
                            template.id,

                        projectType:
                            template.projectType ||
                            currentProjectType,

                        template

                    }

                }
            )
        );

    } catch (_) {

        // Ignore browser compatibility issues.

    }

}


// ================================================
// 17. UPDATE SELECTED LABEL
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
            selectedTemplateId,
            selectedTemplateProjectType ||
            getCurrentProjectType()
        );


    if (template) {

        selectedLabelElement.textContent =
            `${template.name} محدد`;

        return;

    }


    selectedLabelElement.textContent =
        'القالب المحدد';

}


// ================================================
// 18. OPEN PREVIEW
// ================================================

function openPreview(
    templateId,
    projectType = ''
) {

    previewTemplateId =
        templateId;


    const currentProjectType =
        String(
            projectType ||
            getCurrentProjectType() ||
            ''
        ).trim();


    const template =
        getTemplateById(
            templateId,
            currentProjectType
        );


    previewTemplateProjectType =
        template?.projectType ||
        currentProjectType ||
        null;


    /*
    ================================================
    PREVIEW TITLE
    ================================================
    */

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


    /*
    ================================================
    OPEN MODAL
    ================================================
    */

    previewModalElement.classList.add(
        'active'
    );


    /*
    ================================================
    RESET STATES
    ================================================
    */

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


    /*
    ================================================
    CATEGORY-AWARE PREVIEW URL
    ================================================
    */

    const url =
        getPreviewUrl(
            templateId,
            template?.projectType ||
            currentProjectType
        );


    console.log(
        '[TemplateCraft Preview]',
        {
            templateId,

            projectType:
                template?.projectType ||
                currentProjectType,

            url
        }
    );


    /*
    ================================================
    INVALID URL
    ================================================
    */

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


    if (!previewFrameElement) {

        return;

    }


    /*
    ================================================
    IFRAME LOAD SUCCESS
    ================================================
    */

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


    /*
    ================================================
    IFRAME LOAD ERROR
    ================================================
    */

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


    /*
    ================================================
    CLEAR OLD FRAME
    ================================================
    */

    previewFrameElement.src =
        'about:blank';


    /*
    ================================================
    LOAD NEW PREVIEW
    ================================================
    */

    requestAnimationFrame(
        function() {

            if (!previewFrameElement) {

                return;

            }


            previewFrameElement.src =
                url;

        }
    );

}


// ================================================
// 19. CLOSE PREVIEW
// ================================================

function closePreview() {

    if (previewModalElement) {

        previewModalElement.classList.remove(
            'active'
        );

    }


    if (previewFrameElement) {

        previewFrameElement.onload =
            null;

        previewFrameElement.onerror =
            null;

        previewFrameElement.src =
            'about:blank';

    }


    previewTemplateId =
        null;


    previewTemplateProjectType =
        null;

}


// ================================================
// 20. PREVIEW EVENTS
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


    /*
    ================================================
    CLICK OUTSIDE MODAL
    ================================================
    */

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


    /*
    ================================================
    CHOOSE FROM PREVIEW
    ================================================
    */

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
                    previewTemplateId,
                    previewTemplateProjectType ||
                    getCurrentProjectType()
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
// 21. CATEGORY CHANGE
// ================================================

function initializeCategoryEvents() {

    if (!projectTypeElement) {

        return;

    }


    projectTypeElement.addEventListener(
        'change',
        function() {

            /*
            ========================================
            CLOSE PREVIEW IF OPEN
            ========================================
            */

            if (
                previewModalElement &&
                previewModalElement.classList.contains(
                    'active'
                )
            ) {

                closePreview();

            }


            /*
            ========================================
            HIDE RESULT CONTAINER
            ========================================
            */

            if (
                resultContainerElement
            ) {

                resultContainerElement.classList.add(
                    'hidden'
                );

            }


            /*
            ========================================
            GET CATEGORY TEMPLATES
            ========================================
            */

            const currentTemplates =
                getFilteredTemplates();


            /*
            ========================================
            SELECT FIRST TEMPLATE OF CATEGORY
            ========================================
            */

            if (
                currentTemplates.length > 0
            ) {

                const selectedExists =
                    currentTemplates.some(
                        function(template) {

                            return (
                                template.id ===
                                selectedTemplateId
                            );

                        }
                    );


                if (!selectedExists) {

                    const firstTemplate =
                        currentTemplates[0];


                    selectedTemplateId =
                        firstTemplate.id;


                    selectedTemplateProjectType =
                        firstTemplate.projectType ||
                        null;

                }

            } else {

                selectedTemplateId =
                    null;

                selectedTemplateProjectType =
                    null;

            }


            /*
            ========================================
            RENDER
            ========================================
            */

            renderTemplates();

        }
    );

}


// ================================================
// 22. ESCAPE KEY
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


            /*
            ========================================
            CLOSE PREVIEW
            ========================================
            */

            closePreview();


            /*
            ========================================
            CLOSE CREATE MODAL
            ========================================
            */

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
// 23. INITIALIZE TEMPLATE SYSTEM
// ================================================

async function initializeTemplateSystem() {

    initializePreviewEvents();

    initializeCategoryEvents();

    initializeTemplateKeyboardEvents();

    await loadTemplates();

}


// ================================================
// 24. PUBLIC API
// ================================================

window.initializeTemplateSystem =
    initializeTemplateSystem;


window.loadTemplateCraftTemplates =
    loadTemplates;


window.getSelectedTemplateId =
    function() {

        return selectedTemplateId;

    };


window.getSelectedTemplateProjectType =
    function() {

        return (
            selectedTemplateProjectType ||
            ''
        );

    };


window.getSelectedTemplate =
    function() {

        return getTemplateById(
            selectedTemplateId,
            selectedTemplateProjectType ||
            getCurrentProjectType()
        );

    };


window.getTemplatePreviewUrl =
    getPreviewUrl;


// ================================================
// 25. DEBUG INFORMATION
// ================================================

console.log(
    '[TemplateCraft] create-project-templates.js loaded'
);٩
