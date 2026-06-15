const express = require('express');
const router = express.Router();

// 引入我們寫好的 Controller (廚師)
const authController = require('../controllers/authController');

// --- 原有的路徑 ---
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/stats', authController.getUserStats);

// --- 信箱驗證與密碼路徑 ---
router.get('/verify', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// --- 🌟 新增：個人檔案更新路徑 (包含圖片上傳中介軟體) ---
router.post('/update-profile', authController.upload.single('avatar'), authController.updateProfile);
// --- 🌟 新增：雙重認證 2FA 路徑 ---
router.get('/2fa/generate', authController.generate2FA);
router.post('/2fa/verify', authController.verify2FA);
router.post('/2fa/disable', authController.disable2FA);
// --- 登入時的 2FA 驗證 ---
router.post('/login/2fa', authController.verifyLogin2FA);
// --- 🎮 VR 數據上傳路徑 ---
router.post('/stats/save', authController.saveVRStats);
// --- 更改密碼路徑 ---
router.post('/change-password', authController.changePassword);
router.post('/delete-account', authController.deleteAccount);
module.exports = router;