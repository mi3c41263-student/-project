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
// 正式版請把帳密放在 .env / 系統環境變數，不要寫死在程式碼。
// MAIL_USER=your@gmail.com
// MAIL_APP_PASSWORD=your_google_app_password
// =========================================
const mailUser = 'mi3c41263@gmail.com';
const mailAppPassword = 'rwfiixewcpgzmzdn';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: mailUser,
        pass: mailAppPassword
    }
});

if (mailUser && mailAppPassword) {
    transporter.verify(function(error) {
        if (error) {
            console.log("寄信伺服器連線失敗: ", error);
        } else {
            console.log("寄信伺服器連線成功! 可以發信了。");
        }
    });
} else {
    console.warn("⚠️ 尚未設定 MAIL_USER / MAIL_APP_PASSWORD；需要寄信的功能會失敗，VR/LLM 評分功能不受影響。");
}
// --- 驗證規則 ---
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// ============================================================
// VR 稽核 15 題：後端固定評分規則（唯一分數來源）
//
// 設計原則：
// 1. Unity 只送 questionCode + selectedOption。
// 2. saveUnityAnswer 由 questions.correct_option 判斷正誤並寫入 user_answers。
// 3. 最終分數一律由這個 Node.js 後端依「本次 session_id」重新計算。
// 4. LLM 只能撰寫文字總評 / 建議，不能更改任何數字分數。
// ============================================================
const AUDIT_CATEGORY = Object.freeze({
    IDENTITY: "身分憑證與門禁管理",
    DEVICE: "設備與儲存媒體防護",
    DOCUMENT: "文件與敏感資訊保護",
    ENVIRONMENT: "辦公環境安全管理",
    SERVER: "機房與資產管理"
});

const AUDIT_RULES = Object.freeze({
    S1_BADGE:               { category: AUDIT_CATEGORY.IDENTITY,    radarPoint: 5, isoClause: "A.6 / A.7 身分憑證與門禁管理" },
    S1_EXPIRED_PASS:        { category: AUDIT_CATEGORY.IDENTITY,    radarPoint: 5, isoClause: "A.7 實體進出與門禁管理" },
    S1_USB:                 { category: AUDIT_CATEGORY.DEVICE,      radarPoint: 5, isoClause: "A.7.10 儲存媒體" },
    S1_MANAGEMENT_REVIEW:   { category: AUDIT_CATEGORY.DOCUMENT,    radarPoint: 2, isoClause: "文件與敏感資訊保護" },
    S1_EMPLOYEE_EVALUATION: { category: AUDIT_CATEGORY.DOCUMENT,    radarPoint: 1, isoClause: "人員資料與文件保護" },

    S2_TABLET:              { category: AUDIT_CATEGORY.DEVICE,      radarPoint: 5, isoClause: "A.7.7 桌面淨空及螢幕淨空" },
    S2_VISITOR_CARD:        { category: AUDIT_CATEGORY.DOCUMENT,    radarPoint: 1, isoClause: "文件與個人資訊保護" },
    S2_COFFEE:              { category: AUDIT_CATEGORY.ENVIRONMENT, radarPoint: 2, isoClause: "A.7.5 防範實體與環境威脅" },
    S2_INTERNAL_DOCUMENT:   { category: AUDIT_CATEGORY.DOCUMENT,    radarPoint: 1, isoClause: "A.7.7 桌面淨空及螢幕淨空" },
    S2_EMPLOYMENT_CONTRACT: { category: AUDIT_CATEGORY.DOCUMENT,    radarPoint: 4, isoClause: "A.6 人員控制 / 文件保護" },

    S3_PASSWORD_NOTE:       { category: AUDIT_CATEGORY.DOCUMENT,    radarPoint: 1, isoClause: "A.5.17 鑑別資訊" },
    S3_EWASTE:              { category: AUDIT_CATEGORY.SERVER,      radarPoint: 5, isoClause: "A.7.5 / 資產管理" },
    S3_CAKE:                { category: AUDIT_CATEGORY.ENVIRONMENT, radarPoint: 2, isoClause: "A.7.5 防範實體與環境威脅" },
    S3_SECURITY_POSTER:     { category: AUDIT_CATEGORY.ENVIRONMENT, radarPoint: 6, isoClause: "資訊安全認知與辦公環境安全" },
    S3_MAINTENANCE_RECORD:  { category: AUDIT_CATEGORY.SERVER,      radarPoint: 5, isoClause: "機房維護與資產管理" }
});

const FORMAL_QUESTION_CODES = Object.freeze(Object.keys(AUDIT_RULES));
const TOTAL_QUESTION_COUNT = FORMAL_QUESTION_CODES.length; // 15

// 五項雷達都是 0~100；綜合分數使用專題目前採用的 30/30/40/20/30 權重。
const RADAR_WEIGHT = Object.freeze({
    [AUDIT_CATEGORY.IDENTITY]: 30,
    [AUDIT_CATEGORY.DEVICE]: 30,
    [AUDIT_CATEGORY.DOCUMENT]: 40,
    [AUDIT_CATEGORY.ENVIRONMENT]: 20,
    [AUDIT_CATEGORY.SERVER]: 30
});

const TOTAL_RADAR_WEIGHT = Object.values(RADAR_WEIGHT).reduce((sum, value) => sum + value, 0); // 150

function clampScore(value) {
    const n = Math.round(Number(value) || 0);
    return Math.max(0, Math.min(100, n));
}

function getAuditLevel(totalScore) {
    if (totalScore >= 90) return "優秀";
    if (totalScore >= 80) return "良好";
    if (totalScore >= 70) return "尚可";
    if (totalScore >= 60) return "待加強";
    return "需重新訓練";
}

