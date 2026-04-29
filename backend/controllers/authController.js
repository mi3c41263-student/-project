const bcrypt = require('bcrypt');

// --- 模擬資料庫 (之後可以搬到 models 裡面) ---
const users = [
    {
        id: 1,
        username: "test01@iso.com",
        passwordHash: "$2b$10$EixZ9.5uV6.p.6G3h5V6.O6u6.6u6.6u6.6u6.6u6.6u6.6u6.6u6", // Password123
        role: "一般學員"
    }
];

// --- 驗證規則 ---
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =========================================
// 1. 處理註冊邏輯 (Register)
// =========================================
const registerUser = async (req, res) => {
    const { username, password } = req.body;

    if (!emailRegex.test(username)) {
        return res.status(400).json({ success: false, message: "⚠️ 電子郵件格式錯誤" });
    }
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ success: false, message: "⚠️ 密碼強度不足！" });
    }

    if (users.find(u => u.username === username)) {
        return res.status(409).json({ success: false, message: "❌ 此帳號已被註冊" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            id: users.length + 1,
            username: username,
            passwordHash: hashedPassword,
            role: "一般學員"
        };
        users.push(newUser);

        console.log(`✅ 新使用者註冊成功：${username}`);
        res.status(201).json({ success: true, message: "✨ 註冊成功！請使用新帳號登入。" });
    } catch (error) {
        res.status(500).json({ success: false, message: "伺服器內部錯誤" });
    }
};

// =========================================
// 2. 處理登入邏輯 (Login)
// =========================================
const loginUser = async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({ success: false, message: "❌ 帳號或密碼錯誤" });
    }

    try {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        
        if (isMatch) {
            console.log(`🔓 使用者登入：${username}`);
            res.json({ success: true, message: "登入成功！正在載入儀表板..." });
        } else {
            res.status(401).json({ success: false, message: "❌ 帳號或密碼錯誤" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "伺服器內部錯誤" });
    }
};

// 將這兩個 function 匯出，讓其他人可以使用
module.exports = {
    registerUser,
    loginUser
};
// =========================================
// 3. 取得使用者學習成果數據 (Get Stats)
// =========================================
const getUserStats = async (req, res) => {
    // 1. 從網址列取得前端傳來的 userId (例如 /api/stats?userId=1)
    const userId = req.query.userId;

    // 2. 模擬多使用者的成績資料庫
    const userStatsDB = {
        "1": { // 1號使用者 (例如 test01) 的成績
            radarScores: [85, 60, 90, 75, 80], 
            totalScore: 78, 
            trainingHours: 12.5, 
            blocks: 42 
        },
        "2": { // 2號使用者的成績 (通常會比較強或比較弱，用來對比)
            radarScores: [95, 90, 85, 88, 92], 
            totalScore: 90, 
            trainingHours: 25.0, 
            blocks: 120 
        }
    };

    // 3. 根據 userId 尋找成績，如果找不到就給預設的 0 分面板
    const stats = userStatsDB[userId] || {
        radarScores: [0, 0, 0, 0, 0],
        totalScore: 0,
        trainingHours: 0,
        blocks: 0
    };

    res.json({ 
        success: true, 
        message: "成功獲取專屬學習數據",
        data: stats 
    });
};