const fs = require('fs');
let html = fs.readFileSync('frontend/main.html', 'utf-8');

html = html.replace(/<span class="note-date">2026\/03\/18<\/span>/g, '');
html = html.replace(/<span class="note-date" id="modalDate">2026\/03\/18<\/span>/g, '');

fs.writeFileSync('frontend/main.html', html);