function getLowestRadarCategory(radar) {
    const entries = Object.entries(radar || {});
    if (entries.length === 0) return "整體稽核能力";
    entries.sort((a, b) => Number(a[1]) - Number(b[1]));
    return entries[0][0];
}

function buildAuditScore(rows, userId, sessionId, trainingHours = 0) {
    const byCode = new Map();

    for (const row of rows || []) {
        const code = String(row.questionCode || row.question_code || "").trim();
        if (code && AUDIT_RULES[code]) {
            byCode.set(code, row);
        }
    }

    const raw = {
        [AUDIT_CATEGORY.IDENTITY]: 0,
        [AUDIT_CATEGORY.DEVICE]: 0,
        [AUDIT_CATEGORY.DOCUMENT]: 0,
        [AUDIT_CATEGORY.ENVIRONMENT]: 0,
        [AUDIT_CATEGORY.SERVER]: 0
    };

    let answeredCount = 0;
    let correctCount = 0;

    const items = FORMAL_QUESTION_CODES.map(code => {
        const rule = AUDIT_RULES[code];
        const row = byCode.get(code) || {};

        const userAnswer = row.userAnswer == null ? "" : String(row.userAnswer).trim().toUpperCase();
        const correctAnswer = row.correctAnswer == null ? "" : String(row.correctAnswer).trim().toUpperCase();
        const answered = userAnswer.length > 0;
        const isCorrect = answered && (row.isCorrect === true || Number(row.isCorrect) === 1);

        if (answered) answeredCount += 1;
        if (isCorrect) {
            correctCount += 1;
            raw[rule.category] += Number(rule.radarPoint) || 0;
        }

        const earnedRadarPoint = isCorrect ? Number(rule.radarPoint) || 0 : 0;
        const databaseScore = isCorrect ? Number(row.databaseScore ?? row.score ?? 0) || 0 : 0;

        return {
            questionId: code,
            dbQuestionId: Number(row.dbQuestionId ?? row.questionId ?? 0) || 0,
            stageNo: Number(row.stageNo || 0) || 0,
            interactionType: String(row.interactionType || ""),
            questionName: String(row.questionName || code),
            userAnswer,
            correctAnswer,
            score: earnedRadarPoint,
            databaseScore,
            radarPoint: Number(rule.radarPoint) || 0,
            isoClause: rule.isoClause,
            abilityCategory: rule.category,
            isCorrect,
            feedback: answered
                ? (isCorrect ? "判斷正確。" : "判斷錯誤，建議重新檢視此項控制要求。")
                : "尚未完成此項稽核。"
        };
    });

    const radar = {
        [AUDIT_CATEGORY.IDENTITY]: clampScore(raw[AUDIT_CATEGORY.IDENTITY] * 10),
        [AUDIT_CATEGORY.DEVICE]: clampScore(raw[AUDIT_CATEGORY.DEVICE] * 10),
        [AUDIT_CATEGORY.DOCUMENT]: clampScore(raw[AUDIT_CATEGORY.DOCUMENT] * 10),
        [AUDIT_CATEGORY.ENVIRONMENT]: clampScore(raw[AUDIT_CATEGORY.ENVIRONMENT] * 10),
        [AUDIT_CATEGORY.SERVER]: clampScore(raw[AUDIT_CATEGORY.SERVER] * 10)
    };

    const weightedTotal = Object.entries(RADAR_WEIGHT).reduce(
        (sum, [category, weight]) => sum + Number(radar[category] || 0) * Number(weight),
        0
    );

    const totalScore = clampScore(weightedTotal / TOTAL_RADAR_WEIGHT);
    const accuracyRate = Math.round((correctCount / TOTAL_QUESTION_COUNT) * 100);
    const lowestCategory = getLowestRadarCategory(radar);

    return {
        userId: Number(userId) || 0,
        sessionId: Number(sessionId) || 0,
        totalScore,
        radarTotalScore: totalScore,
        level: getAuditLevel(totalScore),
        answeredCount,
        correctCount,
        accuracyRate,
        kpi: {
            auditScore: totalScore,
            trainingHours: Number(trainingHours) || 0,
            identifiedRisks: correctCount,
            accuracyRate
        },
        radar,
        radarScores: [
            radar[AUDIT_CATEGORY.IDENTITY],
            radar[AUDIT_CATEGORY.DEVICE],
            radar[AUDIT_CATEGORY.DOCUMENT],
            radar[AUDIT_CATEGORY.ENVIRONMENT],
            radar[AUDIT_CATEGORY.SERVER]
        ],
        items,
        summary: `本次稽核總分 ${totalScore} 分；目前較需加強「${lowestCategory}」。`,
        suggestion: `建議優先複習「${lowestCategory}」相關題目的判斷依據，再重新進行情境稽核。`
    };
}

