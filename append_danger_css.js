const fs = require('fs');
let css = fs.readFileSync('frontend/main.css', 'utf-8');

const newCss = `
/* Danger Button Styles */
.btn-danger {
    background: var(--danger-bg);
    color: var(--danger-color);
    border: 1px solid var(--danger-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}
.btn-danger:hover {
    background: var(--danger-bg-hover);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);
}

[data-theme="light"] .btn-danger {
    background: #fff0f0 !important;
    color: #ff4d4f !important;
    border: 1px solid #ff4d4f !important;
}
[data-theme="light"] .btn-danger:hover {
    background: #ff4d4f !important;
    color: #ffffff !important;
    box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3) !important;
}
`;

fs.writeFileSync('frontend/main.css', css + newCss);
