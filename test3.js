const fs = require('fs');
const { execSync } = require('child_process');
const oldHtml = execSync('git show 17a0887:frontend/main.html');
const str = oldHtml.toString('utf8');
const lines = str.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('sidebar-logo')) {
    console.log(lines[i]);
  }
}
