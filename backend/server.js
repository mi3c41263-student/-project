const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json()); 

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