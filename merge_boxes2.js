const fs = require('fs');
let html = fs.readFileSync('frontend/main.html', 'utf8');

const regex = /<div class="manual-header glass-panel" style="margin-bottom: 20px;">\s*<h3 class="clause-main-title" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;" data-i18n="quiz-title">資安稽核情境模擬測驗<\/h3>\s*<\/div>\s*<div class="glass-panel" style="padding: 25px;">/g;

const replacement = `<div class="glass-panel" style="padding: 25px;">
                        <div class="manual-header" style="margin-top: 0; margin-bottom: 25px;">
                            <h3 class="clause-main-title" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;" data-i18n="quiz-title">資安稽核情境模擬測驗</h3>
                        </div>`;

if (regex.test(html)) {
    html = html.replace(regex, replacement);
    fs.writeFileSync('frontend/main.html', html, 'utf8');
    console.log('Replaced successfully!');
} else {
    console.log('Regex did not match.');
}
