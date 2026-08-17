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
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
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
        let origin = req.headers.origin;
        if (!origin || origin === 'null') {
            const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            origin = `${protocol}://${host}`;
        }
        let apiOrigin = origin;
        if (apiOrigin && (apiOrigin.includes('5500') || apiOrigin.includes('127.0.0.1'))) {
            apiOrigin = 'http://localhost:3000';
        }
        const verificationUrl = `${apiOrigin}/api/verify?token=${verificationToken}`;
        
        const mailOptions = {
            from: 'mi3c41263@gmail.com',
            to: email,
            subject: '【系統通知】請驗證您的電子郵件',
            html: `
                <h2>歡迎註冊 VR 訓練系統！</h2>
                <p>請點擊下方連結以開通您的帳號：</p>
                <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">點我驗證信箱</a>
                <p style="margin-top: 20px; font-size: 12px; color: #666; word-break: break-all;">如果上方的按鈕無法點擊，請複製以下網址並貼上至瀏覽器：<br>${verificationUrl}</p>
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
            return res.status(400).send("<h2>驗證碼無效或已過期。</h2>");
        }

        // 把 is_verified 改成 1，並清空 token
        const updateSql = "UPDATE users SET is_verified = TRUE WHERE id = ?"; // 不清空 token 避免預覽器重複點擊失敗
        await db.query(updateSql, [users[0].id]);

        // 🌟 這裡修改：把按鈕的 <a> 連結改成你前端 Live Server 的完整網址
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.send(`
            <!DOCTYPE html>
            <html lang="zh-TW">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>驗證成功</title>
                <style>
                    body { background-color: #0b101e; color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { text-align: center; background: #131a2a; padding: 40px; border-radius: 12px; border: 1px solid rgba(0,243,255,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                    h2 { color: #2ed573; margin-bottom: 15px; }
                    p { color: #a0aec0; margin-bottom: 25px; }
                    .spinner { border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #00e5ff; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2> 帳號驗證成功！</h2>
                    <p>您的信箱已成功開通！<br><br>請關閉此分頁，回到原本的註冊網頁繼續登入。</p>
                </div>
            </body>
            </html>
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
                return res.status(401).json({ success: false, message: " 您的帳號資料異常（無密碼紀錄），請重新註冊一組新帳號！" });
            }

            // 2. 比對「登入密碼」(絕對要確保這裡是 dbPassword)
            const isMatch = await bcrypt.compare(password, dbPassword);

            if (isMatch) {
                // 3. 檢查信箱驗證
                if (!user.is_verified) {
                    return res.status(403).json({ success: false, message: " 您的帳號尚未驗證！請至信箱點擊驗證連結。" });
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
                    avatar_url: user.avatar_url, 
                    is_2fa_enabled: (user.is_2fa_enabled === 1 || user.is_2fa_enabled === true),
                    mistakes: (function(){ try { return typeof user.mistakes === 'string' ? JSON.parse(user.mistakes) : (user.mistakes || []); } catch(e) { return []; } })()
                };

                res.json({ success: true, message: "登入成功！正在跳轉...", user: responseData });
            } else {
                res.status(401).json({ success: false, message: "密碼錯誤，請重新確認" });
            }
        } else {
            res.status(404).json({ success: false, message: "查無此帳號，請先註冊" });
        }
    } catch (error) {
        console.error("登入伺服器錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器內部錯誤" });
    }
};
// =========================================
// 4. 取得使用者最新學習成果
// 雷達圖改由 user_answers 真實作答結果計算
// =========================================
const getUserStats = async (req, res) => {
    const userId = Number(req.query.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            success: false,
            message: "缺少或無效的使用者 ID"
        });
    }

    try {
        // =========================================
        // 1. 取得每一題「最新一次」作答
        //
        // 因為玩家可以重新選 O / X，
        // 所以同一題如果有多筆紀錄，只取最後一筆。
        // =========================================
        const [latestAnswers] = await db.query(
            `
            SELECT
                ua.id,
                ua.question_id,
                ua.selected_option,
                ua.is_correct,
                ua.score,
                q.question_text,
                q.correct_option
            FROM user_answers ua

            INNER JOIN questions q
                ON ua.question_id = q.id

            INNER JOIN (
                SELECT
                    question_id,
                    MAX(id) AS latest_answer_id
                FROM user_answers
                WHERE user_id = ?
                GROUP BY question_id
            ) latest
                ON ua.id = latest.latest_answer_id

            WHERE ua.user_id = ?
            `,
            [userId, userId]
        );


        // =========================================
        // 2. 預設十題都是 0 分
        //
        // 1 = 答對
        // 0 = 答錯 / 尚未作答
        // =========================================
        const answers = {
            Q1: 0,
            Q2: 0,
            Q3: 0,
            Q4: 0,
            Q5: 0,
            Q6: 0,
            Q7: 0,
            Q8: 0,
            Q9: 0,
            Q10: 0
        };


        // =========================================
        // 3. 使用 question_text 對應正式 Q1～Q10
        //
        // 不直接假設 questions.id = 1~10，
        // 因為資料庫 AUTO_INCREMENT 曾經有刪除資料。
        // =========================================
        const questionMap = {
            "主管隨意放置主管專用識別證": "Q1",

            "提供已失效的稽核通行證": "Q2",

            "存有重要檔案的 USB 硬碟隨意放在桌緣": "Q3",

            "未上鎖的平板放置於辦公桌面上": "Q4",

            "重要訪客名片隨意放置在辦公桌上": "Q5",

            "未加蓋咖啡放在電腦旁": "Q6",

            "公司內部文件隨意放置": "Q7",

            "機房堆放報廢電子設備": "Q8",

            "管制機房內放置食物": "Q9",

            "帳號密碼寫在便利貼上": "Q10"
        };


        // 把資料庫最新答案放進 Q1～Q10
        latestAnswers.forEach(row => {

            const questionNumber =
                questionMap[String(row.question_text).trim()];

            if (!questionNumber) {
                console.warn(
                    "⚠️ 找不到題目對應：",
                    row.question_text
                );

                return;
            }

            answers[questionNumber] =
                Number(row.is_correct) === 1 ? 1 : 0;
        });


        // =========================================
        // 4. 五大雷達能力正式評分公式
        // =========================================

        // A：身分與門禁管理
        // Q1 60% + Q2 40%
        const identityAccess =
            answers.Q1 * 60 +
            answers.Q2 * 40;


        // B：設備與媒體防護
        // Q3 60% + Q4 40%
        const deviceMedia =
            answers.Q3 * 60 +
            answers.Q4 * 40;


        // C：文件與敏感資訊保護
        // Q5 30% + Q7 30% + Q10 40%
        const documentInfo =
            answers.Q5 * 30 +
            answers.Q7 * 30 +
            answers.Q10 * 40;


        // D：環境風險防護
        // Q6 50% + Q9 50%
        const environmentRisk =
            answers.Q6 * 50 +
            answers.Q9 * 50;


        // E：機房與資產管理
        // Q8 70% + Q9 30%
        const serverAsset =
            answers.Q8 * 70 +
            answers.Q9 * 30;


        // =========================================
        // 5. 五項平均 = 綜合總分
        // =========================================
        const totalScore = Math.round(
            (
                identityAccess +
                deviceMedia +
                documentInfo +
                environmentRisk +
                serverAsset
            ) / 5
        );


        // =========================================
        // 6. 計算目前答對題數
        // =========================================
        const correctCount =
            Object.values(answers)
                .filter(value => value === 1)
                .length;


        // =========================================
        // 7. 保留原本 VR 訓練總時數
        // =========================================
        const [totals] = await db.query(
            `
            SELECT
                COALESCE(SUM(duration_hours), 0) AS totalHours
            FROM vr_training_records
            WHERE user_id = ?
            `,
            [userId]
        );


        const trainingHours =
            totals.length > 0
                ? Number(totals[0].totalHours)
                : 0;


        // =========================================
        // 8. 保留原本歷史趨勢資料
        // =========================================
        const [historyScores] = await db.query(
            `
            SELECT total_score
            FROM vr_training_records
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 5
            `,
            [userId]
        );


        const chronologicalScores =
            [...historyScores].reverse();


        // =========================================
        // 9. 回傳 Web
        //
        // radarScores 順序一定要和前端雷達圖一致：
        //
        // 0 身分與門禁管理
        // 1 設備與媒體防護
        // 2 文件與敏感資訊保護
        // 3 環境風險防護
        // 4 機房與資產管理
        // =========================================
        const stats = {

            radarScores: [
                identityAccess,
                deviceMedia,
                documentInfo,
                environmentRisk,
                serverAsset
            ],

            totalScore: totalScore,

            trainingHours: trainingHours,

            // 暫時以答對題數作為成功辨識數
            blocks: correctCount,

            trendLabels:
                chronologicalScores.map(
                    (_, index) => `第 ${index + 1} 次`
                ),

            trendData:
                chronologicalScores.map(
                    item => Number(item.total_score)
                ),

            // 除錯用
            answers: answers
        };


        console.log(
            `📊 User=${userId} 雷達圖計算完成：`
        );

        console.log("十題結果：", answers);

        console.log("五項能力：", {
            身分與門禁管理: identityAccess,
            設備與媒體防護: deviceMedia,
            文件與敏感資訊保護: documentInfo,
            環境風險防護: environmentRisk,
            機房與資產管理: serverAsset
        });

        console.log("綜合分數：", totalScore);


        return res.json({
            success: true,
            message: "成功取得最新 VR 學習成果",
            data: stats
        });


    } catch (error) {

        console.error(
            "取得使用者學習成果失敗：",
            error
        );

        return res.status(500).json({
            success: false,
            message: "伺服器發生內部錯誤"
        });
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
        let origin = req.headers.origin;
        if (!origin || origin === 'null') {
            const host = req.get('host') || 'localhost:3000';
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            origin = `${protocol}://${host}`;
        }
        const resetUrl = `${origin}/reset-password.html?token=${resetToken}`;
        
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
    const { userId, username } = req.body; 
    
    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少使用者 ID" });
    }

    try {
        let sql;
        let params;

        // 判斷使用者「有沒有」上傳新圖片
        if (req.file) {
            // 有上傳圖片：文字跟圖片網址一起更新
            const avatarUrl = `http://192.168.0.147:3000/uploads/${req.file.filename}`;
            sql = "UPDATE users SET username = ?, avatar_url = ? WHERE id = ?";
            params = [username, avatarUrl, userId];
        } else {
            // 沒上傳圖片：只更新文字
            sql = "UPDATE users SET username = ? WHERE id = ?";
            params = [username, userId];
        }

        await db.query(sql, params);

        // 把更新後的最新資料撈出來回傳給前端
        const [users] = await db.query("SELECT id, username, email, avatar_url FROM users WHERE id = ?", [userId]);

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
                avatar_url: user.avatar_url, is_2fa_enabled: true
            };
            res.json({ success: true, message: "2FA 驗證成功！", user: responseData });
        } else {
            res.status(401).json({ success: false, message: " 驗證碼錯誤，請重試！" });
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
    const { userId, duration, blocks } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少使用者 ID" });
    }

    try {
        // 1. 從 user_answers 抓取該用戶最新的作答紀錄
        const [answers] = await db.query(
            `SELECT question_id, is_correct 
             FROM user_answers 
             WHERE user_id = ? 
             ORDER BY answered_at DESC 
             LIMIT 100`, 
            [userId]
        );

        // 將最新答題結果轉為 Map { 1: true, 2: false ... }
        const correctMap = {};
        answers.forEach(a => {
            if (correctMap[a.question_id] === undefined) {
                correctMap[a.question_id] = a.is_correct === 1;
            }
        });

        // 2. 根據評分邏輯計算五大指標分數
        const calc_physical = (correctMap[1] ? 60 : 0) + (correctMap[2] ? 40 : 0);
        const calc_social = (correctMap[3] ? 60 : 0) + (correctMap[4] ? 40 : 0);
        const calc_server = (correctMap[5] ? 30 : 0) + (correctMap[7] ? 30 : 0) + (correctMap[10] ? 40 : 0);
        const calc_device = (correctMap[6] ? 50 : 0) + (correctMap[9] ? 50 : 0);
        const calc_legal = (correctMap[8] ? 70 : 0) + (correctMap[9] ? 30 : 0);

        // 3. 計算總分 (五項平均，四捨五入)
        const totalScore = Math.round((calc_physical + calc_social + calc_server + calc_device + calc_legal) / 5);

        // 4. 寫入 vr_training_records
        const sql = `INSERT INTO vr_training_records 
                     (user_id, score_physical, score_social, score_server, score_device, score_legal, total_score, duration_hours, blocks_count) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                     
        await db.query(sql, [userId, calc_physical, calc_social, calc_server, calc_device, calc_legal, totalScore, duration || 0, blocks || 0]);

        res.json({ 
            success: true, 
            message: "🎮 VR 訓練數據已成功同步至系統資料庫！(後端計算評分版)" 
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
            return res.status(400).json({ success: false, message: " 您的帳號沒有設定密碼，無法修改！" });
        }

        // 比對舊密碼
        const isMatch = await bcrypt.compare(currentPassword, dbPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: " 目前密碼輸入錯誤，請確認！" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // 🌟 終極修復 3：確保更新時寫入正確的欄位名稱 (password_hash)
        await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedNewPassword, userId]);

        res.json({ success: true, message: "密碼修改成功！下次請使用新密碼登入。" });

    } catch (error) {
        console.error("修改密碼錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器發生內部錯誤" });
    }
};
// =========================================
// 15. 刪除帳號 (Delete Account)
// =========================================
const deleteAccount = async (req, res) => {
    const { userId } = req.body;

    try {
        // 1. 刪除該用戶相關的 VR 訓練紀錄 (避免外鍵關聯錯誤)
        await db.query("DELETE FROM vr_training_records WHERE user_id = ?", [userId]);
        
        // 2. 刪除使用者主資料
        await db.query("DELETE FROM users WHERE id = ?", [userId]);

        res.json({ success: true, message: "帳號與所有數據已永久刪除。" });
    } catch (error) {
        console.error("刪除帳號失敗:", error);
        res.status(500).json({ success: false, message: "刪除失敗，請稍後再試。" });
    }
};
// =========================================
// 16. 接收 Unity 單題作答並自動判分
//
// Unity 傳入：
// userId
// questionCode
// selectedOption
//
// 例如：
// {
//     "userId": 64,
//     "questionCode": "S1_USB",
//     "selectedOption": "X"
// }
//
// Node.js 負責：
// 1. 找使用者
// 2. 用 questionCode 找真正 question_id
// 3. 判斷答案
// 4. 寫入 user_answers
// 5. 計算 3 站完成度
// 6. 回傳 Unity
// =========================================
const saveUnityAnswer = async (req, res) => {

    const {
        userId,
        questionCode,
        selectedOption
    } = req.body;


    // =========================================
    // 1. 檢查 userId
    // =========================================
    const parsedUserId = Number(userId);

    if (
        !Number.isInteger(parsedUserId) ||
        parsedUserId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "缺少或無效的 userId"
        });
    }


    // =========================================
    // 2. 檢查 questionCode
    // =========================================
    if (
        questionCode === undefined ||
        String(questionCode).trim() === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "缺少 questionCode"
        });
    }


    // =========================================
    // 3. 檢查 selectedOption
    // =========================================
    if (
        selectedOption === undefined ||
        String(selectedOption).trim() === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "缺少 selectedOption"
        });
    }


    // =========================================
    // 4. 統一資料格式
    // =========================================
    const code =
        String(questionCode)
            .trim()
            .toUpperCase();


    const option =
        String(selectedOption)
            .trim()
            .toUpperCase();


    // O = 選 O
    // X = 選 X
    // C = Completed
    if (!["O", "X", "C"].includes(option)) {

        return res.status(400).json({
            success: false,
            message: "selectedOption 只能是 O、X 或 C"
        });
    }


    try {

        // =========================================
        // 5. 確認使用者存在
        // =========================================
        const [users] = await db.query(
            `
            SELECT id
            FROM users
            WHERE id = ?
            `,
            [parsedUserId]
        );


        if (users.length === 0) {

            return res.status(404).json({
                success: false,
                message: "找不到此使用者"
            });
        }


        // =========================================
        // 6. 使用 question_code 找正式題目
        //
        // Unity 完全不需要知道 questions.id
        // =========================================
        const [questions] = await db.query(
            `
            SELECT
                id,
                question_code,
                scenario_id,
                stage_no,
                interaction_type,
                question_text,
                correct_option,
                score
            FROM questions
            WHERE question_code = ?
            LIMIT 1
            `,
            [code]
        );


        if (questions.length === 0) {

            return res.status(404).json({
                success: false,
                message: `找不到 questionCode：${code}`
            });
        }


        const question = questions[0];


        // =========================================
        // 7. 取得題目資料
        // =========================================
        const questionId =
            Number(question.id);


        const stageNo =
            Number(question.stage_no);


        const interactionType =
            String(
                question.interaction_type || ""
            )
                .trim()
                .toUpperCase();


        const correctOption =
            String(
                question.correct_option || ""
            )
                .trim()
                .toUpperCase();


        // =========================================
        // 8. 防止 Unity 傳錯類型
        // =========================================

        // 一般 O/X 題只能傳 O 或 X
        if (
            interactionType === "OX" &&
            !["O", "X"].includes(option)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `${code} 是 O/X 題，不能傳 ${option}`
            });
        }


        // 文件與完成型只能傳 C
        if (
            (
                interactionType === "DOCUMENT" ||
                interactionType === "COMPLETE"
            ) &&
            option !== "C"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `${code} 是完成型支線，只能傳 C`
            });
        }


        // =========================================
        // 9. Node.js 判斷正確 / 錯誤
        // =========================================
        const isCorrect =
            option === correctOption;


        const earnedScore =
            isCorrect
                ? Number(question.score || 0)
                : 0;


        // =========================================
        // 10. 寫入 user_answers
        // =========================================
        const insertSql = `
            INSERT INTO user_answers
            (
                user_id,
                question_id,
                selected_option,
                is_correct,
                score
            )
            VALUES (?, ?, ?, ?, ?)
        `;


        const [result] = await db.query(
            insertSql,
            [
                parsedUserId,
                questionId,
                option,
                isCorrect ? 1 : 0,
                earnedScore
            ]
        );


        // =========================================
        // 11. 從 MySQL 計算目前完成度
        //
        // DISTINCT question_id 很重要：
        //
        // 同一個 USB 就算回答 10 次，
        // 完成度仍然只算 1 個支線。
        //
        // 第一站 = 5
        // 第二站 = 5
        // 第三站 = 5
        // 總計 = 15
        // =========================================
        const [progressRows] = await db.query(
            `
            SELECT

                COUNT(
                    DISTINCT CASE
                        WHEN q.stage_no = 1
                        THEN ua.question_id
                    END
                ) AS stage1_completed,


                COUNT(
                    DISTINCT CASE
                        WHEN q.stage_no = 2
                        THEN ua.question_id
                    END
                ) AS stage2_completed,


                COUNT(
                    DISTINCT CASE
                        WHEN q.stage_no = 3
                        THEN ua.question_id
                    END
                ) AS stage3_completed,


                COUNT(
                    DISTINCT ua.question_id
                ) AS total_completed

            FROM user_answers ua

            INNER JOIN questions q
                ON ua.question_id = q.id

            WHERE ua.user_id = ?
              AND q.question_code IS NOT NULL
              AND q.stage_no IN (1, 2, 3)
            `,
            [parsedUserId]
        );


        const progress =
            progressRows[0] || {};


        const stage1Completed =
            Number(
                progress.stage1_completed || 0
            );


        const stage2Completed =
            Number(
                progress.stage2_completed || 0
            );


        const stage3Completed =
            Number(
                progress.stage3_completed || 0
            );


        const totalCompleted =
            Number(
                progress.total_completed || 0
            );


        // =========================================
        // 12. 目前這一站完成度
        // =========================================
        let currentStageCompleted = 0;

        if (stageNo === 1) {
            currentStageCompleted =
                stage1Completed;
        }

        else if (stageNo === 2) {
            currentStageCompleted =
                stage2Completed;
        }

        else if (stageNo === 3) {
            currentStageCompleted =
                stage3Completed;
        }


        // =========================================
        // 13. Node.js 終端機輸出
        // =========================================
        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "🎮 收到 Unity 正式支線作答"
        );

        console.log(
            "----------------------------------------"
        );

        console.log(
            "User ID：",
            parsedUserId
        );

        console.log(
            "Question Code：",
            code
        );

        console.log(
            "Question ID：",
            questionId
        );

        console.log(
            "Stage：",
            stageNo
        );

        console.log(
            "互動類型：",
            interactionType
        );

        console.log(
            "題目：",
            question.question_text
        );

        console.log(
            "玩家答案：",
            option
        );

        console.log(
            "正確答案：",
            correctOption
        );

        console.log(
            "結果：",
            isCorrect
                ? "✅ 正確"
                : "❌ 錯誤"
        );

        console.log(
            "得分：",
            earnedScore
        );


        // =========================================
        // 完成度輸出
        // =========================================
        console.log(
            "----------------------------------------"
        );

        console.log(
            "📊 VR 支線完成度"
        );

        console.log(
            `第一站：${stage1Completed}/5`
        );

        console.log(
            `第二站：${stage2Completed}/5`
        );

        console.log(
            `第三站：${stage3Completed}/5`
        );

        console.log(
            `總完成度：${totalCompleted}/15`
        );

        console.log(
            "========================================"
        );

        console.log("");


        // =========================================
        // 14. 回傳 Unity
        // =========================================
        return res.status(200).json({

            success: true,

            message:
                isCorrect
                    ? "作答成功，答案正確"
                    : "作答成功，但答案錯誤",

            data: {

                // =============================
                // 本題
                // =============================
                answerId:
                    result.insertId,

                userId:
                    parsedUserId,

                questionId:
                    questionId,

                questionCode:
                    question.question_code,

                stageNo:
                    stageNo,

                interactionType:
                    interactionType,

                questionText:
                    question.question_text,

                selectedOption:
                    option,

                correctOption:
                    correctOption,

                isCorrect:
                    isCorrect,

                score:
                    earnedScore,


                // =============================
                // 完成度
                // =============================
                stage1Completed:
                    stage1Completed,

                stage2Completed:
                    stage2Completed,

                stage3Completed:
                    stage3Completed,

                currentStageCompleted:
                    currentStageCompleted,

                stageTotal:
                    5,

                totalCompleted:
                    totalCompleted,

                totalQuestions:
                    15
            }
        });


    } catch (error) {

        console.error(
            "❌ 儲存 Unity 作答失敗：",
            error
        );


        return res.status(500).json({
            success: false,
            message: "伺服器發生內部錯誤"
        });
    }
};
// =========================================
// 17. Web 產生 Unity VR 一次性登入 Ticket
// =========================================
const createVRTicket = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "缺少使用者 ID"
        });
    }

    try {
        // 確認使用者存在
        const [users] = await db.query(
            "SELECT id, username, email FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "找不到此使用者"
            });
        }

        // 產生一次性 Ticket
        const ticket = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 5 分鐘後失效
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await db.query(
            `INSERT INTO vr_login_tickets
             (user_id, ticket, expires_at)
             VALUES (?, ?, ?)`,
            [userId, ticket, expiresAt]
        );

        console.log(
            `[VR Ticket] 已為 User=${userId} 建立登入 Ticket`
        );

        return res.json({
            success: true,
            message: "VR 登入 Ticket 建立成功",
            ticket: ticket,
            expiresAt: expiresAt
        });

    } catch (error) {
        console.error("建立 VR Ticket 失敗：", error);

        return res.status(500).json({
            success: false,
            message: "無法建立 VR 登入 Ticket"
        });
    }
};
// =========================================
// 18. Unity 使用 Ticket 取得登入使用者
// =========================================
const exchangeVRTicket = async (req, res) => {
    const { ticket } = req.body;

    if (!ticket) {
        return res.status(400).json({
            success: false,
            message: "缺少 VR Ticket"
        });
    }

    try {
        const [tickets] = await db.query(
            `SELECT
                t.id,
                t.user_id,
                t.is_used,
                t.expires_at,
                u.username,
                u.email
             FROM vr_login_tickets t
             JOIN users u
                ON t.user_id = u.id
             WHERE t.ticket = ?`,
            [ticket]
        );

        if (tickets.length === 0) {
            return res.status(404).json({
                success: false,
                message: "VR Ticket 不存在"
            });
        }

        const loginTicket = tickets[0];

        if (loginTicket.is_used) {
            return res.status(400).json({
                success: false,
                message: "VR Ticket 已經使用過"
            });
        }

        if (new Date(loginTicket.expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "VR Ticket 已過期"
            });
        }

        // Ticket 使用後立即作廢
        await db.query(
            `UPDATE vr_login_tickets
             SET is_used = 1
             WHERE id = ?`,
            [loginTicket.id]
        );

        console.log(
            `[VR Login] Unity 登入成功 User=${loginTicket.user_id}`
        );

        return res.json({
            success: true,
            message: "Unity VR 登入成功",
            user: {
                id: loginTicket.user_id,
                username: loginTicket.username,
                email: loginTicket.email
            }
        });

    } catch (error) {
        console.error("VR Ticket 驗證失敗：", error);

        return res.status(500).json({
            success: false,
            message: "VR 登入驗證失敗"
        });
    }
};
// 🌟 關鍵：將所有功能匯出給路由使用

const checkVerificationStatus = async (req, res) => {
    const email = req.query.email;
    if (!email) return res.json({ verified: false });
    try {
        const [users] = await db.query('SELECT is_verified FROM users WHERE email = ?', [email]);
        if (users.length > 0 && users[0].is_verified) {
            res.json({ verified: true });
        } else {
            res.json({ verified: false });
        }
    } catch (error) {
        res.json({ verified: false });
    }
};


// =========================================
// 新增：重新發送驗證信
// =========================================
const resendVerifyEmail = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "未提供電子郵件" });

    try {
        const checkSql = "SELECT * FROM users WHERE email = ?";
        const [users] = await db.query(checkSql, [email]);
        if (users.length === 0) return res.status(404).json({ success: false, message: "找不到此帳號" });

        const user = users[0];
        if (user.is_verified) return res.status(400).json({ success: false, message: "帳號已驗證，無須重新發送" });

        let origin = req.headers.origin;
        if (!origin || origin === 'null') {
            const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            origin = `${protocol}://${host}`;
        }
        let apiOrigin = origin;
        if (apiOrigin && (apiOrigin.includes('5500') || apiOrigin.includes('127.0.0.1'))) {
            apiOrigin = 'http://localhost:3000';
        }
        const verificationUrl = `${apiOrigin}/api/verify?token=${user.verification_token}`;

        const mailOptions = {
            from: 'mi3c41263@gmail.com',
            to: email,
            subject: '【系統通知】請驗證您的電子郵件（補發）',
            html: `
                <h2>歡迎註冊 VR 訓練系統！</h2>
                <p>請點擊下方連結以開通您的帳號：</p>
                <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">點我驗證信箱</a>
                <p style="margin-top: 20px; font-size: 12px; color: #666; word-break: break-all;">如果上方的按鈕無法點擊，請複製以下網址並貼上至瀏覽器：<br>${verificationUrl}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`已重新發送驗證信至：${email}`);
        res.json({ success: true, message: "驗證信已重新發送！" });

    } catch (error) {
        console.error("重新發送驗證信錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器內部錯誤" });
    }
};


// =========================================
// 儲存錯題本
// =========================================
const saveMistakes = async (req, res) => {
    const { userId, mistakes } = req.body;
    try {
        const mistakesJson = JSON.stringify(mistakes || []);
        await db.query('UPDATE users SET mistakes = ? WHERE id = ?', [mistakesJson, userId]);
        res.json({ success: true, message: '錯題本已更新' });
    } catch (error) {
        console.error('儲存錯題本錯誤:', error);
        res.status(500).json({ success: false, message: '儲存錯題本失敗' });
    }
};


// =========================================
// 接收來自 Unity 的自訂 POST 資料 (範例)
// =========================================
const handleUnityData = async (req, res) => {
    const { userId, duration, blocks } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: '缺少使用者 ID' });
    }

    try {
        console.log('✅ 收到來自 Unity 的資料，交由後端重新評分：', req.body);

        // 1. 從 user_answers 抓取該用戶最新的作答紀錄
        const [answers] = await db.query(
            `SELECT question_id, is_correct 
             FROM user_answers 
             WHERE user_id = ? 
             ORDER BY answered_at DESC 
             LIMIT 100`, 
            [userId]
        );

        // 將最新答題結果轉為 Map { 1: true, 2: false ... }
        const correctMap = {};
        answers.forEach(a => {
            if (correctMap[a.question_id] === undefined) {
                correctMap[a.question_id] = a.is_correct === 1;
            }
        });

        // 2. 根據評分邏輯計算五大指標分數
        const calc_physical = (correctMap[1] ? 60 : 0) + (correctMap[2] ? 40 : 0);
        const calc_social = (correctMap[3] ? 60 : 0) + (correctMap[4] ? 40 : 0);
        const calc_server = (correctMap[5] ? 30 : 0) + (correctMap[7] ? 30 : 0) + (correctMap[10] ? 40 : 0);
        const calc_device = (correctMap[6] ? 50 : 0) + (correctMap[9] ? 50 : 0);
        const calc_legal = (correctMap[8] ? 70 : 0) + (correctMap[9] ? 30 : 0);

        // 3. 計算總分 (五項平均，四捨五入)
        const totalScore = Math.round((calc_physical + calc_social + calc_server + calc_device + calc_legal) / 5);

        // 4. 寫入學習成果分析所使用的資料表 (vr_training_records)
        const sql = `INSERT INTO vr_training_records 
                     (user_id, score_physical, score_social, score_server, score_device, score_legal, total_score, duration_hours, blocks_count) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                     
        await db.query(sql, [userId, calc_physical, calc_social, calc_server, calc_device, calc_legal, totalScore, duration || 0, blocks || 0]);

        res.status(200).json({ 
            success: true, 
            message: 'VR 訓練資料已成功儲存並在後端完成評分計算！',
            totalScore: totalScore 
        });
    } catch (error) {
        console.error('處理 Unity 資料時發生錯誤:', error);
        res.status(500).json({ success: false, message: '伺服器內部錯誤' });
    }
};

module.exports = {
    checkVerificationStatus,
    resendVerifyEmail,
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
    saveVRStats ,
    changePassword,
    deleteAccount ,
    saveUnityAnswer  ,
    // Web → Unity 登入
    createVRTicket,
    exchangeVRTicket,
    saveMistakes,
    handleUnityData
};
