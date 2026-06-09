const bcrypt = require('bcrypt');
const db = require('../db'); // 引入 MySQL 連線池
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // 產生隨機 token 用

// =========================================
// 設定寄信機 (Transporter)
// =========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mi3c41263@gmail.com', // 你的 Gmail
        pass: 'rwfiixewcpgzmzdn'  // 你的應用程式密碼
    }
});
transporter.verify(function(error, success) {
    if (error) {
        console.log("寄信伺服器連線失敗: ", error);
    } else {
        console.log("寄信伺服器連線成功! 可以發信了。"); 
    }
});
// --- 驗證規則 ---
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =========================================
// 1. 處理註冊邏輯 (Register)
// =========================================
const registerUser = async (req, res) => {
    const { username, password } = req.body; 
    const email = username; 

    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "電子郵件格式錯誤" });
    }
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ success: false, message: "密碼強度不足！(需包含大小寫英文字母、數字，且至少8碼)" });
    }

    try {
        const checkSql = "SELECT * FROM users WHERE email = ?";
        const [existingUsers] = await db.query(checkSql, [email]);

        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: "此帳號已被註冊" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 🌟 新增：產生隨機驗證碼
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const displayName = email.split('@')[0];

        // 🌟 修改：將 verification_token 一起寫入資料庫
        const insertSql = "INSERT INTO users (username, email, password_hash, verification_token) VALUES (?, ?, ?, ?)";
        await db.query(insertSql, [displayName, email, hashedPassword, verificationToken]);

        // 🌟 新增：準備並寄出驗證信
        const verificationUrl = `http://localhost:3000/api/verify?token=${verificationToken}`; 
        
        const mailOptions = {
            from: 'mi3c41263@gmail.com',
            to: email,
            subject: '【系統通知】請驗證您的電子郵件',
            html: `
                <h2>歡迎註冊 VR 訓練系統！</h2>
                <p>請點擊下方連結以開通您的帳號：</p>
                <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">點我驗證信箱</a>
            `
        };

        // 執行寄信
        await transporter.sendMail(mailOptions);
        console.log(`新使用者註冊成功，已發送驗證信至：${email}`);
        
        // 修改：提醒使用者去收信
        res.status(201).json({ success: true, message: "註冊成功！請至信箱點擊驗證連結以開通帳號。" });

    } catch (error) {
        console.error("註冊伺服器錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器內部錯誤" });
    }
};

// =========================================
// 2. 處理信箱驗證邏輯 (Verify Email)
// =========================================
const verifyEmail = async (req, res) => {
    const token = req.query.token; // 抓取網址上的 token
    if (!token) return res.status(400).send("無效的驗證請求");

    try {
        const sql = "SELECT * FROM users WHERE verification_token = ?";
        const [users] = await db.query(sql, [token]);

        if (users.length === 0) {
            return res.status(400).send("<h2>❌ 驗證碼無效或已過期。</h2>");
        }

        // 把 is_verified 改成 1，並清空 token
        const updateSql = "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = ?";
        await db.query(updateSql, [users[0].id]);

        // 🌟 這裡修改：把按鈕的 <a> 連結改成你前端 Live Server 的完整網址
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h2 style="color: green;">✅ 帳號驗證成功！</h2>
                <p>您的信箱已成功開通，現在可以回到首頁登入了。</p>
                <a href="http://127.0.0.1:5500/frontend/login.html" style="padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">前往登入頁面</a>
            </div>
        `);

    } catch (error) {
        console.error("驗證信箱發生錯誤:", error);
        res.status(500).send("伺服器錯誤");
    }
};

// =========================================
// 3. 處理登入邏輯 (Login)
// =========================================
const loginUser = async (req, res) => {
    const { username, password } = req.body;
    const email = username; 

    try {
        const sql = "SELECT * FROM users WHERE email = ?";
        const [users] = await db.query(sql, [email]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: "❌ 帳號或密碼錯誤" });
        }

        const user = users[0]; 
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (isMatch) {
            // 🌟 新增：檢查是否已經完成信箱驗證 (is_verified 是否為 1)
            if (!user.is_verified) {
                return res.status(403).json({ success: false, message: "❌ 您的帳號尚未驗證！請至信箱點擊驗證連結。" });
            }

            console.log(`使用者成功登入：${email}`);
            res.json({ 
                success: true, 
                message: "登入成功！正在載入儀表板...",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } else {
            res.status(401).json({ success: false, message: "❌ 帳號或密碼錯誤" });
        }
    } catch (error) {
        console.error("登入伺服器錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器內部錯誤" });
    }
};


// =========================================
// 4. 取得使用者學習成果數據 (Get Stats)
// =========================================
const getUserStats = async (req, res) => {
    const userId = req.query.userId;

    const userStatsDB = {
        "1": { radarScores: [85, 60, 90, 75, 80], totalScore: 78, trainingHours: 12.5, blocks: 42 },
        "2": { radarScores: [95, 90, 85, 88, 92], totalScore: 90, trainingHours: 25.0, blocks: 120 }
    };

    const stats = userStatsDB[userId] || {
        radarScores: [0, 0, 0, 0, 0], totalScore: 0, trainingHours: 0, blocks: 0
    };

    res.json({ 
        success: true, 
        message: "成功獲取專屬學習數據",
        data: stats 
    });
};
// =========================================
// 5. 忘記密碼：寄出重置信 (Forgot Password)
// =========================================
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // 1. 確認這個信箱有沒有註冊過
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "找不到此信箱，請確認是否輸入正確。" });
        }

        // 2. 產生專屬重設 Token 與過期時間 (設定為 1 小時後)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expireTime = new Date(Date.now() + 3600000); // 現在時間 + 1小時

        // 3. 寫入資料庫
        const updateSql = "UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?";
        await db.query(updateSql, [resetToken, expireTime, email]);

        // 4. 準備寄信 (這裡要連到你未來準備寫的 reset-password.html 網頁)
        const resetUrl = `http://127.0.0.1:5500/frontend/reset-password.html?token=${resetToken}`;
        
        const mailOptions = {
            from: 'mi3c41263@gmail.com',
            to: email,
            subject: '【系統通知】密碼重設要求',
            html: `
                <h2>密碼重設請求</h2>
                <p>您好，我們收到了您重設密碼的請求。</p>
                <p>請點擊下方連結來設定新密碼 (此連結將於 1 小時後失效)：</p>
                <a href="${resetUrl}" style="padding: 10px 20px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">重設密碼</a>
                <p>如果您並未提出此請求，請忽略這封信件。</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "密碼重設連結已寄出，請至信箱查收。" });

    } catch (error) {
        console.error("忘記密碼功能錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
};

// =========================================
// 6. 設定新密碼 (Reset Password)
// =========================================
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // 1. 檢查 Token 是否存在，且「還沒過期」 (> NOW())
        const [users] = await db.query("SELECT * FROM users WHERE reset_token = ? AND reset_expires > NOW()", [token]);
        
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: "連結無效或已過期，請重新申請。" });
        }

        // 2. 把新密碼加密
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. 更新密碼，並把 token 清空
        const updateSql = "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?";
        await db.query(updateSql, [hashedPassword, users[0].id]);

        res.json({ success: true, message: "密碼重設成功！請使用新密碼登入。" });

    } catch (error) {
        console.error("重設密碼錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
};
// 🌟 關鍵：將 verifyEmail 也匯出
module.exports = {
    registerUser,
    verifyEmail,
    loginUser,
    getUserStats,
    forgotPassword, 
    resetPassword   
};