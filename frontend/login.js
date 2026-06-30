const API_BASE_URL = 'http://localhost:3000';
document.addEventListener("DOMContentLoaded", function () {
    // =========================
    // 0. 全域 SweetAlert2 (Toast) 
    // =========================
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end', // 從右上角滑出
        showConfirmButton: false,
        timer: 3000, // 3秒後自動消失
        timerProgressBar: true, // 底部進度條
        background: '#1c2638', // 配合你的深色卡片底色
        color: '#e2e8f0', // 科技白字體
        customClass: {
            popup: 'tech-toast' // 預留給未來如果想加發光邊框用的 class
        },
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    // =========================
    // 1. 粒子背景
    // =========================
    if (typeof particlesJS !== "undefined") {
        particlesJS("particles-js", {
            particles: {
                number: { value: 65, density: { enable: true, value_area: 900 } },
                color: { value: ["#00e5ff", "#4fd1ff", "#00ffa3"] },
                shape: { type: "circle" },
                opacity: { value: 0.45, random: true },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: "#2bbcff", opacity: 0.22, width: 1 },
                move: { enable: true, speed: 1.8, direction: "none", out_mode: "out" }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: { enable: true, mode: "grab" },
                    onclick: { enable: true, mode: "push" }
                },
                modes: {
                    grab: { distance: 180, line_linked: { opacity: 0.8 } },
                    push: { particles_nb: 3 }
                }
            },
            retina_detect: true
        });
    }

    // =========================
    // 2. 密碼顯示 / 隱藏切換
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
    // 3. Modal 彈窗開關邏輯
    // =========================
    const registerModal = document.getElementById("registerModal");
    const forgotPwdModal = document.getElementById("forgotPwdModal");

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

    // 綁定按鈕
    document.getElementById("registerLink")?.addEventListener("click", (e) => { e.preventDefault(); openModal(registerModal); });
    document.getElementById("forgotPwdLink")?.addEventListener("click", (e) => { e.preventDefault(); openModal(forgotPwdModal); });
    document.getElementById("closeRegister")?.addEventListener("click", () => closeModal(registerModal));
    document.getElementById("closeForgotPwd")?.addEventListener("click", () => closeModal(forgotPwdModal));

    // 點擊背景關閉
    window.addEventListener("click", (e) => {
        if (e.target === registerModal) closeModal(registerModal);
        if (e.target === forgotPwdModal) closeModal(forgotPwdModal);
    });

    // =========================
    // 4. 登入邏輯 (連接 Node.js 後端，包含 2FA 攔截機制)
    // =========================
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault(); 

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!username || !password) {
                Toast.fire({ icon: 'warning', title: '請完整輸入帳號與密碼！' });
                return;
            }

            try {
                // 1. 發送第一階段登入請求 (帳號密碼驗證)
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    // 🌟 2. 判斷後端有沒有發出「需要 2FA 驗證」的信號
                    if (data.require2FA) {
                        // 彈出輸入 6 位數密碼的視窗
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

                        // 如果使用者按下了「驗證登入」
                        if (isConfirmed) {
                            try {
                                // 3. 發送第二階段登入請求 (驗證 6 位數字)
                                const verifyRes = await fetch(`${API_BASE_URL}/api/login/2fa`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: data.userId, token: code })
                                });
                                const verifyData = await verifyRes.json();

                                if (verifyData.success) {
                                    // ✅ 2FA 驗證成功，正式放行！
                                    Toast.fire({ icon: 'success', title: '驗證成功！正在載入頁面...' });
                                    localStorage.setItem('currentUser', JSON.stringify(verifyData.user));
                                    setTimeout(() => { window.location.href = "main.html"; }, 1500);
                                } else {
                                    // ❌ 6 位數字打錯
                                    Swal.fire({ icon: 'error', title: '驗證失敗', text: verifyData.message, background: '#1c2638', color: '#fff' });
                                }
                            } catch (err) {
                                Swal.fire({ icon: 'error', title: '錯誤', text: '伺服器連線失敗', background: '#1c2638', color: '#fff' });
                            }
                        }

                    } else {
                        // 🌟 3. 沒有開啟 2FA，一般正常登入 (原本的邏輯)
                        Toast.fire({ icon: 'success', title: data.message });
                        localStorage.setItem('currentUser', JSON.stringify(data.user)); 
                        setTimeout(() => { window.location.href = "main.html"; }, 1500);
                    }
                } else {
                    // 第一階段帳號密碼就打錯了
                    Toast.fire({ icon: 'error', title: data.message });
                }
            } catch (error) {
                console.error(error);
                Toast.fire({ icon: 'error', title: '無法連線至後端伺服器！' });
            }
        });
    }

    // =========================
    // 5. 註冊邏輯 (連接 Node.js 後端)
    // =========================
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const regUsername = document.getElementById("regUsername").value.trim();
            const regPassword = document.getElementById("regPassword").value.trim();

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

            if (!emailRegex.test(regUsername)) {
                Toast.fire({
                    icon: 'error',
                    title: '格式錯誤：請輸入有效的電子郵件地址。'
                });
                return;
            }
            if (!passwordRegex.test(regPassword)) {
                Toast.fire({
                    icon: 'error',
                    title: '密碼太弱：請設定至少 8 碼，包含大小寫英文字母與數字。'
                });
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: regUsername, password: regPassword })
                });
                
                const data = await response.json();

                if (data.success) {
                    Toast.fire({
                        icon: 'success',
                        title: data.message
                    });
                    
                    // 延遲關閉表單，讓使用者看清楚成功通知
                    setTimeout(() => {
                        registerForm.reset();
                        closeModal(registerModal);
                    }, 1500);
                    
                } else {
                    Toast.fire({
                        icon: 'error',
                        title: data.message
                    });
                }
            } catch (error) {
                console.error(error);
                Toast.fire({
                    icon: 'error',
                    title: '無法連線至後端伺服器！'
                });
            }
        });
    }

    // =========================
    // 6. 忘記密碼表單送出 (真實連線)
    // =========================
    const forgotPwdForm = document.getElementById("forgotPwdForm");
    if (forgotPwdForm) {
        forgotPwdForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            
            const email = document.getElementById("forgotEmail").value.trim();
            
            if (!email) {
                Toast.fire({
                    icon: 'warning',
                    title: '請輸入您的信箱！'
                });
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
                    Toast.fire({
                        icon: 'success',
                        title: data.message
                    });
                    
                    // 延遲關閉視窗
                    setTimeout(() => {
                        closeModal(forgotPwdModal);
                    }, 1500);
                    
                } else {
                    Toast.fire({
                        icon: 'error',
                        title: data.message
                    });
                }
            } catch (error) {
                console.error(error);
                Toast.fire({
                    icon: 'error',
                    title: '伺服器連線失敗！'
                });
            }
        });
    }
});