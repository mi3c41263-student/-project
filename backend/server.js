const express = require('express');
const cors = require('cors');
const path = require('path'); 

const app = express();
app.use(cors()); 
app.use(express.json()); 

// 開放 uploads 資料夾對外作為靜態資源
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =========================================
// 路由 (Routes) 設定區
// =========================================
// 1. 原本的帳號密碼登入、註冊 Router
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes); 

// 🌟 2. 新增：指紋快捷登入 (WebAuthn) 專屬 Router
const passkeyRoutes = require('./routes/passkeyRoutes');
app.use('/api/passkey', passkeyRoutes); 

// --- 啟動伺服器 ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(` ISO 後端伺服器運作中：http://localhost:${PORT}`);
});