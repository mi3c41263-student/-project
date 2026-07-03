const fs = require('fs');
let css = fs.readFileSync('frontend/main.css', 'utf-8');

const newCss = `
/* Quiz Next Button Light Mode */
[data-theme="light"] .btn-next-quiz {
    background-color: #ffffff !important;
    color: #1a202c !important;
    border: 1px solid rgba(0,0,0,0.2) !important;
}
[data-theme="light"] .btn-next-quiz:hover {
    background-color: #f1f5f9 !important;
}
`;

fs.writeFileSync('frontend/main.css', css + newCss);
