document.addEventListener("DOMContentLoaded", function () {
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
            // 1. 判斷當前是否為隱藏狀態
            const isHidden = regPasswordInput.type === "password";
            
            // 2. 切換 input 的 type：text <-> password
            regPasswordInput.type = isHidden ? "text" : "password";
            
            // 3. 切換圖示：fa-eye (顯示) <-> fa-eye-slash (隱藏)
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
    // 4. 登入邏輯 (連接 Node.js 後端)
    // =========================
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault(); // 🛑 這是解決 405 錯誤的關鍵！阻止網頁跳轉

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!username || !password) {
                alert("請完整輸入帳號與密碼！");
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    alert("✨ " + data.message);
                    localStorage.setItem('currentUser', JSON.stringify(data.user)); // 記住身分
                    window.location.href = "main.html"; // 成功後跳轉儀表板
                } else {
                    alert("❌ " + data.message);
                }
            } catch (error) {
                console.error(error);
                alert("無法連線至後端伺服器！請確認 node server.js 已經啟動。");
            }
        });
    }

    // =========================
    // 5. 註冊邏輯 (連接 Node.js 後端)
    // =========================
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault(); // 🛑 阻止網頁跳轉

            const regUsername = document.getElementById("regUsername").value.trim();
            const regPassword = document.getElementById("regPassword").value.trim();

            // 防呆驗證
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

            if (!emailRegex.test(regUsername)) {
                alert("❌ 格式錯誤：請輸入有效的電子郵件地址。");
                return;
            }
            if (!passwordRegex.test(regPassword)) {
                alert("❌ 密碼太弱：請設定至少 8 碼，包含大小寫英文字母與數字。");
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: regUsername, password: regPassword })
                });
                
                const data = await response.json();

                if (data.success) {
                    alert("✨ " + data.message);
                    registerForm.reset();
                    closeModal(registerModal);
                } else {
                    alert("❌ " + data.message);
                }
            } catch (error) {
                console.error(error);
                alert("無法連線至後端伺服器！");
            }
        });
    }

    // =========================
    // 6. 忘記密碼表單送出 (模擬)
    // =========================
    const forgotPwdForm = document.getElementById("forgotPwdForm");
    if (forgotPwdForm) {
        forgotPwdForm.addEventListener("submit", function (e) {
            e.preventDefault();
            alert("重置密碼連結已寄出，請至信箱確認。");
            closeModal(forgotPwdModal);
        });
    }
});