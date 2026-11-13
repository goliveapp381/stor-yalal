// ==========================================
// TEMPLATECRAFT PRO - API CLIENT
// JWT AUTHENTICATION ENABLED
// AUTO CUSTOM DOMAIN STATUS REFRESH
// SAFE PROJECT DELETION
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

        headers.Authorization =
            `Bearer ${token}`;

    }


    return headers;

}


// ==========================================
// 3. COMMON REQUEST HELPER
// ==========================================

async function apiRequest(
    endpoint,
    options = {}
) {

    try {

        const isFormData =
            typeof FormData !== 'undefined' &&
            options.body instanceof FormData;


        const headers = {

            ...(isFormData
                ? {}
                : {
                    'Content-Type':
                        'application/json'
                }),

            ...getAuthHeaders(),

            ...(options.headers || {})

        };


        const response =
            await fetch(
                `${TEMPLATECRAFT_API_BASE_URL}${endpoint}`,
                {
                    ...options,
                    headers
                }
            );


        const responseText =
            await response.text();


        let data;


        try {

            data = responseText
                ? JSON.parse(responseText)
                : {};

        } catch (_) {

            data = {
                success: false,
                error:
                    'استجابة غير صالحة من السيرفر'
            };

        }


        if (!response.ok) {

            return {
                ...data,

                success: false,

                status:
                    response.status,

                error:
                    data.error ||
                    data.message ||
                    `خطأ من السيرفر: ${response.status}`
            };

        }


        return {
            ...data,
            status:
                response.status
        };


    } catch (error) {

        console.error(
            'TemplateCraft API Error:',
            error
        );


        return {
            success: false,
            status: 0,
            error:
                'تعذر الاتصال بالسيرفر. تحقق من الإنترنت وحالة Backend.'
        };

    }

}


// ==========================================
// 4. URL HELPERS
// ==========================================

function addUserId(
    endpoint,
    userId
) {

    if (!userId) {
        return endpoint;
    }


    const separator =
        endpoint.includes('?')
            ? '&'
            : '?';


    return (
        `${endpoint}${separator}` +
        `userId=${encodeURIComponent(userId)}`
    );

}


// ==========================================
// 5. RESPONSE NORMALIZATION
// ==========================================

function normalizeSite(site) {

    if (
        !site ||
        typeof site !== 'object'
    ) {
        return site;
    }


    const customUrl =
        site.customUrl || null;


    const domainStatus =
        site.domainStatus || 'pending';


    const customDomainActive =
        domainStatus === 'active' &&
        typeof customUrl === 'string' &&
        customUrl.startsWith('https://');


    return {

        ...site,

        liveUrl:
            site.liveUrl || null,

        customUrl,

        customDomain:
            site.customDomain || null,

        domainStatus,

        domainError:
            site.domainError || null,

        publicUrl:
            customDomainActive
                ? customUrl
                : null,

        domainPending:
            !customDomainActive

    };

}


function normalizeSiteResponse(result) {

    if (
        !result ||
        typeof result !== 'object'
    ) {
        return result;
    }


    const normalized =
        { ...result };


    if (normalized.site) {

        normalized.site =
            normalizeSite(
                normalized.site
            );

    }


    if (
        Array.isArray(
            normalized.sites
        )
    ) {

        normalized.sites =
            normalized.sites.map(
                normalizeSite
            );

    }


    return normalized;

}


function normalizeDeployResponse(result) {

    if (
        !result ||
        typeof result !== 'object'
    ) {
        return result;
    }


    const normalized =
        normalizeSiteResponse(
            result
        );


    const site =
        normalized.site || {};


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

        publicUrl:
            customDomainActive
                ? customUrl
                : null,

        domainPending:
            !customDomainActive

    };

}


// ==========================================
// 6. TEMPLATECRAFT API
// ==========================================

