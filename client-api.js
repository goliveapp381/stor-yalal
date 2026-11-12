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
// 3. URL HELPER
// ==========================================

function addUserId(endpoint, userId) {
    if (!userId) return endpoint;

    const separator = endpoint.includes('?') ? '&' : '?';

    return `${endpoint}${separator}userId=${encodeURIComponent(userId)}`;
}


// ==========================================
// 4. TEMPLATECRAFT API
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
        return apiRequest('/api/deploy', {
            method: 'POST',
            body: JSON.stringify(siteData)
        });
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

        return apiRequest(
            `/api/sites/${encodeURIComponent(userId)}`,
            {
                method: 'GET'
            }
        );
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

        return apiRequest(endpoint, {
            method: 'GET'
        });
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

        return apiRequest(
            `/api/site/${encodeURIComponent(siteId)}`,
            {
                method: 'PUT',
                body: JSON.stringify(projectData)
            }
        );
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


    // Backward Compatibility

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


    // Backward Compatibility

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

        // Normalize the publish response.
        if (result.success) {
            return {
                ...result,
                liveUrl:
                    result.liveUrl ||
                    result.url ||
                    result.deployUrl ||
                    null,
                publishStatus:
                    result.publishStatus ||
                    result.status ||
                    'processing'
            };
        }

        return result;
    }

};


// ==========================================
// 5. GLOBAL API ACCESS
// ==========================================

window.TemplateCraftAPI = TemplateCraftAPI;
window.TEMPLATECRAFT_API_BASE_URL = TEMPLATECRAFT_API_BASE_URL;