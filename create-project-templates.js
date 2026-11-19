'use strict';

/*
===========================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - TEMPLATE SYSTEM

 - Dynamic template loading
 - Dynamic categories
 - Real template thumbnails
 - Category filtering
 - Real full-page preview
 - Template selection
 - No preview modal
 - Backward compatible API
===========================================================
*/

(function () {

    /* =====================================================
       STATE
    ===================================================== */

    let templateList = [];

    let selectedTemplateId = null;
    let selectedTemplateProjectType = null;

    let templatesLoading = false;
    let templatesLoaded = false;

    let templateSystemInitialized = false;


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    const templatesGrid =
        document.getElementById('templatesGrid');

    const projectTypeSelect =
        document.getElementById('projectTypeSelect');

    const selectedLabel =
        document.getElementById('selectedLabel');

    const resultContainer =
        document.getElementById('resultContainer');


    /* =====================================================
       API
    ===================================================== */

    function getTemplateAPI() {

        if (window.TemplateCraftAPI) {
            return window.TemplateCraftAPI;
        }

        if (window.templateCraftAPI) {
            return window.templateCraftAPI;
        }

        return null;
    }


    /* =====================================================
       API BASE URL
    ===================================================== */

    function getApiBaseUrl() {

        if (
            typeof window.TEMPLATECRAFT_API_BASE_URL === 'string' &&
            window.TEMPLATECRAFT_API_BASE_URL.trim()
        ) {
            return window.TEMPLATECRAFT_API_BASE_URL
                .trim()
                .replace(/\/+$/, '');
        }

        if (
            typeof window.API_BASE_URL === 'string' &&
            window.API_BASE_URL.trim()
        ) {
            return window.API_BASE_URL
                .trim()
                .replace(/\/+$/, '');
        }

        const api = getTemplateAPI();

        if (api) {

            if (
                typeof api.BASE_URL === 'string' &&
                api.BASE_URL.trim()
            ) {
                return api.BASE_URL
                    .trim()
                    .replace(/\/+$/, '');
            }

            if (
                typeof api.baseUrl === 'string' &&
                api.baseUrl.trim()
            ) {
                return api.baseUrl
                    .trim()
                    .replace(/\/+$/, '');
            }

            if (
                typeof api.apiBaseUrl === 'string' &&
                api.apiBaseUrl.trim()
            ) {
                return api.apiBaseUrl
                    .trim()
                    .replace(/\/+$/, '');
            }
        }

        /*
         * نفس الـBackend المستعمل في المشروع.
         *
         * إذا كان client-api.js عندك يعرّف
         * TEMPLATECRAFT_API_BASE_URL
         * غادي نستعملو تلقائياً.
         */
        return 'https://templatecraft-backend.onrender.com';
    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHtml(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    /* =====================================================
       NORMALIZE PROJECT TYPE
    ===================================================== */

    function normalizeProjectType(value) {

        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-');
    }


    /* =====================================================
       CURRENT PROJECT TYPE
    ===================================================== */

    function getCurrentProjectType() {

        if (!projectTypeSelect) {
            return '';
        }

        return String(
            projectTypeSelect.value || ''
        ).trim();
    }


    /* =====================================================
       NORMALIZE TEMPLATE
    ===================================================== */

    function normalizeTemplate(template, index) {

        if (
            !template ||
            typeof template !== 'object' ||
            Array.isArray(template)
        ) {
            return null;
        }

        const id = String(
            template.id ||
            template.templateId ||
            template.slug ||
            ''
        ).trim();

        if (!id) {
            return null;
        }

        const projectType = String(
            template.projectType ||
            template.category ||
            template.type ||
            ''
        ).trim();

        const name = String(
            template.name ||
            template.title ||
            `القالب ${index + 1}`
        ).trim();

        const description = String(
            template.description ||
            template.desc ||
            'تصميم احترافي جاهز للتخصيص والنشر.'
        ).trim();

        const previewUrl = String(
            template.previewUrl ||
            template.preview ||
            ''
        ).trim();

        const thumbnail = String(
            template.thumbnail ||
            template.thumbnailUrl ||
            template.image ||
            template.cover ||
            ''
        ).trim();

        return {
            ...template,

            id,
            templateId: id,

            name,

            title: String(
                template.title || name
            ).trim(),

            description,

            projectType,

            category: projectType,

            previewUrl,

            thumbnail
        };
    }


    /* =====================================================
       GET TEMPLATE BY ID
    ===================================================== */

    function getTemplateById(
        templateId,
        projectType = ''
    ) {

        const id = String(
            templateId || ''
        ).trim();

        if (!id) {
            return null;
        }

        const normalizedType =
            normalizeProjectType(projectType);

        return (
            templateList.find(template => {

                if (
                    String(template.id).trim() !== id
                ) {
                    return false;
                }

                if (!normalizedType) {
                    return true;
                }

                return (
                    normalizeProjectType(
                        template.projectType
                    ) === normalizedType
                );
            }) || null
        );
    }


    /* =====================================================
       TEMPLATE PREVIEW URL
    ===================================================== */

    function getPreviewUrl(template) {

        if (!template) {
            return '';
        }

        /*
         * إذا backend عطانا previewUrl جاهز
         */
        if (
            template.previewUrl &&
            typeof template.previewUrl === 'string'
        ) {

            const raw =
                template.previewUrl.trim();

            if (/^https?:\/\//i.test(raw)) {
                return raw;
            }

            if (raw.startsWith('/')) {
                return getApiBaseUrl() + raw;
            }
        }

        const projectType = String(
            template.projectType ||
            template.category ||
            getCurrentProjectType() ||
            ''
        ).trim();

        const templateId = String(
            template.id ||
            template.templateId ||
            ''
        ).trim();

        if (!templateId) {
            return '';
        }

        /*
         * Category-aware preview
         */
        if (projectType) {

            return (
                getApiBaseUrl() +
                '/api/templates/' +
                encodeURIComponent(projectType) +
                '/' +
                encodeURIComponent(templateId) +
                '/preview'
            );
        }

        /*
         * Legacy preview
         */
        return (
            getApiBaseUrl() +
            '/api/templates/' +
            encodeURIComponent(templateId) +
            '/preview'
        );
    }


    /* =====================================================
       TEMPLATE ASSET URL
    ===================================================== */

    function getTemplateAssetUrl(
        template,
        assetPath = ''
    ) {

        if (!template || !assetPath) {
            return '';
        }

        const raw = String(
            assetPath
        ).trim();

        if (!raw) {
            return '';
        }

        /*
         * External URL
         */
        if (
            /^https?:\/\//i.test(raw) ||
            /^data:/i.test(raw) ||
            /^blob:/i.test(raw)
        ) {
            return raw;
        }

        const baseUrl =
            getApiBaseUrl();

        /*
         * Already backend API path
         */
        if (raw.startsWith('/api/')) {
            return baseUrl + raw;
        }

        /*
         * Root-relative path
         */
        if (raw.startsWith('/')) {
            return baseUrl + raw;
        }

        const projectType = String(
            template.projectType ||
            template.category ||
            getCurrentProjectType() ||
            ''
        ).trim();

        const templateId = String(
            template.id ||
            template.templateId ||
            ''
        ).trim();

        if (
            !projectType ||
            !templateId
        ) {
            return '';
        }

        const cleanPath = raw
            .replace(/^\.?\//, '')
            .replace(/^\/+/, '');

        const encodedPath =
            cleanPath
                .split('/')
                .filter(Boolean)
                .map(part =>
                    encodeURIComponent(part)
                )
                .join('/');

        return (
            baseUrl +
            '/api/templates/' +
            encodeURIComponent(projectType) +
            '/' +
            encodeURIComponent(templateId) +
            '/' +
            encodedPath
        );
    }


    /* =====================================================
       TEMPLATE THUMBNAIL URL
    ===================================================== */

    function getTemplateThumbnailUrl(template) {

        if (!template) {
            return '';
        }

        const thumbnail = String(
            template.thumbnail ||
            template.thumbnailUrl ||
            template.image ||
            template.cover ||
            ''
        ).trim();

        if (!thumbnail) {
            return '';
        }

        return getTemplateAssetUrl(
            template,
            thumbnail
        );
    }


    /* =====================================================
       GET FILTERED TEMPLATES
    ===================================================== */

    function getFilteredTemplates() {

        const projectType =
            normalizeProjectType(
                getCurrentProjectType()
            );

        if (!projectType) {
            return templateList;
        }

        return templateList.filter(
            template =>
                normalizeProjectType(
                    template.projectType
                ) === projectType
        );
    }


    /* =====================================================
       LOAD TEMPLATES
    ===================================================== */

    async function loadTemplates() {

        if (templatesLoading) {
            return templateList;
        }

        templatesLoading = true;

        setLoadingState();

        try {

            const api =
                getTemplateAPI();

            if (
                !api ||
                typeof api.getTemplates !== 'function'
            ) {

                throw new Error(
                    'TemplateCraftAPI.getTemplates() غير متوفر.'
                );
            }

            const response =
                await api.getTemplates();

            let rawTemplates = [];

            /*
             * Backend:
             *
             * {
             *   success: true,
             *   templates: [...]
             * }
             */

            if (
                response &&
                Array.isArray(response.templates)
            ) {

                rawTemplates =
                    response.templates;

            } else if (
                Array.isArray(response)
            ) {

                rawTemplates =
                    response;

            } else if (
                response &&
                Array.isArray(response.data)
            ) {

                rawTemplates =
                    response.data;
            }

            templateList =
                rawTemplates
                    .map(normalizeTemplate)
                    .filter(Boolean);

            templatesLoaded = true;

            renderTemplates();

            return templateList;

        } catch (error) {

            console.error(
                'Template loading error:',
                error
            );

            templateList = [];

            renderTemplatesError(
                error
            );

            return [];

        } finally {

            templatesLoading = false;
        }
    }


    /* =====================================================
       LOADING STATE
    ===================================================== */

    function setLoadingState() {

        if (!templatesGrid) {
            return;
        }

        templatesGrid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
                
                <div class="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-5"></div>

                <h3 class="text-lg font-bold text-slate-800">
                    جاري تحميل القوالب...
                </h3>

                <p class="text-sm text-slate-500 mt-2">
                    يتم جلب القوالب الحقيقية من TemplateCraft Pro
                </p>

            </div>
        `;
    }


    /* =====================================================
       ERROR STATE
    ===================================================== */

    function renderTemplatesError(error) {

        if (!templatesGrid) {
            return;
        }

        templatesGrid.innerHTML = `
            <div class="col-span-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center">

                <div class="text-4xl mb-4">
                    ⚠️
                </div>

                <h3 class="text-lg font-bold text-red-800">
                    تعذر تحميل القوالب
                </h3>

                <p class="text-sm text-red-600 mt-2">
                    تأكد من أن Backend شغال وأن الاتصال بـ API صحيح.
                </p>

                <button
                    type="button"
                    id="retryTemplatesBtn"
                    class="mt-5 px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                >
                    إعادة المحاولة
                </button>

            </div>
        `;

        const retryButton =
            document.getElementById(
                'retryTemplatesBtn'
            );

        if (retryButton) {

            retryButton.addEventListener(
                'click',
                loadTemplates
            );
        }

        if (error) {
            console.error(error);
        }
    }


    /* =====================================================
       RENDER TEMPLATES
    ===================================================== */

    function renderTemplates() {

        if (!templatesGrid) {
            return;
        }

        const templates =
            getFilteredTemplates();

        /*
         * تحديث عدد القوالب إن وجد
         */
        updateTemplateCount(
            templates.length
        );

        /*
         * لا توجد قوالب
         */
        if (!templates.length) {

            templatesGrid.innerHTML = `
                <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">

                    <div class="text-5xl mb-4">
                        📦
                    </div>

                    <h3 class="text-xl font-bold text-slate-800">
                        لا توجد قوالب حالياً
                    </h3>

                    <p class="text-sm text-slate-500 mt-2">
                        لا توجد قوالب متاحة في التصنيف المختار.
                    </p>

                </div>
            `;

            updateSelectedLabel(
                null
            );

            return;
        }


        /*
         * تأكد أن القالب المحدد موجود
         * داخل التصنيف الحالي
         */
        const selectedExists =
            templates.some(
                template =>
                    template.id ===
                    selectedTemplateId &&
                    normalizeProjectType(
                        template.projectType
                    ) ===
                    normalizeProjectType(
                        selectedTemplateProjectType ||
                        getCurrentProjectType()
                    )
            );


        if (!selectedExists) {

            selectedTemplateId =
                templates[0].id;

            selectedTemplateProjectType =
                templates[0].projectType || '';
        }


        templatesGrid.innerHTML =
            templates
                .map(
                    (template, index) =>
                        createTemplateCard(
                            template,
                            index
                        )
                )
                .join('');


        bindTemplateCardEvents();

        updateSelectedLabel(
            getTemplateById(
                selectedTemplateId,
                selectedTemplateProjectType
            )
        );
    }


    /* =====================================================
       TEMPLATE COUNT
    ===================================================== */

    function updateTemplateCount(count) {

        const possibleElements = [
            document.getElementById(
                'templateCount'
            ),
            document.querySelector(
                '[data-template-count]'
            )
        ];

        possibleElements.forEach(
            element => {

                if (!element) {
                    return;
                }

                element.textContent =
                    `${count} ${count === 1 ? 'قالب' : 'قوالب'}`;
            }
        );
    }


    /* =====================================================
       CREATE TEMPLATE CARD
    ===================================================== */

    function createTemplateCard(
        template,
        index
    ) {

        const isSelected =
            template.id ===
            selectedTemplateId;

        const thumbnailUrl =
            getTemplateThumbnailUrl(
                template
            );

        const previewUrl =
            getPreviewUrl(
                template
            );

        const category =
            template.projectType ||
            template.category ||
            'غير مصنف';


        /*
         * الصورة الحقيقية هي الأولوية.
         *
         * إذا ماكايناش thumbnail:
         * iframe preview غادي يكون fallback.
         */

        const imageHtml =
            thumbnailUrl
                ? `
                    <img
                        class="template-thumbnail w-full h-full object-cover"
                        src="${escapeHtml(thumbnailUrl)}"
                        alt="${escapeHtml(template.name)}"
                        loading="lazy"
                    >
                `
                : '';


        const iframeHtml =
            previewUrl
                ? `
                    <iframe
                        class="template-fallback-preview absolute inset-0 w-full h-full border-0 ${thumbnailUrl ? 'hidden' : ''}"
                        src="${escapeHtml(previewUrl)}"
                        title="${escapeHtml(template.name)}"
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    ></iframe>
                `
                : '';


        return `
            <article
                class="
                    template-card
                    group
                    relative
                    overflow-hidden
                    rounded-3xl
                    border
                    bg-white
                    shadow-sm
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:shadow-2xl
                    ${isSelected
                        ? 'border-slate-900 ring-2 ring-slate-900/10'
                        : 'border-slate-200'}
                "
                data-template-id="${escapeHtml(template.id)}"
                data-template-project-type="${escapeHtml(template.projectType || '')}"
            >

                <!-- PREVIEW IMAGE -->
                <div class="relative h-60 overflow-hidden bg-slate-100">

                    ${imageHtml}

                    ${iframeHtml}

                    ${
                        !thumbnailUrl && !previewUrl
                            ? `
                                <div class="absolute inset-0 flex items-center justify-center text-slate-400">
                                    <div class="text-center">
                                        <div class="text-5xl mb-2">🖼️</div>
                                        <span class="text-sm">
                                            لا توجد صورة معاينة
                                        </span>
                                    </div>
                                </div>
                            `
                            : ''
                    }

                    <!-- Gradient -->
                    <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>

                    <!-- Category -->
                    <div class="absolute top-4 right-4">
                        <span class="inline-flex items-center rounded-full bg-white/95 backdrop-blur px-3 py-1.5 text-xs font-bold text-slate-800 shadow">
                            ${escapeHtml(category)}
                        </span>
                    </div>

                    ${
                        isSelected
                            ? `
                                <div class="absolute top-4 left-4">
                                    <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs font-bold shadow">
                                        ✓ محدد
                                    </span>
                                </div>
                            `
                            : ''
                    }

                </div>


                <!-- CONTENT -->
                <div class="p-5">

                    <div class="mb-3">

                        <h3 class="text-xl font-black text-slate-900">
                            ${escapeHtml(template.name)}
                        </h3>

                        <p class="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wide">
                            ${escapeHtml(category)}
                        </p>

                    </div>


                    <p class="text-sm leading-6 text-slate-600 min-h-[72px]">
                        ${escapeHtml(template.description)}
                    </p>


                    <!-- ACTIONS -->
                    <div class="grid grid-cols-2 gap-3 mt-5">

                        <button
                            type="button"
                            class="
                                preview-template-btn
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-3
                                text-sm
                                font-bold
                                text-slate-800
                                transition
                                hover:bg-slate-50
                                hover:border-slate-300
                            "
                            data-template-id="${escapeHtml(template.id)}"
                            data-template-project-type="${escapeHtml(template.projectType || '')}"
                        >
                            👁️ معاينة
                        </button>


                        <button
                            type="button"
                            class="
                                select-template-btn
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                bg-slate-900
                                px-4
                                py-3
                                text-sm
                                font-bold
                                text-white
                                transition
                                hover:bg-slate-800
                            "
                            data-template-id="${escapeHtml(template.id)}"
                            data-template-project-type="${escapeHtml(template.projectType || '')}"
                        >
                            ${
                                isSelected
                                    ? '✓ محدد'
                                    : 'اختيار القالب'
                            }
                        </button>

                    </div>

                </div>

            </article>
        `;
    }


    /* =====================================================
       BIND CARD EVENTS
    ===================================================== */

    function bindTemplateCardEvents() {

        /*
         * Preview buttons
         */
        const previewButtons =
            templatesGrid.querySelectorAll(
                '.preview-template-btn'
            );

        previewButtons.forEach(
            button => {

                button.addEventListener(
                    'click',
                    function () {

                        const templateId =
                            this.dataset.templateId;

                        const projectType =
                            this.dataset.templateProjectType;

                        openTemplatePreview(
                            templateId,
                            projectType
                        );
                    }
                );
            }
        );


        /*
         * Select buttons
         */
        const selectButtons =
            templatesGrid.querySelectorAll(
                '.select-template-btn'
            );

        selectButtons.forEach(
            button => {

                button.addEventListener(
                    'click',
                    function () {

                        const templateId =
                            this.dataset.templateId;

                        const projectType =
                            this.dataset.templateProjectType;

                        selectTemplate(
                            templateId,
                            projectType
                        );
                    }
                );
            }
        );


        /*
         * Thumbnail fallback
         */
        const cards =
            templatesGrid.querySelectorAll(
                '.template-card'
            );

        cards.forEach(
            card => {

                const image =
                    card.querySelector(
                        '.template-thumbnail'
                    );

                const fallback =
                    card.querySelector(
                        '.template-fallback-preview'
                    );

                if (!image || !fallback) {
                    return;
                }

                image.addEventListener(
                    'load',
                    function () {

                        image.classList.remove(
                            'hidden'
                        );

                        fallback.classList.add(
                            'hidden'
                        );
                    }
                );

                image.addEventListener(
                    'error',
                    function () {

                        console.warn(
                            'Thumbnail failed:',
                            image.src
                        );

                        image.classList.add(
                            'hidden'
                        );

                        fallback.classList.remove(
                            'hidden'
                        );
                    }
                );
            }
        );
    }


    /* =====================================================
       OPEN FULL PAGE PREVIEW
    ===================================================== */

    function openTemplatePreview(
        templateId,
        projectType = ''
    ) {

        const template =
            getTemplateById(
                templateId,
                projectType
            );

        if (!template) {

            console.error(
                'Template not found:',
                templateId,
                projectType
            );

            return;
        }

        const previewUrl =
            getPreviewUrl(
                template
            );

        if (!previewUrl) {

            console.error(
                'Preview URL not available:',
                template
            );

            if (typeof window.showStatus === 'function') {

                window.showStatus(
                    'تعذر إنشاء رابط معاينة القالب.',
                    'error'
                );
            }

            return;
        }


        /*
         * مهم:
         *
         * لا نستعمل:
         *
         * previewModal
         * previewFrame
         * previewLoading
         * previewError
         *
         * المعاينة الآن تفتح مباشرة
         * كموقع حقيقي.
         */

        window.open(
            previewUrl,
            '_blank',
            'noopener,noreferrer'
        );
    }


    /* =====================================================
       SELECT TEMPLATE
    ===================================================== */

    function selectTemplate(
        templateId,
        projectType = ''
    ) {

        const template =
            getTemplateById(
                templateId,
                projectType
            );

        if (!template) {

            console.error(
                'Cannot select template:',
                templateId
            );

            return;
        }


        selectedTemplateId =
            template.id;

        selectedTemplateProjectType =
            template.projectType || '';


        /*
         * Update label
         */
        updateSelectedLabel(
            template
        );


        /*
         * Re-render cards
         */
        renderTemplates();


        /*
         * Show result section
         */
        if (resultContainer) {

            resultContainer.classList.remove(
                'hidden'
            );
        }


        /*
         * Dispatch event
         *
         * create-project.js
         * يقدر يسمع لهذا الحدث.
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
                                template.projectType,

                            template
                        }
                    }
                )
            );

        } catch (error) {

            console.warn(
                'template:selected event failed:',
                error
            );
        }


        /*
         * Compatibility event
         */
        try {

            document.dispatchEvent(
                new CustomEvent(
                    'templateSelected',
                    {
                        detail: {
                            templateId:
                                template.id,

                            projectType:
                                template.projectType,

                            template
                        }
                    }
                )
            );

        } catch (error) {

            console.warn(
                'templateSelected event failed:',
                error
            );
        }
    }


    /* =====================================================
       UPDATE SELECTED LABEL
    ===================================================== */

    function updateSelectedLabel(
        template
    ) {

        if (!selectedLabel) {
            return;
        }

        if (!template) {

            selectedLabel.textContent =
                'لم يتم اختيار قالب';

            return;
        }

        selectedLabel.textContent =
            `${template.name} محدد`;
    }


    /* =====================================================
       CATEGORY EVENTS
    ===================================================== */

    function initializeCategoryEvents() {

        if (!projectTypeSelect) {
            return;
        }

        projectTypeSelect.addEventListener(
            'change',
            function () {

                const currentTemplates =
                    getFilteredTemplates();


                /*
                 * إذا التصنيف تبدل
                 * والقالب القديم ما بقاش موجود
                 */
                const selectedExists =
                    currentTemplates.some(
                        template =>
                            template.id ===
                            selectedTemplateId
                    );


                if (
                    !selectedExists &&
                    currentTemplates.length
                ) {

                    selectedTemplateId =
                        currentTemplates[0].id;

                    selectedTemplateProjectType =
                        currentTemplates[0].projectType || '';
                }


                /*
                 * إذا ماكاين حتى قالب
                 */
                if (
                    !currentTemplates.length
                ) {

                    selectedTemplateId =
                        null;

                    selectedTemplateProjectType =
                        null;
                }


                /*
                 * Render
                 */
                renderTemplates();


                /*
                 * Hide result until user selects
                 * a template from this category.
                 */
                if (resultContainer) {

                    resultContainer.classList.add(
                        'hidden'
                    );
                }
            }
        );
    }


    /* =====================================================
       KEYBOARD EVENTS
    ===================================================== */

    function initializeTemplateKeyboardEvents() {

        if (!templatesGrid) {
            return;
        }

        templatesGrid.addEventListener(
            'keydown',
            function (event) {

                if (
                    event.key !== 'Enter' &&
                    event.key !== ' '
                ) {
                    return;
                }

                const card =
                    event.target.closest(
                        '.template-card'
                    );

                if (!card) {
                    return;
                }

                const templateId =
                    card.dataset.templateId;

                const projectType =
                    card.dataset.templateProjectType;

                if (event.target.closest(
                    '.preview-template-btn'
                )) {

                    event.preventDefault();

                    openTemplatePreview(
                        templateId,
                        projectType
                    );

                    return;
                }

                if (event.target.closest(
                    '.select-template-btn'
                )) {

                    event.preventDefault();

                    selectTemplate(
                        templateId,
                        projectType
                    );
                }
            }
        );
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initializeTemplateSystem() {

        if (templateSystemInitialized) {
            return;
        }

        templateSystemInitialized = true;


        initializeCategoryEvents();

        initializeTemplateKeyboardEvents();


        await loadTemplates();
    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.initializeTemplateSystem =
        initializeTemplateSystem;


    window.loadTemplateCraftTemplates =
        loadTemplates;


    window.getSelectedTemplateId =
        function () {

            return selectedTemplateId;
        };


    window.getSelectedTemplateProjectType =
        function () {

            return selectedTemplateProjectType || '';
        };


    window.getSelectedTemplate =
        function () {

            return getTemplateById(
                selectedTemplateId,
                selectedTemplateProjectType
            );
        };


    window.getTemplatePreviewUrl =
        function (
            templateId,
            projectType = ''
        ) {

            const template =
                getTemplateById(
                    templateId,
                    projectType
                );

            return template
                ? getPreviewUrl(template)
                : '';
        };


    window.getTemplateAssetUrl =
        getTemplateAssetUrl;


    window.openTemplatePreview =
        function (
            templateId,
            projectType = ''
        ) {

            openTemplatePreview(
                templateId,
                projectType
            );
        };


    window.selectTemplate =
        function (
            templateId,
            projectType = ''
        ) {

            selectTemplate(
                templateId,
                projectType
            );
        };


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
        '✅ TemplateCraft Template System loaded'
    );

})();
