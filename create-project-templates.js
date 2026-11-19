/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - TEMPLATES
====================================================

 مسؤول عن:
 - Templates
 - Dynamic Templates From Backend
 - Select Template
 - Preview
 - Close Preview
 - Choose From Preview
 - Category Change

 المصدر الرئيسي للقوالب:
 TemplateCraft Backend API

 لا يعتمد على:
 ./templates/...
====================================================
*/


'use strict';


// ================================================
// 1. TEMPLATE STATE
// ================================================

let templateList = [];

let selectedTemplateId = null;

let previewTemplateId = null;

let templatesLoaded = false;

let templatesLoading = false;


// ================================================
// 2. ELEMENTS
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
// 3. API HELPER
// ================================================

function getTemplateApi() {

    if (
        typeof window.TemplateCraftAPI ===
        'undefined'
    ) {

        return null;

    }


    return window.TemplateCraftAPI;

}


// ================================================
// 4. GET CURRENT PROJECT TYPE
// ================================================

function getCurrentProjectType() {

    if (
        !projectTypeElement
    ) {

        return '';

    }


    return String(
        projectTypeElement.value || ''
    ).trim();

}


// ================================================
// 5. GET TEMPLATE PREVIEW URL
// ================================================

function getBackendTemplatePreviewUrl(
    template
) {

    if (!template) {

        return null;

    }


    /*
    ------------------------------------------------
    1. إذا Backend رجع previewUrl
    نستعمله مباشرة.
    ------------------------------------------------
    */

    if (
        typeof template.previewUrl ===
        'string' &&

        template.previewUrl.trim()
    ) {

        return template.previewUrl.trim();

    }


    /*
    ------------------------------------------------
    2. نستعمل client-api.js إذا كان عنده
    getTemplatePreviewUrl().
    ------------------------------------------------
    */

    const api =
        getTemplateApi();


    if (
        api &&

        typeof api.getTemplatePreviewUrl ===
        'function'
    ) {

        /*
        getTemplatePreviewUrl القديم
        كيقبل templateId فقط.

        Backend عنده كذلك route جديد
        projectType/templateId.

        نحاول أولاً استعمال signature
        الموجودة في client-api.js.
        */

        try {

            const url =
                api.getTemplatePreviewUrl(
                    template.id
                );


            if (
                typeof url === 'string' &&
                url.trim()
            ) {

                return url;

            }

        } catch (error) {

            console.warn(
                'Template preview URL helper failed:',
                error
            );

        }

    }


    /*
    ------------------------------------------------
    3. Fallback مباشر للـBackend
    ------------------------------------------------
    */

    const projectType =
        template.projectType ||
        getCurrentProjectType();

    const templateId =
        template.id;


    if (
        !projectType ||
        !templateId
    ) {

        return null;

    }


    /*
    نحاول استعمال Base URL الموجود
    في client-api.js.
    */

    const baseUrl =
        window.TEMPLATECRAFT_API_BASE_URL ||
        'https://templatecraft-backend.onrender.com';


    return (
        String(baseUrl).replace(/\/+$/, '') +

        '/api/templates/' +

        encodeURIComponent(
            projectType
        ) +

        '/' +

        encodeURIComponent(
            templateId
        ) +

        '/preview'
    );

}


// ================================================
// 6. NORMALIZE TEMPLATE
// ================================================

