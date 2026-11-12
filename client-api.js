// ==========================================
// TEMPLATECRAFT PRO - API CLIENT
// ==========================================

// ==========================================
// 1. SERVER CONFIGURATION
// ==========================================

const TEMPLATECRAFT_API_BASE_URL = (
    window.TEMPLATECRAFT_API_URL ||
    'https://templatecraft-backend.onrender.com'
).replace(/\/+$/, '');


// ==========================================
// 2. COMMON REQUEST HELPER
// ==========================================

async function apiRequest(endpoint, options = {}) {
    try {
        const headers = {
            ...(options.body instanceof FormData
                ? {}
                : { 'Content-Type': 'application/json' }),
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
            data = responseText ? JSON.parse(responseText) : {};
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
                error:
                    data.error ||
                    data.message ||
                    `خطأ من السيرفر: ${response.status}`
            };
        }

        return data;

    } catch (error) {
        console.error('TemplateCraft API Error:', error);

        return {
            success: false,
            error: 'تعذر الاتصال بالسيرفر. تحقق من الإنترنت وحالة Backend.'
        };
    }
}


// ==========================================
// 3. URL HELPERS
// ==========================================

function addUserId(endpoint, userId) {
    if (!userId) return endpoint;

    const separator = endpoint.includes('?') ? '&' : '?';

    return `${endpoint}${separator}userId=${encodeURIComponent(userId)}`;
}


// ==========================================
// 4. RESPONSE NORMALIZATION
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

        // Keep the original Netlify URL for internal compatibility.
        liveUrl: site.liveUrl || null,

        // Custom domain information.
        customUrl,
        customDomain: site.customDomain || null,
        domainStatus,
        domainError: site.domainError || null,

        // Public URL must only be the verified custom domain.
        publicUrl: customDomainActive
            ? customUrl
            : null,

        // Useful for frontend status display.
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

        // Netlify URL remains available for internal operations.
        liveUrl,

        // Custom domain details.
        customUrl,
        customDomain:
            normalized.customDomain ||
            site.customDomain ||
            null,

        domainStatus,

        // Only expose the custom domain after SSL is confirmed.
        publicUrl: customDomainActive
            ? customUrl
            : null,

        domainPending: !customDomainActive
    };
}


// ==========================================
// 5. TEMPLATECRAFT API
// ==========================================

const TemplateCraftAPI = {

    // --------------------------------------
    // Server Status
    // --------------------------------------

    async status() {
        return apiRequest('/api/status', {
            method: 'GET'
        });
    },


    // --------------------------------------
    // Signup
    // --------------------------------------

    async signup(userData) {
        return apiRequest('/api/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },


    // --------------------------------------
    // Login
    // --------------------------------------

    async login(credentials) {
        return apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },


    // --------------------------------------
    // Deploy New Project
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
// 6. GLOBAL API ACCESS
// ==========================================

window.TemplateCraftAPI = TemplateCraftAPI;
window.TEMPLATECRAFT_API_BASE_URL = TEMPLATECRAFT_API_BASE_URL;