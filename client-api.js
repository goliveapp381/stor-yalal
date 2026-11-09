// ==========================================
// TemplateCraft Pro - API Client Manager (Index)
// ==========================================
const API_BASE_URL = 'http://localhost:3000';

const TemplateCraftAPI = {
    
    // [1] رمز فحص حالة السيرفر والقاعدة: 'status'
    async status() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/status`);
            return await res.json();
        } catch (err) {
            console.error('❌ خطأ في الاتصال:', err);
            return { success: false, error: err.message };
        }
    },

    // [2] رمز تسجيل حساب جديد: 'signup'
    async signup(userData) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            return await res.json();
        } catch (err) {
            console.error('❌ خطأ في التسجيل:', err);
            return { success: false, error: err.message };
        }
    },

    // [3] رمز تسجيل الدخول: 'login'
    async login(credentials) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            return await res.json();
        } catch (err) {
            console.error('❌ خطأ في تسجيل الدخول:', err);
            return { success: false, error: err.message };
        }
    },

    // [4] رمز نشر أو حفظ الموقع: 'deploy'
    async deploy(siteData) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(siteData)
            });
            return await res.json();
        } catch (err) {
            console.error('❌ خطأ في النشر:', err);
            return { success: false, error: err.message };
        }
    },

    // [5] رمز جلب مواقع المستخدم: 'getSites'
    async getSites(userId) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/sites/${userId}`);
            return await res.json();
        } catch (err) {
            console.error('❌ خطأ في الجلب:', err);
            return { success: false, error: err.message };
        }
    }
};