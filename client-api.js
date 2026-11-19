/*
============================================
 TEMPLATECRAFT PRO - CLIENT API
 Frontend API Connector
 Express + MongoDB Atlas + Netlify OAuth
 Authentication + Projects + Templates
 Publishing + Custom Domains + Cloudflare
 Read-only SSL Diagnostics
============================================
*/

'use strict';


// ============================================
// 1. API CONFIGURATION
// ============================================

const TEMPLATECRAFT_API_BASE_URL = String(
    window.TEMPLATECRAFT_API_BASE_URL ||
    'https://templatecraft-backend.onrender.com'
).replace(
    /\/+$/,
    ''
);


// ============================================
// 2. AUTHENTICATION HELPERS
// ============================================

function getAuthToken() {

    try {

        return (
            localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            ''
        );

    } catch (_) {

        return '';

    }

}


function getStoredUser() {

    try {

        return JSON.parse(
            localStorage.getItem('user') ||
            'null'
        );

    } catch (_) {

        return null;

    }

}


function getAuthHeaders() {

    const token =
        getAuthToken();


    const headers = {
        Accept: 'application/json'
    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    return headers;

}


// ============================================
// 3. REQUEST HELPERS
// ============================================

function isFormData(value) {

    return (
        typeof FormData !== 'undefined' &&
        value instanceof FormData
    );

}


function isPlainObject(value) {

    if (
        !value ||
        typeof value !== 'object'
    ) {

        return false;

    }


    const prototype =
        Object.getPrototypeOf(
            value
        );


    return (
        prototype === Object.prototype ||
        prototype === null
    );

}


function normalizeEndpoint(endpoint) {

    const value =
        String(
            endpoint || ''
        ).trim();


    if (!value) {

        throw new Error(
            'API endpoint غير صالح'
        );

    }


    return value.startsWith('/')
        ? value
        : `/${value}`;

}


function createApiError(
    message,
    status = 0,
    data = {}
) {

    return {

        success: false,

        error: message,

        message,

        status,

        code:
            data?.code ||
            null,

        requestId:
            data?.requestId ||
            null,

        data

    };

}


// ============================================
// 4. GENERAL API REQUEST
// ============================================

async function apiRequest(
    endpoint,
    options = {}
) {

    let url;


    try {

        const cleanEndpoint =
            normalizeEndpoint(
                endpoint
            );


        url =
            `${TEMPLATECRAFT_API_BASE_URL}${cleanEndpoint}`;

    } catch (error) {

        return createApiError(
            error.message ||
            'API endpoint غير صالح'
        );

    }


    if (
        !options ||
        typeof options !== 'object' ||
        Array.isArray(options)
    ) {

        options = {};

    }


    const headers = {

        ...getAuthHeaders(),

        ...(options.headers || {})

    };


    const requestOptions = {

        ...options,

        headers

    };


    // ----------------------------------------
    // JSON BODY HANDLING
    // ----------------------------------------

    const body =
        requestOptions.body;


    if (
        body !== undefined &&
        body !== null &&
        isPlainObject(body)
    ) {

        const hasContentType =
            Object.keys(headers).some(
                key =>
                    key.toLowerCase() ===
                    'content-type'
            );


        if (!hasContentType) {

            headers['Content-Type'] =
                'application/json';

        }


        requestOptions.body =
            JSON.stringify(
                body
            );

    }


    // ----------------------------------------
    // FETCH
    // ----------------------------------------

    let response;


    try {

        response =
            await fetch(
                url,
                requestOptions
            );

    } catch (error) {

        console.error(
            `API connection failed [${endpoint}]`,
            error?.message ||
            error
        );


        return createApiError(
            'تعذر الاتصال بالسيرفر. تحقق من الإنترنت وحاول مرة أخرى.',
            0
        );

    }


    // ----------------------------------------
    // READ RESPONSE
    // ----------------------------------------

    let responseText = '';


    try {

        responseText =
            await response.text();

    } catch (error) {

        console.error(
            `API response read failed [${endpoint}]`,
            error?.message ||
            error
        );


        return createApiError(
            'تعذر قراءة استجابة السيرفر.',
            response.status
        );

    }


    let data = {};


    if (responseText) {

        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch (_) {

            data = {

                message:
                    responseText

            };

        }

    }


    // ----------------------------------------
    // HTTP ERROR
    // ----------------------------------------

    if (!response.ok) {

        const message =
            data?.error ||
            data?.message ||
            data?.detail ||
            `HTTP Error ${response.status}`;


        console.error(
            `API request failed [${endpoint}]:`,
            response.status,
            data?.code || '',
            data?.requestId || ''
        );


        return createApiError(
            message,
            response.status,
            data
        );

    }


    // ----------------------------------------
    // SUCCESS RESPONSE
    // ----------------------------------------

    if (
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data)
    ) {

        return {

            success: true,

            data

        };

    }


    return {

        ...data,

        success:
            data.success === undefined
                ? true
                : data.success

    };

}


