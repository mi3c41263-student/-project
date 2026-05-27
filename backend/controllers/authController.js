const bcrypt = require('bcrypt');
const db = require('../db'); //  關鍵：引入我們剛剛寫好的真實 MySQL 連線池

// --- 驗證規則 ---
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =========================================
// 1. 處理註冊邏輯 (Register)
// =========================================
const registerUser = async (req, res) => {
    // 假設前端註冊時傳來的是信箱作為帳號，我們將它拆分
    const { username, password } = req.body; 
    const email = username; // 前端把信箱放在 username 欄位傳過來

    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "電子郵件格式錯誤" });
    }
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ success: false, message: "密碼強度不足！(需包含大小寫英文字母、數字，且至少8碼)" });
    }

    try {
        // 1. 檢查 MySQL 資料庫中是否已經有這個信箱
        const checkSql = "SELECT * FROM users WHERE email = ?";
        const [existingUsers] = await db.query(checkSql, [email]);

        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: "此帳號已被註冊" });
        }

        // 2. 密碼 Bcrypt 加密
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. 準備寫入 MySQL (把信箱 @ 前面的字串當作顯示名稱 username)
        const displayName = email.split('@')[0];
        const insertSql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)";
        const [result] = await db.query(insertSql, [displayName, email, hashedPassword]);

        console.log(` 新使用者註冊成功寫入 DB：${email}`);
        res.status(201).json({ success: true, message: " 註冊成功！請使用新帳號登入。" });

    } catch (error) {
        console.error("註冊伺服器錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器內部錯誤" });
    }
};

// =========================================
// 2. 處理登入邏輯 (Login)
// =========================================
const loginUser = async (req, res) => {
    const { username, password } = req.body;
    const email = username; 

    try {
        // 1. 去 MySQL 資料庫尋找這個信箱
        const sql = "SELECT * FROM users WHERE email = ?";
        const [users] = await db.query(sql, [email]);

        // 如果資料庫沒這個人
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: "❌ 帳號或密碼錯誤" });
        }

        const user = users[0]; // 取得該筆使用者資料

        // 2. 使用 bcrypt 比對密碼
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (isMatch) {
            console.log(` 使用者成功登入：${email}`);
            // 回傳使用者的 ID 與名稱給前端 (千萬不要回傳密碼！)
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
// 3. 取得使用者學習成果數據 (Get Stats)
// =========================================
const getUserStats = async (req, res) => {
    const userId = req.query.userId;

    // 目前為了讓你的前端「雷達圖」可以動，我們先暫時用模擬數據回傳
    // 未來你可以把它改成從 MySQL 的 `user_scores` 資料表去撈取真實分數！
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

// 🌟 關鍵：將這「三個」function 匯出給 authRoutes.js 使用
module.exports = {
    registerUser,
    loginUser,
    getUserStats
};