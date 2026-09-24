const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const out = path.join(root, 'public');
fs.rmSync(out, {recursive:true,force:true});
fs.mkdirSync(out, {recursive:true});
for (const name of ['index.html', 'style.css', 'app.js', 'shared.js', 'admin.html', 'admin.js', 'admin.css', 'settings.json']) fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
console.log('Hosting files prepared.');