// ============================================
// 5. USER DATA HELPERS
// ============================================

// لا نعتمد على userId المرسل من المتصفح.
// Backend يستخرج هوية المستخدم من JWT.

function addUserId(
    data = {}
) {

    if (
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data)
    ) {

        return {};

    }


    const safeData = {
        ...data
    };


    delete safeData.userId;


    return safeData;

}


// ============================================
// 6. SITE NORMALIZATION
// ============================================

function normalizeSite(
    site = {}
) {

    if (
        !site ||
        typeof site !== 'object' ||
        Array.isArray(site)
    ) {

        return {};

    }


    return {

        ...site,

        id:
            site._id ||
            site.id ||
            site.siteId ||
            null,

        siteName:
            site.siteName ||
            site.name ||
            '',

        templateId:
            site.templateId ||
            '',

        projectType:
            site.projectType ||
            site.type ||
            '',

        status:
            site.status ||
            'unknown',

        publishStatus:
            site.publishStatus ||
            'unknown',

        url:
            site.url ||
            site.siteUrl ||
            site.deployUrl ||
            site.liveUrl ||
            '',

        liveUrl:
            site.liveUrl ||
            site.url ||
            site.siteUrl ||
            '',

        customDomain:
            site.customDomain ||
            '',

        customUrl:
            site.customUrl ||
            '',

        domainStatus:
            site.domainStatus ||
            'not_configured',

        createdAt:
            site.createdAt ||
            null,

        updatedAt:
            site.updatedAt ||
            null

    };

}


function normalizeSiteResponse(
    response = {}
) {

    const payload =
        response.data &&
        typeof response.data === 'object'
            ? response.data
            : response;


    let sites = [];


    if (Array.isArray(payload)) {

        sites =
            payload;

    } else if (
        Array.isArray(
            payload.sites
        )
    ) {

        sites =
            payload.sites;

    } else if (
        Array.isArray(
            payload.projects
        )
    ) {

        sites =
            payload.projects;

    } else if (
        Array.isArray(
            payload.data
        )
    ) {

        sites =
            payload.data;

    }


    return {

        ...response,

        sites:
            sites.map(
                normalizeSite
            )

    };

}


function normalizeDeployResponse(
    response = {}
) {

    const payload =
        response.data &&
        typeof response.data === 'object'
            ? response.data
            : response;


    const site =
        payload.site ||
        payload.project ||
        (
            payload._id ||
            payload.id
                ? payload
                : {}
        );


    return {

        ...response,

        site:
            normalizeSite(
                site
            )

    };

}


// ============================================
// 7. QUERY STRING HELPER
// ============================================

function buildQuery(
    params = {}
) {

    if (
        !params ||
        typeof params !== 'object' ||
        Array.isArray(params)
    ) {

        return '';

    }


    const query =
        new URLSearchParams();


    Object.entries(
        params
    ).forEach(
        ([key, value]) => {

            if (
                value === undefined ||
                value === null ||
                value === ''
            ) {

                return;

            }


            if (
                typeof value === 'object'
            ) {

                query.append(
                    key,
                    JSON.stringify(
                        value
                    )
                );

            } else {

                query.append(
                    key,
                    String(value)
                );

            }

        }
    );


    const result =
        query.toString();


    return result
        ? `?${result}`
        : '';

}