async function loadSessionAuditRows(userId, sessionId, executor = db) {
    const placeholders = FORMAL_QUESTION_CODES.map(() => "?").join(", ");
    const orderPlaceholders = FORMAL_QUESTION_CODES.map(() => "?").join(", ");

    const [rows] = await executor.query(
        `
        SELECT
            q.id AS dbQuestionId,
            q.question_code AS questionCode,
            q.stage_no AS stageNo,
            q.interaction_type AS interactionType,
            q.question_text AS questionName,
            q.correct_option AS correctAnswer,
            q.score AS maxDatabaseScore,
            ua.selected_option AS userAnswer,
            ua.is_correct AS isCorrect,
            ua.score AS databaseScore,
            ua.answered_at AS answeredAt
        FROM questions q
        LEFT JOIN (
            SELECT ua1.*
            FROM user_answers ua1
            INNER JOIN (
                SELECT question_id, MAX(id) AS latestAnswerId
                FROM user_answers
                WHERE user_id = ? AND session_id = ?
                GROUP BY question_id
            ) latest
                ON latest.latestAnswerId = ua1.id
        ) ua
            ON ua.question_id = q.id
        WHERE q.question_code IN (${placeholders})
        ORDER BY FIELD(q.question_code, ${orderPlaceholders})
        `,
        [
            userId,
            sessionId,
            ...FORMAL_QUESTION_CODES,
            ...FORMAL_QUESTION_CODES
        ]
    );

    return rows;
}

async function verifySessionOwnership(userId, sessionId, executor = db, forUpdate = false) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const [sessions] = await executor.query(
        `SELECT id, user_id, started_at, completed_at, status
         FROM training_sessions
         WHERE id = ? AND user_id = ?
         LIMIT 1${lock}`,
        [sessionId, userId]
    );
    return sessions.length > 0 ? sessions[0] : null;
}

// ============================================================
// AI 總評 / 學習建議持久化
//
// 為了不影響既有 vr_training_records 結構，
// AI 文字回饋獨立存放於 vr_ai_feedback。
// 第一次使用時會自動建立資料表。
// ============================================================
async function ensureAiFeedbackTable(executor = db) {
    await executor.query(
        `
        CREATE TABLE IF NOT EXISTS vr_ai_feedback (
            id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            session_id INT NOT NULL,
            summary TEXT NOT NULL,
            suggestion TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_vr_ai_feedback_user_session (user_id, session_id),
            KEY idx_vr_ai_feedback_user_updated (user_id, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `
    );
}

async function loadLatestAiFeedback(userId, executor = db, sessionId = 0) {
    await ensureAiFeedbackTable(executor);

    const parsedSessionId = Number(sessionId) || 0;

    const whereSession = parsedSessionId > 0
        ? " AND session_id = ?"
        : "";

    const params = parsedSessionId > 0
        ? [userId, parsedSessionId]
        : [userId];

    const [rows] = await executor.query(
        `
        SELECT
            user_id AS userId,
            session_id AS sessionId,
            summary,
            suggestion,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM vr_ai_feedback
        WHERE user_id = ?${whereSession}
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
        `,
        params
    );

    return rows.length > 0 ? rows[0] : null;
}

