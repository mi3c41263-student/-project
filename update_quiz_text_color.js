const fs = require('fs');
let css = fs.readFileSync('frontend/main.css', 'utf-8');

// Replace #fff with var(--text-bright) for .flip-card-back-text
css = css.replace(
    '.flip-card-back-text {\r\n    font-size: 0.9rem;\r\n    font-weight: bold;\r\n    color: #fff;\r\n    margin-bottom: 8px;\r\n}',
    '.flip-card-back-text {\r\n    font-size: 0.9rem;\r\n    font-weight: bold;\r\n    color: var(--text-bright);\r\n    margin-bottom: 8px;\r\n}'
);
css = css.replace(
    '.flip-card-back-text {\n    font-size: 0.9rem;\n    font-weight: bold;\n    color: #fff;\n    margin-bottom: 8px;\n}',
    '.flip-card-back-text {\n    font-size: 0.9rem;\n    font-weight: bold;\n    color: var(--text-bright);\n    margin-bottom: 8px;\n}'
);

// Replace #cbd5e1 with var(--text-muted) for .flip-card-back-answer
css = css.replace(
    '.flip-card-back-answer {\r\n    font-size: 0.75rem;\r\n    color: #cbd5e1;\r\n}',
    '.flip-card-back-answer {\r\n    font-size: 0.75rem;\r\n    color: var(--text-muted);\r\n}'
);
css = css.replace(
    '.flip-card-back-answer {\n    font-size: 0.75rem;\n    color: #cbd5e1;\n}',
    '.flip-card-back-answer {\n    font-size: 0.75rem;\n    color: var(--text-muted);\n}'
);

fs.writeFileSync('frontend/main.css', css);
