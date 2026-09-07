const fs = require('fs');
let css = fs.readFileSync('frontend/login.css', 'utf8');
css = css.replace(/\.form-options \{ display: flex; justify-content: space-between;/g, '.form-options { display: flex; justify-content: flex-end;');
fs.writeFileSync('frontend/login.css', css, 'utf8');
console.log('Fixed justify-content for form-options');
