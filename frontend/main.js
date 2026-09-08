
const API_BASE_URL = window.location.port === '5500' ? 'http://localhost:3000' : window.location.origin;
document.addEventListener('DOMContentLoaded', () => {
    // =========================================
    // 1. 即時系統時鐘 (SOC Dashboard 風格)
    // =========================================
    const clockElement = document.getElementById('systemClock');
    function updateClock() {
        if (!clockElement) return; 
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        clockElement.textContent = `SYS_TIME: ${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    }
    if (clockElement) {
        setInterval(updateClock, 1000);
        updateClock();
    }
    // =========================================
    // 2. 終端機打字機特效
    // =========================================
    const headerElement = document.getElementById('typingHeader');
    const textElement = document.getElementById('typingText');
    if (headerElement && textElement) {
        const headerText = "歡迎登入 ISO愛搜查 系統 _";
        const bodyText = "系統初始化完成。請從左側導覽列選擇您的任務：您可以啟動全新的 VR 沉浸式訓練，或是檢視您近期的學習筆記與防禦成果分析。";
        let headerIndex = 0; let bodyIndex = 0;
        const cursorHTML = '<span class="cursor"></span>';

        function typeHeader() {
            if (headerIndex < headerText.length) {
                headerElement.innerHTML = headerText.substring(0, headerIndex + 1) + cursorHTML;
                headerIndex++;
                setTimeout(typeHeader, 80);
            } else {
                headerElement.innerHTML = headerText;
                setTimeout(typeBody, 300);
            }
        }

        function typeBody() {
            if (bodyIndex < bodyText.length) {
                textElement.innerHTML = bodyText.substring(0, bodyIndex + 1) + cursorHTML;
                bodyIndex++;
                setTimeout(typeBody, 40);
            }
        }
        setTimeout(typeHeader, 500);
    }
    // =========================================
    // 3. 側邊選單與主頁面平滑切換邏輯
    // =========================================
    const menuItems = document.querySelectorAll('.menu-item');
    const breadcrumbTitle = document.querySelector('.breadcrumb h2');

    
    const notesSection = document.getElementById('notesSection');
    const manualSection = document.getElementById('manualSection');
    const analysisSection = document.getElementById('analysisSection'); 
    const quizSection = document.getElementById('quizSection'); 
    const mistakesSection = document.getElementById('mistakesSection'); 
    const vrSection = document.getElementById('vrSection');
    
    menuItems.forEach(item => {
        item.addEventListener('click', async function(e) {
            if(this.getAttribute('href') === '#') {
                e.preventDefault(); 
                
                const targetMenuId = this.getAttribute('data-i18n');
                if (window.isQuizActive && targetMenuId !== 'nav-quiz' && typeof currentQuestionIndex !== 'undefined' && currentQuestionIndex < currentRoundQuestions.length) {
                    const confirmLeave = await Swal.fire({
                        title: '確定要離開測驗嗎？',
                        text: '您目前正在進行測驗，跳出頁面將會遺失目前的測驗進度，下次進入需重新答題！',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: '確定離開',
                        cancelButtonText: '繼續測驗',
                        confirmButtonColor: '#ff4757',
                        background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', 
                        color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff',
                        customClass: { cancelButton: 'cyber-cancel-btn' }
                    });
                    if (!confirmLeave.isConfirmed) {
                        return; // 終止切換，留在測驗
                    }
                    window.isQuizActive = false;
                }

                menuItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                const menuText = this.textContent.trim();
                if (breadcrumbTitle) breadcrumbTitle.textContent = menuText;

                // 先把所有區塊都隱藏
                if (notesSection) notesSection.style.display = 'none';
                if (analysisSection) analysisSection.style.display = 'none';
                if (manualSection) manualSection.style.display = 'none';
                if (quizSection) quizSection.style.display = 'none';
                if (mistakesSection) mistakesSection.style.display = 'none';
                if (vrSection) vrSection.style.display = 'none';

                // 取得當前語系字典以設定副標題
                

                // 根據 i18n 屬性顯示對應區塊 (不再依賴 innerText 判斷，解決語系切換失效的問題)
                const menuId = this.getAttribute('data-i18n');
                if (menuId === 'nav-vr') {
                    if (vrSection) vrSection.style.display = 'block';

                } else if (menuId === 'nav-manual') {
                    if (manualSection) manualSection.style.display = 'block';

                } else if (menuId === 'nav-analysis') {
                    if (analysisSection) analysisSection.style.display = 'block';

                    
                    if (typeof loadLatestResult === 'function') {
                        loadLatestResult();
                    }

                    if (!window.radarChartCreated) {
                        if (typeof initRadarChart === 'function') initRadarChart();
                        window.radarChartCreated = true;
                    }
                
                } else if (menuId === 'nav-mistakes') {
                    if (mistakesSection) mistakesSection.style.display = 'block';

                    if (typeof renderMistakes === 'function') renderMistakes();
                } else if (menuId === 'nav-quiz') { 
                    if (quizSection) quizSection.style.display = 'block';

                    
                    // 每次點進來就自動抽 10 題新的
                    if (typeof generateQuiz === 'function') {
                        generateQuiz(10); 
                    }
                }
            } 
        }); 
    });

    // =========================================
    // 6. 系統設定視窗 (Settings Modal) 邏輯
    // =========================================
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsModal');
    
    if (settingsBtn && settingsModal && closeSettingsBtn) {
        settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
        closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('show'));
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.classList.remove('show');
        });

        const settingTabs = document.querySelectorAll('.setting-tab');
        const settingPanels = document.querySelectorAll('.setting-panel');

        settingTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                settingTabs.forEach(t => t.classList.remove('active'));
                settingPanels.forEach(p => p.classList.remove('active'));

                this.classList.add('active');
                const targetId = this.getAttribute('data-target');
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) targetPanel.classList.add('active');
            });
        });
    }

  // =========================================
    // 7. 即時翻譯引擎 
    // =========================================
        // =========================================
    const userStr = localStorage.getItem('currentUser');
    let currentUserId = null;

    if (userStr) {
        const user = JSON.parse(userStr);
        currentUserId = user.id; 
        
        // 1. 載入顯示名稱
        const userNameDisplay = document.querySelector('.user-info .name');
        if (userNameDisplay) {
            userNameDisplay.textContent = user.username; 
        }

        // 2. 🌟 載入專屬大頭貼 (左下角側邊欄)
        if (user.avatar_url) {
            const sidebarAvatar = document.querySelector('.sidebar .avatar');
            if (sidebarAvatar) {
                // 將原本的太空人 icon 替換成使用者上傳的圖片
                sidebarAvatar.innerHTML = `<img src="${user.avatar_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
        }
        // 3. 預先填入「系統設定」裡的個人檔案表單
        const profileNameInput = document.getElementById('profileName');
                const avatarPreview = document.getElementById('avatarPreview');

        if (profileNameInput) profileNameInput.value = user.username || '';
                // 讓設定視窗裡的大頭貼預覽也變成使用者的圖片
        if (avatarPreview && user.avatar_url) {
            avatarPreview.src = user.avatar_url;
        }
    } else {
        // 如果沒有登入紀錄，就把他踢回登入頁面
        // alert("請先登入系統！");
        // window.location.href = "login.html";
    }
    // =========================================
    // 9. 登出系統邏輯
    // =========================================
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault(); 
            const confirmLogout = confirm('確定要登出系統嗎？');
            if (confirmLogout) {
                localStorage.removeItem('currentUser');
                alert("已登出");
                window.location.href = 'login.html';
            }
        });
    }