// ============================================================
// Unity / OpenAIManager 儲存 AI 總評
//
// POST /api/unity/save-ai-feedback
// Body:
// {
//   userId,
//   sessionId,
//   summary,
//   suggestion
// }
//
// 同一個 userId + sessionId 重複呼叫時會更新，不會新增重複資料。
// ============================================================
const saveUnityAIFeedback = async (req, res) => {
    const userId = Number(req.body.userId ?? req.body.user_id);
    const sessionId = Number(req.body.sessionId ?? req.body.session_id);
    const summary = String(req.body.summary ?? "").trim();
    const suggestion = String(req.body.suggestion ?? "").trim();

    if (!Number.isInteger(userId) || userId <= 0 ||
        !Number.isInteger(sessionId) || sessionId <= 0) {
        return res.status(400).json({
            success: false,
            message: "userId 或 sessionId 不正確"
        });
    }

    if (!summary && !suggestion) {
        return res.status(400).json({
            success: false,
            message: "summary 與 suggestion 不可同時為空"
        });
    }

    // 防止異常超長內容寫入。
    const safeSummary = summary.slice(0, 2000);
    const safeSuggestion = suggestion.slice(0, 4000);

    try {
        const session = await verifySessionOwnership(userId, sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "找不到屬於目前使用者的 VR Session"
            });
        }

        await ensureAiFeedbackTable();

        await db.query(
            `
            INSERT INTO vr_ai_feedback
                (user_id, session_id, summary, suggestion)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                summary = VALUES(summary),
                suggestion = VALUES(suggestion),
                updated_at = CURRENT_TIMESTAMP
            `,
            [
                userId,
                sessionId,
                safeSummary,
                safeSuggestion
            ]
        );

        console.log(
            `🤖 AI 回饋已儲存：userId=${userId}, sessionId=${sessionId}`
        );

        return res.status(200).json({
            success: true,
            message: "AI 總評與學習建議已儲存",
            data: {
                userId,
                sessionId,
                summary: safeSummary,
                suggestion: safeSuggestion
            }
        });
    } catch (error) {
        console.error("❌ saveUnityAIFeedback 發生錯誤：", error);
        return res.status(500).json({
            success: false,
            message: "儲存 AI 回饋失敗"
        });
    }
};

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
            from: mailUser,
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
        // Web 儀表板只讀「已完成訓練」留下的 vr_training_records，
        // 不再把不同 session 的 user_answers 混在一起重新算一次。
        const [latestRows] = await db.query(
            `SELECT
                score_physical,
                score_social,
                score_server,
                score_device,
                score_legal,
                total_score,
                duration_hours,
                blocks_count,
                created_at
             FROM vr_training_records
             WHERE user_id = ?
             ORDER BY id DESC
             LIMIT 1`,
            [userId]
        );

        const latest = latestRows.length > 0 ? latestRows[0] : null;

        // 最新一局完成的 VR Session。
        // AI 回饋必須綁定這一局，避免新分數搭到上一局的舊評語。
        const [latestSessionRows] = await db.query(
            `SELECT id
             FROM training_sessions
             WHERE user_id = ?
               AND UPPER(COALESCE(status, '')) = 'COMPLETED'
             ORDER BY COALESCE(completed_at, started_at) DESC, id DESC
             LIMIT 1`,
            [userId]
        );

        const latestCompletedSessionId =
            latestSessionRows.length > 0
                ? Number(latestSessionRows[0].id) || 0
                : 0;

        const [totals] = await db.query(
            `SELECT COALESCE(SUM(duration_hours), 0) AS totalHours
             FROM vr_training_records
             WHERE user_id = ?`,
            [userId]
        );

        const [historyScores] = await db.query(
            `SELECT total_score
             FROM vr_training_records
             WHERE user_id = ?
             ORDER BY id DESC
             LIMIT 50`,
            [userId]
        );

        const chronologicalScores = [...historyScores].reverse();

        // 資料庫欄位沿用既有命名，但 Web 雷達順序固定為：
        // 1 身分門禁、2 設備媒體、3 文件資訊、4 辦公環境、5 機房資產。
        const radarScores = latest
            ? [
                Number(latest.score_physical) || 0,
                Number(latest.score_device) || 0,
                Number(latest.score_legal) || 0,
                Number(latest.score_social) || 0,
                Number(latest.score_server) || 0
              ]
            : [0, 0, 0, 0, 0];

        let formattedDate = null;
        if (latest && latest.created_at) {
            const d = new Date(latest.created_at);
            formattedDate =
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
                `${String(d.getDate()).padStart(2, '0')} ` +
                `${String(d.getHours()).padStart(2, '0')}:` +
                `${String(d.getMinutes()).padStart(2, '0')}`;
        }

        const placeholders = FORMAL_QUESTION_CODES.map(() => "?").join(", ");
        const [answerRows] = await db.query(
            `SELECT
                q.question_code AS questionCode,
                ua.is_correct AS isCorrect
             FROM user_answers ua
             INNER JOIN questions q ON ua.question_id = q.id
             INNER JOIN (
                SELECT question_id, MAX(id) AS latestAnswerId
                FROM user_answers
                WHERE user_id = ?
                GROUP BY question_id
             ) latest ON latest.latestAnswerId = ua.id
             WHERE ua.user_id = ?
               AND q.question_code IN (${placeholders})`,
            [userId, userId, ...FORMAL_QUESTION_CODES]
        );

        const answers = {};
        for (const row of answerRows) {
            answers[row.questionCode] =
                row.isCorrect === 1 ||
                row.isCorrect === true;
        }

        // =========================================
        // 讀取最近一次 LLM 產生的 AI 總評 / 建議
        //
        // 這段失敗時不影響原本成績頁，
        // 只會讓 AI 文字欄位暫時為 null。
        // =========================================
        let latestAiFeedback = null;

        try {
            latestAiFeedback = await loadLatestAiFeedback(userId, db, latestCompletedSessionId);
        } catch (aiFeedbackError) {
            console.warn(
                "⚠️ 讀取 AI 回饋失敗，原本成績資料仍會正常回傳：",
                aiFeedbackError.message
            );
        }

        const aiSummary =
            latestAiFeedback && latestAiFeedback.summary
                ? String(latestAiFeedback.summary)
                : null;

        const aiSuggestion =
            latestAiFeedback && latestAiFeedback.suggestion
                ? String(latestAiFeedback.suggestion)
                : null;

        const stats = {
            radarScores,
            totalScore: latest ? Number(latest.total_score) || 0 : 0,
            trainingHours:
                totals.length > 0
                    ? Number(totals[0].totalHours) || 0
                    : 0,
            blocks: latest ? Number(latest.blocks_count) || 0 : 0,
            trendLabels:
                chronologicalScores.map(
                    (_, index) => `第 ${index + 1} 次`
                ),
            trendData:
                chronologicalScores.map(
                    item => Number(item.total_score) || 0
                ),
            createdAt: formattedDate,
            answers: answers,

            // =====================================
            // 新增：網站 AI 評語欄位
            //
            // 同時保留幾個常見名稱，方便既有前端直接取用。
            // =====================================
            summary: aiSummary,
            suggestion: aiSuggestion,

            aiSummary: aiSummary,
            aiSuggestion: aiSuggestion,

            aiEvaluation: aiSummary,
            learningSuggestion: aiSuggestion,

            systemSuggestion: aiSuggestion,

            latestSessionId: latestCompletedSessionId,

            aiFeedbackSessionId:
                latestAiFeedback
                    ? Number(latestAiFeedback.sessionId) || 0
                    : 0,

            aiFeedbackUpdatedAt:
                latestAiFeedback
                    ? latestAiFeedback.updatedAt
                    : null
        };

        return res.json({
            success: true,
            message: "成功取得最新 VR 學習成果",
            data: stats
        });
    } catch (error) {
        console.error("取得使用者學習成果失敗：", error);
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
            from: mailUser,
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
    const userId = Number(req.body.userId);
    const sessionId = Number(req.body.sessionId || 0);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ success: false, message: "缺少或無效的使用者 ID" });
    }

    // 正式新版：有 sessionId 時，直接走同一個 completeUnitySession，
    // 確保 Unity、MySQL、Web、LLM 都使用同一套最終分數。
    if (Number.isInteger(sessionId) && sessionId > 0) {
        return completeUnitySession(req, res);
    }

    // 舊版相容：若舊前端還沒傳 sessionId，仍可用「每題最新答案」產生一次成績。
    // 新版 Unity 不應使用這個 fallback。
    try {
        const placeholders = FORMAL_QUESTION_CODES.map(() => "?").join(", ");
        const [rows] = await db.query(
            `SELECT
                q.id AS dbQuestionId,
                q.question_code AS questionCode,
                q.stage_no AS stageNo,
                q.interaction_type AS interactionType,
                q.question_text AS questionName,
                q.correct_option AS correctAnswer,
                ua.selected_option AS userAnswer,
                ua.is_correct AS isCorrect,
                ua.score AS databaseScore,
                ua.answered_at AS answeredAt
             FROM user_answers ua
             INNER JOIN questions q ON ua.question_id = q.id
             INNER JOIN (
                SELECT question_id, MAX(id) AS latestAnswerId
                FROM user_answers
                WHERE user_id = ?
                GROUP BY question_id
             ) latest ON latest.latestAnswerId = ua.id
             WHERE ua.user_id = ?
               AND q.question_code IN (${placeholders})`,
            [userId, userId, ...FORMAL_QUESTION_CODES]
        );

        const result = buildAuditScore(rows, userId, 0, Number(req.body.duration) || 0);

        await db.query(
            `INSERT INTO vr_training_records
             (user_id, score_physical, score_social, score_server, score_device, score_legal, total_score, duration_hours, blocks_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                result.radar[AUDIT_CATEGORY.IDENTITY],
                result.radar[AUDIT_CATEGORY.ENVIRONMENT],
                result.radar[AUDIT_CATEGORY.SERVER],
                result.radar[AUDIT_CATEGORY.DEVICE],
                result.radar[AUDIT_CATEGORY.DOCUMENT],
                result.totalScore,
                Number(req.body.duration) || 0,
                Number(req.body.blocks) || result.correctCount
            ]
        );

        return res.json({
            success: true,
            message: "VR 訓練數據已儲存（舊版無 session 相容模式）",
            data: result
        });
    } catch (error) {
        console.error("儲存 VR 數據發生錯誤:", error);
        return res.status(500).json({ success: false, message: "伺服器發生錯誤，無法儲存數據" });
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
// Unity 儲存 VR 支線作答
// 正式版：綁定 userId + sessionId
// =========================================
const saveUnityAnswer = async (req, res) => {

    try {

        // =====================================
        // 1. 接收 Unity 資料
        // =====================================
        const {
            userId,
            sessionId,
            questionCode,
            selectedOption
        } = req.body;


        const parsedUserId =
            Number(userId);

        const parsedSessionId =
            Number(sessionId);


        const code =
            String(
                questionCode || ""
            ).trim();


        const option =
            String(
                selectedOption || ""
            )
                .trim()
                .toUpperCase();


        console.log(
            "===================================="
        );

        console.log(
            "📥 Unity 作答資料"
        );

        console.log(
            "User ID：",
            parsedUserId
        );

        console.log(
            "Session ID：",
            parsedSessionId
        );

        console.log(
            "Question Code：",
            code
        );

        console.log(
            "Selected Option：",
            option
        );

        console.log(
            "===================================="
        );


        // =====================================
        // 2. 檢查 User ID
        // =====================================
        if (
            !Number.isInteger(parsedUserId) ||
            parsedUserId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "userId 不正確"
            });
        }


        // =====================================
        // 3. 檢查 Session ID
        // =====================================
        if (
            !Number.isInteger(parsedSessionId) ||
            parsedSessionId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "sessionId 不正確"
            });
        }


        // =====================================
        // 4. 檢查 questionCode
        // =====================================
        if (!code) {

            return res.status(400).json({
                success: false,
                message: "questionCode 不可為空"
            });
        }


        // =====================================
        // 5. 檢查答案格式
        // =====================================
        if (
            option !== "O" &&
            option !== "X" &&
            option !== "C"
        ) {

            return res.status(400).json({
                success: false,
                message: "selectedOption 只能是 O、X 或 C"
            });
        }


        // =====================================
        // 6. 確認使用者存在
        // =====================================
        const [users] =
            await db.query(
                `
                SELECT id
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [
                    parsedUserId
                ]
            );


        if (users.length === 0) {

            return res.status(404).json({
                success: false,
                message: "找不到使用者"
            });
        }


        // =====================================
        // 7. 確認 Session 存在
        // 而且真的屬於目前使用者
        // =====================================
        const [sessions] =
            await db.query(
                `
                SELECT
                    id,
                    user_id,
                    status

                FROM training_sessions

                WHERE id = ?
                  AND user_id = ?

                LIMIT 1
                `,
                [
                    parsedSessionId,
                    parsedUserId
                ]
            );


        if (sessions.length === 0) {

            return res.status(400).json({
                success: false,
                message:
                    "找不到屬於目前使用者的 VR Session"
            });
        }


        // =====================================
        // 8. 找 question_code
        // =====================================
        const [questions] =
            await db.query(
                `
                SELECT
                    id,
                    question_code,
                    stage_no,
                    interaction_type,
                    question_text,
                    correct_option,
                    score

                FROM questions

                WHERE question_code = ?

                LIMIT 1
                `,
                [
                    code
                ]
            );


        if (questions.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "找不到 questionCode：" +
                    code
            });
        }


        const question =
            questions[0];


        const questionId =
            Number(
                question.id
            );


        const stageNo =
            Number(
                question.stage_no
            );


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


        // =====================================
        // 9. 按題型檢查答案
        // =====================================

        // O/X 題
        if (
            interactionType === "OX" &&
            option !== "O" &&
            option !== "X"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "OX 題只能回答 O 或 X"
            });
        }


        // 文件 / 完成型
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
                    "DOCUMENT / COMPLETE 題必須使用 C"
            });
        }


        // =====================================
        // 10. 後端判定正確與否
        // =====================================
        const isCorrect =
            option ===
            correctOption;


        const earnedScore =
            isCorrect
                ? Number(
                    question.score || 0
                )
                : 0;


        // =====================================
        // 11. ★ 最重要
        // 寫入 user_answers 時
        // 一定包含 session_id
        // =====================================
        const [insertResult] =
            await db.query(
                `
                INSERT INTO user_answers
                (
                    user_id,
                    session_id,
                    question_id,
                    selected_option,
                    is_correct,
                    score
                )

                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    parsedUserId,
                    parsedSessionId,
                    questionId,
                    option,
                    isCorrect ? 1 : 0,
                    earnedScore
                ]
            );


        // =====================================
        // 12. 計算「本 Session」完成度
        // 不再把以前測試資料算進來
        // =====================================
        const [progressRows] =
            await db.query(
                `
                SELECT

                    COUNT(
                        DISTINCT CASE
                            WHEN q.stage_no = 1
                            THEN ua.question_id
                        END
                    ) AS stage1Completed,

                    COUNT(
                        DISTINCT CASE
                            WHEN q.stage_no = 2
                            THEN ua.question_id
                        END
                    ) AS stage2Completed,

                    COUNT(
                        DISTINCT CASE
                            WHEN q.stage_no = 3
                            THEN ua.question_id
                        END
                    ) AS stage3Completed,

                    COUNT(
                        DISTINCT ua.question_id
                    ) AS totalCompleted

                FROM user_answers ua

                INNER JOIN questions q
                    ON ua.question_id = q.id

                WHERE ua.user_id = ?
                  AND ua.session_id = ?
                  AND q.question_code IS NOT NULL
                  AND q.stage_no IN (1, 2, 3)
                `,
                [
                    parsedUserId,
                    parsedSessionId
                ]
            );


        const progress =
            progressRows[0];


        const stage1Completed =
            Number(
                progress.stage1Completed || 0
            );


        const stage2Completed =
            Number(
                progress.stage2Completed || 0
            );


        const stage3Completed =
            Number(
                progress.stage3Completed || 0
            );


        const totalCompleted =
            Number(
                progress.totalCompleted || 0
            );


        let currentStageCompleted =
            0;


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


        console.log(
            "===================================="
        );

        console.log(
            "✅ Unity 作答已寫入 MySQL"
        );

        console.log(
            "Answer ID：",
            insertResult.insertId
        );

        console.log(
            "User ID：",
            parsedUserId
        );

        console.log(
            "Session ID：",
            parsedSessionId
        );

        console.log(
            "Question：",
            code
        );

        console.log(
            "Answer：",
            option
        );

        console.log(
            "Correct：",
            isCorrect
        );

        console.log(
            "Score：",
            earnedScore
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
            `總進度：${totalCompleted}/15`
        );

        console.log(
            "===================================="
        );


        // =====================================
        // 自動完成 Session 機制：若 15 題皆作答，則自動結算寫入
        // =====================================
        if (totalCompleted === 15) {
            try {
                const connection = await db.getConnection();
                const sessionRows = await connection.query(`SELECT status FROM training_sessions WHERE id = ? AND user_id = ?`, [parsedSessionId, parsedUserId]);
                const currentSession = sessionRows[0][0];
                const alreadyCompleted = String(currentSession?.status || "").toUpperCase() === "COMPLETED";

                if (!alreadyCompleted) {
                    const rows = await loadSessionAuditRows(parsedUserId, parsedSessionId, connection);
                    // 這裡 duration 預設帶 0，若 Unity 無法呼叫 /complete-session 的話至少能結算分數
                    const finalResult = buildAuditScore(rows, parsedUserId, parsedSessionId, 0);
                    
                    await connection.query(
                        `INSERT INTO vr_training_records
                         (user_id, score_physical, score_social, score_server, score_device, score_legal, total_score, duration_hours, blocks_count, session_id)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            parsedUserId,
                            finalResult.radar[AUDIT_CATEGORY.IDENTITY],
                            finalResult.radar[AUDIT_CATEGORY.ENVIRONMENT],
                            finalResult.radar[AUDIT_CATEGORY.SERVER],
                            finalResult.radar[AUDIT_CATEGORY.DEVICE],
                            finalResult.radar[AUDIT_CATEGORY.DOCUMENT],
                            finalResult.totalScore,
                            0,
                            finalResult.correctCount,
                            parsedSessionId
                        ]
                    );

                    await connection.query(
                        `UPDATE training_sessions
                         SET status = 'COMPLETED',
                             completed_at = COALESCE(completed_at, NOW())
                         WHERE id = ? AND user_id = ?`,
                        [parsedSessionId, parsedUserId]
                    );
                    console.log("✅ 已自動完成本局 VR 訓練並寫入歷史紀錄！(進度 15/15)");
                }
                connection.release();
            } catch (autoErr) {
                console.error("自動完成 VR Session 失敗:", autoErr);
            }
        }

        // =====================================
        // 13. 回傳 Unity
        // =====================================
        return res.status(200).json({

            success: true,

            message:
                "Unity 作答已成功儲存",

            data: {

                answerId:
                    insertResult.insertId,

                userId:
                    parsedUserId,

                // ★ 回傳 Session 給 Unity Debug
                sessionId:
                    parsedSessionId,

                questionId:
                    questionId,

                questionCode:
                    question.question_code,

                stageNo:
                    stageNo,

                interactionType:
                    question.interaction_type,

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

    }
    catch (error) {

        console.error(
            "❌ saveUnityAnswer 發生錯誤：",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "儲存 Unity 作答失敗"
        });
    }
};

