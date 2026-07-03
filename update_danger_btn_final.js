const fs = require('fs');
let css = fs.readFileSync('frontend/main.css', 'utf-8');

const oldBase = `.btn-danger {
    background: var(--danger-bg);
    color: var(--danger-color);
    border: 1px solid var(--danger-border);
    border-radius: 8px;`;

const newBase = `.btn-danger {
    background: var(--danger-color);
    color: #ffffff;
    border: 1px solid var(--danger-color);
    border-radius: 8px;`;

const oldHover = `.btn-danger:hover {
    background: var(--danger-color);
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);
}`;

const newHover = `.btn-danger:hover {
    background: transparent;
    color: var(--danger-color);
    border-color: var(--danger-color);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);
}`;

const oldActive = `.btn-danger:active {
    background: var(--danger-color);
    color: #ffffff;
    transform: translateY(1px) scale(0.98);
    box-shadow: 0 2px 5px rgba(255, 71, 87, 0.4);
}`;

const newActive = `.btn-danger:active {
    background: transparent;
    color: var(--danger-color);
    border-color: var(--danger-color);
    transform: translateY(1px) scale(0.98);
    box-shadow: 0 2px 5px rgba(255, 71, 87, 0.4);
}`;

css = css.replace(oldBase, newBase);
css = css.replace(oldBase.replace(/\n/g, '\r\n'), newBase);

css = css.replace(oldHover, newHover);
css = css.replace(oldHover.replace(/\n/g, '\r\n'), newHover);

css = css.replace(oldActive, newActive);
css = css.replace(oldActive.replace(/\n/g, '\r\n'), newActive);

fs.writeFileSync('frontend/main.css', css);
