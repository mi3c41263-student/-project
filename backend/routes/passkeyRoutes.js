const express = require('express');
const router = express.Router();
const { 
    generateAuthenticationOptions, 
    verifyAuthenticationResponse,
    generateRegistrationOptions,  
    verifyRegistrationResponse    
} = require('@simplewebauthn/server');

const db = require('../db'); // 確認你的資料庫路徑
const currentChallenges = {}; 
const rpID = 'localhost'; 

// =========================================
// API 1: 產生指紋登入選項 (Login Options)
// =========================================
router.get('/login-options', async (req, res) => {
    const { email } = req.query;
    try {
        const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        if (users.length === 0) return res.status(404).json({ success: false, message: "找不到帳號" });
        const user = users[0];

        const [credentials] = await db.query("SELECT credential_id FROM user_passkeys WHERE user_id = ?", [user.id]);
        if (credentials.length === 0) return res.status(400).json({ success: false, message: "尚未綁定指紋" });

        const options = await generateAuthenticationOptions({
            allowCredentials: credentials.map(cred => ({
                id: cred.credential_id, // 🌟 v10 更新：直接傳入字串
                type: 'public-key',
                transports: ['internal', 'usb', 'ble', 'nfc'],
            })),
            userVerification: 'preferred',
        });

        currentChallenges[email] = options.challenge;
        res.json({ success: true, data: options });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
});

// =========================================
// API 2: 驗證前端傳回的登入簽章 (Login Verify)
// =========================================
router.post('/login-verify', async (req, res) => {
    const { email, asseResp } = req.body;
    try {
        const expectedChallenge = currentChallenges[email];
        if (!expectedChallenge) return res.status(400).json({ success: false, message: "驗證超時" });

        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        const user = users[0];
        
        const [passkeys] = await db.query("SELECT * FROM user_passkeys WHERE credential_id = ?", [asseResp.id]);
        if (passkeys.length === 0) return res.status(404).json({ success: false, message: "找不到金鑰" });
        const dbPasskey = passkeys[0];

      const verification = await verifyAuthenticationResponse({
            response: asseResp,
            expectedChallenge,
            expectedOrigin: req.headers.origin, 
            expectedRPID: req.hostname,
            credential: { 
                id: dbPasskey.credential_id, 
                publicKey: new Uint8Array(Buffer.from(dbPasskey.public_key, 'base64')), // 🌟 v10 更新：屬性簡化為 publicKey
                counter: dbPasskey.counter,
            },
        });

        if (verification.verified) {
            const { authenticationInfo } = verification;
            await db.query("UPDATE user_passkeys SET counter = ? WHERE id = ?", [authenticationInfo.newCounter, dbPasskey.id]);
            delete currentChallenges[email];
            delete user.password;
            res.json({ success: true, message: "指紋登入成功！", user });
        } else {
            res.status(400).json({ success: false, message: "驗證失敗" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
});

// =========================================
// API 3: 產生指紋綁定規格 (Register Options)
// =========================================
router.get('/register-options', async (req, res) => {
    const { email } = req.query;
    try {
        const [users] = await db.query("SELECT id, username FROM users WHERE email = ?", [email]);
        if (users.length === 0) return res.status(404).json({ success: false, message: "找不到帳號" });
        const user = users[0];

        const [credentials] = await db.query("SELECT credential_id FROM user_passkeys WHERE user_id = ?", [user.id]);

        const options = await generateRegistrationOptions({
            rpName: 'ISO Security Training',
            rpID: rpID,
            userID: new Uint8Array(Buffer.from(user.id.toString(), 'utf8')), // 🌟 已修復：轉為 Uint8Array
            userName: email,
            userDisplayName: user.username,
            attestationType: 'none',
            excludeCredentials: credentials.map(cred => ({
                id: cred.credential_id, // 🌟 v10 更新：直接放字串
                type: 'public-key',
                transports: ['internal'],
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform', 
            }
        });

        currentChallenges[email] = options.challenge;
        res.json({ success: true, data: options });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
});

// =========================================
// API 4: 驗證並儲存指紋公鑰 (Register Verify)
// =========================================
router.post('/register-verify', async (req, res) => {
    const { email, attResp } = req.body;
    try {
        const expectedChallenge = currentChallenges[email];
        if (!expectedChallenge) return res.status(400).json({ success: false, message: "請求超時" });

        const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        const user = users[0];

        const verification = await verifyRegistrationResponse({
            response: attResp,
            expectedChallenge,
            expectedOrigin: req.headers.origin, 
            expectedRPID: req.hostname,
        });

        if (verification.verified) {
            // 🌟 v10 更新：新的解構方式，找出被包裝起來的 credential
            const { credential } = verification.registrationInfo; 

            // 寫入資料庫
            await db.query(
                "INSERT INTO user_passkeys (user_id, credential_id, public_key, counter, device_name) VALUES (?, ?, ?, ?, ?)",
                [
                    user.id,
                    credential.id, // v10 已經是字串，直接存
                    Buffer.from(credential.publicKey).toString('base64'), // 將二進位 Uint8Array 轉為 base64 存入
                    credential.counter,
                    '本機生物辨識裝置'
                ]
            );

            delete currentChallenges[email];
            res.json({ success: true, message: "指紋綁定成功！" });
        } else {
            res.status(400).json({ success: false, message: "驗證失敗" });
        }
    } catch (error) {
        console.error("驗證註冊憑證失敗:", error);
        res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
});

module.exports = router;