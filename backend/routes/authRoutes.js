const express = require('express');
const router = express.Router();

// 引入我們剛剛寫好的 Controller (廚師)
const authController = require('../controllers/authController');

// --- 原有的路徑 ---
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/stats', authController.getUserStats);

// --- 🌟 新增：信箱驗證路徑 ---
router.get('/verify', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
module.exports = router;
