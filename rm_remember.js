const fs = require('fs');
let html = fs.readFileSync('frontend/login.html', 'utf8');
html = html.replace(/<label class="remember-me"><input type="checkbox" id="remember"> <span>記住我<\/span><\/label>\n?/g, '');
fs.writeFileSync('frontend/login.html', html, 'utf8');
console.log('Removed remember me checkbox');
