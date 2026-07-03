const fs = require('fs');
let js = fs.readFileSync('frontend/main.js', 'utf-8');

// Fix isEn check
js = js.replace(
    "const isEn = document.getElementById('langSelect') && document.getElementById('langSelect').value === 'en-US';",
    "const isEn = document.getElementById('langSelect') && document.getElementById('langSelect').value === 'en';"
);

// Fix "空空如也"
js = js.replace(
    'mistakesList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;"><i class="fa-solid fa-face-smile-beam" style="font-size: 3rem; margin-bottom: 15px; color: var(--primary-cyan);"></i><br>太棒了！您的錯題本目前空空如也，繼續保持！</div>`;',
    'mistakesList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;"><i class="fa-solid fa-face-smile-beam" style="font-size: 3rem; margin-bottom: 15px; color: var(--primary-cyan);"></i><br>${isEn ? "Great job! Your mistake notebook is empty, keep it up!" : "太棒了！您的錯題本目前空空如也，繼續保持！"}</div>`;'
);

// Fix "查看詳解"
js = js.replace(
    '<summary style="color: var(--primary-cyan); font-weight: bold;">查看詳解</summary>',
    '<summary style="color: var(--primary-cyan); font-weight: bold;">${isEn ? "View Explanation" : "查看詳解"}</summary>'
);

// Fix "移出錯題本"
js = js.replace(
    '<i class="fa-solid fa-trash-can"></i> 移出錯題本',
    '<i class="fa-solid fa-trash-can"></i> ${isEn ? "Remove" : "移出錯題本"}'
);

fs.writeFileSync('frontend/main.js', js);
