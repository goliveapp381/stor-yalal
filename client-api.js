// ==========================================
// TEMPLATECRAFT PRO - API CLIENT
// ==========================================

// ==========================================
// 1. SERVER CONFIGURATION
// ==========================================

// محلياً:
const API_BASE_URL = (
    window.TEMPLATECRAFT_API_URL ||
    'http://localhost:3000'
).replace(/\/+$/, '');


// ==========================================
// 2. COMMON REQUEST HELPER
// ==========================================

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            }
        );

        const data = await response.json().catch(() => ({
            success: false,
            error: 'استجابة غير صالحة من السيرفر'
        }));

        if (!response.ok && data.success === undefined) {
            data.success = false;
        }

        return data;

    } catch (error) {
        console.error('❌ API Request Error:', error);

        return {
            success: false,
            error: 'تعذر الاتصال بالسيرفر. تأكد أن Backend شغال.'
        };
    }
}


// ==========================================
// 3. TEMPLATECRAFT API
// ==========================================

const TemplateCraftAPI = {

    // --------------------------------------
    // Server Status
    // --------------------------------------

    async status() {
        return await apiRequest('/api/status', {
            method: 'GET'
        });
    },


    // --------------------------------------
    // Signup
    // --------------------------------------

    async signup(userData) {
        return await apiRequest('/api/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },


    // --------------------------------------
    // Login
    // --------------------------------------

    async login(credentials) {
        return await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },


    // --------------------------------------
    // Deploy New Project
    // --------------------------------------

    async deploy(siteData) {
        return await apiRequest('/api/deploy', {
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

        return await apiRequest(
            `/api/sites/${encodeURIComponent(userId)}`,
            {
                method: 'GET'
            }
        );
    },


    // --------------------------------------
    // Get Single Project
    // --------------------------------------

    async getSite(siteId) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود'
            };
        }

        return await apiRequest(
            `/api/site/${encodeURIComponent(siteId)}`,
            {
                method: 'GET'
            }
        );
    },


    // --------------------------------------
    // Update Project
    // --------------------------------------

    async updateSite(siteId, projectData) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود'
            };
        }

        return await apiRequest(
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

    async getProjectFiles(siteId) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود'
            };
        }

        return await apiRequest(
            `/api/site/${encodeURIComponent(siteId)}/files`,
            {
                method: 'GET'
            }
        );
    },


    // --------------------------------------
    // Save Edited File
    // --------------------------------------

    async saveProjectFile(siteId, filePath, content) {
        if (!siteId || !filePath) {
            return {
                success: false,
                error: 'معلومات الملف ناقصة'
            };
        }

        return await apiRequest(
            `/api/site/${encodeURIComponent(siteId)}/file`,
            {
                method: 'PUT',
                body: JSON.stringify({
                    filePath,
                    content
                })
            }
        );
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

        return await apiRequest(
            `/api/templates/${encodeURIComponent(projectType)}`,
            {
                method: 'GET'
            }
        );
    },


    // --------------------------------------
    // Get Template Preview
    // --------------------------------------

    getTemplatePreviewUrl(projectType, templateId) {
        if (!projectType || !templateId) {
            return null;
        }

        return (
            `${API_BASE_URL}/api/template-preview/` +
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
            `${API_BASE_URL}/sites/` +
            `${encodeURIComponent(siteName)}/index.html`
        );
    },


    // --------------------------------------
    // Publish Project
    // --------------------------------------

    async publish(siteId) {
        if (!siteId) {
            return {
                success: false,
                error: 'معرف المشروع غير موجود'
            };
        }

        return await apiRequest(
            `/api/site/${encodeURIComponent(siteId)}/publish`,
            {
                method: 'POST'
            }
        );
    }

};


// ==========================================
// 4. GLOBAL API ACCESS
// ==========================================

window.TemplateCraftAPI = TemplateCraftAPI;