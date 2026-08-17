const express = require('express');
const router = express.Router();

// 引入我們寫好的 Controller
const authController = require('../controllers/authController');


// =========================================
// 帳號相關
// =========================================
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post(
    '/unity/answers',
    authController.saveUnityAnswer
);

// =========================================
// 學習成果 / 統計資料
// =========================================
router.get('/stats', authController.getUserStats);


// =========================================
// 信箱驗證與密碼
// =========================================
router.get('/verify', authController.verifyEmail);
router.get('/check-verify', authController.checkVerificationStatus);
router.post('/resend-verify', authController.resendVerifyEmail);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);


// =========================================
// 個人檔案
// =========================================
router.post(
    '/update-profile',
    authController.upload.single('avatar'),
    authController.updateProfile
);


// =========================================
// 雙重認證 2FA
// =========================================
router.get('/2fa/generate', authController.generate2FA);
router.post('/2fa/verify', authController.verify2FA);
router.post('/2fa/disable', authController.disable2FA);

// 登入時的 2FA 驗證
router.post('/login/2fa', authController.verifyLogin2FA);


// =========================================
// VR 訓練資料
// =========================================

// 原本 VR 總成績
router.post('/stats/save', authController.saveVRStats);

// Unity 單題答案
router.post('/unity/answers', authController.saveUnityAnswer);

// Web 建立一次性 VR Ticket
router.post('/vr/create-ticket', authController.createVRTicket);

// Unity 使用 Ticket 登入
router.post('/vr/exchange-ticket', authController.exchangeVRTicket);

// 儲存錯題本
router.post('/save-mistakes', authController.saveMistakes);

// 儲存錯題本
router.post('/save-mistakes', authController.saveMistakes);

// 新增的 Unity API (範例)
router.post('/unity/custom-data', authController.handleUnityData);

// =========================================
// 帳號管理
// =========================================
router.post('/change-password', authController.changePassword);
router.post('/delete-account', authController.deleteAccount);


// =========================================
// 匯出 Router
// =========================================
module.exports = router;