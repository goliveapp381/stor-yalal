/*
============================================
 TEMPLATECRAFT PRO - CLIENT API
 Frontend API Connector
 Express + MongoDB Atlas + Netlify OAuth
 Authentication + Projects + Templates
 Publishing + Custom Domains + Cloudflare
============================================
*/

// ============================================
// 1. API CONFIGURATION
// ============================================

const TEMPLATECRAFT_API_BASE_URL =
    window.TEMPLATECRAFT_API_BASE_URL ||
    'https://templatecraft-backend.onrender.com';


// ============================================
// 2. AUTHENTICATION HELPERS
// ============================================

function getAuthToken() {
    return (
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        ''
    );
}

function getStoredUser() {
    try {
        return JSON.parse(
            localStorage.getItem('user') || 'null'
        );
    } catch (error) {
        console.error('User data error:', error);
        return null;
    }
}

function getAuthHeaders() {
    const token = getAuthToken();

    const headers = {
        Accept: 'application/json'
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}


// ============================================
// 3. GENERAL API REQUEST
// ============================================

async function apiRequest(endpoint, options = {}) {
    const url = `${TEMPLATECRAFT_API_BASE_URL}${endpoint}`;

    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    const requestOptions = {
        ...options,
        headers
    };

    if (
        requestOptions.body &&
        typeof requestOptions.body === 'object' &&
        !(requestOptions.body instanceof FormData)
    ) {
        headers['Content-Type'] = 'application/json';

        requestOptions.body = JSON.stringify(
            requestOptions.body
        );
    }

    try {
        const response = await fetch(url, requestOptions);

        const contentType =
            response.headers.get('content-type') || '';

        let data;

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const responseText = await response.text();

            data = {
                success: response.ok,
                message: responseText
            };
        }

        if (!response.ok) {
            const error = new Error(
                data.message ||
                data.error ||
                `HTTP Error ${response.status}`
            );

            error.status = response.status;
            error.data = data;

            throw error;
        }

        return data;

    } catch (error) {
        console.error(
            `API Error [${endpoint}]:`,
            error
        );

        return {
            success: false,
            error: error.message ||
                'وقع خطأ في الاتصال بالسيرفر.',
            message: error.message ||
                'وقع خطأ في الاتصال بالسيرفر.',
            status: error.status || 0
        };
    }
}


// ============================================
// 4. USER DATA HELPERS
// ============================================

function addUserId(data = {}) {
    const user = getStoredUser();

    if (
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data)
    ) {
        data = {};
    }

    return {
        ...data,
        ...(user && (user._id || user.id)
            ? { userId: user._id || user.id }
            : {})
    };
}


// ============================================
// 5. SITE NORMALIZATION
// ============================================

function normalizeSite(site = {}) {
    if (!site || typeof site !== 'object') {
        return {};
    }

    return {
        ...site,

        id: site._id || site.id || site.siteId || null,

        siteName:
            site.siteName ||
            site.name ||
            '',

        templateId: site.templateId || '',

        status: site.status || 'unknown',

        url:
            site.url ||
            site.siteUrl ||
            site.deployUrl ||
            '',

        customDomain: site.customDomain || '',

        createdAt: site.createdAt || null,

        updatedAt: site.updatedAt || null
    };
}


function normalizeSiteResponse(response = {}) {
    const sites =
        response.sites ||
        response.projects ||
        response.data ||
        [];

    return {
        ...response,

        sites: Array.isArray(sites)
            ? sites.map(normalizeSite)
            : []
    };
}


function normalizeDeployResponse(response = {}) {
    const site =
        response.site ||
        response.project ||
        response.data ||
        {};

    return {
        ...response,
        site: normalizeSite(site)
    };
}


// ============================================
// 6. QUERY STRING HELPER
// ============================================

function buildQuery(params = {}) {
    if (
        !params ||
        typeof params !== 'object' ||
        Array.isArray(params)
    ) {
        return '';
    }

    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (
            value !== undefined &&
            value !== null &&
            value !== ''
        ) {
            if (
                typeof value === 'object'
            ) {
                query.append(key, JSON.stringify(value));
            } else {
                query.append(key, String(value));
            }
        }
    });

    const result = query.toString();

    return result ? `?${result}` : '';
}


// ============================================
// 7. TEMPLATECRAFT API
// ============================================

