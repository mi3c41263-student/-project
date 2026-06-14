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
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if(this.getAttribute('href') === '#') {
                e.preventDefault(); 
                menuItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                const menuText = this.textContent.trim();
                if (breadcrumbTitle) breadcrumbTitle.textContent = menuText;

                if (menuText.includes('資安規範手冊')) {
                    if (notesSection) notesSection.style.display = 'none';
                    if (analysisSection) analysisSection.style.display = 'none';
                    if (manualSection) manualSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = '檢視 ISO 27002:2022 重點控制措施';
                } else if (menuText.includes('學習筆記')) {
                    if (manualSection) manualSection.style.display = 'none';
                    if (analysisSection) analysisSection.style.display = 'none';
                    if (notesSection) notesSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = '沉澱並複習您的資安防禦實務';
                } else if (menuText.includes('學習成果分析')) {
                    if (notesSection) notesSection.style.display = 'none';
                    if (manualSection) manualSection.style.display = 'none';
                    if (analysisSection) analysisSection.style.display = 'block';
                    if (breadcrumbSubtitle) breadcrumbSubtitle.textContent = '評估您的資安防禦綜合能力';
                    
                    if (!window.radarChartCreated) {
                        if (typeof initRadarChart === 'function') {
                            initRadarChart();
                        }
                        window.radarChartCreated = true;
                    }
                }
            } 
        }); 
    }); 

    // =========================================
    // 3.5 資安規範手冊內的 Tab 切換邏輯
    // =========================================
    const manualTabs = document.querySelectorAll('.manual-tab');
    const clausePanels = document.querySelectorAll('.clause-panel');

    manualTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            manualTabs.forEach(t => t.classList.remove('active'));
            clausePanels.forEach(p => p.classList.remove('active'));

            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) targetPanel.classList.add('active');
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
    // 7. 即時翻譯引擎 (僅保留中、英文版)
    // =========================================
    const i18nDictionary = {
        'zh-TW': {
            'nav-core': '核心訓練', 'nav-vr': '<i class="fa-solid fa-vr-cardboard"></i> VR 情境模擬', 'nav-manual': '<i class="fa-solid fa-shield-halved"></i> 資安規範手冊', 'nav-history': '學習歷程', 'nav-notes': '<i class="fa-solid fa-book-open"></i> 學習筆記', 'nav-analysis': '<i class="fa-solid fa-chart-pie"></i> 學習成果分析', 'nav-logout': '<i class="fa-solid fa-right-from-bracket"></i> 登出',
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
            'm-btn-edit': '<i class="fa-solid fa-pen-to-square"></i> 編輯報告', 'm-btn-export': '<i class="fa-solid fa-file-export"></i> 匯出 PDF'
        },
        'en': {
            'nav-core': 'Core Training', 'nav-vr': '<i class="fa-solid fa-vr-cardboard"></i> VR Simulation', 'nav-manual': '<i class="fa-solid fa-shield-halved"></i> Security Manual', 'nav-history': 'History', 'nav-notes': '<i class="fa-solid fa-book-open"></i> Learning Notes', 'nav-analysis': '<i class="fa-solid fa-chart-pie"></i> Analysis', 'nav-logout': '<i class="fa-solid fa-right-from-bracket"></i> Logout',
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
            'm-btn-edit': '<i class="fa-solid fa-pen-to-square"></i> Edit Report', 'm-btn-export': '<i class="fa-solid fa-file-export"></i> Export PDF'
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

        // 3. 🌟 預先填入「系統設定」裡的個人檔案表單
        const profileNameInput = document.getElementById('profileName');
        const profileBioInput = document.getElementById('profileBio');
        const avatarPreview = document.getElementById('avatarPreview');

        if (profileNameInput) profileNameInput.value = user.username || '';
        if (profileBioInput) profileBioInput.value = user.bio || '';
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

                document.getElementById('pdfDate').innerText = new Date().toLocaleDateString();
                document.getElementById('pdfCategory').innerText = categoryText;
                document.getElementById('pdfClause').innerText = clauseText;
                document.getElementById('pdfSeverity').innerText = severityText;
                document.getElementById('pdfSeverity').style.color = severityColor;
                document.getElementById('pdfObservation').innerHTML = observationText.replace(/\n/g, '<br>');
                document.getElementById('pdfAction').innerHTML = actionText.replace(/\n/g, '<br>');

                const submitBtn = ncrForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 正在生成 PDF...';
                submitBtn.disabled = true;
// ✨ 終極修復：把模板拉回畫面，並強制解除隱藏！
                const element = document.getElementById('pdfReportTemplate');
                element.style.display = 'block'; // 👈 關鍵 1：強制顯示出來
                element.style.position = 'absolute';
                element.style.left = '0px';
                element.style.top = '0px';
                element.style.zIndex = '-9999'; // 藏在最下層不讓使用者看到

                const opt = {
                    margin: 0,
                    filename: `ISO稽核報告_${new Date().getTime()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, scrollY: 0, backgroundColor: '#1c2638' }, // 保持深色底色
                    jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
                };

                // 👈 關鍵 2：給瀏覽器 0.1 秒的時間把畫面渲染出來再拍照
                setTimeout(async () => {
                    await html2pdf().set(opt).from(element).save();
                    
                    // ✨ 拍完照後，立刻把它隱藏回去
                    element.style.display = 'none'; 
                    element.style.left = '-9999px';

                    alert("✅ 報告已成功匯出 PDF！");
                    closeNcr();

                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }, 100);
            } catch (error) {
                console.error("❌ PDF 生成失敗:", error);
                alert("生成 PDF 時發生錯誤！");
            }
        });
    }

    // =========================================
    // 11. 現有「學習筆記」的匯出 PDF 功能
    // =========================================
    const exportOldPdfBtn = document.querySelector('.modal-footer-actions .btn-delete');
    
    if (exportOldPdfBtn) {
        exportOldPdfBtn.addEventListener('click', async function() {
            try {
                const modalTitle = document.getElementById('modalTitle').innerText;
                const modalDate = document.getElementById('modalDate').innerText;
                const modalCategory = document.getElementById('modalCategory').innerText;
                const modalBodyHTML = document.querySelector('.note-modal-content .modal-body').innerHTML;

                document.getElementById('pdfDate').innerText = modalDate;
                document.getElementById('pdfCategory').innerText = modalCategory;
                document.getElementById('pdfClause').innerText = "多項綜合條文 (6.6, 6.8, 7.2)"; 
                document.getElementById('pdfSeverity').innerText = "高風險 (High)";
                document.getElementById('pdfSeverity').style.color = "#e74c3c";
                
                document.getElementById('pdfObservation').innerHTML = `<strong>${modalTitle}</strong><br><br>${modalBodyHTML}`;
                document.getElementById('pdfAction').innerHTML = "建議依據 ISO 27002 規範，重新檢視門禁權限與人員保密協議簽署流程，並加強相關人員的資安認知訓練。";

                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 匯出中...';
                this.disabled = true;

             // ✨ 終極修復：把模板拉回畫面，並強制解除隱藏！
                const element = document.getElementById('pdfReportTemplate');
                element.style.display = 'block'; // 👈 關鍵 1：強制顯示
                element.style.position = 'absolute';
                element.style.left = '0px';
                element.style.top = '0px';
                element.style.zIndex = '-9999';

                const opt = {
                    margin: 0,
                    filename: `ISO學習筆記_${new Date().getTime()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, scrollY: 0, backgroundColor: '#1c2638' },
                    jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
                };

                // 👈 關鍵 2：稍微等一下再拍
                setTimeout(async () => {
                    await html2pdf().set(opt).from(element).save();
                    
                    // ✨ 拍完照後推回畫面外並隱藏
                    element.style.display = 'none';
                    element.style.left = '-9999px';

                    alert("✅ 歷史筆記已成功匯出為 PDF 稽核報告！");

                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 100);
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
        const response = await fetch(`http://localhost:3000/api/stats?userId=${user.id}`);
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

    new Chart(ctx, {
        type: 'radar',
        data: {
            // 配合你 ISO 27002 手冊的屬性標籤
            labels: ['實體防護', '社交工程防範', '機房安全', '設備管控', '法規認知'], 
            datasets: [{
                label: '資安防禦力',
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
            const newBio = document.getElementById('profileBio').value.trim();
            
            // 🌟 關鍵修復 1：先去 LocalStorage 把目前的登入者抓出來
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
                
                // 🌟 關鍵修復 2：把 userId 塞進包裹裡，讓後端知道是誰要更新！
                formData.append('userId', user.id); 
                
                formData.append('username', newName);
                formData.append('bio', newBio);
                if(avatarInput.files[0]) formData.append('avatar', avatarInput.files[0]);

                const response = await fetch('http://localhost:3000/api/update-profile', {
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
                // 🌟 讓瀏覽器印出真正的紅字錯誤
                console.error("儲存失敗的詳細原因:", error);
                
                // 🌟 讓彈跳視窗顯示真正的 JS 錯誤，而不是騙人說伺服器連線失敗
                alert("網頁執行發生錯誤：" + error.message);
                
            } finally {
                this.innerHTML = originalText;
                this.disabled = false;
            }
        });
    }
   // =========================================
    // 14. 雙重認證 (2FA) 開關介面邏輯 (真實連線版)
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
                // 🔘 狀態：使用者想「開啟」2FA
                try {
                    // 1. 顯示載入中動畫
                    Swal.fire({
                        title: '產生專屬金鑰中...',
                        background: '#1c2638', color: '#fff',
                        didOpen: () => Swal.showLoading()
                    });

                    // 2. 向 Node.js 請求真實的 QR Code
                    const res = await fetch(`http://localhost:3000/api/2fa/generate?userId=${user.id}&email=${user.email}`);
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
                                Swal.showValidationMessage('❌ 請輸入有效的 6 位數字驗證碼！');
                                return false;
                            }
                            return input;
                        }
                    });

                    if (isConfirmed) {
                        // 4. 把使用者輸入的 6 位數，丟給 Node.js 進行嚴格比對
                        const verifyRes = await fetch('http://localhost:3000/api/2fa/verify', {
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
                        const disableRes = await fetch('http://localhost:3000/api/2fa/disable', {
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
                    e.target.checked = true; // 反悔，保持開啟
                }
            }
        });
    }
    // =========================================
    // 15. 登入後更改密碼 (彈窗升級版)
    // =========================================
    const openChangePwdBtn = document.getElementById('openChangePwdBtn');
    
    if (openChangePwdBtn) {
        openChangePwdBtn.addEventListener('click', async function(e) {
            e.preventDefault(); // 防止 a 標籤亂跳

            // 抓取目前登入者的 ID
            const currentUserStr = localStorage.getItem('currentUser');
            if (!currentUserStr) return alert("找不到登入資訊，請重新登入");
            const user = JSON.parse(currentUserStr);

           // 🌟 1. 彈出輸入密碼的專屬視窗 (加入小眼睛顯示功能)
            const { value: formValues } = await Swal.fire({
                title: '<i class="fa-solid fa-lock"></i> 更改密碼',
                // 👇 更新 HTML 結構，加入相對定位與小眼睛圖示
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
                
                // 👇 這是新的！當視窗打開時，啟動小眼睛的開關功能
                didOpen: () => {
                    const toggleIcons = document.querySelectorAll('.toggle-pwd-icon');
                    toggleIcons.forEach(icon => {
                        icon.addEventListener('click', function() {
                            const targetId = this.getAttribute('data-target');
                            const inputField = document.getElementById(targetId);
                            
                            // 切換密碼顯示狀態
                            if (inputField.type === "password") {
                                inputField.type = "text";
                                this.classList.remove('fa-eye-slash');
                                this.classList.add('fa-eye');
                                this.style.color = '#00a8ff'; // 打開時變亮藍色
                            } else {
                                inputField.type = "password";
                                this.classList.remove('fa-eye');
                                this.classList.add('fa-eye-slash');
                                this.style.color = '#8892b0'; // 關閉時變回暗灰色
                            }
                        });
                    });
                },

                preConfirm: () => {
                    const curr = document.getElementById('swal-curr-pwd').value;
                    const newPwd = document.getElementById('swal-new-pwd').value;
                    const conf = document.getElementById('swal-conf-pwd').value;

                    if (!curr || !newPwd || !conf) {
                        Swal.showValidationMessage('❌ 請填寫所有密碼欄位！');
                        return false;
                    }
                    if (newPwd !== conf) {
                        Swal.showValidationMessage('❌ 兩次新密碼輸入不一致！');
                        return false;
                    }
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
                    if (!passwordRegex.test(newPwd)) {
                        Swal.showValidationMessage('❌ 密碼強度不足 (需8碼，含大小寫英文字母與數字)！');
                        return false;
                    }
                    return { currentPassword: curr, newPassword: newPwd };
                }
            });

            // 🌟 2. 如果使用者按下了「驗證並儲存」且格式都對
            if (formValues) {
                try {
                    // 顯示載入中動畫
                    Swal.fire({
                        title: '加密傳輸中...',
                        background: '#1c2638', color: '#fff',
                        didOpen: () => Swal.showLoading()
                    });

                    // 發送給 Node.js 後端
                    const response = await fetch('http://localhost:3000/api/change-password', {
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
                        // 舊密碼打錯
                        Swal.fire({ icon: 'error', title: '修改失敗', text: data.message, background: '#1c2638', color: '#fff' });
                    }
                } catch (error) {
                    Swal.fire({ icon: 'error', title: '連線失敗', text: '無法連接到伺服器', background: '#1c2638', color: '#fff' });
                }
            }
        });
    }
    });