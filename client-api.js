// ==========================================
// TEMPLATECRAFT PRO - API CLIENT
// JWT AUTHENTICATION ENABLED
// ==========================================


// ==========================================
// 1. SERVER CONFIGURATION
// ==========================================

const TEMPLATECRAFT_API_BASE_URL = (
    window.TEMPLATECRAFT_API_URL ||
    'https://templatecraft-backend.onrender.com'
).replace(/\/+$/, '');


// ==========================================
// 2. AUTHENTICATION HELPERS
// ==========================================

function getAuthToken() {
    return localStorage.getItem('token');
}


function getAuthHeaders() {

    const headers = {};
    const token = getAuthToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}


// ==========================================
// 3. COMMON REQUEST HELPER
// ==========================================

async function apiRequest(endpoint, options = {}) {

    try {

        const isFormData =
            typeof FormData !== 'undefined' &&
            options.body instanceof FormData;

        const headers = {
            ...(isFormData
                ? {}
                : { 'Content-Type': 'application/json' }),

            ...getAuthHeaders(),

            ...(options.headers || {})
        };


        const response = await fetch(
            `${TEMPLATECRAFT_API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers
            }
        );


        const responseText = await response.text();

        let data;

        try {

            data = responseText
                ? JSON.parse(responseText)
                : {};

        } catch (_) {

            data = {
                success: false,
                error: 'استجابة غير صالحة من السيرفر'
            };

        }


        if (!response.ok) {

            return {
                ...data,
                success: false,
                status: response.status,

                error:
                    data.error ||
                    data.message ||
                    `خطأ من السيرفر: ${response.status}`
            };

        }


        return {
            ...data,
            status: response.status
        };


    } catch (error) {

        console.error('TemplateCraft API Error:', error);

        return {
            success: false,
            status: 0,
            error: 'تعذر الاتصال بالسيرفر. تحقق من الإنترنت وحالة Backend.'
        };

    }

}


// ==========================================
// 4. URL HELPERS
// ==========================================

function addUserId(endpoint, userId) {

    if (!userId) {
        return endpoint;
    }

    const separator = endpoint.includes('?') ? '&' : '?';

    return `${endpoint}${separator}userId=${encodeURIComponent(userId)}`;

}


// ==========================================
// 5. RESPONSE NORMALIZATION
// ==========================================

function normalizeSite(site) {

    if (!site || typeof site !== 'object') {
        return site;
    }

    const customUrl = site.customUrl || null;

    const domainStatus = site.domainStatus || 'pending';

    const customDomainActive =
        domainStatus === 'active' &&
        typeof customUrl === 'string' &&
        customUrl.startsWith('https://');

    return {
        ...site,

        // Internal compatibility.
        liveUrl: site.liveUrl || null,

        // Custom domain information.
        customUrl,
        customDomain: site.customDomain || null,
        domainStatus,
        domainError: site.domainError || null,

        // Public URL only after domain activation.
        publicUrl: customDomainActive
            ? customUrl
            : null,

        domainPending: !customDomainActive
    };

}


function normalizeSiteResponse(result) {

    if (!result || typeof result !== 'object') {
        return result;
    }

    const normalized = { ...result };

    if (normalized.site) {
        normalized.site = normalizeSite(normalized.site);
    }

    if (Array.isArray(normalized.sites)) {
        normalized.sites = normalized.sites.map(normalizeSite);
    }

    return normalized;

}


function normalizeDeployResponse(result) {

    if (!result || typeof result !== 'object') {
        return result;
    }

    const normalized = normalizeSiteResponse(result);

    const site = normalized.site || {};

    const liveUrl =
        normalized.liveUrl ||
        site.liveUrl ||
        normalized.deployUrl ||
        null;

    const customUrl =
        normalized.customUrl ||
        site.customUrl ||
        null;

    const domainStatus =
        normalized.domainStatus ||
        site.domainStatus ||
        'pending';

    const customDomainActive =
        domainStatus === 'active' &&
        typeof customUrl === 'string' &&
        customUrl.startsWith('https://');

    return {
        ...normalized,

        liveUrl,

        customUrl,

        customDomain:
            normalized.customDomain ||
            site.customDomain ||
            null,

        domainStatus,

        publicUrl: customDomainActive
            ? customUrl
            : null,

        domainPending: !customDomainActive
    };

}


// ==========================================
// 6. TEMPLATECRAFT API
// ==========================================

const TemplateCraftAPI = {


    // --------------------------------------
    // Server Status
    // Public endpoint
    // --------------------------------------

    async status() {

        return apiRequest('/api/status', {
            method: 'GET'
        });

    },


    // --------------------------------------
    // Signup
    // Public endpoint
    // --------------------------------------

    async signup(userData) {

        return apiRequest('/api/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

    },


    // --------------------------------------
    // Login
    // Public endpoint
    // --------------------------------------

    async login(credentials) {

        return apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });

    },


    // --------------------------------------
    // Deploy New Project
    // JWT required
    // --------------------------------------

    async deploy(siteData) {

        const result = await apiRequest('/api/deploy', {
            method: 'POST',
            body: JSON.stringify(siteData)
        });

        return normalizeDeployResponse(result);

    },


    // --------------------------------------
    // Get User Projects
    // JWT required
    // --------------------------------------

    async getSites(userId) {

        if (!userId) {

            return {
                success: false,
                error: 'معرف المستخدم غير موجود'
            };

        }

        const result = await apiRequest(
            `/api/sites/${encodeURIComponent(userId)}`,
            {
                method: 'GET'
            }
        );

        return normalizeSiteResponse(result);

    },


    // --------------------------------------
    // Get Single Project
    // JWT required
    // --------------------------------------

    async getSite(siteId, userId) {

        if (!siteId) {

            return {
                success: false,
                error: 'معرف المشروع غير موجود'
            };

        }

        const endpoint = addUserId(
            `/api/site/${encodeURIComponent(siteId)}`,
            userId
        );

        const result = await apiRequest(endpoint, {
            method: 'GET'
        });

        return normalizeSiteResponse(result);

    },


    // --------------------------------------
    // Update Project
    // JWT required
    // --------------------------------------

    async updateSite(siteId, projectData = {}) {

        if (!siteId) {

            return {
                success: false,
                error: 'معرف المشروع غير موجود'
            };

        }

        const result = await apiRequest(
            `/api/site/${encodeURIComponent(siteId)}`,
            {
                method: 'PUT',
                body: JSON.stringify(projectData)
            }
        );

        return normalizeSiteResponse(result);

    },


    // --------------------------------------
    // Get Project Files
    // JWT required
    // --------------------------------------

    async getSiteFiles(siteId, userId) {

        if (!siteId) {

            return {
                success: false,
                error: 'معرف المشروع غير موجود'
            };

        }

        const endpoint = addUserId(
            `/api/site/${encodeURIComponent(siteId)}/files`,
            userId
        );

        return apiRequest(endpoint, {
            method: 'GET'
        });

    },


    // --------------------------------------
    // Backward Compatibility
    // --------------------------------------

    async getProjectFiles(siteId, userId) {

        return this.getSiteFiles(siteId, userId);

    },


    // --------------------------------------
    // Save Edited Project File
    // JWT required
    // --------------------------------------

    async saveSiteFile(siteId, fileData = {}) {

        if (!siteId || !fileData.filePath) {

            return {
                success: false,
                error: 'معلومات الملف ناقصة'
            };

        }

        return apiRequest(
            `/api/site/${encodeURIComponent(siteId)}/file`,
            {
                method: 'PUT',

                body: JSON.stringify({
                    // Kept for old frontend compatibility.
                    // Backend must use the JWT identity instead.
                    userId: fileData.userId,

                    filePath: fileData.filePath,
                    content: fileData.content
                })
            }
        );

    },


    // --------------------------------------
    // Backward Compatibility
    // --------------------------------------

    async saveProjectFile(siteId, filePath, content, userId) {

        return this.saveSiteFile(siteId, {
            userId,
            filePath,
            content
        });

    },


    // --------------------------------------
    // Get Available Templates
    // Public endpoint
    // --------------------------------------

    async getTemplates(projectType) {

        if (!projectType) {

            return {
                success: false,
                error: 'نوع القالب غير محدد'
            };

        }

        return apiRequest(
            `/api/templates/${encodeURIComponent(projectType)}`,
            {
                method: 'GET'
            }
        );

    },


    // --------------------------------------
    // Get Template Preview URL
    // Public endpoint
    // --------------------------------------

    getTemplatePreviewUrl(projectType, templateId) {

        if (!projectType || !templateId) {
            return null;
        }

        return (
            `${TEMPLATECRAFT_API_BASE_URL}/api/template-preview/` +
            `${encodeURIComponent(projectType)}/` +
            `${encodeURIComponent(templateId)}`
        );

    },


    // --------------------------------------
    // Get Project Preview URL
    // --------------------------------------

    getProjectPreviewUrl(siteName) {

        if (!siteName) {
            return null;
        }

        return (
            `${TEMPLATECRAFT_API_BASE_URL}/sites/` +
            `${encodeURIComponent(siteName)}/index.html`
        );

    },


    // --------------------------------------
    // Get Project Domain Status
    // JWT required
    // --------------------------------------

    async getDomainStatus(siteId, userId) {

        if (!siteId) {

            return {
                success: false,
                error: 'معرف المشروع غير موجود'
            };

        }

        const endpoint = addUserId(
            `/api/site/${encodeURIComponent(siteId)}/domain-status`,
            userId
        );

        const result = await apiRequest(endpoint, {
            method: 'GET'
        });

        return normalizeSiteResponse(result);

    },


    // --------------------------------------
    // Publish Project to Netlify
    // JWT required
    // --------------------------------------

    async publish(siteId, userId) {

        if (!siteId) {

            return {
                success: false,
                error: 'معرف المشروع غير موجود'
            };

        }

        if (!userId) {

            return {
                success: false,
                error: 'معرف المستخدم غير موجود'
            };

        }

        const result = await apiRequest(
            `/api/site/${encodeURIComponent(siteId)}/publish`,
            {
                method: 'POST',

                body: JSON.stringify({
                    // Compatibility only.
                    // Backend must identify the owner from JWT.
                    userId
                })
            }
        );

        if (!result || !result.success) {
            return result;
        }

        const normalized = normalizeDeployResponse(result);

        return {
            ...normalized,

            liveUrl:
                normalized.liveUrl ||
                normalized.url ||
                normalized.deployUrl ||
                null,

            publishStatus:
                normalized.publishStatus ||
                normalized.status ||
                'processing'
        };

    }

};


// ==========================================
// 7. GLOBAL API ACCESS
// ==========================================

window.TemplateCraftAPI = TemplateCraftAPI;

window.TEMPLATECRAFT_API_BASE_URL =
    TEMPLATECRAFT_API_BASE_URL;