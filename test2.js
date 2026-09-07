const fs = require('fs');
const html = fs.readFileSync('frontend/main.html', 'utf8');
const lines = html.split('\n');
for (let i = 0; i < lines.length; i++) {
  const quoteCount = (lines[i].match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    console.log(`Unbalanced quotes on line ${i + 1}: ${lines[i]}`);
  }
}
