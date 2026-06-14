const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
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
        // 1. 用 email 去資料庫找使用者
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length > 0) {
            const user = users[0];

            // 🕵️‍♂️ X光監視器：把資料庫撈出來的東西全部印出來看！
            console.log("👉 [登入測試] 從資料庫撈出的使用者資料:", user);
            
            // 🌟 終極修復：動態抓取正確的資料庫欄位名稱 (password_hash)
            const dbPassword = user.password_hash || user.password;

            // 🛡️ 新增防呆：如果資料庫裡這個人根本沒密碼，直接擋下！
            if (!dbPassword) {
                return res.status(401).json({ success: false, message: "❌ 您的帳號資料異常（無密碼紀錄），請重新註冊一組新帳號！" });
            }

            // 2. 比對「登入密碼」(絕對要確保這裡是 dbPassword)
            const isMatch = await bcrypt.compare(password, dbPassword);

            if (isMatch) {
                // 3. 檢查信箱驗證
                if (!user.is_verified) {
                    return res.status(403).json({ success: false, message: "❌ 您的帳號尚未驗證！請至信箱點擊驗證連結。" });
                }

                // 4. 檢查是否有開啟 2FA 攔截
                if (user.is_2fa_enabled) {
                    return res.json({ 
                        success: true, 
                        require2FA: true, 
                        message: "請輸入雙重認證碼",
                        userId: user.id   
                    });
                }

                // 5. 沒開啟 2FA，正常放行登入
                console.log(`使用者成功登入：${email}`);
                const responseData = {
                    id: user.id, username: user.username, email: user.email, 
                    avatar_url: user.avatar_url, bio: user.bio, 
                    is_2fa_enabled: (user.is_2fa_enabled === 1 || user.is_2fa_enabled === true) 
                };

                res.json({ success: true, message: "登入成功！正在載入儀表板...", user: responseData });
            } else {
                res.status(401).json({ success: false, message: "❌ 帳號或密碼錯誤" });
            }
        } else {
            res.status(401).json({ success: false, message: "❌ 帳號或密碼錯誤" });
        }
    } catch (error) {
        console.error("登入伺服器錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器內部錯誤" });
    }
};
// =========================================
// 4. 取得使用者學習成果數據 (動態從資料庫計算)
// =========================================
const getUserStats = async (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少使用者 ID" });
    }

    try {
        // 🌟 1. 從資料庫加總該用戶的「總時數」與「總攔截次數」
        const [totals] = await db.query(
            "SELECT SUM(duration_hours) as totalHours, SUM(blocks_count) as totalBlocks FROM vr_training_records WHERE user_id = ?", 
            [userId]
        );

        // 🌟 2. 撈出該用戶「最近一次」的 VR 訓練各項分數作為雷達圖基底
        const [latestScore] = await db.query(
            "SELECT score_physical, score_social, score_server, score_device, score_legal, total_score FROM vr_training_records WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            [userId]
        );

        const hasData = latestScore.length > 0;

        // 🌟 3. 打包成前端原本就看得懂的格式
        const stats = {
            radarScores: hasData ? [
                latestScore[0].score_physical,
                latestScore[0].score_social,
                latestScore[0].score_server,
                latestScore[0].score_device,
                latestScore[0].score_legal
            ] : [0, 0, 0, 0, 0], // 沒玩過就全部 0 分
            totalScore: hasData ? latestScore[0].total_score : 0,
            trainingHours: totals[0].totalHours ? parseFloat(totals[0].totalHours) : 0.0,
            blocks: totals[0].totalBlocks ? parseInt(totals[0].totalBlocks) : 0
        };

        res.json({ 
            success: true, 
            message: "成功獲取真實學習數據",
            data: stats 
        });

    } catch (error) {
        console.error("獲取學習數據錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生內部錯誤" });
    }
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
// =========================================
// 7. 設定 multer 圖片上傳規則
// =========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // 存到我們剛剛建立的 uploads 資料夾
    },
    filename: function (req, file, cb) {
        // 幫圖片重新命名：時間戳記 + 原始副檔名 (例如：16892345.jpg)，避免檔名重複被覆蓋
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage: storage });

