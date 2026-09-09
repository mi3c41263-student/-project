const express = require('express');
const router = express.Router();

// =========================================
// Controller
// =========================================
const authController = require('../controllers/authController');


// =========================================
// 帳號相關
// =========================================
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);


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
// VR 登入
// =========================================

// Web 建立一次性 VR Ticket
router.post('/vr/create-ticket', authController.createVRTicket);

// Unity 使用 Ticket 登入，成功後建立 training_sessions
router.post('/vr/exchange-ticket', authController.exchangeVRTicket);


// =========================================
// Unity VR 作答 / Session
// =========================================

// Unity 單題答案：寫入 user_answers
router.post('/unity/answers', authController.saveUnityAnswer);

// 取得「本次 Session」目前已作答資料
// GET /api/unity/session-answers?userId=64&sessionId=123
router.get('/unity/session-answers', authController.getUnitySessionAnswers);

// 取得「本次 Session」即時計分結果（不完成 Session、不新增歷史紀錄）
// GET /api/unity/session-result?userId=64&sessionId=123
router.get('/unity/session-result', authController.getUnitySessionResult);

// 正式完成本次 VR 訓練
// POST Body: { userId, sessionId, duration, blocks }
// 後端會固定計算雷達與總分、寫入 vr_training_records，並把 Session 標記 COMPLETED
router.post('/unity/complete-session', authController.completeUnitySession);

// 儲存本次 Session 的 LLM 總評 / 學習建議
// POST Body: { userId, sessionId, summary, suggestion }
router.post('/unity/save-ai-feedback', authController.saveUnityAIFeedback);


// =========================================
// 舊版相容 API
// =========================================

// 原本 VR 總成績 API
// 新版 authController 內部已統一導向正式 Session 評分流程
router.post('/stats/save', authController.saveVRStats);

// 儲存錯題本
router.post('/save-mistakes', authController.saveMistakes);

// Unity 自訂資料 API（保留原功能）
router.post('/unity/custom-data', authController.handleUnityData);


// =========================================
// 帳號管理
// =========================================
router.post('/change-password', authController.changePassword);
router.post('/delete-account', authController.deleteAccount);


// =========================================
// 匯出 Router
// =========================================
router.get('/vr-history', authController.getUserHistory);

module.exports = router;
