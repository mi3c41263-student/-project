const express = require('express');
const router = express.Router();

// 引入我們剛剛寫好的資料庫連線池
const db = require('../db'); 

// =========================================
// POST /api/ncr : 接收前端傳來的新增稽核報告
// =========================================
router.post('/ncr', async (req, res) => {
    try {
        // 1. 拆解前端用 JSON 傳過來的包裹
        const { userId, category, clause, severity, observation, action } = req.body;

        // 2. 基本的安全檢查 (防呆)
        if (!userId || !observation || !action) {
            return res.status(400).json({ success: false, message: "欄位資料不完整" });
        }

        // 3. 準備寫入 MySQL 的 SQL 語法 (? 是為了防止 SQL Injection 駭客攻擊)
        const sql = "INSERT INTO ncr_reports (user_id, category, clause, severity, observation, action) VALUES (?, ?, ?, ?, ?, ?)";
        
        // 4. 執行寫入動作
        const [result] = await db.query(sql, [userId, category, clause, severity, observation, action]);

        // 5. 成功後回報給前端
        res.json({ success: true, message: "報告已成功存入資料庫！", reportId: result.insertId });

    } catch (error) {
        console.error("資料庫寫入錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器或資料庫發生錯誤" });
    }
});

// 記得要把這包功能「導出」，server.js 才能用它
module.exports = router;