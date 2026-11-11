// ==========================================
// TemplateCraft Pro - API Client
// ==========================================

// ⚠️ مؤقتاً للتجربة المحلية من نفس PC
// من بعد ملي ننشرو Backend غادي نبدلوه إلى رابط HTTPS ديال السيرفر.
const API_BASE_URL = 'http://localhost:3000';

const TemplateCraftAPI = {

    // =========================
    // Server Status
    // =========================
    async status() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/status`);

            const data = await response.json();

            return data;

        } catch (error) {

            console.error('❌ Server status error:', error);

            return {
                success: false,
                error: 'تعذر الاتصال بالسيرفر'
            };
        }
    },


    // =========================
    // Signup
    // =========================
    async signup(userData) {
        try {

            const response = await fetch(`${API_BASE_URL}/api/signup`, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(userData)
            });

            const data = await response.json();

            return data;

        } catch (error) {

            console.error('❌ Signup connection error:', error);

            return {
                success: false,
                error: 'تعذر الاتصال بالسيرفر. تأكد أن Backend شغال.'
            };
        }
    },


    // =========================
    // Login
    // =========================
    async login(credentials) {
        try {

            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            return data;

        } catch (error) {

            console.error('❌ Login connection error:', error);

            return {
                success: false,
                error: 'تعذر الاتصال بالسيرفر. تأكد من رابط Backend.'
            };
        }
    },


    // =========================
    // Deploy
    // =========================
    async deploy(siteData) {
        try {

            const response = await fetch(`${API_BASE_URL}/api/deploy`, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(siteData)
            });

            const data = await response.json();

            return data;

        } catch (error) {

            console.error('❌ Deploy connection error:', error);

            return {
                success: false,
                error: 'تعذر الاتصال بالسيرفر.'
            };
        }
    },


    // =========================
    // Get User Sites
    // =========================
    async getSites(userId) {
        try {

            const response = await fetch(
                `${API_BASE_URL}/api/sites/${encodeURIComponent(userId)}`
            );

            const data = await response.json();

            return data;

        } catch (error) {

            console.error('❌ Get sites error:', error);

            return {
                success: false,
                error: 'تعذر جلب المواقع من السيرفر.'
            };
        }
    }
};