const fs = require('fs');
let html = fs.readFileSync('frontend/main.html', 'utf8');

html = html.replace(/<p style="font-size: 0\.80rem; line-height: 1\.6;" data-i18n="man-desc">本手冊收錄本次稽核任務之重點控制措施。請熟記以下條文，以利在 VR 情境中準確判斷缺失。<\/p>\n?/g, '');

fs.writeFileSync('frontend/main.html', html, 'utf8');
console.log('Removed text successfully!');
