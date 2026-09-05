const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db"); // 引入資料庫連線
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 開放 uploads 資料夾對外作為靜態資源
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 開放 frontend 資料夾作為靜態資源，讓前端跟後端在同一個 Port 運作
app.use(express.static(path.join(__dirname, "../frontend")));

// =========================================
// Unity / MySQL 測試 API
// =========================================

// Unity 測試連線用
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Unity 已成功連接 Node.js API"
    });
});

// MySQL 測試連線用
app.get("/api/db-test", async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT 1 AS test");

        res.status(200).json({
            success: true,
            message: "MySQL 連線成功",
            data: rows
        });
    } catch (error) {
        console.error("MySQL 測試失敗：", error);

        res.status(500).json({
            success: false,
            message: "MySQL 連線失敗",
            error: error.message
        });
    }
});

// Unity 測試 POST 用
app.post("/api/unity/test-record", (req, res) => {
    const record = req.body;

    console.log("收到 Unity 測試學習紀錄：");
    console.log(record);

    res.status(201).json({
        success: true,
        message: "Node.js 已收到 Unity 學習紀錄",
        receivedData: record
    });
});

// Unity LLM 評分結果上傳用：寫入 MySQL
app.post("/api/save-result", async (req, res) => {
    try {
        const result = req.body;

        console.log("收到 Unity LLM 評分結果：");
        console.log(result);

        const userId = result.userId || "";
        const userName = result.userName || "";
        const totalScore = result.totalScore || 0;
        const levelText = result.level || "";
        const summaryText = result.summary || "";
        const suggestionText = result.suggestion || "";
        const rawJson = JSON.stringify(result);

        const sql = `
            INSERT INTO audit_results
            (user_id, user_name, total_score, level_text, summary_text, suggestion_text, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [insertResult] = await db.execute(sql, [
            userId,
            userName,
            totalScore,
            levelText,
            summaryText,
            suggestionText,
            rawJson
        ]);

        res.status(200).json({
            success: true,
            message: "LLM 成績已寫入 MySQL",
            resultId: insertResult.insertId,
            resultUrl: "https://impulse-shifter-limes.ngrok-free.dev/main.html"
        });

    } catch (error) {
        console.error("寫入 MySQL 失敗：", error);

        res.status(500).json({
            success: false,
            message: "寫入 MySQL 失敗",
            error: error.message
        });
    }
});

// Web 前端讀取最新 LLM 成績用：從 MySQL 讀最新一筆
app.get("/api/latest-result", async (req, res) => {
    try {
        const sql = `
            SELECT *
            FROM audit_results
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const [rows] = await db.execute(sql);

        if (rows.length === 0) {
            return res.status(200).json({
                success: false,
                message: "目前沒有 LLM 成績資料"
            });
        }

        const latest = rows[0];

        try {
            const rawData = JSON.parse(latest.raw_json);
            return res.status(200).json(rawData);
        } catch (error) {
            return res.status(200).json({
                success: true,
                id: latest.id,
                userId: latest.user_id,
                userName: latest.user_name,
                totalScore: latest.total_score,
                level: latest.level_text,
                summary: latest.summary_text,
                suggestion: latest.suggestion_text,
                createdAt: latest.created_at
            });
        }

    } catch (error) {
        console.error("讀取 MySQL 最新成績失敗：", error);

        res.status(500).json({
            success: false,
            message: "讀取 MySQL 最新成績失敗",
            error: error.message
        });
    }
});

// =========================================
// 原本的帳號密碼登入、註冊 Router
// =========================================
const authRoutes = require("./routes/authRoutes");
app.use("/api", authRoutes);

// --- 啟動伺服器 ---
const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`ISO 後端伺服器運作中：http://localhost:${PORT}`);
});