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
    // 7. 即時翻譯引擎
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
            'm-p2': '資安主管表示這些發現非常有價值，將針對這些佐證照片重新檢討訓練計畫。',
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

    document.body.addEventListener('change', function(e) {
        if (e.target.id === 'langSelect') {
            const selectedLang = e.target.value;
            const dict = i18nDictionary[selectedLang];
            if (!dict) return;
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (dict[key]) el.innerHTML = dict[key];
            });
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (dict[key]) el.setAttribute('placeholder', dict[key]);
            });
        }
    });

    // =========================================
    // 8. 頁面載入時：更新左下角使用者資訊
    // =========================================
    const userStr = localStorage.getItem('currentUser');
    let currentUserId = null;

    if (userStr) {
        const user = JSON.parse(userStr);
        currentUserId = user.id; 
        const userNameDisplay = document.querySelector('.user-info .name');
        if (userNameDisplay) {
            userNameDisplay.textContent = user.username.split('@')[0]; 
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

                // ✨ 關鍵修復：把模板拉回畫面中，藏在所有元素的最底層讓套件拍照
                const element = document.getElementById('pdfReportTemplate');
                element.style.left = '0px';
                element.style.top = '0px';
                element.style.zIndex = '-9999';

                const opt = {
                    margin: 0,
                    filename: `ISO稽核報告_${new Date().getTime()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, scrollY: 0 }, // 修正滾動條造成的位移
                    jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
                };

                await html2pdf().set(opt).from(element).save();
                
                // ✨ 關鍵修復：拍完照後，把模板推回畫面外
                element.style.left = '-9999px';

                alert("✅ 報告已成功匯出 PDF！");
                closeNcr();

                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
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

                // ✨ 關鍵修復：把模板拉回畫面中
                const element = document.getElementById('pdfReportTemplate');
                element.style.left = '0px';
                element.style.top = '0px';
                element.style.zIndex = '-9999';

                const opt = {
                    margin: 0,
                    filename: `ISO學習筆記_${new Date().getTime()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, scrollY: 0 },
                    jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
                };

                await html2pdf().set(opt).from(element).save();
                
                // ✨ 關鍵修復：拍完照後推回畫面外
                element.style.left = '-9999px';

                alert("✅ 歷史筆記已成功匯出為 PDF 稽核報告！");

                this.innerHTML = originalText;
                this.disabled = false;

            } catch (error) {
                console.error("PDF 匯出失敗:", error);
                alert("匯出失敗，請重試！");
            }
        });
    }

}); 
