const express = require('express');
const router = express.Router();

// 引入我們剛剛寫好的 Controller (廚師)
const authController = require('../controllers/authController');

// 定義路徑，並指派給對應的 Controller 處理
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/stats', authController.getUserStats);
module.exports = router;