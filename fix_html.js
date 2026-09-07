const fs = require('fs');
let html = fs.readFileSync('frontend/main.html', 'utf8');

// Fix title
html = html.replace(/<title>.*?<\/title>/, '<title>系統儀表板 - ISO稽核系統</title>');

// Fix line 24 image
html = html.replace(/<img src="logo\.png" alt="[^"]*class="sidebar-logo">/, '<img src="logo.png" alt="ISO稽核系統" class="sidebar-logo">');

// Fix line 421 image
html = html.replace(/<img src="blacklogo\.png" alt="[^"]*style="height: 90px; margin-bottom: 5px; object-fit: contain;">/, '<img src="blacklogo.png" alt="ISO稽核系統" style="height: 90px; margin-bottom: 5px; object-fit: contain;">');

fs.writeFileSync('frontend/main.html', html, 'utf8');
console.log('Fixed main.html');
