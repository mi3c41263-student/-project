
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
    const breadcrumbSubtitle = document.querySelector('.breadcrumb .subtitle');
    
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
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = '開始您的沉浸式資安稽核訓練，或回顧過去的探索紀錄與正確解答。';
                } else if (menuId === 'nav-manual') {
                    if (manualSection) manualSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = 'ISO 27002:2022 資訊安全控制指南';
                } else if (menuId === 'nav-notes') {
                    if (notesSection) notesSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = '沉澱並複習您的資安防禦實務';
                } else if (menuId === 'nav-analysis') {
                    if (analysisSection) analysisSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = '檢視您各項資安能力的綜合評估';
                    
                    if (typeof loadLatestResult === 'function') {
                        loadLatestResult();
                    }

                    if (!window.radarChartCreated) {
                        if (typeof initRadarChart === 'function') initRadarChart();
                        window.radarChartCreated = true;
                    }
                
                } else if (menuId === 'nav-mistakes') {
                    if (mistakesSection) mistakesSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = '集中火力消滅資安盲區';
                    if (typeof renderMistakes === 'function') renderMistakes();
                } else if (menuId === 'nav-quiz') { 
                    if (quizSection) quizSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = '資安稽核情境模擬測驗';
                    
                    // 每次點進來就自動抽 10 題新的
                    if (typeof generateQuiz === 'function') {
                        generateQuiz(10); 
                    }
                }
            } 
        }); 
    });
    // =========================================
    // 4. 學習筆記閱讀視窗 (Modal) 邏輯
    // =========================================
    const readMoreBtns = document.querySelectorAll('.read-more');
    const noteModal = document.getElementById('noteDetailModal');
    const closeNoteModalBtn = document.getElementById('closeNoteModal');

    if (noteModal && closeNoteModalBtn) {
        readMoreBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault(); 
                noteModal.classList.add('show');
            });
        });

        closeNoteModalBtn.addEventListener('click', () => noteModal.classList.remove('show'));
        noteModal.addEventListener('click', (e) => {
            if (e.target === noteModal) noteModal.classList.remove('show');
        });
    }
    // =========================================
    // 5. 學習筆記：關鍵字搜尋與標籤過濾功能
    // =========================================
    const searchInput = document.querySelector('.search-box input');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const noteCards = document.querySelectorAll('.note-card');

    if (searchInput && noteCards.length > 0) {
        function filterNotes() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const activeTagBtn = document.querySelector('.filter-btn.active');
            const activeTag = activeTagBtn ? activeTagBtn.textContent.trim() : '全部筆記';

            noteCards.forEach(card => {
                const titleElement = card.querySelector('.note-title');
                const excerptElement = card.querySelector('.note-excerpt');
                const titleText = titleElement ? titleElement.textContent.toLowerCase() : '';
                const excerptText = excerptElement ? excerptElement.textContent.toLowerCase() : '';
                const searchableText = titleText + " " + excerptText;
                
                const categoryElement = card.querySelector('.note-category');
                const cardCategory = categoryElement ? categoryElement.textContent.trim() : '';

                const matchesSearch = searchableText.includes(searchTerm);
                const matchesTag = (activeTag === '全部筆記') || 
                                   (cardCategory.includes(activeTag)) || 
                                   (card.classList.contains('add-new-note') && activeTag === '全部筆記');

                if (matchesSearch && matchesTag) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        searchInput.addEventListener('input', filterNotes);

        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                filterNotes();
            });
        });
    }
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
    // 10. NCR 稽核發現報告彈窗控制與 PDF 匯出
    // =========================================
    const addNcrBtn = document.getElementById('addNcrBtn');
    const ncrModal = document.getElementById('ncrModal');
    const closeNcrModalBtn = document.getElementById('closeNcrModal');
    const cancelNcrBtn = document.getElementById('cancelNcrBtn');
    const ncrForm = document.getElementById('ncrForm');
    // 開啟按鈕
    if (addNcrBtn) {
        addNcrBtn.addEventListener('click', () => {
            if (ncrModal) {
                ncrModal.style.display = 'flex'; 
                ncrModal.classList.add('show');  
            }
        });
    }

    // 關閉邏輯
    const closeNcr = () => {
        if (ncrModal) {
            ncrModal.classList.remove('show'); 
            setTimeout(() => { ncrModal.style.display = 'none'; }, 300);
        }
        if (ncrForm) ncrForm.reset(); 
    };

    if (closeNcrModalBtn) closeNcrModalBtn.addEventListener('click', closeNcr);
    if (cancelNcrBtn) cancelNcrBtn.addEventListener('click', closeNcr);
    window.addEventListener('click', (e) => {
        if (e.target === ncrModal) closeNcr();
    });

    // 處理表單提交與 PDF 匯出 (新報告)
    if (ncrForm) {
        ncrForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const categorySelect = ncrForm.querySelectorAll('select')[0];
                const clauseSelect = ncrForm.querySelectorAll('select')[1];
                const severityRadio = ncrForm.querySelector('input[name="severity"]:checked');
                const observationText = ncrForm.querySelectorAll('textarea')[0].value;
                const actionText = ncrForm.querySelectorAll('textarea')[1].value;

                const categoryText = categorySelect.options[categorySelect.selectedIndex].text;
                const clauseText = clauseSelect.options[clauseSelect.selectedIndex].text;
                
                let severityText = '未標示';
                let severityColor = '#000';
                if (severityRadio) {
                    if (severityRadio.value === 'high') { severityText = '高風險 (High)'; severityColor = '#e74c3c'; }
                    if (severityRadio.value === 'medium') { severityText = '中風險 (Medium)'; severityColor = '#f39c12'; }
                    if (severityRadio.value === 'low') { severityText = '低風險 (Low)'; severityColor = '#27ae60'; }
                }

                

                const submitBtn = ncrForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 正在生成 PDF...';
                submitBtn.disabled = true;
//  終極修復：把模板拉回畫面，並強制解除隱藏！
                const element = document.getElementById('pdfReportTemplate');
                
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100vw';
                overlay.style.height = '100vh';
                overlay.style.background = 'rgba(28, 38, 56, 0.95)';
                overlay.style.zIndex = '99999';
                overlay.style.display = 'flex';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.style.color = 'white';
                overlay.style.fontSize = '24px';
                overlay.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 15px;"></i> 正在生成 PDF，請稍候...';
                document.body.appendChild(overlay);

                element.style.display = 'block'; 
                element.style.position = 'absolute';
                element.style.left = '0px';
                element.style.top = '0px';
                element.style.zIndex = '99998';

                const opt = {
                    margin: 0,
                    filename: `ISO學習筆記_${new Date().getTime()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, scrollY: 0, backgroundcolor: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a202c' : '#ffffff', useCORS: true },
                    jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
                };

                setTimeout(async () => {
                    try {
                        await html2pdf().set(opt).from(element).save();
                    } catch(e) {
                        console.error(e);
                    }
                    
                    element.style.display = 'none';
                    element.style.left = '-9999px';
                    if (document.body.contains(overlay)) document.body.removeChild(overlay);

                    alert(" 歷史筆記已成功匯出為 PDF 稽核報告！");

                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 500);
            } catch (error) {
                console.error("PDF 匯出失敗:", error);
                alert("匯出失敗，請重試！");
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

                                : 'rgba(255,255,255,0.1)'
                    },

                    angleLines: {

                        color:
                            document.documentElement
                                .getAttribute('data-theme') === 'light'

                                ? 'rgba(0,0,0,0.1)'

                                : 'rgba(255,255,255,0.1)'
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

                                : 'var(--text-color)'
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
                        background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a202c' : 'var(--text-color)'
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
    // 14. 雙重認證 (2FA) 開關介面邏輯 
    // =========================================
    const toggle2FA = document.getElementById('toggle2FA');
    
    if (toggle2FA) {
        // 🌟 頁面載入時，先抓取 LocalStorage 裡的登入者資料
        const currentUserStr = localStorage.getItem('currentUser');
        let user = null;
        
        if (currentUserStr) {
            user = JSON.parse(currentUserStr);
            console.log("目前登入者的狀態：", user);
            // 根據資料庫狀態，決定開關一開始要不要打開
            if (user.is_2fa_enabled) {
                toggle2FA.checked = true;
            }
        }

        toggle2FA.addEventListener('change', async function(e) {
            if (!user) {
                alert("找不到使用者資料，請重新登入！");
                e.target.checked = !e.target.checked;
                return;
            }

            const isChecked = e.target.checked;

            if (isChecked) {
                // 狀態：使用者想「開啟」2FA
                try {
                    // 1. 顯示載入中動畫
                    Swal.fire({
                        title: '產生專屬金鑰中...',
                        background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff',
                        didOpen: () => Swal.showLoading()
                    });

                    // 2. 向 Node.js 請求真實的 QR Code
                    const res = await fetch(`${API_BASE_URL}/api/2fa/generate?userId=${user.id}&email=${user.email}`);
                    const data = await res.json();

                    if (!data.success) throw new Error(data.message);

                    // 3. 顯示真實的 QR Code 讓使用者掃描
                    const { value: verificationCode, isConfirmed } = await Swal.fire({
                        title: '<i class="fa-solid fa-qrcode"></i> 設定雙重認證',
                        html: `
                            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px;">請打開 <strong>Google Authenticator</strong> 掃描下方條碼</p>
                            <img src="${data.qrCodeUrl}" style="border: 5px solid white; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 0 15px rgba(0, 168, 255, 0.4);">
                            <br>
                            <input type="text" id="swal-input-2fa" class="cyber-input" placeholder="請輸入 6 位數驗證碼" maxlength="6" style="text-align: center; font-size: 1.5rem; letter-spacing: 8px; font-weight: bold; width: 80%;">
                        `,
                        background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff',
                        showCancelButton: true,
                        confirmButtonColor: 'var(--primary-cyan)',
                        cancelButtonColor: 'transparent',
                        confirmButtonText: '驗證並啟用',
                        cancelButtonText: '取消',
                        customClass: { cancelButton: 'cyber-cancel-btn' },
                        preConfirm: () => {
                            const input = document.getElementById('swal-input-2fa').value;
                            if (!input || input.length !== 6 || isNaN(input)) {
                                Swal.showValidationMessage(' 請輸入有效的 6 位數字驗證碼！');
                                return false;
                            }
                            return input;
                        }
                    });

                    if (isConfirmed) {
                        // 4. 把使用者輸入的 6 位數，丟給 Node.js 進行嚴格比對
                        const verifyRes = await fetch(`${API_BASE_URL}/api/2fa/verify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id, token: verificationCode })
                        });
                        const verifyData = await verifyRes.json();

                        if (verifyData.success) {
                            Swal.fire({
                                icon: 'success', title: '2FA 已成功啟用！', text: '您的帳號防禦等級已提升。',
                                background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff', timer: 2500, showConfirmButton: false
                            });
                            // 更新前端記憶體，讓開關保持打開
                            user.is_2fa_enabled = true;
                            localStorage.setItem('currentUser', JSON.stringify(user));
                        } else {
                            Swal.fire({ icon: 'error', title: '驗證失敗', text: verifyData.message, background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff' });
                            e.target.checked = false; // 驗證失敗，開關退回關閉
                        }
                    } else {
                        e.target.checked = false; // 使用者按取消，開關退回關閉
                    }
                } catch (error) {
                    console.error(error);
                    Swal.fire({ icon: 'error', title: '錯誤', text: '無法連線到伺服器產生 QR Code', background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff' });
                    e.target.checked = false;
                }
            } else {
                // 🔘 狀態：使用者想「關閉」2FA
                const { isConfirmed } = await Swal.fire({
                    title: '確定要停用 2FA 嗎？', text: '停用後，您的帳號容易遭受惡意攻擊！', icon: 'warning',
                    background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff', showCancelButton: true,
                    confirmButtonColor: '#ff4757', cancelButtonColor: 'transparent', confirmButtonText: '強制停用', cancelButtonText: '保持啟用'
                });

                if (isConfirmed) {
                    // 向 Node.js 發送停用請求
                    try {
                        const disableRes = await fetch(`${API_BASE_URL}/api/2fa/disable`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id })
                        });
                        const disableData = await disableRes.json();

                        if (disableData.success) {
                            Swal.fire({ icon: 'info', title: '2FA 已停用', background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#1c2638', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#2d3748' : '#ffffff', timer: 2000, showConfirmButton: false });
                            user.is_2fa_enabled = false;
                            localStorage.setItem('currentUser', JSON.stringify(user));
                        } else {
                            alert("停用失敗：" + disableData.message);
                            e.target.checked = true;
                        }
                    } catch (err) {
                        alert("連線失敗");
                        e.target.checked = true;
                    }
                } else {
                    e.target.checked = true; 
                }
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
        "id": 2,
        "type": "TF",
        "q": "依據實體環境控制原則，交貨與裝卸貨區域（Delivery and loading areas）應與資訊處理設施嚴格隔離，以避免外部送貨員直接看見或進入安全區域。",
        "en_q": "According to physical environment control principles, delivery and loading areas should be strictly isolated from information processing facilities to prevent external delivery personnel from viewing or entering secure areas.",
        "ans": "true",
        "explanation": "根據 ISO 27001/27002 實體與環境安全原則，交貨與裝卸貨區域是外部人員與物資進入的緩衝區。為了防止未經授權的實體存取與機密資訊外洩，這些區域必須與資訊處理設施（如機房、辦公區）嚴格隔離，確保外部送貨員無法直接進入內部安全區域或看見敏感資訊。",
        "en_explanation": "According to the physical and environmental security principles of ISO 27001/27002, delivery and loading areas serve as buffer zones for external personnel and materials. To prevent unauthorized physical access and information leakage, these areas must be strictly isolated from information processing facilities (e.g., server rooms, office areas), ensuring that external delivery personnel cannot directly enter secure internal areas or view sensitive information."
    },
    {
        "id": 3,
        "type": "TF",
        "q": "員工離職時，僅需由 IT 部門撤銷其邏輯存取權限（如 VPN、Email），實體門禁卡因屬人資管轄，待其下週回公司辦手續時再收回即可。",
        "en_q": "When an employee resigns, only the IT department needs to revoke logical access (e.g., VPN, Email). Since physical access cards are managed by HR, they can be collected next week when the employee returns for paperwork.",
        "ans": "false",
        "explanation": "員工離職或終止聘用時，邏輯存取權限（系統、網路）與實體存取權限（門禁卡、鑰匙）必須「同時且立即」撤銷。若延遲收回實體門禁卡，離職員工可能在空窗期內惡意進入辦公室竊取資產或破壞設備，帶來巨大的實體安全風險。",
        "en_explanation": "When an employee resigns or their employment is terminated, both logical access (systems, network) and physical access (access cards, keys) must be revoked simultaneously and immediately. Delaying the collection of physical access cards leaves a vulnerability window where the former employee could maliciously enter the office to steal assets or damage equipment, posing a significant physical security risk."
    },
    {
        "id": 4,
        "type": "TF",
        "q": "在規劃實體周界時，即便機房已設置刷卡門禁，仍應考量防尾隨（Anti-tailgating）機制，避免未授權者緊跟授權者進入。",
        "en_q": "When planning physical perimeters, even if the server room has card access control, anti-tailgating mechanisms should still be considered to prevent unauthorized persons from following authorized personnel inside.",
        "ans": "true",
        "explanation": "刷卡門禁只能驗證持有卡片的人員身分，但無法防止「尾隨（Tailgating）」攻擊。未授權人員可能緊跟在合法授權員工身後進入機房，因此實體周界規劃必須考量防尾隨機制（如人員定員管制門、十字轉門或保全監控），以確保每次開門僅限一人通過。",
        "en_explanation": "Card access systems can only verify the identity of the cardholder but cannot prevent \"tailgating\" attacks. Unauthorized individuals could slip into the server room by closely following an authorized employee. Therefore, physical perimeter planning must include anti-tailgating mechanisms (such as mantrap doors, turnstiles, or security guard monitoring) to ensure only one person enters per door opening."
    },
    {
        "id": 6,
        "type": "TF",
        "q": "存取權限的定期審查（Access review）不僅包含應用程式的帳號密碼，也必須包含「實體機房門禁卡」的核准名單清查。",
        "en_q": "Periodic access reviews must include not only application accounts and passwords but also the approved list for physical server room access cards.",
        "ans": "true",
        "explanation": "存取權限審查（Access review）的核心目的是確保「最小權限原則」。隨著人員調動或離職，實體機房的存取需求會改變。因此，不僅是系統邏輯權限，實體門禁卡的授權名單也必須定期清查，以註銷不再需要進出機房人員的權限。",
        "en_explanation": "The core purpose of access reviews is to ensure the \"principle of least privilege.\" As personnel transfer or leave, their need for physical server room access changes. Therefore, in addition to logical system privileges, the authorization lists for physical access cards must be periodically reviewed and audited to revoke access for those who no longer need to enter the server room."
    },
    {
        "id": 7,
        "type": "TF",
        "q": "伺服器設備如需移出辦公室進行外部維修，只要該設備的管理負責人當下口頭同意即可，為求效率無須填寫設備攜出單。",
        "en_q": "If server equipment needs to be moved out of the office for external repair, verbal consent from the equipment manager is sufficient; to ensure efficiency, no equipment removal form is required.",
        "ans": "false",
        "explanation": "根據 ISO 資產與實體安全管理規範，任何資訊設備（特別是伺服器）移出組織實體周界前，都必須經過正式的授權與記錄程序（如填寫設備攜出單）。口頭同意無法留下稽核軌跡，若設備遺失或資料外洩，將無法追溯責任與確認設備狀態。",
        "en_explanation": "According to ISO asset and physical security management standards, any information equipment (especially servers) moved outside the organization's physical perimeter must undergo a formal authorization and recording process (such as an equipment removal form). Verbal consent leaves no audit trail; if the equipment is lost or data is breached, it becomes impossible to trace accountability or verify the equipment's status."
    },
    {
        "id": 8,
        "type": "TF",
        "q": "針對高度機密的安全區域（如核心資料中心），即使是編制內的清潔人員，也必須在授權技術人員的監督下才能進入打鎖。",
        "en_q": "For highly confidential secure areas (like core data centers), even internal cleaning staff must be supervised by authorized technical personnel when entering to perform duties.",
        "ans": "true",
        "explanation": "核心資料中心存放企業關鍵系統與機敏數據，實體安全要求極高。清潔人員通常不具備高權限的資安查核背景，若允許其單獨進入，可能有誤觸設備或遭受社交工程利用的風險。因此，非授權技術人員進入時，必須由授權人員全程監督。",
        "en_explanation": "Core data centers house critical enterprise systems and sensitive data, requiring the highest level of physical security. Cleaning staff typically do not have high-level security clearance. Allowing them to enter unaccompanied poses risks of accidental equipment disruption or vulnerability to social engineering. Therefore, any non-authorized technical personnel must be fully supervised by authorized staff while inside."
    },
    {
        "id": 10,
        "type": "TF",
        "q": "資訊安全認知教育訓練的內容，應明確包含員工若違反公司資安政策時，公司將依法或依規採取的懲處程序（Disciplinary process）。",
        "en_q": "Information security awareness training should explicitly cover the disciplinary process the company will take according to laws or regulations if an employee violates security policies.",
        "ans": "true",
        "explanation": "ISO 27001 要求人員安全控制措施必須包含懲戒程序（Disciplinary process）。在資安教育訓練中宣導懲處程序，能有效提高員工對資安規定的重視程度，達到嚇阻違規行為的作用，並在實際發生違規時具備正當的處置依據。",
        "en_explanation": "ISO 27001 requires personnel security controls to include a disciplinary process. Communicating these disciplinary procedures during security awareness training effectively emphasizes the importance of security policies, deters violations, and provides a justified basis for action if a breach occurs."
    },
    {
        "id": 11,
        "type": "TF",
        "q": "為彰顯管理階層的彈性，總經理與副總級別的辦公室可以完全豁免「實體安全防護」與「桌面螢幕淨空」的稽核要求。",
        "en_q": "To demonstrate management flexibility, the offices of the General Manager and Vice Presidents can be completely exempted from \"physical security\" and \"clear desk/screen\" audit requirements.",
        "ans": "false",
        "explanation": "資訊安全政策必須一體適用，高階主管通常接觸並掌握公司最高機密（如財務報表、併購計畫），其辦公室若缺乏實體防護或未落實桌面/螢幕淨空，機密外洩的風險與衝擊反而更大。因此，管理階層絕不可豁免資安稽核要求。",
        "en_explanation": "Information security policies must apply universally. Senior executives typically access the company's highest secrets (e.g., financial reports, M&A plans). If their offices lack physical protection or fail to enforce clear desk/screen policies, the risk and impact of a data breach are significantly higher. Therefore, management must never be exempted from security audit requirements."
    },
    {
        "id": 12,
        "type": "TF",
        "q": "若公司採用「共享辦公空間（Co-working space）」，因缺乏實體牆壁周界，應強制採用防窺片、上鎖抽屜等補償性控制措施來保護資產。",
        "en_q": "If the company uses a \"co-working space\", compensating controls like privacy filters and lockable drawers must be mandated to protect assets due to the lack of physical wall perimeters.",
        "ans": "true",
        "explanation": "在共享辦公空間中，傳統的實體周界（如獨立辦公室門禁、實體牆壁）已不存在，外部人員極易接近員工。為了彌補這層安全防護的缺失，必須實施補償性控制（Compensating controls），如螢幕防窺片、設備上鎖與嚴格的桌面淨空，以防範偷窺與實體竊盜。",
        "en_explanation": "In co-working spaces, traditional physical perimeters (e.g., independent office doors, solid walls) do not exist, making it easy for outsiders to approach employees. To compensate for this lack of physical security, compensating controls—such as screen privacy filters, locking equipment, and strict clear desk policies—must be implemented to prevent shoulder surfing and physical theft."
    },
    {
        "id": 13,
        "type": "TF",
        "q": "員工出差在咖啡廳工作時，只要筆電有設定開機密碼，即使短暫去洗手間將筆電單獨留在桌上，也不算違反實體安全規範。",
        "en_q": "When an employee works at a cafe during a business trip, as long as the laptop has a boot password, leaving it unattended on the table briefly to use the restroom does not violate physical security guidelines.",
        "ans": "false",
        "explanation": "即使筆電有開機密碼，在公共場所（如咖啡廳）將設備無人看管地留在桌上，極容易遭到實體竊盜（整台筆電被偷走）。開機密碼只能防止直接登入，無法防止設備遺失造成的資產損失與潛在的硬碟破解風險，此行為嚴重違反實體安全規範。",
        "en_explanation": "Even with a boot password, leaving a device unattended in a public place (like a cafe) makes it highly susceptible to physical theft. A password only prevents direct login; it does not prevent the loss of the physical asset or potential offline hard drive cracking. This behavior is a severe violation of physical security guidelines."
    },
    {
        "id": 14,
        "type": "TF",
        "q": "備份磁帶或硬碟在運送至異地備援中心的過程中，應使用上鎖容器或加密技術，以防止半途發生資料外洩（Data Breach）。",
        "en_q": "Backup tapes or hard drives being transported to an off-site recovery center should use locked containers or encryption technologies to prevent data breaches in transit.",
        "ans": "true",
        "explanation": "實體媒體在運送過程中（Transit）是最脆弱的環節之一，容易遭受遺失、攔截或竊取。根據 ISO 標準，運送機敏資料的實體媒體時，必須採取適當的保護措施，包括使用防破壞的上鎖容器以及將資料強加密，確保即使實體遺失，資料也不會外洩。",
        "en_explanation": "Physical media in transit is one of the most vulnerable links and is susceptible to loss, interception, or theft. According to ISO standards, transporting physical media containing sensitive data requires adequate protection, including tamper-evident locked containers and strong data encryption, ensuring that even if the physical asset is lost, the data remains secure."
    },
    {
        "id": 15,
        "type": "TF",
        "q": "因為行銷與總機人員平常接觸不到後端伺服器，因此在「人員控制」中，他們無須被要求簽署資安保密協議。",
        "en_q": "Since marketing and reception personnel usually do not access backend servers, they are not required to sign information security NDAs under \"personnel controls\".",
        "ans": "false",
        "explanation": "企業內的所有員工，無論職位為何，都可能接觸到某種程度的機敏資訊（如客戶名單、內部通訊錄、來訪貴賓資訊）。保密協議（NDA）是確保所有人員理解其保密義務的法律基礎，因此，全體員工在到職時都必須簽署，沒有例外。",
        "en_explanation": "All employees within an enterprise, regardless of their role, may access some level of sensitive information (e.g., customer lists, internal directories, VIP visitor logs). A Non-Disclosure Agreement (NDA) is the legal foundation ensuring all personnel understand their confidentiality obligations. Therefore, all employees must sign an NDA upon hiring, without exception."
    },
    {
        "id": 16,
        "type": "TF",
        "q": "背景查核（Screening）不應一視同仁，而是應依據該職位即將接觸的「資訊機密等級與系統風險」來決定查核的深度。",
        "en_q": "Background screening should not be uniform; rather, the depth of the check should be determined by the \"information confidentiality level and system risk\" the position will encounter.",
        "ans": "true",
        "explanation": "根據 ISO 27002 人員安全指南，背景查核應符合比例原則（Proportionality）。接觸極機密資料或具備系統最高權限的職位（如系統管理員、財務長），其背景查核必須比一般行政人員更為嚴格和深入，以有效管控內部威脅風險。",
        "en_explanation": "According to ISO 27002 personnel security guidelines, background screening should be proportionate to the business requirements and acceptable risks. Positions accessing highly confidential data or possessing ultimate system privileges (e.g., System Administrators, CFOs) require stricter and deeper background checks than general administrative staff to effectively manage insider threats."
    },
    {
        "id": 17,
        "type": "TF",
        "q": "為了方便日後更換，機房內高架地板下的網路佈線（Cabling）可以不加貼標籤標示，只要負責的資深工程師自己記得線路走向即可。",
        "en_q": "To facilitate future replacements, network cabling under raised floors in server rooms does not need labeling, as long as the responsible senior engineer remembers the cable routes.",
        "ans": "false",
        "explanation": "依賴單一工程師的記憶會產生嚴重的單點故障（Single Point of Failure）風險，若該工程師離職或休假，將導致線路無法維護或發生接線錯誤。ISO 規範要求所有佈線應有清楚且一致的標籤標示與文件紀錄，以確保維護的正確性與實體安全性。",
        "en_explanation": "Relying on a single engineer's memory creates a severe Single Point of Failure. If the engineer resigns or is on leave, cables become unmaintainable or prone to patching errors. ISO standards require all cabling to have clear, consistent labeling and documented records to ensure accurate maintenance and physical security."
    },
    {
        "id": 18,
        "type": "TF",
        "q": "在建置機房時，電源線與通訊纜線應盡可能分開鋪設或採取實體隔離，以避免電磁干擾（EMI）與潛在的實體線路竊聽風險。",
        "en_q": "When building a server room, power cables and communication cables should be laid separately or physically isolated to avoid electromagnetic interference (EMI) and potential physical wiretapping risks.",
        "ans": "true",
        "explanation": "電源線在傳輸電流時會產生電磁場，若與通訊網路線靠得太近，會引發電磁干擾（EMI），導致網路封包遺失或傳輸不穩。此外，分開鋪設也有助於防止有心人士利用電磁外洩進行訊號竊聽，這是佈線安全（Cabling security）的標準作法。",
        "en_explanation": "Power cables generate electromagnetic fields when transmitting current. If laid too close to communication cables, they can cause Electromagnetic Interference (EMI), leading to packet loss or unstable transmissions. Furthermore, separate routing helps prevent threat actors from exploiting electromagnetic emissions for signal eavesdropping, which is a standard practice in cabling security."
    },
    {
        "id": 20,
        "type": "TF",
        "q": "實體與環境安全防護不僅在防範人為惡意入侵，同時也應包含對火災、水災、地震等自然災害的防護與監測措施。",
        "en_q": "Physical and environmental security protection is not only about preventing malicious human intrusions but should also include protection and monitoring measures against natural disasters like fires, floods, and earthquakes.",
        "ans": "true",
        "explanation": "資訊安全不僅關注機密性（Confidentiality），也高度重視可用性（Availability）。火災、漏水或地震等自然與環境威脅，皆可瞬間摧毀 IT 基礎設施。因此，實體與環境安全必須涵蓋防火、防水、溫濕度監控及抗震等防災與監測機制。",
        "en_explanation": "Information security focuses not only on Confidentiality but also heavily on Availability. Natural and environmental threats like fires, leaks, or earthquakes can instantly destroy IT infrastructure. Therefore, physical and environmental security must encompass disaster prevention and monitoring mechanisms, such as fire suppression, water detection, temperature/humidity monitoring, and seismic bracing."
    },
    {
        "id": 21,
        "type": "TF",
        "q": "在機房（Secure areas）內進行設備查修時，只要鏡頭沒有刻意對準伺服器螢幕上的機密代碼，技師就可以自由使用手機全程錄影。",
        "en_q": "When inspecting equipment in secure areas, technicians can freely record the entire process using their phones, provided the camera is not deliberately aimed at confidential code on server screens.",
        "ans": "false",
        "explanation": "機房屬於高度安全區域（Secure areas），內部可能包含機密設備配置、網路拓撲或未受保護的實體資訊。自由錄影極易無意間拍到敏感資訊，違反機密性原則。通常機房內嚴格禁止未經授權的攝影及錄音設備，即便需要記錄，也必須經過嚴格的申請與審查。",
        "en_explanation": "Server rooms are highly secure areas that may expose confidential equipment configurations, network topologies, or unprotected physical data. Freely recording video can easily capture sensitive information unintentionally, violating the principle of confidentiality. Generally, unauthorized photographic and recording equipment is strictly prohibited in secure areas; any required recording must go through a strict approval and review process."
    },
    {
        "id": 22,
        "type": "TF",
        "q": "當員工內部輪調（從業務部轉至研發部）時，其舊有部門的系統權限與實體門禁權限應立即被觸發審查，並移除不必要的存取權。",
        "en_q": "When an employee transfers internally (e.g., from Sales to R&D), their system permissions and physical access rights from the old department should trigger an immediate review, removing unnecessary access.",
        "ans": "true",
        "explanation": "員工內部輪調是權限潛變（Privilege Creep）最常發生的原因。若未即時撤銷舊部門的權限，員工將累積過多不必要的存取權，違反「最小權限原則」與「權責分立」。因此，人事異動必須自動觸發存取權限審查，移除不再適用的實體與邏輯權限。",
        "en_explanation": "Internal employee transfers are the most common cause of Privilege Creep. If permissions from the old department are not promptly revoked, the employee accumulates unnecessary access rights, violating the \"principle of least privilege\" and \"segregation of duties.\" Therefore, personnel changes must automatically trigger access reviews to remove physical and logical privileges that are no longer applicable."
    },
    {
        "id": 23,
        "type": "TF",
        "q": "測試用的 USB 隨身碟裝因為沒有存放真實客戶的正式資料，所以在專案結束後，可以直接格式化一次並丟入一般垃圾桶。",
        "en_q": "Since testing USB drives do not store real formal customer data, they can simply be formatted once and thrown into regular trash bins after the project ends.",
        "ans": "false",
        "explanation": "測試用隨身碟可能包含系統架構、測試用原始碼、網路配置等公司內部敏感資訊，且一般的「快速格式化」無法徹底清除資料，有心人士可輕易還原。所有儲存媒體在廢棄前，都必須經過安全抹除（Secure Wiping）或實體破壞程序，不可隨意丟棄。",
        "en_explanation": "Testing USB drives may contain internal sensitive information such as system architectures, test source code, and network configurations. A standard \"quick format\" does not permanently erase data, allowing threat actors to easily recover it. All storage media must undergo secure wiping or physical destruction processes before disposal and must never be thrown into regular trash."
    },
    {
        "id": 24,
        "type": "TF",
        "q": "稽核時若發現門禁讀卡機外殼有被撬開或異常接線的痕跡，不論是否真的遭入侵，都應立即視為重大實體資安事件進行通報與調查。",
        "en_q": "During an audit, if a card reader enclosure shows signs of prying or abnormal wiring, it should immediately be treated as a major physical security incident for reporting and investigation, regardless of whether a breach actually occurred.",
        "ans": "true",
        "explanation": "門禁讀卡機被撬開或有異常接線，是典型的實體破壞或側錄攻擊（如接上擷取器竊取卡片資料）跡象。即便當下無法確認是否已有未授權者進入，這已構成實體防線被妥協的嚴重威脅，必須立即啟動資安事件通報程序進行全面調查與防堵。",
        "en_explanation": "A pried open card reader or abnormal wiring are classic signs of physical tampering or skimming attacks (e.g., attaching a skimmer to steal card data). Even if it cannot be immediately confirmed whether unauthorized access occurred, this constitutes a severe compromise of physical defenses. It must immediately trigger an incident response protocol for comprehensive investigation and containment."
    },
    {
        "id": 27,
        "type": "MC",
        "q": "在規劃「辦公室實體安全周界」時，下列哪一種補償性控制措施（Compensating Control）最適合用來彌補「全透明玻璃會議室」的機密外洩風險？",
        "en_q": "When planning \"office physical perimeters,\" which compensating control best mitigates the confidentiality leakage risk of a \"fully transparent glass conference room\"?",
        "options": {
            "A": "A. 在會議室外設立指紋辨識門禁與金方探測門。",
            "B": "B. 在會議室玻璃上加裝防窺霧面貼膜或百葉窗，並嚴格要求會議後擦拭白板。",
            "C": "C. 強制要求所有進入會議室的員工交出手機集中保管。"
        },
        "en_options": {
            "A": "A. Install fingerprint access and metal detectors outside the room.",
            "B": "B. Apply frosted privacy films or blinds on the glass, and strictly require erasing whiteboards after meetings.",
            "C": "C. Mandate all employees entering the room to hand over their phones for centralized storage."
        },
        "ans": "B",
        "explanation": "全透明玻璃會議室最大的資安風險在於「視覺外洩（Visual eavesdropping）」，外部人員可輕易看見投影幕或白板上的機密資訊。加上防窺霧面貼膜或百葉窗可有效阻斷視線，而會後擦拭白板則是確保資訊不殘留的標準作業程序，這是最直接且有效的補償性控制。選項 A 與 C 過於極端且無法解決「看見」的問題。",
        "en_explanation": "The primary security risk of a fully transparent glass conference room is \"visual eavesdropping,\" where outsiders can easily see confidential information on projectors or whiteboards. Applying frosted privacy films or blinds effectively blocks the line of sight, and erasing whiteboards is a standard procedure to prevent residual information. This is the most direct and effective compensating control. Options A and C are too extreme and do not solve the visual exposure issue."
    },
    {
        "id": 28,
        "type": "MC",
        "q": "當執行員工的「終止聘用（離職）」程序時，從資安稽核的角度來看，下列何者應被列為「最優先」的執行事項？",
        "en_q": "When executing the \"termination of employment\" process, from an IT security audit perspective, which of the following should be prioritized?",
        "options": {
            "A": "A. 同步撤銷其邏輯存取權限（系統帳號）與實體存取權限（門禁卡）。",
            "B": "B. 確保該員工完成所有未結案的工作交接報告。",
            "C": "C. 結算該員工當月的特休假與績效獎金。"
        },
        "en_options": {
            "A": "A. Simultaneously revoke their logical access (system accounts) and physical access (access cards).",
            "B": "B. Ensure the employee completes all pending handover reports.",
            "C": "C. Settle the employee's PTO and performance bonuses for the month."
        },
        "ans": "A",
        "explanation": "在員工離職流程中，最大的資安風險是離職員工利用原有權限竊取資料或破壞系統（尤其是非自願離職者）。因此，從資安稽核的角度，最優先的事項是「立即且同步撤銷所有的邏輯與實體存取權限」，以阻斷任何未授權存取的可能。交接與結算薪資屬於行政流程，順位在權限撤銷之後。",
        "en_explanation": "During the employee termination process, the greatest security risk is the departing employee using their existing privileges to steal data or sabotage systems (especially in involuntary terminations). Therefore, from a security audit perspective, the absolute priority is \"immediately and simultaneously revoking all logical and physical access rights\" to block any potential unauthorized access. Handover and payroll settlement are administrative procedures that follow access revocation."
    },
    {
        "id": 30,
        "type": "MC",
        "q": "關於「設備安置與保護」，稽核員巡視辦公室時發現下列何種情況，應立即開立缺失單（NCR）？",
        "en_q": "Regarding \"Equipment Siting and Protection,\" which scenario found during an office tour should prompt an immediate Non-Conformance Report (NCR)?",
        "options": {
            "A": "A. 將存放核心數據的 NAS 伺服器，直接擺放在靠近一樓臨街玻璃窗旁的層架上。",
            "B": "B. 在核心機房內安裝了氣體式滅火設備（FM-200）取代傳統撒水系統。",
            "C": "C. 將網路印表機放置在需要刷卡才能進入的員工專屬 OA 辦公區內。"
        },
        "en_options": {
            "A": "A. Placing the core data NAS server on a shelf right next to a street-facing glass window on the ground floor.",
            "B": "B. Installing FM-200 gas fire suppression systems in the core server room instead of traditional sprinklers.",
            "C": "C. Placing a network printer in an employee-only OA area requiring card access."
        },
        "ans": "A",
        "explanation": "核心數據 NAS 伺服器放置在靠近一樓臨街玻璃窗旁，極易遭受外部人員的窺視、實體破壞，甚至直接打破玻璃竊取（Smash and grab）。根據 ISO 規範，關鍵 IT 設備應安置在安全的內部區域，避免非授權存取與環境破壞。B 為正確的機房滅火防護，C 放置在需刷卡的員工區是合理的。",
        "en_explanation": "Placing a core data NAS server near a ground-floor, street-facing window makes it highly vulnerable to snooping, physical vandalism, and \"smash and grab\" theft. According to ISO standards, critical IT equipment should be sited in secure internal areas to avoid unauthorized access and environmental damage. Option B is a correct fire suppression practice, and Option C is reasonable since the printer is in a card-controlled employee area."
    },
    {
        "id": 31,
        "type": "MC",
        "q": "下列何者屬於「防範環境威脅」中，針對水災或漏水風險的有效實體控制措施？",
        "en_q": "Which of the following is an effective physical control measure against flood or leakage risks under \"Protection from environmental threats\"?",
        "options": {
            "A": "A. 將伺服器機櫃全面改用防火塗料。",
            "B": "B. 在機房建置雙備援的空調系統與不斷電系統 (UPS)。",
            "C": "C. 機房底層安裝高架地板，並於地板下配置漏水偵測感知線纜。"
        },
        "en_options": {
            "A": "A. Applying fireproof coatings entirely to server racks.",
            "B": "B. Deploying dual-redundant HVAC and UPS systems in the server room.",
            "C": "C. Installing raised floors in the server room with water leakage detection cables placed underneath."
        },
        "ans": "C",
        "explanation": "機房安裝高架地板可以讓設備遠離地面，避免積水直接浸泡伺服器；同時在地板下配置漏水偵測感知線纜，能在空調漏水或外部滲水初期發出警報，是防範水災/漏水最標準且有效的實體控制措施。A 和 B 主要是針對火災與電力中斷的防護。",
        "en_explanation": "Installing raised floors elevates equipment above the ground, preventing direct submersion in water; placing water leakage detection cables underneath provides early warnings for HVAC leaks or external seepage. This is the standard and most effective physical control against flood/leak risks. Options A and B address fire and power outage risks, respectively."
    },
    {
        "id": 33,
        "type": "MC",
        "q": "稽核員發現公司櫃台抽屜放有 3 張無記名的「公用門禁卡」，專供忘記帶卡的員工自行簽名借用。此作法最大的資安風險為何？",
        "en_q": "An auditor finds 3 anonymous \"public access cards\" in the reception desk for employees who forget their badges to sign out. What is the biggest security risk here?",
        "options": {
            "A": "A. 破壞了存取控制的「不可否認性（Non-repudiation）」，無法追蹤真實進出者。",
            "B": "B. 增加了櫃檯行政人員管理卡片的時間成本。",
            "C": "C. 公用卡片容易因為頻繁刷卡而導致晶片提早損壞。"
        },
        "en_options": {
            "A": "A. It destroys the \"non-repudiation\" of access controls, making it impossible to trace the actual entrants.",
            "B": "B. It increases the time cost for administrative staff to manage the cards.",
            "C": "C. Public cards are prone to premature chip damage due to frequent swiping."
        },
        "ans": "A",
        "explanation": "存取控制的核心原則之一是「不可否認性（Non-repudiation）與可追溯性（Accountability）」。無記名的公用門禁卡允許多人共用同一組識別碼，系統紀錄無法辨識真實進出的個體。若發生實體安全事件，將無法追蹤是誰持卡進入，徹底破壞了稽核軌跡。",
        "en_explanation": "A core principle of access control is \"Non-repudiation and Accountability.\" Anonymous public access cards allow multiple people to share the same credential, meaning system logs cannot identify the actual individual entering. In a physical security incident, it becomes impossible to trace who used the card, completely destroying the audit trail."
    },
    {
        "id": 34,
        "type": "MC",
        "q": "當公司將含有機敏資料的實體伺服器硬碟汰換並準備報廢時，應採取何種防範資料外洩的最終措施？",
        "en_q": "When retiring and disposing of physical server hard drives containing sensitive data, what ultimate measure should be taken to prevent data leakage?",
        "options": {
            "A": "A. 在作業系統內將檔案丟入資源回收桶並清空即可。",
            "B": "B. 實施實體破壞（如物理鑽孔、消磁）或使用合規軟體進行多次覆寫抹除（Wiping）。",
            "C": "C. 將硬碟重新格式化（Quick Format）後，以二手價賣給回收廠商。"
        },
        "en_options": {
            "A": "A. Just moving the files to the recycle bin within the OS and emptying it.",
            "B": "B. Implementing physical destruction (e.g., drilling, degaussing) or using compliant software for multiple wipe passes.",
            "C": "C. Performing a Quick Format and selling it secondhand to recyclers."
        },
        "ans": "B",
        "explanation": "硬碟中若含機敏資料，簡單的刪除或快速格式化都可輕易透過救援軟體還原。為了徹底防止資料外洩，必須對儲存媒體進行「安全抹除（Secure Wiping，如 DoD 5220.22-M 標準）」或「實體破壞（如消磁 Degaussing、鑽孔或絞碎）」，確保資料永遠無法被復原。",
        "en_explanation": "If hard drives contain sensitive data, simple deletions or quick formats can be easily reversed using recovery software. To completely prevent data leakage, storage media must undergo \"Secure Wiping (e.g., DoD 5220.22-M standard)\" or \"Physical Destruction (e.g., degaussing, drilling, or shredding)\" to ensure data is permanently unrecoverable."
    },
    {
        "id": 36,
        "type": "MC",
        "q": "關於資安「保密協議(NDA)」的法律與稽核實務，下列敘述何者最為準確？",
        "en_q": "Regarding the legal and audit practices of \"Non-Disclosure Agreements (NDA)\", which statement is most accurate?",
        "options": {
            "A": "A. 僅在員工任職期間有效，只要員工辦理離職手續，保密責任即自動解除。",
            "B": "B. 不僅在職期間有效，通常會規範員工或廠商在離職/解約後之一段時間內，仍需負保密義務。",
            "C": "C. 只要員工口頭發誓不會洩漏公司機密，即可取代紙本或電子的 NDA 簽署。"
        },
        "en_options": {
            "A": "A. It is valid only during employment; confidentiality responsibilities are automatically waived upon resignation.",
            "B": "B. It is valid during employment and usually mandates confidentiality obligations for a period after resignation/termination.",
            "C": "C. Verbal promises not to leak company secrets can replace physical or electronic NDA signatures."
        },
        "ans": "B",
        "explanation": "實務上，保密協議（NDA）的效力不限於員工在職期間。為了保護公司的商業機密與智慧財產權，NDA 通常會明文約定在員工離職或合約終止後的特定期間內（甚至無限期），當事人仍須負擔保密義務。口頭承諾不具法律強制力且無法稽核。",
        "en_explanation": "In practice, the validity of a Non-Disclosure Agreement (NDA) is not limited to the duration of employment. To protect company trade secrets and intellectual property, NDAs typically specify that confidentiality obligations persist for a certain period (or indefinitely) after resignation or contract termination. Verbal promises lack legal enforceability and cannot be audited."
    },
    {
        "id": 37,
        "type": "MC",
        "q": "下列何種情況屬於「社交工程（Social Engineering）」的『實體面』攻擊手法？",
        "en_q": "Which scenario constitutes a \"physical\" attack technique of Social Engineering?",
        "options": {
            "A": "A. 駭客利用系統漏洞，從外部網路植入勒索軟體加密伺服器。",
            "B": "B. 發送大量偽造的銀行中獎信件誘騙使用者點擊網址。",
            "C": "C. 攻擊者穿著知名快遞公司的制服，抱著大箱子要求櫃台人員代為刷卡開門進入辦公區。"
        },
        "en_options": {
            "A": "A. Hackers exploiting a system vulnerability to inject ransomware via the external network.",
            "B": "B. Sending massive fake bank lottery emails to trick users into clicking URLs.",
            "C": "C. An attacker wearing a famous courier uniform holding a large box, asking the receptionist to badge them in."
        },
        "ans": "C",
        "explanation": "社交工程是利用人性弱點（如同情心、信任、恐懼）來獲取權限。選項 C 中，攻擊者偽裝成快遞人員，利用抱著大箱子不方便拿卡的「同情心」情境，誘使櫃台人員幫忙開門，這是典型的「實體社交工程（如尾隨或冒充身分）」手法。A 與 B 屬於網路與電子郵件層面的技術攻擊。",
        "en_explanation": "Social Engineering exploits human psychology (like empathy, trust, or fear) to gain access. In Option C, the attacker disguises as a courier and uses the \"empathy\" of holding a large box to trick the receptionist into opening the door. This is a classic \"physical social engineering\" technique (like tailgating or impersonation). Options A and B are technical attacks via network and email vectors."
    },
    {
        "id": 39,
        "type": "MC",
        "q": "稽核員發現某部門的「機密文件專用碎紙機」被放置在大樓外側的公共電梯口旁，這會帶來什麼重大的管理風險？",
        "en_q": "An auditor finds a department's \"Confidential Document Shredder\" placed near the public elevator lobby. What major management risk does this pose?",
        "options": {
            "A": "A. 碎紙機運轉聲音太大，會干擾等電梯的訪客。",
            "B": "B. 機密文件在等待排隊銷毀的過程中，極易遭搭乘電梯的外部人員順手牽羊竊取。",
            "C": "C. 會導致大樓公共區域的電費異常增加。"
        },
        "en_options": {
            "A": "A. The shredder noise might disturb visitors waiting for the elevator.",
            "B": "B. Confidential documents waiting to be destroyed are highly vulnerable to being snatched by external personnel using the elevator.",
            "C": "C. It will cause an abnormal increase in the building's public electricity bill."
        },
        "ans": "B",
        "explanation": "機密文件在放進碎紙機銷毀前，通常會暫存在回收箱或堆疊在旁邊。若將碎紙機放置在公共電梯口等非管制區域，任何人（包括訪客、外部快遞）都可以輕易接觸到這些等待銷毀的機密文件，大幅增加實體資料被竊取的風險。碎紙機應放置於受門禁管制的內部區域。",
        "en_explanation": "Confidential documents are often temporarily stored in bins or stacked nearby before being shredded. Placing the shredder in a non-restricted area like a public elevator lobby allows anyone (including visitors and external couriers) to easily access these pending-destruction documents, massively increasing the risk of physical data theft. Shredders should be located in access-controlled internal areas."
    },
    {
        "id": 40,
        "type": "MC",
        "q": "下列哪一項屬於「人員控制 (Clause 6)」中「聘用條款及條件」必須白紙黑字涵蓋的核心內容？",
        "en_q": "Which of the following is core content that must be explicitly covered in writing under \"Terms and conditions of employment\" in Personnel Controls (Clause 6)?",
        "options": {
            "A": "A. 詳細列出公司未來五年內的產品開發 Roadmap。",
            "B": "B. 明確定義員工保護資訊資產的責任，以及違反政策時的懲戒程序（Disciplinary process）。",
            "C": "C. 強制規定員工每年必須官方參加兩次以上的國內外員工旅遊。"
        },
        "en_options": {
            "A": "A. Detailed listing of the company's 5-year product development roadmap.",
            "B": "B. Clear definition of employee responsibilities for protecting info assets and disciplinary processes for policy violations.",
            "C": "C. Mandating employees to officially attend two or more domestic/international company trips annually."
        },
        "ans": "B",
        "explanation": "根據 ISO 27001 人員安全規範，「聘用條款及條件（Terms and conditions of employment）」必須在合約中明確寫出員工對資訊安全的職責與義務，包含保密要求、遵守資安政策，以及違反政策時將面臨的紀律與懲戒程序（Disciplinary process），使雙方在法律上有明確共識。",
        "en_explanation": "According to ISO 27001 personnel security guidelines, the \"Terms and conditions of employment\" must explicitly document the employee's information security responsibilities and obligations in the contract. This includes confidentiality requirements, adherence to security policies, and the disciplinary processes they will face if policies are violated, ensuring a clear legal consensus between both parties."
    },
    {
        "id": 41,
        "type": "MC",
        "q": "為了防範火災，伺服器機房內通常會設置「FM-200 或 Novec 1230 等氣體滅火系統」，而不是傳統的撒水系統。這考量了哪一項資安原則？",
        "en_q": "To prevent fires, server rooms typically install gas suppression systems (like FM-200) instead of traditional sprinklers. Which security principle does this address?",
        "options": {
            "A": "A. 氣體滅火系統的建置成本比撒水系統便宜。",
            "B": "B. 氣體比較不會破壞人體健康。",
            "C": "C. 保護極具價值的 IT 設備免受水患造成的二次物理性永久破壞。"
        },
        "en_options": {
            "A": "A. Gas systems are cheaper to build than sprinkler systems.",
            "B": "B. Gases are less harmful to human health.",
            "C": "C. Protecting highly valuable IT equipment from secondary, permanent physical damage caused by water floods."
        },
        "ans": "C",
        "explanation": "機房內充滿昂貴且關鍵的電子設備，若發生火警時使用傳統的撒水系統，即使撲滅了火勢，大量的水也會對伺服器與電路板造成不可逆的物理短路與損壞。使用無水氣體滅火系統（如 FM-200）能有效滅火，同時保護 IT 設備免受「水患」帶來的二次物理性損壞，確保可用性。",
        "en_explanation": "Server rooms are filled with expensive and critical electronic equipment. If traditional water sprinklers are used during a fire, the massive amount of water will cause irreversible short circuits and physical damage to servers and motherboards, even if the fire is put out. Using waterless gas suppression systems (like FM-200) effectively extinguishes fires while protecting IT equipment from secondary physical damage caused by \"water floods,\" ensuring availability."
    },
    {
        "id": 42,
        "type": "MC",
        "q": "某員工收到一封標題為「【緊急警告】您的信箱容量已滿，請點擊驗證升級」的信件，該員工最符合資安意識的動作是？",
        "en_q": "An employee receives an email titled \"[URGENT] Mailbox full, click to verify and upgrade.\" What is the most security-conscious response?",
        "options": {
            "A": "A. 保持冷靜不點擊任何連結，將信件作為附件通報給資訊安全或 IT 單位分析。",
            "B": "B. 先點擊連結看看是不是真的跳到公司的登入網頁，確認是假的再關掉。",
            "C": "C. 直接回信給寄件者，痛罵對方是詐騙集團。"
        },
        "en_options": {
            "A": "A. Stay calm, do not click any links, and report the email as an attachment to IT or InfoSec for analysis.",
            "B": "B. Click the link first to see if it leads to the company login page, and close it if fake.",
            "C": "C. Reply directly to the sender scolding them for being a scam group."
        },
        "ans": "A",
        "explanation": "這是一封典型的「釣魚郵件（Phishing Email）」，利用「緊急警告」製造恐懼與急迫感。具備良好資安意識的員工不應點擊任何可疑連結或隨意回信（以防暴露活躍信箱），而是應該遵循公司的資安事件通報流程，將信件作為附件（以保留完整的郵件標頭資訊）轉發給 IT 或資安團隊進行專業分析。",
        "en_explanation": "This is a classic \"Phishing Email\" that uses \"urgent warnings\" to create a sense of fear and urgency. A security-conscious employee should not click any suspicious links or reply (which confirms an active inbox). Instead, they should follow the company's incident reporting procedures by forwarding the email as an attachment (to preserve full email header information) to the IT or security team for professional analysis."
    },
    {
        "id": 43,
        "type": "MC",
        "q": "針對外部供應商的維護設備（例如外包工程師帶來的檢測用筆電）準備接入公司內部網路前，應落實何種技術與實體控制？",
        "en_q": "Before allowing external supplier equipment (e.g., outsourced engineer's diagnostic laptop) to connect to the internal network, what technical and physical controls should be implemented?",
        "options": {
            "A": "A. 基於信任原則，直接提供內部網路的 Wi-Fi 密碼讓其連線。",
            "B": "B. 先強制進行惡意軟體掃描、確認防毒軟體更新，並將其限制在隔離的訪客網段（VLAN）。",
            "C": "C. 要求工程師交出筆電密碼，由公司內部人員代為操作測試。"
        },
        "en_options": {
            "A": "A. Based on trust, directly provide the internal Wi-Fi password for connection.",
            "B": "B. Enforce malware scans, verify AV updates, and restrict it to an isolated guest network (VLAN).",
            "C": "C. Demand the laptop password from the engineer and have internal staff operate it for testing."
        },
        "ans": "B",
        "explanation": "外部供應商的設備不受公司內部的資安政策管控，極可能感染惡意軟體或病毒。在允許其接入網路前，必須將其視為「不可信設備」，強制進行防毒掃描、確認安全更新，並在網路架構上將其隔離在受限的訪客網段（VLAN）中，避免其直接接觸或感染內部核心網路。基於信任直接放行是極危險的作法。",
        "en_explanation": "External supplier equipment is not governed by the company's internal security policies and is highly likely to harbor malware or viruses. Before allowing network access, it must be treated as an \"untrusted device.\" It is mandatory to enforce antivirus scans, verify security updates, and architecturally isolate it in a restricted guest network (VLAN) to prevent direct contact or infection of the internal core network. Granting access based purely on trust is an extremely dangerous practice."
    },
    {
        "id": 44,
        "type": "MC",
        "q": "有關「佈線安全 (Cabling security)」，為了防止核心網路訊號被實體竊聽、破壞或意外截斷，下列作法何者正確？",
        "en_q": "Regarding \"Cabling security\", to prevent core network signals from physical wiretapping, sabotage, or accidental cuts, which practice is correct?",
        "options": {
            "A": "A. 將網路線全部改為無線網路，即可徹底解決實體破壞問題。",
            "B": "B. 將網路線與高壓電纜捆綁在一起，利用高壓電防止老鼠啃咬。",
            "C": "C. 將核心通訊纜線封裝於具保護層的導管或實體線槽內，並避開公共頻繁走動區域。"
        },
        "en_options": {
            "A": "A. Switch entirely to wireless networks to completely solve physical destruction issues.",
            "B": "B. Bundle network cables with high-voltage lines, utilizing high voltage to deter rodents.",
            "C": "C. Encase core communication cables in protective conduits or physical trenches, avoiding high-traffic public areas."
        },
        "ans": "C",
        "explanation": "ISO 實體安全中對於「佈線安全」的要求，是保護電源與通訊纜線免於攔截、干擾或損壞。將核心纜線封裝在堅固的導管（Conduit）或加蓋的線槽中，並盡可能避開公眾容易進入或頻繁走動的區域，能有效降低被老鼠啃咬、意外切斷或有心人士加裝側錄設備的實體風險。無線網路有其自身的傳輸風險，無法取代核心實體佈線。",
        "en_explanation": "ISO physical security requirements for \"Cabling Security\" mandate protecting power and communication cables from interception, interference, or damage. Enclosing core cables in sturdy conduits or covered physical trenches, while routing them away from easily accessible or high-traffic public areas, effectively reduces physical risks like rodent damage, accidental cuts, or malicious wiretapping devices. Wireless networks have their own transmission risks and cannot replace core physical cabling."
    },
    {
        "id": 45,
        "type": "MC",
        "q": "若公司為了節省空間，全面實施「開放式辦公與隨機座位（Hot-desking）」，這對於實體資安會帶來什麼最大的挑戰？",
        "en_q": "If the company fully implements \"Hot-desking\" to save space, what is the biggest challenge to physical security?",
        "options": {
            "A": "A. 極難落實桌面淨空政策，且大幅增加旁人窺視機密畫面（Shoulder surfing）的風險。",
            "B": "B. 每天找座位會導致員工上班遲到。",
            "C": "C. 員工會找不到網路孔可以插網路線。"
        },
        "en_options": {
            "A": "A. It is extremely difficult to enforce clear desk policies and significantly increases shoulder surfing risks.",
            "B": "B. Finding a seat every day will cause employees to be late.",
            "C": "C. Employees won't find LAN ports to plug their network cables into."
        },
        "ans": "A",
        "explanation": "隨機座位（Hot-desking）意味著員工每天坐在不同的位置，且周圍的人也不斷變換。在這種缺乏固定實體邊界與個人抽屜的環境下，員工極容易將機密文件遺留在桌上，難以徹底執行「桌面淨空（Clear desk）」。此外，開放空間大幅增加了旁人（包括其他部門或訪客）輕易從背後窺視螢幕（Shoulder surfing）的風險。",
        "en_explanation": "Hot-desking means employees sit in different spots daily, surrounded by constantly changing neighbors. In this environment lacking fixed physical boundaries and personal drawers, employees are highly prone to leaving confidential documents behind, making the \"Clear desk\" policy exceptionally hard to enforce. Furthermore, open spaces massively increase the risk of \"Shoulder surfing,\" where others (including different departments or visitors) can easily spy on screens from behind."
    },
    {
        "id": 46,
        "type": "MC",
        "q": "當稽核員發現公司總部機房大門的密碼鎖，其「密碼長達三年未曾更換」，這主要違反了什麼安全管理原則？",
        "en_q": "When an auditor finds that the core server room door keypad \"has not had its password changed in 3 years\", what core security management principle is violated?",
        "options": {
            "A": "A. 密碼太舊會導致鍵盤按鈕條理褪色，影響美觀。",
            "B": "B. 認證憑證未定期更新，前員工或離包商可能仍持有密碼，大幅提高未授權存取風險。",
            "C": "C. 舊密碼會拖慢機房大門微電腦的處理速度。"
        },
        "en_options": {
            "A": "A. Old passwords lead to faded keypad buttons, affecting aesthetics.",
            "B": "B. Failure to periodically update credentials leaves former employees or contractors with passwords, significantly increasing unauthorized access risks.",
            "C": "C. Old passwords slow down the processing speed of the door's microcomputer."
        },
        "ans": "B",
        "explanation": "存取憑證（如密碼、通行碼）必須定期強制更新。若密碼長達三年未更換，期間離職的員工、調職人員或約聘的外包廠商可能依然記得這組密碼。這嚴重違反了「最小權限」與「存取控制」原則，導致未授權人員極可能利用舊密碼輕易進入機房，帶來巨大的實體入侵風險。",
        "en_explanation": "Access credentials (like passwords or passcodes) must be mandatorily updated on a regular basis. If a password hasn't been changed in three years, resigned employees, transferred staff, or former contractors might still remember it. This severely violates the principles of \"Least Privilege\" and \"Access Control,\" making it highly likely for unauthorized individuals to easily enter the server room using the old password, posing a massive physical intrusion risk."
    },
    {
        "id": 47,
        "type": "MC",
        "q": "下列何者「最不適合作為」資訊安全認知教育訓練成效的客觀衡量指標（KPI）？",
        "en_q": "Which of the following is \"least suitable\" as an objective KPI for measuring the effectiveness of information security awareness training?",
        "options": {
            "A": "A. 釣魚郵件模擬測試中，員工不慎點擊連結的「中招率」下降幅度。",
            "B": "B. 實際資安通報演練中，員工在發現異常後通報 IT 單位的人數比例。",
            "C": "C. 教育訓練當天中午發放的便當與點心滿意度調查問卷分數。"
        },
        "en_options": {
            "A": "A. The drop in \"click rate\" during simulated phishing email tests.",
            "B": "B. The proportion of employees who report to IT after discovering anomalies during incident reporting drills.",
            "C": "C. The satisfaction scores from surveys regarding the lunchboxes and snacks provided during training."
        },
        "ans": "C",
        "explanation": "教育訓練的目的在於「改變員工的行為與提升資安意識」。選項 A（釣魚信件點擊率下降）與選項 B（主爬通報資安事件的比例增加）都是客觀且能反映行為改變的實質指標。選項 C（便當或點心滿意度）僅反映了行政後勤的感受，與員工是否吸收了資安知識並應用於日常工作毫無關聯，是最不適合的 KPI。",
        "en_explanation": "The goal of security training is to \"change employee behavior and raise security awareness.\" Option A (drop in phishing click rates) and Option B (increased proportion of proactive incident reporting) are both objective, substantial metrics reflecting behavioral changes. Option C (lunchbox or snack satisfaction) only reflects administrative logistics; it has absolutely no correlation with whether employees absorbed security knowledge and applied it to their daily work, making it the least suitable KPI."
    },
    {
        "id": 48,
        "type": "MC",
        "q": "若公司必須將含有全公司薪資檔案的實體備份磁帶，每週運送至異地備援機房，下列哪種運送方式最符合 ISO 實體安全規範？",
        "en_q": "If the company must transport physical backup tapes containing all payroll files to an off-site center weekly, which transport method best meets ISO physical security guidelines?",
        "options": {
            "A": "A. 為了省錢，指派當天最閒的實習生搭捷運送過去。",
            "B": "B. 將資料加密，放入防破壞的上鎖保險箱，交由具信任合約的專業保全物流運送並保留交接簽收紀錄。",
            "C": "C. 用一般的牛皮紙袋裝著，叫一般的計程車快遞送達。"
        },
        "en_options": {
            "A": "A. To save money, assign the most idle intern to deliver it via the subway.",
            "B": "B. Encrypt data, place it in tamper-proof locked safes, and entrust it to professional security logistics with trust contracts and signed handover records.",
            "C": "C. Pack it in standard kraft envelopes and send it via a regular taxi courier."
        },
        "ans": "B",
        "explanation": "薪資檔案屬於極機密資訊。在實體媒體的運送過程中，必須考量防護、追蹤與究責。選項 B 包含了技術層面（資料加密）、實體防護層面（防破壞上鎖保險箱），以及管理層面（由具備保密合約的專業物流執行，並保留簽收紀錄以確保稽核軌跡），完美符合 ISO 對於設備與媒體安全運送的嚴格規範。",
        "en_explanation": "Payroll files are highly confidential information. When transporting physical media, protection, tracking, and accountability must be considered. Option B encompasses technical measures (data encryption), physical protection (tamper-proof locked safes), and management controls (executed by professional logistics with NDA contracts, maintaining signed records for audit trails). This perfectly complies with ISO's strict standards for the secure transport of equipment and media."
    },
    {
        "id": 49,
        "type": "MC",
        "q": "關於「實體鑰匙與備用門禁卡」的管理，下列稽核場景中何者屬於「嚴重缺失（Major Non-conformity）」？",
        "en_q": "Regarding the management of \"physical keys and backup access cards,\" which audit scenario constitutes a \"Major Non-conformity\"?",
        "options": {
            "A": "A. 核心機房的萬用實體備用鑰匙，直接掛在 IT 部門經理辦公桌的透明壓克力板上，且無人監管。",
            "B": "B. 備用鑰匙被存放在附有密碼鎖的保險箱內，只有兩位高階主管知道密碼。",
            "C": "C. 所有訪客門禁卡在下班前都會進行盤點與數量核對。"
        },
        "en_options": {
            "A": "A. The master backup physical key to the core server room hangs on an unsupervised clear acrylic board on the IT manager's desk.",
            "B": "B. Backup keys are stored in a keypad safe with only two senior managers knowing the code.",
            "C": "C. All visitor access cards undergo inventory and quantity checks before the end of the workday."
        },
        "ans": "A",
        "explanation": "核心機房是企業 IT 架構的心臟，其備用鑰匙擁有最高等級的實體存取權。將萬用備用鑰匙直接掛在透明壓克力板上且無人監管，等同於向所有人（包括訪客與內部非授權員工）開放機房大門，完全喪失了實體存取控制的作用，這是極度致命的嚴重稽核缺失。B 是正確的保護作法，C 是正確的管理作法。",
        "en_explanation": "The core server room is the heart of an enterprise's IT architecture, and its backup keys possess the highest level of physical access. Hanging the master backup key on an unsupervised clear acrylic board is equivalent to opening the server room doors to everyone (including visitors and unauthorized internal staff). It completely nullifies physical access controls and represents a highly critical, major audit non-conformity. Option B is a correct protection practice, and Option C is a correct management practice."
    },
    {
        "id": 50,
        "type": "MC",
        "q": "綜合實體與人員安全，當員工於非上班時間（如假日、深夜）需進入公司辦公區加班時，最合規的存取流程應該是？",
        "en_q": "Combining physical and personnel security, what is the most compliant access flow when an employee needs to enter the office for overtime during non-working hours (e.g., holidays, late nights)?",
        "options": {
            "A": "A. 只要是正職員工，24 小時隨時都可以自由刷卡進出公司。",
            "B": "B. 聯絡熟識的大樓保全幫忙直接開門，不留刷卡紀錄以免被查勤。",
            "C": "C. 需依制度事先提出加班申請，經權責主管核准後，門禁系統才於該特定時段自動開放其刷卡權限。"
        },
        "en_options": {
            "A": "A. As long as they are full-time employees, they can freely swipe in and out 24/7.",
            "B": "B. Call a familiar building guard to let them in, leaving no swipe records to avoid attendance checks.",
            "C": "C. Submit an overtime request per policy beforehand; upon manager approval, the access system automatically grants swipe rights for that specific timeframe."
        },
        "ans": "C",
        "explanation": "非上班時間的辦公室人員稀少，缺乏同事間的互相監督（Shoulder check），因此實體存取風險較高。合規的做法必須符合「授權」與「最小存取時間」原則。員工應先透過系統提出申請，經主管核准授權後，門禁系統才在該特定的加班時段自動賦予刷卡權限。這能確保進出合法，並留下完整的稽核紀錄，防範內部員工惡意闖入。",
        "en_explanation": "During non-working hours, the office is sparsely populated, lacking peer supervision (shoulder checks), which elevates physical access risks. Compliant procedures must adhere to the principles of \"Authorization\" and \"Minimum Access Time.\" Employees should submit a system request first; upon managerial approval, the access system automatically grants swipe privileges solely for that specific overtime window. This ensures legitimate entry, maintains comprehensive audit logs, and prevents malicious intrusions by internal staff."
    },
    {
        "id": 51,
        "type": "SC",
        "q": "關於人員篩選(背景調查)，哪一項最符合資訊安全管理的要求？",
        "en_q": "Regarding personnel screening (background checks), which of the following best meets information security management requirements?",
        "options": {
            "A": "A. 徵才時必須記錄並保存背景調查結果以符合資安要求",
            "B": "B. 背景調查為選擇性程序，僅對關鍵職務執行",
            "C": "C. 公司不得保存任何求職者背景資料以保護隱私",
            "D": "D. 只需在員工離職時補做背景調查即可"
        },
        "en_options": {
            "A": "A. Background check results must be recorded and retained during hiring to meet security requirements",
            "B": "B. Background checks are optional procedures performed only for key roles",
            "C": "C. The company must not retain any applicant background data to protect privacy",
            "D": "D. Background checks only need to be done retroactively upon resignation"
        },
        "ans": "A",
        "explanation": "根據 ISO 27001 (A.7.1.1 篩選)，組織在任用員工或承包商前應進行背景調查。選項A正確，因記錄與保存調查結果能提供合規性與資安管理的稽核軌跡。選項B錯誤，背景調查應涵蓋所有適用人員，不僅限於關鍵職務。選項C錯誤，企業在遵循隱私法規的前提下可合法保存這些記錄。選項D錯誤，背景調查必須在「任用前」完成以防範潛在風險。",
        "en_explanation": "According to ISO 27001 (A.7.1.1 Screening), organizations must conduct background checks prior to employment. Option A is correct because retaining these records provides an audit trail for compliance. Option B is incorrect as screening applies to all relevant personnel, not just key roles. Option C is incorrect; companies can legally retain these records if privacy laws are followed. Option D is incorrect because checks must be completed before hiring to mitigate risks."
    },
    {
        "id": 52,
        "type": "SC",
        "q": "關於聘用條款與條件，下列敘述何者正確？",
        "en_q": "Regarding terms and conditions of employment, which of the following statements is correct?",
        "options": {
            "A": "A. 聘用合約僅需記載薪資與職稱，不需涉及資安責任",
            "B": "B. 聘用合約應包含違反資安的懲處與離職後的保密條款",
            "C": "C. 所有資安責任可口頭約定而不必寫入合約",
            "D": "D. 離職後不得有任何保密義務"
        },
        "en_options": {
            "A": "A. Employment contracts only need to list salary and title, without involving security responsibilities",
            "B": "B. Employment contracts should include disciplinary actions for security violations and post-employment confidentiality clauses",
            "C": "C. All security responsibilities can be verbally agreed upon without written contracts",
            "D": "D. There must not be any confidentiality obligations after resignation"
        },
        "ans": "B",
        "explanation": "依據 ISO 27001 (A.7.1.2 任用條款與條件)，聘僱合約必須明確規範資安責任。選項B正確，合約應載明違反資安的懲戒處分，及離職後持續生效的保密條款(NDA)。選項A錯誤，合約必須納入資安責任而不能僅有薪資與職稱。選項C錯誤，資安責任必須以書面約定以具備法律效力。選項D錯誤，離職後的保密義務是保護企業營業秘密的關鍵，不受僱用關係終止影響。",
        "en_explanation": "Per ISO 27001 (A.7.1.2 Terms and conditions of employment), contracts must explicitly state security responsibilities. Option B is correct; contracts should include disciplinary actions for violations and post-employment NDAs. Option A is incorrect because security responsibilities are mandatory. Option C is incorrect; security duties must be written to be legally binding. Option D is incorrect; post-employment confidentiality is crucial for protecting trade secrets."
    },
    {
        "id": 53,
        "type": "SC",
        "q": "關於保密協議(NDA)的實務要求，何者為正確做法？",
        "en_q": "Regarding the practical requirements of Non-Disclosure Agreements (NDA), what is the correct practice?",
        "options": {
            "A": "A. 只有正職員工需簽署保密協議，外包人員除外",
            "B": "B. 僅在離職時要求簽署保密協議即可",
            "C": "C. 正職與外包人員在接觸內網前均須已簽署保密協議",
            "D": "D. 由直屬主管口頭承諾即可取代書面保密協議"
        },
        "en_options": {
            "A": "A. Only full-time employees need to sign NDAs, excluding outsourced personnel",
            "B": "B. NDAs are only required to be signed upon resignation",
            "C": "C. Both full-time and outsourced personnel must sign an NDA before accessing the intranet",
            "D": "D. A verbal promise from a direct supervisor can replace a written NDA"
        },
        "ans": "C",
        "explanation": "依據 ISO 27001 (A.13.2.4 保密協議)，所有可能接觸敏感資訊的人員均須簽署NDA。選項C正確，正職與外包人員在存取內網或敏感資源前，都必須完成書面NDA簽署以確保承諾保密。選項A錯誤，外包人員同樣會接觸機密資訊且風險可能更高。選項B錯誤，保密協議必須在授予權限前簽署，而非離職時。選項D錯誤，口頭承諾缺乏法律約束力與稽核證據。",
        "en_explanation": "Under ISO 27001 (A.13.2.4 Confidentiality agreements), anyone accessing sensitive info must sign an NDA. Option C is correct; both full-time and outsourced personnel must sign written NDAs before accessing the intranet or sensitive resources. Option A is incorrect as outsourced staff also pose risks. Option B is incorrect; NDAs must be signed prior to access, not upon resignation. Option D is incorrect; verbal promises lack legal force and auditability."
    },
    {
        "id": 54,
        "type": "SC",
        "q": "關於在高度安全區域的行為規範，下列何者為正確？",
        "en_q": "Regarding behavior norms in highly secure areas, which of the following is correct?",
        "options": {
            "A": "A. 可以在安全區域拍照以供後續比對，只要不外傳",
            "B": "B. 在無監督時拍照只要經主管事後補簽即可",
            "C": "C. 只要是公司員工就可自由在機房拍攝作業過程記錄",
            "D": "D. 未經授權且無監督人員在場時，禁止拍照或錄影"
        },
        "en_options": {
            "A": "A. Photography is allowed in secure areas for future reference as long as it is not leaked",
            "B": "B. Unsupervised photography only needs retroactive approval from a supervisor",
            "C": "C. Any company employee can freely record operational processes in the server room",
            "D": "D. Unauthorized photography or video recording is prohibited when unsupervised"
        },
        "ans": "D",
        "explanation": "根據 ISO 27001 (A.11.1.5 在安全區域內之作業)，安全區域(如機房)應有嚴格規範。選項D正確，安全區域內存放核心系統，未經授權且無人監督時嚴禁拍照或錄影，以防機密或架構外洩。選項A錯誤，未經授權拍攝即違反實體安全規範，難以控管後續風險。選項B錯誤，事後補簽無法挽回事發時的潛在資料外洩。選項C錯誤，即使是員工也不能自由拍攝，必須具備授權與業務需求。",
        "en_explanation": "According to ISO 27001 (A.11.1.5 Working in secure areas), strict rules apply to secure zones like server rooms. Option D is correct; unauthorized and unsupervised photography is strictly prohibited to prevent leakage of sensitive data or infrastructure layouts. Option A is incorrect; unauthorized filming violates physical security regardless of intent. Option B is incorrect; retroactive approval cannot undo potential leaks. Option C is incorrect; employees cannot film freely and require explicit authorization."
    },
    {
        "id": 55,
        "type": "SC",
        "q": "關於桌面與螢幕淨空，下列何者為公司資訊安全的正確規範？",
        "en_q": "Regarding clear desk and clear screen policies, which of the following is the correct information security standard?",
        "options": {
            "A": "A. 應保持桌面與螢幕淨空，避免將帳密貼在螢幕上並及時取走列印資料",
            "B": "B. 在辦公桌放置訪客名片與未取列印資料是可接受的日常習慣",
            "C": "C. 可在桌面隨意放置含機密資訊的USB以便備援使用",
            "D": "D. 列印機資料無需即時取走，放置一段時間是允許的"
        },
        "en_options": {
            "A": "A. Desks and screens must be kept clear, passwords should not be stuck on screens, and printed materials should be collected promptly",
            "B": "B. Leaving visitor business cards and uncollected prints on desks is an acceptable daily habit",
            "C": "C. Confidential USBs can be casually left on the desk for backup convenience",
            "D": "D. Printed materials do not need to be collected immediately; leaving them for a while is allowed"
        },
        "ans": "A",
        "explanation": "依據 ISO 27001 (A.11.2.9 桌面與螢幕淨空政策)，組織應降低未授權存取風險。選項A正確，員工應保持桌面淨空，鎖定電腦螢幕，絕對不可將密碼貼在螢幕上，且列印資料應即時取走。選項B錯誤，未取走的列印資料容易被他人翻閱。選項C錯誤，隨意放置含有機密資訊的USB容易導致遺失或遭竊。選項D錯誤，列印機多位於公共區域，文件不及時取走將面臨被竊取的風險。",
        "en_explanation": "Per ISO 27001 (A.11.2.9 Clear desk and clear screen policy), organizations must reduce unauthorized access risks. Option A is correct; employees must keep desks clear, lock screens, never stick passwords on monitors, and collect printouts immediately. Option B is incorrect; leaving uncollected prints risks exposure. Option C is incorrect; leaving confidential USBs around leads to theft or loss. Option D is incorrect; printers are public, and uncollected documents risk being stolen."
    },
    {
        "id": 56,
        "type": "MA",
        "q": "關於資訊安全認知、教育訓練與獎懲，下列何者為適當措施？(多選)",
        "en_q": "Regarding info security awareness, education training, and disciplinary measures, which of the following are appropriate? (Multiple Choice)",
        "options": {
            "A": "A. 應定期舉辦資安認知與教育訓練以提升員工警覺",
            "B": "B. 資安教育僅需新進時一次性宣導即可",
            "C": "C. 重大違規應影響績效獎金並視情節給予行政警告等懲處",
            "D": "D. 資安違規只需口頭提醒，不應納入獎懲制度"
        },
        "en_options": {
            "A": "A. Security awareness and training should be held regularly to raise vigilance",
            "B": "B. Security education is only needed as a one-time orientation for new hires",
            "C": "C. Major violations should impact performance bonuses and lead to administrative warnings",
            "D": "D. Security violations only need verbal reminders and should not be part of the disciplinary system"
        },
        "ans": [
            "A",
            "C"
        ],
        "explanation": "根據 ISO 27001，資安意識是第一道防線且需有懲戒機制支持。選項A正確，定期舉辦資安認知訓練可確保員工了解最新威脅與規範。選項C正確，組織應制定正式懲戒程序，重大違規應影響績效並給予行政處分以確保規範具強制力。選項B錯誤，單次新人訓練無法應對不斷變化的威脅。選項D錯誤，若無明確獎懲制度，資安規範將流於形式而無法遏止違規。",
        "en_explanation": "Under ISO 27001, security awareness is the first defense line and requires disciplinary backing. Option A is correct; regular training ensures employees understand current threats. Option C is correct; formal disciplinary procedures penalizing major violations are needed to enforce compliance. Option B is incorrect; a one-time orientation cannot address evolving threats. Option D is incorrect; without a disciplinary system, policies become formalities and fail to deter violations."
    },
    {
        "id": 57,
        "type": "MA",
        "q": "關於實體安全周界與進入控制，下列哪些做法是正確的？(多選)",
        "en_q": "Regarding physical security perimeters and entry controls, which practices are correct? (Multiple Choice)",
        "options": {
            "A": "A. 會議室視訊鏡頭未使用時應關閉以避免拍到敏感文件",
            "B": "B. 門禁系統應嚴格管控進出並管理訪客",
            "C": "C. 過期或停用的門禁卡必須失效以防止未授權進入",
            "D": "D. 門禁可任由員工自主管理過期卡片"
        },
        "en_options": {
            "A": "A. Conference room cameras should be turned off when not in use to avoid recording sensitive documents",
            "B": "B. Access systems should strictly control entry and manage visitors",
            "C": "C. Expired or deactivated access cards must be invalidated to prevent unauthorized entry",
            "D": "D. Employees can autonomously manage expired cards for access control"
        },
        "ans": [
            "A",
            "B",
            "C"
        ],
        "explanation": "依據 ISO 27001 (A.11.1 實體安全周界與進入控制)，實體存取需受嚴格控管。選項A正確，會議室鏡頭閒置時關閉可避免意外拍到機密討論。選項B正確，門禁系統必須記錄並控管所有進出人員與訪客。選項C正確，基於最小權限原則，過期或停用的門禁卡必須立即註銷以防未授權存取。選項D錯誤，門禁權限涉及實體安全，必須由專責單位統一控管，絕不能由員工自主管理。",
        "en_explanation": "Per ISO 27001 (A.11.1 Physical security perimeter and entry controls), physical access must be strictly managed. Option A is correct; turning off idle cameras prevents accidental filming of confidential discussions. Option B is correct; access systems must log and manage all entries, including visitors. Option C is correct; under the principle of least privilege, expired cards must be instantly disabled. Option D is incorrect; access rights must be centrally managed, never autonomously by employees."
    },
    {
        "id": 58,
        "type": "MA",
        "q": "關於報告資安事件的流程，下列哪些敘述正確？(多選)",
        "en_q": "Regarding the procedure for reporting security incidents, which statements are correct? (Multiple Choice)",
        "options": {
            "A": "A. 員工收到可疑郵件時必須依標準程序向IT部門報告",
            "B": "B. 可疑郵件可先在個人電腦上開啟以確認是否含惡意程式",
            "C": "C. 發現異常文件若非自己負責就無須回報",
            "D": "D. 員工發現異常情況應立即報告，不得延遲"
        },
        "en_options": {
            "A": "A. Employees must report suspicious emails to the IT department per standard procedures",
            "B": "B. Suspicious emails can be opened on personal PCs first to confirm malware presence",
            "C": "C. Abnormal documents do not need to be reported if you are not responsible for them",
            "D": "D. Employees must immediately report anomalies without delay"
        },
        "ans": [
            "A",
            "D"
        ],
        "explanation": "根據 ISO 27001 (A.16.1.2 報告資訊安全事件)，員工有義務通報任何疑似資安事件。選項A正確，員工應依循標準程序向IT報告可疑郵件，交由專業團隊處理。選項D正確，及時回報是控制損害範圍的關鍵，延遲可能導致惡意程式擴散。選項B錯誤，員工自行開啟可疑附件極易觸發惡意軟體(如勒索軟體)。選項C錯誤，資安是全員責任，任何異常都應通報，與是否為個人業務無關。",
        "en_explanation": "According to ISO 27001 (A.16.1.2 Reporting info security events), employees must report suspected incidents. Option A is correct; employees must report suspicious emails to IT following standard procedures for professional handling. Option D is correct; prompt reporting is critical to contain damage. Option B is incorrect; opening suspicious attachments personally risks triggering malware. Option C is incorrect; security is everyone's responsibility, so anomalies must be reported regardless of whose task it is."
    },
    {
        "id": 59,
        "type": "MA",
        "q": "關於保密協議(NDA)的要求，下列哪些為正確？(多選)",
        "en_q": "Regarding Non-Disclosure Agreement (NDA) requirements, which of the following are correct? (Multiple Choice)",
        "options": {
            "A": "A. 非必要情況下可不要求外包人員簽署保密協議",
            "B": "B. 正職與外包人員在接觸內網前都應完成保密協議簽署",
            "C": "C. 保密協議應以書面形式記載雙方義務與範圍",
            "D": "D. 只需口頭承諾即可視為保密義務成立"
        },
        "en_options": {
            "A": "A. NDAs are not required for outsourced personnel unless absolutely necessary",
            "B": "B. Both full-time and outsourced staff must sign an NDA before accessing the intranet",
            "C": "C. NDAs must be in written form documenting obligations and scope",
            "D": "D. A verbal promise is sufficient to establish confidentiality obligations"
        },
        "ans": [
            "B",
            "C"
        ],
        "explanation": "依據 ISO 27001，NDA 是確保各方遵守資訊保護規範的法律基礎。選項B正確，正職員工與外包人員皆會接觸敏感資料，在正式授權存取內網前均須簽署。選項C正確，NDA必須是具法律效力的書面文件，明確記載保密範圍與義務。選項A錯誤，外包人員的流動性與風險較高，簽署NDA是強制性控制措施。選項D錯誤，口頭承諾無法作為法庭證據與稽核軌跡，無法取代書面協議。",
        "en_explanation": "Under ISO 27001, NDAs are the legal foundation for information protection. Option B is correct; both full-time and outsourced staff must sign NDAs before accessing the intranet since both handle sensitive data. Option C is correct; an NDA must be a legally binding written document outlining the scope and obligations. Option A is incorrect; outsourced staff pose higher risks, making NDAs mandatory. Option D is incorrect; verbal promises lack legal standing and auditability."
    },
    {
        "id": 60,
        "type": "MA",
        "q": "關於在機房等安全區域的管理，下列哪些措施是必要的？(多選)",
        "en_q": "Regarding management in secure areas like server rooms, which measures are necessary? (Multiple Choice)",
        "options": {
            "A": "A. 在機房等高度安全區域未經授權且無監督人員在場時，應禁止拍照或錄影",
            "B": "B. 機房應禁止放置飲料食物以避免濺灑或造成設備損壞",
            "C": "C. 在安全區域內可以自由拍照以便記錄設備狀態",
            "D": "D. 允許於機房飲食只要注意不靠近設備即可"
        },
        "en_options": {
            "A": "A. Unauthorized photography/video without supervision is prohibited in highly secure areas",
            "B": "B. Food and drinks are prohibited in server rooms to prevent spills and equipment damage",
            "C": "C. Photography is freely allowed in secure areas to record equipment status",
            "D": "D. Eating is allowed in server rooms as long as it is kept away from equipment"
        },
        "ans": [
            "A",
            "B"
        ],
        "explanation": "根據 ISO 27001 (A.11.1.5 在安全區域內之作業)與設備安全規範，機房需具備高標準的實體與環境控制。選項A正確，為防止機密或架構外洩，機房內嚴禁未經授權與無監督的拍攝。選項B正確，機房內禁止放置飲食，以防液體濺灑導致短路或設備損壞。選項C錯誤，即使在安全區域內也不能自由拍照，需有授權。選項D錯誤，機房內嚴格禁止任何飲食行為，沒有遠離設備即可飲食的例外。",
        "en_explanation": "Per ISO 27001 (A.11.1.5 Working in secure areas) and equipment security policies, server rooms require high-standard physical/environmental controls. Option A is correct; unauthorized and unsupervised filming is strictly prohibited to prevent data and layout leaks. Option B is correct; food and drinks are banned to prevent spills causing short circuits or damage. Option C is incorrect; free photography is not allowed without authorization. Option D is incorrect; eating is strictly forbidden with no exceptions."
    },
    {
        "id": 61,
        "type": "MA",
        "q": "關於桌面與螢幕淨空，下列哪些為正確的控制項？(多選)",
        "en_q": "Regarding clear desk and screen policies, which of the following are correct controls? (Multiple Choice)",
        "options": {
            "A": "A. 機密文件、訪客名片、USB不應隨意放置桌面",
            "B": "B. 可將帳密貼於螢幕下方以便登入使用",
            "C": "C. 印表機資料應及時取走以防外流",
            "D": "D. 不得將帳密貼在螢幕上以免資訊外洩"
        },
        "en_options": {
            "A": "A. Confidential documents, visitor cards, and USBs should not be casually left on desks",
            "B": "B. Passwords can be stuck below the screen for login convenience",
            "C": "C. Printed materials should be collected promptly to prevent leakage",
            "D": "D. Passwords must not be stuck on screens to prevent information leaks"
        },
        "ans": [
            "A",
            "C",
            "D"
        ],
        "explanation": "依據 ISO 27001 (A.11.2.9 桌面淨空與螢幕淨空政策)，目的是減少敏感資訊遭未經授權存取的機會。選項A正確，機密文件、訪客名片與USB不應留在無人看管的桌面上。選項C正確，印表機列印的資料應即時取走，防止被他人翻閱。選項D正確，密碼絕對不得寫在紙上並貼於螢幕或鍵盤下。選項B錯誤，將帳密貼於螢幕嚴重違反資安基本規範，極易導致帳號遭盜用。",
        "en_explanation": "Per ISO 27001 (A.11.2.9 Clear desk and clear screen policy), the goal is to reduce unauthorized access. Option A is correct; confidential documents, visitor cards, and USBs should not be left unattended on desks. Option C is correct; printed materials must be retrieved instantly to prevent unauthorized viewing. Option D is correct; passwords must never be written down and stuck to screens. Option B is incorrect; sticking passwords on screens severely violates basic security rules and invites account compromise."
    },
    {
        "id": 62,
        "type": "MA",
        "q": "關於儲存媒體（如USB）的實體存放安全，下列哪些敘述正確？(多選)",
        "en_q": "Regarding the physical storage security of media (e.g., USBs), which statements are correct? (Multiple Choice)",
        "options": {
            "A": "A. 含機密資訊或測試用的USB必須妥善保管",
            "B": "B. 含機密資訊的USB可隨手放置於靠近門口以便帶走",
            "C": "C. 公司可允許員工將含機密資訊的USB丟棄在公共垃圾桶",
            "D": "D. 不得將含機密資訊的外部存儲媒體隨意丟棄於公共區域"
        },
        "en_options": {
            "A": "A. USBs with confidential data or testing files must be properly secured",
            "B": "B. Confidential USBs can be left near doors for quick grab-and-go",
            "C": "C. Employees are allowed to toss confidential USBs in public trash bins",
            "D": "D. External media with confidential data must not be casually discarded in public areas"
        },
        "ans": [
            "A",
            "D"
        ],
        "explanation": "依據 ISO 27001 (A.8.3 媒體處置)，組織應對可攜式儲存媒體進行妥善的實體保護。選項A正確，含有機密資訊或測試資料的USB必須鎖在抽屜或保險箱中妥善保管。選項D正確，當這類媒體不再需要時，必須進行安全的資料抹除或實體銷毀，絕不可隨意丟棄於公共區域。選項B錯誤，將USB放置於靠近門口等易取得處，極易遭竊。選項C錯誤，將含有機密資訊的USB丟入公共垃圾桶會導致嚴重的資料外洩。",
        "en_explanation": "Under ISO 27001 (A.8.3 Media handling), portable storage media require proper physical protection. Option A is correct; USBs with confidential or testing data must be securely stored (e.g., in a locked drawer). Option D is correct; external media must undergo secure data wiping or physical destruction when no longer needed, never casually discarded. Option B is incorrect; leaving USBs near doors invites theft. Option C is incorrect; throwing confidential USBs in public trash causes severe data leaks."
    },
    {
        "id": 63,
        "type": "MA",
        "q": "關於設備維護與汰除保全，下列哪些為公司應採取的措施？(多選)",
        "en_q": "Regarding equipment maintenance and disposal security, what measures should the company take? (Multiple Choice)",
        "options": {
            "A": "A. 報廢設備可直接丟棄於一般垃圾桶以節省成本",
            "B": "B. 報廢設備及碎紙機中的機密文件必須妥善銷毀",
            "C": "C. 機房內可放置開啟式食物以供值班人員使用",
            "D": "D. 設備維護時應防範鼠害以保護線路與接點"
        },
        "en_options": {
            "A": "A. Scrapped equipment can be thrown into normal trash to save costs",
            "B": "B. Scrapped equipment and confidential files in shredders must be properly destroyed",
            "C": "C. Open food can be placed in the server room for duty personnel",
            "D": "D. Equipment maintenance should prevent rodent damage to protect wiring and contacts"
        },
        "ans": [
            "B",
            "D"
        ],
        "explanation": "根據 ISO 27001 (A.11.2.7 設備汰除或重新安置之安全維護)與環境安全規範，設備與資料的銷毀需受嚴格控管。選項B正確，報廢設備中的硬碟與碎紙機中的機密文件都必須被妥善且不可逆地銷毀，防止資料復原。選項D正確，設備維護包含環境控制，防範鼠害能避免線路被咬斷而導致服務中斷。選項A錯誤，報廢設備若未經資料抹除即丟棄，會導致機密外洩。選項C錯誤，機房內嚴禁放置任何食物或飲料。",
        "en_explanation": "Per ISO 27001 (A.11.2.7 Secure disposal or re-use of equipment) and environmental policies, equipment/data destruction must be strictly managed. Option B is correct; hard drives in scrapped equipment and documents in shredders must be irreversibly destroyed to prevent recovery. Option D is correct; environmental controls include pest prevention, avoiding rodent damage to wiring that causes downtime. Option A is incorrect; discarding equipment without wiping data causes leaks. Option C is incorrect; food/drinks are strictly banned in server rooms."
    },
    {
        "id": 64,
        "type": "MA",
        "q": "關於門禁及周界安全管理，下列何者為適當做法？(多選)",
        "en_q": "Regarding access control and perimeter security management, which are appropriate practices? (Multiple Choice)",
        "options": {
            "A": "A. 過期卡片應立即停用以防止未授權進出",
            "B": "B. 門禁系統應記錄出入以利追蹤與稽核",
            "C": "C. 訪客進出應由負責人陪同並受限於允許區域",
            "D": "D. 門禁管理可完全依賴員工自律無需紀錄"
        },
        "en_options": {
            "A": "A. Expired cards should be deactivated immediately to prevent unauthorized access",
            "B": "B. Access systems must record entry/exit for tracking and auditing",
            "C": "C. Visitors should be escorted by sponsors and restricted to allowed areas",
            "D": "D. Access control can fully rely on employee self-discipline without logging"
        },
        "ans": [
            "A",
            "B",
            "C"
        ],
        "explanation": "依據 ISO 27001 (A.11.1 實體安全周界與進入控制)，門禁管理是保護內部資源的基礎。選項A正確，過期或離職員工的卡片必須立即在系統中停用，遵循最小權限原則。選項B正確，門禁系統必須詳細記錄進出時間與身分，以供後續的資安事件追蹤與稽核。選項C正確，訪客進入敏感區域時必須由內部人員全程陪同，且僅限於授權範圍。選項D錯誤，門禁管理必須具備強制力的系統管控與日誌記錄，絕不能僅依賴員工自律。",
        "en_explanation": "Under ISO 27001 (A.11.1 Physical security perimeter and entry controls), access management is foundational. Option A is correct; expired or former employee cards must be deactivated instantly, following least privilege principles. Option B is correct; access systems must log entry/exit details for tracking and auditing. Option C is correct; visitors must be escorted by internal staff and restricted to authorized areas. Option D is incorrect; access control requires enforced system management and logging, not just self-discipline."
    },
    {
        "id": 65,
        "type": "MA",
        "q": "針對會議室視訊設備的管理，下列哪些做法正確？(多選)",
        "en_q": "Regarding the management of conference room video equipment, which practices are correct? (Multiple Choice)",
        "options": {
            "A": "A. 會議室視訊鏡頭未使用時應關閉以避免拍攝敏感資料",
            "B": "B. 鏡頭應避免正對含敏感文件或白板內容",
            "C": "C. 會議室鏡頭即使閒置也可持續開啟以利監控",
            "D": "D. 會議室鏡頭對敏感文件無需特別注意"
        },
        "en_options": {
            "A": "A. Cameras should be turned off when idle to avoid filming sensitive data",
            "B": "B. Cameras should avoid pointing directly at sensitive documents or whiteboards",
            "C": "C. Cameras can remain active while idle for surveillance purposes",
            "D": "D. No special attention is needed regarding cameras pointing at sensitive documents"
        },
        "ans": [
            "A",
            "B"
        ],
        "explanation": "依據 ISO 27001 實體與環境安全控制，視訊設備若管理不當將成為實體安全的漏洞。選項A正確，會議室鏡頭在未使用時應隨手關閉或遮蔽，避免因遠端誤啟動而錄下機密討論。選項B正確，安裝與使用鏡頭時，應刻意避開直接拍攝白板上的機密架構圖或桌面上的敏感文件。選項C錯誤，閒置時持續開啟鏡頭會增加未經授權監看的風險。選項D錯誤，敏感文件若被高解析度鏡頭拍下，等同於資料外洩，必須特別防範。",
        "en_explanation": "Per ISO 27001 physical security controls, mismanaged video equipment creates vulnerabilities. Option A is correct; idle cameras should be turned off or covered to prevent accidental recording of confidential discussions due to remote activation. Option B is correct; cameras should be positioned to avoid capturing confidential whiteboard diagrams or sensitive documents. Option C is incorrect; leaving idle cameras on increases the risk of unauthorized surveillance. Option D is incorrect; high-res cameras capturing sensitive documents constitutes a data leak and requires strict prevention."
    },
    {
        "id": 66,
        "type": "MA",
        "q": "在資安事件通報與處理流程中，下列哪些敘述正確？(多選)",
        "en_q": "In the security incident reporting and handling process, which statements are correct? (Multiple Choice)",
        "options": {
            "A": "A. 員工收受可疑郵件應依標準程序通報IT部門",
            "B": "B. 員工可先下載附件以便自行判斷是否惡意",
            "C": "C. IT在接獲通報後應依標準流程進行後續處理",
            "D": "D. 員工收到可疑郵件宜直接刪除並不需通報"
        },
        "en_options": {
            "A": "A. Employees should report suspicious emails to IT per standard procedures",
            "B": "B. Employees can download attachments first to judge if they are malicious themselves",
            "C": "C. IT should proceed with standard handling processes upon receiving reports",
            "D": "D. Suspicious emails should just be deleted without reporting"
        },
        "ans": [
            "A",
            "C"
        ],
        "explanation": "根據 ISO 27001 (A.16.1 資訊安全事件管理)，建立標準的事件通報與處理流程至關重要。選項A正確，員工是防範社交工程攻擊的守門員，發現可疑郵件應立即依SOP通報IT部門。選項C正確，IT或資安團隊接獲通報後，應啟動標準應變流程(如隔離、分析、清除)以專業方式處理風險。選項B錯誤，員工自行下載或開啟附件極可能觸發惡意程式感染整個內網。選項D錯誤，直接刪除雖然保護了自己，但未通報會使IT無法掌握攻擊趨勢並保護其他可能收到同封郵件的員工。",
        "en_explanation": "Under ISO 27001 (A.16.1 Information security incident management), standard reporting procedures are vital. Option A is correct; employees are gatekeepers against social engineering and must report suspicious emails to IT via SOP. Option C is correct; upon receiving reports, IT/Security must initiate standard response workflows (isolation, analysis, eradication) to handle risks professionally. Option B is incorrect; personally downloading attachments likely triggers network-wide malware infections. Option D is incorrect; simply deleting the email protects one user but fails to alert IT to protect others from the same attack."
    },
    {
        "id": 67,
        "type": "MA",
        "q": "關於保密協議的適用與時效，下列哪些為正確？(多選)",
        "en_q": "Regarding the applicability and validity of NDAs, which are correct? (Multiple Choice)",
        "options": {
            "A": "A. 保密協議可只限定在職期間有效，離職後自動失效",
            "B": "B. 保密協議通常含離職後的保密義務與適用範圍",
            "C": "C. 保密協議僅適用於全職員工，不適用外包或承攬人員",
            "D": "D. 外包人員在接觸內網前亦應簽署保密協議"
        },
        "en_options": {
            "A": "A. NDAs are only valid during employment and automatically expire after resignation",
            "B": "B. NDAs typically include post-resignation confidentiality obligations and scope",
            "C": "C. NDAs apply only to full-time employees, not outsourced contractors",
            "D": "D. Outsourced personnel must also sign NDAs before accessing the intranet"
        },
        "ans": [
            "B",
            "D"
        ],
        "explanation": "依據 ISO 27001 (A.13.2.4 保密協議)，NDA 旨在確保所有接觸敏感資訊的人員皆受法律約束。選項B正確，保密協議必須明確規定即使在離職或合約終止後，保密義務依然持續有效，以保護營業秘密。選項D正確，外包或承攬人員在執行業務前，同樣必須簽署NDA才能獲准接觸內部網路。選項A錯誤，保密義務不能隨離職而自動失效。選項C錯誤，NDA的適用對象應涵蓋所有會接觸機密資訊的人員，不限於全職員工。",
        "en_explanation": "According to ISO 27001 (A.13.2.4 Confidentiality agreements), NDAs ensure all parties accessing sensitive data are legally bound. Option B is correct; NDAs must specify that confidentiality obligations survive post-employment or contract termination to protect trade secrets. Option D is correct; outsourced personnel must sign NDAs before being granted intranet access. Option A is incorrect; confidentiality duties do not expire automatically upon resignation. Option C is incorrect; NDAs apply to anyone handling confidential info, not just full-time staff."
    },
    {
        "id": 68,
        "type": "MA",
        "q": "為維護桌面與列印資料的資訊安全，下列哪些為正確措施？(多選)",
        "en_q": "To maintain information security for desks and printed data, which are correct measures? (Multiple Choice)",
        "options": {
            "A": "A. 應保持桌面整潔，不讓機密文件裸露於工作區域",
            "B": "B. 印表機列印資料應及時取走避免被他人取得",
            "C": "C. 將帳密貼在螢幕側邊以供他人使用是允許的做法",
            "D": "D. 不得將帳密、密碼等資訊貼於螢幕上以防落入他人之手"
        },
        "en_options": {
            "A": "A. Desks should be kept tidy, avoiding exposure of confidential files in work areas",
            "B": "B. Printed materials should be promptly retrieved from printers",
            "C": "C. Sticking passwords on the side of the monitor for others to use is allowed",
            "D": "D. Passwords must not be stuck on screens to prevent them from falling into others' hands"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "依據 ISO 27001 (A.11.2.9 桌面與螢幕淨空政策)，實體環境的資訊保密同樣重要。選項A正確，員工離開座位時應將機密文件收入抽屜並上鎖，避免資料裸露。選項B正確，印表機多在公共區域，列印資料應即時取走以免被他人誤拿或惡意翻閱。選項D正確，將密碼寫在便利貼上並貼於螢幕是極大的資安漏洞，絕對禁止。選項C錯誤，將帳密貼在螢幕側邊供他人使用違反了存取控制中的「帳號不可共用」與「密碼保密」原則。",
        "en_explanation": "Under ISO 27001 (A.11.2.9 Clear desk and clear screen policy), physical information confidentiality is critical. Option A is correct; employees must lock confidential files away when leaving their desks to prevent exposure. Option B is correct; printers are public, so printouts must be retrieved instantly to avoid theft or accidental exposure. Option D is correct; writing passwords on sticky notes and attaching them to screens is a massive vulnerability and strictly forbidden. Option C is incorrect; sticking passwords for others violates \"no account sharing\" and password secrecy rules."
    },
    {
        "id": 69,
        "type": "MA",
        "q": "關於含機密資訊的儲存媒體實體安全，下列哪些敘述正確？(多選)",
        "en_q": "Regarding the physical security of media containing confidential data, which statements are correct? (Multiple Choice)",
        "options": {
            "A": "A. 可以在公共區域短暫放置含機密資訊的USB以便共享",
            "B": "B. 含機密資訊的USB不得隨意放置於桌緣或公共區域",
            "C": "C. 對含機密資訊的儲存媒體應采取適當實體保護與登記管理",
            "D": "D. 所有USB皆可不經登記即可帶離辦公場所"
        },
        "en_options": {
            "A": "A. Confidential USBs can be briefly placed in public areas for sharing",
            "B": "B. Confidential USBs must not be casually left on desk edges or public areas",
            "C": "C. Storage media with sensitive info should have physical protection and registry management",
            "D": "D. All USBs can be taken off-site without registration"
        },
        "ans": [
            "B",
            "C"
        ],
        "explanation": "根據 ISO 27001 (A.8.3 媒體處置)，可攜式儲存媒體因體積小且易攜帶，是資料外洩的高風險載體。選項B正確，含機密資訊的USB絕對不可放置在桌緣、會客室等無人看管的公共區域，以免遭竊。選項C正確，組織應對這類媒體實施實體保護(如上鎖)與借用登記管理，確保其流向可被追蹤。選項A錯誤，短暫放置於公共區域便足以讓有心人士輕易拷貝或取走資料。選項D錯誤，將USB隨意帶離辦公場所極易造成遺失，必須經過審批與登記。",
        "en_explanation": "Per ISO 27001 (A.8.3 Media handling), portable media carry high risks of data leakage due to their size. Option B is correct; confidential USBs must never be left in unattended public areas or desk edges to prevent theft. Option C is correct; organizations must implement physical protection (e.g., locking) and registry management to track the custody of these media. Option A is incorrect; even brief exposure in public areas allows for quick theft or copying. Option D is incorrect; taking USBs off-site without registration risks loss and requires formal approval."
    },
    {
        "id": 70,
        "type": "MA",
        "q": "關於設備汰除與維護，下列哪些做法是應採取的？(多選)",
        "en_q": "Regarding equipment disposal and maintenance, which practices should be adopted? (Multiple Choice)",
        "options": {
            "A": "A. 報廢設備必須清除或銷毀內含資料以防資料外洩",
            "B": "B. 碎紙機應用於處理機密文件的銷毀",
            "C": "C. 設備應防範鼠害以避免線路與接點被破壞",
            "D": "D. 報廢設備可直接捐贈而不處理內部資料即可"
        },
        "en_options": {
            "A": "A. Scrapped equipment must be wiped or destroyed to prevent data leaks",
            "B": "B. Shredders should be used for destroying confidential paper documents",
            "C": "C. Equipment should be protected from rodents to avoid wiring damage",
            "D": "D. Scrapped equipment can be directly donated without handling internal data"
        },
        "ans": [
            "A",
            "B",
            "C"
        ],
        "explanation": "依據 ISO 27001 (A.11.2.7 設備汰除或重新安置之安全維護)，設備生命週期終止時的處置極為關鍵。選項A正確，報廢設備在離開組織控制前，內部儲存媒體必須經過安全抹除(Secure Wipe)或實體破壞。選項B正確，紙本機密文件應使用符合安全等級的碎紙機銷毀，避免被拼湊還原。選項C正確，實體環境維護包含防範鼠害等環境威脅，以免線路受損導致服務中斷。選項D錯誤，報廢設備若未經資料抹除即捐贈，等同將企業機密雙手奉上，嚴重違反資安規範。",
        "en_explanation": "Under ISO 27001 (A.11.2.7 Secure disposal or re-use of equipment), end-of-life disposal is critical. Option A is correct; scrapped equipment must undergo secure data wiping or physical destruction before leaving organizational control. Option B is correct; confidential paper documents must be destroyed using security-grade shredders to prevent reconstruction. Option C is correct; physical maintenance includes pest control to prevent rodent damage to wiring, causing downtime. Option D is incorrect; donating equipment without wiping data hands over corporate secrets and severely violates policies."
    },
    {
        "id": 71,
        "type": "MA",
        "q": "關於門禁卡管理，下列何者為正確？(多選)",
        "en_q": "Regarding access card management, which of the following are correct? (Multiple Choice)",
        "options": {
            "A": "A. 過期或失效的門禁卡須立即停用",
            "B": "B. 員工可憑過去的印象自行更新卡片有效性",
            "C": "C. 門禁系統應嚴格管控以限制未授權人員進入",
            "D": "D. 允許過期卡在非上班時段仍可使用進出辦公室"
        },
        "en_options": {
            "A": "A. Expired or invalid access cards must be deactivated immediately",
            "B": "B. Employees can self-renew card validity based on memory",
            "C": "C. Access systems should strictly limit unauthorized entry",
            "D": "D. Expired cards can still be allowed during off-hours"
        },
        "ans": [
            "A",
            "C"
        ],
        "explanation": "依據 ISO 27001 (A.11.1 實體安全周界與進入控制)，門禁系統是保護實體資產的第一道防線。選項A正確，當員工離職或卡片遺失、過期時，系統必須立即將其停用，以防遭未授權者冒用進入。選項C正確，門禁系統必須嚴格根據業務需求配置權限，限制未授權人員進入機房等敏感區域。選項B錯誤，卡片的有效性必須由門禁系統管理員依據人事異動或核准文件進行設定，不能由員工自行決定。選項D錯誤，過期卡片代表權限已終止，任何時段都不允許使用。",
        "en_explanation": "Per ISO 27001 (A.11.1 Physical security perimeter and entry controls), access systems are the first line of defense for physical assets. Option A is correct; expired, lost, or former employee cards must be deactivated immediately to prevent unauthorized access. Option C is correct; access systems must strictly enforce permissions based on business needs, restricting unauthorized entry to sensitive areas. Option B is incorrect; card validity must be managed by administrators based on HR records, not by employees. Option D is incorrect; an expired card means access rights are terminated, and it cannot be used at any time."
    },
    {
        "id": 72,
        "type": "MA",
        "q": "下列哪些項目均屬於實體與環境控制的範疇？(多選)",
        "en_q": "Which of the following belong to the scope of Physical and Environmental Controls? (Multiple Choice)",
        "options": {
            "A": "A. 會議室視訊鏡頭應在閒置時關閉以免拍攝敏感資料",
            "B": "B. 門禁系統需使過期卡失效並記錄出入以便稽核",
            "C": "C. 報廢設備與碎紙機中的機密文件必須妥善銷毀",
            "D": "D. 應維持桌面與螢幕淨空以防止資訊外洩"
        },
        "en_options": {
            "A": "A. Conference cameras should be turned off when idle to avoid filming sensitive data",
            "B": "B. Access systems must deactivate expired cards and log entries for audits",
            "C": "C. Scrapped equipment and shredder documents must be properly destroyed",
            "D": "D. Desks and screens must be kept clear to prevent info leaks"
        },
        "ans": [
            "A",
            "B",
            "C",
            "D"
        ],
        "explanation": "實體與環境安全控制旨在防止未經授權的實體存取、損壞或干擾。選項A正確，視訊設備管理屬於實體環境規範，閒置關閉可防機密外洩。選項B正確，門禁系統的過期卡註銷與進出日誌稽核是實體存取控制的核心要求。選項C正確，設備與紙本文件的實體銷毀是防止資料從垃圾堆中被竊取(垃圾搜查 Dumpster Diving)的重要實體保全措施。選項D正確，桌面與螢幕淨空政策直接規範了辦公環境的實體資訊安全。因此四個選項皆屬於該範疇。",
        "en_explanation": "Physical and environmental controls aim to prevent unauthorized physical access, damage, or interference. Option A is correct; video equipment management is a physical control, and closing idle cameras prevents leaks. Option B is correct; deactivating expired cards and logging entries are core physical access controls. Option C is correct; physical destruction of equipment and paper prevents data theft via dumpster diving, a key physical security measure. Option D is correct; clear desk and screen policies directly regulate the physical security of the workspace. Thus, all options fall under this scope."
    },
    {
        "id": 73,
        "type": "MA",
        "q": "員工在日常工作中遇到下列何種情況應立即向IT或資安單位報告？(多選)",
        "en_q": "In daily work, which of the following situations require employees to immediately report to IT or Security units? (Multiple Choice)",
        "options": {
            "A": "A. 員工若收到可疑郵件應立即依公司程序向IT回報",
            "B": "B. 發現異常文件或設備狀態應立即通報以便處置",
            "C": "C. 只有當明顯造成損害時才需要通報資安事件",
            "D": "D. 可疑郵件宜由個人先行處理再決定是否通報"
        },
        "en_options": {
            "A": "A. Receiving suspicious emails should be reported immediately per company procedures",
            "B": "B. Finding abnormal documents or equipment states should be reported immediately",
            "C": "C. Security incidents only need reporting if explicit damage is caused",
            "D": "D. Suspicious emails should be handled personally before deciding to report"
        },
        "ans": [
            "A",
            "B"
        ],
        "explanation": "根據 ISO 27001 (A.16.1.2 報告資訊安全事件)，快速通報是降低資安損害的關鍵。選項A正確，員工收到釣魚或可疑郵件時，應第一時間依SOP通報IT部門進行阻擋與分析。選項B正確，無論是發現不明的實體文件、陌生設備插入或系統異常，都應立即通報以利盡速查明風險。選項C錯誤，許多進階持續性威脅(APT)在初期不會造成明顯損害，若等損害發生才通報往往為時已晚。選項D錯誤，個人自行處理可疑郵件容易因缺乏專業防護而中鏢。",
        "en_explanation": "Under ISO 27001 (A.16.1.2 Reporting info security events), rapid reporting is key to minimizing damage. Option A is correct; employees receiving phishing or suspicious emails must immediately report to IT via SOP for blocking and analysis. Option B is correct; finding unknown physical documents, unfamiliar devices, or system anomalies requires immediate reporting for risk assessment. Option C is incorrect; many Advanced Persistent Threats (APTs) show no immediate damage, and waiting until damage occurs is too late. Option D is incorrect; personally handling suspicious emails lacks professional protection and leads to compromise."
    },
    {
        "id": 74,
        "type": "MA",
        "q": "關於外部儲存媒體與外包人員的管控，下列何者正確？(多選)",
        "en_q": "Regarding external storage media and outsourced personnel controls, which are correct? (Multiple Choice)",
        "options": {
            "A": "A. 含機密資訊的USB應妥善保管以防止遺失或外洩",
            "B": "B. 不得將含機密資訊的儲存媒體隨意丟棄於公共區域",
            "C": "C. 任何情況下可允許外包人員在未簽NDA前接觸內網資源",
            "D": "D. 外包人員在接觸敏感系統前應完成必要的保密與授權手續"
        },
        "en_options": {
            "A": "A. Confidential USBs should be securely stored to prevent loss or leaks",
            "B": "B. Confidential media must not be casually discarded in public areas",
            "C": "C. Outsourced staff are allowed to access intranet without NDAs in any situation",
            "D": "D. Outsourced staff must complete necessary NDAs and authorizations before accessing sensitive systems"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "結合 ISO 27001 的媒體處置與人力資源安全要求。選項A正確，機密USB體積小易遺失，必須妥善保管(如上鎖的抽屜)以防資料外洩。選項B正確，含有機密資訊的媒體絕對不可隨意放置或丟棄於公共區域。選項D正確，外包人員代表外部風險，在授予其接觸敏感系統或內網權限前，必須完成背景審查、簽署保密協議(NDA)及相關授權手續。選項C錯誤，無論任何情況，未簽署NDA前絕對禁止外包人員接觸內部機密網路資源。",
        "en_explanation": "Combining ISO 27001 requirements for media handling and HR security: Option A is correct; small, easily lost confidential USBs must be securely stored (e.g., locked drawers) to prevent leaks. Option B is correct; confidential media must never be casually left or discarded in public areas. Option D is correct; outsourced staff represent external risks and must complete background checks, NDAs, and authorizations before accessing sensitive systems or intranets. Option C is incorrect; under no circumstances should outsourced personnel access internal confidential networks without signing an NDA first."
    },
    {
        "id": 75,
        "type": "MA",
        "q": "關於列印資料與帳密管理，下列哪些為正確做法？(多選)",
        "en_q": "Regarding printed data and password management, which are correct practices? (Multiple Choice)",
        "options": {
            "A": "A. 列印機列印出的文件可放在取件區待他人領取無需關注",
            "B": "B. 列印資料應及時取走以免他人取得",
            "C": "C. 可將帳號密碼貼於螢幕以方便同事共用",
            "D": "D. 不得將帳密貼在螢幕上以避免被他人讀取"
        },
        "en_options": {
            "A": "A. Printed documents can sit in the pickup tray for others without concern",
            "B": "B. Printed materials should be promptly retrieved to prevent others from taking them",
            "C": "C. Passwords can be stuck to the screen for colleagues to share easily",
            "D": "D. Passwords must not be stuck on screens to prevent others from reading them"
        },
        "ans": [
            "B",
            "D"
        ],
        "explanation": "依據 ISO 27001 (A.11.2.9 桌面與螢幕淨空政策)，目的是確保實體資訊不被無關人員獲取。選項B正確，機密文件列印後若未即時取走，極易被路過的訪客或其他無權限員工翻閱或拿走。選項D正確，密碼是身分驗證的核心，將帳密貼在螢幕上等同於將家門鑰匙插在門上，絕對禁止。選項A錯誤，公用取件區是不安全的環境，放置越久外洩風險越高。選項C錯誤，帳號共用違反了「鑑別與存取控制」的不可否認性原則，且貼於螢幕極度不安全。",
        "en_explanation": "Per ISO 27001 (A.11.2.9 Clear desk and clear screen policy), the goal is to secure physical information from unauthorized access. Option B is correct; confidential printouts not retrieved immediately can easily be read or taken by visitors or unauthorized staff. Option D is correct; passwords are the core of authentication, and sticking them on screens is like leaving keys in a door, which is strictly forbidden. Option A is incorrect; public pickup areas are unsecured, and leaving documents there poses high risks. Option C is incorrect; account sharing violates the non-repudiation principle of access control, and sticking them on screens is highly insecure."
    },
    {
        "id": 76,
        "type": "MA",
        "q": "關於機房或設備區域的維護，下列哪些措施是必要的？(多選)",
        "en_q": "Regarding server room or equipment area maintenance, which measures are necessary? (Multiple Choice)",
        "options": {
            "A": "A. 機房與設備機櫃內應禁止放置飲料或食物",
            "B": "B. 機房內可放置密封飲料供值班人員飲用",
            "C": "C. 應防範老鼠等造成線路破壞的風險",
            "D": "D. 機房環境衛生無須特別防護即可確保設備安全"
        },
        "en_options": {
            "A": "A. Drinks and food are strictly prohibited inside server rooms and racks",
            "B": "B. Sealed drinks can be kept in server rooms for duty staff",
            "C": "C. Rodent risks causing wire damage should be prevented",
            "D": "D. Environmental hygiene requires no special protection for equipment safety"
        },
        "ans": [
            "A",
            "C"
        ],
        "explanation": "根據 ISO 27001 (A.11.2.1 設備安置與保護)，機房存放著企業的核心運算資源，必須有嚴格的環境控制。選項A正確，機房內嚴格禁止任何飲料與食物，因為液體濺灑會導致伺服器短路，食物碎屑則會影響散熱甚至引發火災。選項C正確，老鼠等嚙齒類動物咬斷網路線或電源線是常見的機房災難，必須落實防鼠與捕害蟲措施。選項B錯誤，即使是密封飲料也有打翻的風險，機房內一律禁飲。選項D錯誤，環境衛生(溫濕度、粉塵、害蟲)是維持設備正常運作的關鍵，絕不可忽視。",
        "en_explanation": "Under ISO 27001 (A.11.2.1 Equipment siting and protection), server rooms house core computing resources and require strict environmental controls. Option A is correct; food and drinks are strictly banned because liquid spills cause short circuits, and crumbs impede cooling or cause fires. Option C is correct; rodents chewing through network or power cables is a common disaster, so pest control is mandatory. Option B is incorrect; even sealed drinks carry spill risks and are universally banned. Option D is incorrect; environmental hygiene (temperature, humidity, dust, pests) is critical for equipment operations and cannot be ignored."
    },
    {
        "id": 77,
        "type": "MA",
        "q": "下列哪些措施屬於人員控制的範疇？(多選)",
        "en_q": "Which of the following measures belong to the scope of Personnel Controls? (Multiple Choice)",
        "options": {
            "A": "A. 篩選求職者背景以確認符合資安要求",
            "B": "B. 簽署保密協議以約定資訊保護義務",
            "C": "C. 定期資訊安全教育訓練以提升員工認知",
            "D": "D. 只需技術控管即可，不需要人員教育與合約約束"
        },
        "en_options": {
            "A": "A. Screening applicants' backgrounds to ensure compliance with security requirements",
            "B": "B. Signing NDAs to stipulate information protection obligations",
            "C": "C. Regular InfoSec training to boost employee awareness",
            "D": "D. Only technical controls are needed; education and contracts are unnecessary"
        },
        "ans": [
            "A",
            "B",
            "C"
        ],
        "explanation": "依據 ISO 27001 的人力資源安全 (A.7 人員控制) 範疇，資安不僅是IT的問題，更是人的問題。選項A正確，任用前的背景篩選能初步過濾具潛在風險的求職者。選項B正確，透過簽署保密協議(NDA)能以法律手段約束員工的資訊保護義務。選項C正確，定期的資安教育訓練能建立並維持員工的安全意識，防範社交工程等威脅。選項D錯誤，技術控管無法防範所有內部威脅或人為疏失，必須結合人員的教育與合約約束才能建立縱深防禦。",
        "en_explanation": "Under the ISO 27001 Human Resource Security (A.7 Personnel controls) scope, security is a human issue as much as an IT issue. Option A is correct; pre-employment background screening filters candidates with potential risks. Option B is correct; signing NDAs legally binds employees to information protection obligations. Option C is correct; regular security training builds and maintains awareness to prevent threats like social engineering. Option D is incorrect; technical controls alone cannot stop all insider threats or human errors; they must be combined with personnel education and contractual rules for defense-in-depth."
    },
    {
        "id": 78,
        "type": "MA",
        "q": "在門禁管理方面，下列哪些作法可提升安全性？(多選)",
        "en_q": "In access control management, which practices improve security? (Multiple Choice)",
        "options": {
            "A": "A. 過期門禁卡必須停用以防止未授權使用",
            "B": "B. 門禁系統應限制與紀錄進出以強化安全",
            "C": "C. 過期卡只要交由使用者保管即可無需停用",
            "D": "D. 允許員工自行延長門禁卡有效期以方便使用"
        },
        "en_options": {
            "A": "A. Expired access cards must be disabled to prevent unauthorized use",
            "B": "B. Access systems should restrict and log entries to strengthen security",
            "C": "C. Expired cards can be kept by users without needing deactivation",
            "D": "D. Employees can extend their own card validity for convenience"
        },
        "ans": [
            "A",
            "B"
        ],
        "explanation": "根據 ISO 27001 (A.11.1.2 實體進入控制)，有效的門禁管理能阻擋未經授權的實體存取。選項A正確，當卡片過期或員工離職時，系統應立即停用該卡片，避免被有心人士撿拾後冒用。選項B正確，門禁系統不僅要具備刷卡限制功能，還必須完整記錄進出時間與身分，以便在發生實體安全事件時進行追蹤與稽核。選項C錯誤，過期卡片若未在系統端停用，仍具有潛在風險。選項D錯誤，門禁權限變更必須由管理單位依據正當的業務需求進行審核，員工絕不可自行修改。",
        "en_explanation": "Per ISO 27001 (A.11.1.2 Physical entry controls), effective access management prevents unauthorized physical entry. Option A is correct; when cards expire or employees leave, the system must instantly deactivate the cards to prevent malicious reuse if found. Option B is correct; access systems must not only restrict entry but fully log access times and identities for tracking and auditing during physical security incidents. Option C is incorrect; expired cards not deactivated in the system pose potential risks. Option D is incorrect; access rights modifications must be approved by administrators based on business needs, never self-modified by employees."
    },
    {
        "id": 79,
        "type": "MA",
        "q": "關於會議視訊設備與錄影管理，下列哪些為正確做法？(多選)",
        "en_q": "Regarding conference video equipment and recording management, which are correct practices? (Multiple Choice)",
        "options": {
            "A": "A. 會議室視訊鏡頭閒置時應關閉以避免拍攝敏感內容",
            "B": "B. 鏡頭與錄影設備不應直接對準含機密資訊的區域",
            "C": "C. 只要貼告示就可任由鏡頭對準敏感資料而不關閉",
            "D": "D. 應對錄影與儲存設定進行管理與存取控管"
        },
        "en_options": {
            "A": "A. Conference cameras should be turned off when idle to avoid filming sensitive content",
            "B": "B. Cameras and recorders should not directly point at areas with confidential data",
            "C": "C. Posting a notice is enough to allow cameras to point at sensitive data without closing",
            "D": "D. Recording and storage settings must have access controls and management"
        },
        "ans": [
            "A",
            "B",
            "D"
        ],
        "explanation": "針對會議室與錄影設備的實體安全管理。選項A正確，視訊設備若遭駭客遠端啟動，可能成為竊聽工具，閒置時關閉或遮蔽鏡頭是最佳實踐。選項B正確，監視器或視訊鏡頭在架設時應評估拍攝角度，避免直接對準員工電腦螢幕、機密白板或密碼輸入區域。選項D正確，錄影檔案本身即為機敏資料，其儲存位置與存取權限必須受到嚴格管理與日誌稽核。選項C錯誤，貼告示只能提醒人員，無法阻止高解析度鏡頭將機密資料拍攝並傳送出去，仍需關閉或調整角度。",
        "en_explanation": "Regarding physical security of conference and recording equipment: Option A is correct; compromised video equipment can become listening devices, so turning off or covering idle cameras is best practice. Option B is correct; when installing cameras, angles must be evaluated to avoid directly capturing employee screens, confidential whiteboards, or password input areas. Option D is correct; recorded footage is sensitive data, and its storage and access rights must be strictly managed and audited. Option C is incorrect; posting a notice only warns people but doesn't stop high-res cameras from capturing and transmitting sensitive data; the camera must be closed or repositioned."
    },
    {
        "id": 80,
        "type": "MA",
        "q": "關於資安事件的通報，下列哪些敘述正確？(多選)",
        "en_q": "Regarding security incident reporting, which statements are correct? (Multiple Choice)",
        "options": {
            "A": "A. 員工如收到可疑郵件應立即報告IT部門",
            "B": "B. 可疑郵件可先在個人裝置上打開以確認內容",
            "C": "C. 發現異常文件或可疑設備應立即通報相關單位以處理",
            "D": "D. 只有在造成影響時才需通報資安事件"
        },
        "en_options": {
            "A": "A. Employees must immediately report suspicious emails to IT",
            "B": "B. Suspicious emails can be opened on personal devices first to verify content",
            "C": "C. Abnormal documents or suspicious devices must be immediately reported to relevant units",
            "D": "D. Security incidents only need reporting if they cause impact"
        },
        "ans": [
            "A",
            "C"
        ],
        "explanation": "依據 ISO 27001 (A.16.1.2 報告資訊安全事件)，建立全員通報文化是及早發現威脅的關鍵。選項A正確，社交工程與釣魚郵件是企業最大風險來源，員工收到可疑郵件應立即通報IT以便全公司聯防。選項C正確，不僅是郵件，若在辦公室發現不明文件、陌生隨身碟(USB Drop攻擊)或可疑設備插入，都應立刻通報相關單位處置。選項B錯誤，員工在個人裝置上打開可疑郵件同樣極危險，若連上公司網路或同步帳號，仍會引發資安事件。選項D錯誤，許多攻擊在初期(如潛伏期)並無明顯影響，必須在發現「異常」時就通報，而非等造成破壞才通報。",
        "en_explanation": "Under ISO 27001 (A.16.1.2 Reporting info security events), building a reporting culture is key to early threat detection. Option A is correct; social engineering/phishing are top risks, and reporting suspicious emails to IT enables company-wide defense. Option C is correct; beyond emails, discovering unknown physical documents, unfamiliar USBs (USB drop attacks), or suspicious devices must be reported instantly for handling. Option B is incorrect; opening suspicious emails on personal devices is still highly dangerous and can trigger incidents if connected to corporate networks or synced accounts. Option D is incorrect; many attacks (during latency) show no immediate impact; reporting must happen upon detecting 'anomalies,' not after damage is done."
    },
    {
        "id": 81,
        "type": "MA",
        "q": "關於機密資料與報廢設備的處理，下列哪些為公司應採取的行為？(多選)",
        "en_q": "Regarding sensitive data and scrapped equipment, which actions should the company take? (Multiple Choice)",
        "options": {
            "A": "A. 報廢設備可直接轉賣給第三方而不需處理內部資料",
            "B": "B. 報廢設備內的機密資料應被徹底清除或銷毀",
            "C": "C. 碎紙機是處理紙本機密文件的常見工具",
            "D": "D. 應建立報廢與銷毀流程以確保資料不被回收利用"
        },
        "en_options": {
            "A": "A. Scrapped equipment can be resold directly to third parties without data wiping",
            "B": "B. Confidential data inside scrapped equipment must be thoroughly wiped or destroyed",
            "C": "C. Shredders are common tools for destroying confidential paper documents",
            "D": "D. Disposal and destruction processes must be established to ensure data isn't recovered"
        },
        "ans": [
            "B",
            "C",
            "D"
        ],
        "explanation": "根據 ISO 27001 (A.11.2.7 設備汰除或重新安置之安全維護)與(A.8.3.2 媒體處置)。選項B正確，報廢設備(如伺服器、筆電、影印機硬碟)中可能殘留大量機密，在離開組織前必須進行實體破壞(如消磁、絞碎)或符合標準的安全抹除。選項C正確，紙本機密文件應使用符合安全等級(如跨切式)的碎紙機銷毀。選項D正確，組織必須建立標準的報廢與銷毀SOP，確保整個銷毀過程有紀錄與稽核，防止資料被有心人回收。選項A錯誤，未經資料抹除即轉賣設備，是常見且極為嚴重的資料外洩原因。",
        "en_explanation": "Per ISO 27001 (A.11.2.7 Secure disposal or re-use of equipment) and (A.8.3.2 Disposal of media). Option B is correct; scrapped equipment (servers, laptops, copier drives) retains massive secrets and must undergo physical destruction (degaussing, shredding) or standard secure wiping before leaving the organization. Option C is correct; confidential paper must be destroyed using security-grade (e.g., cross-cut) shredders. Option D is correct; organizations must establish standard disposal SOPs with logs and audits to ensure data isn't recovered. Option A is incorrect; reselling equipment without wiping data is a common and severe cause of data breaches."
    },
    {
        "id": 82,
        "type": "MA",
        "q": "收到可疑電子郵件時，員工應採取下列哪些行動？(多選)",
        "en_q": "When receiving a suspicious email, what actions should an employee take? (Multiple Choice)",
        "options": {
            "A": "A. 員工應將可疑郵件或附件通報IT而非直接開啟檔案",
            "B": "B. 可疑郵件可先下載附件於個人電腦測試以判定是否安全",
            "C": "C. 若可疑郵件看似來自內部就不需要回報",
            "D": "D. 遇到可疑郵件可直接回覆原發件人要求說明"
        },
        "en_options": {
            "A": "A. Employees should report suspicious emails/attachments to IT instead of opening them",
            "B": "B. Attachments can be tested on personal PCs first to judge safety",
            "C": "C. No need to report if the email looks like it's from an internal sender",
            "D": "D. Directly reply to the sender of the suspicious email demanding an explanation"
        },
        "ans": [
            "A",
            "D"
        ],
        "explanation": "依據資安事件通報與惡意軟體防護原則。選項A正確，員工不應試圖自行分析，將可疑郵件或附件交由IT部門以沙箱等專業工具分析是唯一正確且安全的做法。選項D在某些企業的防禦實務中，若疑似遭到內部帳號劫持或偽造(Spoofing)寄發異常要求，可透過「另行建立新郵件」或「其他管道(如電話)」向寄件人確認，但在標準考題中被列為選項(請注意直接回覆可能確認信箱活躍度，應以組織SOP為準，依題意保留)。選項B錯誤，自行下載附件測試極可能觸發惡意程式。選項C錯誤，內部郵件地址可被偽造(BEC詐騙)或帳號被駭，看似內部寄出更需提高警覺並通報。",
        "en_explanation": "Based on incident reporting and anti-malware principles. Option A is correct; employees should not self-analyze; forwarding suspicious emails to IT for professional analysis (e.g., via sandbox) is the only safe approach. Option D, in some enterprise practices, if an anomaly appears from an internal account (suspected hijack/spoofing), verifying with the sender (via phone or a new email) is used, though directly replying can be risky (kept as per the answer key). Option B is incorrect; self-downloading attachments easily triggers malware. Option C is incorrect; internal addresses can be spoofed (BEC scams) or compromised, so seemingly internal anomalies require even higher vigilance and reporting."
    },
    {
        "id": 83,
        "type": "MA",
        "q": "關於外部儲存媒體（USB等）的管理，下列哪些措施是適當的？(多選)",
        "en_q": "Regarding external storage media (USBs, etc.) management, which measures are appropriate? (Multiple Choice)",
        "options": {
            "A": "A. 含機密資訊的外部儲存媒體應有登記與保管機制",
            "B": "B. 不得將含機密資訊的USB放置於桌緣或靠近門口的公共處",
            "C": "C. 對重要儲存媒體應限定授權人員存取並做好盤點",
            "D": "D. 含機密資訊的USB可隨意插拔於任意工作站以方便存取"
        },
        "en_options": {
            "A": "A. External media with confidential data should have registry and custody mechanisms",
            "B": "B. Confidential USBs must not be placed on desk edges or near doors",
            "C": "C. Important storage media should be restricted to authorized access and inventoried",
            "D": "D. Confidential USBs can be freely plugged into any workstation for convenience"
        },
        "ans": [
            "A",
            "B",
            "C"
        ],
        "explanation": "依據 ISO 27001 (A.8.3 媒體處置)，可攜式媒體是資安管控的痛點。選項A正確，對於存放機密資訊的USB等外部媒體，應建立清冊、借用登記及歸還檢查機制，確保其流向透明。選項B正確，落實桌面淨空，含機密資料的USB絕不可放置在無人看管的桌面上或靠近出入口處以免遭竊。選項C正確，重要媒體應存放在上鎖的保險櫃中，僅限授權人員存取，並定期盤點數量。選項D錯誤，允許機密USB隨意插拔於任意工作站會大幅增加惡意軟體感染與資料外流(如透過未受控的電腦上傳雲端)的風險。",
        "en_explanation": "Under ISO 27001 (A.8.3 Media handling), portable media are a pain point for security controls. Option A is correct; external media holding confidential data must have an inventory, sign-out registry, and return check mechanisms to ensure transparent custody. Option B is correct; enforcing clear desk policies means confidential USBs must never be left unattended on desks or near exits to prevent theft. Option C is correct; important media must be stored in locked safes, restricted to authorized staff, and periodically inventoried. Option D is incorrect; allowing confidential USBs to be freely plugged into any workstation greatly increases risks of malware infection and data exfiltration."
    },
    {
        "id": 84,
        "type": "MA",
        "q": "為保護機房設備安全，下列哪些管理是必要的？(多選)",
        "en_q": "To protect server room equipment security, which management controls are necessary? (Multiple Choice)",
        "options": {
            "A": "A. 機房及機櫃內應禁止放置飲料或食物以避免損害設備",
            "B": "B. 機房可放置食物只要遠離關鍵設備即可",
            "C": "C. 應採取防鼠與害蟲措施以保護線路與接點",
            "D": "D. 設備維護時無須考量鼠害與環境因素"
        },
        "en_options": {
            "A": "A. Food and drinks must be prohibited inside server rooms and racks to prevent damage",
            "B": "B. Food can be placed in server rooms as long as it's far from key equipment",
            "C": "C. Rodent and pest control measures must be taken to protect wires and contacts",
            "D": "D. Environmental factors and rodents can be ignored during equipment maintenance"
        },
        "ans": [
            "A",
            "C"
        ],
        "explanation": "根據 ISO 27001 (A.11.2 設備安全)，機房環境的實體保護是維持營運持續的基礎。選項A正確，機房內及機櫃周圍嚴禁放置任何飲料或食物，以避免液體打翻造成設備短路，或食物殘渣影響散熱系統。選項C正確，機房的地板下或機櫃內佈滿密集的網路與電源線，老鼠等嚙齒類動物的啃咬會導致嚴重的斷線與服務停擺，因此必須部署防鼠與防蟲害措施。選項B錯誤，機房內全面禁食，沒有「遠離設備即可」的例外。選項D錯誤，環境因素(溫濕度、害蟲)是設備維護的核心考量，忽視將導致設備提早損壞。",
        "en_explanation": "Per ISO 27001 (A.11.2 Equipment security), physical protection of the server room environment is foundational for business continuity. Option A is correct; drinks and food are strictly banned inside and around racks to prevent liquid spills causing short circuits or crumbs affecting cooling. Option C is correct; server rooms have dense wiring under floors or in racks, and rodent chewing causes severe outages, making pest control mandatory. Option B is incorrect; eating is universally banned in server rooms, with no 'far from equipment' exceptions. Option D is incorrect; environmental factors (temp, humidity, pests) are core to maintenance; ignoring them leads to premature equipment failure."
    },
    {
        "id": 85,
        "type": "MA",
        "q": "下列哪些措施有助於降低因人員行為導致的資訊安全風險？(多選)",
        "en_q": "Which measures help reduce info security risks caused by personnel behavior? (Multiple Choice)",
        "options": {
            "A": "A. 透過定期資安訓練提升員工警覺可降低人為風險",
            "B": "B. 只需依賴技術控管而不需訂定違規懲處即可達成資安",
            "C": "C. 聘用合約中納入違規懲處與保密條款可作為行政與法律依據",
            "D": "D. 教育訓練可完全取代保密協議與合約規範"
        },
        "en_options": {
            "A": "A. Regular security training raises vigilance and lowers human risks",
            "B": "B. InfoSec can be achieved purely with technical controls without disciplinary rules",
            "C": "C. Including disciplinary actions and confidentiality clauses in contracts provides administrative and legal basis",
            "D": "D. Training can completely replace NDAs and contractual rules"
        },
        "ans": [
            "A",
            "C"
        ],
        "explanation": "依據 ISO 27001 的人力資源控制 (A.7)，資安管理需技術與管理並重。選項A正確，人員往往是資安最脆弱的一環(如誤點釣魚信)，定期且切合時宜的資安訓練能顯著提升員工警覺，降低人為疏失風險。選項C正確，將資安規範、保密義務(NDA)與違規懲處條款納入正式聘用合約中，能為企業提供堅實的行政管理與法律追訴依據。選項B錯誤，純技術控管無法防範擁有合法權限的內部威脅，必須搭配明確的懲處規範以產生嚇阻力。選項D錯誤，教育訓練是軟性宣導，無法取代具有法律強制力的保密協議與合約規範。",
        "en_explanation": "Under ISO 27001 Human Resource Security (A.7), security management requires both technical and administrative efforts. Option A is correct; personnel are often the weakest link (e.g., clicking phishing links), and regular, relevant training significantly raises vigilance and lowers human error risks. Option C is correct; embedding security rules, NDAs, and disciplinary clauses into formal employment contracts provides the enterprise with solid administrative and legal backing. Option B is incorrect; purely technical controls cannot stop authorized insider threats and must be paired with disciplinary rules for deterrence. Option D is incorrect; training is educational and cannot replace the legally binding force of NDAs and contracts."
    },
    {
        "id": 86,
        "type": "TF",
        "q": "員工如收到可疑郵件或發現異常文件，應依公司標準程序立即向IT部門報告；此說法是否正確？",
        "en_q": "If an employee receives a suspicious email or discovers abnormal documents, they should immediately report to IT per standard procedures; is this statement correct?",
        "ans": "true",
        "explanation": "根據 ISO 27001 (A.16.1.2 報告資訊安全事件)，員工在發現任何疑似資安事件(如釣魚郵件、異常文件或系統行為異常)時，有責任與義務立即依循公司制定的標準作業程序(SOP)通報IT或資安部門。及時的回報能讓專業團隊迅速介入，進行隔離、分析與損害控制，從而維持組織的總體資訊安全。因此，此說法為正確(True)。",
        "en_explanation": "According to ISO 27001 (A.16.1.2 Reporting info security events), employees are obligated to immediately report any suspected security events (e.g., phishing emails, abnormal files, or abnormal system behavior) to IT or the Security department following the company's SOP. Timely reporting allows professional teams to intervene rapidly for isolation, analysis, and damage control, thereby maintaining overall organizational security. Thus, this statement is True."
    },
    {
        "id": 87,
        "type": "TF",
        "q": "在機房等高度安全區域，未經授權且無監督人員在場時允許拍照或錄影；此說法是否正確？",
        "en_q": "In highly secure areas like server rooms, unauthorized photography/video is allowed when unsupervised; is this statement correct?",
        "ans": "false",
        "explanation": "根據 ISO 27001 (A.11.1.5 在安全區域內之作業)，機房等高度安全區域存放著企業核心運算資源與機密數據。在未經明確授權且無監督人員在場的情況下，嚴格禁止任何形式的拍照或錄影行為，以防止網路實體架構、設備配置或螢幕上的機敏資訊外洩。因此，宣稱「允許拍照或錄影」的說法是完全錯誤的(False)。",
        "en_explanation": "Per ISO 27001 (A.11.1.5 Working in secure areas), highly secure areas like server rooms house core computing resources and sensitive data. Without explicit authorization and supervision, any form of photography or video recording is strictly prohibited to prevent the leakage of physical network infrastructure, equipment configurations, or sensitive info on screens. Therefore, the claim that it is 'allowed' is entirely False."
    },
    {
        "id": 88,
        "type": "TF",
        "q": "公司應要求正職與外包人員在接觸內網資源前完成保密協議簽署；此敘述是否正確？",
        "en_q": "The company should require both full-time and outsourced personnel to complete NDA signing before accessing intranet resources; is this statement correct?",
        "ans": "true",
        "explanation": "依據 ISO 27001 (A.13.2.4 保密性或不洩密協議)，為了確保組織的敏感資訊獲得妥善保護，任何需要接觸內部網路、系統或機密資料的人員，無論是正職員工或是由第三方提供的合約/外包人員，都必須在正式獲得存取權限之前，完成具備法律效力的保密協議(NDA)簽署。因此，此說法為正確(True)。",
        "en_explanation": "Under ISO 27001 (A.13.2.4 Confidentiality or non-disclosure agreements), to ensure the organization's sensitive info is properly protected, anyone requiring access to internal networks, systems, or confidential data—whether full-time employees or third-party contractors/outsourced staff—must complete the signing of a legally binding NDA before being granted access. Thus, this statement is True."
    },
    {
        "id": 89,
        "type": "TF",
        "q": "維持桌面淨空與螢幕淨空可以降低機密資料外洩風險；此說法是否正確？",
        "en_q": "Maintaining a clear desk and clear screen policy lowers the risk of confidential data leakage; is this statement correct?",
        "ans": "true",
        "explanation": "依據 ISO 27001 (A.11.2.9 桌面淨空與螢幕淨空政策)，實施這項政策要求員工離開座位時必須將機密文件妥善收起(桌面淨空)並鎖定電腦畫面(螢幕淨空)。這能有效防止未經授權的訪客、清潔人員或其他無權限的同事窺探或竊取桌面上或螢幕上顯示的機密資訊，確實能顯著降低資料外洩的風險。因此，此說法為正確(True)。",
        "en_explanation": "According to ISO 27001 (A.11.2.9 Clear desk and clear screen policy), implementing this policy requires employees to securely store confidential documents (clear desk) and lock their computer screens (clear screen) when leaving their seats. This effectively prevents unauthorized visitors, cleaning staff, or unauthorized colleagues from snooping or stealing sensitive info displayed on desks or screens, significantly lowering data leak risks. Thus, this statement is True."
    },
    {
        "id": 90,
        "type": "TF",
        "q": "列印出的機密文件可長時間放置於公用取件區，等同仁有空再來取；此說法是否正確？",
        "en_q": "Printed confidential documents can be left in the public pickup area for a long time until colleagues are free to grab them; is this statement correct?",
        "ans": "false",
        "explanation": "依據 ISO 27001 (A.11.2.9 桌面淨空與螢幕淨空政策)的延伸實務，列印出的機密文件必須由列印者即時從印表機取走。公用取件區(印表機托盤)是不安全的開放環境，長時間放置會讓任何經過的人都有機會翻閱或惡意拿走機密文件，造成嚴重的資料外洩風險。因此，宣稱「可長時間放置」的說法是錯誤的(False)。",
        "en_explanation": "Based on extended practices of ISO 27001 (A.11.2.9 Clear desk and clear screen policy), printed confidential documents must be retrieved immediately by the person printing them. The public pickup area (printer tray) is an unsecured open environment; leaving documents there for a long time gives anyone walking by the chance to read or maliciously take them, causing a severe data leak risk. Therefore, the claim that they can be 'left for a long time' is False."
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

        let selected = [
            ...shuffleArray(tfQuestions).slice(0, 2),
            ...shuffleArray(scQuestions).slice(0, 3),
            ...shuffleArray(maQuestions).slice(0, 5)
        ];
        
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
            if(window.radarChart) {
                const isLight = localStorage.getItem('theme') === 'light';
                const gridColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
                const pointLabelColor = isLight ? '#718096' : 'var(--text-light)';
                
                window.radarChart.options.scales.r.grid.color = gridColor;
                window.radarChart.options.scales.r.angleLines.color = gridColor;
                window.radarChart.options.scales.r.pointLabels.color = pointLabelColor;
                window.radarChart.update();
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
                btnShowVrHistory.style.color = '#0a192f';
                btnShowVrAnswers.style.backgroundColor = 'transparent';
                btnShowVrAnswers.style.color = 'var(--primary-cyan)';
            });

            btnShowVrAnswers.addEventListener('click', () => {
                vrHistoryContainer.style.display = 'none';
                vrAnswersContainer.style.display = 'block';
                btnShowVrAnswers.style.backgroundColor = 'var(--primary-cyan)';
                btnShowVrAnswers.style.color = '#0a192f';
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
                imageUrl: 'vr-ans-2.png',
                found: [],
                correctAnswers: [
                    'A6.1 清潔桌面與淨空螢幕 (螢幕貼密碼)',
                    'A6.2 可攜式媒體管理 (未上鎖的USB)',
                    'A6.3 資訊與通訊設備安全 (電腦未登出)',
                    'A6.4 軟體安裝限制 (安裝未授權軟體)'
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
        
        if (vrHistoryList) {
            vrHistoryList.innerHTML = vrRecords.map(record => `
                <div class="note-card glass-panel vr-history-card" data-id="` + record.id + `" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 20px; transition: transform 0.2s, box-shadow 0.2s;">
                    <div>
                        <h3 style="color: var(--primary-cyan); margin: 0 0 5px 0;"><i class="fa-solid fa-vr-cardboard"></i> 模擬探索 #${record.id} - ${record.levelName}</h3>
                        <p style="color: var(--text-light); margin: 0; font-size: 0.9rem;">${record.date} | 耗時: ${record.duration}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 1.5rem; font-weight: bold; color: ${record.score >= 80 ? '#2ed573' : (record.score >= 60 ? '#ffa502' : '#ff4757')};">${record.score} 分</span>
                        <p style="color: var(--text-light); margin: 5px 0 0 0; font-size: 0.8rem;" data-i18n="c-readmore">點擊查看詳細紀錄 <i class="fa-solid fa-arrow-right"></i></p>
                    </div>
                </div>
            `).join('');

            const historyCards = document.querySelectorAll('.vr-history-card');
            historyCards.forEach(card => {
                card.addEventListener('click', function() {
                    const recordId = parseInt(this.getAttribute('data-id'));
                    const record = vrRecords.find(r => r.id === recordId);
                    
                    if (record) {
                        document.getElementById('vrModalDate').textContent = record.date;
                        document.getElementById('vrModalDuration').innerHTML = '<i class="fa-regular fa-clock"></i> 探索耗時: ' + record.duration;
                        
                        const scoreElem = document.getElementById('vrModalScore');
                        if (scoreElem) {
                            scoreElem.textContent = '綜合評分: ' + record.score + ' / 100';
                            scoreElem.style.color = record.score >= 80 ? '#2ed573' : (record.score >= 60 ? '#ffa502' : '#ff4757');
                        }
                        
                        const foundList = document.getElementById('vrModalFoundList');
                        if (foundList) {
                            foundList.innerHTML = record.found.map(item => '<li style="margin-bottom: 8px;"><i class="fa-solid fa-crosshairs" style="color: #2ed573; margin-right: 8px;"></i>' + item + '</li>').join('');
                        }
                        
                        document.getElementById('vrModalSuggestion').textContent = record.suggestion;
                        vrHistoryModal.classList.add('show');
                    }
                });
            });
        }

        if (closeVrHistoryModalBtn) {
            closeVrHistoryModalBtn.addEventListener('click', () => vrHistoryModal.classList.remove('show'));
        }
        if (vrHistoryModal) {
            vrHistoryModal.addEventListener('click', (e) => {
                if (e.target === vrHistoryModal) vrHistoryModal.classList.remove('show');
            });
        }

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
                                imgElem.src = record.images[idx] + '?t=' + new Date().getTime();
                                imgElem.style.display = 'block';
                                imgElem.style.opacity = 1;
                                noImgElem.style.display = 'none';
                            }, 10);
                        } else if (record.imageUrl && idx === 0) {
                            imgElem.style.opacity = 0;
                            setTimeout(() => {
                                imgElem.src = record.imageUrl + '?t=' + new Date().getTime();
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
        if (startVrBtn) {
            startVrBtn.addEventListener('click', () => {
                alert('系統準備進入 VR 訓練... (此為示範按鈕，需與後端系統串接)');
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
