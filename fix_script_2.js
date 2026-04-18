const fs = require('fs');
const { execSync } = require('child_process');

try {
    // 1. Recover the stable file from before the bad script
    execSync('git checkout HEAD src/pages/member/blok.tsx');
    let content = fs.readFileSync('src/pages/member/blok.tsx', 'utf8');

    // 2. Add imports
    if (!content.includes('html2canvas')) {
        content = content.replace(
            'import { Badge } from "@/components/ui/badge";',
            'import { Badge } from "@/components/ui/badge";\nimport html2canvas from "html2canvas";'
        );
    }
    content = content.replace(/Share2\n\} from "lucide-react";/, 'Share2,\n    X,\n    Camera\n} from "lucide-react";');

    // 3. Add state and function
    const menVsWomenStateRegex = /const \[loadingMenVsWomen, setLoadingMenVsWomen\] = useState\(false\);/;
    const insertion = `
    const menVsWomenRef = useRef<HTMLDivElement>(null);
    const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

    const handleShareMenVsWomen = async () => {
        if (!menVsWomenRef.current) return;
        try {
            setIsCapturingScreenshot(true);
            await new Promise((resolve) => setTimeout(resolve, 150));

            const canvas = await html2canvas(menVsWomenRef.current, {
                scale: 2,
                backgroundColor: "#f8fafc",
                useCORS: true,
                logging: false,
            });

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/png", 1.0)
            );

            if (!blob) throw new Error("Gagal menghasilkan imej");

            const file = new File([blob], \`AMBC-Men-vs-Women-\${Date.now()}.png\`, { type: "image/png" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: "Keputusan Men vs Women AMBC",
                    text: \`Keputusan terkini Men vs Women bagi game \${games.find(g => g.id === selectedGame)?.game_name || ''}!\`,
                    files: [file],
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast({
                    title: "Imej Dimuat Turun",
                    description: "Browser tidak menyokong direct share. Imej telah dimuat turun.",
                });
            }
        } catch (err) {
            console.error("Screenshot error:", err);
            toast({
                title: "Ralat",
                description: "Gagal memproses screenshot. Sila cuba lagi.",
                variant: "destructive"
            });
        } finally {
            setIsCapturingScreenshot(false);
        }
    };
`;
    content = content.replace(menVsWomenStateRegex, 'const [loadingMenVsWomen, setLoadingMenVsWomen] = useState(false);\n' + insertion);

    // 4. Update the UI
    const dialogStart = content.indexOf('{/* ── Men vs Women Dialog ── */}');
    const dialogEnd = content.indexOf('</MemberLayout>', dialogStart);
    let dialogSection = content.substring(dialogStart, dialogEnd);

    // Hide default close button
    dialogSection = dialogSection.replace(
        'shadow-2xl"',
        'shadow-2xl [&>button]:hidden"'
    );

    // Wrap with ref div
    dialogSection = dialogSection.replace(
        /<div className="bg-gradient-to-r from-violet-600 to-indigo-600/,
        '<div ref={menVsWomenRef} className="bg-slate-50 min-h-full">\n                            <div className="bg-gradient-to-r from-violet-600 to-indigo-600'
    );

    // Add ignore tag to header
    dialogSection = dialogSection.replace(
        /sticky top-0 z-20 shadow-md">/,
        'sticky top-0 z-20 shadow-md" data-html2canvas-ignore={isCapturingScreenshot ? "true" : undefined}>'
    );

    // Add buttons after DialogTitle
    const buttons = `</DialogTitle>
                                
                                {!isCapturingScreenshot && (
                                    <div className="flex items-center gap-2" data-html2canvas-ignore="true">
                                        <button 
                                            onClick={handleShareMenVsWomen}
                                            disabled={isCapturingScreenshot || loadingMenVsWomen || !menVsWomenData}
                                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm disabled:opacity-50"
                                            title="Kongsi Imej"
                                        >
                                            {isCapturingScreenshot ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
                                        </button>
                                        <button 
                                            onClick={() => setIsMenVsWomenDialogOpen(false)}
                                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                                            title="Tutup"
                                        >
                                            <X className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                )}
                            </div>`;
    dialogSection = dialogSection.replace(/<\/DialogTitle>\s*<\/div>/, buttons);

    // Close the ref div before DialogContent closes
    dialogSection = dialogSection.replace(
        /<\/div>\s*<\/DialogContent>/,
        '</div>\n                        </div>\n                    </DialogContent>'
    );

    content = content.substring(0, dialogStart) + dialogSection + content.substring(dialogEnd);
    fs.writeFileSync('src/pages/member/blok.tsx', content);
    console.log("Done updating blok.tsx safely");
} catch (e) {
    console.error(e);
}