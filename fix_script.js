const fs = require('fs');
const lines = fs.readFileSync('src/components/admin/GameManagement.tsx', 'utf-8').split('\n');

// Find CardContent that starts at 1089 (approx)
const startCardContent = lines.findIndex(l => l.includes('<CardContent className="pt-0 pb-2 flex-grow">'));
const endCard = lines.findIndex((l, i) => i > startCardContent && l.trim() === '</Card>');

console.log("Start CardContent:", startCardContent);
console.log("End Card:", endCard);

// Let's print out the lines between startCardContent and endCard to see the exact structure
if (startCardContent !== -1 && endCard !== -1) {
  console.log(lines.slice(startCardContent, endCard + 1).map((l, i) => (startCardContent + i + 1) + ': ' + l).join('\n'));
} else {
  console.log("Could not find boundaries.");
}
