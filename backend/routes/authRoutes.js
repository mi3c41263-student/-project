const express = require('express');
const router = express.Router();

// =========================================
// Controller
// =========================================
const authController = require('../controllers/authController');


// =========================================
// 帳號相關
// =========================================
router.post(
    '/register',
    authController.registerUser
);

router.post(
    '/login',
    authController.loginUser
);


// =========================================
// 學習成果 / 統計資料
// =========================================
router.get(
    '/stats',
    authController.getUserStats
);


// =========================================
// 信箱驗證與密碼
// =========================================
router.get(
    '/verify',
    authController.verifyEmail
);

router.get(
    '/check-verify',
    authController.checkVerificationStatus
);

router.post(
    '/resend-verify',
    authController.resendVerifyEmail
);

router.post(
    '/forgot-password',
    authController.forgotPassword
);

router.post(
    '/reset-password',
    authController.resetPassword
);


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
router.get(
    '/2fa/generate',
    authController.generate2FA
);

router.post(
    '/2fa/verify',
    authController.verify2FA
);

router.post(
    '/2fa/disable',
    authController.disable2FA
);

// 登入時的 2FA 驗證
router.post(
    '/login/2fa',
    authController.verifyLogin2FA
);


// =========================================
// VR 登入
// =========================================

// Web 建立一次性 VR Ticket
router.post(
    '/vr/create-ticket',
    authController.createVRTicket
);

// Unity 使用 Ticket 登入
// 登入成功後後端會建立 training_sessions
router.post(
    '/vr/exchange-ticket',
    authController.exchangeVRTicket
);


// =========================================
// Unity VR 作答 / Session
// =========================================

// -----------------------------------------
// 1. Unity 單題作答
//
// Unity 傳入：
// {
//     userId: 64,
//     sessionId: 123,
//     questionCode: "S1_USB",
//     selectedOption: "X"
// }
//
// 後端負責：
// - 根據 questionCode 找 question_id
// - 判斷正確答案
// - 寫入 user_answers
// - 回傳本題結果與完成度
// -----------------------------------------
router.post(
    '/unity/answers',
    authController.saveUnityAnswer
);


// -----------------------------------------
// 2. 取得目前 Session 的作答紀錄
//
// GET:
// /api/unity/session-answers
//     ?userId=64
//     &sessionId=123
//
// 用途：
// OpenAIManager / Unity 需要讀取
// 「這一次 VR 訓練」的真實資料庫答案
// -----------------------------------------
router.get(
    '/unity/session-answers',
    authController.getUnitySessionAnswers
);


// -----------------------------------------
// 3. 取得目前 Session 即時成績
//
// GET:
// /api/unity/session-result
//     ?userId=64
//     &sessionId=123
//
// 只計算：
// - 五大雷達能力
// - totalScore
// - 正確題數
// - accuracyRate
//
// 不會：
// - 完成 Session
// - 新增正式歷史紀錄
// -----------------------------------------
router.get(
    '/unity/session-result',
    authController.getUnitySessionResult
);


// -----------------------------------------
// 4. 正式完成 VR 訓練
//
// Unity 最後按「查看成績」時呼叫
//
// POST:
// /api/unity/complete-session
//
// Body:
//
// {
//     userId: 64,
//     sessionId: 123,
//     duration: 2,
//     blocks: 12
// }
//
// 後端會：
// 1. 讀取該 Session 最新作答
// 2. 計算五大能力雷達
// 3. 計算 totalScore
// 4. 寫入 vr_training_records
// 5. training_sessions 改為 COMPLETED
// 6. 回傳正式成績給 Unity
//
// LLM 不負責修改數字分數，
// LLM 只負責 summary / suggestion。
// -----------------------------------------
router.post(
    '/unity/complete-session',
    authController.completeUnitySession
);


// =========================================
// 舊版相容 API
// =========================================

// -----------------------------------------
// 原本 VR 總成績 API
//
// 先保留，避免目前 Web 或 Unity
// 還有舊程式呼叫 /api/stats/save。
// -----------------------------------------
router.post(
    '/stats/save',
    authController.saveVRStats
);


// =========================================
// 錯題本
// =========================================
router.post(
    '/save-mistakes',
    authController.saveMistakes
);


// =========================================
// Unity 自訂資料
//
// 這是原本專案既有 API。
// 暫時保留，避免其他地方還有使用。
// =========================================
router.post(
    '/unity/custom-data',
    authController.handleUnityData
);


// =========================================
// 帳號管理
// =========================================
router.post(
    '/change-password',
    authController.changePassword
);

router.post(
    '/delete-account',
    authController.deleteAccount
);


// =========================================
// 匯出 Router
// =========================================
module.exports = router;