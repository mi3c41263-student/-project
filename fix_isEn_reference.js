const fs = require('fs');
let js = fs.readFileSync('frontend/main.js', 'utf-8');

// Remove isEn from line 2597
js = js.replace(
    "const isEn = document.getElementById('langSelect') && document.getElementById('langSelect').value === 'en';",
    ""
);

// Add isEn to the top of renderMistakes
js = js.replace(
    "let mistakes = (user.history && user.history.mistakes) ? user.history.mistakes : [];",
    "let mistakes = (user.history && user.history.mistakes) ? user.history.mistakes : [];\n            const isEn = document.getElementById('langSelect') && document.getElementById('langSelect').value === 'en';"
);

fs.writeFileSync('frontend/main.js', js);
