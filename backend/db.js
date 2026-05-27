const mysql = require('mysql2');

// =========================================
// 資料庫連線池 (Connection Pool) 設定
// =========================================
// 注意：請確認以下的 host, user, password 符合你的 MySQL 本地端設定
const pool = mysql.createPool({
    host: 'localhost',       // 資料庫伺服器位址 (通常本地開發是 localhost)
    user: 'root',            // MySQL 登入帳號 (XAMPP 或預設通常是 root)
    password: '123456',            // MySQL 登入密碼 (XAMPP 預設為空字串，如果有設定請填入)
    database: 'my_app',      // 你建立的資料庫名稱 (根據你提供的 SQL 檔，名稱是 my_app)
    waitForConnections: true,
    connectionLimit: 10,     // 最大同時連線數
    queueLimit: 0
});

// 將 Pool 轉換成支援 Promise 的版本 (可以使用 async/await 語法，程式碼更簡潔)
const promisePool = pool.promise();

// 測試連線是否成功 (伺服器啟動時會自動檢查)
promisePool.getConnection()
    .then(connection => {
        console.log(' 資料庫連線成功！已連接至 [my_app] 資料庫。');
        connection.release(); // 測試完釋放連線
    })
    .catch(err => {
        console.error(' 資料庫連線失敗，請檢查 db.js 帳密設定與 MySQL 服務是否啟動：', err.message);
    });

// 導出這個 promisePool，讓其他的 Router 可以引入使用
module.exports = promisePool;