// ============================================================
// Unity / LLM：取得「本次 Session」的權威評分結果（不寫入歷史）
// GET /api/unity/session-result?userId=...&sessionId=...
// ============================================================
const getUnitySessionResult = async (req, res) => {
    const userId = Number(req.query.userId ?? req.body?.userId);
    const sessionId = Number(req.query.sessionId ?? req.body?.sessionId);

    if (!Number.isInteger(userId) || userId <= 0 ||
        !Number.isInteger(sessionId) || sessionId <= 0) {
        return res.status(400).json({
            success: false,
            message: "userId 或 sessionId 不正確"
        });
    }

    try {
        const session = await verifySessionOwnership(userId, sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "找不到屬於目前使用者的 VR Session"
            });
        }

        const rows = await loadSessionAuditRows(userId, sessionId);
        const result = buildAuditScore(rows, userId, sessionId, 0);

        return res.json({
            success: true,
            message: "成功取得本次 VR Session 評分",
            data: result
        });
    } catch (error) {
        console.error("❌ getUnitySessionResult 發生錯誤：", error);
        return res.status(500).json({ success: false, message: "無法取得本次評分" });
    }
};

// ============================================================
// Unity 最終完成訓練：
// POST /api/unity/complete-session
// Body: { userId, sessionId, duration, blocks }
//
// 此 API 是最終分數唯一入口：
// - 只讀本次 session_id 的 15 題最新答案
// - 後端固定公式計算雷達與總分
// - 寫入 vr_training_records
// - 將 training_sessions 標記 COMPLETED
// - 重複呼叫同一 session 不會重複新增歷史紀錄
// ============================================================
const completeUnitySession = async (req, res) => {
    const userId = Number(req.body.userId);
    const sessionId = Number(req.body.sessionId);
    const duration = Number(req.body.duration) || 0;
    const requestedBlocks = Number(req.body.blocks) || 0;

    if (!Number.isInteger(userId) || userId <= 0 ||
        !Number.isInteger(sessionId) || sessionId <= 0) {
        return res.status(400).json({
            success: false,
            message: "userId 或 sessionId 不正確"
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const session = await verifySessionOwnership(userId, sessionId, connection, true);
        if (!session) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "找不到屬於目前使用者的 VR Session"
            });
        }

        const rows = await loadSessionAuditRows(userId, sessionId, connection);
        const result = buildAuditScore(rows, userId, sessionId, duration);



        let persisted = false;
        const alreadyCompleted = String(session.status || "").toUpperCase() === "COMPLETED";

        if (!alreadyCompleted) {
            await connection.query(
                `INSERT INTO vr_training_records
                 (user_id, score_physical, score_social, score_server, score_device, score_legal, total_score, duration_hours, blocks_count, session_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    result.radar[AUDIT_CATEGORY.IDENTITY],
                    result.radar[AUDIT_CATEGORY.ENVIRONMENT],
                    result.radar[AUDIT_CATEGORY.SERVER],
                    result.radar[AUDIT_CATEGORY.DEVICE],
                    result.radar[AUDIT_CATEGORY.DOCUMENT],
                    result.totalScore,
                    duration,
                    requestedBlocks > 0 ? requestedBlocks : result.correctCount,
                    sessionId
                ]
            );

            await connection.query(
                `UPDATE training_sessions
                 SET status = 'COMPLETED',
                     completed_at = COALESCE(completed_at, NOW())
                 WHERE id = ? AND user_id = ?`,
                [sessionId, userId]
            );

            persisted = true;
        }

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: persisted
                ? "本次 VR 訓練已完成並寫入學習紀錄"
                : "本次 VR 訓練先前已完成，回傳既有 Session 的評分結果",
            finalized: true,
            persisted,
            data: result
        });
    } catch (error) {
        try { await connection.rollback(); } catch (_) {}
        console.error("❌ completeUnitySession 發生錯誤：", error);
        return res.status(500).json({
            success: false,
            message: "完成 VR 訓練失敗"
        });
    } finally {
        connection.release();
    }
};

// ============================================================
// 相容舊版 / 除錯：取得本次 Session 已作答資料
// GET /api/unity/session-answers?userId=...&sessionId=...
// ============================================================
const getUnitySessionAnswers = async (req, res) => {
    const userId = Number(req.query.userId);
    const sessionId = Number(req.query.sessionId);

    if (!Number.isInteger(userId) || userId <= 0 ||
        !Number.isInteger(sessionId) || sessionId <= 0) {
        return res.status(400).json({ success: false, message: "userId 或 sessionId 不正確" });
    }

    try {
        const session = await verifySessionOwnership(userId, sessionId);
        if (!session) {
            return res.status(404).json({ success: false, message: "找不到本次 VR 訓練 Session" });
        }

        const allRows = await loadSessionAuditRows(userId, sessionId);
        const answers = allRows.filter(row => row.userAnswer != null && String(row.userAnswer).trim() !== "");
        const correctCount = answers.filter(row => row.isCorrect === true || Number(row.isCorrect) === 1).length;

        return res.json({
            success: true,
            userId,
            sessionId,
            answeredCount: answers.length,
            correctCount,
            accuracyRate: TOTAL_QUESTION_COUNT > 0 ? Math.round((correctCount / TOTAL_QUESTION_COUNT) * 100) : 0,
            answers
        });
    } catch (error) {
        console.error("❌ getUnitySessionAnswers 發生錯誤：", error);
        return res.status(500).json({ success: false, message: "無法取得本次作答資料" });
    }
};

// =========================================
// 產生 VR 6 碼登入代碼
//
// 可使用：
// 0~9
// @
// #
// =========================================
function generateVRCode(length = 6) {

    const chars = "0123456789@#";

    let code = "";

    for (let i = 0; i < length; i++) {

        const randomIndex =
            crypto.randomInt(
                0,
                chars.length
            );

        code += chars[randomIndex];
    }

    return code;
}
// =========================================
// Web 產生 VR 6 位數一次性登入代碼
// =========================================
const createVRTicket = async (req, res) => {

    const userId = Number(req.body.userId);

    if (
        !Number.isInteger(userId) ||
        userId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "缺少或無效的使用者 ID"
        });
    }

    try {

        // =====================================
        // 1. 確認使用者存在
        // =====================================
        const [users] = await db.query(
            `
            SELECT
                id,
                username,
                email
            FROM users
            WHERE id = ?
            `,
            [userId]
        );

        if (users.length === 0) {

            return res.status(404).json({
                success: false,
                message: "找不到此使用者"
            });
        }


        // =====================================
        // 2. 舊的未使用代碼直接作廢
        // =====================================
        await db.query(
            `
            UPDATE vr_login_tickets
            SET is_used = 1
            WHERE user_id = ?
              AND is_used = 0
            `,
            [userId]
        );


        // =====================================
        // 3. 產生 6 位數代碼
        // =====================================
        let ticket = null;

        for (let attempt = 0; attempt < 10; attempt++) {

            const candidate = generateVRCode();

            // 確認目前沒有另一個仍有效的相同代碼
            const [existing] = await db.query(
                `
                SELECT id
                FROM vr_login_tickets
                WHERE ticket = ?
                  AND is_used = 0
                  AND expires_at > NOW()
                LIMIT 1
                `,
                [candidate]
            );

            if (existing.length === 0) {

                ticket = candidate;

                break;
            }
        }


        if (!ticket) {

            throw new Error(
                "無法產生唯一 VR 登入代碼"
            );
        }


        // =====================================
        // 4. 5 分鐘後失效
        // =====================================
        const expiresAt =
            new Date(
                Date.now() +
                5 * 60 * 1000
            );


        // =====================================
        // 5. 寫入 MySQL
        // =====================================
        await db.query(
            `
            INSERT INTO vr_login_tickets
            (
                user_id,
                ticket,
                expires_at,
                is_used
            )
            VALUES (?, ?, ?, 0)
            `,
            [
                userId,
                ticket,
                expiresAt
            ]
        );


        console.log(
            `🔑 User=${userId} VR 登入代碼：${ticket}`
        );


        return res.json({

            success: true,

            message:
                "VR 登入代碼建立成功",

            ticket:
                ticket,

            expiresAt:
                expiresAt
        });


    } catch (error) {

        console.error(
            "建立 VR 登入代碼失敗：",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "無法建立 VR 登入代碼"
        });
    }
};
// =========================================
// 18. Unity 使用 Ticket 取得登入使用者
// =========================================
const exchangeVRTicket = async (req, res) => {
    console.log("====================================");
    console.log(" exchangeVRTicket 被呼叫了");
    console.log("Unity 傳來的 body：", req.body);
    console.log("Unity 傳來的 ticket：", req.body?.ticket);
    console.log("====================================");
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
// =========================================
// 建立本次 VR 訓練 Session
// =========================================
const [sessionResult] = await db.query(
    `
    INSERT INTO training_sessions
    (
        user_id,
        status
    )
    VALUES (?, 'IN_PROGRESS')
    `,
    [loginTicket.user_id]
);

const sessionId = sessionResult.insertId;

console.log(
    "✅ 建立 VR Session，Session ID：",
    sessionId
);
        return res.json({
            success: true,
            message: "Unity VR 登入成功",
            user: {
                id: loginTicket.user_id,
                username: loginTicket.username,
                email: loginTicket.email
            },
            sessionId: sessionId
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
            from: mailUser,
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
    // 舊 API 統一轉給正式評分流程，避免另一套分數公式繼續存在。
    return saveVRStats(req, res);
};



const getUserHistory = async (req, res) => {
    try {
        const userId = req.query.userId || req.body.userId;
        if (!userId) {
            return res.status(400).json({ success: false, message: '缺少 userId' });
        }

        // Fetch completed and incomplete sessions
        const [sessions] = await db.execute(`
            SELECT id, total_score as score, session_id, created_at 
            FROM vr_training_records 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);

        if (!sessions || sessions.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const results = [];
        for (const session of sessions) {
            const sid = session.session_id;
            const answers = {};
            
            if (sid) {
                const [answerRows] = await db.execute(`
                    SELECT q.question_code as questionCode, ua.is_correct as isCorrect 
                    FROM user_answers ua
                    JOIN questions q ON ua.question_id = q.id
                    WHERE ua.session_id = ?
                `, [sid]);
                
                for (const row of answerRows) {
                    answers[row.questionCode] = row.isCorrect === 1 || row.isCorrect === true;
                }
            }

            // format created_at
            const dt = new Date(session.created_at);
            const dateStr = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0') + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');

            results.push({
                id: session.id,
                score: session.score,
                createdAt: dateStr,
                answers: answers
            });
        }

        return res.json({ success: true, data: results });
    } catch (error) {
        console.error("getUserHistory error:", error);
        return res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
};

module.exports = {
    getUserHistory,
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
    saveUnityAnswer,
    getUnitySessionAnswers,
    getUnitySessionResult,
    completeUnitySession,
    saveUnityAIFeedback,
    // Web → Unity 登入
    createVRTicket,
    exchangeVRTicket,
    saveMistakes,
    handleUnityData
};
