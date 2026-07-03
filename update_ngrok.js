const fs = require('fs');

let code = fs.readFileSync('backend/controllers/authController.js', 'utf-8');

code = code.replace(
    'window.location.href = "http://127.0.0.1:5500/frontend/login.html";',
    'window.location.href = "https://impulse-shifter-limes.ngrok-free.dev/login.html";'
);

fs.writeFileSync('backend/controllers/authController.js', code);
console.log('Successfully updated ngrok URL');
