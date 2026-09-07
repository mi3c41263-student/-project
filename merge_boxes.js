const fs = require('fs');
let html = fs.readFileSync('frontend/main.html', 'utf8');

const target = `<div id="quizSection" class="section-container" style="display: none;">
                    <div class="manual-header glass-panel" style="margin-bottom: 20px;">
                        <h3 class="clause-main-title" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;" data-i18n="quiz-title">資安稽核情境模擬測驗</h3>
                        
                    </div>

                    <div class="glass-panel" style="padding: 25px;">
                        <form id="quizForm" class="quiz-container">`;

const replacement = `<div id="quizSection" class="section-container" style="display: none;">
                    <div class="glass-panel" style="padding: 25px;">
                        <div class="manual-header" style="margin-top: 0; margin-bottom: 25px;">
                            <h3 class="clause-main-title" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;" data-i18n="quiz-title">資安稽核情境模擬測驗</h3>
                        </div>

                        <form id="quizForm" class="quiz-container">`;

html = html.replace(target, replacement);

fs.writeFileSync('frontend/main.html', html, 'utf8');
console.log('Replaced successfully');
