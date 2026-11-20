'use strict';

/* =========================================================
   TEMPLATECRAFT PRO
   UNIVERSAL EDITOR
   ---------------------------------------------------------
   Universal editor for all templates.

   FLOW:

   1. Read siteId from URL
   2. Load project
   3. Detect templateId
   4. Load template config.json
   5. Load project preview
   6. Connect to template bridge
   7. Read editable schema
   8. Build editor controls dynamically
   9. Apply changes through postMessage
   10. Save project customization
   11. Publish project

   IMPORTANT:
   This file must NOT contain template-specific logic.
========================================================= */


/* =========================================================
   API
========================================================= */

const EDITOR_API_BASE_URL = (
    window.TEMPLATECRAFT_API_URL ||
    'https://templatecraft-backend.onrender.com'
).replace(/\/+$/, '');


/* =========================================================
   TEMPLATE PATH
========================================================= */

const TEMPLATE_BASE_PATH = (
    window.TEMPLATECRAFT_TEMPLATE_BASE_PATH ||
    './templates'
).replace(/\/+$/, '');


/* =========================================================
   URL
========================================================= */

const params = new URLSearchParams(
    window.location.search
);

const siteId = params.get('siteId');


/* =========================================================
   USER
========================================================= */

let storedUser = null;

try {

    storedUser = JSON.parse(
        localStorage.getItem('user') || 'null'
    );

} catch (error) {

    console.error(
        '[UniversalEditor] Invalid user data:',
        error
    );

}


/* =========================================================
   STATE
========================================================= */

const EditorState = {

    initialized: false,

    loading: false,

    saving: false,

    publishing: false,

    previewReady: false,

    bridgeReady: false,

    configLoaded: false,

    schemaLoaded: false,

    currentSite: null,

    templateConfig: null,

    templateSchema: null,

    templateId: null,

    templateCategory: null,

    templateProjectType: null,

    templateVersion: null,

    previewUrl: '',

    files: [],

    activeFile: null,

    activeTab: 'element',

    selectedKey: null,

    selectedSchema: null,

    customizations: {},

    originalCustomizations: {},

    dirty: false,

    bridgeRequestId: 0,

    bridgeRequests: new Map(),

    projectName: '',

    lastSavedAt: null

};


/* =========================================================
   DOM
========================================================= */

const DOM = {};


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initEditor
);


