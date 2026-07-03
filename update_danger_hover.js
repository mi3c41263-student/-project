const fs = require('fs');
let css = fs.readFileSync('frontend/main.css', 'utf-8');

const oldHover = `.btn-danger:hover {
    background: var(--danger-bg-hover);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);
}`;

const newHover = `.btn-danger:hover {
    background: var(--danger-color);
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);
}`;

const oldActive = `.btn-danger:active {
    transform: translateY(1px) scale(0.98);
    box-shadow: 0 2px 5px rgba(255, 71, 87, 0.4);
}`;

const newActive = `.btn-danger:active {
    background: var(--danger-color);
    color: #ffffff;
    transform: translateY(1px) scale(0.98);
    box-shadow: 0 2px 5px rgba(255, 71, 87, 0.4);
}`;

css = css.replace(oldHover, newHover);
css = css.replace(oldHover.replace(/\n/g, '\r\n'), newHover);
css = css.replace(oldActive, newActive);
css = css.replace(oldActive.replace(/\n/g, '\r\n'), newActive);

fs.writeFileSync('frontend/main.css', css);