// ============================================
// 8. TEMPLATE NORMALIZATION
// ============================================

function normalizeTemplate(
    template = {}
) {

    if (
        !template ||
        typeof template !== 'object' ||
        Array.isArray(template)
    ) {

        return {};

    }


    const projectType =
        template.projectType ||
        template.category ||
        template.type ||
        '';


    const templateId =
        template.templateId ||
        template.id ||
        template.slug ||
        '';


    let previewUrl =
        template.previewUrl ||
        template.preview ||
        '';


    /*
    ============================================
    BUILD PREVIEW URL IF BACKEND DID NOT SEND IT
    ============================================
    */

    if (
        !previewUrl &&
        projectType &&
        templateId
    ) {

        previewUrl =
            TemplateCraftAPI.getTemplatePreviewUrl(
                templateId,
                projectType
            );

    }


    return {

        ...template,

        id:
            templateId,

        templateId,

        projectType,

        name:
            template.name ||
            template.title ||
            templateId,

        title:
            template.title ||
            template.name ||
            templateId,

        previewUrl

    };

}


function normalizeTemplateResponse(
    response = {}
) {

    if (
        !response ||
        typeof response !== 'object'
    ) {

        return response;

    }


    const payload =
        response.data &&
        typeof response.data === 'object'
            ? response.data
            : response;


    let templates = [];


    if (
        Array.isArray(payload)
    ) {

        templates =
            payload;

    } else if (
        Array.isArray(
            payload.templates
        )
    ) {

        templates =
            payload.templates;

    } else if (
        Array.isArray(
            payload.data
        )
    ) {

        templates =
            payload.data;

    }


    return {

        ...response,

        templates:
            templates.map(
                normalizeTemplate
            )

    };

}


// ============================================
// 9. TEMPLATECRAFT API
// ============================================