async function initEditor() {

    if (EditorState.initialized) {
        return;
    }

    EditorState.initialized = true;

    cacheDOM();

    bindEvents();

    if (!siteId) {

        showNotification(
            'معرف المشروع غير موجود في الرابط.',
            'error'
        );

        return;
    }


    if (
        !storedUser ||
        !(
            storedUser.id ||
            storedUser._id
        )
    ) {

        showNotification(
            'يجب تسجيل الدخول أولاً.',
            'error'
        );

        return;
    }


    try {

        setLoading(true);

        setStatus(
            'جاري تحميل المشروع...'
        );


        await loadProject();


        setStatus(
            'جاري تحميل إعدادات القالب...'
        );


        await loadTemplateConfig();


        setStatus(
            'جاري تحميل المعاينة...'
        );


        await refreshPreview();


        setStatus(
            'جاري الاتصال بالقالب...'
        );


        await waitForBridge();


        setStatus(
            'جاري تحميل عناصر التعديل...'
        );


        await loadTemplateSchema();


        buildUniversalEditor();


        await loadProjectFiles();


        setStatus(
            'جاهز للتعديل'
        );


        showNotification(
            'تم تحميل المشروع بنجاح.',
            'success'
        );


    } catch (error) {

        console.error(
            '[UniversalEditor] Init error:',
            error
        );

        setStatus(
            'حدث خطأ أثناء تحميل المشروع'
        );

        showNotification(
            error.message ||
            'تعذر تحميل المشروع.',
            'error'
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   DOM CACHE
========================================================= */

function cacheDOM() {

    DOM.frame =
        document.getElementById(
            'site-frame'
        );

    DOM.projectName =
        document.getElementById(
            'project-name'
        );

    DOM.filesList =
        document.getElementById(
            'files-list'
        );

    DOM.codeEditor =
        document.getElementById(
            'code-editor'
        );

    DOM.notification =
        document.getElementById(
            'notification'
        );

    DOM.status =
        document.getElementById(
            'save-status'
        );

    DOM.editorPanel =
        document.getElementById(
            'element-editor'
        ) ||
        document.querySelector(
            '[data-editor-panel="element"]'
        );

    DOM.editorGroups =
        document.getElementById(
            'editor-groups'
        );

    DOM.textInput =
        document.getElementById(
            'element-text'
        );

    DOM.imageInput =
        document.getElementById(
            'element-image'
        );

    DOM.linkInput =
        document.getElementById(
            'element-link'
        );

    DOM.colorInput =
        document.getElementById(
            'element-color'
        );

    DOM.fontSizeInput =
        document.getElementById(
            'element-font-size'
        );

}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

    /* -----------------------------------------------------
       IFRAME LOAD
    ----------------------------------------------------- */

    if (DOM.frame) {

        DOM.frame.addEventListener(
            'load',
            handleFrameLoad
        );

    }


    /* -----------------------------------------------------
       PROJECT NAME
    ----------------------------------------------------- */

    if (DOM.projectName) {

        DOM.projectName.addEventListener(
            'input',
            function () {

                EditorState.projectName =
                    DOM.projectName.value.trim();

                markDirty();

            }
        );

    }


    /* -----------------------------------------------------
       SAVE
    ----------------------------------------------------- */

    const saveButton =
        document.getElementById(
            'save-changes'
        ) ||
        document.querySelector(
            '[data-action="save"]'
        );

    if (saveButton) {

        saveButton.addEventListener(
            'click',
            saveAll
        );

    }


    /* -----------------------------------------------------
       PUBLISH
    ----------------------------------------------------- */

    const publishButton =
        document.getElementById(
            'publish-project'
        ) ||
        document.querySelector(
            '[data-action="publish"]'
        );

    if (publishButton) {

        publishButton.addEventListener(
            'click',
            publishProject
        );

    }


    /* -----------------------------------------------------
       PREVIEW
    ----------------------------------------------------- */

    const previewButton =
        document.getElementById(
            'preview-project'
        ) ||
        document.querySelector(
            '[data-action="preview"]'
        );

    if (previewButton) {

        previewButton.addEventListener(
            'click',
            openPreview
        );

    }


    /* -----------------------------------------------------
       APPLY OLD EDITOR
    ----------------------------------------------------- */

    const applyButton =
        document.getElementById(
            'apply-element'
        ) ||
        document.querySelector(
            '[data-action="apply-element"]'
        );

    if (applyButton) {

        applyButton.addEventListener(
            'click',
            applyLegacyControls
        );

    }


    /* -----------------------------------------------------
       SAVE FILE
    ----------------------------------------------------- */

    const saveFileButton =
        document.getElementById(
            'save-file'
        ) ||
        document.querySelector(
            '[data-action="save-file"]'
        );

    if (saveFileButton) {

        saveFileButton.addEventListener(
            'click',
            saveActiveFile
        );

    }


    /* -----------------------------------------------------
       TABS
    ----------------------------------------------------- */

    document
        .querySelectorAll(
            '[data-editor-tab]'
        )
        .forEach(function (tab) {

            tab.addEventListener(
                'click',
                function () {

                    activateTab(
                        tab.dataset.editorTab
                    );

                }
            );

        });


    /* -----------------------------------------------------
       MESSAGE
    ----------------------------------------------------- */

    window.addEventListener(
        'message',
        handleBridgeMessage
    );

}


/* =========================================================
   LOAD PROJECT
========================================================= */

async function loadProject() {

    const userId =
        storedUser.id ||
        storedUser._id;


    if (
        !window.TemplateCraftAPI ||
        typeof TemplateCraftAPI.getSite !== 'function'
    ) {

        throw new Error(
            'TemplateCraftAPI.getSite غير متوفر.'
        );

    }


    const result =
        await TemplateCraftAPI.getSite(
            siteId,
            userId
        );


    if (
        !result ||
        !result.site
    ) {

        throw new Error(
            'لم يتم العثور على المشروع.'
        );

    }


    EditorState.currentSite =
        result.site;


    EditorState.projectName =
        result.site.siteName ||
        result.site.name ||
        '';


    if (DOM.projectName) {

        DOM.projectName.value =
            EditorState.projectName;

    }


    /*
       Detect template information.
    */

    const site =
        EditorState.currentSite;


    EditorState.templateId =
        site.templateId ||
        site.template ||
        site.template?.id ||
        site.template?.templateId ||
        null;


    EditorState.templateCategory =
        site.templateCategory ||
        site.category ||
        site.template?.category ||
        null;


    EditorState.templateProjectType =
        site.projectType ||
        site.template?.projectType ||
        null;


    EditorState.templateVersion =
        site.templateVersion ||
        site.template?.version ||
        null;


    if (!EditorState.templateId) {

        throw new Error(
            'المشروع لا يحتوي على templateId.'
        );

    }


    /*
       Load saved customization data.
    */

    const savedVariables =
        site.variables ||
        site.customizations ||
        site.editorData ||
        site.content ||
        {};


    EditorState.customizations =
        deepClone(savedVariables);


    EditorState.originalCustomizations =
        deepClone(savedVariables);

}


/* =========================================================
   TEMPLATE CONFIG
========================================================= */

async function loadTemplateConfig() {

    const site =
        EditorState.currentSite;


    let configUrl =
        site.templateConfigUrl ||
        site.configUrl ||
        null;


    /*
       If backend supplies direct config URL,
       use it.
    */

    if (!configUrl) {

        const category =
            EditorState.templateCategory ||
            inferTemplateCategory(
                EditorState.templateId
            );


        configUrl =
            buildTemplateConfigUrl(
                category,
                EditorState.templateId
            );

    }


    const response =
        await fetch(
            addCacheBuster(configUrl),
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-cache'
            }
        );


    if (!response.ok) {

        throw new Error(
            `تعذر تحميل config.json للقالب (${response.status}).`
        );

    }


    const config =
        await response.json();


    if (!config || typeof config !== 'object') {

        throw new Error(
            'config.json غير صالح.'
        );

    }


    if (
        config.id &&
        config.id !== EditorState.templateId
    ) {

        console.warn(
            '[UniversalEditor] config id differs:',
            config.id,
            EditorState.templateId
        );

    }


    EditorState.templateConfig =
        config;


    EditorState.configLoaded =
        true;


    if (config.version) {

        EditorState.templateVersion =
            config.version;

    }


    /*
       Update UI metadata if matching elements exist.
    */

    updateTemplateHeader();

}


/* =========================================================
   BUILD CONFIG URL
========================================================= */

function buildTemplateConfigUrl(
    category,
    templateId
) {

    const cleanCategory =
        String(
            category ||
            'general'
        )
        .replace(/^\/+|\/+$/g, '');


    const cleanId =
        String(
            templateId
        )
        .replace(/^\/+|\/+$/g, '');


    /*
       Standard structure:

       templates/
          ecommerce/
             velocity-store/
                config.json
                index.html
    */

    return (
        `${TEMPLATE_BASE_PATH}/` +
        `${encodeURIComponent(cleanCategory)}/` +
        `${encodeURIComponent(cleanId)}/config.json`
    );

}


/* =========================================================
   INFER CATEGORY
========================================================= */

function inferTemplateCategory(
    templateId
) {

    /*
       We intentionally do not hardcode individual templates.

       If backend doesn't provide category,
       first try projectType.
    */

    const type =
        EditorState.templateProjectType;

    if (type) {
        return type;
    }


    /*
       Generic fallback.
       Backend should ideally provide category.
    */

    return 'general';

}


/* =========================================================
   PREVIEW
========================================================= */

async function refreshPreview() {

    if (!DOM.frame) {

        throw new Error(
            'site-frame غير موجود.'
        );

    }


    const previewUrl =
        getPreviewUrl();


    if (!previewUrl) {

        throw new Error(
            'تعذر تحديد رابط المعاينة.'
        );

    }


    EditorState.previewUrl =
        previewUrl;


    EditorState.previewReady =
        false;

    EditorState.bridgeReady =
        false;

    EditorState.schemaLoaded =
        false;


    DOM.frame.src =
        previewUrl;


    await waitForFrameLoad();

}


/* =========================================================
   GET PREVIEW URL
========================================================= */

function getPreviewUrl() {

    const site =
        EditorState.currentSite;


    /*
       Priority 1:
       Explicit editor/preview URL.
    */

    if (site.editorPreviewUrl) {

        return appendPreviewParam(
            site.editorPreviewUrl
        );

    }


    if (site.previewUrl) {

        return appendPreviewParam(
            site.previewUrl
        );

    }


    /*
       Priority 2:
       Existing live URL.
    */

    if (site.liveUrl) {

        return appendPreviewParam(
            site.liveUrl
        );

    }


    /*
       Priority 3:
       Backend project preview.
    */

    if (site.siteName) {

        return (
            `${EDITOR_API_BASE_URL}/sites/` +
            `${encodeURIComponent(site.siteName)}/index.html` +
            `?_editor=1&_siteId=${encodeURIComponent(siteId)}`
        );

    }


    return '';

}


/* =========================================================
   APPEND PREVIEW PARAM
========================================================= */

function appendPreviewParam(
    url
) {

    try {

        const parsed =
            new URL(
                url,
                window.location.href
            );


        parsed.searchParams.set(
            '_editor',
            '1'
        );


        parsed.searchParams.set(
            '_siteId',
            siteId
        );


        return parsed.toString();

    } catch (error) {

        const separator =
            url.includes('?')
                ? '&'
                : '?';

        return (
            `${url}` +
            `${separator}_editor=1` +
            `&_siteId=${encodeURIComponent(siteId)}`
        );

    }

}


/* =========================================================
   FRAME LOAD
========================================================= */

function handleFrameLoad() {

    EditorState.previewReady =
        true;


    /*
       Send project customizations
       after iframe loads.
    */

    setTimeout(
        function () {

            requestBridgeSchema();

            sendCustomizationsToPreview();

        },
        150
    );

}


/* =========================================================
   WAIT FRAME
========================================================= */

function waitForFrameLoad(
    timeout = 15000
) {

    return new Promise(
        function (resolve, reject) {

            if (
                DOM.frame &&
                DOM.frame.contentDocument &&
                DOM.frame.contentDocument.readyState === 'complete'
            ) {

                resolve();

                return;

            }


            let finished = false;


            const timer =
                setTimeout(
                    function () {

                        if (finished) return;

                        finished = true;

                        reject(
                            new Error(
                                'انتهت مهلة تحميل معاينة المشروع.'
                            )
                        );

                    },
                    timeout
                );


            function done() {

                if (finished) return;

                finished = true;

                clearTimeout(timer);

                DOM.frame.removeEventListener(
                    'load',
                    done
                );

                resolve();

            }


            DOM.frame.addEventListener(
                'load',
                done
            );

        }
    );

}


/* =========================================================
   WAIT BRIDGE
========================================================= */

function waitForBridge(
    timeout = 15000
) {

    return new Promise(
        function (resolve) {

            if (
                EditorState.bridgeReady
            ) {

                resolve();

                return;

            }


            const started =
                Date.now();


            const timer =
                setInterval(
                    function () {

                        if (
                            EditorState.bridgeReady
                        ) {

                            clearInterval(timer);

                            resolve();

                            return;

                        }


                        if (
                            Date.now() -
                            started >=
                            timeout
                        ) {

                            clearInterval(timer);

                            /*
                               Don't completely fail.
                               Generic DOM scanning can still work
                               if same-origin preview is available.
                            */

                            console.warn(
                                '[UniversalEditor] Bridge timeout.'
                            );

                            resolve();

                        }

                    },
                    100
                );

        }
    );

}


/* =========================================================
   BRIDGE MESSAGE
========================================================= */

function handleBridgeMessage(
    event
) {

    const data =
        event.data;


    if (
        !data ||
        typeof data !== 'object'
    ) {

        return;

    }


    /*
       Accept messages only from our iframe
       when possible.
    */

    if (
        DOM.frame &&
        event.source &&
        event.source !== DOM.frame.contentWindow
    ) {

        /*
           Ignore unrelated windows.
        */

        return;

    }


    switch (data.type) {

        case 'TEMPLATE_READY':

            handleTemplateReady(
                data
            );

            break;


        case 'BRIDGE_READY':

            handleTemplateReady(
                data
            );

            break;


        case 'TEMPLATE_SCHEMA':

            handleTemplateSchema(
                data
            );

            break;


        case 'ELEMENT_SELECTED':

            handleElementSelected(
                data
            );

            break;


        case 'VALUE_RESPONSE':

            handleValueResponse(
                data
            );

            break;


        case 'EDITOR_STATE':

            handleEditorState(
                data
            );

            break;


        case 'SAVE_RESPONSE':

            handleSaveResponse(
                data
            );

            break;


        case 'ERROR':

            console.error(
                '[TemplateBridge]',
                data
            );

            break;

    }

}


/* =========================================================
   TEMPLATE READY
========================================================= */

function handleTemplateReady(
    data
) {

    if (
        data.templateId &&
        EditorState.templateId &&
        data.templateId !==
        EditorState.templateId
    ) {

        console.warn(
            '[UniversalEditor] Template mismatch:',
            data.templateId,
            EditorState.templateId
        );

    }


    EditorState.bridgeReady =
        true;


    requestBridgeSchema();


    setTimeout(
        function () {

            sendCustomizationsToPreview();

        },
        100
    );

}


/* =========================================================
   REQUEST SCHEMA
========================================================= */

function requestBridgeSchema() {

    postToPreview({
        type: 'GET_EDITABLES'
    });


    postToPreview({
        type: 'GET_SCHEMA'
    });


    /*
       Compatibility with future bridge versions.
    */

    postToPreview({
        type: 'GET_TEMPLATE_SCHEMA'
    });

}


/* =========================================================
   HANDLE SCHEMA
========================================================= */

function handleTemplateSchema(
    data
) {

    const schema =
        data.schema ||
        data.fields ||
        data.editables ||
        [];


    if (
        !Array.isArray(schema)
    ) {

        return;

    }


    EditorState.templateSchema =
        normalizeSchema(
            schema
        );


    EditorState.schemaLoaded =
        true;


    buildUniversalEditor();

}


/* =========================================================
   NORMALIZE SCHEMA
========================================================= */

function normalizeSchema(
    schema
) {

    const result = [];


    schema.forEach(
        function (item) {

            if (
                typeof item === 'string'
            ) {

                result.push({
                    key: item,
                    type: 'text',
                    label: humanizeKey(item),
                    value: ''
                });

                return;

            }


            if (
                !item ||
                typeof item !== 'object'
            ) {

                return;

            }


            const key =
                item.key ||
                item.id ||
                item.name;


            if (!key) {
                return;
            }


            result.push({

                key: key,

                id:
                    item.id ||
                    key,

                label:
                    item.label ||
                    item.title ||
                    humanizeKey(key),

                type:
                    normalizeFieldType(
                        item.type,
                        item.tag,
                        item.attribute
                    ),

                tag:
                    item.tag ||
                    '',

                attribute:
                    item.attribute ||
                    null,

                group:
                    item.group ||
                    item.section ||
                    item.category ||
                    'general',

                description:
                    item.description ||
                    '',

                placeholder:
                    item.placeholder ||
                    '',

                options:
                    Array.isArray(item.options)
                        ? item.options
                        : [],

                value:
                    item.value ??
                    getCustomizationValue(
                        key
                    ) ??
                    '',

                editable:
                    item.editable !== false,

                multiple:
                    item.multiple === true,

                selector:
                    item.selector ||
                    null

            });

        }
    );


    /*
       Remove duplicates.
    */

    const unique =
        new Map();


    result.forEach(
        function (item) {

            unique.set(
                item.key,
                item
            );

        }
    );


    return Array.from(
        unique.values()
    );

}


/* =========================================================
   FIELD TYPE
========================================================= */

function normalizeFieldType(
    type,
    tag,
    attribute
) {

    if (type) {

        return String(
            type
        ).toLowerCase();

    }


    if (attribute === 'src') {
        return 'image';
    }


    if (
        attribute === 'href'
    ) {

        return 'url';

    }


    if (
        tag === 'IMG'
    ) {

        return 'image';

    }


    return 'text';

}


/* =========================================================
   BUILD UNIVERSAL EDITOR
========================================================= */

function buildUniversalEditor() {

    if (!DOM.editorGroups) {

        /*
           If original HTML does not contain the universal
           container, create it inside the element editor.
        */

        createUniversalEditorContainer();

    }


    if (!DOM.editorGroups) {
        return;
    }


    DOM.editorGroups.innerHTML =
        '';


    const groups =
        getConfiguredGroups();


    const schema =
        EditorState.templateSchema ||
        [];


    /*
       If bridge schema isn't available yet,
       show loading state.
    */

    if (!schema.length) {

        DOM.editorGroups.innerHTML = `
            <div class="p-4 text-center text-gray-500">
                <div class="mb-2 text-lg">
                    ⚙️
                </div>
                <div>
                    جاري اكتشاف عناصر القالب...
                </div>
            </div>
        `;

        /*
           Try DOM fallback.
        */

        setTimeout(
            scanPreviewEditableElements,
            100
        );

        return;

    }


    /*
       Group schema.
    */

    const grouped =
        new Map();


    schema.forEach(
        function (field) {

            if (
                field.editable === false
            ) {

                return;

            }


            const groupId =
                field.group ||
                'general';


            if (
                !grouped.has(groupId)
            ) {

                grouped.set(
                    groupId,
                    []
                );

            }


            grouped
                .get(groupId)
                .push(field);

        }
    );


    /*
       First render configured groups.
    */

    groups.forEach(
        function (group) {

            const fields =
                grouped.get(
                    group.id
                ) ||
                [];


            if (!fields.length) {
                return;
            }


            const groupElement =
                createEditorGroup(
                    group,
                    fields
                );


            DOM.editorGroups.appendChild(
                groupElement
            );


            grouped.delete(
                group.id
            );

        }
    );


    /*
       Render remaining unknown groups.
    */

    grouped.forEach(
        function (
            fields,
            groupId
        ) {

            const group =
                {
                    id: groupId,
                    name:
                        humanizeKey(
                            groupId
                        )
                };


            DOM.editorGroups.appendChild(
                createEditorGroup(
                    group,
                    fields
                )
            );

        }
    );

}


/* =========================================================
   CONFIGURED GROUPS
========================================================= */

function getConfiguredGroups() {

    const config =
        EditorState.templateConfig;


    const groups =
        config &&
        config.editor &&
        Array.isArray(
            config.editor.groups
        )
            ? config.editor.groups
            : [];


    if (groups.length) {

        return groups;

    }


    return [
        {
            id: 'general',
            name: 'General'
        }
    ];

}


/* =========================================================
   CREATE GROUP
========================================================= */

function createEditorGroup(
    group,
    fields
) {

    const wrapper =
        document.createElement(
            'div'
        );


    wrapper.className =
        'mb-4 rounded-2xl border border-gray-200 bg-white overflow-hidden';


    const header =
        document.createElement(
            'button'
        );


    header.type =
        'button';


    header.className =
        'w-full flex items-center justify-between px-4 py-3 text-right font-semibold hover:bg-gray-50';


    header.innerHTML = `
        <span>${escapeHtml(
            group.name ||
            humanizeKey(group.id)
        )}</span>

        <span class="text-gray-400">
            ▼
        </span>
    `;


    const content =
        document.createElement(
            'div'
        );


    content.className =
        'p-4 space-y-4 border-t border-gray-100';


    fields.forEach(
        function (field) {

            content.appendChild(
                createFieldControl(
                    field
                )
            );

        }
    );


    header.addEventListener(
        'click',
        function () {

            content.classList.toggle(
                'hidden'
            );

        }
    );


    wrapper.appendChild(
        header
    );


    wrapper.appendChild(
        content
    );


    return wrapper;

}


/* =========================================================
   CREATE FIELD
========================================================= */

function createFieldControl(
    field
) {

    const wrapper =
        document.createElement(
            'div'
        );


    wrapper.className =
        'space-y-2';


    const label =
        document.createElement(
            'label'
        );


    label.className =
        'block text-sm font-medium text-gray-700';


    label.textContent =
        field.label;


    wrapper.appendChild(
        label
    );


    let control;


    switch (
        field.type
    ) {

        case 'textarea':

            control =
                createTextarea(
                    field
                );

            break;


        case 'number':

            control =
                createInput(
                    field,
                    'number'
                );

            break;


        case 'color':

            control =
                createInput(
                    field,
                    'color'
                );

            break;


        case 'image':

            control =
                createImageControl(
                    field
                );

            break;


        case 'url':

            control =
                createInput(
                    field,
                    'url'
                );

            break;


        case 'select':

            control =
                createSelect(
                    field
                );

            break;


        case 'boolean':

        case 'checkbox':

            control =
                createCheckbox(
                    field
                );

            break;


        case 'product':

        case 'products':

            control =
                createProductNotice(
                    field
                );

            break;


        default:

            control =
                createInput(
                    field,
                    'text'
                );

            break;

    }


    wrapper.appendChild(
        control
    );


    if (
        field.description
    ) {

        const description =
            document.createElement(
                'div'
            );


        description.className =
            'text-xs text-gray-400';


        description.textContent =
            field.description;


        wrapper.appendChild(
            description
        );

    }


    return wrapper;

}


/* =========================================================
   INPUT
========================================================= */

function createInput(
    field,
    type
) {

    const input =
        document.createElement(
            'input'
        );


    input.type =
        type;


    input.className =
        'w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500';


    input.value =
        normalizeInputValue(
            getCustomizationValue(
                field.key
            ) ??
            field.value
        );


    if (
        field.placeholder
    ) {

        input.placeholder =
            field.placeholder;

    }


    input.addEventListener(
        'input',
        function () {

            applyUniversalField(
                field,
                input.value
            );

        }
    );


    return input;

}


/* =========================================================
   TEXTAREA
========================================================= */

function createTextarea(
    field
) {

    const textarea =
        document.createElement(
            'textarea'
        );


    textarea.rows =
        4;


    textarea.className =
        'w-full rounded-xl border border-gray-300 px-3 py-2 outline-none resize-y focus:ring-2 focus:ring-indigo-500';


    textarea.value =
        normalizeInputValue(
            getCustomizationValue(
                field.key
            ) ??
            field.value
        );


    textarea.addEventListener(
        'input',
        function () {

            applyUniversalField(
                field,
                textarea.value
            );

        }
    );


    return textarea;

}


/* =========================================================
   SELECT
========================================================= */

function createSelect(
    field
) {

    const select =
        document.createElement(
            'select'
        );


    select.className =
        'w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500';


    field.options.forEach(
        function (option) {

            const optionElement =
                document.createElement(
                    'option'
                );


            if (
                typeof option === 'object'
            ) {

                optionElement.value =
                    option.value ??
                    option.id ??
                    '';


                optionElement.textContent =
                    option.label ??
                    option.name ??
                    option.value ??
                    '';

            } else {

                optionElement.value =
                    option;

                optionElement.textContent =
                    option;

            }


            select.appendChild(
                optionElement
            );

        }
    );


    select.value =
        normalizeInputValue(
            getCustomizationValue(
                field.key
            ) ??
            field.value
        );


    select.addEventListener(
        'change',
        function () {

            applyUniversalField(
                field,
                select.value
            );

        }
    );


    return select;

}


/* =========================================================
   CHECKBOX
========================================================= */

function createCheckbox(
    field
) {

    const wrapper =
        document.createElement(
            'label'
        );


    wrapper.className =
        'flex items-center gap-3 cursor-pointer';


    const input =
        document.createElement(
            'input'
        );


    input.type =
        'checkbox';


    input.className =
        'w-5 h-5';


    input.checked =
        Boolean(
            getCustomizationValue(
                field.key
            ) ??
            field.value
        );


    input.addEventListener(
        'change',
        function () {

            applyUniversalField(
                field,
                input.checked
            );

        }
    );


    const text =
        document.createElement(
            'span'
        );


    text.textContent =
        field.label;


    wrapper.appendChild(
        input
    );


    wrapper.appendChild(
        text
    );


    return wrapper;

}


/* =========================================================
   IMAGE CONTROL
========================================================= */

function createImageControl(
    field
) {

    const wrapper =
        document.createElement(
            'div'
        );


    wrapper.className =
        'space-y-2';


    const input =
        document.createElement(
            'input'
        );


    input.type =
        'url';


    input.placeholder =
        'https://example.com/image.jpg';


    input.className =
        'w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500';


    input.value =
        normalizeInputValue(
            getCustomizationValue(
                field.key
            ) ??
            field.value
        );


    const preview =
        document.createElement(
            'div'
        );


    preview.className =
        'hidden rounded-xl overflow-hidden border border-gray-200';


    const image =
        document.createElement(
            'img'
        );


    image.className =
        'w-full max-h-48 object-cover';


    preview.appendChild(
        image
    );


    function updateImagePreview(
        value
    ) {

        if (!value) {

            preview.classList.add(
                'hidden'
            );

            image.removeAttribute(
                'src'
            );

            return;

        }


        image.src =
            value;


        preview.classList.remove(
            'hidden'
        );

    }


    updateImagePreview(
        input.value
    );


    input.addEventListener(
        'input',
        function () {

            updateImagePreview(
                input.value
            );


            applyUniversalField(
                field,
                input.value
            );

        }
    );


    wrapper.appendChild(
        input
    );


    wrapper.appendChild(
        preview
    );


    return wrapper;

}


/* =========================================================
   PRODUCT CONTROL
========================================================= */

function createProductNotice(
    field
) {

    const wrapper =
        document.createElement(
            'div'
        );


    wrapper.className =
        'rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4';


    wrapper.innerHTML = `
        <div class="font-semibold text-indigo-700 mb-1">
            منتجات
        </div>

        <div class="text-xs leading-6 text-indigo-600">
            هذا العنصر يمثل مجموعة منتجات.
            يمكن للقالب تزويد الـ Editor مستقبلاً
            بـ Product Schema خاص لتعديل الاسم،
            السعر، الصورة، الوصف والمنتج بشكل مستقل.
        </div>
    `;


    /*
       If the bridge sends structured product data,
       the universal editor can be extended without
       creating another editor.js.
    */


    return wrapper;

}


/* =========================================================
   APPLY UNIVERSAL FIELD
========================================================= */

function applyUniversalField(
    field,
    value
) {

    if (!field || !field.key) {
        return;
    }


    /*
       Store customization.
    */

    setCustomizationValue(
        field.key,
        value
    );


    /*
       Send to template bridge.
    */

    switch (
        field.type
    ) {

        case 'image':

            postToPreview({

                type: 'SET_IMAGE',

                key: field.key,

                value: value

            });

            break;


        case 'color':

            postToPreview({

                type: 'SET_STYLE',

                key: field.key,

                property:
                    field.property ||
                    'color',

                value: value

            });

            break;


        case 'number':

            postToPreview({

                type: 'SET_VALUE',

                key: field.key,

                value: value

            });

            break;


        default:

            /*
               If field edits an HTML attribute,
               use SET_ATTRIBUTE.
            */

            if (
                field.attribute
            ) {

                postToPreview({

                    type: 'SET_ATTRIBUTE',

                    key: field.key,

                    attribute:
                        field.attribute,

                    value: value

                });

            } else {

                postToPreview({

                    type: 'SET_VALUE',

                    key: field.key,

                    value: value

                });

            }

            break;

    }


    markDirty();

}


/* =========================================================
   SEND CUSTOMIZATIONS
========================================================= */

function sendCustomizationsToPreview() {

    const values =
        EditorState.customizations;


    if (
        !values ||
        typeof values !== 'object'
    ) {

        return;

    }


    Object.keys(
        values
    ).forEach(
        function (key) {

            const value =
                values[key];


            /*
               Simple values.
            */

            if (
                typeof value !== 'object' ||
                value === null
            ) {

                postToPreview({

                    type: 'SET_VALUE',

                    key: key,

                    value: value

                });

                return;

            }


            /*
               Structured customization.
            */

            postToPreview({

                type: 'SET_DATA',

                key: key,

                value: value

            });

        }
    );

}


/* =========================================================
   POST MESSAGE
========================================================= */

function postToPreview(
    message
) {

    if (
        !DOM.frame ||
        !DOM.frame.contentWindow
    ) {

        return false;

    }


    try {

        DOM.frame.contentWindow.postMessage(
            message,
            '*'
        );

        return true;

    } catch (error) {

        console.error(
            '[UniversalEditor] postMessage failed:',
            error
        );

        return false;

    }

}


/* =========================================================
   SCAN FALLBACK
========================================================= */

function scanPreviewEditableElements() {

    if (
        !DOM.frame ||
        !DOM.frame.contentDocument
    ) {

        return;

    }


    try {

        const elements =
            DOM.frame.contentDocument
                .querySelectorAll(
                    '[data-editable]'
                );


        if (!elements.length) {
            return;
        }


        const schema =
            [];


        elements.forEach(
            function (element) {

                const key =
                    element.getAttribute(
                        'data-editable'
                    );


                if (!key) {
                    return;
                }


                if (
                    schema.some(
                        item =>
                            item.key === key
                    )
                ) {

                    return;

                }


                let type =
                    'text';


                if (
                    element.tagName === 'IMG'
                ) {

                    type =
                        'image';

                }


                if (
                    element.tagName === 'INPUT'
                ) {

                    type =
                        element.type ||
                        'text';

                }


                if (
                    element.tagName === 'TEXTAREA'
                ) {

                    type =
                        'textarea';

                }


                if (
                    element.tagName === 'SELECT'
                ) {

                    type =
                        'select';

                }


                const value =
                    getElementValue(
                        element
                    );


                schema.push({

                    key: key,

                    label:
                        element.getAttribute(
                            'data-editable-label'
                        ) ||
                        humanizeKey(key),

                    type: type,

                    value: value,

                    group:
                        element.getAttribute(
                            'data-editable-group'
                        ) ||
                        'general',

                    attribute:
                        element.getAttribute(
                            'data-editable-attribute'
                        ) ||
                        null

                });

            }
        );


        if (schema.length) {

            EditorState.templateSchema =
                schema;

            EditorState.schemaLoaded =
                true;

            buildUniversalEditor();

        }

    } catch (error) {

        console.warn(
            '[UniversalEditor] DOM schema fallback failed:',
            error
        );

    }

}


/* =========================================================
   HANDLE ELEMENT SELECTED
========================================================= */

function handleElementSelected(
    data
) {

    const key =
        data.key ||
        data.editable ||
        data.id;


    if (!key) {
        return;
    }


    EditorState.selectedKey =
        key;


    EditorState.selectedSchema =
        (
            EditorState.templateSchema ||
            []
        )
        .find(
            item =>
                item.key === key
        ) ||
        null;


    updateLegacyControls(
        data
    );

}


/* =========================================================
   VALUE RESPONSE
========================================================= */

function handleValueResponse(
    data
) {

    if (!data.key) {
        return;
    }


    setCustomizationValue(
        data.key,
        data.value
    );


    /*
       Update matching universal input.
    */

    syncFieldControls(
        data.key,
        data.value
    );

}


/* =========================================================
   EDITOR STATE
========================================================= */

function handleEditorState(
    data
) {

    if (
        data.dirty !== undefined
    ) {

        EditorState.dirty =
            Boolean(
                data.dirty
            );

    }

}


/* =========================================================
   SAVE RESPONSE
========================================================= */

function handleSaveResponse(
    data
) {

    if (
        data.success
    ) {

        showNotification(
            'تم حفظ التعديلات داخل القالب.',
            'success'
        );

    }

}


/* =========================================================
   SYNC FIELD CONTROLS
========================================================= */

function syncFieldControls(
    key,
    value
) {

    if (!DOM.editorGroups) {
        return;
    }


    const controls =
        DOM.editorGroups.querySelectorAll(
            `[data-field-key="${cssEscape(key)}"]`
        );


    controls.forEach(
        function (control) {

            if (
                control.type === 'checkbox'
            ) {

                control.checked =
                    Boolean(
                        value
                    );

            } else {

                control.value =
                    value ?? '';

            }

        }
    );

}


/* =========================================================
   LEGACY CONTROLS
========================================================= */

function updateLegacyControls(
    data
) {

    if (
        DOM.textInput
    ) {

        DOM.textInput.value =
            data.text ||
            data.value ||
            '';

    }


    if (
        DOM.imageInput
    ) {

        DOM.imageInput.value =
            data.image ||
            data.src ||
            '';

    }


    if (
        DOM.linkInput
    ) {

        DOM.linkInput.value =
            data.href ||
            '';

    }


    if (
        DOM.colorInput
    ) {

        DOM.colorInput.value =
            data.color ||
            '#000000';

    }


    if (
        DOM.fontSizeInput
    ) {

        DOM.fontSizeInput.value =
            data.fontSize ||
            '';

    }

}


/* =========================================================
   APPLY LEGACY CONTROLS
========================================================= */

function applyLegacyControls() {

    const key =
        EditorState.selectedKey;


    if (!key) {

        showNotification(
            'اختر عنصراً أولاً.',
            'warning'
        );

        return;

    }


    if (
        DOM.textInput &&
        DOM.textInput.value !== ''
    ) {

        applyUniversalField(
            {
                key: key,
                type: 'text'
            },
            DOM.textInput.value
        );

    }


    if (
        DOM.imageInput &&
        DOM.imageInput.value
    ) {

        postToPreview({

            type: 'SET_IMAGE',

            key: key,

            value:
                DOM.imageInput.value

        });

        setCustomizationValue(
            key,
            DOM.imageInput.value
        );

    }


    if (
        DOM.linkInput &&
        DOM.linkInput.value
    ) {

        postToPreview({

            type: 'SET_ATTRIBUTE',

            key: key,

            attribute: 'href',

            value:
                DOM.linkInput.value

        });

    }


    if (
        DOM.colorInput &&
        DOM.colorInput.value
    ) {

        postToPreview({

            type: 'SET_STYLE',

            key: key,

            property: 'color',

            value:
                DOM.colorInput.value

        });

    }


    if (
        DOM.fontSizeInput &&
        DOM.fontSizeInput.value
    ) {

        postToPreview({

            type: 'SET_STYLE',

            key: key,

            property: 'font-size',

            value:
                DOM.fontSizeInput.value

        });

    }


    markDirty();


    showNotification(
        'تم تطبيق التعديل.',
        'success'
    );

}


/* =========================================================
   SAVE ALL
========================================================= */

async function saveAll() {

    if (EditorState.saving) {
        return;
    }


    EditorState.saving =
        true;


    setStatus(
        'جاري الحفظ...'
    );


    try {

        await saveProjectData();

        await saveActiveFileIfNeeded();


        EditorState.originalCustomizations =
            deepClone(
                EditorState.customizations
            );


        EditorState.dirty =
            false;


        EditorState.lastSavedAt =
            new Date();


        setStatus(
            'تم الحفظ'
        );


        showNotification(
            'تم حفظ جميع التعديلات بنجاح.',
            'success'
        );

    } catch (error) {

        console.error(
            '[UniversalEditor] Save error:',
            error
        );


        setStatus(
            'فشل الحفظ'
        );


        showNotification(
            error.message ||
            'تعذر حفظ التعديلات.',
            'error'
        );

    } finally {

        EditorState.saving =
            false;

    }

}


/* =========================================================
   SAVE PROJECT DATA
========================================================= */

async function saveProjectData() {

    if (
        !window.TemplateCraftAPI ||
        typeof TemplateCraftAPI.updateSite !== 'function'
    ) {

        throw new Error(
            'TemplateCraftAPI.updateSite غير متوفر.'
        );

    }


    const userId =
        storedUser.id ||
        storedUser._id;


    const payload = {

        userId: userId,

        variables:
            EditorState.customizations

    };


    if (
        EditorState.projectName
    ) {

        payload.siteName =
            EditorState.projectName;

    }


    /*
       Keep template information untouched.
       We don't replace templateId.
    */

    await TemplateCraftAPI.updateSite(
        siteId,
        payload
    );


    /*
       Tell template bridge to persist current state
       if it supports it.
    */

    postToPreview({

        type: 'SAVE_STATE',

        siteId: siteId,

        values:
            EditorState.customizations

    });

}


/* =========================================================
   SAVE ACTIVE FILE
========================================================= */

async function saveActiveFileIfNeeded() {

    /*
       Do nothing if no file is being edited.
    */

    if (
        !EditorState.activeFile ||
        !DOM.codeEditor
    ) {

        return;

    }


    /*
       We intentionally don't automatically overwrite
       every file on every Save All.
       The dedicated Save File button controls code edits.
    */

}


/* =========================================================
   LOAD PROJECT FILES
========================================================= */

async function loadProjectFiles() {

    if (
        !window.TemplateCraftAPI ||
        typeof TemplateCraftAPI.getSiteFiles !== 'function'
    ) {

        return;

    }


    try {

        const userId =
            storedUser.id ||
            storedUser._id;


        const result =
            await TemplateCraftAPI.getSiteFiles(
                siteId,
                userId
            );


        const files =
            Array.isArray(result)
                ? result
                : (
                    result.files ||
                    result.data ||
                    []
                );


        EditorState.files =
            files;


        renderFiles(
            files
        );

    } catch (error) {

        console.warn(
            '[UniversalEditor] Files error:',
            error
        );

        renderFiles([]);

    }

}


/* =========================================================
   RENDER FILES
========================================================= */

function renderFiles(
    files
) {

    if (!DOM.filesList) {
        return;
    }


    DOM.filesList.innerHTML =
        '';


    if (!files.length) {

        DOM.filesList.innerHTML = `
            <div class="p-4 text-sm text-gray-500">
                لا توجد ملفات.
            </div>
        `;

        return;

    }


    files.forEach(
        function (file) {

            const path =
                typeof file === 'string'
                    ? file
                    : (
                        file.path ||
                        file.filePath ||
                        file.name
                    );


            if (!path) {
                return;
            }


            const button =
                document.createElement(
                    'button'
                );


            button.type =
                'button';


            button.className =
                'w-full text-right px-3 py-2 rounded-lg hover:bg-gray-100 text-sm';


            button.textContent =
                path;


            button.addEventListener(
                'click',
                function () {

                    openFile(
                        path
                    );

                }
            );


            DOM.filesList.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   OPEN FILE
========================================================= */

async function openFile(
    filePath
) {

    if (!filePath) {
        return;
    }


    try {

        setStatus(
            'جاري فتح الملف...'
        );


        const content =
            await fetchProjectFile(
                filePath
            );


        EditorState.activeFile =
            filePath;


        if (DOM.codeEditor) {

            DOM.codeEditor.value =
                content;

        }


        activateTab(
            'code'
        );


        setStatus(
            'تم فتح الملف'
        );

    } catch (error) {

        console.error(
            '[UniversalEditor] Open file error:',
            error
        );


        showNotification(
            error.message ||
            'تعذر فتح الملف.',
            'error'
        );

    }

}


/* =========================================================
   FETCH PROJECT FILE
========================================================= */

async function fetchProjectFile(
    filePath
) {

    const safePath =
        sanitizeFilePath(
            filePath
        );


    const site =
        EditorState.currentSite;


    if (
        !site ||
        !site.siteName
    ) {

        throw new Error(
            'بيانات المشروع غير متوفرة.'
        );

    }


    const url =
        `${EDITOR_API_BASE_URL}/sites/` +
        `${encodeURIComponent(site.siteName)}/` +
        `${safePath}`;


    const response =
        await fetch(
            url,
            {
                credentials: 'include'
            }
        );


    if (!response.ok) {

        throw new Error(
            `تعذر تحميل الملف (${response.status}).`
        );

    }


    return await response.text();

}


/* =========================================================
   SAVE ACTIVE FILE
========================================================= */

async function saveActiveFile() {

    if (
        !EditorState.activeFile
    ) {

        showNotification(
            'اختر ملفاً أولاً.',
            'warning'
        );

        return;

    }


    if (
        !DOM.codeEditor
    ) {

        return;

    }


    if (
        !window.TemplateCraftAPI ||
        typeof TemplateCraftAPI.saveSiteFile !== 'function'
    ) {

        showNotification(
            'TemplateCraftAPI.saveSiteFile غير متوفر.',
            'error'
        );

        return;

    }


    try {

        setStatus(
            'جاري حفظ الملف...'
        );


        const userId =
            storedUser.id ||
            storedUser._id;


        await TemplateCraftAPI.saveSiteFile(
            siteId,
            {
                userId: userId,

                filePath:
                    sanitizeFilePath(
                        EditorState.activeFile
                    ),

                content:
                    DOM.codeEditor.value
            }
        );


        setStatus(
            'تم حفظ الملف'
        );


        showNotification(
            'تم حفظ الملف بنجاح.',
            'success'
        );


        markDirty();

    } catch (error) {

        console.error(
            '[UniversalEditor] Save file error:',
            error
        );


        showNotification(
            error.message ||
            'تعذر حفظ الملف.',
            'error'
        );

    }

}


/* =========================================================
   PUBLISH
========================================================= */

async function publishProject() {

    if (EditorState.publishing) {
        return;
    }


    try {

        /*
           Save first.
        */

        if (
            EditorState.dirty
        ) {

            await saveAll();

        }


        if (
            !window.TemplateCraftAPI ||
            typeof TemplateCraftAPI.publish !== 'function'
        ) {

            throw new Error(
                'TemplateCraftAPI.publish غير متوفر.'
            );

        }


        EditorState.publishing =
            true;


        setStatus(
            'جاري النشر...'
        );


        const userId =
            storedUser.id ||
            storedUser._id;


        const result =
            await TemplateCraftAPI.publish(
                siteId,
                userId
            );


        setStatus(
            'تم النشر'
        );


        showNotification(
            'تم نشر المشروع بنجاح.',
            'success'
        );


        /*
           Show publish URL if backend returns one.
        */

        const publishUrl =
            result &&
            (
                result.url ||
                result.liveUrl ||
                result.siteUrl ||
                result.deployUrl
            );


        if (publishUrl) {

            showPublishLink(
                publishUrl
            );

        }

    } catch (error) {

        console.error(
            '[UniversalEditor] Publish error:',
            error
        );


        setStatus(
            'فشل النشر'
        );


        showNotification(
            error.message ||
            'تعذر نشر المشروع.',
            'error'
        );

    } finally {

        EditorState.publishing =
            false;

    }

}


/* =========================================================
   OPEN PREVIEW
========================================================= */

function openPreview() {

    const url =
        EditorState.previewUrl ||
        getPreviewUrl();


    if (!url) {

        showNotification(
            'رابط المعاينة غير متوفر.',
            'error'
        );

        return;

    }


    window.open(
        url,
        '_blank',
        'noopener,noreferrer'
    );

}


/* =========================================================
   TABS
========================================================= */

function activateTab(
    tab
) {

    EditorState.activeTab =
        tab;


    document
        .querySelectorAll(
            '[data-editor-tab]'
        )
        .forEach(
            function (button) {

                const active =
                    button.dataset.editorTab ===
                    tab;


                button.classList.toggle(
                    'active',
                    active
                );

            }
        );


    /*
       Hide common tab panels.
    */

    const panels = {

        element:
            document.getElementById(
                'element-panel'
            ) ||
            document.querySelector(
                '[data-editor-panel="element"]'
            ),

        files:
            document.getElementById(
                'files-panel'
            ) ||
            document.querySelector(
                '[data-editor-panel="files"]'
            ),

        code:
            document.getElementById(
                'code-panel'
            ) ||
            document.querySelector(
                '[data-editor-panel="code"]'
            )

    };


    Object.keys(
        panels
    ).forEach(
        function (key) {

            const panel =
                panels[key];


            if (!panel) {
                return;
            }


            panel.classList.toggle(
                'hidden',
                key !== tab
            );

        }
    );

}


/* =========================================================
   CREATE UNIVERSAL CONTAINER
========================================================= */

function createUniversalEditorContainer() {

    let parent =
        document.querySelector(
            '#element-panel'
        ) ||
        document.querySelector(
            '[data-editor-panel="element"]'
        );


    if (!parent) {

        parent =
            document.querySelector(
                'main'
            );

    }


    if (!parent) {
        return;
    }


    const container =
        document.createElement(
            'div'
        );


    container.id =
        'editor-groups';


    container.className =
        'space-y-4';


    parent.appendChild(
        container
    );


    DOM.editorGroups =
        container;

}


/* =========================================================
   CUSTOMIZATION GET
========================================================= */

function getCustomizationValue(
    key
) {

    if (
        !key
    ) {

        return undefined;

    }


    const parts =
        String(key)
            .split('.');


    let current =
        EditorState.customizations;


    for (
        let i = 0;
        i < parts.length;
        i++
    ) {

        if (
            current === null ||
            current === undefined
        ) {

            return undefined;

        }


        current =
            current[
                parts[i]
            ];

    }


    return current;

}


/* =========================================================
   CUSTOMIZATION SET
========================================================= */

function setCustomizationValue(
    key,
    value
) {

    const parts =
        String(key)
            .split('.');


    let current =
        EditorState.customizations;


    for (
        let i = 0;
        i < parts.length - 1;
        i++
    ) {

        const part =
            parts[i];


        if (
            !current[part] ||
            typeof current[part] !== 'object'
        ) {

            current[part] =
                {};

        }


        current =
            current[part];

    }


    current[
        parts[parts.length - 1]
    ] =
        value;

}


/* =========================================================
   DIRTY
========================================================= */

function markDirty() {

    EditorState.dirty =
        true;


    setStatus(
        'توجد تعديلات غير محفوظة'
    );

}


/* =========================================================
   STATUS
========================================================= */

function setStatus(
    text
) {

    if (!DOM.status) {
        return;
    }


    DOM.status.textContent =
        text;

}


/* =========================================================
   LOADING
========================================================= */

function setLoading(
    state
) {

    EditorState.loading =
        Boolean(
            state
        );

    document.body.classList.toggle(
        'editor-loading',
        EditorState.loading
    );

}


/* =========================================================
   NOTIFICATION
========================================================= */

function showNotification(
    message,
    type = 'info'
) {

    if (!DOM.notification) {

        console.log(
            `[Editor:${type}]`,
            message
        );

        return;

    }


    DOM.notification.textContent =
        message;


    DOM.notification.classList.remove(
        'hidden'
    );


    DOM.notification.dataset.type =
        type;


    clearTimeout(
        showNotification.timer
    );


    showNotification.timer =
        setTimeout(
            function () {

                DOM.notification.classList.add(
                    'hidden'
                );

            },
            3500
        );

}


/* =========================================================
   TEMPLATE HEADER
========================================================= */

function updateTemplateHeader() {

    const config =
        EditorState.templateConfig;


    const elements =
        document.querySelectorAll(
            '[data-template-name]'
        );


    elements.forEach(
        function (element) {

            element.textContent =
                config.name ||
                EditorState.templateId ||
                'Template';

        }
    );


    const ids =
        document.querySelectorAll(
            '[data-template-id]'
        );


    ids.forEach(
        function (element) {

            element.textContent =
                EditorState.templateId ||
                '';

        }
    );

}


/* =========================================================
   PUBLISH LINK
========================================================= */

function showPublishLink(
    url
) {

    const element =
        document.getElementById(
            'publish-link'
        );


    if (!element) {
        return;
    }


    element.href =
        url;


    element.textContent =
        url;


    element.classList.remove(
        'hidden'
    );

}


/* =========================================================
   SANITIZE FILE PATH
========================================================= */

function sanitizeFilePath(
    path
) {

    return String(
        path || ''
    )
    .replace(/^\/+/, '')
    .replace(/\.\./g, '');

}


/* =========================================================
   CACHE BUSTER
========================================================= */

function addCacheBuster(
    url
) {

    const separator =
        url.includes('?')
            ? '&'
            : '?';


    return (
        `${url}` +
        `${separator}_t=${Date.now()}`
    );

}


/* =========================================================
   NORMALIZE INPUT
========================================================= */

function normalizeInputValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return '';

    }


    if (
        typeof value === 'object'
    ) {

        return JSON.stringify(
            value
        );

    }


    return String(
        value
    );

}


/* =========================================================
   GET ELEMENT VALUE
========================================================= */

function getElementValue(
    element
) {

    if (
        element.tagName === 'IMG'
    ) {

        return element.getAttribute(
            'src'
        ) || '';

    }


    if (
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT'
    ) {

        return element.value;

    }


    return (
        element.textContent ||
        ''
    ).trim();

}


/* =========================================================
   HUMANIZE KEY
========================================================= */

function humanizeKey(
    key
) {

    return String(
        key || ''
    )
    .replace(
        /[_-]+/g,
        ' '
    )
    .replace(
        /([a-z])([A-Z])/g,
        '$1 $2'
    )
    .replace(
        /\b\w/g,
        function (letter) {
            return letter.toUpperCase();
        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

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


/* =========================================================
   CSS ESCAPE
========================================================= */

function cssEscape(
    value
) {

    if (
        window.CSS &&
        typeof CSS.escape === 'function'
    ) {

        return CSS.escape(
            String(value)
        );

    }


    return String(
        value
    )
    .replace(
        /([^\w-])/g,
        '\\$1'
    );

}


/* =========================================================
   DEEP CLONE
========================================================= */

function deepClone(
    value
) {

    if (
        value === undefined
    ) {

        return {};

    }


    try {

        return JSON.parse(
            JSON.stringify(
                value
            )
        );

    } catch (error) {

        return {};

    }

}


/* =========================================================
   GLOBAL DEBUG API
========================================================= */

window.TemplateCraftUniversalEditor = {

    state:
        EditorState,

    reloadTemplateConfig:
        loadTemplateConfig,

    reloadSchema:
        requestBridgeSchema,

    rebuild:
        buildUniversalEditor,

    save:
        saveAll,

    publish:
        publishProject

};


/* =========================================================
   DEBUG
========================================================= */

console.log(
    '[TemplateCraft Pro] Universal Editor loaded.',
    {
        siteId: siteId
    }
);
