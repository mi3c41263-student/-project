
const API_BASE_URL = 'http://localhost:3000';
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
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if(this.getAttribute('href') === '#') {
                e.preventDefault(); 
                menuItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                const menuText = this.textContent.trim();
                if (breadcrumbTitle) breadcrumbTitle.textContent = menuText;

                // 先把所有區塊都隱藏
                if (notesSection) notesSection.style.display = 'none';
                if (analysisSection) analysisSection.style.display = 'none';
                if (manualSection) manualSection.style.display = 'none';
                if (quizSection) quizSection.style.display = 'none';

                // 取得當前語系字典以設定副標題
                const langSelectElem = document.getElementById('langSelect');
                const currentLang = langSelectElem ? langSelectElem.value : 'zh-TW';
                const dict = i18nDictionary[currentLang] || i18nDictionary['zh-TW'];

                // 根據 i18n 屬性顯示對應區塊 (不再依賴 innerText 判斷，解決語系切換失效的問題)
                const menuId = this.getAttribute('data-i18n');
                if (menuId === 'nav-manual') {
                    if (manualSection) manualSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = dict['sub-manual'];
                } else if (menuId === 'nav-notes') {
                    if (notesSection) notesSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = dict['top-subtitle'];
                } else if (menuId === 'nav-analysis') {
                    if (analysisSection) analysisSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = dict['sub-analysis'];
                    
                    if (!window.radarChartCreated) {
                        if (typeof initRadarChart === 'function') initRadarChart();
                        window.radarChartCreated = true;
                    }
                } else if (menuId === 'nav-quiz') { 
                    if (quizSection) quizSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = dict['sub-quiz'];
                    
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
    const i18nDictionary = {
        'zh-TW': {
            'nav-core': '核心訓練', 'nav-vr': '<i class="fa-solid fa-vr-cardboard"></i> VR 情境模擬', 'nav-manual': '<i class="fa-solid fa-shield-halved"></i> 資安規範手冊', 'nav-quiz': '<i class="fa-solid fa-clipboard-list"></i> 資安小測驗', 'nav-history': '學習歷程', 'nav-notes': '<i class="fa-solid fa-book-open"></i> 學習筆記', 'nav-analysis': '<i class="fa-solid fa-chart-pie"></i> 學習成果分析', 'nav-logout': '<i class="fa-solid fa-right-from-bracket"></i> 登出',
            'set-title': '<i class="fa-solid fa-sliders"></i> 系統設定', 'set-tab-acc': '<i class="fa-solid fa-shield-halved"></i> 帳號與安全', 'set-tab-pref': '<i class="fa-solid fa-globe"></i> 系統偏好', 'set-acc-title': '個人帳號與安全性設定', 'set-pwd': '更改密碼', 'set-2fa': '雙重認證 (2FA)', 'set-pref-title': '系統偏好設定', 'set-lang': '介面語系',
            'top-title': '學習筆記', 'top-subtitle': '沉澱並複習您的資安防禦實務',
            'search-ph': '搜尋筆記關鍵字 (例如: 門禁、釣魚)...',
            'filter-all': '全部筆記', 'filter-social': '人員控制', 'filter-network': '資安事件', 'filter-device': '實體安全',
            'c1-title': '門禁漏洞與桌面淨空缺失', 'c1-desc': '發現使用過期卡片仍可進入大廳 (7.2實體進入控制漏洞)。此外，主管識別證被隨意棄置桌面，測試用USB放在靠近門口的桌緣。印表機上也有未認領的資料，未落實桌面淨空 (7.7)。',
            'c2-title': '聘用流程與保密協議疏漏', 'c2-desc': '發現公司缺少對求職者的背景查證紀錄 (6.1篩選)。更嚴重的是，有外包人員未簽署保密協議 (6.6 NDA) 就接觸內網。聘用合約也缺少違規懲處機制 (6.2)。',
            'c3-title': '機房安全與設備安置風險', 'c3-desc': '目擊外包維修工在機房內違規拍照 (7.6在安全區域工作)。機房設備上放著乖乖，且地板下電線有被老鼠啃咬的痕跡，嚴重違反設備安置與保護規範。',
            'c4-title': '釣魚測試失敗與通報意識', 'c4-desc': '發送模擬釣魚郵件後，員工點擊了惡意附件。但員工卻未向 IT 部門報告 (6.8報告資安事件)。這顯示日常的資訊安全認知教育及訓練 (6.3) 尚未完全落實。',
            'c-add-title': '新增稽核發現', 'c-add-desc': '上傳缺失照片與對應法規', 'c-readmore': '檢視完整筆記 <i class="fa-solid fa-arrow-right"></i>',
            'm-cat': '稽核總結', 'm-title': '結束會議：今日三大核心缺失',
            'm-p1': '在今日的實務演練中，我向資安主管報告了以下三大缺失：',
            'm-li1': '<strong>實體門禁控制失效 (7.2)：</strong> 測試大廳門禁時，發現使用過期卡片仍可進入。',
            'm-li2': '<strong>保密協議 (6.6) 漏洞：</strong> 檢查人資部資料發現，部分外包人員的 NDA 還在跑流程，未簽署即接觸內網資源。',
            'm-li3': '<strong>缺乏報告資安事件意識 (6.8)：</strong> 員工點擊釣魚文件附件後，卻因為「忙著趕報告」而未進行通報。',
            'm-p2': '資安主管表示這些發現非常有價值，將針對 these 佐證照片重新檢討訓練計畫。',
            'm-btn-edit': '<i class="fa-solid fa-pen-to-square"></i> 編輯報告',
            'man-iso': 'ISO 27002:2022 資訊安全控制指南', 'man-desc': '本手冊收錄本次稽核任務之重點控制措施。請熟記以下條文，以利在 VR 情境中準確判斷缺失。',
            'man-c6': 'Clause 6: 人員控制措施', 'man-c7': 'Clause 7: 實體環境控制',
            'man-c6-title': 'Clause 6 人員控制措施', 'man-c7-title': 'Clause 7 實體與環境控制',
            'r61-t': '篩選 (Screening)', 'r61-d': '公司準則應明確記載對求職者的相關背景調查紀錄，確保人員背景符合資安要求。',
            'r62-t': '聘用條款及條件 (Terms and conditions of employment)', 'r62-d': '聘用合約中應包含員工違反資安規定時的懲處機制，以及離職後的保密條款。',
            'r63-t': '資訊安全認知、教育訓練與獎懲', 'r63-d': '定期舉辦資安講習。員工不得隨意放置識別證，重大違規將直接影響績效獎金，情節嚴重者進行行政警告。',
            'r66-t': '保密協議 (NDA)', 'r66-d': '包含正職與外包人員，在接觸內網資源前，必須確保已完成保密協議的簽署流程。',
            'r68-t': '報告資安事件', 'r68-d': '員工如收到可疑郵件或發現異常文件，必須依照標準程序立即向 IT 部門報告。',
            'r71-t': '實體安全周界與進入控制', 'r71-d': '會議室視訊鏡頭未使用時應關閉，避免正對敏感文件。門禁系統應嚴格管控，過期卡片必須失效。',
            'r76-t': '在安全區域工作 (Working in secure areas)', 'r76-d': '在機房等高度安全區域內，未經授權且無監督人員在場的情況下，嚴禁進行拍照或錄影。',
            'r77-t': '桌面淨空及螢幕淨空', 'r77-d': '機密文件、訪客名片、USB不應隨意放置桌面。印表機資料應及時取走，嚴禁將帳密貼在螢幕上。',
            'r710-t': '儲存媒體實體存放安全', 'r710-d': '含有機密資訊或測試用的 USB 隨身碟，必須妥善保管，不可隨意丟棄於靠近門口或公共區域的桌緣。',
            'r714-t': '設備維護與汰除保全', 'r714-d': '機房設備禁止放置飲料食物(如乖乖)，並應防範老鼠破壞線路。報廢設備與碎紙機內的機密文件必須妥善銷毀。',
            'ana-title': '防禦能力雷達與綜合評估', 'ana-desc': '基於您在 VR 情境模擬中的決策數據，系統為您生成了專屬的資安能力雷達圖。',
            'quiz-title': '資安稽核情境模擬測驗', 'quiz-desc': '本測驗將隨機抽取 10 題是非&選擇題，包含實務稽核的灰色地帶與複合陷阱，驗證您的真實防禦能力。',
            'sub-manual': '檢視 ISO 27002:2022 重點控制措施', 'sub-analysis': '評估您的資安防禦綜合能力', 'sub-quiz': '資安稽核情境模擬測驗'
        },
        'en': {
            'nav-core': 'Core Training', 'nav-vr': '<i class="fa-solid fa-vr-cardboard"></i> VR Simulation', 'nav-manual': '<i class="fa-solid fa-shield-halved"></i> Security Manual', 'nav-quiz': '<i class="fa-solid fa-clipboard-list"></i> Security Quiz', 'nav-history': 'History', 'nav-notes': '<i class="fa-solid fa-book-open"></i> Learning Notes', 'nav-analysis': '<i class="fa-solid fa-chart-pie"></i> Analysis', 'nav-logout': '<i class="fa-solid fa-right-from-bracket"></i> Logout',
            'set-title': '<i class="fa-solid fa-sliders"></i> Settings', 'set-tab-acc': '<i class="fa-solid fa-shield-halved"></i> Account', 'set-tab-pref': '<i class="fa-solid fa-globe"></i> Preferences', 'set-acc-title': 'Account & Security', 'set-pwd': 'Change Password', 'set-2fa': 'Two-Factor Auth (2FA)', 'set-pref-title': 'System Preferences', 'set-lang': 'Language',
            'top-title': 'Learning Notes', 'top-subtitle': 'Review your security defense practices',
            'search-ph': 'Search keywords (e.g., Access, Phishing)...',
            'filter-all': 'All Notes', 'filter-social': 'Personnel Control', 'filter-network': 'Security Events', 'filter-device': 'Physical Security',
            'c1-title': 'Access Control & Clear Desk Violations', 'c1-desc': 'Found that expired cards can still access the lobby (7.2). The manager\'s ID was left on the desk, and a test USB was at the edge of the table. Unclaimed documents were on the printer (7.7).',
            'c2-title': 'Hiring Process & NDA Omissions', 'c2-desc': 'The company lacks background check records for candidates (6.1). Crucially, outsourced staff accessed the intranet without signing NDAs (6.6).',
            'c3-title': 'Server Room & Equipment Risks', 'c3-desc': 'Witnessed a maintenance worker taking photos in the server room (7.6). Equipment protection was violated with snacks on servers and wires chewed by rats under the floor.',
            'c4-title': 'Phishing Test Failure', 'c4-desc': 'Employees clicked malicious attachments in a simulated phishing email and failed to report it to the IT department (6.8). Security awareness training is lacking (6.3).',
            'c-add-title': 'Add Audit Finding', 'c-add-desc': 'Upload photos and regulations', 'c-readmore': 'Read Full Note <i class="fa-solid fa-arrow-right"></i>',
            'm-cat': 'Audit Summary', 'm-title': 'Closing Meeting: Top 3 Deficiencies',
            'm-p1': 'During today\'s practical drill, I reported the following top three deficiencies to the Security Manager:',
            'm-li1': '<strong>Access Control Failure (7.2):</strong> Expired cards could still be used to enter the lobby.',
            'm-li2': '<strong>NDA Loophole (6.6):</strong> Outsourced personnel accessed internal resources before their NDAs were fully processed.',
            'm-li3': '<strong>Lack of Incident Reporting (6.8):</strong> Employees clicked phishing links but failed to report them due to "being busy with reports".',
            'm-p2': 'The Security Manager stated these findings are valuable and will review the training plan based on these photographic evidence.',
            'm-btn-edit': '<i class="fa-solid fa-pen-to-square"></i> Edit Report',
            'man-iso': 'ISO 27002:2022 Information Security Controls', 'man-desc': 'This manual includes key controls for this audit task. Please familiarize yourself with them to accurately identify deficiencies in the VR scenario.',
            'man-c6': 'Clause 6: Personnel Controls', 'man-c7': 'Clause 7: Physical Controls',
            'man-c6-title': 'Clause 6 Personnel Controls', 'man-c7-title': 'Clause 7 Physical & Environmental Controls',
            'r61-t': 'Screening', 'r61-d': 'Company guidelines should clearly document background verification checks on candidates to ensure their background meets security requirements.',
            'r62-t': 'Terms and conditions of employment', 'r62-d': 'Employment contracts should include disciplinary mechanisms for violating security regulations and post-employment confidentiality clauses.',
            'r63-t': 'Information security awareness, education and training', 'r63-d': 'Regular security seminars should be held. IDs must not be left unattended. Major violations will affect performance bonuses, and severe cases will lead to administrative warnings.',
            'r66-t': 'Confidentiality or non-disclosure agreements (NDA)', 'r66-d': 'Full-time and outsourced personnel must ensure the completion of NDA signing processes before accessing internal network resources.',
            'r68-t': 'Reporting information security events', 'r68-d': 'If employees receive suspicious emails or find abnormal documents, they must immediately report to the IT department following standard procedures.',
            'r71-t': 'Physical security perimeter & Entry controls', 'r71-d': 'Conference room webcams should be turned off when not in use to avoid facing sensitive documents. Access control systems must be strictly managed; expired cards must be invalidated.',
            'r76-t': 'Working in secure areas', 'r76-d': 'In highly secure areas like server rooms, unauthorized photography or recording is strictly prohibited without authorized supervision.',
            'r77-t': 'Clear desk and clear screen', 'r77-d': 'Sensitive documents, visitor business cards, and USBs should not be casually left on desks. Printer materials should be promptly retrieved. Sticking passwords on screens is strictly prohibited.',
            'r710-t': 'Storage media', 'r710-d': 'USB flash drives containing sensitive information or for testing must be properly secured and cannot be casually left near doors or on table edges in public areas.',
            'r714-t': 'Equipment maintenance & Secure disposal', 'r714-d': 'No food or drinks (like Kuai Kuai snacks) are allowed in server rooms, and lines must be protected from rats. Obsolete equipment and sensitive documents in shredders must be properly destroyed.',
            'ana-title': 'Defense Capability Radar & Comprehensive Evaluation', 'ana-desc': 'Based on your decision data in the VR scenario simulation, the system has generated your exclusive security capability radar chart.',
            'quiz-title': 'Security Audit Scenario Simulation Quiz', 'quiz-desc': 'This test will randomly select 10 true/false & multiple-choice questions, covering gray areas and complex traps in practical audits to verify your real defense capabilities.',
            'sub-manual': 'Review ISO 27002:2022 Key Controls', 'sub-analysis': 'Evaluate your comprehensive security capabilities', 'sub-quiz': 'Security Audit Scenario Simulation Quiz'
        }
    };
    // 監聽下拉選單切換
    document.body.addEventListener('change', function(e) {
        if (e.target.id === 'langSelect') {
            const selectedLang = e.target.value;
            const dict = i18nDictionary[selectedLang];
            if (!dict) return;
            
            // 翻譯所有帶有 data-i18n 屬性的元素
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (dict[key]) el.innerHTML = dict[key];
            });
            
            // 翻譯所有帶有 data-i18n-placeholder 屬性的輸入框
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (dict[key]) el.setAttribute('placeholder', dict[key]);
            });

            // 動態更新雷達圖與折線圖的語系
            if (window.myRadarChart) {
                const radarLabels = selectedLang === 'en' 
                    ? ['Physical Protection', 'Anti-Social Engineering', 'Server Room Security', 'Device Control', 'Regulatory Awareness']
                    : ['實體防護', '社交工程防範', '機房安全', '設備管控', '法規認知'];
                window.myRadarChart.data.labels = radarLabels;
                window.myRadarChart.update();
            }
            if (window.myTrendChart) {
                const trendLabel = selectedLang === 'en' ? 'Overall Security Score' : '資安防禦綜合分數';
                window.myTrendChart.data.datasets[0].label = trendLabel;
                window.myTrendChart.update();
            }

            if (window.updateQuizLanguage) {
                window.updateQuizLanguage();
            }
        }
    });
  // =========================================
    // 8. 頁面載入時：更新左下角使用者資訊 & 個人檔案設定
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
                    html2canvas: { scale: 2, scrollY: 0, backgroundColor: '#ffffff', useCORS: true },
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
window.initRadarChart = async function() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return; // 防呆：沒登入就不執行
    const user = JSON.parse(userStr);

    let scores = [0, 0, 0, 0, 0]; // 預設雷達圖數值

    try {
        // 🌟 1. 向 Node.js 後端請求該用戶的成績數據
        const response = await fetch(`${API_BASE_URL}/api/stats?userId=${user.id}`);
        const resData = await response.json();

        if (resData.success) {
            const stats = resData.data;
            scores = stats.radarScores; // 覆蓋為後端傳來的真實陣列

            // 🌟 2. 動態更新右側三張數據卡片
            const valScore = document.getElementById('valScore');
            const valTime = document.getElementById('valTime');
            const valBlock = document.getElementById('valBlock');

            if (valScore) valScore.innerHTML = `${stats.totalScore}<small>分</small>`;
            if (valTime) valTime.innerHTML = `${stats.trainingHours}<small>小時</small>`;
            if (valBlock) valBlock.innerHTML = `${stats.blocks}<small>次</small>`;
        }
    } catch (error) {
        console.error("讀取後端數據失敗:", error);
    }

    // 🌟 3. 繪製 Chart.js 雷達圖
    const ctx = document.getElementById('securityRadarChart');
    if (!ctx) return;

    // 配合你現有 CSS 的文字顏色設定
    Chart.defaults.color = '#8892b0'; 

    const langSelectElem = document.getElementById('langSelect');
    const initLang = langSelectElem ? langSelectElem.value : 'zh-TW';

    window.myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            // 配合你 ISO 27002 手冊的屬性標籤，加上多國語系
            labels: initLang === 'en' 
                ? ['Physical Protection', 'Anti-Social Engineering', 'Server Room Security', 'Device Control', 'Regulatory Awareness']
                : ['實體防護', '社交工程防範', '機房安全', '設備管控', '法規認知'], 
            datasets: [{
                label: initLang === 'en' ? 'Security Capability' : '資安防禦力',
                data: scores,
                backgroundColor: 'rgba(0, 168, 255, 0.2)', // 使用你的 --primary-cyan
                borderColor: '#00a8ff',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#00a8ff',
                pointHoverBackgroundColor: '#00a8ff',
                pointHoverBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: {
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#e2e8f0' // 加亮標籤顏色使其更清晰
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: { display: false }
                }
            },
            plugins: {
                legend: { display: false } // 隱藏多餘的圖例，保持畫面乾淨
            }
        }
    });
    // 🌟 4. 繪製 Chart.js 歷史趨勢折線圖
    const lineCtx = document.getElementById('trendLineChart');
    if (lineCtx && resData.success && resData.data.trendData.length > 0) {
        
        // 防呆：如果之前畫過折線圖，先把它銷毀，避免畫面重疊閃爍
        if (window.myTrendChart) {
            window.myTrendChart.destroy();
        }

        window.myTrendChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: resData.data.trendLabels, // X軸：第1次、第2次...
                datasets: [{
                    label: initLang === 'en' ? 'Overall Security Score' : '資安防禦綜合分數',
                    data: resData.data.trendData, // Y軸：總分
                    borderColor: '#00a8ff',       // 科技感亮藍色線條
                    backgroundColor: 'rgba(0, 168, 255, 0.1)', // 線條下方的半透明漸層
                    borderWidth: 2,
                    fill: true,                   // 填滿下方區域
                    tension: 0.4,                 // 讓線條變成平滑曲線 (0 是折線，0.4 是曲線)
                    pointBackgroundColor: '#1c2638',
                    pointBorderColor: '#00a8ff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }, // 隱藏上方圖例
                    tooltip: {
                        backgroundColor: 'rgba(28, 38, 56, 0.9)',
                        titleColor: '#8892b0',
                        bodyColor: '#fff',
                        borderColor: '#00a8ff',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100, // 分數最高 100
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#8892b0' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8892b0' }
                    }
                }
            }
        });
    }
};
// =========================================
    // 12.5 圖表切換按鈕邏輯 (雷達圖 vs 折線圖)
    // =========================================
    const btnShowRadar = document.getElementById('btnShowRadar');
    const btnShowLine = document.getElementById('btnShowLine');
    const radarContainer = document.getElementById('radarContainer');
    const lineContainer = document.getElementById('lineContainer');

    if (btnShowRadar && btnShowLine) {
        // 點擊「最新能力」
        btnShowRadar.addEventListener('click', (e) => {
            e.preventDefault();
            btnShowRadar.style.backgroundColor = '#00a8ff';
            btnShowRadar.style.color = '#000';
            btnShowLine.style.backgroundColor = 'transparent';
            btnShowLine.style.color = '#00a8ff';

            radarContainer.style.display = 'block';
            lineContainer.style.display = 'none';

            //  叫雷達圖重新適應畫面大小
            if (window.myRadarChart) {
                window.myRadarChart.resize();
            }
        });

        // 點擊「歷史趨勢」
        btnShowLine.addEventListener('click', (e) => {
            e.preventDefault();
            btnShowLine.style.backgroundColor = '#00a8ff';
            btnShowLine.style.color = '#000';
            btnShowRadar.style.backgroundColor = 'transparent';
            btnShowRadar.style.color = '#00a8ff';

            lineContainer.style.display = 'block';
            radarContainer.style.display = 'none';

            // 叫折線圖重新計算並長出畫面！
            if (window.myTrendChart) {
                window.myTrendChart.resize();
            }
        });
    }
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
                    background: '#1c2638',
                    color: '#fff'
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
                        background: '#1c2638', color: '#e2e8f0'
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
                        background: '#1c2638', color: '#fff',
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
                            <p style="color: #8892b0; font-size: 0.95rem; margin-bottom: 20px;">請打開 <strong>Google Authenticator</strong> 掃描下方條碼</p>
                            <img src="${data.qrCodeUrl}" style="border: 5px solid white; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 0 15px rgba(0, 168, 255, 0.4);">
                            <br>
                            <input type="text" id="swal-input-2fa" class="cyber-input" placeholder="請輸入 6 位數驗證碼" maxlength="6" style="text-align: center; font-size: 1.5rem; letter-spacing: 8px; font-weight: bold; width: 80%;">
                        `,
                        background: '#1c2638', color: '#fff',
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
                                background: '#1c2638', color: '#fff', timer: 2500, showConfirmButton: false
                            });
                            // 更新前端記憶體，讓開關保持打開
                            user.is_2fa_enabled = true;
                            localStorage.setItem('currentUser', JSON.stringify(user));
                        } else {
                            Swal.fire({ icon: 'error', title: '驗證失敗', text: verifyData.message, background: '#1c2638', color: '#fff' });
                            e.target.checked = false; // 驗證失敗，開關退回關閉
                        }
                    } else {
                        e.target.checked = false; // 使用者按取消，開關退回關閉
                    }
                } catch (error) {
                    console.error(error);
                    Swal.fire({ icon: 'error', title: '錯誤', text: '無法連線到伺服器產生 QR Code', background: '#1c2638', color: '#fff' });
                    e.target.checked = false;
                }
            } else {
                // 🔘 狀態：使用者想「關閉」2FA
                const { isConfirmed } = await Swal.fire({
                    title: '確定要停用 2FA 嗎？', text: '停用後，您的帳號容易遭受惡意攻擊！', icon: 'warning',
                    background: '#1c2638', color: '#fff', showCancelButton: true,
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
                            Swal.fire({ icon: 'info', title: '2FA 已停用', background: '#1c2638', color: '#fff', timer: 2000, showConfirmButton: false });
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
                        <label style="color: #8892b0; font-size: 0.9rem;">目前密碼</label>
                        <div style="position: relative; margin-bottom: 15px;">
                            <input id="swal-curr-pwd" type="password" class="cyber-input" style="width: 100%; text-align: center; letter-spacing: 3px; padding-right: 40px;" placeholder="輸入目前的密碼">
                            <i class="fa-solid fa-eye-slash toggle-pwd-icon" data-target="swal-curr-pwd" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #8892b0;"></i>
                        </div>
                        
                        <label style="color: #8892b0; font-size: 0.9rem;">新密碼</label>
                        <div style="position: relative; margin-bottom: 15px;">
                            <input id="swal-new-pwd" type="password" class="cyber-input" style="width: 100%; text-align: center; letter-spacing: 3px; padding-right: 40px;" placeholder="至少8碼，含大小寫與數字">
                            <i class="fa-solid fa-eye-slash toggle-pwd-icon" data-target="swal-new-pwd" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #8892b0;"></i>
                        </div>
                        
                        <label style="color: #8892b0; font-size: 0.9rem;">確認新密碼</label>
                        <div style="position: relative; margin-bottom: 15px;">
                            <input id="swal-conf-pwd" type="password" class="cyber-input" style="width: 100%; text-align: center; letter-spacing: 3px; padding-right: 40px;" placeholder="再次輸入新密碼">
                            <i class="fa-solid fa-eye-slash toggle-pwd-icon" data-target="swal-conf-pwd" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #8892b0;"></i>
                        </div>
                    </div>
                `,
                background: '#1c2638', color: '#fff',
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
                                this.style.color = '#8892b0';
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
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
                    if (!passwordRegex.test(newPwd)) {
                        Swal.showValidationMessage(' 密碼強度不足 (需8碼，含大小寫英文字母與數字)！');
                        return false;
                    }
                    return { currentPassword: curr, newPassword: newPwd };
                }
            });

            if (formValues) {
                try {
                    Swal.fire({
                        title: '加密傳輸中...',
                        background: '#1c2638', color: '#fff',
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
                        Swal.fire({ icon: 'success', title: '修改成功！', text: data.message, background: '#1c2638', color: '#fff' });
                    } else {
                        Swal.fire({ icon: 'error', title: '修改失敗', text: data.message, background: '#1c2638', color: '#fff' });
                    }
                } catch (error) {
                    Swal.fire({ icon: 'error', title: '連線失敗', text: '無法連接到伺服器', background: '#1c2638', color: '#fff' });
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
        // === 【進階是非題 1 ~ 25 題】 ===
        { id: 1, type: 'TF', 
          q: '為了加速系統上線，外包開發人員可先以「訪客身分」換發臨時證進入研發機房，待專案結束前補齊背景查核與保密協議(NDA)即可。', 
          en_q: 'To accelerate system deployment, outsourced developers can initially enter the R&D server room using a "visitor" temporary badge, and complete background checks and NDAs before the project ends.', 
          ans: 'false' },
        { id: 2, type: 'TF', 
          q: '依據實體環境控制原則，交貨與裝卸貨區域（Delivery and loading areas）應與資訊處理設施嚴格隔離，以避免外部送貨員直接看見或進入安全區域。', 
          en_q: 'According to physical environment control principles, delivery and loading areas should be strictly isolated from information processing facilities to prevent external delivery personnel from viewing or entering secure areas.', 
          ans: 'true' },
        { id: 3, type: 'TF', 
          q: '員工離職時，僅需由 IT 部門撤銷其邏輯存取權限（如 VPN、Email），實體門禁卡因屬人資管轄，待其下週回公司辦手續時再收回即可。', 
          en_q: 'When an employee resigns, only the IT department needs to revoke logical access (e.g., VPN, Email). Since physical access cards are managed by HR, they can be collected next week when the employee returns for paperwork.', 
          ans: 'false' },
        { id: 4, type: 'TF', 
          q: '在規劃實體周界時，即便機房已設置刷卡門禁，仍應考量防尾隨（Anti-tailgating）機制，避免未授權者緊跟授權者進入。', 
          en_q: 'When planning physical perimeters, even if the server room has card access control, anti-tailgating mechanisms should still be considered to prevent unauthorized persons from following authorized personnel inside.', 
          ans: 'true' },
        { id: 5, type: 'TF', 
          q: '「桌面淨空」規範要求：即使員工只是短暫離開座位 1 分鐘去裝水，也必須將桌面上所有一般日常文件鎖入抽屜，無任何例外豁免。', 
          en_q: 'The "Clear Desk" policy requires that even if an employee briefly leaves their seat for 1 minute to get water, all general daily documents on the desk must be locked in a drawer without any exceptions.', 
          ans: 'false' },
        { id: 6, type: 'TF', 
          q: '存取權限的定期審查（Access review）不僅包含應用程式的帳號密碼，也必須包含「實體機房門禁卡」的核准名單清查。', 
          en_q: 'Periodic access reviews must include not only application accounts and passwords but also the approved list for physical server room access cards.', 
          ans: 'true' },
        { id: 7, type: 'TF', 
          q: '伺服器設備如需移出辦公室進行外部維修，只要該設備的管理負責人當下口頭同意即可，為求效率無須填寫設備攜出單。', 
          en_q: 'If server equipment needs to be moved out of the office for external repair, verbal consent from the equipment manager is sufficient; to ensure efficiency, no equipment removal form is required.', 
          ans: 'false' },
        { id: 8, type: 'TF', 
          q: '針對高度機密的安全區域（如核心資料中心），即使是編制內的清潔人員，也必須在授權技術人員的監督下才能進入打鎖。', 
          en_q: 'For highly confidential secure areas (like core data centers), even internal cleaning staff must be supervised by authorized technical personnel when entering to perform duties.', 
          ans: 'true' },
        { id: 9, type: 'TF', 
          q: '員工若不小心點擊釣魚信件連結，只要自行使用防毒軟體掃描未發現中毒，即不構成資安事件，無須向 IT 部門通報。', 
          en_q: 'If an employee accidentally clicks a phishing email link, as long as they run an antivirus scan and find no infection, it does not constitute a security incident and requires no reporting to the IT department.', 
          ans: 'false' },
        { id: 10, type: 'TF', 
          q: '資訊安全認知教育訓練的內容，應明確包含員工若違反公司資安政策時，公司將依法或依規採取的懲處程序（Disciplinary process）。', 
          en_q: 'Information security awareness training should explicitly cover the disciplinary process the company will take according to laws or regulations if an employee violates security policies.', 
          ans: 'true' },
        { id: 11, type: 'TF', 
          q: '為彰顯管理階層的彈性，總經理與副總級別的辦公室可以完全豁免「實體安全防護」與「桌面螢幕淨空」的稽核要求。', 
          en_q: 'To demonstrate management flexibility, the offices of the General Manager and Vice Presidents can be completely exempted from "physical security" and "clear desk/screen" audit requirements.', 
          ans: 'false' },
        { id: 12, type: 'TF', 
          q: '若公司採用「共享辦公空間（Co-working space）」，因缺乏實體牆壁周界，應強制採用防窺片、上鎖抽屜等補償性控制措施來保護資產。', 
          en_q: 'If the company uses a "co-working space", compensating controls like privacy filters and lockable drawers must be mandated to protect assets due to the lack of physical wall perimeters.', 
          ans: 'true' },
        { id: 13, type: 'TF', 
          q: '員工出差在咖啡廳工作時，只要筆電有設定開機密碼，即使短暫去洗手間將筆電單獨留在桌上，也不算違反實體安全規範。', 
          en_q: 'When an employee works at a cafe during a business trip, as long as the laptop has a boot password, leaving it unattended on the table briefly to use the restroom does not violate physical security guidelines.', 
          ans: 'false' },
        { id: 14, type: 'TF', 
          q: '備份磁帶或硬碟在運送至異地備援中心的過程中，應使用上鎖容器或加密技術，以防止半途發生資料外洩（Data Breach）。', 
          en_q: 'Backup tapes or hard drives being transported to an off-site recovery center should use locked containers or encryption technologies to prevent data breaches in transit.', 
          ans: 'true' },
        { id: 15, type: 'TF', 
          q: '因為行銷與總機人員平常接觸不到後端伺服器，因此在「人員控制」中，他們無須被要求簽署資安保密協議。', 
          en_q: 'Since marketing and reception personnel usually do not access backend servers, they are not required to sign information security NDAs under "personnel controls".', 
          ans: 'false' },
        { id: 16, type: 'TF', 
          q: '背景查核（Screening）不應一視同仁，而是應依據該職位即將接觸的「資訊機密等級與系統風險」來決定查核的深度。', 
          en_q: 'Background screening should not be uniform; rather, the depth of the check should be determined by the "information confidentiality level and system risk" the position will encounter.', 
          ans: 'true' },
        { id: 17, type: 'TF', 
          q: '為了方便日後更換，機房內高架地板下的網路佈線（Cabling）可以不加貼標籤標示，只要負責的資深工程師自己記得線路走向即可。', 
          en_q: 'To facilitate future replacements, network cabling under raised floors in server rooms does not need labeling, as long as the responsible senior engineer remembers the cable routes.', 
          ans: 'false' },
        { id: 18, type: 'TF', 
          q: '在建置機房時，電源線與通訊纜線應盡可能分開鋪設或採取實體隔離，以避免電磁干擾（EMI）與潛在的實體線路竊聽風險。', 
          en_q: 'When building a server room, power cables and communication cables should be laid separately or physically isolated to avoid electromagnetic interference (EMI) and potential physical wiretapping risks.', 
          ans: 'true' },
        { id: 19, type: 'TF', 
          q: '只要是下班時間且無人使用，外部訪客就可以自由使用會議室牆壁上的內部網路孔（LAN port）連接個人筆電上網。', 
          en_q: 'As long as it is after hours and unoccupied, external visitors can freely use the internal LAN ports on conference room walls to connect their personal laptops to the internet.', 
          ans: 'false' },
        { id: 20, type: 'TF', 
          q: '實體與環境安全防護不僅在防範人為惡意入侵，同時也應包含對火災、水災、地震等自然災害的防護與監測措施。', 
          en_q: 'Physical and environmental security protection is not only about preventing malicious human intrusions but should also include protection and monitoring measures against natural disasters like fires, floods, and earthquakes.', 
          ans: 'true' },
        { id: 21, type: 'TF', 
          q: '在機房（Secure areas）內進行設備查修時，只要鏡頭沒有刻意對準伺服器螢幕上的機密代碼，技師就可以自由使用手機全程錄影。', 
          en_q: 'When inspecting equipment in secure areas, technicians can freely record the entire process using their phones, provided the camera is not deliberately aimed at confidential code on server screens.', 
          ans: 'false' },
        { id: 22, type: 'TF', 
          q: '當員工內部輪調（從業務部轉至研發部）時，其舊有部門的系統權限與實體門禁權限應立即被觸發審查，並移除不必要的存取權。', 
          en_q: 'When an employee transfers internally (e.g., from Sales to R&D), their system permissions and physical access rights from the old department should trigger an immediate review, removing unnecessary access.', 
          ans: 'true' },
        { id: 23, type: 'TF', 
          q: '測試用的 USB 隨身碟裝因為沒有存放真實客戶的正式資料，所以在專案結束後，可以直接格式化一次並丟入一般垃圾桶。', 
          en_q: 'Since testing USB drives do not store real formal customer data, they can simply be formatted once and thrown into regular trash bins after the project ends.', 
          ans: 'false' },
        { id: 24, type: 'TF', 
          q: '稽核時若發現門禁讀卡機外殼有被撬開或異常接線的痕跡，不論是否真的遭入侵，都應立即視為重大實體資安事件進行通報與調查。', 
          en_q: 'During an audit, if a card reader enclosure shows signs of prying or abnormal wiring, it should immediately be treated as a major physical security incident for reporting and investigation, regardless of whether a breach actually occurred.', 
          ans: 'true' },
        { id: 25, type: 'TF', 
          q: '為了避免手機遺失導致無法登入系統，將雙重認證（2FA）的備用救援碼與帳號密碼寫在同一本筆記本上放在抽屜是符合安全邏輯的。', 
          en_q: 'To prevent being locked out due to a lost phone, writing the 2FA backup recovery codes and account passwords in the same notebook stored in a drawer is logically secure.', 
          ans: 'false' },

        // === 【進階選擇題 26 ~ 50 題】 ===
        { id: 26, type: 'MC', 
          q: '當機房空調設備發生突發性故障，需緊急呼叫外部冷氣維修技師進入核心機房處理時，下列哪一項作法最符合 ISO 27002 的實體安全控制精神？', 
          en_q: 'When an AC failure requires an external technician to enter the core server room for emergency repairs, which approach best aligns with ISO 27002 physical security controls?',
          options: { A: 'A. 由於是影響營運的緊急搶修，直接開放門禁特權讓技師進出以爭取時間。', B: 'B. 技師需於大廳換證，並由內部授權人員全程陪同與實體監督其在機房內的作業。', C: 'C. 讓大樓外包保全代為陪同進入即可，並允許技師接上機房內的網路線上網查修。' }, 
          en_options: { A: 'A. Grant direct access privileges to save time due to the operational emergency.', B: 'B. The technician must exchange IDs at the lobby and be escorted and physically supervised by authorized internal staff throughout the operation.', C: 'C. Have outsourced building security escort them and allow the technician to connect to the internal network for troubleshooting.' },
          ans: 'B' },
        { id: 27, type: 'MC', 
          q: '在規劃「辦公室實體安全周界」時，下列哪一種補償性控制措施（Compensating Control）最適合用來彌補「全透明玻璃會議室」的機密外洩風險？', 
          en_q: 'When planning "office physical perimeters," which compensating control best mitigates the confidentiality leakage risk of a "fully transparent glass conference room"?',
          options: { A: 'A. 在會議室外設立指紋辨識門禁與金方探測門。', B: 'B. 在會議室玻璃上加裝防窺霧面貼膜或百葉窗，並嚴格要求會議後擦拭白板。', C: 'C. 強制要求所有進入會議室的員工交出手機集中保管。' }, 
          en_options: { A: 'A. Install fingerprint access and metal detectors outside the room.', B: 'B. Apply frosted privacy films or blinds on the glass, and strictly require erasing whiteboards after meetings.', C: 'C. Mandate all employees entering the room to hand over their phones for centralized storage.' },
          ans: 'B' },
        { id: 28, type: 'MC', 
          q: '當執行員工的「終止聘用（離職）」程序時，從資安稽核的角度來看，下列何者應被列為「最優先」的執行事項？', 
          en_q: 'When executing the "termination of employment" process, from an IT security audit perspective, which of the following should be prioritized?',
          options: { A: 'A. 同步撤銷其邏輯存取權限（系統帳號）與實體存取權限（門禁卡）。', B: 'B. 確保該員工完成所有未結案的工作交接報告。', C: 'C. 結算該員工當月的特休假與績效獎金。' }, 
          en_options: { A: 'A. Simultaneously revoke their logical access (system accounts) and physical access (access cards).', B: 'B. Ensure the employee completes all pending handover reports.', C: 'C. Settle the employee\'s PTO and performance bonuses for the month.' },
          ans: 'A' },
        { id: 29, type: 'MC', 
          q: '你在辦公室無意間發現某位即將離職的同事，正頻繁使用外接硬碟拷貝大量未經授權的專案資料，最符合 ISO 精神的作法是？', 
          en_q: 'You accidentally notice a resigning colleague frequently using an external hard drive to copy large amounts of unauthorized project data. What is the most ISO-compliant response?',
          options: { A: 'A. 基於同事情誼假裝沒看到，避免破壞辦公室氣氛。', B: 'B. 依據公司安全事件通報程序，立即私下向直屬主管或資安部門反應異常。', C: 'C. 在辦公室大聲斥責該名同事，並強制拔除他的隨身碟。' }, 
          en_options: { A: 'A. Pretend not to see it out of camaraderie to avoid ruining the office atmosphere.', B: 'B. Immediately report the anomaly privately to a direct supervisor or security department per incident reporting procedures.', C: 'C. Loudly reprimand the colleague in the office and forcibly unplug their drive.' },
          ans: 'B' },
        { id: 30, type: 'MC', 
          q: '關於「設備安置與保護」，稽核員巡視辦公室時發現下列何種情況，應立即開立缺失單（NCR）？', 
          en_q: 'Regarding "Equipment Siting and Protection," which scenario found during an office tour should prompt an immediate Non-Conformance Report (NCR)?',
          options: { A: 'A. 將存放核心數據的 NAS 伺服器，直接擺放在靠近一樓臨街玻璃窗旁的層架上。', B: 'B. 在核心機房內安裝了氣體式滅火設備（FM-200）取代傳統撒水系統。', C: 'C. 將網路印表機放置在需要刷卡才能進入的員工專屬 OA 辦公區內。' }, 
          en_options: { A: 'A. Placing the core data NAS server on a shelf right next to a street-facing glass window on the ground floor.', B: 'B. Installing FM-200 gas fire suppression systems in the core server room instead of traditional sprinklers.', C: 'C. Placing a network printer in an employee-only OA area requiring card access.' },
          ans: 'A' },
        { id: 31, type: 'MC', 
          q: '下列何者屬於「防範環境威脅」中，針對水災或漏水風險的有效實體控制措施？', 
          en_q: 'Which of the following is an effective physical control measure against flood or leakage risks under "Protection from environmental threats"?',
          options: { A: 'A. 將伺服器機櫃全面改用防火塗料。', B: 'B. 在機房建置雙備援的空調系統與不斷電系統 (UPS)。', C: 'C. 機房底層安裝高架地板，並於地板下配置漏水偵測感知線纜。' }, 
          en_options: { A: 'A. Applying fireproof coatings entirely to server racks.', B: 'B. Deploying dual-redundant HVAC and UPS systems in the server room.', C: 'C. Installing raised floors in the server room with water leakage detection cables placed underneath.' },
          ans: 'C' },
        { id: 32, type: 'MC', 
          q: '因應遠距辦公，員工將公司筆電帶回家中作業。下列何項作法最符合「場外設備安全（Off-site equipment）」規範？', 
          en_q: 'Due to remote work, employees take company laptops home. Which practice best complies with "Off-site equipment security" guidelines?',
          options: { A: 'A. 因為在家裡很安全，所以關閉筆電的登入密碼以節省開機時間。', B: 'B. 筆電硬碟啟用全磁碟加密（FDE），閒置時鎖定，且嚴禁家屬共用該設備。', C: 'C. 為了網路順暢，將筆電連接至家中未設密碼的開放式 Wi-Fi 路由器。' }, 
          en_options: { A: 'A. Disabling the login password to save boot time since it is safe at home.', B: 'B. Enabling Full Disk Encryption (FDE), locking the laptop when idle, and strictly prohibiting family members from sharing the device.', C: 'C. Connecting the laptop to an open, unpassworded home Wi-Fi router for better connectivity.' },
          ans: 'B' },
        { id: 33, type: 'MC', 
          q: '稽核員發現公司櫃台抽屜放有 3 張無記名的「公用門禁卡」，專供忘記帶卡的員工自行簽名借用。此作法最大的資安風險為何？', 
          en_q: 'An auditor finds 3 anonymous "public access cards" in the reception desk for employees who forget their badges to sign out. What is the biggest security risk here?',
          options: { A: 'A. 破壞了存取控制的「不可否認性（Non-repudiation）」，無法追蹤真實進出者。', B: 'B. 增加了櫃檯行政人員管理卡片的時間成本。', C: 'C. 公用卡片容易因為頻繁刷卡而導致晶片提早損壞。' }, 
          en_options: { A: 'A. It destroys the "non-repudiation" of access controls, making it impossible to trace the actual entrants.', B: 'B. It increases the time cost for administrative staff to manage the cards.', C: 'C. Public cards are prone to premature chip damage due to frequent swiping.' },
          ans: 'A' },
        { id: 34, type: 'MC', 
          q: '當公司將含有機敏資料的實體伺服器硬碟汰換並準備報廢時，應採取何種防範資料外洩的最終措施？', 
          en_q: 'When retiring and disposing of physical server hard drives containing sensitive data, what ultimate measure should be taken to prevent data leakage?',
          options: { A: 'A. 在作業系統內將檔案丟入資源回收桶並清空即可。', B: 'B. 實施實體破壞（如物理鑽孔、消磁）或使用合規軟體進行多次覆寫抹除（Wiping）。', C: 'C. 將硬碟重新格式化（Quick Format）後，以二手價賣給回收廠商。' }, 
          en_options: { A: 'A. Just moving the files to the recycle bin within the OS and emptying it.', B: 'B. Implementing physical destruction (e.g., drilling, degaussing) or using compliant software for multiple wipe passes.', C: 'C. Performing a Quick Format and selling it secondhand to recyclers.' },
          ans: 'B' },
        { id: 35, type: 'MC', 
          q: '針對「桌面與螢幕淨空」，若員工處理機密財報到一半，需暫時離開座位參加 1 小時的跨部門會議，應如何處置桌上的財報紙本？', 
          en_q: 'Regarding "Clear desk and clear screen," if an employee processing confidential financials leaves for a 1-hour cross-department meeting, how should the hard copies on their desk be handled?',
          options: { A: 'A. 將財報反面朝下蓋在桌上即可。', B: 'B. 貼上「機密請勿翻閱」的便利貼，然後直接去開會。', C: 'C. 將財報收進辦公桌抽屜並上鎖，同時按下 Windows + L 鎖定電腦螢幕。' }, 
          en_options: { A: 'A. Simply placing the reports face down on the desk.', B: 'B. Sticking a "Confidential: Do Not Read" post-it note and heading straight to the meeting.', C: 'C. Locking the reports inside a desk drawer and pressing Windows + L to lock the screen.' },
          ans: 'C' },
        { id: 36, type: 'MC', 
          q: '關於資安「保密協議(NDA)」的法律與稽核實務，下列敘述何者最為準確？', 
          en_q: 'Regarding the legal and audit practices of "Non-Disclosure Agreements (NDA)", which statement is most accurate?',
          options: { A: 'A. 僅在員工任職期間有效，只要員工辦理離職手續，保密責任即自動解除。', B: 'B. 不僅在職期間有效，通常會規範員工或廠商在離職/解約後之一段時間內，仍需負保密義務。', C: 'C. 只要員工口頭發誓不會洩漏公司機密，即可取代紙本或電子的 NDA 簽署。' }, 
          en_options: { A: 'A. It is valid only during employment; confidentiality responsibilities are automatically waived upon resignation.', B: 'B. It is valid during employment and usually mandates confidentiality obligations for a period after resignation/termination.', C: 'C. Verbal promises not to leak company secrets can replace physical or electronic NDA signatures.' },
          ans: 'B' },
        { id: 37, type: 'MC', 
          q: '下列何種情況屬於「社交工程（Social Engineering）」的『實體面』攻擊手法？', 
          en_q: 'Which scenario constitutes a "physical" attack technique of Social Engineering?',
          options: { A: 'A. 駭客利用系統漏洞，從外部網路植入勒索軟體加密伺服器。', B: 'B. 發送大量偽造的銀行中獎信件誘騙使用者點擊網址。', C: 'C. 攻擊者穿著知名快遞公司的制服，抱著大箱子要求櫃台人員代為刷卡開門進入辦公區。' }, 
          en_options: { A: 'A. Hackers exploiting a system vulnerability to inject ransomware via the external network.', B: 'B. Sending massive fake bank lottery emails to trick users into clicking URLs.', C: 'C. An attacker wearing a famous courier uniform holding a large box, asking the receptionist to badge them in.' },
          ans: 'C' },
        { id: 38, type: 'MC', 
          q: '核心機房門口安裝了「防尾隨閘門（Mantraps / Turnstiles）」，這項昂貴的硬體投資主要目的是為了解決哪種安全風險？', 
          en_q: 'Installing expensive "Mantraps/Turnstiles" at the core server room entrance is primarily aimed at solving which security risk?',
          options: { A: 'A. 未授權人員趁授權人員刷卡開門的瞬間，緊跟著潛入安全區域。', B: 'B. 防止機房內的冷氣冷房效果流失到外部走道。', C: 'C. 阻擋攜帶大型爆裂物或危險物品的人員進入。' }, 
          en_options: { A: 'A. Unauthorized personnel sneaking into the secure area by tailgating an authorized person during badge swiping.', B: 'B. Preventing the server room cooling effect from escaping into the hallway.', C: 'C. Blocking personnel carrying large explosives or dangerous items from entering.' },
          ans: 'A' },
        { id: 39, type: 'MC', 
          q: '稽核員發現某部門的「機密文件專用碎紙機」被放置在大樓外側的公共電梯口旁，這會帶來什麼重大的管理風險？', 
          en_q: 'An auditor finds a department\'s "Confidential Document Shredder" placed near the public elevator lobby. What major management risk does this pose?',
          options: { A: 'A. 碎紙機運轉聲音太大，會干擾等電梯的訪客。', B: 'B. 機密文件在等待排隊銷毀的過程中，極易遭搭乘電梯的外部人員順手牽羊竊取。', C: 'C. 會導致大樓公共區域的電費異常增加。' }, 
          en_options: { A: 'A. The shredder noise might disturb visitors waiting for the elevator.', B: 'B. Confidential documents waiting to be destroyed are highly vulnerable to being snatched by external personnel using the elevator.', C: 'C. It will cause an abnormal increase in the building\'s public electricity bill.' },
          ans: 'B' },
        { id: 40, type: 'MC', 
          q: '下列哪一項屬於「人員控制 (Clause 6)」中「聘用條款及條件」必須白紙黑字涵蓋的核心內容？', 
          en_q: 'Which of the following is core content that must be explicitly covered in writing under "Terms and conditions of employment" in Personnel Controls (Clause 6)?',
          options: { A: 'A. 詳細列出公司未來五年內的產品開發 Roadmap。', B: 'B. 明確定義員工保護資訊資產的責任，以及違反政策時的懲戒程序（Disciplinary process）。', C: 'C. 強制規定員工每年必須官方參加兩次以上的國內外員工旅遊。' }, 
          en_options: { A: 'A. Detailed listing of the company\'s 5-year product development roadmap.', B: 'B. Clear definition of employee responsibilities for protecting info assets and disciplinary processes for policy violations.', C: 'C. Mandating employees to officially attend two or more domestic/international company trips annually.' },
          ans: 'B' },
        { id: 41, type: 'MC', 
          q: '為了防範火災，伺服器機房內通常會設置「FM-200 或 Novec 1230 等氣體滅火系統」，而不是傳統的撒水系統。這考量了哪一項資安原則？', 
          en_q: 'To prevent fires, server rooms typically install gas suppression systems (like FM-200) instead of traditional sprinklers. Which security principle does this address?',
          options: { A: 'A. 氣體滅火系統的建置成本比撒水系統便宜。', B: 'B. 氣體比較不會破壞人體健康。', C: 'C. 保護極具價值的 IT 設備免受水患造成的二次物理性永久破壞。' }, 
          en_options: { A: 'A. Gas systems are cheaper to build than sprinkler systems.', B: 'B. Gases are less harmful to human health.', C: 'C. Protecting highly valuable IT equipment from secondary, permanent physical damage caused by water floods.' },
          ans: 'C' },
        { id: 42, type: 'MC', 
          q: '某員工收到一封標題為「【緊急警告】您的信箱容量已滿，請點擊驗證升級」的信件，該員工最符合資安意識的動作是？', 
          en_q: 'An employee receives an email titled "[URGENT] Mailbox full, click to verify and upgrade." What is the most security-conscious response?',
          options: { A: 'A. 保持冷靜不點擊任何連結，將信件作為附件通報給資訊安全或 IT 單位分析。', B: 'B. 先點擊連結看看是不是真的跳到公司的登入網頁，確認是假的再關掉。', C: 'C. 直接回信給寄件者，痛罵對方是詐騙集團。' }, 
          en_options: { A: 'A. Stay calm, do not click any links, and report the email as an attachment to IT or InfoSec for analysis.', B: 'B. Click the link first to see if it leads to the company login page, and close it if fake.', C: 'C. Reply directly to the sender scolding them for being a scam group.' },
          ans: 'A' },
        { id: 43, type: 'MC', 
          q: '針對外部供應商的維護設備（例如外包工程師帶來的檢測用筆電）準備接入公司內部網路前，應落實何種技術與實體控制？', 
          en_q: 'Before allowing external supplier equipment (e.g., outsourced engineer\'s diagnostic laptop) to connect to the internal network, what technical and physical controls should be implemented?',
          options: { A: 'A. 基於信任原則，直接提供內部網路的 Wi-Fi 密碼讓其連線。', B: 'B. 先強制進行惡意軟體掃描、確認防毒軟體更新，並將其限制在隔離的訪客網段（VLAN）。', C: 'C. 要求工程師交出筆電密碼，由公司內部人員代為操作測試。' }, 
          en_options: { A: 'A. Based on trust, directly provide the internal Wi-Fi password for connection.', B: 'B. Enforce malware scans, verify AV updates, and restrict it to an isolated guest network (VLAN).', C: 'C. Demand the laptop password from the engineer and have internal staff operate it for testing.' },
          ans: 'B' },
        { id: 44, type: 'MC', 
          q: '有關「佈線安全 (Cabling security)」，為了防止核心網路訊號被實體竊聽、破壞或意外截斷，下列作法何者正確？', 
          en_q: 'Regarding "Cabling security", to prevent core network signals from physical wiretapping, sabotage, or accidental cuts, which practice is correct?',
          options: { A: 'A. 將網路線全部改為無線網路，即可徹底解決實體破壞問題。', B: 'B. 將網路線與高壓電纜捆綁在一起，利用高壓電防止老鼠啃咬。', C: 'C. 將核心通訊纜線封裝於具保護層的導管或實體線槽內，並避開公共頻繁走動區域。' }, 
          en_options: { A: 'A. Switch entirely to wireless networks to completely solve physical destruction issues.', B: 'B. Bundle network cables with high-voltage lines, utilizing high voltage to deter rodents.', C: 'C. Encase core communication cables in protective conduits or physical trenches, avoiding high-traffic public areas.' },
          ans: 'C' },
        { id: 45, type: 'MC', 
          q: '若公司為了節省空間，全面實施「開放式辦公與隨機座位（Hot-desking）」，這對於實體資安會帶來什麼最大的挑戰？', 
          en_q: 'If the company fully implements "Hot-desking" to save space, what is the biggest challenge to physical security?',
          options: { A: 'A. 極難落實桌面淨空政策，且大幅增加旁人窺視機密畫面（Shoulder surfing）的風險。', B: 'B. 每天找座位會導致員工上班遲到。', C: 'C. 員工會找不到網路孔可以插網路線。' }, 
          en_options: { A: 'A. It is extremely difficult to enforce clear desk policies and significantly increases shoulder surfing risks.', B: 'B. Finding a seat every day will cause employees to be late.', C: 'C. Employees won\'t find LAN ports to plug their network cables into.' },
          ans: 'A' },
        { id: 46, type: 'MC', 
          q: '當稽核員發現公司總部機房大門的密碼鎖，其「密碼長達三年未曾更換」，這主要違反了什麼安全管理原則？', 
          en_q: 'When an auditor finds that the core server room door keypad "has not had its password changed in 3 years", what core security management principle is violated?',
          options: { A: 'A. 密碼太舊會導致鍵盤按鈕條理褪色，影響美觀。', B: 'B. 認證憑證未定期更新，前員工或離包商可能仍持有密碼，大幅提高未授權存取風險。', C: 'C. 舊密碼會拖慢機房大門微電腦的處理速度。' }, 
          en_options: { A: 'A. Old passwords lead to faded keypad buttons, affecting aesthetics.', B: 'B. Failure to periodically update credentials leaves former employees or contractors with passwords, significantly increasing unauthorized access risks.', C: 'C. Old passwords slow down the processing speed of the door\'s microcomputer.' },
          ans: 'B' },
        { id: 47, type: 'MC', 
          q: '下列何者「最不適合作為」資訊安全認知教育訓練成效的客觀衡量指標（KPI）？', 
          en_q: 'Which of the following is "least suitable" as an objective KPI for measuring the effectiveness of information security awareness training?',
          options: { A: 'A. 釣魚郵件模擬測試中，員工不慎點擊連結的「中招率」下降幅度。', B: 'B. 實際資安通報演練中，員工在發現異常後通報 IT 單位的人數比例。', C: 'C. 教育訓練當天中午發放的便當與點心滿意度調查問卷分數。' }, 
          en_options: { A: 'A. The drop in "click rate" during simulated phishing email tests.', B: 'B. The proportion of employees who report to IT after discovering anomalies during incident reporting drills.', C: 'C. The satisfaction scores from surveys regarding the lunchboxes and snacks provided during training.' },
          ans: 'C' },
        { id: 48, type: 'MC', 
          q: '若公司必須將含有全公司薪資檔案的實體備份磁帶，每週運送至異地備援機房，下列哪種運送方式最符合 ISO 實體安全規範？', 
          en_q: 'If the company must transport physical backup tapes containing all payroll files to an off-site center weekly, which transport method best meets ISO physical security guidelines?',
          options: { A: 'A. 為了省錢，指派當天最閒的實習生搭捷運送過去。', B: 'B. 將資料加密，放入防破壞的上鎖保險箱，交由具信任合約的專業保全物流運送並保留交接簽收紀錄。', C: 'C. 用一般的牛皮紙袋裝著，叫一般的計程車快遞送達。' }, 
          en_options: { A: 'A. To save money, assign the most idle intern to deliver it via the subway.', B: 'B. Encrypt data, place it in tamper-proof locked safes, and entrust it to professional security logistics with trust contracts and signed handover records.', C: 'C. Pack it in standard kraft envelopes and send it via a regular taxi courier.' },
          ans: 'B' },
        { id: 49, type: 'MC', 
          q: '關於「實體鑰匙與備用門禁卡」的管理，下列稽核場景中何者屬於「嚴重缺失（Major Non-conformity）」？', 
          en_q: 'Regarding the management of "physical keys and backup access cards," which audit scenario constitutes a "Major Non-conformity"?',
          options: { A: 'A. 核心機房的萬用實體備用鑰匙，直接掛在 IT 部門經理辦公桌的透明壓克力板上，且無人監管。', B: 'B. 備用鑰匙被存放在附有密碼鎖的保險箱內，只有兩位高階主管知道密碼。', C: 'C. 所有訪客門禁卡在下班前都會進行盤點與數量核對。' }, 
          en_options: { A: 'A. The master backup physical key to the core server room hangs on an unsupervised clear acrylic board on the IT manager\'s desk.', B: 'B. Backup keys are stored in a keypad safe with only two senior managers knowing the code.', C: 'C. All visitor access cards undergo inventory and quantity checks before the end of the workday.' },
          ans: 'A' },
        { id: 50, type: 'MC', 
          q: '綜合實體與人員安全，當員工於非上班時間（如假日、深夜）需進入公司辦公區加班時，最合規的存取流程應該是？', 
          en_q: 'Combining physical and personnel security, what is the most compliant access flow when an employee needs to enter the office for overtime during non-working hours (e.g., holidays, late nights)?',
          options: { A: 'A. 只要是正職員工，24 小時隨時都可以自由刷卡進出公司。', B: 'B. 聯絡熟識的大樓保全幫忙直接開門，不留刷卡紀錄以免被查勤。', C: 'C. 需依制度事先提出加班申請，經權責主管核准後，門禁系統才於該特定時段自動開放其刷卡權限。' }, 
          en_options: { A: 'A. As long as they are full-time employees, they can freely swipe in and out 24/7.', B: 'B. Call a familiar building guard to let them in, leaving no swipe records to avoid attendance checks.', C: 'C. Submit an overtime request per policy beforehand; upon manager approval, the access system automatically grants swipe rights for that specific timeframe.' },
          ans: 'C' }
    ];


// 用來存放「這一回合被抽中」的 10 道題目與測驗狀態
    let currentRoundQuestions = [];
    let currentQuestionIndex = 0;
    let currentScore = 0;

    // 🎯 2. 核心演算法：隨機抽題 (Fisher-Yates Shuffle)
    function generateQuiz(quizCount = 10) {
        const shuffled = [...bigQuestionBank];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; 
        }
        currentRoundQuestions = shuffled.slice(0, quizCount);
        currentQuestionIndex = 0;
        currentScore = 0;
        
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
        const progressHtml = `<div style="color: #8892b0; margin-bottom: 15px; font-weight: bold;">${progressHtmlText}</div>`;

        if (item.type === 'TF') {
            const trueText = isEn ? 'True' : '是 (True)';
            const falseText = isEn ? 'False' : '否 (False)';
            const typeText = isEn ? 'True/False' : '是非題';
            htmlContent = `
                ${progressHtml}
                <div class="flip-card" id="flip-card-${item.id}">
                    <div class="flip-card-inner">
                        <div class="flip-card-front rule-card" style="transition: 0.3s; padding-left: 15px; border-left: 5px solid transparent; height: 100%;">
                            <h4 style="color: #00a8ff; margin-bottom: 20px; font-size: 1.5rem; line-height: 1.4;">Q${questionIndex}. 【${typeText}】${qText}</h4>
                            <div class="quiz-options-grid" style="grid-template-columns: 1fr;">
                                <label class="quiz-option"><input type="radio" name="dynamic_q_${item.id}" value="true" class="quiz-radio"> <span class="quiz-option-text">${trueText}</span></label>
                                <label class="quiz-option"><input type="radio" name="dynamic_q_${item.id}" value="false" class="quiz-radio"> <span class="quiz-option-text">${falseText}</span></label>
                            </div>
                        </div>
                        <div class="flip-card-back" id="flip-card-back-${item.id}">
                        </div>
                    </div>
                </div>
            `;
        } else if (item.type === 'MC') {
            const optA = isEn && item.en_options ? item.en_options.A : item.options.A;
            const optB = isEn && item.en_options ? item.en_options.B : item.options.B;
            const optC = isEn && item.en_options ? item.en_options.C : item.options.C;
            const typeText = isEn ? 'Multiple Choice' : '選擇題';
            htmlContent = `
                ${progressHtml}
                <div class="flip-card" id="flip-card-${item.id}">
                    <div class="flip-card-inner">
                        <div class="flip-card-front rule-card" style="transition: 0.3s; padding-left: 15px; border-left: 5px solid transparent; height: 100%;">
                            <h4 style="color: #00a8ff; margin-bottom: 20px; font-size: 1.5rem; line-height: 1.4;">Q${questionIndex}. 【${typeText}】${qText}</h4>
                            <div class="quiz-options-grid">
                                <label class="quiz-option"><input type="radio" name="dynamic_q_${item.id}" value="A" class="quiz-radio"> <span class="quiz-option-text">${optA}</span></label>
                                <label class="quiz-option"><input type="radio" name="dynamic_q_${item.id}" value="B" class="quiz-radio"> <span class="quiz-option-text">${optB}</span></label>
                                <label class="quiz-option"><input type="radio" name="dynamic_q_${item.id}" value="C" class="quiz-radio"> <span class="quiz-option-text">${optC}</span></label>
                            </div>
                        </div>
                        <div class="flip-card-back" id="flip-card-back-${item.id}">
                        </div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = htmlContent;

        const inputs = container.querySelectorAll(`input[name="dynamic_q_${item.id}"]`);
        inputs.forEach(input => {
            input.addEventListener('change', function() {
                handleAnswerSelect(item, this.value);
            });
        });
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

        let correctAnswerText = item.ans;
        if(item.type === 'TF') {
            const trueText = isEn ? 'True' : '是 (True)';
            const falseText = isEn ? 'False' : '否 (False)';
            correctAnswerText = item.ans === 'true' ? `⭕ ${trueText}` : `❌ ${falseText}`;
        } else {
            correctAnswerText = isEn && item.en_options ? item.en_options[item.ans] : item.options[item.ans];
        }

        const expDefaultZh = `依據資安實務與 ISO 27001 規範，此情境下選擇「${correctAnswerText}」才是能有效降低風險的最佳作法。其他選項可能帶來資料外洩或權限管控不當的隱患。`;
        const expDefaultEn = `According to security practices and ISO 27001 standards, choosing "${correctAnswerText}" in this scenario is the best practice to mitigate risks. Other options may lead to data leakage or improper access control.`;
        const explanationText = isEn ? expDefaultEn : expDefaultZh;

        const isLastQuestion = currentQuestionIndex === currentRoundQuestions.length - 1;
        const btnText = isLastQuestion ? (isEn ? "See Score" : "看成績") : (isEn ? "Next" : "下一題");
        const btnHtml = `<button type="button" class="btn-save" style="margin-top: 15px; font-size: 1rem; padding: 10px 25px;" onclick="nextQuestion()">${btnText} <i class="fa-solid fa-arrow-right"></i></button>`;

        if (selectedValue === item.ans) {
            currentScore += 10;
            backDiv.className = 'flip-card-back correct';
            backDiv.innerHTML = `
                <div class="flip-card-back-icon"><i class="fa-solid fa-check-circle"></i></div>
                <div class="flip-card-back-text">${isEn ? 'Correct!' : '答對了！'}</div>
                ${btnHtml}
            `;
        } else {
            backDiv.className = 'flip-card-back incorrect';
            backDiv.innerHTML = `
                <div class="flip-card-back-icon"><i class="fa-solid fa-times-circle"></i></div>
                <div class="flip-card-back-text">${isEn ? 'Incorrect.' : '答錯了。'}</div>
                <div class="flip-card-back-answer">${isEn ? 'Correct Answer:' : '正確解答為：'}<br><span style="color: #fff; margin-top: 5px; display: inline-block; font-size: 1.2rem;">${correctAnswerText}</span></div>
                <div style="margin-top: 15px; font-size: 1.2rem; color: #ffb8b8; max-width: 90%; line-height: 1.6; text-align: left; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px;"><strong>${isEn ? 'Explanation:' : '詳解：'}</strong><br>${explanationText}</div>
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
        const langSelectElem = document.getElementById('langSelect');
        const isEn = langSelectElem && langSelectElem.value === 'en';

        const container = document.getElementById('dynamicQuestionsContainer');
        const titleText = isEn ? 'Quiz Finished!' : '測驗結束！';
        const scoreText = isEn ? 'Points' : '分';
        const goodText = isEn ? 'Great job! You have good security defense concepts!' : '表現不錯，您具備良好的資安防禦觀念！';
        const badText = isEn ? 'Room for improvement. Please review the security guidelines!' : '還有進步空間，請多加複習資安規範！';
        const btnText = isEn ? 'Restart Quiz' : '重新測驗';

        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: rgba(0, 0, 0, 0.3); border-radius: 12px; border: 1px solid rgba(0, 168, 255, 0.2);">
                <h3 style="color: #00a8ff; margin-bottom: 20px; font-size: 2rem;">${titleText}</h3>
                <div style="font-size: 4rem; font-weight: bold; color: ${currentScore >= 60 ? '#2ed573' : '#ff4757'};"><i class="fa-solid ${currentScore >= 60 ? 'fa-trophy' : 'fa-face-frown'}" style="margin-right: 15px;"></i>${currentScore} ${scoreText}</div>
                <p style="color: #8892b0; margin-top: 20px; font-size: 1.1rem;">${currentScore >= 60 ? goodText : badText}</p>
                <button type="button" class="btn-save" style="margin-top: 30px; font-size: 1.1rem; padding: 12px 30px;" onclick="restartQuiz()"><i class="fa-solid fa-rotate-right"></i> ${btnText}</button>
            </div>
        `;
        
        if (currentScore === 100) {
            Swal.fire({
                icon: 'success', 
                title: isEn ? 'Perfect Score!' : '滿分通過！',
                text: isEn ? 'Amazing! You fully grasp the core essence of protection. Congratulations on unlocking your exclusive certificate!' : '太厲害了！您完全掌握了防護核心精髓。恭喜您解鎖專屬的合格證書！',
                background: '#1c2638', color: '#fff', 
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
                background: '#1c2638', color: '#fff', confirmButtonColor: '#00a8ff'
            });
        } else {
            Swal.fire({
                icon: 'error', title: `測驗結果：${currentScore} 分`,
                text: '不及格喔！請多加複習！',
                background: '#1c2638', color: '#fff', confirmButtonColor: '#ff4757'
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
                background: '#1c2638', color: '#fff',
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
                        background: '#1c2638', color: '#fff',
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
                            background: '#1c2638', color: '#fff', 
                            timer: 2000, 
                            showConfirmButton: false 
                        });
                        // 清空前端記憶體並踢回登入頁
                        localStorage.removeItem('currentUser');
                        window.location.href = 'login.html';
                    } else {
                        Swal.fire({ icon: 'error', title: '刪除失敗', text: data.message, background: '#1c2638', color: '#fff' });
                    }
                } catch (error) {
                    console.error("API 請求失敗:", error);
                    Swal.fire({ icon: 'error', title: '連線錯誤', text: '無法連接到伺服器進行刪除', background: '#1c2638', color: '#fff' });
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
            background: '#1c2638', color: '#fff',
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
                    backgroundColor: '#ffffff',
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
                    background: '#1c2638', color: '#fff',
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
                    background: '#1c2638', color: '#fff'
                });
            }
        }, 500);
    }
});