const TemplateCraftAPI = {


    // --------------------------------------
    // Server Status
    // --------------------------------------

    async status() {

        return apiRequest(
            '/api/status',
            {
                method: 'GET'
            }
        );

    },


    // --------------------------------------
    // Signup
    // --------------------------------------

    async signup(userData) {

        return apiRequest(
            '/api/signup',
            {
                method: 'POST',
                body:
                    JSON.stringify(userData)
            }
        );

    },


    // --------------------------------------
    // Login
    // --------------------------------------

    async login(credentials) {

        return apiRequest(
            '/api/login',
            {
                method: 'POST',
                body:
                    JSON.stringify(credentials)
            }
        );

    },


    // --------------------------------------
    // Deploy New Project
    // --------------------------------------

    async deploy(siteData) {

        const result =
            await apiRequest(
                '/api/deploy',
                {
                    method: 'POST',
                    body:
                        JSON.stringify(siteData)
                }
            );


        return normalizeDeployResponse(
            result
        );

    },


    // --------------------------------------
    // Get User Projects
    // Auto refresh pending domains
    // --------------------------------------

    async getSites(userId) {

        if (!userId) {

            return {
                success: false,
                error:
                    'معرف المستخدم غير موجود'
            };

        }


        const result =
            await apiRequest(
                `/api/sites/${encodeURIComponent(userId)}`,
                {
                    method: 'GET'
                }
            );


        if (
            !result ||
            !result.success ||
            !Array.isArray(result.sites)
        ) {

            return normalizeSiteResponse(
                result
            );

        }


        // --------------------------------------
        // Find pending domain projects.
        //
        // Do NOT refresh projects that are:
        // publishing
        // deleting
        // --------------------------------------

        const pendingSites =
            result.sites.filter(site => {

                if (
                    !site ||
                    !site._id
                ) {
                    return false;
                }


                const publishStatus =
                    String(
                        site.publishStatus || ''
                    ).toLowerCase();


                if (
                    publishStatus === 'publishing' ||
                    publishStatus === 'deleting'
                ) {
                    return false;
                }


                return Boolean(
                    site.customDomain &&
                    site.netlifySiteId &&
                    site.domainStatus !== 'active'
                );

            });


        // --------------------------------------
        // Refresh pending domains
        // --------------------------------------

        const refreshedResults =
            await Promise.allSettled(

                pendingSites.map(
                    async site => {

                        const domainResult =
                            await this.getDomainStatus(
                                site._id,
                                userId
                            );


                        if (
                            !domainResult ||
                            !domainResult.customDomain
                        ) {
                            return null;
                        }


                        return {

                            id:
                                String(
                                    site._id
                                ),

                            customDomain:
                                domainResult.customDomain,

                            customUrl:
                                domainResult.customUrl ||
                                null,

                            domainStatus:
                                domainResult.domainStatus ||
                                'pending',

                            domainError:
                                domainResult.error ||
                                null

                        };

                    }
                )

            );


        // --------------------------------------
        // Store successful refresh results
        // --------------------------------------

        const refreshedMap =
            new Map();


        for (
            const item
            of refreshedResults
        ) {

            if (
                item.status === 'fulfilled' &&
                item.value
            ) {

                refreshedMap.set(
                    item.value.id,
                    item.value
                );

            }

        }


        // --------------------------------------
        // Merge refreshed domain information
        // --------------------------------------

        const updatedSites =
            result.sites.map(
                site => {

                    const refreshed =
                        refreshedMap.get(
                            String(
                                site._id
                            )
                        );


                    if (!refreshed) {
                        return site;
                    }


                    return {

                        ...site,

                        customDomain:
                            refreshed.customDomain,

                        customUrl:
                            refreshed.customUrl,

                        domainStatus:
                            refreshed.domainStatus,

                        domainError:
                            refreshed.domainError

                    };

                }
            );


        return normalizeSiteResponse({

            ...result,

            sites:
                updatedSites

        });

    },


    // --------------------------------------
    // Get Single Project
    // --------------------------------------

    async getSite(
        siteId,
        userId
    ) {

        if (!siteId) {

            return {
                success: false,
                error:
                    'معرف المشروع غير موجود'
            };

        }


        const endpoint =
            addUserId(
                `/api/site/${encodeURIComponent(siteId)}`,
                userId
            );


        const result =
            await apiRequest(
                endpoint,
                {
                    method: 'GET'
                }
            );


        return normalizeSiteResponse(
            result
        );

    },


    // --------------------------------------
    // Update Project
    // --------------------------------------

    async updateSite(
        siteId,
        projectData = {}
    ) {

        if (!siteId) {

            return {
                success: false,
                error:
                    'معرف المشروع غير موجود'
            };

        }


        const result =
            await apiRequest(
                `/api/site/${encodeURIComponent(siteId)}`,
                {
                    method: 'PUT',
                    body:
                        JSON.stringify(
                            projectData
                        )
                }
            );


        return normalizeSiteResponse(
            result
        );

    },


    // --------------------------------------
    // Get Project Files
    // --------------------------------------

    async getSiteFiles(
        siteId,
        userId
    ) {

        if (!siteId) {

            return {
                success: false,
                error:
                    'معرف المشروع غير موجود'
            };

        }


        const endpoint =
            addUserId(
                `/api/site/${encodeURIComponent(siteId)}/files`,
                userId
            );


        return apiRequest(
            endpoint,
            {
                method: 'GET'
            }
        );

    },


    // --------------------------------------
    // Backward Compatibility
    // --------------------------------------

    async getProjectFiles(
        siteId,
        userId
    ) {

        return this.getSiteFiles(
            siteId,
            userId
        );

    },


    // --------------------------------------
    // Save Edited Project File
    // --------------------------------------

    async saveSiteFile(
        siteId,
        fileData = {}
    ) {

        if (
            !siteId ||
            !fileData.filePath
        ) {

            return {
                success: false,
                error:
                    'معلومات الملف ناقصة'
            };

        }


        return apiRequest(
            `/api/site/${encodeURIComponent(siteId)}/file`,
            {
                method: 'PUT',

                body:
                    JSON.stringify({

                        // Compatibility only.
                        // Backend must use JWT identity.

                        userId:
                            fileData.userId,

                        filePath:
                            fileData.filePath,

                        content:
                            fileData.content

                    })
            }
        );

    },


    // --------------------------------------
    // Backward Compatibility
    // --------------------------------------

    async saveProjectFile(
        siteId,
        filePath,
        content,
        userId
    ) {

        return this.saveSiteFile(
            siteId,
            {
                userId,
                filePath,
                content
            }
        );

    },


    // --------------------------------------
    // Delete Project
    // JWT required
    //
    // Backend performs:
    // 1. Netlify deletion
    // 2. Cloudflare owned records deletion
    // 3. Local project deletion
    // 4. MongoDB deletion last
    // --------------------------------------

    async deleteSite(
        siteId,
        userId
    ) {

        if (!siteId) {

            return {
                success: false,
                error:
                    'معرف المشروع غير موجود'
            };

        }


        const endpoint =
            addUserId(
                `/api/site/${encodeURIComponent(siteId)}`,
                userId
            );


        const result =
            await apiRequest(
                endpoint,
                {
                    method: 'DELETE'
                }
            );


        return normalizeSiteResponse(
            result
        );

    },


    // --------------------------------------
    // Get Available Templates
    // --------------------------------------

    async getTemplates(
        projectType
    ) {

        if (!projectType) {

            return {
                success: false,
                error:
                    'نوع القالب غير محدد'
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

    getTemplatePreviewUrl(
        projectType,
        templateId
    ) {

        if (
            !projectType ||
            !templateId
        ) {
            return null;
        }


        return (
            `${TEMPLATECRAFT_API_BASE_URL}` +
            `/api/template-preview/` +
            `${encodeURIComponent(projectType)}/` +
            `${encodeURIComponent(templateId)}`
        );

    },


    // --------------------------------------
    // Get Project Preview URL
    // --------------------------------------

    getProjectPreviewUrl(
        siteName
    ) {

        if (!siteName) {
            return null;
        }


        return (
            `${TEMPLATECRAFT_API_BASE_URL}` +
            `/sites/` +
            `${encodeURIComponent(siteName)}` +
            `/index.html`
        );

    },


    // --------------------------------------
    // Get Project Domain Status
    // --------------------------------------

    async getDomainStatus(
        siteId,
        userId
    ) {

        if (!siteId) {

            return {
                success: false,
                error:
                    'معرف المشروع غير موجود'
            };

        }


        const endpoint =
            addUserId(
                `/api/site/${encodeURIComponent(siteId)}/domain-status`,
                userId
            );


        const result =
            await apiRequest(
                endpoint,
                {
                    method: 'GET'
                }
            );


        return normalizeSiteResponse(
            result
        );

    },


    // --------------------------------------
    // Publish Project to Netlify
    // --------------------------------------

    async publish(
        siteId,
        userId
    ) {

        if (!siteId) {

            return {
                success: false,
                error:
                    'معرف المشروع غير موجود'
            };

        }


        if (!userId) {

            return {
                success: false,
                error:
                    'معرف المستخدم غير موجود'
            };

        }


        const result =
            await apiRequest(
                `/api/site/${encodeURIComponent(siteId)}/publish`,
                {
                    method: 'POST',

                    body:
                        JSON.stringify({

                            // Compatibility only.
                            // Backend must identify owner from JWT.

                            userId

                        })

                }
            );


        if (
            !result ||
            !result.success
        ) {

            return result;

        }


        const normalized =
            normalizeDeployResponse(
                result
            );


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

window.TemplateCraftAPI =
    TemplateCraftAPI;


window.TEMPLATECRAFT_API_BASE_URL =
    TEMPLATECRAFT_API_BASE_URL;