const fs = require('fs');

try {
    let code = fs.readFileSync('src/pages/member/blok.tsx', 'utf8');

    // 1. Remove html2canvas import
    code = code.replace(/import html2canvas from "html2canvas";\n?/, '');

    // 2. Limit query to 60
    code = code.replace(/\.limit\(\d+\)/g, '.limit(60)');

    // 3. Remove like/love queries in loadLeaderboard
    code = code.replace(/likes_count,\s*loves_count,\s*/g, '');

    // 4. Remove loadUserLikesCount calls
    code = code.replace(/void loadUserLikesCount\([^)]+\);\n/g, '');

    // 5. Remove loadUserLikesCount function definition
    code = code.replace(/const loadUserLikesCount = useCallback\(async \([^)]+\) => \{[\s\S]*?\}, \[\]\);\n/g, '');

    // 6. Remove handleLike & handleLove functions definition
    code = code.replace(/const handleLike = useCallback\(async \([^)]+\) => \{[\s\S]*?toast\]\);\n/g, '');
    code = code.replace(/const handleLove = useCallback\(async \([^)]+\) => \{[\s\S]*?toast\]\);\n/g, '');

    // 7. Remove Most Liked Players card
    const mostLikedRegex = /\{\/\* ── Most Liked Players ── \*\/\}(?:[\s\S]*?)<\/Card>\n\s*<\/div>/;
    code = code.replace(mostLikedRegex, '');

    // 8. Remove the column for likes in the table
    const likeHeaderRegex = /<th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-pink-600 to-rose-700 text-white z-10 border-l-2 border-white\/20">\s*Sokongan\s*<\/th>/;
    code = code.replace(likeHeaderRegex, '');

    // 9. Remove the cell for likes in the table body
    // This looks like a <td> with handleLike and handleLove buttons
    const likeCellRegex = /<td className="px-2 sm:px-3 py-3 text-center border-r border-sky-200">\s*<div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">[\s\S]*?<\/td>/g;
    code = code.replace(likeCellRegex, '');

    // 10. Remove Realtime listener for likes
    const realtimeRegex = /useEffect\(\(\) => \{\n\s*if \(!selectedGame\) return;\n\n\s*const channel = supabase\n\s*\.channel\('public:game_players'\)[\s\S]*?\}, \[games, selectedGame, toast\]\);\n/;
    code = code.replace(realtimeRegex, '');

    // 11. Remove screenshot states and functions
    code = code.replace(/const \[isCapturingScreenshot, setIsCapturingScreenshot\] = useState\(false\);\n/g, '');
    code = code.replace(/const handleShareMenVsWomen = async \(\) => \{[\s\S]*?finally \{\n\s*setIsCapturingScreenshot\(false\);\n\s*\}\n\s*\};\n/g, '');

    // 12. Remove menVsWomenRef completely from DialogContent
    code = code.replace(/ref=\{menVsWomenRef\}\n/g, '');
    
    // Also remove the declaration if present
    code = code.replace(/const menVsWomenRef = useRef<HTMLDivElement>\(null\);\n/g, '');

    // 13. Remove Camera button
    const cameraButtonRegex = /<button\n\s*onClick=\{handleShareMenVsWomen\}\n\s*disabled=\{isCapturingScreenshot\}\n\s*className="p-2 rounded-full bg-white\/20 hover:bg-white\/30 transition-colors disabled:opacity-50"\n\s*title="Kongsi Keputusan"\n\s*>\n\s*(?:isCapturingScreenshot \? \([\s\S]*?\) : \([\s\S]*?\))\n\s*<\/button>\n/g;
    code = code.replace(cameraButtonRegex, '');
    
    // Also match simpler versions just in case
    code = code.replace(/<button[^>]*onClick=\{handleShareMenVsWomen\}[^>]*>[\s\S]*?<\/button>\n?/g, '');

    // 14. Remove data-html2canvas-ignore attributes
    code = code.replace(/\s*data-html2canvas-ignore/g, '');

    // 15. Remove isCapturingScreenshot logic from classNames
    code = code.replace(/\s*\$\{isCapturingScreenshot \? "[^"]+" : ""\}/g, '');
    code = code.replace(/isCapturingScreenshot \? "[^"]+" : "[^"]+"/g, '""');

    // Remove empty classNames or leftover logic if any
    
    // Replace colspan="13" with colspan="12" for empty state table
    code = code.replace(/colSpan=\{13\}/g, 'colSpan={12}');

    fs.writeFileSync('src/pages/member/blok.tsx', code);
    console.log("Successfully processed blok.tsx");
} catch (e) {
    console.error(e);
}