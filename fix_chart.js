const fs = require('fs');

let js = fs.readFileSync('frontend/main.js', 'utf8');

// Replace grid color logic in initRadarChart (it spans multiple lines)
// We can just use string replacement on the exact code blocks

// For initRadarChart:
// It has:
/*
                        color:
                            document.documentElement
                                .getAttribute('data-theme') === 'light'
                                ? 'rgba(0,0,0,0.1)'
                                : 'rgba(255,255,255,0.1)'
*/
// We want to change 'rgba(255,255,255,0.1)' to 'rgba(255,255,255,0.3)'
js = js.replace(/'rgba\(255,255,255,0\.1\)'/g, "'rgba(255,255,255,0.3)'");

// For pointLabels color in initRadarChart:
// It has:
/*
                        color:
                            document.documentElement
                                .getAttribute('data-theme') === 'light'
                                ? '#1a202c'
                                : 'var(--text-color)'
*/
// We want to change 'var(--text-color)' to '#f8f9fa' (or similar light color)
js = js.replace(/'var\(--text-color\)'/g, "'#f8f9fa'");

fs.writeFileSync('frontend/main.js', js, 'utf8');
console.log('Replaced Chart.js colors successfully!');
