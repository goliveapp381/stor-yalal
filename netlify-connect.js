
/*
============================================
 TEMPLATECRAFT PRO
 NETLIFY CONNECTION PAGE
 OAuth Popup + Team Selection
============================================
*/

(() => {
    'use strict';

    const BACKEND_ORIGIN =
        'https://templatecraft-backend.onrender.com';

    const FRONTEND_ORIGIN =
        'https://goliveapp381.github.io';

    const API = window.TemplateCraftAPI;

    const elements = {
        statusBadge: document.getElementById('statusBadge'),
        statusDescription: document.getElementById('statusDescription'),
        connectSection: document.getElementById('connectSection'),
        connectButton: document.getElementById('connectButton'),
        teamSection: document.getElementById('teamSection'),
        teamSelect: document.getElementById('teamSelect'),
        saveTeamButton: document.getElementById('saveTeamButton'),
        disconnectSection: document.getElementById('disconnectSection'),
        disconnectButton: document.getElementById('disconnectButton'),
        messageBox: document.getElementById('messageBox')
    };

    let oauthPopup = null;
    let popupCheckInterval = null;

    // ----------------------------------------
    // CHECK AUTHENTICATION
    // ----------------------------------------

    function checkAuthentication() {
        const token = localStorage.getItem('token') ||
                      localStorage.getItem('authToken');

        const user = localStorage.getItem('user');

        if (!token || !user) {
            window.location.href = 'login.html';
            return false;
        }

        return true;
    }

    // ----------------------------------------
    // SHOW MESSAGE
    // ----------------------------------------

    function showMessage(message, type = 'info') {
        const box = elements.messageBox;

        box.textContent = message;
        box.classList.remove(
            'hidden',
            'bg-red-900/30',
            'bg-green-900/30',
            'bg-blue-900/30',
            'border',
            'border-red-500/40',
            'border-green-500/40',
            'border-blue-500/40'
        );

        const styles = {
            success: 'bg-green-900/30 border border-green-500/40 text-green-300',
            error: 'bg-red-900/30 border border-red-500/40 text-red-300',
            info: 'bg-blue-900/30 border border-blue-500/40 text-blue-300'
        };

        box.classList.add(...styles[type].split(' '));
    }

    function hideMessage() {
        elements.messageBox.classList.add('hidden');
    }

    // ----------------------------------------
    // SET CONNECTION STATUS
    // ----------------------------------------

    function setStatus(connected, teamSelected) {
        if (connected) {
            elements.statusBadge.textContent = 'متصل';
            elements.statusBadge.className =
                'text-sm font-bold text-green-400';

            elements.statusDescription.textContent =
                teamSelected
                    ? 'حساب Netlify مربوط وتم اختيار Team.'
                    : 'حساب Netlify مربوط. خاصك تختار Team.';

            elements.connectSection.classList.add('hidden');
            elements.disconnectSection.classList.remove('hidden');
            elements.teamSection.classList.remove('hidden');

        } else {
            elements.statusBadge.textContent = 'غير متصل';
            elements.statusBadge.className =
                'text-sm font-bold text-red-400';

            elements.statusDescription.textContent =
                'مازال ما ربطتيش حساب Netlify.';

            elements.connectSection.classList.remove('hidden');
            elements.disconnectSection.classList.add('hidden');
            elements.teamSection.classList.add('hidden');
        }
    }

    // ----------------------------------------
    // LOAD NETLIFY STATUS
    // ----------------------------------------

    async function loadStatus() {
        elements.statusBadge.textContent = 'جاري التحقق...';

        const response = await API.getNetlifyStatus();

        if (!response.success) {
            elements.statusBadge.textContent = 'تعذر التحقق';
            elements.statusDescription.textContent =
                response.error || 'تعذر الاتصال بالسيرفر.';

            showMessage(
                response.error || 'تعذر تحميل حالة الاتصال.',
                'error'
            );

            return;
        }

        const netlify = response.netlify || {};

        const connected = netlify.connected === true;
        const teamSelected = netlify.teamSelected === true;

        setStatus(connected, teamSelected);

        if (connected) {
            await loadTeams();
        }
    }

    // ----------------------------------------
    // LOAD NETLIFY TEAMS
    // ----------------------------------------

    async function loadTeams() {
        elements.teamSelect.innerHTML =
            '<option value="">جاري تحميل الحسابات...</option>';

        const response = await API.getNetlifyTeams();

        if (!response.success) {
            elements.teamSelect.innerHTML =
                '<option value="">تعذر تحميل الحسابات</option>';

            showMessage(
                response.error || 'تعذر جلب حسابات Netlify.',
                'error'
            );

            return;
        }

        const teams = Array.isArray(response.teams)
            ? response.teams
            : [];

        if (teams.length === 0) {
            elements.teamSelect.innerHTML =
                '<option value="">ما كاين حتى Team متاح</option>';

            showMessage(
                'حساب Netlify مربوط ولكن ما لقيناش حسابات متاحة.',
                'info'
            );

            return;
        }

        elements.teamSelect.innerHTML =
            '<option value="">اختار Team</option>';

        teams.forEach(team => {
            if (!team.slug) return;

            const option = document.createElement('option');

            option.value = team.slug;
            option.textContent =
                `${team.name || team.slug} (${team.typeName || team.type || 'Account'})`;

            elements.teamSelect.appendChild(option);
        });

        const selectedTeam = response.selectedTeam;

        if (selectedTeam && selectedTeam.slug) {
            elements.teamSelect.value = selectedTeam.slug;
        }
    }

    // ----------------------------------------
    // CONNECT NETLIFY
    // Open popup BEFORE awaiting API
    // ----------------------------------------

    async function connectNetlify() {
        hideMessage();

        oauthPopup = window.open(
            'about:blank',
            'templatecraft-netlify-oauth',
            'width=600,height=750,resizable=yes,scrollbars=yes'
        );

        if (!oauthPopup) {
            showMessage(
                'المتصفح منع النافذة المنبثقة. سمح بالنوافذ المنبثقة لهذا الموقع وحاول مرة أخرى.',
                'error'
            );

            return;
        }

        elements.connectButton.disabled = true;
        elements.connectButton.textContent = 'جاري التحضير...';

        try {
            const response = await API.connectNetlify();

            if (
                !response.success ||
                !response.authorizationUrl
            ) {
                oauthPopup.close();

                showMessage(
                    response.error ||
                    response.message ||
                    'تعذر إنشاء رابط ربط Netlify.',
                    'error'
                );

                return;
            }

            const authorizationUrl = new URL(
                response.authorizationUrl
            );

            // Only allow Netlify authorization URLs.
            if (
                authorizationUrl.protocol !== 'https:' ||
                !(
                    authorizationUrl.hostname === 'app.netlify.com' ||
                    authorizationUrl.hostname.endsWith('.netlify.com')
                )
            ) {
                oauthPopup.close();

                showMessage(
                    'رابط التفويض غير صالح.',
                    'error'
                );

                return;
            }

            oauthPopup.location.href = authorizationUrl.href;

            popupCheckInterval = setInterval(() => {
                if (oauthPopup && oauthPopup.closed) {
                    clearInterval(popupCheckInterval);
                    popupCheckInterval = null;
                    oauthPopup = null;
                }
            }, 1000);

        } catch (error) {
            if (oauthPopup && !oauthPopup.closed) {
                oauthPopup.close();
            }

            showMessage(
                error.message || 'وقع خطأ أثناء ربط Netlify.',
                'error'
            );

        } finally {
            elements.connectButton.disabled = false;
            elements.connectButton.textContent =
                'ربط حساب Netlify';
        }
    }

    // ----------------------------------------
    // RECEIVE OAUTH CALLBACK MESSAGE
    // ----------------------------------------

    window.addEventListener('message', async event => {

        if (event.origin !== BACKEND_ORIGIN) {
            return;
        }

        if (oauthPopup && event.source !== oauthPopup) {
            return;
        }

        if (
            !event.data ||
            event.data.type !== 'TEMPLATECRAFT_NETLIFY_OAUTH'
        ) {
            return;
        }

        if (popupCheckInterval) {
            clearInterval(popupCheckInterval);
            popupCheckInterval = null;
        }

        if (oauthPopup && !oauthPopup.closed) {
            oauthPopup.close();
        }

        oauthPopup = null;

        if (!event.data.success) {
            showMessage(
                event.data.error ||
                'لم تكتمل عملية ربط Netlify.',
                'error'
            );

            await loadStatus();
            return;
        }

        showMessage(
            'تم ربط حساب Netlify بنجاح. جاري تحميل Teams...',
            'success'
        );

        await loadStatus();

        if (!elements.teamSection.classList.contains('hidden')) {
            showMessage(
                'الحساب مربوط. اختار Team باش تكمل الإعداد.',
                'success'
            );
        }
    });

    // ----------------------------------------
    // SELECT NETLIFY TEAM
    // ----------------------------------------

    async function saveTeam() {
        hideMessage();

        const accountSlug = elements.teamSelect.value;

        if (!accountSlug) {
            showMessage(
                'اختار Team قبل الحفظ.',
                'error'
            );

            return;
        }

        elements.saveTeamButton.disabled = true;
        elements.saveTeamButton.textContent = 'جاري الحفظ...';

        try {
            const response =
                await API.selectNetlifyTeam(accountSlug);

            if (!response.success) {
                showMessage(
                    response.error ||
                    response.message ||
                    'تعذر حفظ اختيار Team.',
                    'error'
                );

                return;
            }

            showMessage(
                response.message || 'تم حفظ Team بنجاح.',
                'success'
            );

            await loadStatus();

        } catch (error) {
            showMessage(
                error.message || 'وقع خطأ أثناء حفظ Team.',
                'error'
            );

        } finally {
            elements.saveTeamButton.disabled = false;
            elements.saveTeamButton.textContent =
                'حفظ اختيار Team';
        }
    }

    // ----------------------------------------
    // DISCONNECT NETLIFY
    // ----------------------------------------

    async function disconnectNetlify() {
        const confirmed = window.confirm(
            'واش متأكد بغيتي تقطع الاتصال بحساب Netlify؟ المشاريع الموجودة ما غاديش تتمسح.'
        );

        if (!confirmed) return;

        elements.disconnectButton.disabled = true;
        elements.disconnectButton.textContent =
            'جاري قطع الاتصال...';

        try {
            const response = await API.disconnectNetlify();

            if (!response.success) {
                showMessage(
                    response.error ||
                    response.message ||
                    'تعذر قطع الاتصال.',
                    'error'
                );

                return;
            }

            showMessage(
                response.message || 'تم قطع الاتصال.',
                'success'
            );

            await loadStatus();

        } catch (error) {
            showMessage(
                error.message || 'وقع خطأ أثناء قطع الاتصال.',
                'error'
            );

        } finally {
            elements.disconnectButton.disabled = false;
            elements.disconnectButton.textContent =
                'قطع الاتصال بـ Netlify';
        }
    }

    // ----------------------------------------
    // EVENT LISTENERS
    // ----------------------------------------

    elements.connectButton.addEventListener(
        'click',
        connectNetlify
    );

    elements.saveTeamButton.addEventListener(
        'click',
        saveTeam
    );

    elements.disconnectButton.addEventListener(
        'click',
        disconnectNetlify
    );

    // ----------------------------------------
    // INITIALIZATION
    // ----------------------------------------

    if (
        FRONTEND_ORIGIN !== window.location.origin ||
        !API
    ) {
        console.error('Frontend origin or API configuration mismatch.');
    }

    if (checkAuthentication()) {
        loadStatus();
    }

})();

