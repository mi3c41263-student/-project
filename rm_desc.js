const fs = require('fs');
let html = fs.readFileSync('frontend/main.html', 'utf8');
html = html.replace(/<p style="color: var\(--text-light\); margin-top: 10px; font-size: 0\.80rem; line-height: 1\.6;" data-i18n="quiz-desc">.*?<\/p>\n?/g, '');
fs.writeFileSync('frontend/main.html', html, 'utf8');
console.log('Removed quiz desc text.');