const TemplateCraftAPI = {


    // ========================================
    // SERVER STATUS
    // ========================================

    async status() {

        return apiRequest(
            '/api/status',
            {
                method: 'GET'
            }
        );

    },


    // ========================================
    // AUTHENTICATION
    // ========================================

    async signup(
        userData = {}
    ) {

        return apiRequest(
            '/api/auth/signup',
            {
                method: 'POST',
                body: userData
            }
        );

    },


    async login(
        credentials = {}
    ) {

        return apiRequest(
            '/api/auth/login',
            {
                method: 'POST',
                body: credentials
            }
        );

    },


    // ========================================
    // CREATE / DEPLOY PROJECT
    // ========================================

    async deploy(
        projectData = {}
    ) {

        const response =
            await apiRequest(
                '/api/deploy',
                {
                    method: 'POST',
                    body:
                        addUserId(
                            projectData
                        )
                }
            );


        if (response.success) {

            return normalizeDeployResponse(
                response
            );

        }


        return response;

    },


    // ========================================
    // GET ALL USER PROJECTS
    // ========================================

    async getSites(
        options = {}
    ) {

        if (
            !options ||
            typeof options !== 'object' ||
            Array.isArray(options)
        ) {

            options = {};

        }


        const query =
            buildQuery(
                options
            );


        const response =
            await apiRequest(
                `/api/sites${query}`,
                {
                    method: 'GET'
                }
            );


        if (!response.success) {

            return response;

        }


        return normalizeSiteResponse(
            response
        );

    },


    // ========================================
    // GET ONE PROJECT
    // ========================================

    async getSite(
        siteId
    ) {

        if (!siteId) {

            return createApiError(
                'معرف المشروع غير موجود.'
            );

        }


        const response =
            await apiRequest(
                `/api/sites/${encodeURIComponent(siteId)}`,
                {
                    method: 'GET'
                }
            );


        if (
            response.success &&
            response.site
        ) {

            response.site =
                normalizeSite(
                    response.site
                );

        }


        return response;

    },


    // ========================================
    // UPDATE PROJECT
    // ========================================

    async updateSite(
        siteId,
        updates = {}
    ) {

        if (!siteId) {

            return createApiError(
                'معرف المشروع غير موجود.'
            );

        }


        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}`,
            {
                method: 'PUT',
                body: updates
            }
        );

    },


    // ========================================
    // GET PROJECT FILES
    // ========================================

    async getSiteFiles(
        siteId
    ) {

        if (!siteId) {

            return createApiError(
                'معرف المشروع غير موجود.'
            );

        }


        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}/files`,
            {
                method: 'GET'
            }
        );

    },


    async getProjectFiles(
        siteId
    ) {

        return this.getSiteFiles(
            siteId
        );

    },


    // ========================================
    // SAVE PROJECT FILE
    // ========================================

    async saveSiteFile(
        siteId,
        fileData = {}
    ) {

        if (!siteId) {

            return createApiError(
                'معرف المشروع غير موجود.'
            );

        }


        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}/files`,
            {
                method: 'PUT',
                body: fileData
            }
        );

    },


    async saveProjectFile(
        siteId,
        fileData = {}
    ) {

        return this.saveSiteFile(
            siteId,
            fileData
        );

    },


    // ========================================
    // DELETE PROJECT
    // DELETE /api/sites/:siteId
    // ========================================

    async deleteSite(
        siteId
    ) {

        if (!siteId) {

            return createApiError(
                'معرف المشروع غير موجود.'
            );

        }


        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}`,
            {
                method: 'DELETE'
            }
        );

    },


    // ========================================
    // TEMPLATES
    // ========================================

    async getTemplates() {

        const response =
            await apiRequest(
                '/api/templates',
                {
                    method: 'GET'
                }
            );


        if (!response.success) {

            return response;

        }


        return normalizeTemplateResponse(
            response
        );

    },


    // ========================================
    // GET ONE TEMPLATE
    // ========================================

    async getTemplate(
        projectType,
        templateId
    ) {

        if (
            !projectType ||
            !templateId
        ) {

            return createApiError(
                'projectType و templateId مطلوبان.'
            );

        }


        const response =
            await apiRequest(
                `/api/templates/` +
                `${encodeURIComponent(projectType)}/` +
                `${encodeURIComponent(templateId)}`,
                {
                    method: 'GET'
                }
            );


        if (
            response.success
        ) {

            /*
            ====================================
            NORMALIZE TEMPLATE OBJECT
            ====================================
            */

            if (
                response.template
            ) {

                response.template =
                    normalizeTemplate(
                        response.template
                    );

            }


            /*
            ====================================
            SOME BACKENDS RETURN TEMPLATE DIRECTLY
            ====================================
            */

            else if (
                response.templateId ||
                response.id
            ) {

                return {

                    ...response,

                    template:
                        normalizeTemplate(
                            response
                        )

                };

            }

        }


        return response;

    },


    // ========================================
    // GET TEMPLATE CATEGORIES
    // ========================================

    async getTemplateCategories() {

        return apiRequest(
            '/api/templates/categories',
            {
                method: 'GET'
            }
        );

    },


    // ========================================
    // TEMPLATE PREVIEW
    // ========================================

    getTemplatePreviewUrl(
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


        const cleanProjectType =
            String(
                projectType ||
                ''
            ).trim();


        if (!cleanTemplateId) {

            return '';

        }


        /*
        ========================================
        PREFERRED ROUTE
        ========================================

        /api/templates/:projectType/:templateId/preview

        Example:

        /api/templates/ecommerce/velocity-store/preview

        ========================================
        */

        if (cleanProjectType) {

            return (
                `${TEMPLATECRAFT_API_BASE_URL}` +
                `/api/templates/` +
                `${encodeURIComponent(cleanProjectType)}/` +
                `${encodeURIComponent(cleanTemplateId)}/` +
                `preview`
            );

        }


        /*
        ========================================
        LEGACY ROUTE
        ========================================

        Kept for old templates / old frontend code.

        ========================================
        */

        return (
            `${TEMPLATECRAFT_API_BASE_URL}` +
            `/api/templates/` +
            `${encodeURIComponent(cleanTemplateId)}/` +
            `preview`
        );

    },


    // ========================================
    // PROJECT PREVIEW
    // ========================================

    getProjectPreviewUrl(
        siteId
    ) {

        if (!siteId) {

            return '';

        }


        return (
            `${TEMPLATECRAFT_API_BASE_URL}` +
            `/api/sites/` +
            `${encodeURIComponent(siteId)}` +
            `/preview`
        );

    },


    // ========================================
    // CUSTOM DOMAIN STATUS
    // GET /api/site/:siteId/domain-status
    // ========================================

    async getDomainStatus(
        siteId
    ) {

        if (!siteId) {

            return createApiError(
                'معرف المشروع غير موجود.'
            );

        }


        return apiRequest(
            `/api/site/${encodeURIComponent(siteId)}/domain-status`,
            {
                method: 'GET',
                cache: 'no-store'
            }
        );

    },


    // ========================================
    // READ-ONLY DOMAIN / SSL DIAGNOSTICS
    // ========================================

    async getDomainDiagnostics(
        siteId
    ) {

        if (!siteId) {

            return createApiError(
                'معرف المشروع غير موجود.'
            );

        }


        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}/domain/diagnostics`,
            {
                method: 'GET',
                cache: 'no-store'
            }
        );

    },


    // ========================================
    // CHECK SSL
    // ========================================

    async checkSSL(
        siteId
    ) {

        return this.getDomainDiagnostics(
            siteId
        );

    },


    // ========================================
    // PUBLISH PROJECT
    // ========================================

    async publish(
        siteId,
        publishData = {}
    ) {

        if (!siteId) {

            return createApiError(
                'معرف المشروع غير موجود.'
            );

        }


        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}/publish`,
            {
                method: 'POST',
                body: publishData
            }
        );

    },


    // ========================================
    // NETLIFY OAUTH - CONNECT ACCOUNT
    // ========================================

    async connectNetlify() {

        return apiRequest(
            '/api/netlify/connect',
            {
                method: 'POST'
            }
        );

    },


    // ========================================
    // NETLIFY CONNECTION STATUS
    // ========================================

    async getNetlifyStatus() {

        return apiRequest(
            '/api/netlify/status',
            {
                method: 'GET'
            }
        );

    },


    // ========================================
    // GET AVAILABLE NETLIFY TEAMS
    // ========================================

    async getNetlifyTeams() {

        return apiRequest(
            '/api/netlify/teams',
            {
                method: 'GET'
            }
        );

    },


    // ========================================
    // SELECT NETLIFY TEAM
    // Backend expects accountSlug
    // ========================================

    async selectNetlifyTeam(
        accountSlug
    ) {

        if (
            !accountSlug ||
            typeof accountSlug !== 'string' ||
            !accountSlug.trim()
        ) {

            return createApiError(
                'خاصك تختار Team صالح.'
            );

        }


        return apiRequest(
            '/api/netlify/team',
            {
                method: 'POST',
                body: {
                    accountSlug:
                        accountSlug.trim()
                }
            }
        );

    },


    // ========================================
    // DISCONNECT NETLIFY ACCOUNT
    // Does NOT delete existing projects
    // ========================================

    async disconnectNetlify() {

        return apiRequest(
            '/api/netlify/disconnect',
            {
                method: 'POST'
            }
        );

    }

};


// ============================================
// 10. GLOBAL EXPORTS
// ============================================

window.TemplateCraftAPI =
    TemplateCraftAPI;


window.templateCraftAPI =
    TemplateCraftAPI;


window.TEMPLATECRAFT_API_BASE_URL =
    TEMPLATECRAFT_API_BASE_URL;


// ============================================
// 11. OPTIONAL DEBUG INFORMATION
// ============================================

console.log(
    'TemplateCraft API initialized'
);

console.log(
    'Backend:',
    TEMPLATECRAFT_API_BASE_URL
);
