'use strict';

/*
===========================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - TEMPLATE SYSTEM
===========================================================

 - Dynamic template loading
 - Dynamic categories
 - Visual category boxes
 - Real template thumbnails
 - Category filtering
 - Full-page preview
 - Template selection

 IMPORTANT:
 - projectTypeSelect remains the internal source of truth
 - Visual category boxes sync with the real select
 - Existing template filtering logic is preserved
===========================================================
*/

(function () {

    let templateList = [];

    let selectedTemplateId = null;
    let selectedTemplateProjectType = null;

    let templatesLoading = false;
    let templatesLoaded = false;

    let templateSystemInitialized = false;


    /* =====================================================
       DOM
    ===================================================== */

    const templatesGrid =
        document.getElementById('templatesGrid');

    const projectTypeSelect =
        document.getElementById('projectTypeSelect');

    const projectTypeOptions =
        document.getElementById('projectTypeOptions');

    const selectedLabel =
        document.getElementById('selectedLabel');

    const resultContainer =
        document.getElementById('createResult');


    /* =====================================================
       API
    ===================================================== */

    function getTemplateAPI() {

        return (
            window.TemplateCraftAPI ||
            window.templateCraftAPI ||
            null
        );
    }


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


        const api =
            getTemplateAPI();


        if (api) {

            const possibleUrls = [
                api.BASE_URL,
                api.baseUrl,
                api.apiBaseUrl
            ];


            for (const url of possibleUrls) {

                if (
                    typeof url === 'string' &&
                    url.trim()
                ) {

                    return url
                        .trim()
                        .replace(/\/+$/, '');
                }
            }
        }


        return 'https://templatecraft-backend.onrender.com';
    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function escapeHtml(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function normalizeProjectType(value) {

        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-');
    }


    function getCurrentProjectType() {

        if (!projectTypeSelect) {
            return '';
        }

        return String(
            projectTypeSelect.value || ''
        ).trim();
    }


    /* =====================================================
       CATEGORY ICON
    ===================================================== */

    function getProjectTypeIcon(type) {

        const normalized =
            normalizeProjectType(type);

        const icons = {

            business: '💼',
            businesss: '💼',

            portfolio: '🎨',

            ecommerce: '🛒',
            'e-commerce': '🛒',
            shop: '🛍️',
            store: '🏪',

            blog: '✍️',

            news: '📰',

            restaurant: '🍽️',
            food: '🍔',

            education: '🎓',
            school: '🏫',
            university: '🏛️',

            agency: '🚀',

            landing: '✨',
            'landing-page': '✨',

            saas: '☁️',

            technology: '💻',
            tech: '💻',

            medical: '⚕️',
            health: '❤️',

            realestate: '🏠',
            'real-estate': '🏠',
            immobilier: '🏠',

            travel: '✈️',
            tourism: '🌍',

            hotel: '🏨',

            fitness: '💪',
            gym: '🏋️',

            photography: '📸',

            gaming: '🎮',

            personal: '👤',

            community: '👥'
        };


        return (
            icons[normalized] ||
            '◈'
        );
    }


    /* =====================================================
       NORMALIZE TEMPLATE
    ===================================================== */

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


        const projectType =
            String(
                template.projectType ||
                template.category ||
                template.type ||
                ''
            ).trim();


        const name =
            String(
                template.name ||
                template.title ||
                `القالب ${index + 1}`
            ).trim();


        const description =
            String(
                template.description ||
                template.desc ||
                'تصميم احترافي جاهز للتخصيص والنشر.'
            ).trim();


        const previewUrl =
            String(
                template.previewUrl ||
                template.preview ||
                ''
            ).trim();


        const thumbnail =
            String(
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

            title:
                String(
                    template.title || name
                ).trim(),

            description,

            projectType,

            category:
                projectType,

            previewUrl,

            thumbnail
        };
    }


    /* =====================================================
       FIND TEMPLATE
    ===================================================== */

    function getTemplateById(
        templateId,
        projectType = ''
    ) {

        const id =
            String(templateId || '').trim();


        if (!id) {
            return null;
        }


        const normalizedType =
            normalizeProjectType(
                projectType
            );


        return (
            templateList.find(
                template => {

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
                }
            ) || null
        );
    }


    /* =====================================================
       PREVIEW URL
    ===================================================== */

    function getPreviewUrl(template) {

        if (!template) {
            return '';
        }


        if (
            template.previewUrl &&
            typeof template.previewUrl === 'string'
        ) {

            const raw =
                template.previewUrl.trim();


            if (
                /^https?:\/\//i.test(raw)
            ) {

                return raw;
            }


            if (
                raw.startsWith('/')
            ) {

                return (
                    getApiBaseUrl() +
                    raw
                );
            }
        }


        const projectType =
            String(
                template.projectType ||
                template.category ||
                getCurrentProjectType() ||
                ''
            ).trim();


        const templateId =
            String(
                template.id ||
                template.templateId ||
                ''
            ).trim();


        if (!templateId) {
            return '';
        }


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


        return (
            getApiBaseUrl() +
            '/api/templates/' +
            encodeURIComponent(templateId) +
            '/preview'
        );
    }


    /* =====================================================
       ASSET URL
    ===================================================== */

    function getTemplateAssetUrl(
        template,
        assetPath = ''
    ) {

        if (
            !template ||
            !assetPath
        ) {

            return '';
        }


        const raw =
            String(assetPath).trim();


        if (!raw) {
            return '';
        }


        if (
            /^https?:\/\//i.test(raw) ||
            /^data:/i.test(raw) ||
            /^blob:/i.test(raw)
        ) {

            return raw;
        }


        const baseUrl =
            getApiBaseUrl();


        if (
            raw.startsWith('/api/')
        ) {

            return baseUrl + raw;
        }


        if (
            raw.startsWith('/')
        ) {

            return baseUrl + raw;
        }


        const projectType =
            String(
                template.projectType ||
                template.category ||
                getCurrentProjectType() ||
                ''
            ).trim();


        const templateId =
            String(
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


        const cleanPath =
            raw
                .replace(/^\.?\//, '')
                .replace(/^\/+/, '');


        const encodedPath =
            cleanPath
                .split('/')
                .filter(Boolean)
                .map(
                    part =>
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
       THUMBNAIL
    ===================================================== */

    function getTemplateThumbnailUrl(template) {

        if (!template) {
            return '';
        }


        const thumbnail =
            String(
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
       FILTER
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


            renderProjectTypes();

            renderTemplates();


            return templateList;


        } catch (error) {

            console.error(
                'Template loading error:',
                error
            );


            templateList = [];


            renderProjectTypes();

            renderTemplatesError(
                error
            );


            return [];


        } finally {

            templatesLoading = false;
        }
    }


    /* =====================================================
       PROJECT TYPES
       VISUAL BOXES + HIDDEN SELECT SYNC
    ===================================================== */

    function renderProjectTypes() {

        if (!projectTypeSelect) {
            return;
        }


        const types = [];


        templateList.forEach(
            template => {

                const type =
                    String(
                        template.projectType ||
                        template.category ||
                        ''
                    ).trim();


                if (
                    type &&
                    !types.some(
                        item =>
                            normalizeProjectType(item) ===
                            normalizeProjectType(type)
                    )
                ) {

                    types.push(type);
                }
            }
        );


        /*
        -----------------------------------------------------
        No categories
        -----------------------------------------------------
        */

        if (!types.length) {

            projectTypeSelect.innerHTML =
                '<option value="">لا توجد فئات</option>';

            projectTypeSelect.value = '';


            if (projectTypeOptions) {

                projectTypeOptions.innerHTML = `
                    <div class="project-type-empty">

                        <div class="project-type-empty-icon">
                            ◈
                        </div>

                        <div class="project-type-empty-text">
                            لا توجد فئات متاحة حالياً
                        </div>

                    </div>
                `;
            }

            return;
        }


        /*
        -----------------------------------------------------
        Save previous selection
        -----------------------------------------------------
        */

        const oldValue =
            projectTypeSelect.value;


        /*
        -----------------------------------------------------
        Rebuild real select
        -----------------------------------------------------
        */

        projectTypeSelect.innerHTML =
            '<option value="">جميع الفئات</option>' +
            types
                .map(
                    type =>
                        `
                        <option value="${escapeHtml(type)}">
                            ${escapeHtml(type)}
                        </option>
                        `
                )
                .join('');


        /*
        -----------------------------------------------------
        Restore previous value
        -----------------------------------------------------
        */

        const oldExists =
            types.some(
                type =>
                    normalizeProjectType(type) ===
                    normalizeProjectType(oldValue)
            );


        if (oldExists) {

            projectTypeSelect.value =
                oldValue;

        } else {

            projectTypeSelect.value =
                '';
        }


        /*
        -----------------------------------------------------
        Render visual category boxes
        -----------------------------------------------------
        */

        if (!projectTypeOptions) {
            return;
        }


        const currentValue =
            projectTypeSelect.value;


        projectTypeOptions.innerHTML = `

            <button
                type="button"
                class="project-type-option ${
                    !currentValue
                        ? 'is-active'
                        : ''
                }"
                data-project-type=""
                aria-pressed="${
                    !currentValue
                }"
            >

                <span class="project-type-option-icon">
                    ✦
                </span>

                <span class="project-type-option-content">

                    <strong>
                        جميع الفئات
                    </strong>

                    <small>
                        عرض جميع القوالب
                    </small>

                </span>

                <span class="project-type-option-check">
                    ✓
                </span>

            </button>


            ${
                types
                    .map(
                        type => {

                            const normalized =
                                normalizeProjectType(type);

                            const isActive =
                                normalizeProjectType(
                                    currentValue
                                ) === normalized;


                            const count =
                                templateList.filter(
                                    template =>
                                        normalizeProjectType(
                                            template.projectType
                                        ) === normalized
                                ).length;


                            return `
                                <button
                                    type="button"
                                    class="project-type-option ${
                                        isActive
                                            ? 'is-active'
                                            : ''
                                    }"
                                    data-project-type="${escapeHtml(type)}"
                                    aria-pressed="${isActive}"
                                >

                                    <span class="project-type-option-icon">
                                        ${getProjectTypeIcon(type)}
                                    </span>

                                    <span class="project-type-option-content">

                                        <strong>
                                            ${escapeHtml(type)}
                                        </strong>

                                        <small>
                                            ${count}
                                            ${count === 1 ? 'قالب' : 'قوالب'}
                                        </small>

                                    </span>

                                    <span class="project-type-option-check">
                                        ✓
                                    </span>

                                </button>
                            `;
                        }
                    )
                    .join('')
            }

        `;


        bindProjectTypeOptionEvents();
    }


    /* =====================================================
       CATEGORY BOX EVENTS
    ===================================================== */

    function bindProjectTypeOptionEvents() {

        if (!projectTypeOptions) {
            return;
        }


        projectTypeOptions
            .querySelectorAll('.project-type-option')
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        function () {

                            const value =
                                String(
                                    this.dataset.projectType || ''
                                ).trim();


                            if (!projectTypeSelect) {
                                return;
                            }


                            /*
                            -------------------------------------------------
                            Update real select
                            -------------------------------------------------
                            */

                            projectTypeSelect.value =
                                value;


                            /*
                            -------------------------------------------------
                            Trigger the ORIGINAL category logic
                            -------------------------------------------------
                            */

                            projectTypeSelect.dispatchEvent(
                                new Event(
                                    'change',
                                    {
                                        bubbles: true
                                    }
                                )
                            );


                            /*
                            -------------------------------------------------
                            Update visual active state
                            -------------------------------------------------
                            */

                            projectTypeOptions
                                .querySelectorAll(
                                    '.project-type-option'
                                )
                                .forEach(
                                    option => {

                                        const optionValue =
                                            String(
                                                option.dataset.projectType || ''
                                            ).trim();


                                        const active =
                                            normalizeProjectType(
                                                optionValue
                                            ) ===
                                            normalizeProjectType(
                                                value
                                            );


                                        option.classList.toggle(
                                            'is-active',
                                            active
                                        );


                                        option.setAttribute(
                                            'aria-pressed',
                                            active
                                        );
                                    }
                                );
                        }
                    );
                }
            );
    }


    /* =====================================================
       LOADING
    ===================================================== */

    function setLoadingState() {

        if (!templatesGrid) {
            return;
        }


        templatesGrid.innerHTML = `
            <div class="template-state-card">
                <div class="template-spinner"></div>

                <h3>
                    جاري تحميل القوالب...
                </h3>

                <p>
                    يتم جلب القوالب الحقيقية من TemplateCraft Pro
                </p>
            </div>
        `;
    }


    /* =====================================================
       ERROR
    ===================================================== */

    function renderTemplatesError(error) {

        if (!templatesGrid) {
            return;
        }


        templatesGrid.innerHTML = `
            <div class="template-state-card template-state-error">

                <div class="template-state-icon">
                    ⚠️
                </div>

                <h3>
                    تعذر تحميل القوالب
                </h3>

                <p>
                    تأكد من أن Backend شغال وأن الاتصال بـ API صحيح.
                </p>

                <button
                    type="button"
                    id="retryTemplatesBtn"
                    class="secondary-button"
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
       RENDER
    ===================================================== */

    function renderTemplates() {

        if (!templatesGrid) {
            return;
        }


        const templates =
            getFilteredTemplates();


        updateTemplateCount(
            templates.length
        );


        if (!templates.length) {

            templatesGrid.innerHTML = `
                <div class="template-state-card">

                    <div class="template-state-icon">
                        📦
                    </div>

                    <h3>
                        لا توجد قوالب حالياً
                    </h3>

                    <p>
                        لا توجد قوالب متاحة في التصنيف المختار.
                    </p>

                </div>
            `;


            updateSelectedLabel(null);

            return;
        }


        const selectedExists =
            templates.some(
                template =>
                    template.id ===
                    selectedTemplateId
            );


        if (!selectedExists) {

            selectedTemplateId = null;
            selectedTemplateProjectType = null;
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
       COUNT
    ===================================================== */

    function updateTemplateCount(count) {

        const element =
            document.getElementById(
                'templateCount'
            );


        if (element) {

            element.textContent =
                `${count} ${count === 1 ? 'قالب' : 'قوالب'}`;
        }
    }


    /* =====================================================
       TEMPLATE CARD
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


        const imageHtml =
            thumbnailUrl
                ? `
                    <img
                        class="template-thumbnail"
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
                        class="template-fallback-preview ${thumbnailUrl ? 'is-hidden' : ''}"
                        src="${escapeHtml(previewUrl)}"
                        title="${escapeHtml(template.name)}"
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    ></iframe>
                `
                : '';


        return `
            <article
                class="template-card ${isSelected ? 'is-selected' : ''}"
                data-template-id="${escapeHtml(template.id)}"
                data-template-project-type="${escapeHtml(template.projectType || '')}"
            >

                <div class="template-card-preview">

                    ${imageHtml}

                    ${iframeHtml}

                    ${
                        !thumbnailUrl && !previewUrl
                            ? `
                                <div class="template-no-preview">
                                    <div>🖼️</div>
                                    <span>
                                        لا توجد صورة معاينة
                                    </span>
                                </div>
                            `
                            : ''
                    }

                    <div class="template-card-gradient"></div>

                    <div class="template-category">
                        ${escapeHtml(category)}
                    </div>

                    ${
                        isSelected
                            ? `
                                <div class="template-selected-badge">
                                    ✓ محدد
                                </div>
                            `
                            : ''
                    }


                    <div class="template-card-body">

                        <div class="template-card-info">

                            <h3 class="template-name">
                                ${escapeHtml(template.name)}
                            </h3>

                            <p class="template-description">
                                ${escapeHtml(template.description)}
                            </p>

                        </div>


                        <div class="template-card-actions">

                            <button
                                type="button"
                                class="preview-template-btn"
                                data-template-id="${escapeHtml(template.id)}"
                                data-template-project-type="${escapeHtml(template.projectType || '')}"
                            >
                                👁️ معاينة
                            </button>


                            <button
                                type="button"
                                class="select-template-btn ${isSelected ? 'is-selected' : ''}"
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

                </div>

            </article>
        `;
    }


    /* =====================================================
       CARD EVENTS
    ===================================================== */

    function bindTemplateCardEvents() {

        if (!templatesGrid) {
            return;
        }


        templatesGrid
            .querySelectorAll('.preview-template-btn')
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        function () {

                            openTemplatePreview(
                                this.dataset.templateId,
                                this.dataset.templateProjectType
                            );
                        }
                    );
                }
            );


        templatesGrid
            .querySelectorAll('.select-template-btn')
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        function () {

                            selectTemplate(
                                this.dataset.templateId,
                                this.dataset.templateProjectType
                            );
                        }
                    );
                }
            );


        templatesGrid
            .querySelectorAll('.template-thumbnail')
            .forEach(
                image => {

                    const fallback =
                        image
                            .closest('.template-card-preview')
                            ?.querySelector(
                                '.template-fallback-preview'
                            );


                    if (!fallback) {
                        return;
                    }


                    image.addEventListener(
                        'error',
                        function () {

                            image.classList.add(
                                'is-hidden'
                            );

                            fallback.classList.remove(
                                'is-hidden'
                            );
                        }
                    );
                }
            );
    }


    /* =====================================================
       PREVIEW
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
                templateId
            );

            return;
        }


        const previewUrl =
            getPreviewUrl(
                template
            );


        if (!previewUrl) {

            if (
                typeof window.showStatus ===
                'function'
            ) {

                window.showStatus(
                    'تعذر إنشاء رابط معاينة القالب.',
                    'error'
                );
            }

            return;
        }


        window.open(
            previewUrl,
            '_blank',
            'noopener,noreferrer'
        );
    }


    /* =====================================================
       SELECT
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
            return;
        }


        selectedTemplateId =
            template.id;


        selectedTemplateProjectType =
            template.projectType || '';


        updateSelectedLabel(
            template
        );


        renderTemplates();


        if (resultContainer) {

            resultContainer.classList.remove(
                'hidden'
            );
        }


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
    }


    /* =====================================================
       SELECTED LABEL
    ===================================================== */

    function updateSelectedLabel(
        template
    ) {

        if (!selectedLabel) {
            return;
        }


        if (!template) {

            selectedLabel.textContent =
                'لم يتم اختيار أي قالب بعد.';

            return;
        }


        selectedLabel.textContent =
            `${template.name} محدد`;
    }


    /* =====================================================
       CATEGORY
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


                if (!currentTemplates.length) {

                    selectedTemplateId = null;

                    selectedTemplateProjectType = null;

                } else {

                    const exists =
                        currentTemplates.some(
                            template =>
                                template.id ===
                                selectedTemplateId
                        );


                    if (!exists) {

                        selectedTemplateId =
                            null;

                        selectedTemplateProjectType =
                            null;
                    }
                }


                renderTemplates();


                if (resultContainer) {

                    resultContainer.classList.add(
                        'hidden'
                    );
                }


                /*
                -------------------------------------------------
                Keep visual category boxes synchronized
                -------------------------------------------------
                */

                updateActiveProjectTypeOption();
            }
        );
    }


    /* =====================================================
       UPDATE ACTIVE CATEGORY BOX
    ===================================================== */

    function updateActiveProjectTypeOption() {

        if (
            !projectTypeOptions ||
            !projectTypeSelect
        ) {
            return;
        }


        const currentValue =
            String(
                projectTypeSelect.value || ''
            ).trim();


        projectTypeOptions
            .querySelectorAll(
                '.project-type-option'
            )
            .forEach(
                option => {

                    const optionValue =
                        String(
                            option.dataset.projectType || ''
                        ).trim();


                    const isActive =
                        normalizeProjectType(
                            optionValue
                        ) ===
                        normalizeProjectType(
                            currentValue
                        );


                    option.classList.toggle(
                        'is-active',
                        isActive
                    );


                    option.setAttribute(
                        'aria-pressed',
                        isActive
                    );
                }
            );
    }


    /* =====================================================
       KEYBOARD
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


                if (
                    event.target.closest(
                        '.preview-template-btn'
                    )
                ) {

                    event.preventDefault();

                    openTemplatePreview(
                        templateId,
                        projectType
                    );

                    return;
                }


                if (
                    event.target.closest(
                        '.select-template-btn'
                    )
                ) {

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
        openTemplatePreview;


    window.selectTemplate =
        selectTemplate;


    console.log(
        '✅ TemplateCraft Template System loaded'
    );

})();
