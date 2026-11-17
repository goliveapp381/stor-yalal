/*
====================================================
 TEMPLATECRAFT PRO
 CREATE PROJECT - TEMPLATES
====================================================

 مسؤول عن:
 - Templates
 - Select Template
 - Preview
 - Close Preview
 - Choose From Preview
 - Category Change

====================================================
*/


// ================================================
// 1. TEMPLATE CONFIGURATION
// ================================================

const templateList = [

    {
        id: 'template-1',
        name: 'القالب الأول',
        description: 'تصميم احترافي'
    },

    {
        id: 'template-2',
        name: 'القالب الثاني',
        description: 'تصميم عصري'
    },

    {
        id: 'template-3',
        name: 'القالب الثالث',
        description: 'تصميم أنيق'
    },

    {
        id: 'template-4',
        name: 'القالب الرابع',
        description: 'تصميم متطور'
    },

    {
        id: 'template-5',
        name: 'القالب الخامس',
        description: 'تصميم مميز'
    },

    {
        id: 'template-6',
        name: 'القالب السادس',
        description: 'تصميم إبداعي'
    }

];


let selectedTemplateId =
    'template-1';

let previewTemplateId =
    null;


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
// 3. RENDER TEMPLATES
// ================================================

function renderTemplates() {

    if (!templateGridElement) {

        return;

    }


    templateGridElement.innerHTML =
        '';


    templateList.forEach(
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


            card.innerHTML = `

                <div class="selectedGlowLine"></div>

                <div class="relative bg-gray-100 overflow-hidden">

                    <iframe
                        class="preview-frame"
                        src="${previewUrl || 'about:blank'}"
                        title="${template.name}"
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
                            ${template.name}
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
                        ${template.description}
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
// 4. SELECT TEMPLATE
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
// 5. UPDATE SELECTED LABEL
// ================================================

function updateSelectedLabel() {

    if (!selectedLabelElement) {

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
// 6. OPEN PREVIEW
// ================================================

function openPreview(
    templateId
) {

    previewTemplateId =
        templateId;


    const template =
        templateList.find(
            function(item) {

                return item.id ===
                    templateId;

            }
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
// 7. CLOSE PREVIEW
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
// 8. PREVIEW EVENTS
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


                showStatus(
                    'تم اختيار القالب بنجاح.',
                    'success'
                );

            }
        );

    }

}


// ================================================
// 9. CATEGORY CHANGE
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


            renderTemplates();

        }
    );

}


// ================================================
// 10. ESCAPE KEY
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
// 11. INITIALIZE TEMPLATE SYSTEM
// ================================================

function initializeTemplateSystem() {

    renderTemplates();

    initializePreviewEvents();

    initializeCategoryEvents();

    initializeTemplateKeyboardEvents();

}


// ================================================
// 12. PUBLIC
// ================================================

window.initializeTemplateSystem =
    initializeTemplateSystem;
