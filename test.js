const fs = require('fs');
let jsCode = fs.readFileSync('frontend/main.js', 'utf8');

// Quick mock
global.window = { location: { search: '' }, localStorage: { getItem: () => null, setItem: () => {} }, initRadarChart: () => {}, isQuizActive: false, addEventListener: () => {} };
global.document = {
  addEventListener: () => {},
  getElementById: (id) => ({ value: '', addEventListener: () => {}, classList: { remove: ()=>{}, add: ()=>{} }, style: {} }),
  documentElement: { getAttribute: () => null, setAttribute: () => {} },
  querySelector: () => null
};
global.localStorage = window.localStorage;

try {
  eval(jsCode);
  console.log('Eval success! No syntax or immediate runtime errors.');
} catch(e) {
  console.error('Eval error:', e);
}
