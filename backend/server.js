const express = require('express');
const cors = require('cors');
const path = require('path'); // 🌟 新增 1：引入 Node.js 內建的 path 模組，用來處理檔案路徑

const app = express();
app.use(cors()); 
app.use(express.json()); 

// =========================================
// 🌟 新增 2：開放 uploads 資料夾對外作為靜態資源
// =========================================
// 當有人造訪 http://localhost:3000/uploads/... 時，就去伺服器端的 uploads 資料夾找檔案
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =========================================
// 引入並使用 Router (把 /api 下的請求都交給 authRoutes 處理)
// =========================================
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes); 

// --- 啟動伺服器 ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(` ISO 後端伺服器運作中：http://localhost:${PORT}`);
});