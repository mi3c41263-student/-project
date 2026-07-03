const fs = require('fs');
let js = fs.readFileSync('frontend/main.js', 'utf-8');

// zh-TW dictionary
js = js.replace(
    "'nav-analysis': '<i class=\"fa-solid fa-chart-pie\"></i> 學習成果分析',",
    "'nav-analysis': '<i class=\"fa-solid fa-chart-pie\"></i> 學習成果分析', 'nav-mistakes': '<i class=\"fa-solid fa-book-medical\"></i> 錯題本與弱點強化', 'mistakes-title': '錯題本與弱點強化', 'sub-mistakes': '檢視與強化您的資安弱點',"
);

// en dictionary
js = js.replace(
    "'nav-analysis': '<i class=\"fa-solid fa-chart-pie\"></i> Analysis',",
    "'nav-analysis': '<i class=\"fa-solid fa-chart-pie\"></i> Analysis', 'nav-mistakes': '<i class=\"fa-solid fa-book-medical\"></i> Mistake Notebook', 'mistakes-title': 'Mistake Notebook & Weaknesses', 'sub-mistakes': 'Review and reinforce your security weaknesses',"
);

fs.writeFileSync('frontend/main.js', js);
