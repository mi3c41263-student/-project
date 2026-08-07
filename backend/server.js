const express = require('express');
const cors = require('cors');
const path = require('path'); 

const app = express();
app.use(cors()); 
app.use(express.json()); 

// 開放 uploads 資料夾對外作為靜態資源
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 開放 frontend 資料夾作為靜態資源，讓前端跟後端在同一個 Port 運作
app.use(express.static(path.join(__dirname, '../frontend')));

// =========================================
// 路由 (Routes) 設定區
// =========================================
// 1. 原本的帳號密碼登入、註冊 Router
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes); 
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Unity 已成功連接 Node.js API"
    });
});
// --- 啟動伺服器 ---
const PORT = 3000;
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
app.listen(PORT, "0.0.0.0",() => {
    console.log(` ISO 後端伺服器運作中：http://localhost:${PORT}`);
});