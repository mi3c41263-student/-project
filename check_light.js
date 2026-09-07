const fs = require('fs');
const css = fs.readFileSync('frontend/main.css', 'utf8');
const match = css.match(/\[data-theme=['"]?light['"]?\]\s*\{[^}]*\}/);
console.log(match ? match[0] : 'No light theme variables');
