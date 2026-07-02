const API_BASE_URL = window.location.origin;

document.addEventListener("DOMContentLoaded", function () {
    // =========================
    // 0. 全域 SweetAlert2 (Toast) 
    // =========================
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#1c2638',
        color: '#e2e8f0',
        customClass: { popup: 'tech-toast' },
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    // =========================
    // 初始化網格背景
    // =========================
    let gridCols = 0;
    let gridRows = 0;
    let lastHoveredCell = null;

    function initGrid() {
        const gridBg = document.getElementById('grid-background');
        if (!gridBg) return;
        
        // 每次重新計算前先清空
        gridBg.innerHTML = '';
        
        // 設定格子的固定尺寸 (例如 60px)
        const size = 60;
        
        // 計算螢幕可容納多少欄與列，Math.ceil 確保能完全覆蓋螢幕
        gridCols = Math.ceil(window.innerWidth / size);
        gridRows = Math.ceil(window.innerHeight / size);
        const totalCells = gridCols * gridRows;

        // 設定 CSS Grid 屬性
        gridBg.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
        gridBg.style.gridTemplateRows = `repeat(${gridRows}, 1fr)`;

        // 動態生成每個格子
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            gridBg.appendChild(cell);
        }
    }

    // 初始化執行
    initGrid();
    
    // 當視窗大小改變時重新繪製網格
    window.addEventListener('resize', initGrid);

    // =========================
    // 全域滑鼠追蹤 (解決圖層遮擋問題)
    // =========================
    window.addEventListener('mousemove', (e) => {
        const gridBg = document.getElementById('grid-background');
        if (!gridBg || gridCols === 0 || gridRows === 0) return;

        // 取得單個格子的實際寬高
        const cellWidth = window.innerWidth / gridCols;
        const cellHeight = window.innerHeight / gridRows;

        // 計算目前滑鼠落在哪個索引的格子上
        const c = Math.floor(e.clientX / cellWidth);
        const r = Math.floor(e.clientY / cellHeight);
        const index = r * gridCols + c;

        const cell = gridBg.children[index];

        if (cell !== lastHoveredCell) {
            if (lastHoveredCell) {
                lastHoveredCell.classList.remove('hovered');
            }
            if (cell) {
                cell.classList.add('hovered');
                lastHoveredCell = cell;
            }
        }
    });

    window.addEventListener('mouseout', (e) => {
        // 如果滑鼠離開了整個視窗，清除最後一個發光的格子
        if (e.relatedTarget === null && lastHoveredCell) {
            lastHoveredCell.classList.remove('hovered');
            lastHoveredCell = null;
        }
    });

    // =========================
    // 2. 面板滑動切換邏輯 (Sign Up / Sign In)
    // =========================
    const authContainer = document.getElementById("authContainer");
    const toRegisterBtn = document.getElementById("toRegisterBtn");
    const toLoginBtn = document.getElementById("toLoginBtn");

    if (toRegisterBtn && toLoginBtn && authContainer) {
        toRegisterBtn.addEventListener("click", () => {
            authContainer.classList.add("right-panel-active");
        });
        toLoginBtn.addEventListener("click", () => {
            authContainer.classList.remove("right-panel-active");
        });
    }

    // =========================
    // 3. 密碼顯示 / 隱藏切換
    // =========================
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", function () {
            const isHidden = passwordInput.type === "password";
            passwordInput.type = isHidden ? "text" : "password";
            this.classList.toggle("fa-eye");
            this.classList.toggle("fa-eye-slash");
        });
    }
    
    const toggleRegPassword = document.getElementById("toggleRegPassword");
    const regPasswordInput = document.getElementById("regPassword");
    if (toggleRegPassword && regPasswordInput) {
        toggleRegPassword.addEventListener("click", function () {
            const isHidden = regPasswordInput.type === "password";
            regPasswordInput.type = isHidden ? "text" : "password";
            this.classList.toggle("fa-eye");
            this.classList.toggle("fa-eye-slash");
        });
    }

    // =========================
    // 4. 忘記密碼 Modal 開關邏輯
    // =========================
    const forgotPwdModal = document.getElementById("forgotPwdModal");
    const forgotPwdLink = document.getElementById("forgotPwdLink");
    const closeForgotPwd = document.getElementById("closeForgotPwd");

    function openModal(modal) {
        if (!modal) return;
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.style.display = "none";
        document.body.style.overflow = "";
    }

    if (forgotPwdLink) {
        forgotPwdLink.addEventListener("click", (e) => { 
            e.preventDefault(); 
            openModal(forgotPwdModal); 
        });
    }
    if (closeForgotPwd) {
        closeForgotPwd.addEventListener("click", () => closeModal(forgotPwdModal));
    }
    window.addEventListener("click", (e) => {
        if (e.target === forgotPwdModal) closeModal(forgotPwdModal);
    });

    // =========================
    // 5. 登入邏輯
    // =========================
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault(); 

            // 在您的 HTML 中，登入的電子郵件欄位 ID 是 "username"
            const emailInput = document.getElementById("username");
            const passwordInput = document.getElementById("password");

            if (!emailInput || !passwordInput) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                Toast.fire({ icon: 'warning', title: '請完整輸入帳號與密碼！' });
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: email, password: password }) // 確保使用 username 鍵，否則後端會找不到帳號
                });

                const data = await response.json();

                if (data.success) {
                    if (data.require2FA) {
                        const { value: code, isConfirmed } = await Swal.fire({
                            title: '<i class="fa-solid fa-shield-halved"></i> 雙重認證',
                            html: `
                                <p style="color: #8892b0; margin-bottom: 20px;">請輸入 <strong>Google Authenticator</strong> 上的 6 位數驗證碼</p>
                                <input type="text" id="login-2fa-input" placeholder="000000" maxlength="6" style="text-align: center; font-size: 1.5rem; letter-spacing: 8px; font-weight: bold; width: 80%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid #00a8ff; color: #fff; border-radius: 6px; outline: none;">
                            `,
                            background: '#1c2638', color: '#fff',
                            showCancelButton: true, confirmButtonText: '驗證登入', cancelButtonText: '取消',
                            confirmButtonColor: '#00a8ff', cancelButtonColor: 'transparent',
                            customClass: { cancelButton: 'cyber-cancel-btn' },
                            preConfirm: () => {
                                const input = document.getElementById('login-2fa-input').value;
                                if (!input || input.length !== 6 || isNaN(input)) {
                                    Swal.showValidationMessage('請輸入有效的 6 位數字驗證碼！');
                                    return false;
                                }
                                return input;
                            }
                        });

                        if (isConfirmed) {
                            const verifyRes = await fetch(`${API_BASE_URL}/api/login/2fa`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: data.userId, token: code })
                            });
                            const verifyData = await verifyRes.json();

                            if (verifyData.success) {
                                Toast.fire({ icon: 'success', title: '驗證成功！正在載入頁面...' });
                                localStorage.setItem('currentUser', JSON.stringify(verifyData.user));
                                setTimeout(() => { window.location.href = "main.html"; }, 1500);
                            } else {
                                Swal.fire({ icon: 'error', title: '驗證失敗', text: verifyData.message, background: '#1c2638', color: '#fff' });
                            }
                        }
                    } else {
                        Toast.fire({ icon: 'success', title: data.message });
                        localStorage.setItem('currentUser', JSON.stringify(data.user)); 
                        setTimeout(() => { window.location.href = "main.html"; }, 1500);
                    }
                } else {
                    Toast.fire({ icon: 'error', title: data.message });
                }
            } catch (error) {
                console.error(error);
                Toast.fire({ icon: 'error', title: '無法連線至後端伺服器！' });
            }
        });
    }

    // =========================
    // 6. 註冊邏輯與密碼強度即時驗證
    // =========================
    const regPwdInputNode = document.getElementById("regPassword");
    const pwdCriteria = document.getElementById("pwdCriteria");
    
    if (regPwdInputNode && pwdCriteria) {
        const ruleLength = document.getElementById("rule-length");
        const ruleCase = document.getElementById("rule-case");
        const ruleNumber = document.getElementById("rule-number");

        regPwdInputNode.addEventListener("focus", () => {
            pwdCriteria.style.display = "block";
        });

        regPwdInputNode.addEventListener("input", (e) => {
            const val = e.target.value;
            // 1. 長度 >= 8
            if (val.length >= 8) {
                ruleLength.className = "valid";
            } else {
                ruleLength.className = "invalid";
            }
            // 2. 包含大小寫英文字母
            if (/[A-Z]/.test(val) && /[a-z]/.test(val)) {
                ruleCase.className = "valid";
            } else {
                ruleCase.className = "invalid";
            }
            // 3. 包含數字
            if (/\d/.test(val)) {
                ruleNumber.className = "valid";
            } else {
                ruleNumber.className = "invalid";
            }
        });
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            // 在您的 HTML 中，註冊的電子郵件欄位 ID 是 "regUsername"
            const regEmailInput = document.getElementById("regUsername");
            const regPasswordInput = document.getElementById("regPassword");

            if (!regEmailInput || !regPasswordInput) return;

            const regEmail = regEmailInput.value.trim();
            const regPassword = regPasswordInput.value.trim();

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

            if (!emailRegex.test(regEmail)) {
                Toast.fire({ icon: 'error', title: '格式錯誤：請輸入有效的電子郵件地址。' });
                return;
            }
            if (!passwordRegex.test(regPassword)) {
                Toast.fire({ icon: 'error', title: '密碼太弱：請設定至少 8 碼，包含大小寫英文字母與數字。' });
                return;
            }

            try {
                // 如果後端 API 需要的是 { username: ..., password: ... }，這裡會傳 regEmail 作為 username
                const response = await fetch(`${API_BASE_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: regEmail, password: regPassword })
                });
                
                const data = await response.json();

                if (data.success) {
                    Toast.fire({ icon: 'success', title: data.message });
                    setTimeout(() => {
                        registerForm.reset();
                        // 註冊成功後滑動回登入面板
                        if (authContainer) authContainer.classList.remove("right-panel-active");
                    }, 1500);
                } else {
                    Toast.fire({ icon: 'error', title: data.message });
                }
            } catch (error) {
                console.error(error);
                Toast.fire({ icon: 'error', title: '無法連線至後端伺服器！' });
            }
        });
    }

    // =========================
    // 7. 忘記密碼表單送出
    // =========================
    const forgotPwdForm = document.getElementById("forgotPwdForm");
    if (forgotPwdForm) {
        forgotPwdForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const emailInput = document.getElementById("forgotEmail");
            if (!emailInput) return;

            const email = emailInput.value.trim();
            
            if (!email) {
                Toast.fire({ icon: 'warning', title: '請輸入您的信箱！' });
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    Toast.fire({ icon: 'success', title: data.message });
                    setTimeout(() => { closeModal(forgotPwdModal); }, 1500);
                } else {
                    Toast.fire({ icon: 'error', title: data.message });
                }
            } catch (error) {
                console.error(error);
                Toast.fire({ icon: 'error', title: '伺服器連線失敗！' });
            }
        });
    }
});