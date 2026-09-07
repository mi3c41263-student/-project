const fs = require('fs');

// 1. Update main.css
let css = fs.readFileSync('frontend/main.css', 'utf8');
css = css.replace(/:root\s*\{/, ':root {\n    --btn-primary-text: #0a192f;');
css = css.replace(/\[data-theme=['"]?light['"]?\]\s*\{/, '[data-theme="light"] {\n    --btn-primary-text: #ffffff;');
fs.writeFileSync('frontend/main.css', css, 'utf8');

// 2. Update main.html
let html = fs.readFileSync('frontend/main.html', 'utf8');
// Fix startVrBtn
html = html.replace(/<button id="startVrBtn" style="([^"]*?)color:\s*#[0-9a-fA-F]+;([^"]*)">/, '<button id="startVrBtn" style="$1color: var(--btn-primary-text);$2">');
// Fix btnShowVrHistory
html = html.replace(/<button id="btnShowVrHistory" style="background-color:\s*#[0-9a-fA-F]+;\s*color:\s*#[0-9a-fA-F]+;(.*?)border:\s*1px solid\s*#[0-9a-fA-F]+;(.*?)">/, '<button id="btnShowVrHistory" style="background-color: var(--primary-cyan); color: var(--btn-primary-text);$1border: 1px solid var(--primary-cyan);$2">');
// Fix btnShowVrAnswers
html = html.replace(/<button id="btnShowVrAnswers" style="background-color:\s*transparent;\s*color:\s*#[0-9a-fA-F]+;(.*?)border:\s*1px solid\s*#[0-9a-fA-F]+;(.*?)">/, '<button id="btnShowVrAnswers" style="background-color: transparent; color: var(--primary-cyan);$1border: 1px solid var(--primary-cyan);$2">');
fs.writeFileSync('frontend/main.html', html, 'utf8');

// 3. Update main.js
let js = fs.readFileSync('frontend/main.js', 'utf8');
js = js.replace(/btnShowVrHistory\.style\.color = '#0a192f';/g, "btnShowVrHistory.style.color = 'var(--btn-primary-text)';");
js = js.replace(/btnShowVrAnswers\.style\.color = '#0a192f';/g, "btnShowVrAnswers.style.color = 'var(--btn-primary-text)';");
fs.writeFileSync('frontend/main.js', js, 'utf8');

console.log('Update done');
