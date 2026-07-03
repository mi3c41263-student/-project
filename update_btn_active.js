const fs = require('fs');
let css = fs.readFileSync('frontend/main.css', 'utf-8');

const replacement = `}
.btn-danger:active {
    transform: translateY(1px) scale(0.98);
    box-shadow: 0 2px 5px rgba(255, 71, 87, 0.4);
}

[data-theme="light"] .btn-danger {`;

css = css.replace(
    '}\n\n[data-theme="light"] .btn-danger {',
    replacement
);
css = css.replace(
    '}\r\n\r\n[data-theme="light"] .btn-danger {',
    replacement
);

const replacementLight = `}
[data-theme="light"] .btn-danger:active {
    transform: translateY(1px) scale(0.98) !important;
    box-shadow: 0 2px 5px rgba(255, 77, 79, 0.4) !important;
}`;

css = css.replace(
    '}\n/* Quiz Next Button Light Mode */',
    replacementLight + '\n\n/* Quiz Next Button Light Mode */'
);
css = css.replace(
    '}\r\n\r\n/* Quiz Next Button Light Mode */',
    replacementLight + '\r\n\r\n/* Quiz Next Button Light Mode */'
);

// If the previous replace failed because of whitespace differences at the end of file:
if (!css.includes('.btn-danger:active')) {
    css += `
.btn-danger:active {
    transform: translateY(1px) scale(0.98) !important;
    box-shadow: 0 2px 5px rgba(255, 71, 87, 0.4) !important;
}`;
}

fs.writeFileSync('frontend/main.css', css);