// =========================================
// 12. 連接後端 API 並動態繪製「能力雷達圖」
// =========================================
window.initRadarChart = async function () {

    const userStr = localStorage.getItem('currentUser');

    if (!userStr) {
        console.warn("找不到 currentUser，無法取得雷達圖資料");
        return;
    }

    const user = JSON.parse(userStr);

    console.log("目前登入使用者：", user);
    console.log("目前使用者 ID：", user.id);

    // 預設資料
    let scores = [0, 0, 0, 0, 0];
    let stats = null;

    try {

        // =========================================
        // 1. 從 Node.js 取得最新真實成績
        // =========================================
        const response = await fetch(
            `${API_BASE_URL}/api/stats?userId=${user.id}`
        );

        const resData = await response.json();

        console.log("後端 /api/stats 回傳：", resData);

        if (!response.ok || !resData.success) {

            console.error(
                "讀取學習成果失敗：",
                resData.message
            );

            return;
        }

        stats = resData.data;


        // =========================================
        // 2. 雷達圖五項能力
        // =========================================
        if (
            Array.isArray(stats.radarScores) &&
            stats.radarScores.length === 5
        ) {

            scores = stats.radarScores.map(score =>
                Number(score) || 0
            );

        } else {

            console.warn(
                "radarScores 格式錯誤：",
                stats.radarScores
            );
        }


        console.log("雷達圖實際使用分數：", scores);


        // =========================================
        // 3. 更新上方數據卡片
        //
        // totalScore 已經由 Node.js 正式計算，
        // 前端不要再重新計算一次。
        // =========================================
        const valScore =
            document.getElementById('valScore');

        const valTime =
            document.getElementById('valTime');

        const valBlock =
            document.getElementById('valBlock');


        if (valScore) {

            valScore.innerHTML =
                `${stats.totalScore}<small>分</small>`;
        }

        if (valTime) {

            valTime.innerHTML =
                `${stats.trainingHours}<small>小時</small>`;
        }

        if (valBlock) {

            valBlock.innerHTML =
                `${stats.blocks}<small>次</small>`;
        }

        if (window.renderVrHistoryCard) {
            window.renderVrHistoryCard(stats.totalScore, stats.trainingHours, stats.createdAt, stats.answers);
        }

    } catch (error) {

        console.error(
            "讀取後端數據失敗：",
            error
        );

        return;
    }


    // =========================================
    // 4. 繪製雷達圖
    // =========================================
    const ctx =
        document.getElementById('securityRadarChart');

    if (!ctx) {
        console.warn("找不到 securityRadarChart");
        return;
    }


    // 如果之前已經有雷達圖
    // 先銷毀再重新建立
    if (window.myRadarChart) {

        window.myRadarChart.destroy();
        window.myRadarChart = null;
    }


    Chart.defaults.color = 'var(--text-light)';


    const langSelectElem =
        document.getElementById('langSelect');

    const initLang =
        langSelectElem
            ? langSelectElem.value
            : 'zh-TW';


    window.myRadarChart = new Chart(ctx, {

        type: 'radar',

        data: {

            labels:
                initLang === 'en'

                    ? [
                        'Identity & Access Management',
                        'Device & Media Protection',
                        'Document & Info Security',
                        'Environmental Risk',
                        'Server Room & Asset Management'
                    ]

                    : [
                        '身分與門禁管理',
                        '設備與媒體防護',
                        '文件與敏感資訊保護',
                        '環境風險防護',
                        '機房與資產管理'
                    ],

            datasets: [{

                label:
                    initLang === 'en'
                        ? 'Security Capability'
                        : '資安防禦力',

                data: scores,

                backgroundColor:
                    'rgba(0, 168, 255, 0.2)',

                borderColor:
                    '#00a8ff',

                borderWidth: 2,

                pointBackgroundColor:
                    '#fff',

                pointBorderColor:
                    '#00a8ff',

                pointHoverBackgroundColor:
                    '#00a8ff',

                pointHoverBorderColor:
                    '#fff'
            }]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            scales: {

                r: {

                    min: 0,
                    max: 100,

                    grid: {

                        color:
                            document.documentElement
                                .getAttribute('data-theme') === 'light'

                                ? 'rgba(0,0,0,0.1)'

                                : 'rgba(255,255,255,0.3)'
                    },

                    angleLines: {

                        color:
                            document.documentElement
                                .getAttribute('data-theme') === 'light'

                                ? 'rgba(0,0,0,0.1)'

                                : 'rgba(255,255,255,0.3)'
                    },

                    pointLabels: {

                        font: {
                            size: 16,
                            weight: 'bold'
                        },

                        color:
                            document.documentElement
                                .getAttribute('data-theme') === 'light'

                                ? '#1a202c'

                                : '#f8f9fa'
                    },

                    ticks: {
                        display: false,
                        stepSize: 10
                    }
                }
            },

            plugins: {

                legend: {
                    display: false
                }
            }
        }
    });


    console.log(
        "雷達圖建立完成，資料：",
        window.myRadarChart.data.datasets[0].data
    );


    // =========================================
    // 5. 繪製歷史趨勢折線圖
    // =========================================
    const lineCtx =
        document.getElementById('trendLineChart');


    if (
        lineCtx &&
        stats &&
        Array.isArray(stats.trendData) &&
        stats.trendData.length > 0
    ) {

        if (window.myTrendChart) {

            window.myTrendChart.destroy();
            window.myTrendChart = null;
        }


        window.myTrendChart =
            new Chart(lineCtx, {

                type: 'line',

                data: {

                    labels:
                        stats.trendLabels,

                    datasets: [{

                        label:
                            initLang === 'en'
                                ? 'Overall Security Score'
                                : '資安防禦綜合分數',

                        data:
                            stats.trendData,

                        borderColor:
                            '#00a8ff',

                        backgroundColor:
                            'rgba(0, 168, 255, 0.1)',

                        borderWidth: 2,

                        fill: true,

                        tension: 0.4,

                        pointBackgroundColor:
                            '#1c2638',

                        pointBorderColor:
                            '#00a8ff',

                        pointBorderWidth: 2,

                        pointRadius: 4,

                        pointHoverRadius: 6
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            backgroundColor:
                                'rgba(28, 38, 56, 0.9)',

                            titleColor:
                                'var(--text-light)',

                            bodyColor:
                                '#fff',

                            borderColor:
                                '#00a8ff',

                            borderWidth: 1
                        }
                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            max: 100,

                            grid: {
                                color:
                                    'rgba(255,255,255,0.05)'
                            },

                            ticks: {

                                color:
                                    document.documentElement
                                        .getAttribute('data-theme') === 'light'

                                        ? '#718096'

                                        : 'var(--text-light)'
                            }
                        },

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {

                                color:
                                    document.documentElement
                                        .getAttribute('data-theme') === 'light'

                                        ? '#718096'

                                        : 'var(--text-light)'
                            }
                        }
                    }
                }
            });
    }
};
// =========================================
    // 13. 個人檔案設定邏輯 (頭像上傳與資料儲存)
    // =========================================
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    // 頭像預覽功能 (FileReader)
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            // 檢查檔案大小 (限制 2MB)
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({
                    icon: 'warning',
                    title: '檔案過大',
                    text: '請上傳小於 2MB 的圖片！',
                    background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638',
                    color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff'
                });
                this.value = ""; // 清空輸入
                return;
            }

            // 讀取圖片並顯示預覽
            const reader = new FileReader();
            reader.onload = function(event) {
                avatarPreview.src = event.target.result;
            }
            reader.readAsDataURL(file);
        });
    }

   // 儲存變更按鈕邏輯
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async function() {
            const newName = document.getElementById('profileName').value.trim();
                        
            //  關鍵修復 1：先去 LocalStorage 把目前的登入者抓出來
            const currentUserStr = localStorage.getItem('currentUser');
            if (!currentUserStr) {
                alert("找不到登入資訊，請重新登入！");
                return;
            }
            const user = JSON.parse(currentUserStr); // 轉換成物件
            
            // 將按鈕變成處理中
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 儲存中...';
            this.disabled = true;

            try {
                const formData = new FormData();
                
                // 關鍵修復 2：把 userId 塞進包裹裡，讓後端知道是誰要更新！
                formData.append('userId', user.id); 
                
                formData.append('username', newName);
                                if(avatarInput.files[0]) formData.append('avatar', avatarInput.files[0]);

                const response = await fetch(`${API_BASE_URL}/api/update-profile`, {
                    method: 'POST',
                    body: formData // 注意：使用 FormData 時不用設定 Content-Type
                });
                
                const data = await response.json(); 
                
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '儲存成功！',
                        text: '您的個人檔案已更新。',
                        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
                        background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a202c' : '#f8f9fa'
                    });

                    // 覆蓋 LocalStorage，讓下次重新整理時資料還在
                    localStorage.setItem('currentUser', JSON.stringify(data.user));

                    // 更新側邊欄顯示名稱
                    const userNameDisplay = document.querySelector('.user-info .name');
                    if (userNameDisplay) userNameDisplay.textContent = data.user.username;

                    // 更新側邊欄大頭貼
                    if (data.user.avatar_url) {
                        const sidebarAvatar = document.querySelector('.sidebar .avatar');
                        if (sidebarAvatar) {
                            sidebarAvatar.innerHTML = `<img src="${data.user.avatar_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                        }
                    }
                } else {
                    alert("更新失敗：" + data.message);
                }
} catch (error) {
                //  讓瀏覽器印出真正的紅字錯誤
                console.error("儲存失敗的詳細原因:", error);
                
                //  讓彈跳視窗顯示真正的 JS 錯誤，而不是騙人說伺服器連線失敗
                alert("網頁執行發生錯誤：" + error.message);
                
            } finally {
                this.innerHTML = originalText;
                this.disabled = false;
            }
        });
    }
// =========================================
    // 15. 登入後更改密碼 
    // =========================================
    const openChangePwdBtn = document.getElementById('openChangePwdBtn');
    
    if (openChangePwdBtn) {
        openChangePwdBtn.addEventListener('click', async function(e) {
            e.preventDefault(); 

            const currentUserStr = localStorage.getItem('currentUser');
            if (!currentUserStr) return alert("找不到登入資訊，請重新登入");
            const user = JSON.parse(currentUserStr);

            const { value: formValues } = await Swal.fire({
                title: '<i class="fa-solid fa-lock"></i> 更改密碼',
                html: `
                    <div style="text-align: left; margin-top: 10px;">
                        <label style="color: var(--text-muted); font-size: 0.9rem;">目前密碼</label>
                        <div style="position: relative; margin-bottom: 15px;">
                            <input id="swal-curr-pwd" type="password" class="cyber-input" style="width: 100%; text-align: center; letter-spacing: 3px; padding-right: 40px;" placeholder="輸入目前的密碼">
                            <i class="fa-solid fa-eye-slash toggle-pwd-icon" data-target="swal-curr-pwd" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted);"></i>
                        </div>
                        
                        <label style="color: var(--text-muted); font-size: 0.9rem;">新密碼</label>
                        <div style="position: relative; margin-bottom: 15px;">
                            <input id="swal-new-pwd" type="password" class="cyber-input" style="width: 100%; text-align: center; letter-spacing: 3px; padding-right: 40px;" placeholder="至少8碼，含大小寫、數字及特殊符號">
                            <i class="fa-solid fa-eye-slash toggle-pwd-icon" data-target="swal-new-pwd" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted);"></i>
                        </div>
                        
                        <label style="color: var(--text-muted); font-size: 0.9rem;">確認新密碼</label>
                        <div style="position: relative; margin-bottom: 15px;">
                            <input id="swal-conf-pwd" type="password" class="cyber-input" style="width: 100%; text-align: center; letter-spacing: 3px; padding-right: 40px;" placeholder="再次輸入新密碼">
                            <i class="fa-solid fa-eye-slash toggle-pwd-icon" data-target="swal-conf-pwd" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted);"></i>
                        </div>
                    </div>
                `,
                background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff',
                showCancelButton: true,
                confirmButtonText: '驗證並儲存',
                cancelButtonText: '取消',
                confirmButtonColor: 'var(--primary-cyan)',
                cancelButtonColor: 'transparent',
                customClass: { cancelButton: 'cyber-cancel-btn' },
                
                didOpen: () => {
                    const toggleIcons = document.querySelectorAll('.toggle-pwd-icon');
                    toggleIcons.forEach(icon => {
                        icon.addEventListener('click', function() {
                            const targetId = this.getAttribute('data-target');
                            const inputField = document.getElementById(targetId);
                            
                            if (inputField.type === "password") {
                                inputField.type = "text";
                                this.classList.remove('fa-eye-slash');
                                this.classList.add('fa-eye');
                                this.style.color = '#00a8ff';
                            } else {
                                inputField.type = "password";
                                this.classList.remove('fa-eye');
                                this.classList.add('fa-eye-slash');
                                this.style.color = 'var(--text-light)';
                            }
                        });
                    });
                },

                preConfirm: () => {
                    const curr = document.getElementById('swal-curr-pwd').value;
                    const newPwd = document.getElementById('swal-new-pwd').value;
                    const conf = document.getElementById('swal-conf-pwd').value;

                    if (!curr || !newPwd || !conf) {
                        Swal.showValidationMessage(' 請填寫所有密碼欄位！');
                        return false;
                    }
                    if (newPwd !== conf) {
                        Swal.showValidationMessage(' 兩次新密碼輸入不一致！');
                        return false;
                    }
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
                    if (!passwordRegex.test(newPwd)) {
                        Swal.showValidationMessage(' 密碼強度不足 (需8碼，含大小寫、數字與特殊符號)！');
                        return false;
                    }
                    return { currentPassword: curr, newPassword: newPwd };
                }
            });

            if (formValues) {
                try {
                    Swal.fire({
                        title: '加密傳輸中...',
                        background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff',
                        didOpen: () => Swal.showLoading()
                    });

                    const response = await fetch(`${API_BASE_URL}/api/change-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            userId: user.id, 
                            currentPassword: formValues.currentPassword, 
                            newPassword: formValues.newPassword 
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        Swal.fire({ icon: 'success', title: '修改成功！', text: data.message, background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff' });
                    } else {
                        Swal.fire({ icon: 'error', title: '修改失敗', text: data.message, background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff' });
                    }
                } catch (error) {
                    Swal.fire({ icon: 'error', title: '連線失敗', text: '無法連接到伺服器', background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff' });
                }
            }
        });
    }

    // =========================================
    // 16. 資安手冊分頁切換邏輯
    // =========================================
    const manualTabs = document.querySelectorAll('.manual-tab');
    const clausePanels = document.querySelectorAll('.clause-panel');

    if (manualTabs.length > 0) {
        manualTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                manualTabs.forEach(t => t.classList.remove('active'));
                clausePanels.forEach(p => {
                    p.classList.remove('active');
                    p.style.display = 'none';
                });

                tab.classList.add('active');
                const targetId = tab.getAttribute('data-target');
                const targetPanel = document.getElementById(targetId);
                
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    targetPanel.style.display = 'block';
                }
            });
        });
    }

    // =========================================
    // 17. 終極硬核題庫（高難度實務稽核情境：50題）
    // =========================================
        const bigQuestionBank = [
    {
        "id": 1,
        "type": "MC",
        "q": "當一家跨國企業的核心研發主管無預警離職並轉投競爭對手時，下列何項處置程序最符合高階資安稽核的合規與風險管控要求？",
        "en_q": "當一家跨國企業的核心研發主管無預警離職並轉投競爭對手時，下列何項處置程序最符合高階資安稽核的合規與風險管控要求？",
        "options": {
            "A": "A. 立即通知人事部門啟動離職面談，並要求該主管在離職前完成所有專案交接，待交接完成後再關閉帳號。",
            "B": "B. 由直屬主管口頭警告該員工不得洩漏機密，並要求資訊部門在下週一上班前停用其電子郵件信箱。",
            "C": "C. 同步且即時地全面撤銷其邏輯與實體存取權限，同時封存其個人工作站與雲端硬碟，並啟動強制交接與離職後合規審查。",
            "D": "D. 撤銷其對核心研發系統的存取權，保留一般辦公室網路權限，以便其在最後工作日整理個人物品。"
        },
        "en_options": {
            "A": "A. 立即通知人事部門啟動離職面談，並要求該主管在離職前完成所有專案交接，待交接完成後再關閉帳號。",
            "B": "B. 由直屬主管口頭警告該員工不得洩漏機密，並要求資訊部門在下週一上班前停用其電子郵件信箱。",
            "C": "C. 同步且即時地全面撤銷其邏輯與實體存取權限，同時封存其個人工作站與雲端硬碟，並啟動強制交接與離職後合規審查。",
            "D": "D. 撤銷其對核心研發系統的存取權，保留一般辦公室網路權限，以便其在最後工作日整理個人物品。"
        },
        "ans": "C",
        "explanation": "面對高風險離職（尤其是核心人員轉投競爭對手），首要任務是「立即止血」。ISO 27002 強調在僱用終止或變更時，必須立即撤銷所有相關的實體與邏輯存取權限。封存設備和雲端空間是為了保全證據，以防機密外洩或破壞，後續的合規審查則能確認是否有違規行為發生。單純的交接或延遲撤銷權限都會帶來極高的風險。",
        "en_explanation": "面對高風險離職（尤其是核心人員轉投競爭對手），首要任務是「立即止血」。ISO 27002 強調在僱用終止或變更時，必須立即撤銷所有相關的實體與邏輯存取權限。封存設備和雲端空間是為了保全證據，以防機密外洩或破壞，後續的合規審查則能確認是否有違規行為發生。單純的交接或延遲撤銷權限都會帶來極高的風險。"
    },
    {
        "id": 2,
        "type": "MC",
        "q": "某企業總部將伺服器機房設置於大樓二樓，且該樓層緊鄰公共戶外景觀平台。下列哪一項複合式控制措施組合最能有效防範透過景觀平台的實體入侵與高階滲透測試？",
        "en_q": "某企業總部將伺服器機房設置於大樓二樓，且該樓層緊鄰公共戶外景觀平台。下列哪一項複合式控制措施組合最能有效防範透過景觀平台的實體入侵與高階滲透測試？",
        "options": {
            "A": "A. 在景觀平台設置警告標語，並要求保全人員每兩小時巡邏一次。",
            "B": "B. 在機房內部安裝一般監視器（CCTV），並將錄影資料保留 30 天。",
            "C": "C. 採用雙層防彈玻璃、加裝震動感測器、設置紅外線入侵偵測網格，並將機房對外窗全面封死或改為無對外開口的無窗設計。",
            "D": "D. 在窗戶貼上單向透光隔熱紙，並在景觀平台與機房窗戶之間種植帶刺的灌木叢作為物理屏障。"
        },
        "en_options": {
            "A": "A. 在景觀平台設置警告標語，並要求保全人員每兩小時巡邏一次。",
            "B": "B. 在機房內部安裝一般監視器（CCTV），並將錄影資料保留 30 天。",
            "C": "C. 採用雙層防彈玻璃、加裝震動感測器、設置紅外線入侵偵測網格，並將機房對外窗全面封死或改為無對外開口的無窗設計。",
            "D": "D. 在窗戶貼上單向透光隔熱紙，並在景觀平台與機房窗戶之間種植帶刺的灌木叢作為物理屏障。"
        },
        "ans": "C",
        "explanation": "機房（核心資訊處理設施）緊鄰公共區域是極大的實體安全漏洞（控制項 7.1）。最佳實務是機房不應有對外窗，若建築結構無法更改，則必須採用最高強度的實體防護（如防彈玻璃）加上多重感測器（震動、紅外線）來建立縱深防禦。只有複合式的物理屏障加上電子偵測，才能有效應對專業的實體滲透測試或入侵。",
        "en_explanation": "機房（核心資訊處理設施）緊鄰公共區域是極大的實體安全漏洞（控制項 7.1）。最佳實務是機房不應有對外窗，若建築結構無法更改，則必須採用最高強度的實體防護（如防彈玻璃）加上多重感測器（震動、紅外線）來建立縱深防禦。只有複合式的物理屏障加上電子偵測，才能有效應對專業的實體滲透測試或入侵。"
    },
    {
        "id": 3,
        "type": "MC",
        "q": "企業若需將存有客戶加密資料的備份磁帶委由外部物流運送至異地備援中心，下列哪一項作業流程最符合進階稽核的最高防護標準？",
        "en_q": "企業若需將存有客戶加密資料的備份磁帶委由外部物流運送至異地備援中心，下列哪一項作業流程最符合進階稽核的最高防護標準？",
        "options": {
            "A": "A. 將磁帶放入一般紙箱密封，交由知名快遞公司運送，並索取寄件收據。",
            "B": "B. 由資訊部門新進員工自行開車將磁帶送至異地備援中心，以節省成本。",
            "C": "C. 使用硬體級加密（如 AES-256）、放入具備 GPS 定位與防破壞機制的特製保險箱，並由兩名保全隨行且全程簽署交接清單。",
            "D": "D. 在磁帶外殼貼上「機密」標籤，並要求物流司機承諾會小心保管。"
        },
        "en_options": {
            "A": "A. 將磁帶放入一般紙箱密封，交由知名快遞公司運送，並索取寄件收據。",
            "B": "B. 由資訊部門新進員工自行開車將磁帶送至異地備援中心，以節省成本。",
            "C": "C. 使用硬體級加密（如 AES-256）、放入具備 GPS 定位與防破壞機制的特製保險箱，並由兩名保全隨行且全程簽署交接清單。",
            "D": "D. 在磁帶外殼貼上「機密」標籤，並要求物流司機承諾會小心保管。"
        },
        "ans": "C",
        "explanation": "雖然資料已加密，但實體資產（備份磁帶）在場外運送期間風險最高（控制項 7.10）。最高防護標準不僅要求資料本身的加密（邏輯安全），更要求實體運送過程的極致安全。包含：強固的實體容器（防破壞保險箱）、即時追蹤（GPS）、雙人護送原則（兩名保全）以及嚴格的監管鏈（全程簽署交接清單）。",
        "en_explanation": "雖然資料已加密，但實體資產（備份磁帶）在場外運送期間風險最高（控制項 7.10）。最高防護標準不僅要求資料本身的加密（邏輯安全），更要求實體運送過程的極致安全。包含：強固的實體容器（防破壞保險箱）、即時追蹤（GPS）、雙人護送原則（兩名保全）以及嚴格的監管鏈（全程簽署交接清單）。"
    },
    {
        "id": 4,
        "type": "MC",
        "q": "在執行「人員背景查核」時，某金融科技公司針對將負責核心交易系統架構的資深軟體工程師進行招募。下列關於背景查核範圍與深度的敘述，何者最為正確？",
        "en_q": "在執行「人員背景查核」時，某金融科技公司針對將負責核心交易系統架構的資深軟體工程師進行招募。下列關於背景查核範圍與深度的敘述，何者最為正確？",
        "options": {
            "A": "A. 只要確認應徵者提供的大學畢業證書為真，即可完成查核。",
            "B": "B. 查核深度應與職位風險成正比，除了一般學經歷與信用紀錄外，還需針對其過往技術背景、潛在利益衝突及法律訴訟紀錄進行合規查核。",
            "C": "C. 背景查核會侵犯個人隱私，因此企業不應對任何職位進行背景查核。",
            "D": "D. 僅需透過社交媒體（如 Facebook、Instagram）觀察應徵者的日常發文，以評估其品行。"
        },
        "en_options": {
            "A": "A. 只要確認應徵者提供的大學畢業證書為真，即可完成查核。",
            "B": "B. 查核深度應與職位風險成正比，除了一般學經歷與信用紀錄外，還需針對其過往技術背景、潛在利益衝突及法律訴訟紀錄進行合規查核。",
            "C": "C. 背景查核會侵犯個人隱私，因此企業不應對任何職位進行背景查核。",
            "D": "D. 僅需透過社交媒體（如 Facebook、Instagram）觀察應徵者的日常發文，以評估其品行。"
        },
        "ans": "B",
        "explanation": "背景查核的程度應與業務需求、職務分類及預期的風險相稱。對於接觸核心系統的高權限/高風險職位，標準的查核（學經歷）是不夠的，必須進行更深度的盡職調查，包括財務狀況（信用紀錄，防範經濟壓力導致的舞弊）、利益衝突及犯罪或訴訟紀錄，以確保人員的誠信與可靠度。",
        "en_explanation": "背景查核的程度應與業務需求、職務分類及預期的風險相稱。對於接觸核心系統的高權限/高風險職位，標準的查核（學經歷）是不夠的，必須進行更深度的盡職調查，包括財務狀況（信用紀錄，防範經濟壓力導致的舞弊）、利益衝突及犯罪或訴訟紀錄，以確保人員的誠信與可靠度。"
    },
    {
        "id": 5,
        "type": "MA",
        "q": "稽核員在進行實體機房稽核時，發現機房內部的高架地板下方佈滿了電力線路與網路通訊纜線，且兩者緊密交錯綑綁在一起。從實體與環境安全的角度來看，這會帶來哪些潛在風險？（多選）",
        "en_q": "稽核員在進行實體機房稽核時，發現機房內部的高架地板下方佈滿了電力線路與網路通訊纜線，且兩者緊密交錯綑綁在一起。從實體與環境安全的角度來看，這會帶來哪些潛在風險？（多選）",
        "options": {
            "A": "A. 高壓電力線路產生的電磁干擾（EMI）可能嚴重影響網路通訊纜線的資料傳輸品質與封包完整性。",
            "B": "B. 增加纜線過熱引發短路與火災的風險。",
            "C": "C. 方便工程師同時維護電力與網路設備，提高工作效率。",
            "D": "D. 增加未來維修或擴充線路時，誤觸或誤拔線路的風險，導致服務中斷。"
        },
        "en_options": {
            "A": "A. 高壓電力線路產生的電磁干擾（EMI）可能嚴重影響網路通訊纜線的資料傳輸品質與封包完整性。",
            "B": "B. 增加纜線過熱引發短路與火災的風險。",
            "C": "C. 方便工程師同時維護電力與網路設備，提高工作效率。",
            "D": "D. 增加未來維修或擴充線路時，誤觸或誤拔線路的風險，導致服務中斷。"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "佈線安全（Cabling security，控制項 7.12）要求電力纜線和通訊纜線必須實體隔離。電力線路（尤其是高壓或大電流）會產生電磁干擾（EMI），若與網路線緊密相鄰，會造成訊號衰減、資料錯誤甚至網路中斷。此外，未隔離的纜線散熱不良易引發火災，且雜亂的佈線極易在維護時造成人為疏失（誤拔線路）引發服務中斷。",
        "en_explanation": "佈線安全（Cabling security，控制項 7.12）要求電力纜線和通訊纜線必須實體隔離。電力線路（尤其是高壓或大電流）會產生電磁干擾（EMI），若與網路線緊密相鄰，會造成訊號衰減、資料錯誤甚至網路中斷。此外，未隔離的纜線散熱不良易引發火災，且雜亂的佈線極易在維護時造成人為疏失（誤拔線路）引發服務中斷。"
    },
    {
        "id": 6,
        "type": "MA",
        "q": "針對 ISO 27002 規範中之「桌面淨空及螢幕淨空（Clear Desk and Clear Screen）」，某科技公司實施了全面無紙化與開放式隨機座位辦公環境。下列哪些管理與技術控制措施是落實該政策不可或缺的關鍵？（多選）",
        "en_q": "針對 ISO 27002 規範中之「桌面淨空及螢幕淨空（Clear Desk and Clear Screen）」，某科技公司實施了全面無紙化與開放式隨機座位辦公環境。下列哪些管理與技術控制措施是落實該政策不可或缺的關鍵？（多選）",
        "options": {
            "A": "A. 實施自動螢幕鎖定機制，防止員工短暫離開座位時遭受旁窺。",
            "B": "B. 要求員工每天下班時必須清空桌面所有物品，並將筆記型電腦鎖入個人置物櫃。",
            "C": "C. 依賴員工自律，口頭宣導離開座位時要手動鎖定螢幕即可。",
            "D": "D. 在開放辦公區廣設碎紙機與機密文件回收箱。"
        },
        "en_options": {
            "A": "A. 實施自動螢幕鎖定機制，防止員工短暫離開座位時遭受旁窺。",
            "B": "B. 要求員工每天下班時必須清空桌面所有物品，並將筆記型電腦鎖入個人置物櫃。",
            "C": "C. 依賴員工自律，口頭宣導離開座位時要手動鎖定螢幕即可。",
            "D": "D. 在開放辦公區廣設碎紙機與機密文件回收箱。"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "桌面與螢幕淨空（控制項 7.7）的目的是減少機密資訊被未授權存取的機會。在隨機座位的環境中，技術面強制實施自動螢幕鎖定（A）是基礎。實體面上，要求下班清空桌面並妥善鎖好設備（B）能防範非辦公時間的竊取。此外，即使是無紙化辦公室，偶爾仍有列印需求，因此提供安全的機密文件銷毀管道（D）也是落實淨空政策的必要配套措施。僅依賴員工自律（C）是不可靠的。",
        "en_explanation": "桌面與螢幕淨空（控制項 7.7）的目的是減少機密資訊被未授權存取的機會。在隨機座位的環境中，技術面強制實施自動螢幕鎖定（A）是基礎。實體面上，要求下班清空桌面並妥善鎖好設備（B）能防範非辦公時間的竊取。此外，即使是無紙化辦公室，偶爾仍有列印需求，因此提供安全的機密文件銷毀管道（D）也是落實淨空政策的必要配套措施。僅依賴員工自律（C）是不可靠的。"
    },
    {
        "id": 7,
        "type": "MA",
        "q": "依據 ISO 27002 關於「防範實體及環境威脅（Protecting Against Physical and Environmental Threats）」之要求，企業在評估資料中心選址與機房內部防護時，下列哪些防範措施屬於標準且必要的合規項目？（多選）",
        "en_q": "依據 ISO 27002 關於「防範實體及環境威脅（Protecting Against Physical and Environmental Threats）」之要求，企業在評估資料中心選址與機房內部防護時，下列哪些防範措施屬於標準且必要的合規項目？（多選）",
        "options": {
            "A": "A. 評估選址是否位於已知的天災高風險區域（如斷層帶、易淹水區）。",
            "B": "B. 於高架地板下方安裝具備聯動警報機制的漏水偵測感知線纜，以防範空調系統或地下管線滲漏。",
            "C": "C. 盡量將電子設備及紙本檔案堆疊放置以節省及預留空間。",
            "D": "D. 配備合適的滅火系統（如 FM-200 或無毒氣體滅火系統），且須避免使用會損壞電子設備的灑水系統。"
        },
        "en_options": {
            "A": "A. 評估選址是否位於已知的天災高風險區域（如斷層帶、易淹水區）。",
            "B": "B. 於高架地板下方安裝具備聯動警報機制的漏水偵測感知線纜，以防範空調系統或地下管線滲漏。",
            "C": "C. 盡量將電子設備及紙本檔案堆疊放置以節省及預留空間。",
            "D": "D. 配備合適的滅火系統（如 FM-200 或無毒氣體滅火系統），且須避免使用會損壞電子設備的灑水系統。"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "防範實體及環境威脅（控制項 7.5）要求必須考慮自然災害（地震、火災、水災）及人為威脅。選址避開高風險區（A）是首要原則。機房內漏水偵測（B）能及早發現空調漏水等隱患。合適的氣體滅火系統（D）能確保滅火時不破壞昂貴的 IT 設備。將易燃物存放於機房（C）則嚴重違反了消防與環境安全規定，會大幅增加火災風險。",
        "en_explanation": "防範實體及環境威脅（控制項 7.5）要求必須考慮自然災害（地震、火災、水災）及人為威脅。選址避開高風險區（A）是首要原則。機房內漏水偵測（B）能及早發現空調漏水等隱患。合適的氣體滅火系統（D）能確保滅火時不破壞昂貴的 IT 設備。將易燃物存放於機房（C）則嚴重違反了消防與環境安全規定，會大幅增加火災風險。"
    },
    {
        "id": 8,
        "type": "MC",
        "q": "在人員安全與意識培訓的實務稽核中，下列敘述何者正確？",
        "en_q": "在人員安全與意識培訓的實務稽核中，下列敘述何者正確？",
        "options": {
            "A": "A. 員工報到時簽署過一次資訊安全承諾書，即視同已具備足夠的資安意識。",
            "B": "B. 培訓內容應針對所有層級員工統一且固定不變，以確保標準化。",
            "C": "C. 資安教育訓練不應僅流於形式，其成效必須透過量化指標進行定期評估與改善。",
            "D": "D. 高階主管工作繁忙，可以免除參加定期的資安意識培訓。"
        },
        "en_options": {
            "A": "A. 員工報到時簽署過一次資訊安全承諾書，即視同已具備足夠的資安意識。",
            "B": "B. 培訓內容應針對所有層級員工統一且固定不變，以確保標準化。",
            "C": "C. 資安教育訓練不應僅流於形式，其成效必須透過量化指標進行定期評估與改善。",
            "D": "D. 高階主管工作繁忙，可以免除參加定期的資安意識培訓。"
        },
        "ans": "C",
        "explanation": "資安意識培訓（控制項 6.3）不是一次性的活動，必須是持續且具針對性的過程。稽核的重點在於「有效性」。單純發送教材或簽署文件是不夠的。有效的培訓應透過社交工程演練結果（如釣魚點擊率降低）、員工主動通報次數等量化指標來證明其成效（C），並據此調整未來的培訓內容。高階主管往往是定向釣魚攻擊（Spear Phishing）的首要目標，更不能免除培訓。",
        "en_explanation": "資安意識培訓（控制項 6.3）不是一次性的活動，必須是持續且具針對性的過程。稽核的重點在於「有效性」。單純發送教材或簽署文件是不夠的。有效的培訓應透過社交工程演練結果（如釣魚點擊率降低）、員工主動通報次數等量化指標來證明其成效（C），並據此調整未來的培訓內容。高階主管往往是定向釣魚攻擊（Spear Phishing）的首要目標，更不能免除培訓。"
    },
    {
        "id": 9,
        "type": "MA",
        "q": "某外包軟體開發商的工程師因專案需求需進入客戶端機房進行系統維護。依據 ISO 27002 實體與人員存取控制原則，下列哪些作業流程是客戶端必須落實的必要防護措施？（多選）",
        "en_q": "某外包軟體開發商的工程師因專案需求需進入客戶端機房進行系統維護。依據 ISO 27002 實體與人員存取控制原則，下列哪些作業流程是客戶端必須落實的必要防護措施？（多選）",
        "options": {
            "A": "A. 外包工程師在進入機房前，必須完成背景查核並已簽署具法律效力的保密協議（NDA）。",
            "B": "B. 工程師出示外包公司識別證後，可讓其自行刷卡進入機房。",
            "C": "C. 進入機房後，必須由客戶端內部授權人員全程陪同與監督，限制其只能接觸相關維護區域。",
            "D": "D. 詳細記錄該外包工程師的進出時間、目的及授權核准紀錄。"
        },
        "en_options": {
            "A": "A. 外包工程師在進入機房前，必須完成背景查核並已簽署具法律效力的保密協議（NDA）。",
            "B": "B. 工程師出示外包公司識別證後，可讓其自行刷卡進入機房。",
            "C": "C. 進入機房後，必須由客戶端內部授權人員全程陪同與監督，限制其只能接觸相關維護區域。",
            "D": "D. 詳細記錄該外包工程師的進出時間、目的及授權核准紀錄。"
        },
        "ans": [
            "A",
            "C",
            "D"
        ],
        "explanation": "針對外部供應商或訪客進入安全區域（Physical Entry，控制項 7.2），控制要求更為嚴格。必須確保合約與保密義務已落實（A）。訪客/外包商絕對不可在無人陪同下單獨留在核心安全區域（如機房），必須由內部授權人員全程監督（C）。同時，必須留下完整的稽核軌跡，這次包括進出紀錄與授權證明（D），以備日後追查。",
        "en_explanation": "針對外部供應商或訪客進入安全區域（Physical Entry，控制項 7.2），控制要求更為嚴格。必須確保合約與保密義務已落實（A）。訪客/外包商絕對不可在無人陪同下單獨留在核心安全區域（如機房），必須由內部授權人員全程監督（C）。同時，必須留下完整的稽核軌跡，這次包括進出紀錄與授權證明（D），以備日後追查。"
    },
    {
        "id": 10,
        "type": "MC",
        "q": "依據「資訊安全事件通報（Information Security Event Reporting）」之人員控制規範，當基層員工在辦公室座位上發現一封高度可疑的釣魚郵件，且附帶了聲稱是公司最新考績辦法的壓縮檔時，下列哪一項處置流程完全符合資安標準？",
        "en_q": "依據「資訊安全事件通報（Information Security Event Reporting）」之人員控制規範，當基層員工在辦公室座位上發現一封高度可疑的釣魚郵件，且附帶了聲稱是公司最新考績辦法的壓縮檔時，下列哪一項處置流程完全符合資安標準？",
        "options": {
            "A": "A. 將該郵件轉發給同部門所有同事，並提醒大家注意防範。",
            "B": "B. 立即停止操作，不點擊壓縮檔亦不解壓縮，並透過公司規定的資安事件通報管道呈報該郵件。",
            "C": "C. 為求檢查，先將壓縮檔下載到個人隨身碟中，帶回家用自己的電腦開啟查看。",
            "D": "D. 直接將該郵件刪除，並清空垃圾桶。"
        },
        "en_options": {
            "A": "A. 將該郵件轉發給同部門所有同事，並提醒大家注意防範。",
            "B": "B. 立即停止操作，不點擊壓縮檔亦不解壓縮，並透過公司規定的資安事件通報管道呈報該郵件。",
            "C": "C. 為求檢查，先將壓縮檔下載到個人隨身碟中，帶回家用自己的電腦開啟查看。",
            "D": "D. 直接將該郵件刪除，並清空垃圾桶。"
        },
        "ans": "B",
        "explanation": "資安事件通報（控制項 6.8）要求員工必須知悉並使用既定的管道，盡速通報觀察到的或懷疑的資訊安全事件。最正確的反應是「不接觸（不點擊附件）、即時通報」（B），讓專業的資安團隊接手分析。轉發郵件（A）可能造成二次傳播風險；私自下載（C）會擴大感染面；直接刪除（D）則剝奪了資安團隊獲取早期威脅情報（Threat Intelligence）的機會，不利於聯防。",
        "en_explanation": "資安事件通報（控制項 6.8）要求員工必須知悉並使用既定的管道，盡速通報觀察到的或懷疑的資訊安全事件。最正確的反應是「不接觸（不點擊附件）、即時通報」（B），讓專業的資安團隊接手分析。轉發郵件（A）可能造成二次傳播風險；私自下載（C）會擴大感染面；直接刪除（D）則剝奪了資安團隊獲取早期威脅情報（Threat Intelligence）的機會，不利於聯防。"
    },
    {
        "id": 11,
        "type": "MC",
        "q": "某高科技企業的資訊安全長（CISO）發現，部分離職員工在離職前夕利用合法的管理權限，透過自動化腳本大量打包非自身職責範圍的研發圖紙與核心原始碼。為有效防範此類內部威脅，企業應優先落實下列哪一項管理與技術控制措施？",
        "en_q": "某高科技企業的資訊安全長（CISO）發現，部分離職員工在離職前夕利用合法的管理權限，透過自動化腳本大量打包非自身職責範圍的研發圖紙與核心原始碼。為有效防範此類內部威脅，企業應優先落實下列哪一項管理與技術控制措施？",
        "options": {
            "A": "A. 要求所有員工在入職時簽署終身禁業禁止條款，以確保離職後無法轉投競爭對手。",
            "B": "B. 建立基於使用者行為分析（UEBA）與資料外洩防護（DLP）的即時異常存取監控與告警機制，並對敏感資料異動設置「雙人覆核」或特權帳號審查機制。",
            "C": "C. 委託外部知名徵信社對全體員工進行每季一次的突擊性背景複查與測謊。",
            "D": "D. 將所有員工的個人隨身碟與外接儲存媒體全面沒收，改由企業統一配發無對外傳輸功能的印表機。"
        },
        "en_options": {
            "A": "A. 要求所有員工在入職時簽署終身禁業禁止條款，以確保離職後無法轉投競爭對手。",
            "B": "B. 建立基於使用者行為分析（UEBA）與資料外洩防護（DLP）的即時異常存取監控與告警機制，並對敏感資料異動設置「雙人覆核」或特權帳號審查機制。",
            "C": "C. 委託外部知名徵信社對全體員工進行每季一次的突擊性背景複查與測謊。",
            "D": "D. 將所有員工的個人隨身碟與外接儲存媒體全面沒收，改由企業統一配發無對外傳輸功能的印表機。"
        },
        "ans": "B",
        "explanation": "內部威脅往往來自擁有合法權限的合法人員。僅靠合約約束（A）或沒收實體設備（D）無法阻止數位資料透過網路外洩。ISO 27002 強調在人員變更與存取控制中，必須透過技術監控手段（如 UEBA、DLP）即時偵測異常的大量下載行為（B），並搭配職責區隔（Segregation of duties）與雙人覆核，才能在損害發生前攔截。突擊測謊與過度侵犯隱私（C）不符合國際資安標準的比例原則。",
        "en_explanation": "內部威脅往往來自擁有合法權限的合法人員。僅靠合約約束（A）或沒收實體設備（D）無法阻止數位資料透過網路外洩。ISO 27002 強調在人員變更與存取控制中，必須透過技術監控手段（如 UEBA、DLP）即時偵測異常的大量下載行為（B），並搭配職責區隔（Segregation of duties）與雙人覆核，才能在損害發生前攔截。突擊測謊與過度侵犯隱私（C）不符合國際資安標準的比例原則。"
    },
    {
        "id": 12,
        "type": "MC",
        "q": "某金融機構的資料中心位於辦公大樓地下室，為因應實體及環境安全的要求，稽核員在檢視其機房空調與消防系統時，發現下列四種設計。請問哪一項設計最符合最高規格的防護標準？",
        "en_q": "某金融機構的資料中心位於辦公大樓地下室，為因應實體及環境安全的要求，稽核員在檢視其機房空調與消防系統時，發現下列四種設計。請問哪一項設計最符合最高規格的防護標準？",
        "options": {
            "A": "A. 採用傳統的直立式水管撒水系統，並連接大樓的主消防水管，確保水源不斷。",
            "B": "B. 設置雙迴路獨立供電的精密恆溫恆濕空調，並在機房天花板及高架地板下全面部署感溫線纜，同時搭配氣體式自動滅火系統與緊急手動切斷閥。",
            "C": "C. 為了節省空間與成本，將機房空調與整棟大樓的中央空調共用風管，並在機房內放置數台移動式水冷扇。",
            "D": "D. 僅依賴大樓外側的自然通風窗戶進行散熱，以達到節能減碳與符合環保法規的要求。"
        },
        "en_options": {
            "A": "A. 採用傳統的直立式水管撒水系統，並連接大樓的主消防水管，確保水源不斷。",
            "B": "B. 設置雙迴路獨立供電的精密恆溫恆濕空調，並在機房天花板及高架地板下全面部署感溫線纜，同時搭配氣體式自動滅火系統與緊急手動切斷閥。",
            "C": "C. 為了節省空間與成本，將機房空調與整棟大樓的中央空調共用風管，並在機房內放置數台移動式水冷扇。",
            "D": "D. 僅依賴大樓外側的自然通風窗戶進行散熱，以達到節能減碳與符合環保法規的要求。"
        },
        "ans": "B",
        "explanation": "機房實體環境控制要求必須具備穩定且安全的支援設施。水管撒水系統（A）對 IT 設備是災難性的；共用風管與水冷扇（C）或自然通風（D）會引入外部粉塵、濕氣或無法控制的環境威脅。正確的做法是採用獨立且雙迴路的精密空調、全方位的消防感測（溫感/煙感）以及不損壞設備的氣體滅火系統（B），並具備手動切斷機制防止誤觸釋放。",
        "en_explanation": "機房實體環境控制要求必須具備穩定且安全的支援設施。水管撒水系統（A）對 IT 設備是災難性的；共用風管與水冷扇（C）或自然通風（D）會引入外部粉塵、濕氣或無法控制的環境威脅。正確的做法是採用獨立且雙迴路的精密空調、全方位的消防感測（溫感/煙感）以及不損壞設備的氣體滅火系統（B），並具備手動切斷機制防止誤觸釋放。"
    },
    {
        "id": 13,
        "type": "MC",
        "q": "一家跨國外包軟體研發公司聘用了大量來自不同國家的遠距約聘工程師。依據「遠距工作（Remote Working）」規範，下列何種管理作法最容易在稽核時被判為重大缺失？",
        "en_q": "一家跨國外包軟體研發公司聘用了大量來自不同國家的遠距約聘工程師。依據「遠距工作（Remote Working）」規範，下列何種管理作法最容易在稽核時被判為重大缺失？",
        "options": {
            "A": "A. 要求所有遠距外包工程師必須透過公司規定的虛擬私人網路（VPN）連線，並強制啟動多因素驗證（MFA）與端點合規檢查。",
            "B": "B. 允許外包工程師使用其個人私人筆記型電腦直接透過網頁端存取客戶的正式生產環境資料庫，並由其自行決定密碼複雜度。",
            "C": "C. 定期對外包廠商進行實體與數位資安合規稽核，並在合約中明確規範其人員的保密與違約罰則。",
            "D": "D. 針對遠距工作環境，要求工程師必須確保工作場所具備實體隱私，防止同住家人或訪客窺視螢幕機密。"
        },
        "en_options": {
            "A": "A. 要求所有遠距外包工程師必須透過公司規定的虛擬私人網路（VPN）連線，並強制啟動多因素驗證（MFA）與端點合規檢查。",
            "B": "B. 允許外包工程師使用其個人私人筆記型電腦直接透過網頁端存取客戶的正式生產環境資料庫，並由其自行決定密碼複雜度。",
            "C": "C. 定期對外包廠商進行實體與數位資安合規稽核，並在合約中明確規範其人員的保密與違約罰則。",
            "D": "D. 針對遠距工作環境，要求工程師必須確保工作場所具備實體隱私，防止同住家人或訪客窺視螢幕機密。"
        },
        "ans": "B",
        "explanation": "允許外包人員使用無法受企業管控的「私人筆記型電腦」直接存取正式生產環境，且不強制安全規範與端點防護（B），是極度嚴重的資安破口，違反了 ISO 27002 對外部供應商與遠距資產的嚴格管控原則。選項 A、C、D 均為標準且合規的最佳實務。",
        "en_explanation": "允許外包人員使用無法受企業管控的「私人筆記型電腦」直接存取正式生產環境，且不強制安全規範與端點防護（B），是極度嚴重的資安破口，違反了 ISO 27002 對外部供應商與遠距資產的嚴格管控原則。選項 A、C、D 均為標準且合規的最佳實務。"
    },
    {
        "id": 14,
        "type": "MC",
        "q": "某企業總部大樓為防止外部不明人士利用「尾隨（Tailgating）」手法闖入辦公區或機房，決定升級門禁管制系統。下列哪一項門禁硬體與邏輯配置的組合，在實體防護上最具備防禦鑑別力？",
        "en_q": "某企業總部大樓為防止外部不明人士利用「尾隨（Tailgating）」手法闖入辦公區或機房，決定升級門禁管制系統。下列哪一項門禁硬體與邏輯配置的組合，在實體防護上最具備防禦鑑別力？",
        "options": {
            "A": "A. 於出入口安裝單向傳統玻璃旋轉門，並在旁邊設置訪客登記簿。",
            "B": "B. 採用雙門互鎖氣閘門，結合刷卡，並於內部裝設光學防尾隨偵測器，當偵測到兩人同時進入時自動鎖定並觸發警報。",
            "C": "C. 將辦公區大門全面改為自動感應電動滑門，並調靈敏度，只要有人靠近就自動開啟。",
            "D": "D. 廢除所有電子門禁卡，改發紙本通行證，並由大樓門口的保全人員識別並開放通行。"
        },
        "en_options": {
            "A": "A. 於出入口安裝單向傳統玻璃旋轉門，並在旁邊設置訪客登記簿。",
            "B": "B. 採用雙門互鎖氣閘門，結合刷卡，並於內部裝設光學防尾隨偵測器，當偵測到兩人同時進入時自動鎖定並觸發警報。",
            "C": "C. 將辦公區大門全面改為自動感應電動滑門，並調靈敏度，只要有人靠近就自動開啟。",
            "D": "D. 廢除所有電子門禁卡，改發紙本通行證，並由大樓門口的保全人員識別並開放通行。"
        },
        "ans": "B",
        "explanation": "防範尾隨需要高強度的實體架構與技術結合。雙門互鎖氣閘門（Mantrap）確保一次只能通過一人，加上光學防尾隨偵測（B），能有效阻絕未授權者緊跟進入。傳統旋轉門（A）容易被兩人硬擠通過；自動滑門（C）毫無防尾隨能力；紙本與肉眼辨識（D）則完全無法應對現代資安稽核要求。",
        "en_explanation": "防範尾隨需要高強度的實體架構與技術結合。雙門互鎖氣閘門（Mantrap）確保一次只能通過一人，加上光學防尾隨偵測（B），能有效阻絕未授權者緊跟進入。傳統旋轉門（A）容易被兩人硬擠通過；自動滑門（C）毫無防尾隨能力；紙本與肉眼辨識（D）則完全無法應對現代資安稽核要求。"
    },
    {
        "id": 15,
        "type": "MA",
        "q": "某企業人資與資安團隊針對即將離職的高階主管制定了標準作業程序（SOP）。下列哪些處置步驟符合資安稽核的合規要求？（多選）",
        "en_q": "某企業人資與資安團隊針對即將離職的高階主管制定了標準作業程序（SOP）。下列哪些處置步驟符合資安稽核的合規要求？（多選）",
        "options": {
            "A": "A. 在離職生效日的當下，同步且立即終止其所有企業身分識別帳號、VPN 憑證、電子郵件及雲端儲存空間存取權限。",
            "B": "B. 要求該主管在離職前將個人工作筆記型電腦繳回，並由資安團隊進行數位鑑識與硬碟完整抹除或封存。",
            "C": "C. 考量其為高階主管，允許其在離職後一個月內以「顧問」身分保留原有的系統管理員權限，以便隨時協助交接。",
            "D": "D. 確實執行離職面談與資產清點，收回所有實體門禁卡、辦公室鑰匙及公司配發的硬體資產。"
        },
        "en_options": {
            "A": "A. 在離職生效日的當下，同步且立即終止其所有企業身分識別帳號、VPN 憑證、電子郵件及雲端儲存空間存取權限。",
            "B": "B. 要求該主管在離職前將個人工作筆記型電腦繳回，並由資安團隊進行數位鑑識與硬碟完整抹除或封存。",
            "C": "C. 考量其為高階主管，允許其在離職後一個月內以「顧問」身分保留原有的系統管理員權限，以便隨時協助交接。",
            "D": "D. 確實執行離職面談與資產清點，收回所有實體門禁卡、辦公室鑰匙及公司配發的硬體資產。"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "高階主管離職或變更職務時，權限回收必須「即時且全面」（A），絕對不可因為「協助交接」而刻意保留高權限（C），這是非常致命的資安錯誤。收回實體資產與門禁卡（D）以及對設備進行鑑識封存（B）是標準的離職控管流程。",
        "en_explanation": "高階主管離職或變更職務時，權限回收必須「即時且全面」（A），絕對不可因為「協助交接」而刻意保留高權限（C），這是非常致命的資安錯誤。收回實體資產與門禁卡（D）以及對設備進行鑑識封存（B）是標準的離職控管流程。"
    },
    {
        "id": 16,
        "type": "MA",
        "q": "某資料中心為符合 ISO 27002 關於「設備汰除或重新使用之保全（Security of Equipment Disposal or Re-use）」的安全規範，針對內含機敏資料的伺服器與硬碟進行報廢處理。下列哪些作業流程是稽核員在查核時會認定為合規的項目？（多選）",
        "en_q": "某資料中心為符合 ISO 27002 關於「設備汰除或重新使用之保全（Security of Equipment Disposal or Re-use）」的安全規範，針對內含機敏資料的伺服器與硬碟進行報廢處理。下列哪些作業流程是稽核員在查核時會認定為合規的項目？（多選）",
        "options": {
            "A": "A. 所有報廢硬碟在離開資料中心機房前，必須在現場直接完成實體破壞（如使用專業消磁機進行強力消磁，或透過物理鑽孔破壞碟片結構）。",
            "B": "B. 若硬碟需交由外部合格的回收廠商處理，必須簽署嚴格的資安與保密合約（SLA/NDA），並要求回收商提供具法律效力的銷毀證明。",
            "C": "C. 將淘汰的伺服器硬碟進行作業系統層級的「快速格式化（Quick Format）」，確認開機無畫面後，即可丟棄或低價售出。",
            "D": "D. 建立完整的資產報廢與生命週期追蹤清冊，詳細記錄每一顆硬碟的序號、報廢時間、銷毀方式及經手人員簽名。"
        },
        "en_options": {
            "A": "A. 所有報廢硬碟在離開資料中心機房前，必須在現場直接完成實體破壞（如使用專業消磁機進行強力消磁，或透過物理鑽孔破壞碟片結構）。",
            "B": "B. 若硬碟需交由外部合格的回收廠商處理，必須簽署嚴格的資安與保密合約（SLA/NDA），並要求回收商提供具法律效力的銷毀證明。",
            "C": "C. 將淘汰的伺服器硬碟進行作業系統層級的「快速格式化（Quick Format）」，確認開機無畫面後，即可丟棄或低價售出。",
            "D": "D. 建立完整的資產報廢與生命週期追蹤清冊，詳細記錄每一顆硬碟的序號、報廢時間、銷毀方式及經手人員簽名。"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "設備汰除或重新使用之保全（控制項 7.14）要求極高的嚴謹度。快速格式化（C）極易被復原，直接外售會導致嚴重資料外洩，是重大違規。現場消磁或物理破壞（A）、簽署合約並取得銷毀證明（B）以及完整的監管追蹤清冊（D）均為標準且必要的合規項目。",
        "en_explanation": "設備汰除或重新使用之保全（控制項 7.14）要求極高的嚴謹度。快速格式化（C）極易被復原，直接外售會導致嚴重資料外洩，是重大違規。現場消磁或物理破壞（A）、簽署合約並取得銷毀證明（B）以及完整的監管追蹤清冊（D）均為標準且必要的合規項目。"
    },
    {
        "id": 17,
        "type": "MA",
        "q": "針對「資訊安全認知、教育及訓練 (Information Security Awareness, Education and Training)」規範，企業若要向稽核員證明其員工資安培訓有效降低了人為疏失風險，下列哪些做法與衡量指標是合理且被採納的？（多選）",
        "en_q": "針對「資訊安全認知、教育及訓練 (Information Security Awareness, Education and Training)」規範，企業若要向稽核員證明其員工資安培訓有效降低了人為疏失風險，下列哪些做法與衡量指標是合理且被採納的？（多選）",
        "options": {
            "A": "A. 規定所有新進員工在到職當天必須線上觀看資安政策影片，並通過隨堂測驗。",
            "B": "B. 定期舉辦不定期的「實兵社交工程演練（如模擬釣魚郵件、社群釣魚或電話詐騙測試）」，並以員工的「中招率下降趨勢」及「主動通報率上升幅度」作為量化 KPI。",
            "C": "C. 針對不同權限與風險的職位（如財務人員、研發人員、高階主管）設計分眾、客製化的資安進階課程。",
            "D": "D. 若全公司員工的年度資安培訓簽到表達 100% 簽名，就不須進行任何成效評估與測驗。"
        },
        "en_options": {
            "A": "A. 規定所有新進員工在到職當天必須線上觀看資安政策影片，並通過隨堂測驗。",
            "B": "B. 定期舉辦不定期的「實兵社交工程演練（如模擬釣魚郵件、社群釣魚或電話詐騙測試）」，並以員工的「中招率下降趨勢」及「主動通報率上升幅度」作為量化 KPI。",
            "C": "C. 針對不同權限與風險的職位（如財務人員、研發人員、高階主管）設計分眾、客製化的資安進階課程。",
            "D": "D. 若全公司員工的年度資安培訓簽到表達 100% 簽名，就不須進行任何成效評估與測驗。"
        },
        "ans": [
            "A",
            "B",
            "C"
        ],
        "explanation": "資安培訓不能只做形式上的簽到（D）是錯誤的。有效的培訓包含新進訓練（A）、針對高風險族群的分眾客製化課程（C），以及透過量化的演練指標（如釣魚點擊率與通報率）來證明成效（B），這才符合 ISO 27002 對於持續改善與有效性的稽核要求。",
        "en_explanation": "資安培訓不能只做形式上的簽到（D）是錯誤的。有效的培訓包含新進訓練（A）、針對高風險族群的分眾客製化課程（C），以及透過量化的演練指標（如釣魚點擊率與通報率）來證明成效（B），這才符合 ISO 27002 對於持續改善與有效性的稽核要求。"
    },
    {
        "id": 18,
        "type": "MA",
        "q": "某企業的總部辦公大樓位於地質敏感帶且鄰近河畔，面臨地震與水災的雙重潛在威脅。依據「防範實體及環境威脅（Protecting Against Physical and Environmental Threats）」之規定，企業在規劃與維護辦公室及機房實體環境時，下列哪些防護與應變措施是符合標準的？（多選）",
        "en_q": "某企業的總部辦公大樓位於地質敏感帶且鄰近河畔，面臨地震與水災的雙重潛在威脅。依據「防範實體及環境威脅（Protecting Against Physical and Environmental Threats）」之規定，企業在規劃與維護辦公室及機房實體環境時，下列哪些防護與應變措施是符合標準的？（多選）",
        "options": {
            "A": "A. 將核心伺服器機櫃與不斷電系統（UPS）主機安裝在地下一樓的地面上，以方便重型機具的搬運與進出。",
            "B": "B. 建立完善的自然災害應變計畫與業務持續計畫（BCP），並定期舉辦實體防汛與抗震演練。",
            "C": "C. 在機房及重要檔案室內設置防水閘門、自動抽水幫浦，並將重要 IT 設備架設在高架地板或防震基座上。",
            "D": "D. 針對大樓結構進行耐震補強評估，並將關鍵電力與備用發電機組設置在不受淹水影響的高樓層或安全區域。"
        },
        "en_options": {
            "A": "A. 將核心伺服器機櫃與不斷電系統（UPS）主機安裝在地下一樓的地面上，以方便重型機具的搬運與進出。",
            "B": "B. 建立完善的自然災害應變計畫與業務持續計畫（BCP），並定期舉辦實體防汛與抗震演練。",
            "C": "C. 在機房及重要檔案室內設置防水閘門、自動抽水幫浦，並將重要 IT 設備架設在高架地板或防震基座上。",
            "D": "D. 針對大樓結構進行耐震補強評估，並將關鍵電力與備用發電機組設置在不受淹水影響的高樓層或安全區域。"
        },
        "ans": [
            "B",
            "C",
            "D"
        ],
        "explanation": "地下一樓（A）是水災的高風險區，將核心伺服器直接放置於地下一樓地面是嚴重的環境安全設計失誤。正確的做法是將關鍵設施設置在高樓層或做好防水防震工程（C、D），並建立完善的 BCP 與演練（B）。",
        "en_explanation": "地下一樓（A）是水災的高風險區，將核心伺服器直接放置於地下一樓地面是嚴重的環境安全設計失誤。正確的做法是將關鍵設施設置在高樓層或做好防水防震工程（C、D），並建立完善的 BCP 與演練（B）。"
    },
    {
        "id": 19,
        "type": "MC",
        "q": "某企業在進行人員安全稽核時發現，內部員工違反資安政策的懲處紀錄僅保留在各部門主管的私人記事本中，未統一納入正式的人事懲戒程序。依據 ISO 27002 「人員控制措施」規範，此做法最主要的合規風險為何？",
        "en_q": "某企業在進行人員安全稽核時發現，內部員工違反資安政策的懲處紀錄僅保留在各部門主管的私人記事本中，未統一納入正式的人事懲戒程序。依據 ISO 27002 「人員控制措施」規範，此做法最主要的合規風險為何？",
        "options": {
            "A": "A. 導致人事部門無法正確計算員工的年終獎金發放金額。",
            "B": "B. 違反不可否認性（Non-repudiation）與制度一致性，可能因缺乏正式與客觀的紀律處分程序而引發勞資爭議或稽核缺失。",
            "C": "C. 使得員工的個人隱私資料遭到公開洩漏，違反個資保護法。",
            "D": "D. 影響公司內部通訊錄的更新效率，導致資料交叉比對有誤。"
        },
        "en_options": {
            "A": "A. 導致人事部門無法正確計算員工的年終獎金發放金額。",
            "B": "B. 違反不可否認性（Non-repudiation）與制度一致性，可能因缺乏正式與客觀的紀律處分程序而引發勞資爭議或稽核缺失。",
            "C": "C. 使得員工的個人隱私資料遭到公開洩漏，違反個資保護法。",
            "D": "D. 影響公司內部通訊錄的更新效率，導致資料交叉比對有誤。"
        },
        "ans": "B",
        "explanation": "ISO 27002 要求企業必須建立並溝通正式的獎懲過程（Disciplinary Process，控制項 6.4）。若懲處紀錄僅由主管私下保留，缺乏標準化與一致性，不僅無法達到嚇阻效果，更可能在發生解雇或降職處分時因程序不合法而面臨嚴重的勞資訴訟與稽核缺失（NCR）。",
        "en_explanation": "ISO 27002 要求企業必須建立並溝通正式的獎懲過程（Disciplinary Process，控制項 6.4）。若懲處紀錄僅由主管私下保留，缺乏標準化與一致性，不僅無法達到嚇阻效果，更可能在發生解雇或降職處分時因程序不合法而面臨嚴重的勞資訴訟與稽核缺失（NCR）。"
    },
    {
        "id": 20,
        "type": "MC",
        "q": "企業在規劃辦公室實體安全周界時，若大樓採用開放式設計且與商場共構，下列哪一項實體控制措施最能有效區隔辦公區域與外部公眾空間？",
        "en_q": "企業在規劃辦公室實體安全周界時，若大樓採用開放式設計且與商場共構，下列哪一項實體控制措施最能有效區隔辦公區域與外部公眾空間？",
        "options": {
            "A": "A. 在大樓外圍張貼「閒雜人等禁止進入」的告示牌。",
            "B": "B. 建立多層次實體周界，於辦公區入口設置實體轉閘門或雙門互鎖閘道，並嚴格執行訪客身分驗證與全程陪同。",
            "C": "C. 要求員工在公共走道上大聲喧嘩以嚇阻潛在入侵者。",
            "D": "D. 依靠商場的保全人員兼任辦公室內部的安全巡邏。"
        },
        "en_options": {
            "A": "A. 在大樓外圍張貼「閒雜人等禁止進入」的告示牌。",
            "B": "B. 建立多層次實體周界，於辦公區入口設置實體轉閘門或雙門互鎖閘道，並嚴格執行訪客身分驗證與全程陪同。",
            "C": "C. 要求員工在公共走道上大聲喧嘩以嚇阻潛在入侵者。",
            "D": "D. 依靠商場的保全人員兼任辦公室內部的安全巡邏。"
        },
        "ans": "B",
        "explanation": "當辦公環境與外部公眾空間共構時，單靠告示牌或外部保全（A、D）完全無法阻絕未授權存取。透過轉閘門、雙門互鎖及嚴格的訪客管理（B），才能確保未授權人員無法進入辦公或敏感區域。",
        "en_explanation": "當辦公環境與外部公眾空間共構時，單靠告示牌或外部保全（A、D）完全無法阻絕未授權存取。透過轉閘門、雙門互鎖及嚴格的訪客管理（B），才能確保未授權人員無法進入辦公或敏感區域。"
    },
    {
        "id": 21,
        "type": "MC",
        "q": "在執行「人員背景查核」時，跨國企業在不同國家招募員工必須兼顧當地勞動法與隱私權保護法（如歐盟 GDPR）。下列關於背景查核合規執行的敘述，何者最為正確？",
        "en_q": "在執行「人員背景查核」時，跨國企業在不同國家招募員工必須兼顧當地勞動法與隱私權保護法（如歐盟 GDPR）。下列關於背景查核合規執行的敘述，何者最為正確？",
        "options": {
            "A": "A. 為了落實全面資安防護，企業應在應徵者完全不知情的情況下，秘密向徵信社購買其所有醫療與政治傾向紀錄。",
            "B": "B. 背景查核項目應與職位風險成比例，且必須在取得應徵者明確的知情同意前提下合法進行。",
            "C": "C. 跨國企業是根據總部的最高標準背景查核表格，優先於當地國家的法律限制。",
            "D": "D. 背景查核僅能針對基層員工執行，對於核心高階主管因享有豁免權而完全免除。"
        },
        "en_options": {
            "A": "A. 為了落實全面資安防護，企業應在應徵者完全不知情的情況下，秘密向徵信社購買其所有醫療與政治傾向紀錄。",
            "B": "B. 背景查核項目應與職位風險成比例，且必須在取得應徵者明確的知情同意前提下合法進行。",
            "C": "C. 跨國企業是根據總部的最高標準背景查核表格，優先於當地國家的法律限制。",
            "D": "D. 背景查核僅能針對基層員工執行，對於核心高階主管因享有豁免權而完全免除。"
        },
        "ans": "B",
        "explanation": "ISO 27002 及相關隱私法規強調，背景查核必須遵循比例原則與合法性。企業必須事先取得應徵者的知情同意（B），且查核範圍需與職務風險相符。秘密調查（A）或無視當地法律（C）均屬嚴重違法；高階主管更因權限高而需要更嚴格的查核而非豁免（D）。",
        "en_explanation": "ISO 27002 及相關隱私法規強調，背景查核必須遵循比例原則與合法性。企業必須事先取得應徵者的知情同意（B），且查核範圍需與職務風險相符。秘密調查（A）或無視當地法律（C）均屬嚴重違法；高階主管更因權限高而需要更嚴格的查核而非豁免（D）。"
    },
    {
        "id": 22,
        "type": "MC",
        "q": "某企業的伺服器機房內部部署了氣體自動滅火系統。在進行年度實體安全與消防演練時，稽核員發現該滅火系統在觸發後會「瞬間釋放氣體並在 0.5 秒內完全抽乾室內氧氣」，且未設置任何預警與緩衝機制。從安全與合規角度來看，這項設計最需要立即改善的問題為何？",
        "en_q": "某企業的伺服器機房內部部署了氣體自動滅火系統。在進行年度實體安全與消防演練時，稽核員發現該滅火系統在觸發後會「瞬間釋放氣體並在 0.5 秒內完全抽乾室內氧氣」，且未設置任何預警與緩衝機制。從安全與合規角度來看，這項設計最需要立即改善的問題為何？",
        "options": {
            "A": "A. 氣體釋放速度太快會導致滅火劑成本過高。",
            "B": "B. 缺乏足夠的預警時間、聲光警報、緊急停止按鈕及人員撤離機制，可能對在機房內作業的人員造成窒息或致命危害。",
            "C": "C. 氣體滅火系統會破壞機房內部的網路線接頭及設備，造成巨大損失。",
            "D": "D. 該設計會使機房溫度瞬間飆升，對設備造成危害。"
        },
        "en_options": {
            "A": "A. 氣體釋放速度太快會導致滅火劑成本過高。",
            "B": "B. 缺乏足夠的預警時間、聲光警報、緊急停止按鈕及人員撤離機制，可能對在機房內作業的人員造成窒息或致命危害。",
            "C": "C. 氣體滅火系統會破壞機房內部的網路線接頭及設備，造成巨大損失。",
            "D": "D. 該設計會使機房溫度瞬間飆升，對設備造成危害。"
        },
        "ans": "B",
        "explanation": "氣體滅火系統雖然能保護 IT 設備不受水損，但瞬間釋放高濃度氣體會導致缺氧窒息（控制項 7.5、7.8）。標準的實體安全規範要求系統必須具備預警時間、聲光警報、緊急中止鈕以及洩壓與人員撤離機制，以確保人身安全。",
        "en_explanation": "氣體滅火系統雖然能保護 IT 設備不受水損，但瞬間釋放高濃度氣體會導致缺氧窒息（控制項 7.5、7.8）。標準的實體安全規範要求系統必須具備預警時間、聲光警報、緊急中止鈕以及洩壓與人員撤離機制，以確保人身安全。"
    },
    {
        "id": 23,
        "type": "MC",
        "q": "關於企業內部員工「智慧財產權與工作成果歸屬」的管理規範，下列敘述何者最符合 ISO 27002 人員控制的核心要求？",
        "en_q": "關於企業內部員工「智慧財產權與工作成果歸屬」的管理規範，下列敘述何者最符合 ISO 27002 人員控制的核心要求？",
        "options": {
            "A": "A. 員工在上班時間利用公司資源研發出的專利或程式碼，其智慧財產權自然屬於員工個人所有，公司無權干涉。",
            "B": "B. 聘用合約中應明確約定，員工在職期間所產出之所有與公司業務相關的工作成果、智慧財產權與專利，皆歸屬企業所有，且離職後仍須受保密義務拘束。",
            "C": "C. 只要員工離職，其先前參與開發的專利技術所有權即自動轉移給員工。",
            "D": "D. 智慧財產權的歸屬只需靠主管口頭交代即可，無須在合約中白紙黑字載明。"
        },
        "en_options": {
            "A": "A. 員工在上班時間利用公司資源研發出的專利或程式碼，其智慧財產權自然屬於員工個人所有，公司無權干涉。",
            "B": "B. 聘用合約中應明確約定，員工在職期間所產出之所有與公司業務相關的工作成果、智慧財產權與專利，皆歸屬企業所有，且離職後仍須受保密義務拘束。",
            "C": "C. 只要員工離職，其先前參與開發的專利技術所有權即自動轉移給員工。",
            "D": "D. 智慧財產權的歸屬只需靠主管口頭交代即可，無須在合約中白紙黑字載明。"
        },
        "ans": "B",
        "explanation": "ISO 27002 關於聘用條款及條件（控制項 6.2）要求明確規範智慧財產權的歸屬與保密義務。合約必須白紙黑字約定所有職務發明與工作成果歸屬企業，以保障企業資產。",
        "en_explanation": "ISO 27002 關於聘用條款及條件（控制項 6.2）要求明確規範智慧財產權的歸屬與保密義務。合約必須白紙黑字約定所有職務發明與工作成果歸屬企業，以保障企業資產。"
    },
    {
        "id": 24,
        "type": "MA",
        "q": "某資料中心的備用不斷電系統（UPS）與柴油發電機組放置於戶外專用機房。稽核員在進行實體環境巡檢時，發現該發電機組的排氣管直接對著員工吸菸區。此發現可能違反下列哪一項 ISO 27002 控制項的精神？（多選）",
        "en_q": "某資料中心的備用不斷電系統（UPS）與柴油發電機組放置於戶外專用機房。稽核員在進行實體環境巡檢時，發現該發電機組的排氣管直接對著員工吸菸區。此發現可能違反下列哪一項 ISO 27002 控制項的精神？（多選）",
        "options": {
            "A": "A. 設備維護與資產汰除（Equipment maintenance and disposal）",
            "B": "B. 設備安置及保護（Equipment Siting and Protection）",
            "C": "C. 佈纜安全 (Cabling Security)",
            "D": "D. 防範實體及環境威脅 (Protecting Against Physical and Environmental Threats)"
        },
        "en_options": {
            "A": "A. 設備維護與資產汰除（Equipment maintenance and disposal）",
            "B": "B. 設備安置及保護（Equipment Siting and Protection）",
            "C": "C. 佈纜安全 (Cabling Security)",
            "D": "D. 防範實體及環境威脅 (Protecting Against Physical and Environmental Threats)"
        },
        "ans": [
            "B",
            "D"
        ],
        "explanation": "本情境屬於「設備擺放位置不當」引發的「火災風險」，同時違反兩項實體安全原則:(B)發電機排氣管（具高溫及油氣）直接朝向吸菸區，未避開危險源，屬於嚴重的設備安置與位置設計瑕疵；(D)吸菸區的明火若接觸到發電機廢氣，極易引發火災或氣爆，構成直接的實體與環境威脅。(A) 探討的是維修保養與報廢，與設備位置無關；(C) 探討的是網路或電源纜線保護，發電機排氣管非線纜，故不適用。",
        "en_explanation": "本情境屬於「設備擺放位置不當」引發的「火災風險」，同時違反兩項實體安全原則:(B)發電機排氣管（具高溫及油氣）直接朝向吸菸區，未避開危險源，屬於嚴重的設備安置與位置設計瑕疵；(D)吸菸區的明火若接觸到發電機廢氣，極易引發火災或氣爆，構成直接的實體與環境威脅。(A) 探討的是維修保養與報廢，與設備位置無關；(C) 探討的是網路或電源纜線保護，發電機排氣管非線纜，故不適用。"
    },
    {
        "id": 25,
        "type": "MA",
        "q": "依據 ISO 27002 關於「遠距工作（Remote working）」規範，當企業允許員工在家工作時，下列哪些管理與技術控制措施是必須落實的？（多選）",
        "en_q": "依據 ISO 27002 關於「遠距工作（Remote working）」規範，當企業允許員工在家工作時，下列哪些管理與技術控制措施是必須落實的？（多選）",
        "options": {
            "A": "A. 企業必須提供安全且加密的遠端連線管道（如 VPN 搭配 MFA），並確保遠端終端設備受到企業端點防護軟體（EDR/MDM）的統一管控。",
            "B": "B. 若員工有要求，便可使用自己的筆記型電腦進行工作。",
            "C": "C. 要求員工在遠距辦公時，必須確保工作場所的實體隱私，防止同住家人或訪客窺視螢幕上的機密資料。",
            "D": "D. 允許員工將公司機密紙本文件帶回家中方便工作。"
        },
        "en_options": {
            "A": "A. 企業必須提供安全且加密的遠端連線管道（如 VPN 搭配 MFA），並確保遠端終端設備受到企業端點防護軟體（EDR/MDM）的統一管控。",
            "B": "B. 若員工有要求，便可使用自己的筆記型電腦進行工作。",
            "C": "C. 要求員工在遠距辦公時，必須確保工作場所的實體隱私，防止同住家人或訪客窺視螢幕上的機密資料。",
            "D": "D. 允許員工將公司機密紙本文件帶回家中方便工作。"
        },
        "ans": [
            "A",
            "C"
        ],
        "explanation": "遠距工作的資安重點在於端點安全與實體隱私（控制項 6.7）。企業必須提供加密連線與端點管控（A），且員工必須防範家庭環境中的視覺外洩（C）。使用非公司電腦（B）與隨意帶回機密紙本（D）均會造成嚴重的資安破口。",
        "en_explanation": "遠距工作的資安重點在於端點安全與實體隱私（控制項 6.7）。企業必須提供加密連線與端點管控（A），且員工必須防範家庭環境中的視覺外洩（C）。使用非公司電腦（B）與隨意帶回機密紙本（D）均會造成嚴重的資安破口。"
    },
    {
        "id": 26,
        "type": "MA",
        "q": "某金融機構依據 ISO 27002「設備維護（Equipment Maintenance）」指引，重新審視其資產管理與維運程序。當核心伺服器或存有營業秘密之硬體設備，必須移出實體機房進行廠外維修時，下列哪些安全控制程序最符合標準之要求？（多選）",
        "en_q": "某金融機構依據 ISO 27002「設備維護（Equipment Maintenance）」指引，重新審視其資產管理與維運程序。當核心伺服器或存有營業秘密之硬體設備，必須移出實體機房進行廠外維修時，下列哪些安全控制程序最符合標準之要求？（多選）",
        "options": {
            "A": "A. 設備送交廠外前，應確認機敏資料及具版權之軟體皆已被移除、安全覆寫，或已實施組織認可之高強度加密保護。",
            "B": "B. 若委外維修與物流廠商已具備 ISO 27001 驗證，基於信任原則，組織可直接交由該廠商收送，無須於出廠前執行內部之資料抹除作業。",
            "C": "C. 維修返廠之設備在重新接入內部生產網路前，必須進行安全性檢測（如硬體完整性檢視與惡意程式掃描），以確認未遭植入未授權組件。",
            "D": "D. 若設備仍在原廠保固期內且由原廠直接派車收送，為簡化流程，組織可僅憑維修合約（SLA）進行追蹤，免除留存該次設備移轉之實體放行紀錄。"
        },
        "en_options": {
            "A": "A. 設備送交廠外前，應確認機敏資料及具版權之軟體皆已被移除、安全覆寫，或已實施組織認可之高強度加密保護。",
            "B": "B. 若委外維修與物流廠商已具備 ISO 27001 驗證，基於信任原則，組織可直接交由該廠商收送，無須於出廠前執行內部之資料抹除作業。",
            "C": "C. 維修返廠之設備在重新接入內部生產網路前，必須進行安全性檢測（如硬體完整性檢視與惡意程式掃描），以確認未遭植入未授權組件。",
            "D": "D. 若設備仍在原廠保固期內且由原廠直接派車收送，為簡化流程，組織可僅憑維修合約（SLA）進行追蹤，免除留存該次設備移轉之實體放行紀錄。"
        },
        "ans": [
            "A",
            "C"
        ],
        "explanation": "設備廠外維修的重點在於資料保護與供應鏈安全。設備移出前，必須確保機敏資料與軟體已移除或完整加密（A），且返廠重新連網前須進行嚴格的安全檢測與驗證（C）。過度依賴廠商認證而未做資料清除（B），或因原廠保固而省略設備移轉的放行紀錄（D），皆會造成嚴重的資料外洩與資產管理破口。",
        "en_explanation": "設備廠外維修的重點在於資料保護與供應鏈安全。設備移出前，必須確保機敏資料與軟體已移除或完整加密（A），且返廠重新連網前須進行嚴格的安全檢測與驗證（C）。過度依賴廠商認證而未做資料清除（B），或因原廠保固而省略設備移轉的放行紀錄（D），皆會造成嚴重的資料外洩與資產管理破口。"
    },
    {
        "id": 27,
        "type": "MC",
        "q": "某跨國企業為展現其技術實力，在其新建的資料中心大樓外牆掛上極為醒目的「全球核心資料中心」霓虹招牌，並在官方網站詳細公開了該大樓的樓層平面配置圖。此舉最嚴重違反了下列哪一項實體控制措施的精神？",
        "en_q": "某跨國企業為展現其技術實力，在其新建的資料中心大樓外牆掛上極為醒目的「全球核心資料中心」霓虹招牌，並在官方網站詳細公開了該大樓的樓層平面配置圖。此舉最嚴重違反了下列哪一項實體控制措施的精神？",
        "options": {
            "A": "A. 實體進入（Physical entry）",
            "B": "B. 保全辦公室、房間及設施（Securing offices, rooms and facilities）",
            "C": "C. 實體安全周界（Physical security perimeters）",
            "D": "D. 設備安置及保護（Equipment siting and protection）"
        },
        "en_options": {
            "A": "A. 實體進入（Physical entry）",
            "B": "B. 保全辦公室、房間及設施（Securing offices, rooms and facilities）",
            "C": "C. 實體安全周界（Physical security perimeters）",
            "D": "D. 設備安置及保護（Equipment siting and protection）"
        },
        "ans": "B",
        "explanation": "保全辦公室、房間及設施的控制重點之一，在於關鍵設施的外觀應保持低調且不引人注意，以避免成為攻擊目標。該企業設置醒目招牌並公開內部平面圖，完全違背了避免明顯標示資訊處理活動地點的防護原則，大幅增加了遭受實體攻擊或惡意破壞的風險。",
        "en_explanation": "保全辦公室、房間及設施的控制重點之一，在於關鍵設施的外觀應保持低調且不引人注意，以避免成為攻擊目標。該企業設置醒目招牌並公開內部平面圖，完全違背了避免明顯標示資訊處理活動地點的防護原則，大幅增加了遭受實體攻擊或惡意破壞的風險。"
    },
    {
        "id": 28,
        "type": "MA",
        "q": "依據 ISO 27002「實體安全監視（Physical security monitoring）」之規範，企業在敏感區域部署閉路電視（CCTV）與入侵警報系統時，下列哪些管理與技術配置符合合規要求？（多選）",
        "en_q": "依據 ISO 27002「實體安全監視（Physical security monitoring）」之規範，企業在敏感區域部署閉路電視（CCTV）與入侵警報系統時，下列哪些管理與技術配置符合合規要求？（多選）",
        "options": {
            "A": "A. 監視系統本身的影像紀錄與管理介面，必須受到嚴格的存取控制與防篡改保護。",
            "B": "B. 無人看管的敏感區域應保持 24 小時全天候警戒，並配置入侵警報系統。",
            "C": "C. 為節省儲存空間，監視器影像僅需保留 24 小時即可自動覆寫，無須考量法規要求。",
            "D": "D. 在部署監視設備時，必須考量當地法律規範與個人隱私（PII）保護要求。"
        },
        "en_options": {
            "A": "A. 監視系統本身的影像紀錄與管理介面，必須受到嚴格的存取控制與防篡改保護。",
            "B": "B. 無人看管的敏感區域應保持 24 小時全天候警戒，並配置入侵警報系統。",
            "C": "C. 為節省儲存空間，監視器影像僅需保留 24 小時即可自動覆寫，無須考量法規要求。",
            "D": "D. 在部署監視設備時，必須考量當地法律規範與個人隱私（PII）保護要求。"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "實體安全監視要求在進出口與敏感區域設置 CCTV，且無人區域需 24/7(全天候無間斷) 警戒並配置定期測試的入侵警報。同時，監視設備本身的存取權限與影像必須受保護防遭竄改，且部署時必須遵循當地隱私法規並明確影像留存期限（通常依業務或法規需求保留數十天至數月，絕非隨意覆寫）。",
        "en_explanation": "實體安全監視要求在進出口與敏感區域設置 CCTV，且無人區域需 24/7(全天候無間斷) 警戒並配置定期測試的入侵警報。同時，監視設備本身的存取權限與影像必須受保護防遭竄改，且部署時必須遵循當地隱私法規並明確影像留存期限（通常依業務或法規需求保留數十天至數月，絕非隨意覆寫）。"
    },
    {
        "id": 29,
        "type": "MC",
        "q": "某電信公司的機房維護人員在引導外部硬體設備供應商進入核心機房進行設備檢修時，供應商工程師隨手拿起具有攝影功能的手機，對著機櫃自拍並準備上傳社群媒體。此行為直接違反了下列哪一項控制項的作業規範？",
        "en_q": "某電信公司的機房維護人員在引導外部硬體設備供應商進入核心機房進行設備檢修時，供應商工程師隨手拿起具有攝影功能的手機，對著機櫃自拍並準備上傳社群媒體。此行為直接違反了下列哪一項控制項的作業規範？",
        "options": {
            "A": "A. 實體安全監視（Physical security monitoring）",
            "B": "B. 佈纜安全（Cabling security）",
            "C": "C. 場所外資產之安全（Security of assets off-premises）",
            "D": "D. 於安全區域內工作（Working in secure areas）"
        },
        "en_options": {
            "A": "A. 實體安全監視（Physical security monitoring）",
            "B": "B. 佈纜安全（Cabling security）",
            "C": "C. 場所外資產之安全（Security of assets off-premises）",
            "D": "D. 於安全區域內工作（Working in secure areas）"
        },
        "ans": "D",
        "explanation": "於安全區域內工作（控制項 7.6）明確規範，為了保護區域內的資訊與資產，應限制未經授權的拍照、錄影或錄音行為，特別是攜帶具攝影功能的行動裝置進入時必須嚴格納管。供應商在核心機房內隨意拍照，極易造成機敏設備配置或網路架構外洩。",
        "en_explanation": "於安全區域內工作（控制項 7.6）明確規範，為了保護區域內的資訊與資產，應限制未經授權的拍照、錄影或錄音行為，特別是攜帶具攝影功能的行動裝置進入時必須嚴格納管。供應商在核心機房內隨意拍照，極易造成機敏設備配置或網路架構外洩。"
    },
    {
        "id": 30,
        "type": "MA",
        "q": "針對「場所外資產之安全（Security of assets off-premises）」，當企業的高階主管頻繁攜帶存有營業秘密的筆記型電腦與平板出差時，下列哪些防護措施是必要且合規的？（多選）",
        "en_q": "針對「場所外資產之安全（Security of assets off-premises）」，當企業的高階主管頻繁攜帶存有營業秘密的筆記型電腦與平板出差時，下列哪些防護措施是必要且合規的？（多選）",
        "options": {
            "A": "A. 設備應具備遠端清除（Remote wipe）功能，以便在遺失或遭竊時抹除資料。",
            "B": "B. 在高鐵、飛機或咖啡廳等公共交通工具與場所，應使用防窺片以落實視覺防窺措施。",
            "C": "C. 資產帶出辦公室前，必須經過管理階層的授權並確實留存設備借出紀錄。",
            "D": "D. 為減輕出差負擔，允許主管將筆記型電腦隨意留在飯店大廳的無人看管沙發上。"
        },
        "en_options": {
            "A": "A. 設備應具備遠端清除（Remote wipe）功能，以便在遺失或遭竊時抹除資料。",
            "B": "B. 在高鐵、飛機或咖啡廳等公共交通工具與場所，應使用防窺片以落實視覺防窺措施。",
            "C": "C. 資產帶出辦公室前，必須經過管理階層的授權並確實留存設備借出紀錄。",
            "D": "D. 為減輕出差負擔，允許主管將筆記型電腦隨意留在飯店大廳的無人看管沙發上。"
        },
        "ans": [
            "A",
            "B",
            "C"
        ],
        "explanation": "場所外資產安全要求對帶出場外的設備採取嚴密的技術與管理防護。這包含搬移前的授權與紀錄、公共場所的防窺措施，以及遺失時的遠端清除機制。將設備放置於公共場所無人看管（D）是標準中明文禁止的嚴重疏失。",
        "en_explanation": "場所外資產安全要求對帶出場外的設備採取嚴密的技術與管理防護。這包含搬移前的授權與紀錄、公共場所的防窺措施，以及遺失時的遠端清除機制。將設備放置於公共場所無人看管（D）是標準中明文禁止的嚴重疏失。"
    },
    {
        "id": 31,
        "type": "MC",
        "q": "企業在進行系統升級時，需透過可移除式外接硬碟將巨量且高度機密的客戶資料從 A 廠區實體運送至 B 廠區。針對「儲存媒體（Storage media）」的管控，下列何種做法最符合資安標準？",
        "en_q": "企業在進行系統升級時，需透過可移除式外接硬碟將巨量且高度機密的客戶資料從 A 廠區實體運送至 B 廠區。針對「儲存媒體（Storage media）」的管控，下列何種做法最符合資安標準？",
        "options": {
            "A": "A. 將檔案壓縮並設定 6 碼數字密碼，直接交給內部公文傳遞員運送。",
            "B": "B. 對外接硬碟執行硬體級的全碟加密，採用防破壞的物理安全包裝，並記錄運送與點交軌跡。",
            "C": "C. 只要確保外接硬碟在運送過程中沒有離開運送人員的視線，就不需要進行資料加密。",
            "D": "D. 使用完畢後，針對該外接硬碟執行檔案刪除動作，即可配發給其他部門使用。"
        },
        "en_options": {
            "A": "A. 將檔案壓縮並設定 6 碼數字密碼，直接交給內部公文傳遞員運送。",
            "B": "B. 對外接硬碟執行硬體級的全碟加密，採用防破壞的物理安全包裝，並記錄運送與點交軌跡。",
            "C": "C. 只要確保外接硬碟在運送過程中沒有離開運送人員的視線，就不需要進行資料加密。",
            "D": "D. 使用完畢後，針對該外接硬碟執行檔案刪除動作，即可配發給其他部門使用。"
        },
        "ans": "B",
        "explanation": "儲存媒體的管理涵蓋整個生命週期。在運送與儲存期間，含有機敏資訊的媒體必須進行加密保護，並搭配物理安全包裝與運送紀錄以防止中途攔截。此外，使用完畢的媒體汰除或重新使用前，必須依資訊敏感度執行不可復原的抹除或物理銷毀，不可僅做簡單刪除。",
        "en_explanation": "儲存媒體的管理涵蓋整個生命週期。在運送與儲存期間，含有機敏資訊的媒體必須進行加密保護，並搭配物理安全包裝與運送紀錄以防止中途攔截。此外，使用完畢的媒體汰除或重新使用前，必須依資訊敏感度執行不可復原的抹除或物理銷毀，不可僅做簡單刪除。"
    },
    {
        "id": 32,
        "type": "MA",
        "q": "關於「支援之公用服務事業（Supporting utilities）」，資料中心為防止電力中斷導致營運停擺，導入了多項設施與管理流程。下列哪些措施符合 ISO 27002 的稽核要求？（多選）",
        "en_q": "關於「支援之公用服務事業（Supporting utilities）」，資料中心為防止電力中斷導致營運停擺，導入了多項設施與管理流程。下列哪些措施符合 ISO 27002 的稽核要求？（多選）",
        "options": {
            "A": "A. 依據製造商規格，定期對不斷電系統（UPS）與柴油發電機進行維護與負載測試。",
            "B": "B. 設置故障警報系統，並配置多重饋線（不同變電所來源的電力供應）。",
            "C": "C. 確保在主電力中斷時，緊急照明、通訊設備與緊急開關功能仍能正常運作。",
            "D": "D. 為節省成本，發電機的燃油儲備量僅需維持短時間可運作即可，無需與營運持續計畫（BCP）掛鉤。"
        },
        "en_options": {
            "A": "A. 依據製造商規格，定期對不斷電系統（UPS）與柴油發電機進行維護與負載測試。",
            "B": "B. 設置故障警報系統，並配置多重饋線（不同變電所來源的電力供應）。",
            "C": "C. 確保在主電力中斷時，緊急照明、通訊設備與緊急開關功能仍能正常運作。",
            "D": "D. 為節省成本，發電機的燃油儲備量僅需維持短時間可運作即可，無需與營運持續計畫（BCP）掛鉤。"
        },
        "ans": [
            "A",
            "B",
            "C"
        ],
        "explanation": "支援之公用服務事業要求防止公用設施失效導致運作中斷。企業必須依原廠規格定期測試備援電力（A）、設置故障警報並考慮多重線路（B），同時確保中斷期間的緊急照明與通訊安全（C）。備用燃油的儲存量必須足以支撐營運持續計畫所需的時間，30 分鐘通常遠低於災難復原標準。",
        "en_explanation": "支援之公用服務事業要求防止公用設施失效導致運作中斷。企業必須依原廠規格定期測試備援電力（A）、設置故障警報並考慮多重線路（B），同時確保中斷期間的緊急照明與通訊安全（C）。備用燃油的儲存量必須足以支撐營運持續計畫所需的時間，30 分鐘通常遠低於災難復原標準。"
    },
    {
        "id": 33,
        "type": "MC",
        "q": "某企業的資深研發工程師經內部調動，轉任至業務部門擔任產品經理。依據「聘用終止或變更後之責任（Responsibilities after termination or change of employment）」，資訊部門應優先執行下列哪一項安全控制作業？",
        "en_q": "某企業的資深研發工程師經內部調動，轉任至業務部門擔任產品經理。依據「聘用終止或變更後之責任（Responsibilities after termination or change of employment）」，資訊部門應優先執行下列哪一項安全控制作業？",
        "options": {
            "A": "A. 保留其原本在研發部門的原始碼存取權限，以防業務部門需要查詢相關技術規格。",
            "B": "B. 要求該員工即刻離職，並重新以新進員工身分辦理業務部門的報到手續。",
            "C": "C. 依據新職務的「知其所需（Need-to-know）」原則，立即撤銷其研發系統權限、重新界定資安責任，並確保其理解對過往研發機密的持續保密義務。",
            "D": "D. 僅需在公司內部通訊錄更新其職稱與分機號碼，系統權限待年度審查時再行調整。"
        },
        "en_options": {
            "A": "A. 保留其原本在研發部門的原始碼存取權限，以防業務部門需要查詢相關技術規格。",
            "B": "B. 要求該員工即刻離職，並重新以新進員工身分辦理業務部門的報到手續。",
            "C": "C. 依據新職務的「知其所需（Need-to-know）」原則，立即撤銷其研發系統權限、重新界定資安責任，並確保其理解對過往研發機密的持續保密義務。",
            "D": "D. 僅需在公司內部通訊錄更新其職稱與分機號碼，系統權限待年度審查時再行調整。"
        },
        "ans": "C",
        "explanation": "職務變更並不只是更改職稱，必須同步進行權限的重新調整與資安責任的重新界定。實務上常被忽略的是員工調職後仍保留舊權限（權限潛變），這會產生極大風險；同時，必須明確傳達其對原單位機密資訊仍負有保密（NDA）義務。",
        "en_explanation": "職務變更並不只是更改職稱，必須同步進行權限的重新調整與資安責任的重新界定。實務上常被忽略的是員工調職後仍保留舊權限（權限潛變），這會產生極大風險；同時，必須明確傳達其對原單位機密資訊仍負有保密（NDA）義務。"
    },
    {
        "id": 34,
        "type": "MA",
        "q": "企業在修訂與外部合作夥伴及內部員工簽署的「機密性或保密協議（Confidentiality or non-disclosure agreements, NDA）」時，為確保其具備管理有效性與合規性，協議內容應明確涵蓋下列哪些要素？（多選）",
        "en_q": "企業在修訂與外部合作夥伴及內部員工簽署的「機密性或保密協議（Confidentiality or non-disclosure agreements, NDA）」時，為確保其具備管理有效性與合規性，協議內容應明確涵蓋下列哪些要素？（多選）",
        "options": {
            "A": "A. 受保護機密資訊的具體定義與涵蓋範圍。",
            "B": "B. 簽署者的保密責任與允許使用機密資訊的特定目的。",
            "C": "C. 保密義務的持續期間（依機密等級不同，可能為離職後數年或永久有效）。",
            "D": "D. 違反保密協議時將面臨的法律追訴與處置措施。"
        },
        "en_options": {
            "A": "A. 受保護機密資訊的具體定義與涵蓋範圍。",
            "B": "B. 簽署者的保密責任與允許使用機密資訊的特定目的。",
            "C": "C. 保密義務的持續期間（依機密等級不同，可能為離職後數年或永久有效）。",
            "D": "D. 違反保密協議時將面臨的法律追訴與處置措施。"
        },
        "ans": [
            "A",
            "B",
            "C",
            "D"
        ],
        "explanation": "有效的保密協議（NDA）是維護資訊機密性的關鍵法律防線。一份符合標準的 NDA 必須清晰定義保護範圍、簽署者的責任、保密期限，以及違約時的具體處罰與後果，缺一不可，否則在發生洩密事件時將難以舉證與追責。",
        "en_explanation": "有效的保密協議（NDA）是維護資訊機密性的關鍵法律防線。一份符合標準的 NDA 必須清晰定義保護範圍、簽署者的責任、保密期限，以及違約時的具體處罰與後果，缺一不可，否則在發生洩密事件時將難以舉證與追責。"
    },
    {
        "id": 35,
        "type": "MC",
        "q": "某金控公司經常在特定的高階會議室討論重大併購案（M&A）。為了防範未經授權的存取、破壞或干擾，該會議室不僅採用了隔音建材，還在牆面內部加裝了防護網與特殊塗層。這最主要是為了防範下列哪一種實體環境風險？",
        "en_q": "某金控公司經常在特定的高階會議室討論重大併購案（M&A）。為了防範未經授權的存取、破壞或干擾，該會議室不僅採用了隔音建材，還在牆面內部加裝了防護網與特殊塗層。這最主要是為了防範下列哪一種實體環境風險？",
        "options": {
            "A": "A. 防範透過電磁輻射溢波（Electromagnetic emanation）或竊聽造成的機密資訊外洩。",
            "B": "B. 防範自然災害如地震或水災對會議室設備的損壞。",
            "C": "C. 防範外部不明無人機直接撞擊大樓玻璃。",
            "D": "D. 防範內部網路纜線因高溫而引發火災。"
        },
        "en_options": {
            "A": "A. 防範透過電磁輻射溢波（Electromagnetic emanation）或竊聽造成的機密資訊外洩。",
            "B": "B. 防範自然災害如地震或水災對會議室設備的損壞。",
            "C": "C. 防範外部不明無人機直接撞擊大樓玻璃。",
            "D": "D. 防範內部網路纜線因高溫而引發火災。"
        },
        "ans": "A",
        "explanation": "針對處理高度敏感資訊的辦公室或房間（控制項 7.3），除了門禁管制外，還必須防範窺視或竊聽造成的資訊外洩。加裝特殊塗層或防護網（電磁屏蔽與隔音）是為了防止高階會議內容遭到外部透過無線電波截取或實體竊聽，確保機密性。",
        "en_explanation": "針對處理高度敏感資訊的辦公室或房間（控制項 7.3），除了門禁管制外，還必須防範窺視或竊聽造成的資訊外洩。加裝特殊塗層或防護網（電磁屏蔽與隔音）是為了防止高階會議內容遭到外部透過無線電波截取或實體竊聽，確保機密性。"
    },
    {
        "id": 36,
        "type": "MA",
        "q": "依據「獎懲過程（Disciplinary process）」控制項，當員工因將密碼貼在螢幕上而遭查獲時，人資與資安主管在決定懲處層級與行動時，應綜合評估下列哪些因素以確保處置的一致性與比例原則？（多選）",
        "en_q": "依據「獎懲過程（Disciplinary process）」控制項，當員工因將密碼貼在螢幕上而遭查獲時，人資與資安主管在決定懲處層級與行動時，應綜合評估下列哪些因素以確保處置的一致性與比例原則？（多選）",
        "options": {
            "A": "A. 該違規行為的性質，以及是否對組織造成實質的影響或損害。",
            "B": "B. 該員工的年資長短與近期的業績表現。",
            "C": "C. 該員工是否為初犯，或者是屢勸不聽的累犯。",
            "D": "D. 該員工是否已接受過相關的資安認知訓練並清楚知悉規定。"
        },
        "en_options": {
            "A": "A. 該違規行為的性質，以及是否對組織造成實質的影響或損害。",
            "B": "B. 該員工的年資長短與近期的業績表現。",
            "C": "C. 該員工是否為初犯，或者是屢勸不聽的累犯。",
            "D": "D. 該員工是否已接受過相關的資安認知訓練並清楚知悉規定。"
        },
        "ans": [
            "A",
            "C",
            "D"
        ],
        "explanation": "獎懲過程必須公平、一致且符合比例原則。評估裁罰輕重的標準應包含違規性質與影響（A）、初犯或累犯紀錄（C），以及員工是否已受過充分的訓練（D）。員工的業績表現（B）絕不能作為豁免資安懲處的護身符，否則會破壞制度的公平性與管理有效性。",
        "en_explanation": "獎懲過程必須公平、一致且符合比例原則。評估裁罰輕重的標準應包含違規性質與影響（A）、初犯或累犯紀錄（C），以及員工是否已受過充分的訓練（D）。員工的業績表現（B）絕不能作為豁免資安懲處的護身符，否則會破壞制度的公平性與管理有效性。"
    },
    {
        "id": 37,
        "type": "MC",
        "q": "某電商平台為了應付雙十一的龐大客服量，臨時透過派遣公司聘用了 50 名短期客服人員，並配發了可存取客戶訂單系統的帳號。關於「篩選（Screening）」作業，下列處置何者正確？",
        "en_q": "某電商平台為了應付雙十一的龐大客服量，臨時透過派遣公司聘用了 50 名短期客服人員，並配發了可存取客戶訂單系統的帳號。關於「篩選（Screening）」作業，下列處置何者正確？",
        "options": {
            "A": "A. 短期派遣人員非正式編制，因此無須進行任何背景查證。",
            "B": "B. 應要求派遣公司依據電商平台的資安要求，在加入組織前對這些臨時人員進行適當的背景查證，並保護其隱私。",
            "C": "C. 為了節省時間，只需確認其身分證件影本，等上線工作一個月後再補做背景查核。",
            "D": "D. 應直接公開派遣人員的所有犯罪與信用紀錄給全體員工審查。"
        },
        "en_options": {
            "A": "A. 短期派遣人員非正式編制，因此無須進行任何背景查證。",
            "B": "B. 應要求派遣公司依據電商平台的資安要求，在加入組織前對這些臨時人員進行適當的背景查證，並保護其隱私。",
            "C": "C. 為了節省時間，只需確認其身分證件影本，等上線工作一個月後再補做背景查核。",
            "D": "D. 應直接公開派遣人員的所有犯罪與信用紀錄給全體員工審查。"
        },
        "ans": "B",
        "explanation": "人員篩選不應僅限於全職人員，對於兼職與臨時人員（如派遣工）同樣適用。背景查證必須在加入組織前進行，且其深度應與職位角色相符，同時查證過程必須嚴格遵循隱私與 PII 保護法規（排除 D），不可因短期聘用而免除必要的信任確認。",
        "en_explanation": "人員篩選不應僅限於全職人員，對於兼職與臨時人員（如派遣工）同樣適用。背景查證必須在加入組織前進行，且其深度應與職位角色相符，同時查證過程必須嚴格遵循隱私與 PII 保護法規（排除 D），不可因短期聘用而免除必要的信任確認。"
    },
    {
        "id": 38,
        "type": "MC",
        "q": "某企業為了提升便利性，設定所有新進員工的實體門禁卡皆預設開啟研發區與伺服器機房的通行權限，且發卡後從未進行權限盤點。此做法最嚴重違反了「實體進入（Physical entry）」規範中的哪一項原則？",
        "en_q": "某企業為了提升便利性，設定所有新進員工的實體門禁卡皆預設開啟研發區與伺服器機房的通行權限，且發卡後從未進行權限盤點。此做法最嚴重違反了「實體進入（Physical entry）」規範中的哪一項原則？",
        "options": {
            "A": "A. 權限的申請、核准、審查與撤銷流程失效，未能確保僅「經授權且有業務需求」的人員才能進出敏感區域。",
            "B": "B. 門禁卡未使用高強度的生物特徵雙因子鑑別。",
            "C": "C. 訪客進入機房時未填寫登記簿。",
            "D": "D. 門禁系統未採用失效安全（Fail-safe）設計。"
        },
        "en_options": {
            "A": "A. 權限的申請、核准、審查與撤銷流程失效，未能確保僅「經授權且有業務需求」的人員才能進出敏感區域。",
            "B": "B. 門禁卡未使用高強度的生物特徵雙因子鑑別。",
            "C": "C. 訪客進入機房時未填寫登記簿。",
            "D": "D. 門禁系統未採用失效安全（Fail-safe）設計。"
        },
        "ans": "A",
        "explanation": "實體進入控制的核心在於確保僅有「經授權人員」能進出存放資訊的實體區域。預設給予過大權限且不定期審查與撤銷，完全違背了最小權限原則，導致門禁管理形同虛設，無法有效管控高敏感區域的進出人員。",
        "en_explanation": "實體進入控制的核心在於確保僅有「經授權人員」能進出存放資訊的實體區域。預設給予過大權限且不定期審查與撤銷，完全違背了最小權限原則，導致門禁管理形同虛設，無法有效管控高敏感區域的進出人員。"
    },
    {
        "id": 39,
        "type": "MA",
        "q": "當外部清潔人員或非 IT 廠區維護人員必須進入資料中心機房執行打掃或維修作業時，依據「於安全區域內工作（Working in secure areas）」之規範，組織應採取哪些控管行動？（多選）",
        "en_q": "當外部清潔人員或非 IT 廠區維護人員必須進入資料中心機房執行打掃或維修作業時，依據「於安全區域內工作（Working in secure areas）」之規範，組織應採取哪些控管行動？（多選）",
        "options": {
            "A": "A. 盡可能降低未受監督工作的情況，特別是針對外部人員，應安排內部授權人員全程陪同與監督。",
            "B": "B. 確保外部人員僅能進入並接觸其工作職責範圍內的區域。",
            "C": "C. 只要清潔人員已簽署保密協議，即可讓其獨自進入機房打掃。",
            "D": "D. 空置或當下無人作業的敏感安全區域，應確實上鎖並定期檢查狀態。"
        },
        "en_options": {
            "A": "A. 盡可能降低未受監督工作的情況，特別是針對外部人員，應安排內部授權人員全程陪同與監督。",
            "B": "B. 確保外部人員僅能進入並接觸其工作職責範圍內的區域。",
            "C": "C. 只要清潔人員已簽署保密協議，即可讓其獨自進入機房打掃。",
            "D": "D. 空置或當下無人作業的敏感安全區域，應確實上鎖並定期檢查狀態。"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "在安全區域內工作必須嚴格落實監督與管理。外部人員進入高度敏感區域時，無論是否簽署 NDA，皆不可處於無人監督的狀態（排除 C），必須由內部人員陪同以防止意外破壞或惡意干擾；同時，無人使用的安全區域必須上鎖並檢查，以防止未授權潛入。",
        "en_explanation": "在安全區域內工作必須嚴格落實監督與管理。外部人員進入高度敏感區域時，無論是否簽署 NDA，皆不可處於無人監督的狀態（排除 C），必須由內部人員陪同以防止意外破壞或惡意干擾；同時，無人使用的安全區域必須上鎖並檢查，以防止未授權潛入。"
    },
    {
        "id": 40,
        "type": "MC",
        "q": "某企業人資主管的辦公座位緊鄰公共走道，且其電腦螢幕直接面向透明玻璃，使得路過的訪客或快遞員能輕易看見螢幕上的員工薪資報表。此配置缺失最應透過下列哪一項控制措施來進行改善？",
        "en_q": "某企業人資主管的辦公座位緊鄰公共走道，且其電腦螢幕直接面向透明玻璃，使得路過的訪客或快遞員能輕易看見螢幕上的員工薪資報表。此配置缺失最應透過下列哪一項控制措施來進行改善？",
        "options": {
            "A": "A. 設備維護（Equipment maintenance）",
            "B": "B. 設備汰除或重新使用之保全（Security of equipment disposal or re-use）",
            "C": "C. 佈纜安全（Cabling security）",
            "D": "D. 設備安置及保護（Equipment siting and protection）"
        },
        "en_options": {
            "A": "A. 設備維護（Equipment maintenance）",
            "B": "B. 設備汰除或重新使用之保全（Security of equipment disposal or re-use）",
            "C": "C. 佈纜安全（Cabling security）",
            "D": "D. 設備安置及保護（Equipment siting and protection）"
        },
        "ans": "D",
        "explanation": "設備安置及保護（控制項 7.8）除了考量環境威脅外，也要求設備的擺放位置必須能降低「遭未授權人員窺視」的風險。將處理機敏個資的螢幕面向公眾走道或窗戶，屬於典型的設備安置不當，應透過調整螢幕方向或加裝防窺設施來改善。",
        "en_explanation": "設備安置及保護（控制項 7.8）除了考量環境威脅外，也要求設備的擺放位置必須能降低「遭未授權人員窺視」的風險。將處理機敏個資的螢幕面向公眾走道或窗戶，屬於典型的設備安置不當，應透過調整螢幕方向或加裝防窺設施來改善。"
    }
];



// 用來存放「這一回合被抽中」的 10 道題目與測驗狀態
    let currentRoundQuestions = [];
    let currentQuestionIndex = 0;
    let currentScore = 0;
    window.isQuizActive = false;

    window.addEventListener('beforeunload', function (e) {
        if (window.isQuizActive && typeof currentQuestionIndex !== 'undefined' && currentQuestionIndex < currentRoundQuestions.length) {
            e.preventDefault();
            e.returnValue = '您正在進行測驗，確定要離開嗎？進度將不會保留。';
            return e.returnValue;
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden && window.isQuizActive && typeof currentQuestionIndex !== 'undefined' && currentQuestionIndex < currentRoundQuestions.length) {
            Swal.fire({
                icon: 'warning',
                title: '系統警告：異常操作',
                text: '測驗期間請勿切換分頁或離開視窗，此動作已被系統記錄，多次違規可能影響成績！',
                confirmButtonColor: '#f39c12',
                background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638',
                color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff'
            });
        }
    });

    
    // =========================================
    // 錯題本追蹤邏輯
    // =========================================
    function trackMistake(qId) {
        let userStr = localStorage.getItem('currentUser');
        if (!userStr) return;
        try {
            let user = JSON.parse(userStr);
            if (!user.history) user.history = {};
            if (!user.history.mistakes) user.history.mistakes = [];
            
            if (!user.history.mistakes.includes(qId)) {
                user.history.mistakes.push(qId);
                localStorage.setItem('currentUser', JSON.stringify(user));
                if (typeof API_BASE_URL !== 'undefined') {
                    fetch(`${API_BASE_URL}/api/save-mistakes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, mistakes: user.history.mistakes })
                    }).catch(e => console.error('Mistake sync failed:', e));
                }
            }
        } catch(e) {}
    }

    
    // =========================================
    // 錯題本渲染與邏輯
    // =========================================
    window.currentMistakesPage = 1;
    window.changeMistakesPage = function(page) {
        window.currentMistakesPage = page;
        renderMistakes();
    };

    
async function saveMistakesToBackend() {
    if (!user || !user.id) return;
    try {
        await fetch(API_BASE_URL + '/api/save-mistakes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, mistakes: user.history.mistakes })
        });
    } catch (e) {
        console.error('Failed to save mistakes to backend', e);
    }
}

    window.renderMistakes = function() {
        const mistakesList = document.getElementById('mistakesList');
        if (!mistakesList) return;
        
        let userStr = localStorage.getItem('currentUser');
        if (!userStr) return;
        
        try {
            let user = JSON.parse(userStr);
            let mistakes = (user.history && user.history.mistakes) ? user.history.mistakes : [];
            const isEn = document.getElementById('langSelect') && document.getElementById('langSelect').value === 'en';
            
            if (mistakes.length === 0) {
                mistakesList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;"><i class="fa-solid fa-face-smile-beam" style="font-size: 3rem; margin-bottom: 15px; color: var(--primary-cyan);"></i><br>${isEn ? "Great job! Your mistake notebook is empty, keep it up!" : "太棒了！您的錯題本目前空空如也，繼續保持！"}</div>`;
                return;
            }

            const itemsPerPage = 5;
            const totalPages = Math.ceil(mistakes.length / itemsPerPage) || 1;
            
            if (window.currentMistakesPage > totalPages) window.currentMistakesPage = totalPages;
            if (window.currentMistakesPage < 1) window.currentMistakesPage = 1;
            
            const startIndex = (window.currentMistakesPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pagedMistakes = mistakes.slice(startIndex, endIndex);

            let html = '';
            
            
            pagedMistakes.forEach(qId => {
                const q = bigQuestionBank.find(b => b.id === qId);
                if (!q) return;
                
                let qText = isEn ? (q.en_q || q.q) : q.q;
                let explanationText = (q.explanation && q.explanation !== '暫無詳解') ? q.explanation : '此題尚未提供詳解，但您可以參考資安規範手冊。';
                if (isEn && q.en_explanation) explanationText = q.en_explanation;
                if (isEn && explanationText === '此題尚未提供詳解，但您可以參考資安規範手冊。') explanationText = 'No detailed explanation available yet, but you can refer to the manual.';
                
                let typeText = q.type === 'TF' ? '是非題' : (q.type === 'MA' ? '多選題' : '單選題');
                if (isEn) typeText = q.type === 'TF' ? 'T/F' : (q.type === 'MA' ? 'Multi' : 'Single');
                
                let optionsHtml = '';
                if (q.type === 'MC' || q.type === 'SC' || q.type === 'MA') {
                    const opts = isEn ? (q.en_options || q.options) : q.options;
                    if (opts) {
                        optionsHtml = '<div style="margin-top: 5px; margin-bottom: 15px; color: var(--text-secondary); font-size: 0.95rem;">';
                        for (let k in opts) {
                            optionsHtml += `<div style="margin-bottom: 8px; padding-left: 10px; border-left: 2px solid #3b82f6;">${opts[k]}</div>`;
                        }
                        optionsHtml += '</div>';
                    }
                } else if (q.type === 'TF') {
                    const trueText = isEn ? 'True' : '是';
                    const falseText = isEn ? 'False' : '否';
                    optionsHtml = `<div style="margin-top: 5px; margin-bottom: 15px; color: var(--text-secondary); font-size: 0.95rem;">
                        <div style="margin-bottom: 8px; padding-left: 10px; border-left: 2px solid #3b82f6;">○ ${trueText}</div>
                        <div style="margin-bottom: 8px; padding-left: 10px; border-left: 2px solid #3b82f6;">○ ${falseText}</div>
                    </div>`;
                }

                html += `
                <div class="rule-card" style="margin-bottom: 0; flex-direction: column; padding: 20px;">
                    <div class="rule-header" style="margin-bottom: 15px;">
                        <div><i class="fa-solid fa-circle-exclamation" style="color: var(--danger-color); margin-right: 8px;"></i> ${typeText}</div>
                    </div>
                    <div class="rule-content" style="width: 100%;">
                        <p style="font-size: 1.05rem; font-weight: 500; margin-bottom: 15px; color: var(--text-bright);">${qText}</p>
                        ${optionsHtml}
                        <details style="background: var(--bg-hover); padding: 10px; border-radius: 5px; cursor: pointer; margin-bottom: 15px;">
                            <summary style="color: var(--primary-cyan); font-weight: bold;">${isEn ? "View Explanation" : "查看詳解"}</summary>
                            <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-muted); line-height: 1.6;">${explanationText}</p>
                        </details>
                        
                        <div style="display: flex; justify-content: flex-end;">
                            <button class="btn-danger" style="width: 140px; font-size: 0.85rem; padding: 8px;" onclick="removeMistake('${q.id}')">
                                <i class="fa-solid fa-trash-can"></i> ${isEn ? "Remove" : "移出錯題本"}
                            </button>
                        </div>
                    </div>
                </div>
                `;
            });
            
            if (totalPages > 1) {
                let paginationHtml = '<div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px;">';
                for (let i = 1; i <= totalPages; i++) {
                    const bg = i === window.currentMistakesPage ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.05)';
                    const color = i === window.currentMistakesPage ? '#fff' : '#a0aec0';
                    const border = i === window.currentMistakesPage ? '1px solid rgba(59, 130, 246, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)';
                    paginationHtml += `<button style="width: 35px; height: 35px; padding: 0; background: ${bg}; color: ${color}; border: ${border}; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.3s ease;" onclick="changeMistakesPage(${i})" onmouseover="this.style.background='rgba(59, 130, 246, 0.3)'" onmouseout="this.style.background='${bg}'">${i}</button>`;
                }
                paginationHtml += '</div>';
                html += paginationHtml;
            }

            mistakesList.innerHTML = html;
            
        } catch(e) {
            console.error(e);
        }
    };

    window.removeMistake = function(qId) {
        let userStr = localStorage.getItem('currentUser');
        if (!userStr) return;
        try {
            let user = JSON.parse(userStr);
            if (user.history && user.history.mistakes) {
                user.history.mistakes = user.history.mistakes.filter(id => id !== Number(qId));
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                if (typeof API_BASE_URL !== 'undefined') {
                    fetch(`${API_BASE_URL}/api/save-mistakes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, mistakes: user.history.mistakes })
                    }).catch(e => console.error('Mistake remove sync failed:', e));
                }
                
                renderMistakes();
            }
        } catch(e) {}
    };

    

    

    function generateQuiz(quizCount = 10) {
        let tfQuestions = bigQuestionBank.filter(q => q.type === 'TF');
        let scQuestions = bigQuestionBank.filter(q => q.type === 'MC' || q.type === 'SC');
        let maQuestions = bigQuestionBank.filter(q => q.type === 'MA');
        
        const shuffleArray = (arr) => {
            let res = [...arr];
            for (let i = res.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [res[i], res[j]] = [res[j], res[i]]; 
            }
            return res;
        };

        let selected = shuffleArray(bigQuestionBank).slice(0, 10);
        
        currentRoundQuestions = shuffleArray(selected);
        currentQuestionIndex = 0;
        currentScore = 0;
        window.isQuizActive = true;
        
        const quizForm = document.getElementById('quizForm');
        if (quizForm) {
            const submitBtn = quizForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.style.display = 'none'; // 隱藏原本的提交按鈕
        }

        renderQuestions();
    }

    // 🎯 3. 動態渲染 HTML 的魔法函數
    function renderQuestions() {
        const container = document.getElementById('dynamicQuestionsContainer');
        if (!container) return;
        
        container.innerHTML = ""; 
        
        if (currentQuestionIndex >= currentRoundQuestions.length) {
            showFinalScore();
            return;
        }

        const item = currentRoundQuestions[currentQuestionIndex];
        const questionIndex = currentQuestionIndex + 1;
        let htmlContent = "";

        const langSelectElem = document.getElementById('langSelect');
        const isEn = langSelectElem && langSelectElem.value === 'en';

        const qText = isEn && item.en_q ? item.en_q : item.q;
        const progressHtmlText = isEn 
            ? `Question ${questionIndex} of ${currentRoundQuestions.length}`
            : `第 ${questionIndex} 題 / 共 ${currentRoundQuestions.length} 題`;
        const progressHtml = `<div style="color: var(--text-muted); margin-bottom: 15px; font-weight: bold;">${progressHtmlText}</div>`;

        if (item.type === 'TF') {
            const trueText = isEn ? 'True' : '是 (True)';
            const falseText = isEn ? 'False' : '否 (False)';
            const typeText = isEn ? 'True/False' : '是非題';
            const submitBtnText = isEn ? 'Submit Answer' : '確認答案';
            const submitBtnHtml = `<button type="button" class="btn-save" id="submit-btn-${item.id}" style="margin-top: 15px; font-size: 1.1rem; padding: 10px 20px; width: 100%; border: 1px solid #00a8ff;">${submitBtnText}</button>`;
            htmlContent = `
                ${progressHtml}
                <div class="flip-card" id="flip-card-${item.id}">
                    <div class="flip-card-inner">
                        <div class="flip-card-front rule-card" style="transition: 0.3s; padding-left: 15px; border-left: 5px solid transparent; height: 100%;">
                            <h4 style="color: #00a8ff; margin-bottom: 20px; font-size: 1.15rem; line-height: 1.4;">Q${questionIndex}. 【${typeText}】${qText}</h4>
                            <div class="quiz-options-grid" style="grid-template-columns: 1fr;">
                                <label class="quiz-option"><input type="radio" name="dynamic_q_${item.id}" value="true" class="quiz-radio"> <span class="quiz-option-text">${trueText}</span></label>
                                <label class="quiz-option"><input type="radio" name="dynamic_q_${item.id}" value="false" class="quiz-radio"> <span class="quiz-option-text">${falseText}</span></label>
                            </div>
                            ${submitBtnHtml}
                        </div>
                        <div class="flip-card-back" id="flip-card-back-${item.id}">
                        </div>
                    </div>
                </div>
            `;
        } else if (item.type === 'MC' || item.type === 'SC' || item.type === 'MA') {
            const typeTextMap = {
                'MC': isEn ? 'Multiple Choice' : '選擇題',
                'SC': isEn ? 'Single Choice' : '單選題',
                'MA': isEn ? 'Multiple Answer' : '多選題'
            };
            const typeText = typeTextMap[item.type];
            const isMultiple = item.type === 'MA';
            const inputType = isMultiple ? 'checkbox' : 'radio';
            
            let optionsHtml = '';
            for (const key in item.options) {
                const optText = isEn && item.en_options ? item.en_options[key] : item.options[key];
                optionsHtml += `
                    <label class="quiz-option">
                        <input type="${inputType}" name="dynamic_q_${item.id}" value="${key}" class="quiz-${inputType}">
                        <span class="quiz-option-text">${optText}</span>
                    </label>
                `;
            }

            const submitBtnText = isEn ? 'Submit Answer' : '確認答案';
            const submitBtnHtml = `<button type="button" class="btn-save" id="submit-btn-${item.id}" style="margin-top: 15px; font-size: 1.1rem; padding: 10px 20px; width: 100%; border: 1px solid #00a8ff;">${submitBtnText}</button>`;

            htmlContent = `
                ${progressHtml}
                <div class="flip-card" id="flip-card-${item.id}">
                    <div class="flip-card-inner">
                        <div class="flip-card-front rule-card" style="transition: 0.3s; padding-left: 15px; border-left: 5px solid transparent; height: 100%;">
                            <h4 style="color: #00a8ff; margin-bottom: 20px; font-size: 1.15rem; line-height: 1.4;">Q${questionIndex}. 【${typeText}】${qText}</h4>
                            <div class="quiz-options-grid">
                                ${optionsHtml}
                            </div>
                            ${submitBtnHtml}
                        </div>
                        <div class="flip-card-back" id="flip-card-back-${item.id}">
                        </div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = htmlContent;

        const submitBtn = document.getElementById(`submit-btn-${item.id}`);
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                const checkedInputs = container.querySelectorAll(`input[name="dynamic_q_${item.id}"]:checked`);
                const isMultiple = item.type === 'MA';
                
                if (checkedInputs.length === 0) {
                    const alertTitle = isEn ? 'Warning' : '提示';
                    const alertText = isEn ? 'Please select at least one option.' : '請至少選擇一個選項。';
                    Swal.fire({ icon: 'warning', title: alertTitle, text: alertText, background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff' });
                    return;
                }
                
                let selectedValues;
                if (isMultiple) {
                    selectedValues = Array.from(checkedInputs).map(i => i.value).sort();
                } else {
                    selectedValues = checkedInputs[0].value;
                }
                
                handleAnswerSelect(item, selectedValues);
            });
        }
    }

    window.updateQuizLanguage = function() {
        const quizSection = document.getElementById('quizSection');
        if (quizSection && quizSection.classList.contains('active')) {
            if (currentRoundQuestions.length > 0) {
                if (currentQuestionIndex >= currentRoundQuestions.length) {
                    showFinalScore();
                } else {
                    const flipCard = document.getElementById(`flip-card-${currentRoundQuestions[currentQuestionIndex].id}`);
                    if (flipCard && !flipCard.classList.contains('flipped')) {
                        renderQuestions();
                    }
                }
            }
        }
    };

    //  4. 處理答題與翻牌、計分
    function handleAnswerSelect(item, selectedValue) {
        const langSelectElem = document.getElementById('langSelect');
        const isEn = langSelectElem && langSelectElem.value === 'en';

        const flipCard = document.getElementById(`flip-card-${item.id}`);
        const questionDiv = flipCard.querySelector('.flip-card-front');
        const backDiv = document.getElementById(`flip-card-back-${item.id}`);
        
        const inputs = questionDiv.querySelectorAll('input');
        inputs.forEach(input => input.disabled = true);

        let correctAnswerText = "";
        let explanationText = "";
        
        if (item.type === 'TF') {
            const trueText = isEn ? 'True' : '是 (True)';
            const falseText = isEn ? 'False' : '否 (False)';
            correctAnswerText = item.ans === 'true' ? `⭕ ${trueText}` : `❌ ${falseText}`;
        } else if (item.type === 'MA') {
            correctAnswerText = item.ans.map(k => (isEn && item.en_options ? item.en_options[k] : item.options[k])).join('<br>');
        } else {
            correctAnswerText = isEn && item.en_options ? item.en_options[item.ans] : item.options[item.ans];
        }

        const expDefaultZh = item.exp || `依據資安實務與 ISO 27001 規範，此情境下選擇「${correctAnswerText}」才是能有效降低風險的最佳作法。其他選項可能帶來資料外洩或權限管控不當的隱患。`;
        const expDefaultEn = item.en_exp || `According to security practices and ISO 27001 standards, choosing "${correctAnswerText}" in this scenario is the best practice to mitigate risks. Other options may lead to data leakage or improper access control.`;
        explanationText = isEn ? expDefaultEn : expDefaultZh;
        
        let isCorrect = false;
        if (item.type === 'MA') {
            isCorrect = JSON.stringify(selectedValue) === JSON.stringify([...item.ans].sort());
        } else {
            isCorrect = selectedValue === item.ans;
        }

        const isLastQuestion = currentQuestionIndex === currentRoundQuestions.length - 1;
        const btnText = isLastQuestion ? (isEn ? "See Score" : "看成績") : (isEn ? "Next" : "下一題");
        const btnHtml = `<button type="button" class="btn-save btn-next-quiz" style="margin-top: 15px; font-size: 1rem; padding: 10px 25px;" onclick="nextQuestion()">${btnText} <i class="fa-solid fa-arrow-right"></i></button>`;

        if (isCorrect) {
            currentScore += 10;
            backDiv.className = 'flip-card-back correct';
            backDiv.innerHTML = `
                <div class="flip-card-back-icon"><i class="fa-solid fa-check-circle"></i></div>
                <div class="flip-card-back-text">${isEn ? 'Correct!' : '答對了！'}</div>
                ${btnHtml}
            `;
        } else {
            trackMistake(item.id);
            backDiv.className = 'flip-card-back incorrect';
            backDiv.innerHTML = `
                <div class="flip-card-back-icon"><i class="fa-solid fa-times-circle"></i></div>
                <div class="flip-card-back-text">${isEn ? 'Incorrect.' : '答錯了。'}</div>
                <div class="flip-card-back-answer">${isEn ? 'Correct Answer:' : '正確解答為：'}<br><span style="color: var(--text-bright); margin-top: 5px; display: inline-block; font-size: 1.2rem;">${correctAnswerText}</span></div>
                <div style="margin-top: 15px; font-size: 0.9rem; color: var(--danger-color); max-width: 90%; line-height: 1.6; text-align: left; background: var(--bg-subtle); padding: 15px; border-radius: 8px;"><strong>${isEn ? 'Explanation:' : '詳解：'}</strong><br>${explanationText}</div>
                ${btnHtml}
            `;
        }
        
        setTimeout(() => {
            flipCard.classList.add('flipped');
        }, 100);
    }

    window.nextQuestion = function() {
        currentQuestionIndex++;
        renderQuestions();
    };

    function showFinalScore() {
        window.isQuizActive = false;
        const langSelectElem = document.getElementById('langSelect');
        const isEn = langSelectElem && langSelectElem.value === 'en';

        const container = document.getElementById('dynamicQuestionsContainer');
        const titleText = isEn ? 'Quiz Finished!' : '測驗結束！';
        const scoreText = isEn ? 'Points' : '分';
        const goodText = isEn ? 'Great job! You have good security defense concepts!' : '表現不錯，您具備良好的資安防禦觀念！';
        const badText = isEn ? 'Room for improvement. Please review the security guidelines!' : '還有進步空間，請多加複習資安規範！';
        const btnText = isEn ? 'Restart Quiz' : '重新測驗';

        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: var(--bg-subtle); border-radius: 12px; border: 1px solid var(--cyan-bg-strong);">
                <h3 style="color: #00a8ff; margin-bottom: 20px; font-size: 2rem;">${titleText}</h3>
                <div style="font-size: 4rem; font-weight: bold; color: ${currentScore >= 60 ? '#2ed573' : '#ff4757'};"><i class="fa-solid ${currentScore >= 60 ? 'fa-trophy' : 'fa-face-frown'}" style="margin-right: 15px;"></i>${currentScore} ${scoreText}</div>
                <p style="color: var(--text-muted); margin-top: 20px; font-size: 1.1rem;">${currentScore >= 60 ? goodText : badText}</p>
                <button type="button" class="btn-save" style="margin-top: 30px; font-size: 1.1rem; padding: 12px 30px;" onclick="restartQuiz()"><i class="fa-solid fa-rotate-right"></i> ${btnText}</button>
            </div>
        `;
        
        if (currentScore === 100) {
            Swal.fire({
                icon: 'success', 
                title: isEn ? 'Perfect Score!' : '滿分通過！',
                html: isEn ? 'Amazing! You fully grasp the core essence of protection.<br>Congratulations on unlocking your exclusive certificate!' : '太厲害了！您完全掌握了防護核心精髓。<br>恭喜您解鎖專屬的合格證書！',
                background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff', 
                showCancelButton: true,
                confirmButtonColor: '#00a8ff',
                cancelButtonColor: '#f39c12',
                confirmButtonText: isEn ? 'OK' : '確定',
                cancelButtonText: `<i class="fa-solid fa-image"></i> ${isEn ? 'Download Certificate' : '下載榮譽證書相片'}`,
                customClass: { cancelButton: 'cyber-cancel-btn' }
            }).then((result) => {
                if (result.dismiss === Swal.DismissReason.cancel) {
                    generateCertificateImage(); 
                }
            }); 
        } else if (currentScore >= 60) {
            Swal.fire({
                icon: 'info', title: `測驗結果：${currentScore} 分`,
                text: '及格了！繼續保持！',
                background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff', confirmButtonColor: '#00a8ff'
            });
        } else {
            Swal.fire({
                icon: 'error', title: `測驗結果：${currentScore} 分`,
                text: '不及格喔！請多加複習！',
                background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff', confirmButtonColor: '#ff4757'
            });
        }
    }

    window.restartQuiz = function() {
        generateQuiz(10);
    };

    const quizForm = document.getElementById('quizForm');
    if (quizForm) {
        quizForm.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    }
    // =========================================
    // 18. 永久刪除帳號邏輯
    // =========================================
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const result = await Swal.fire({
                title: '確定要刪除帳號嗎？',
                text: '此操作不可復原，您將失去所有訓練紀錄！',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff4757',
                cancelButtonColor: 'transparent',
                confirmButtonText: '確定刪除',
                cancelButtonText: '取消',
                background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff',
                customClass: { cancelButton: 'cyber-cancel-btn' }
            });

            if (result.isConfirmed) {
                const user = JSON.parse(localStorage.getItem('currentUser'));
                if (!user || !user.id) {
                    alert("找不到使用者資料，請重新登入！");
                    return;
                }

                try {
                    // 顯示載入動畫
                    Swal.fire({
                        title: '資料抹除中...',
                        background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff',
                        didOpen: () => Swal.showLoading()
                    });

                    // 呼叫後端 API
                    const res = await fetch(`${API_BASE_URL}/api/delete-account`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id })
                    });

                    const data = await res.json();
                    
                    if (data.success) {
                        await Swal.fire({ 
                            icon: 'success', 
                            title: '帳號已刪除', 
                            text: '您的資料已從系統中徹底抹除。', 
                            background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff', 
                            timer: 2000, 
                            showConfirmButton: false 
                        });
                        // 清空前端記憶體並踢回登入頁
                        localStorage.removeItem('currentUser');
                        window.location.href = 'login.html';
                    } else {
                        Swal.fire({ icon: 'error', title: '刪除失敗', text: data.message, background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff' });
                    }
                } catch (error) {
                    console.error("API 請求失敗:", error);
                    Swal.fire({ icon: 'error', title: '連線錯誤', text: '無法連接到伺服器進行刪除', background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff' });
                }
            }
        });
    }
// =========================================
    //  產生數位資安培訓證書 
    // =========================================
    function generateCertificateImage() {
        // 1. 抓取目前登入者的名稱與今天的日期
        const userStr = localStorage.getItem('currentUser');
        const userName = userStr ? JSON.parse(userStr).username : '測試員 01';
        const today = new Date().toLocaleDateString();

        // 2. 塞進隱藏的證書模板中
        document.getElementById('certUserName').innerText = userName;
        document.getElementById('certDate').innerText = today;

        // 3. 把模板拉出來準備拍照
        const element = document.getElementById('certificateTemplate');
        element.style.display = 'block';

        // 顯示載入動畫
        Swal.fire({
            title: '生成證書相片中...',
            html: '請稍候，正在為您沖洗專屬的證書照片<br><br><i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary-cyan)"></i>',
            background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff',
            showConfirmButton: false,
            allowOutsideClick: false
        });

        // 4. 給瀏覽器一點點時間完成文字渲染，然後精準截圖
        setTimeout(async () => {
            try {
                // 檢查是否有成功載入 html2canvas
                if (typeof html2canvas === 'undefined') {
                    throw new Error("找不到 html2canvas 套件，請確認 HTML 是否有正確載入。");
                }

                // 執行拍照
                const canvas = await html2canvas(element, {
                    scale: 2, 
                    backgroundcolor: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a202c' : '#ffffff',
                    useCORS: true,
                    logging: false // 關閉終端機雜訊
                });

                // 創建下載連結
                const link = document.createElement('a');
                link.download = `ISO資安合格證書_${userName}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                // 拍照完畢後隱藏模板
                element.style.display = 'none';

                // 彈出成功提示
                Swal.fire({
                    icon: 'success',
                    title: '相片下載成功！',
                    text: '合格證書相片已成功儲存至您的裝置。',
                    background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff',
                    confirmButtonColor: '#00a8ff'
                }).then(() => {
                    generateQuiz(10); // 自動刷新題目
                });

            } catch (error) {
                console.error("生成證書相片失敗:", error);
                // 發生錯誤時，立刻把模板藏起來，並彈出錯誤視窗，解除死當狀態
                element.style.display = 'none';
                Swal.fire({
                    icon: 'error',
                    title: '沖洗失敗',
                    text: '無法生成證書：' + error.message,
                    background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff'
                });
            }
        }, 500);
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    const isEn = document.getElementById('langSelect') && document.getElementById('langSelect').value === 'en-US';
    
    if(themeToggleBtn && themeIcon) {
        const updateThemeUI = (theme) => {
            const currentIsEn = document.getElementById('langSelect') && document.getElementById('langSelect').value === 'en-US';
            if(theme === 'light') {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
                if(themeText) themeText.innerText = currentIsEn ? 'Light Mode' : '淺色模式';
            } else {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
                if(themeText) themeText.innerText = currentIsEn ? 'Dark Mode' : '深色模式';
            }
        };
        
        updateThemeUI(document.documentElement.getAttribute('data-theme'));
        
        themeToggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            if (current === 'light') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
                updateThemeUI('dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                updateThemeUI('light');
            }
            
            // Trigger chart update if radar exists
            if(window.myRadarChart) {
                const isLight = localStorage.getItem('theme') === 'light';
                const gridColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)';
                const pointLabelColor = isLight ? '#1a202c' : '#f8f9fa';
                
                window.myRadarChart.options.scales.r.grid.color = gridColor;
                window.myRadarChart.options.scales.r.angleLines.color = gridColor;
                window.myRadarChart.options.scales.r.pointLabels.color = pointLabelColor;
                window.myRadarChart.update();
            }
        });
        // ================= VR 專區重構邏輯 =================

        // 綁定按鈕與視圖
        const btnShowVrHistory = document.getElementById('btnShowVrHistory');
        const btnShowVrAnswers = document.getElementById('btnShowVrAnswers');
        const vrHistoryContainer = document.getElementById('vrHistoryContainer');
        const vrAnswersContainer = document.getElementById('vrAnswersContainer');

        if (btnShowVrHistory && btnShowVrAnswers && vrHistoryContainer && vrAnswersContainer) {
            btnShowVrHistory.addEventListener('click', () => {
                vrHistoryContainer.style.display = 'block';
                vrAnswersContainer.style.display = 'none';
                btnShowVrHistory.style.backgroundColor = 'var(--primary-cyan)';
                btnShowVrHistory.style.color = 'var(--btn-primary-text)';
                btnShowVrAnswers.style.backgroundColor = 'transparent';
                btnShowVrAnswers.style.color = 'var(--primary-cyan)';
            });

            btnShowVrAnswers.addEventListener('click', () => {
                vrHistoryContainer.style.display = 'none';
                vrAnswersContainer.style.display = 'block';
                btnShowVrAnswers.style.backgroundColor = 'var(--primary-cyan)';
                btnShowVrAnswers.style.color = 'var(--btn-primary-text)';
                btnShowVrHistory.style.backgroundColor = 'transparent';
                btnShowVrHistory.style.color = 'var(--primary-cyan)';
            });
        }

        // VR 資料
        const vrRecords = [
            {
                id: 1,
                date: '2023-11-20 14:30',
                duration: '15:42',
                score: 85,
                suggestion: '在第一站啟動會議與高階訪談中，您成功找出了大部分的資安缺失。建議未來在會議中可多加留意桌面上的敏感資訊以及無人看管的設備。',
                levelName: '第一站【啟動會議】&【高階訪談】',
                images: ['vr-ans-1.png', 'vr-ans-1-2.png', 'vr-ans-1-3.png', 'vr-ans-1-4.png'],
                found: [],
                correctAnswers: [
                    `A6.1 清潔桌面與淨空螢幕：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：會議室桌面上遺留了包含機密資訊的便條紙或文件，未遵守桌面淨空原則。</div>\n                    </div>`,
                    `A6.3 資訊與通訊設備安全：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：會議室白板上寫有未經授權的系統架構圖或密碼資訊，且無人看管。</div>\n                    </div>`,
                    `A8.1 實體與環境安全：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：訪客未經換證或登記即進入會議室，違反門禁管制規定。</div>\n                    </div>`,
                    `A8.2 設備安全 (遺留 USB 隨身碟)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：會議室桌上遺留了未知的 USB 隨身碟。未經掃描與授權的外部儲存媒體可能會帶來惡意軟體感染或資料外洩的風險。</div>\n                    </div>`
                ]
            },
            {
                id: 2,
                date: '2023-11-21 09:15',
                duration: '22:10',
                score: 72,
                suggestion: '第二站辦公區巡檢表現尚可，但漏看了幾個隱蔽的缺失。請特別注意員工螢幕上的便利貼，以及未鎖定的電腦畫面。',
                levelName: '第二站【條文檢查 Session 1】',
                images: [
                    'vr-ans-2-5.png',
                    'vr-ans-2-6.png',
                    'vr-ans-2-7.png',
                    'vr-ans-2-8.png',
                    'vr-ans-2-9.png'
                ],
                found: [],
                correctAnswers: [
                    `A7.7 桌面淨空及螢幕淨空 (打開的平板)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：桌上有一台未上鎖的平板，在無人看管的情況下，任何人皆能輕易操作並存取內部資料。此狀況仍應記錄為缺失行為。</div>\n                    </div>`,
                    `訪客名片：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #2ed573; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-check"></i> 說明：辦公區桌上留有一張訪客名片，由於其姓名與電話屬於訪客主動提供的公開社交資訊，在無人看管時被他人檢視，不需記錄為缺失行為。</div>\n                    </div>`,
                    `A7.7 桌面淨空及螢幕淨空 (未加蓋的咖啡)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：辦公桌上放置一杯未加蓋的咖啡且鄰近電腦硬體與重要文件，因存在液體打翻導致損壞的環境風險，應記錄為缺失行為。</div>\n                    </div>`,
                    `A7.7 桌面淨空及螢幕淨空 (未收妥的內部文件)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：辦公桌上隨意放置了數份公司內部文件，處於無人看管且任何人皆可輕易翻閱或取得之狀態，此行為違反桌面淨空政策，應記錄為缺失行為。</div>\n                    </div>`,
                    `A6.2 聘用條款及條件 (缺少離職後保密條款)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：聘用合約中的保密協議(NDA)僅寫明「在職期間」須履行保密義務，實則應該要求員工離職後亦須永久（或特定年限內）達成保密義務，此合約內容不符規範，應記錄為缺失行為。</div>\n                    </div>`
                ]
            },
            {
                id: 3,
                date: '2023-11-22 16:45',
                duration: '18:30',
                score: 95,
                suggestion: '第三站機房重地表現非常優異！您具備了極高的資安敏銳度，幾乎找出了所有潛在的風險。請繼續保持！',
                levelName: '第三站【條文檢查 Session 2】',
                images: ['vr-ans-3-1.png', 'vr-ans-3-2.png', 'vr-ans-3-3.png', 'vr-ans-3-4.png', 'vr-ans-3-5.png', 'vr-ans-3-6.png'],
                found: [],
                correctAnswers: [
                    `A7.14 設備汰除或重新使用之保全 (機房內堆放報廢設備)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：受管制之機房內放置了一大批待銷毀或報廢的舊設備，此舉可能阻礙逃生動線並影響散熱，應記錄為缺失行為。</div>\n                    </div>`,
                    `A7.13 設備維護 (機房內堆放報廢設備 - 影響維護)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：機房內不應隨意堆放雜物與報廢品，影響環境安全與設備維護。</div>\n                    </div>`,
                    `A7.8 設備安置與保護 (維修表未簽名)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：進出機房未簽名。當機房管理員進入維修機房時，應配合本中心所設立之「機房與工作室」簽名表單，符合該區域之管制規範。</div>\n                    </div>`,
                    `A7.12 佈纜安全 / 設備安置與保護 (機房內食物)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：發現受管制之機房內放置非施工用器具，不應該出現包裝完整密封的零食餅乾，記錄為缺失行為。</div>\n                    </div>`,
                    `A7.7 桌面淨空與螢幕淨空 (電腦螢幕貼密碼紙條)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：員工為了方便記憶，將登入帳密寫在便利貼並貼在電腦螢幕上，此行為已違反桌面淨空與螢幕淨空政策，為缺失行為。</div>\n                    </div>`,
                    `A6.4 違規懲處 (資安政策海報未明訂懲處)：\n                    <div style="margin-left: 25px; margin-top: 5px; color: #a8b2d1; font-size: 0.9rem; line-height: 1.5;">\n                        <div style="color: #ff4757; margin-top: 5px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> 缺失：辦公室安全政策海報上向員工宣導資訊安全規範，但未帶出相關違規處置程序，未明確表示若將遭受何種懲處或影響。不符合程序與明確規範。</div>\n                    </div>`
                ]
            }
        ];

        const vrHistoryList = document.getElementById('vrHistoryList');
        const vrHistoryModal = document.getElementById('vrHistoryModal');
        const closeVrHistoryModalBtn = document.getElementById('closeVrHistoryModal');
        
        const combinedVrRecord = [{
            id: 'ALL',
            date: '2023-11-22 16:45',
            duration: '56:22',
            score: 84,
            suggestion: '您在所有站點的探索中表現良好，具備高度的資安敏銳度。請繼續保持並留意未看管的設備與環境安全。',
            levelName: '完整模擬探索紀錄 (全部站點)',
            images: vrRecords.flatMap(r => r.images || (r.imageUrl ? [r.imageUrl] : [])),
            found: vrRecords.flatMap(r => r.found || []),
            correctAnswers: vrRecords.flatMap(r => r.correctAnswers || [])
        }];

        window.renderVrHistoryCard = (score, duration, date, answers) => {
            if (score !== undefined) combinedVrRecord[0].score = score;
            
            if (answers) {
                const questionMap = {
                    S1_BADGE: "主管隨意放置主管專用識別證",
                    S1_EXPIRED_PASS: "提供已失效的稽核通行證",
                    S1_USB: "存有重要檔案的 USB 硬碟隨意放在桌緣",
                    S1_MANAGEMENT_REVIEW: "管理審查報告缺失辨識",
                    S1_EMPLOYEE_EVALUATION: "員工評核表缺失辨識",
                    S2_TABLET: "未上鎖的平板放置於辦公桌面上",
                    S2_VISITOR_CARD: "重要訪客名片隨意放置在辦公桌上",
                    S2_COFFEE: "未加蓋咖啡放在電腦旁",
                    S2_INTERNAL_DOCUMENT: "公司內部文件隨意放置",
                    S2_EMPLOYMENT_CONTRACT: "聘用合約缺失辨識",
                    S3_PASSWORD_NOTE: "帳號密碼寫在便利貼上",
                    S3_EWASTE: "機房堆放報廢電子設備",
                    S3_CAKE: "管制機房內放置食物",
                    S3_SECURITY_POSTER: "資安海報缺失辨識",
                    S3_MAINTENANCE_RECORD: "機房設備維修與維護登記表缺失辨識"
                };
                
                const newFound = [];
                for (const [qId, qDesc] of Object.entries(questionMap)) {
                    const isCorrect = answers[qId];
                    if (isCorrect) {
                        newFound.push(`<span style="color: #2ed573;">✔ 成功辨識：${qDesc}</span>`);
                    } else {
                        newFound.push(`<span style="color: #ff4757;">✖ 未能辨識：${qDesc}</span>`);
                    }
                }
                if (newFound.length > 0) {
                    combinedVrRecord[0].found = newFound;
                }
            }
            
            if (date) {
                combinedVrRecord[0].date = date;
            } else if (score !== undefined) {
                // If a new score was provided but no date, use current date
                const now = new Date();
                combinedVrRecord[0].date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            }

            if (duration !== undefined) {
                // format duration to HH:MM if it's a number (hours)
                if (!isNaN(duration)) {
                    const totalMins = Math.round(Number(duration) * 60);
                    const hrs = Math.floor(totalMins / 60);
                    const mins = totalMins % 60;
                    combinedVrRecord[0].duration = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
                } else {
                    combinedVrRecord[0].duration = duration;
                }
            }

            if (vrHistoryList) {
                vrHistoryList.innerHTML = combinedVrRecord.map(record => `
                    <div class="note-card glass-panel vr-history-card" data-id="` + record.id + `" style="cursor: pointer; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px; transition: transform 0.2s, box-shadow 0.2s; gap: 10px;">
                        <div>
                            <h3 style="color: var(--primary-cyan); margin: 0 0 5px 0;"><i class="fa-solid fa-vr-cardboard"></i> 模擬探索 - ${record.levelName}</h3>
                            <p style="color: var(--text-light); margin: 0; font-size: 0.9rem; text-align: center;">${record.date}</p>
                        </div>
                        <div style="text-align: center;">
                            <span style="font-size: 1.5rem; font-weight: bold; color: ${record.score >= 80 ? '#2ed573' : (record.score >= 60 ? '#ffa502' : '#ff4757')};">${record.score} 分</span>
                            <p style="color: var(--text-light); margin: 5px 0 0 0; font-size: 0.8rem;" data-i18n="c-readmore">點擊查看詳細紀錄 <i class="fa-solid fa-arrow-right"></i></p>
                        </div>
                    </div>
                `).join('');

                const historyCards = document.querySelectorAll('.vr-history-card');
                historyCards.forEach(card => {
                    card.addEventListener('click', function() {
                        const recordId = this.getAttribute('data-id');
                        const record = combinedVrRecord.find(r => String(r.id) === String(recordId));
                        
                        if (record) {
                            document.getElementById('vrModalDate').textContent = record.date;

                        
                        const scoreElem = document.getElementById('vrModalScore');
                        if (scoreElem) {
                            scoreElem.textContent = '綜合評分: ' + record.score + ' / 100';
                            scoreElem.style.color = record.score >= 80 ? '#2ed573' : (record.score >= 60 ? '#ffa502' : '#ff4757');
                        }
                        
                        const foundList = document.getElementById('vrModalFoundList');
                        if (foundList) {
                            foundList.innerHTML = record.found.map(item => '<li style="margin-bottom: 8px;">' + item + '</li>').join('');
                        }
                        
                        document.getElementById('vrModalSuggestion').textContent = record.suggestion;
                        vrHistoryModal.classList.add('show');
                    }
                });
            });
        }
        }; // End of renderVrHistoryCard

        // Call it initially
        window.renderVrHistoryCard();

        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const userObj = JSON.parse(currentUserStr);
                fetch(`${API_BASE_URL}/api/stats?userId=${userObj.id}`)
                    .then(res => res.json())
                    .then(resData => {
                        if (resData.success && resData.data) {
                            window.renderVrHistoryCard(resData.data.totalScore, resData.data.trainingHours, resData.data.createdAt, resData.data.answers);
                        }
                    })
                    .catch(e => console.error("Error fetching VR stats on load:", e));
            } catch(e) {}
        }

        if (closeVrHistoryModalBtn) {
            closeVrHistoryModalBtn.addEventListener('click', () => vrHistoryModal.classList.remove('show'));
        }
        if (vrHistoryModal) {
            vrHistoryModal.addEventListener('click', (e) => {
                if (e.target === vrHistoryModal) vrHistoryModal.classList.remove('show');
            });
        }

        
        // --- 預先載入圖片，避免第一次點擊時延遲 ---
        vrRecords.forEach(record => {
            if (record.images) {
                record.images.forEach(src => {
                    const img = new Image();
                    img.src = src;
                });
            }
            if (record.imageUrl) {
                const img = new Image();
                img.src = record.imageUrl;
            }
        });
        // ----------------------------------------

        const vrAnswerLevelSelect = document.getElementById('vrAnswerLevelSelect');
        if (vrAnswerLevelSelect) {
            vrAnswerLevelSelect.innerHTML = vrRecords.map(r => `<option value="${r.levelName}">${r.levelName}</option>`).join('');
            vrAnswerLevelSelect.addEventListener('change', (e) => {
                renderDirectAnswer(e.target.value);
            });
            renderDirectAnswer(vrAnswerLevelSelect.value);
        }

        function renderDirectAnswer(levelName) {
            const record = vrRecords.find(r => r.levelName === levelName);
            if (record) {
                const answerList = document.getElementById('vrAnswerDirectList');
                const imgElem = document.getElementById('vrAnswerDirectImage');
                const noImgElem = document.getElementById('vrAnswerDirectNoImage');
                
                if (answerList && imgElem && noImgElem) {
                    answerList.innerHTML = record.correctAnswers.map((item, index) => `
                        <li class="vr-direct-answer-item" data-index="${index}" style="margin-bottom: 8px; padding: 10px; cursor: pointer; border-radius: 6px; border: 1px solid transparent; transition: all 0.2s;">
                            <div style="display: flex; align-items: flex-start;">
                                <i class="fa-solid fa-check-double" style="color: #ff4757; margin-right: 8px; margin-top: 4px;"></i>
                                <div style="flex: 1;">${item}</div>
                            </div>
                        </li>
                    `).join('');
                    
                    const items = answerList.querySelectorAll('.vr-direct-answer-item');
                    
                    function selectItem(idx) {
                        items.forEach((el, i) => {
                            if (i === idx) {
                                el.style.backgroundColor = 'rgba(255, 71, 87, 0.1)';
                                el.style.borderColor = 'rgba(255, 71, 87, 0.4)';
                            } else {
                                el.style.backgroundColor = 'transparent';
                                el.style.borderColor = 'transparent';
                            }
                        });
                        
                        if (record.images && record.images[idx]) {
                            imgElem.style.opacity = 0;
                            setTimeout(() => {
                                imgElem.src = record.images[idx];
                                imgElem.style.display = 'block';
                                imgElem.style.opacity = 1;
                                noImgElem.style.display = 'none';
                            }, 10);
                        } else if (record.imageUrl && idx === 0) {
                            imgElem.style.opacity = 0;
                            setTimeout(() => {
                                imgElem.src = record.imageUrl;
                                imgElem.style.display = 'block';
                                imgElem.style.opacity = 1;
                                noImgElem.style.display = 'none';
                            }, 10);
                        } else {
                            imgElem.style.display = 'none';
                            noImgElem.style.display = 'block';
                        }
                    }
                    
                    items.forEach((item, idx) => {
                        item.addEventListener('mouseenter', () => {
                            if (item.style.backgroundColor === 'transparent' || item.style.backgroundColor === '') {
                                item.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            }
                        });
                        item.addEventListener('mouseleave', () => {
                            if (item.style.borderColor === 'transparent' || item.style.borderColor === '') {
                                item.style.backgroundColor = 'transparent';
                            }
                        });
                        item.addEventListener('click', () => {
                            selectItem(idx);
                        });
                    });
                    
                    if (items.length > 0) {
                        selectItem(0);
                    } else {
                        imgElem.style.display = 'none';
                        noImgElem.style.display = 'block';
                    }
                }
            }
        }

        const startVrBtn = document.getElementById('startVrBtn');
        const vrTicketModal = document.getElementById('vrTicketModal');
        const closeVrTicketModal = document.getElementById('closeVrTicketModal');
        const vrTicketCode = document.getElementById('vrTicketCode');

        if (startVrBtn && vrTicketModal && closeVrTicketModal && vrTicketCode) {
            startVrBtn.addEventListener('click', async () => {
                const userStr = localStorage.getItem('currentUser');
                if (!userStr) {
                    alert('請先登入系統才能啟動 VR 訓練！');
                    return;
                }
                const user = JSON.parse(userStr);
                
                // Show modal first with loading state
                vrTicketCode.textContent = '載入中...';
                vrTicketModal.style.display = 'flex';
                setTimeout(() => vrTicketModal.classList.add('show'), 10);
                
                try {
                    const response = await fetch(`${API_BASE_URL}/api/vr/create-ticket`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId: user.id })
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        vrTicketCode.textContent = data.ticket;
                    } else {
                        vrTicketCode.textContent = '連線失敗';
                        alert('無法取得連線代碼：' + data.message);
                    }
                } catch (error) {
                    console.error('Error fetching VR ticket:', error);
                    vrTicketCode.textContent = '連線錯誤';
                    alert('系統發生錯誤，無法取得連線代碼。');
                }
            });
            
            closeVrTicketModal.addEventListener('click', () => {
                vrTicketModal.classList.remove('show');
                setTimeout(() => vrTicketModal.style.display = 'none', 300);
            });
            
            // Allow closing by clicking outside the modal
            vrTicketModal.addEventListener('click', (e) => {
                if (e.target === vrTicketModal) {
                    vrTicketModal.classList.remove('show');
                    setTimeout(() => vrTicketModal.style.display = 'none', 300);
                }
            });
        }
        
        // 圖片放大功能
        const vrAnswerDirectImage = document.getElementById('vrAnswerDirectImage');
        const imageZoomModal = document.getElementById('imageZoomModal');
        const enlargedImage = document.getElementById('enlargedImage');
        const closeImageZoom = document.getElementById('closeImageZoom');
        
        if (vrAnswerDirectImage && imageZoomModal && enlargedImage && closeImageZoom) {
            vrAnswerDirectImage.addEventListener('click', () => {
                enlargedImage.src = vrAnswerDirectImage.src;
                imageZoomModal.style.display = 'flex';
                void imageZoomModal.offsetWidth;
                imageZoomModal.style.opacity = '1';
                imageZoomModal.style.pointerEvents = 'auto';
                enlargedImage.style.transform = 'scale(1)';
            });

            const hideZoomModal = () => {
                imageZoomModal.style.opacity = '0';
                imageZoomModal.style.pointerEvents = 'none';
                enlargedImage.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    imageZoomModal.style.display = 'none';
                }, 300);
            };

            closeImageZoom.addEventListener('click', hideZoomModal);
            imageZoomModal.addEventListener('click', (e) => {
                if (e.target === imageZoomModal) {
                    hideZoomModal();
                }
            });
        }

        // Toggle logic for Radar and Line chart
        const btnShowRadar = document.getElementById('btnShowRadar');
        const btnShowLine = document.getElementById('btnShowLine');
        const radarContainer = document.getElementById('radarContainer');
        const lineContainer = document.getElementById('lineContainer');

        if (btnShowRadar && btnShowLine && radarContainer && lineContainer) {
            btnShowRadar.addEventListener('click', () => {
                radarContainer.style.display = 'block';
                lineContainer.style.display = 'none';
                btnShowRadar.style.backgroundColor = '#00a8ff';
                btnShowRadar.style.color = '#000';
                btnShowLine.style.backgroundColor = 'transparent';
                btnShowLine.style.color = '#00a8ff';
            });

            btnShowLine.addEventListener('click', () => {
                radarContainer.style.display = 'none';
                lineContainer.style.display = 'block';
                btnShowLine.style.backgroundColor = '#00a8ff';
                btnShowLine.style.color = '#000';
                btnShowRadar.style.backgroundColor = 'transparent';
                btnShowRadar.style.color = '#00a8ff';
            });
        }

    }
});


// --- Load Unity LLM Latest Result ---
async function loadLatestResult() {
    try {
        const response = await fetch("/api/latest-result");
        const data = await response.json();

        console.log("最新 Unity LLM 成績：", data);

        if (!data || data.success === false) {
            console.warn("目前沒有 LLM 成績資料");
            return;
        }

        const totalScoreEl = document.getElementById("totalScore");
        const levelTextEl = document.getElementById("levelText");
        const summaryTextEl = document.getElementById("summaryText");
        const suggestionTextEl = document.getElementById("suggestionText");

        if (totalScoreEl) totalScoreEl.textContent = data.totalScore ?? 0;
        if (levelTextEl) levelTextEl.textContent = data.level ?? "未評分";
        if (summaryTextEl) summaryTextEl.textContent = data.summary ?? "尚無總評";
        if (suggestionTextEl) suggestionTextEl.textContent = data.suggestion ?? "尚無建議";

    } catch (error) {
        console.error("讀取 LLM 成績失敗：", error);
    }
}