function normalizeTemplate(
    template,
    index
) {

    if (
        !template ||
        typeof template !== 'object'
    ) {

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


    const projectType =
        String(
            template.projectType ||
            template.category ||
            getCurrentProjectType() ||
            ''
        ).trim();


    const name =
        String(
            template.name ||
            template.title ||
            id
        ).trim();


    const description =
        String(
            template.description ||
            'قالب احترافي جاهز'
        ).trim();


    const normalized = {

        id,

        projectType,

        category:
            template.category ||
            projectType,

        name,

        description,

        version:
            template.version ||
            null,

        engine:
            template.engine ||
            null,

        thumbnail:
            template.thumbnail ||
            null,

        preview:
            template.preview ||
            null,

        previewUrl:
            template.previewUrl ||
            null,

        features:
            template.features || {},

        index

    };


    /*
    ------------------------------------------------
    previewUrl النهائي
    ------------------------------------------------
    */

    normalized.previewUrl =
        getBackendTemplatePreviewUrl(
            normalized
        );


    return normalized;

}


// ================================================
// 7. EXTRACT TEMPLATE ARRAY FROM API RESPONSE
// ================================================

function extractTemplatesFromResponse(
    response
) {

    /*
    Backend الحالي غالباً يرجع:

    {
        success: true,
        templates: [...]
    }

    ولكن نخلي النظام متوافق كذلك
    مع responses مختلفة.
    */


    if (
        Array.isArray(response)
    ) {

        return response;

    }


    if (
        response &&
        Array.isArray(
            response.templates
        )
    ) {

        return response.templates;

    }


    if (
        response &&
        Array.isArray(
            response.data
        )
    ) {

        return response.data;

    }


    if (
        response &&
        response.data &&
        Array.isArray(
            response.data.templates
        )
    ) {

        return response.data.templates;

    }


    return [];

}


// ================================================
// 8. FETCH TEMPLATES FROM BACKEND
// ================================================

async function loadTemplatesFromBackend() {

    if (
        templatesLoading
    ) {

        return templateList;

    }


    templatesLoading =
        true;


    try {

        const api =
            getTemplateApi();


        if (
            !api
        ) {

            throw new Error(
                'TemplateCraftAPI غير متوفر.'
            );

        }


        if (
            typeof api.getTemplates !==
            'function'
        ) {

            throw new Error(
                'getTemplates() غير موجود في client-api.js.'
            );

        }


        const response =
            await api.getTemplates();


        const rawTemplates =
            extractTemplatesFromResponse(
                response
            );


        const normalizedTemplates =
            rawTemplates
                .map(
                    function(template, index) {

                        return normalizeTemplate(
                            template,
                            index
                        );

                    }
                )
                .filter(
                    function(template) {

                        return Boolean(
                            template
                        );

                    }
                );


        /*
        ------------------------------------------------
        منع duplicate IDs
        ------------------------------------------------
        */

        const uniqueTemplates = [];

        const seenIds =
            new Set();


        normalizedTemplates.forEach(
            function(template) {

                if (
                    seenIds.has(
                        template.id
                    )
                ) {

                    return;

                }


                seenIds.add(
                    template.id
                );


                uniqueTemplates.push(
                    template
                );

            }
        );


        templateList =
            uniqueTemplates;


        templatesLoaded =
            true;


        /*
        ------------------------------------------------
        إذا ما كانش selectedTemplateId
        نختارو أول قالب في category الحالية.
        ------------------------------------------------
        */

        ensureSelectedTemplate();


        /*
        ------------------------------------------------
        تحديث categories في select
        ------------------------------------------------
        */

        populateProjectTypes();


        return templateList;

    } catch (error) {

        console.error(
            'Failed to load templates from backend:',
            error
        );


        templateList =
            [];


        templatesLoaded =
            false;


        if (
            templateGridElement
        ) {

            templateGridElement.innerHTML = `

                <div class="col-span-full">

                    <div class="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">

                        <div class="text-red-600 font-extrabold text-lg">
                            تعذر تحميل القوالب
                        </div>

                        <p class="text-sm text-red-500 mt-2">
                            تأكد من اتصالك بالإنترنت ومن أن TemplateCraft Backend يعمل بشكل صحيح.
                        </p>

                        <button
                            type="button"
                            id="retryTemplatesBtn"
                            class="mt-4 bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-2 font-bold">
                            🔄 إعادة المحاولة
                        </button>

                    </div>

                </div>

            `;


            const retryButton =
                document.getElementById(
                    'retryTemplatesBtn'
                );


            if (
                retryButton
            ) {

                retryButton.addEventListener(
                    'click',
                    async function() {

                        await initializeTemplateSystem(
                            true
                        );

                    }
                );

            }

        }


        return [];

    } finally {

        templatesLoading =
            false;

    }

}


// ================================================
// 9. GET PROJECT TYPES FROM TEMPLATES
// ================================================

function getProjectTypesFromTemplates() {

    const types =
        new Set();


    templateList.forEach(
        function(template) {

            const type =
                String(
                    template.projectType ||
                    template.category ||
                    ''
                ).trim();


            if (
                type
            ) {

                types.add(
                    type
                );

            }

        }
    );


    return Array.from(
        types
    ).sort(
        function(a, b) {

            return a.localeCompare(
                b
            );

        }
    );

}


// ================================================
// 10. CATEGORY LABEL
// ================================================

function getCategoryLabel(
    projectType
) {

    const labels = {

        blogs:
            'مدونات',

        corporate:
            'شركات',

        ecommerce:
            'متاجر إلكترونية',

        'real-estate':
            'عقارات',

        'restaurant-demo':
            'مطاعم',

        'company-demo':
            'شركات',

        'store-demo':
            'متاجر'

    };


    return (
        labels[
            projectType
        ] ||
        projectType
    );

}


// ================================================
// 11. POPULATE PROJECT TYPE SELECT
// ================================================

function populateProjectTypes() {

    if (
        !projectTypeElement
    ) {

        return;

    }


    const currentValue =
        String(
            projectTypeElement.value ||
            ''
        ).trim();


    const projectTypes =
        getProjectTypesFromTemplates();


    if (
        projectTypes.length === 0
    ) {

        return;

    }


    projectTypeElement.innerHTML =
        '';


    projectTypes.forEach(
        function(projectType) {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                projectType;


            option.textContent =
                getCategoryLabel(
                    projectType
                );


            projectTypeElement.appendChild(
                option
            );

        }
    );


    /*
    ------------------------------------------------
    نحافظ على category الحالية إذا كانت
    مازالت موجودة.
    ------------------------------------------------
    */

    if (
        currentValue &&
        projectTypes.includes(
            currentValue
        )
    ) {

        projectTypeElement.value =
            currentValue;

    } else {

        projectTypeElement.value =
            projectTypes[0];

    }


    ensureSelectedTemplate();


    renderTemplates();

}


// ================================================
// 12. GET TEMPLATES FOR CURRENT CATEGORY
// ================================================

function getCurrentCategoryTemplates() {

    const projectType =
        getCurrentProjectType();


    if (
        !projectType
    ) {

        return templateList;

    }


    return templateList.filter(
        function(template) {

            return (
                template.projectType ===
                    projectType ||

                template.category ===
                    projectType
            );

        }
    );

}


// ================================================
// 13. ENSURE SELECTED TEMPLATE
// ================================================

function ensureSelectedTemplate() {

    const categoryTemplates =
        getCurrentCategoryTemplates();


    if (
        categoryTemplates.length === 0
    ) {

        selectedTemplateId =
            null;

        updateSelectedLabel();

        return;

    }


    /*
    إذا selected موجود داخل category
    الحالية، نخليه.
    */

    const currentSelected =
        categoryTemplates.find(
            function(template) {

                return (
                    template.id ===
                    selectedTemplateId
                );

            }
        );


    if (
        currentSelected
    ) {

        return;

    }


    /*
    إذا لا، نختارو أول قالب.
    */

    selectedTemplateId =
        categoryTemplates[0].id;

}


// ================================================
// 14. RENDER TEMPLATES
// ================================================

function renderTemplates() {

    if (
        !templateGridElement
    ) {

        return;

    }


    templateGridElement.innerHTML =
        '';


    const categoryTemplates =
        getCurrentCategoryTemplates();


    if (
        categoryTemplates.length === 0
    ) {

        templateGridElement.innerHTML = `

            <div class="col-span-full">

                <div class="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">

                    <div class="text-gray-700 font-extrabold text-lg">
                        لا توجد قوالب
                    </div>

                    <p class="text-sm text-gray-500 mt-2">
                        لا توجد قوالب متاحة حالياً في هذه الفئة.
                    </p>

                </div>

            </div>

        `;


        updateSelectedLabel();

        return;

    }


    categoryTemplates.forEach(
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
                getBackendTemplatePreviewUrl(
                    template
                );


            const safePreviewUrl =
                previewUrl ||
                'about:blank';


            const escapedName =
                escapeHtml(
                    template.name
                );


            const escapedDescription =
                escapeHtml(
                    template.description
                );


            card.innerHTML = `

                <div class="selectedGlowLine"></div>

                <div class="relative bg-gray-100 overflow-hidden">

                    <iframe
                        class="preview-frame"
                        src="${safePreviewUrl}"
                        title="${escapedName}"
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
                            ${escapedName}
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
                        ${escapedDescription}
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


            if (
                previewButton
            ) {

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


            if (
                selectButton
            ) {

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
// 15. ESCAPE HTML
// ================================================

function escapeHtml(
    value
) {

    const div =
        document.createElement(
            'div'
        );


    div.textContent =
        value == null
            ? ''
            : String(value);


    return div.innerHTML;

}


// ================================================
// 16. SELECT TEMPLATE
// ================================================

function selectTemplate(
    templateId
) {

    const categoryTemplates =
        getCurrentCategoryTemplates();


    const template =
        categoryTemplates.find(
            function(item) {

                return (
                    item.id ===
                    templateId
                );

            }
        );


    if (
        !template
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


                if (
                    mark
                ) {

                    mark.textContent =
                        selected
                            ? '✓ محدد'
                            : '';

                }


                const glowLine =
                    card.querySelector(
                        '.selectedGlowLine'
                    );


                if (
                    glowLine
                ) {

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
// 17. UPDATE SELECTED LABEL
// ================================================

function updateSelectedLabel() {

    if (
        !selectedLabelElement
    ) {

        return;

    }


    if (
        !selectedTemplateId
    ) {

        selectedLabelElement.textContent =
            'لم يتم اختيار قالب';

        return;

    }


    const selectedTemplate =
        templateList.find(
            function(template) {

                return (
                    template.id ===
                    selectedTemplateId
                );

            }
        );


    if (
        selectedTemplate
    ) {

        selectedLabelElement.textContent =
            `${selectedTemplate.name} محدد`;

        return;

    }


    selectedLabelElement.textContent =
        'لم يتم اختيار قالب';

}


// ================================================
// 18. OPEN PREVIEW
// ================================================

function openPreview(
    templateId
) {

    previewTemplateId =
        templateId;


    const template =
        templateList.find(
            function(item) {

                return (
                    item.id ===
                    templateId
                );

            }
        );


    const previewTitle =
        document.getElementById(
            'previewTitle'
        );


    if (
        previewTitle
    ) {

        previewTitle.textContent =
            template
                ? template.name
                : 'معاينة القالب';

    }


    if (
        !previewModalElement
    ) {

        return;

    }


    previewModalElement.classList.add(
        'active'
    );


    if (
        previewFrameElement
    ) {

        previewFrameElement.classList.add(
            'hidden'
        );

    }


    if (
        previewErrorElement
    ) {

        previewErrorElement.classList.add(
            'hidden'
        );

    }


    if (
        previewLoadingElement
    ) {

        previewLoadingElement.classList.remove(
            'hidden'
        );

    }


    const url =
        getBackendTemplatePreviewUrl(
            template
        );


    if (
        !url
    ) {

        if (
            previewLoadingElement
        ) {

            previewLoadingElement.classList.add(
                'hidden'
            );

        }


        if (
            previewErrorElement
        ) {

            previewErrorElement.classList.remove(
                'hidden'
            );

        }

        return;

    }


    if (
        previewFrameElement
    ) {

        previewFrameElement.onload =
            function() {

                if (
                    previewLoadingElement
                ) {

                    previewLoadingElement.classList.add(
                        'hidden'
                    );

                }


                if (
                    previewErrorElement
                ) {

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

                if (
                    previewLoadingElement
                ) {

                    previewLoadingElement.classList.add(
                        'hidden'
                    );

                }


                if (
                    previewErrorElement
                ) {

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
// 19. CLOSE PREVIEW
// ================================================

function closePreview() {

    if (
        previewModalElement
    ) {

        previewModalElement.classList.remove(
            'active'
        );

    }


    if (
        previewFrameElement
    ) {

        previewFrameElement.src =
            'about:blank';

    }


    previewTemplateId =
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


    if (
        closePreviewBtn
    ) {

        closePreviewBtn.addEventListener(
            'click',
            closePreview
        );

    }


    if (
        previewModalElement
    ) {

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


    if (
        choosePreviewBtn
    ) {

        choosePreviewBtn.addEventListener(
            'click',
            function() {

                if (
                    !previewTemplateId
                ) {

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
// 21. CATEGORY CHANGE
// ================================================

function initializeCategoryEvents() {

    if (
        !projectTypeElement
    ) {

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


            ensureSelectedTemplate();

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
// 23. INITIALIZE TEMPLATE SYSTEM
// ================================================

async function initializeTemplateSystem(
    forceReload = false
) {

    /*
    ------------------------------------------------
    منع إعادة تحميل القوالب بلا سبب.
    ------------------------------------------------
    */

    if (
        templatesLoaded &&
        !forceReload
    ) {

        ensureSelectedTemplate();

        renderTemplates();

        return;

    }


    /*
    ------------------------------------------------
    أولاً نحاول تحميل القوالب من Backend.
    ------------------------------------------------
    */

    await loadTemplatesFromBackend();


    /*
    ------------------------------------------------
    بعد التحميل:
    - نضمن category
    - نضمن selected template
    - نرندر
    ------------------------------------------------
    */

    ensureSelectedTemplate();

    populateProjectTypes();

    renderTemplates();


    /*
    ------------------------------------------------
    Events خاصين مرة واحدة.
    ------------------------------------------------
    */

    if (
        !initializeTemplateSystem.eventsInitialized
    ) {

        initializePreviewEvents();

        initializeCategoryEvents();

        initializeTemplateKeyboardEvents();


        initializeTemplateSystem.eventsInitialized =
            true;

    }

}


// ================================================
// 24. PUBLIC
// ================================================

window.initializeTemplateSystem =
    initializeTemplateSystem;


// ================================================
// 25. PUBLIC TEMPLATE HELPERS
// ================================================

window.getSelectedTemplateId =
    function() {

        return selectedTemplateId;

    };


window.getSelectedTemplate =
    function() {

        return templateList.find(
            function(template) {

                return (
                    template.id ===
                    selectedTemplateId
                );

            }
        ) || null;

    };


window.getLoadedTemplates =
    function() {

        return [
            ...templateList
        ];

    };


// ================================================
// 26. DEBUG HELPERS
// ================================================

window.TemplateCraftTemplates = {

    getAll:
        function() {

            return [
                ...templateList
            ];

        },

    getSelected:
        function() {

            return (
                templateList.find(
                    function(template) {

                        return (
                            template.id ===
                            selectedTemplateId
                        );

                    }
                ) || null
            );

        },

    reload:
        function() {

            return initializeTemplateSystem(
                true
            );

        }

};
