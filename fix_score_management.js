const fs = require('fs');
const file = 'src/components/admin/ScoreManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add import for the new component
if (!code.includes('CoupleScoreEntry')) {
  code = code.replace('import { Button }', 'import { CoupleScoreEntry } from "./CoupleScoreEntry";\nimport { Button }');
}

// 2. Extract and replace the malformed block with the new component
const startMarker = '{/* Couple Score Entry */}';
const endMarker = '{/* Clean Game Prize Summary */}';
const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + 
         '{/* Couple Score Entry */}\n          <CoupleScoreEntry selectedGameId={selectedGameId} />\n\n          ' + 
         code.substring(endIndex);
  console.log("Replaced malformed JSX block successfully.");
} else {
  console.log("Error: Could not find the replacement markers.");
}

fs.writeFileSync(file, code);