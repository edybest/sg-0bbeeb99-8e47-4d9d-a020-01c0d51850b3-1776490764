const fs = require('fs');
const content = fs.readFileSync('src/components/admin/GameManagement.tsx', 'utf-8');
const lines = content.split('\n');
console.log("Lines 1080-1120:");
console.log(lines.slice(1080, 1120).map((l,i)=>`${1080+i+1}: ${l}`).join('\n'));
console.log("\nLines 1300-1330:");
console.log(lines.slice(1300, 1330).map((l,i)=>`${1300+i+1}: ${l}`).join('\n'));