const TemplateCraftAPI = {

    // ========================================
    // SERVER STATUS
    // ========================================

    async status() {
        return apiRequest('/api/status', {
            method: 'GET'
        });
    },


    // ========================================
    // AUTHENTICATION
    // ========================================

    async signup(userData = {}) {
        return apiRequest('/api/auth/signup', {
            method: 'POST',
            body: userData
        });
    },


    async login(credentials = {}) {
        return apiRequest('/api/auth/login', {
            method: 'POST',
            body: credentials
        });
    },


    // ========================================
    // CREATE / DEPLOY PROJECT
    // ========================================

    async deploy(projectData = {}) {
        const response = await apiRequest('/api/deploy', {
            method: 'POST',
            body: addUserId(projectData)
        });

        if (response.success) {
            return normalizeDeployResponse(response);
        }

        return response;
    },


    // ========================================
    // GET ALL USER PROJECTS
    // ========================================

    async getSites(options = {}) {
        // إصلاح مشكل تمرير token كنص
        if (
            !options ||
            typeof options !== 'object' ||
            Array.isArray(options)
        ) {
            options = {};
        }

        const query = buildQuery(options);

        const response = await apiRequest(
            `/api/sites${query}`,
            { method: 'GET' }
        );

        if (!response.success) {
            return response;
        }

        return normalizeSiteResponse(response);
    },


    // ========================================
    // GET ONE PROJECT
    // ========================================

    async getSite(siteId) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود.'
            };
        }

        const response = await apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}`,
            { method: 'GET' }
        );

        if (response.success && response.site) {
            response.site = normalizeSite(response.site);
        }

        return response;
    },


    // ========================================
    // UPDATE PROJECT
    // ========================================

    async updateSite(siteId, updates = {}) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود.'
            };
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

    async getSiteFiles(siteId) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود.'
            };
        }

        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}/files`,
            { method: 'GET' }
        );
    },


    async getProjectFiles(siteId) {
        return this.getSiteFiles(siteId);
    },


    // ========================================
    // SAVE PROJECT FILE
    // ========================================

    async saveSiteFile(siteId, fileData = {}) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود.'
            };
        }

        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}/files`,
            {
                method: 'PUT',
                body: fileData
            }
        );
    },


    async saveProjectFile(siteId, fileData = {}) {
        return this.saveSiteFile(siteId, fileData);
    },


    // ========================================
    // DELETE PROJECT
    // ========================================

    async deleteSite(siteId) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود.'
            };
        }

        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}`,
            { method: 'DELETE' }
        );
    },


    // ========================================
    // TEMPLATES
    // ========================================

    async getTemplates() {
        return apiRequest('/api/templates', {
            method: 'GET'
        });
    },


    // ========================================
    // TEMPLATE PREVIEW
    // ========================================

    getTemplatePreviewUrl(templateId) {
        if (!templateId) {
            return '';
        }

        return (
            `${TEMPLATECRAFT_API_BASE_URL}/api/templates/` +
            `${encodeURIComponent(templateId)}/preview`
        );
    },


    // ========================================
    // PROJECT PREVIEW
    // ========================================

    getProjectPreviewUrl(siteId) {
        if (!siteId) {
            return '';
        }

        return (
            `${TEMPLATECRAFT_API_BASE_URL}/api/sites/` +
            `${encodeURIComponent(siteId)}/preview`
        );
    },


    // ========================================
    // CUSTOM DOMAIN STATUS
    // ========================================

    async getDomainStatus(siteId) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود.'
            };
        }

        return apiRequest(
            `/api/sites/${encodeURIComponent(siteId)}/domain/status`,
            { method: 'GET' }
        );
    },


    // ========================================
    // PUBLISH PROJECT
    // ========================================

    async publish(siteId, publishData = {}) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود.'
            };
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
        return apiRequest('/api/netlify/connect', {
            method: 'POST'
        });
    },


    // ========================================
    // NETLIFY CONNECTION STATUS
    // ========================================

    async getNetlifyStatus() {
        return apiRequest('/api/netlify/status', {
            method: 'GET'
        });
    },


    // ========================================
    // GET AVAILABLE NETLIFY TEAMS
    // ========================================

    async getNetlifyTeams() {
        return apiRequest('/api/netlify/teams', {
            method: 'GET'
        });
    },


    // ========================================
    // SELECT NETLIFY TEAM
    // Backend expects accountSlug
    // ========================================

    async selectNetlifyTeam(accountSlug) {
        if (
            !accountSlug ||
            typeof accountSlug !== 'string' ||
            !accountSlug.trim()
        ) {
            return {
                success: false,
                error: 'خاصك تختار Team صالح.'
            };
        }

        return apiRequest('/api/netlify/team', {
            method: 'POST',
            body: {
                accountSlug: accountSlug.trim()
            }
        });
    },


    // ========================================
    // DISCONNECT NETLIFY ACCOUNT
    // Does NOT delete existing projects
    // ========================================

    async disconnectNetlify() {
        return apiRequest('/api/netlify/disconnect', {
            method: 'POST'
        });
    }

};


// ============================================
// 8. GLOBAL EXPORTS
// ============================================

window.TemplateCraftAPI = TemplateCraftAPI;

window.TEMPLATECRAFT_API_BASE_URL =
    TEMPLATECRAFT_API_BASE_URL;


// ============================================
// 9. OPTIONAL DEBUG INFORMATION
// ============================================

console.log('TemplateCraft API initialized');
console.log('Backend:', TEMPLATECRAFT_API_BASE_URL);