// =========================================
// 8. 更新個人檔案 (Update Profile)
// =========================================
const updateProfile = async (req, res) => {
    // 這裡的 req.body 放的是文字，req.file 放的是圖片
    const { userId, username, bio } = req.body; 
    
    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少使用者 ID" });
    }

    try {
        let sql;
        let params;

        // 判斷使用者「有沒有」上傳新圖片
        if (req.file) {
            // 有上傳圖片：文字跟圖片網址一起更新
            const avatarUrl = `http://localhost:3000/uploads/${req.file.filename}`;
            sql = "UPDATE users SET username = ?, bio = ?, avatar_url = ? WHERE id = ?";
            params = [username, bio, avatarUrl, userId];
        } else {
            // 沒上傳圖片：只更新文字
            sql = "UPDATE users SET username = ?, bio = ? WHERE id = ?";
            params = [username, bio, userId];
        }

        await db.query(sql, params);

        // 把更新後的最新資料撈出來回傳給前端
        const [users] = await db.query("SELECT id, username, email, bio, avatar_url FROM users WHERE id = ?", [userId]);

        // 🌟 新增防呆：如果資料庫裡根本沒這個 ID，直接回報失敗
        if (users.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "資料庫找不到該使用者的資料，請嘗試登出後再重新登入！" 
            });
        }

        res.json({ 
            success: true, 
            message: "個人檔案更新成功！",
            user: users[0] 
        });

    } catch (error) {
        console.error("更新個人檔案發生錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生內部錯誤" });
    }
};
// =========================================
// 9. 產生 2FA 密鑰與 QR Code
// =========================================
const generate2FA = async (req, res) => {
    const { userId, email } = req.query; 

    try {
        // 產生專屬密鑰，名稱會顯示在 Google Authenticator 上
        const secret = speakeasy.generateSecret({
            name: `ISO愛搜查 (${email})`
        });

        // 先把這把鑰匙偷偷存進資料庫 (此時還沒正式啟用)
        await db.query("UPDATE users SET two_factor_secret = ? WHERE id = ?", [secret.base32, userId]);

        // 把鑰匙的專屬網址轉成 QR Code 圖片
        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ success: false, message: "QR Code 產生失敗" });
            
            res.json({ 
                success: true, 
                qrCodeUrl: data_url // 這是 base64 的圖片網址，前端可以直接放進 <img src="...">
            });
        });
    } catch (error) {
        console.error("產生 2FA 錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
};

// =========================================
// 10. 驗證並正式啟用 2FA
// =========================================
const verify2FA = async (req, res) => {
    const { userId, token } = req.body;

    try {
        // 從資料庫拿出剛剛存的密鑰
        const [users] = await db.query("SELECT two_factor_secret FROM users WHERE id = ?", [userId]);
        if (users.length === 0 || !users[0].two_factor_secret) {
            return res.status(400).json({ success: false, message: "找不到 2FA 密鑰，請重新整理頁面重試。" });
        }

        const secret = users[0].two_factor_secret;

        // 核心驗證：比對使用者輸入的 6 位數是否正確
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            // 驗證成功！正式啟用 2FA
            await db.query("UPDATE users SET is_2fa_enabled = TRUE WHERE id = ?", [userId]);
            res.json({ success: true, message: "2FA 啟用成功！" });
        } else {
            res.status(400).json({ success: false, message: "驗證碼錯誤，請重試！" });
        }
    } catch (error) {
        console.error("驗證 2FA 錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
};

// =========================================
// 11. 停用 2FA
// =========================================
const disable2FA = async (req, res) => {
    const { userId } = req.body;
    try {
        // 把啟用狀態關閉，並清空密鑰
        await db.query("UPDATE users SET is_2fa_enabled = FALSE, two_factor_secret = NULL WHERE id = ?", [userId]);
        res.json({ success: true, message: "2FA 已成功停用。" });
    } catch (error) {
        console.error("停用 2FA 錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
};
// =========================================
// 12. 登入時的 2FA 驗證
// =========================================
const verifyLogin2FA = async (req, res) => {
    const { userId, token } = req.body;

    try {
        const [users] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (users.length === 0) return res.status(400).json({ success: false, message: "找不到使用者" });

        const user = users[0];
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            // 驗證成功！正式放行，核發完整登入資料
            console.log(`使用者 2FA 驗證並登入成功：${user.email}`);
            const responseData = {
                id: user.id, username: user.username, email: user.email, 
                avatar_url: user.avatar_url, bio: user.bio, is_2fa_enabled: true
            };
            res.json({ success: true, message: "2FA 驗證成功！", user: responseData });
        } else {
            res.status(401).json({ success: false, message: "❌ 驗證碼錯誤，請重試！" });
        }
    } catch (error) {
        console.error("登入 2FA 錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
};
// =========================================
// 13. 接收並儲存 VR 訓練數據 (給 VR 端點呼叫)
// =========================================
const saveVRStats = async (req, res) => {
    const { userId, physical, social, server, device, legal, duration, blocks } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少使用者 ID" });
    }

    try {
        // 自動計算五項平均分作為本次訓練的綜合得分
        const totalScore = Math.round((physical + social + server + device + legal) / 5);

        const sql = `INSERT INTO vr_training_records 
                     (user_id, score_physical, score_social, score_server, score_device, score_legal, total_score, duration_hours, blocks_count) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                     
        await db.query(sql, [userId, physical, social, server, device, legal, totalScore, duration, blocks]);

        res.json({ 
            success: true, 
            message: "🎮 VR 訓練數據已成功同步至系統資料庫！" 
        });

    } catch (error) {
        console.error("儲存 VR 數據發生錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生錯誤，無法儲存數據" });
    }
};
// =========================================
// 14. 登入後更改密碼 (Change Password)
// =========================================
const changePassword = async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "請填寫完整密碼資訊！" });
    }

   try {
        const [users] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (users.length === 0) return res.status(404).json({ success: false, message: "找不到使用者" });

        const user = users[0];

        // 🌟 終極修復 2：動態抓取正確的資料庫欄位名稱
        const dbPassword = user.password_hash || user.password;

        // 🕵️‍♂️ 監視器：這次一定印得出東西了！
        console.log("👉 [修改密碼測試] 前端傳來的舊密碼:", currentPassword);
        console.log("👉 [修改密碼測試] 資料庫撈出的舊密碼:", dbPassword);

        if (!dbPassword) {
            return res.status(400).json({ success: false, message: "❌ 您的帳號沒有設定密碼，無法修改！" });
        }

        // 比對舊密碼
        const isMatch = await bcrypt.compare(currentPassword, dbPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "❌ 目前密碼輸入錯誤，請確認！" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // 🌟 終極修復 3：確保更新時寫入正確的欄位名稱 (password_hash)
        await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedNewPassword, userId]);

        res.json({ success: true, message: "✅ 密碼修改成功！下次請使用新密碼登入。" });

    } catch (error) {
        console.error("修改密碼錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生內部錯誤" });
    }
};
// 🌟 關鍵：將所有功能匯出給路由使用
module.exports = {
    registerUser,
    verifyEmail,
    loginUser,
    getUserStats,
    forgotPassword, 
    resetPassword,  
    upload,         
    updateProfile,
    generate2FA, 
    verify2FA,    
    disable2FA ,
    verifyLogin2FA ,
    getUserStats, 
    saveVRStats ,
    changePassword  
};
