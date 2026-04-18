const fs = require('fs');

try {
    const trioDialog = `
                {/* ── Trio Game Dialog ── */}
                <Dialog open={isTrioDialogOpen} onOpenChange={setIsTrioDialogOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Users className="w-5 h-5 text-purple-500" />
                                <span className="line-clamp-1">Score Trio - {games.find(g => g.id === selectedGame)?.game_name}</span>
                            </DialogTitle>
                        </DialogHeader>
                        {loadingTrios ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            </div>
                        ) : trioRecords.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Tiada rekod trio untuk game ini</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-900">
                                    Jumlah Pasukan: <span className="font-bold">{trioRecords.length}</span>
                                </div>
                                {trioRecords.map((record, index) => {
                                    const players = [
                                        {
                                            id: record.player1_id,
                                            player: record.player1,
                                            score: record.player1_score + (record.include_handicap ? record.player1_handicap || 0 : 0),
                                            handicap: record.player1_handicap || 0,
                                        },
                                        {
                                            id: record.player2_id,
                                            player: record.player2,
                                            score: record.player2_score + (record.include_handicap ? record.player2_handicap || 0 : 0),
                                            handicap: record.player2_handicap || 0,
                                        },
                                        {
                                            id: record.player3_id,
                                            player: record.player3,
                                            score: record.player3_score + (record.include_handicap ? record.player3_handicap || 0 : 0),
                                            handicap: record.player3_handicap || 0,
                                        },
                                    ];

                                    const accent = index === 0
                                        ? {
                                            card: "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100",
                                            badge: "bg-amber-500 text-white",
                                            total: "text-amber-600",
                                            pill: "bg-amber-100 text-amber-800",
                                        }
                                        : index === 1
                                            ? {
                                                card: "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100",
                                                badge: "bg-slate-500 text-white",
                                                total: "text-slate-700",
                                                pill: "bg-slate-200 text-slate-800",
                                            }
                                            : index === 2
                                                ? {
                                                    card: "border-orange-300 bg-gradient-to-br from-orange-50 to-amber-100",
                                                    badge: "bg-orange-500 text-white",
                                                    total: "text-orange-700",
                                                    pill: "bg-orange-100 text-orange-800",
                                                }
                                                : {
                                                    card: "border-purple-100 bg-white",
                                                    badge: "bg-purple-100 text-purple-700",
                                                    total: "text-purple-700",
                                                    pill: "bg-purple-100 text-purple-800",
                                                };

                                    return (
                                        <motion.div
                                            key={record.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={cn("rounded-3xl border p-3 sm:p-4 shadow-sm", accent.card)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold", accent.badge)}>
                                                        <span>#{index + 1}</span>
                                                        {index === 0 ? (
                                                            <Crown className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Star className="h-3.5 w-3.5 fill-current" />
                                                        )}
                                                    </div>
                                                    <p className="mt-2 text-xs font-medium text-slate-500">
                                                        {record.include_handicap ? "Skor ahli termasuk handicap" : "Skor ahli tanpa handicap"}
                                                    </p>
                                                </div>

                                                {index < 3 && (
                                                    <Trophy
                                                        className={cn(
                                                            "h-7 w-7 flex-shrink-0",
                                                            index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : "text-orange-500"
                                                        )}
                                                    />
                                                )}
                                            </div>

                                            <div className="mt-4 space-y-2.5">
                                                {players.map((item, playerIndex) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-3 py-2.5 shadow-sm"
                                                    >
                                                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                                            {playerIndex + 1}
                                                        </div>

                                                        {item.player?.avatar_url ? (
                                                            <Image
                                                                src={item.player.avatar_url}
                                                                alt={item.player.username}
                                                                width={40}
                                                                height={40}
                                                                className="h-10 w-10 flex-shrink-0 rounded-full object-cover border-2 border-white"
                                                                loading="lazy"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-purple-100 font-bold text-purple-700 shadow-sm">
                                                                {item.player?.username?.[0]?.toUpperCase() || "?"}
                                                            </div>
                                                        )}

                                                        <div className="min-w-0 flex-1">
                                                            <Link
                                                                href={\`/member/profile?id=\${item.id}\`}
                                                                className="block truncate text-sm font-bold text-purple-900 hover:text-purple-700"
                                                            >
                                                                @{item.player?.username}
                                                            </Link>
                                                            <p className="text-[11px] text-slate-500">
                                                                {record.include_handicap ? \`Handicap +\${item.handicap}\` : "Tanpa handicap"}
                                                            </p>
                                                        </div>

                                                        <div className={cn("min-w-[76px] rounded-full px-3 py-1.5 text-center text-lg font-black", accent.total)}>
                                                            {item.score}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => void handleShareTrio(record, index + 1)}
                                                    className="h-9 rounded-full border-white/70 bg-white/85 px-4 text-xs font-semibold text-purple-700 shadow-sm hover:bg-white"
                                                >
                                                    <Share2 className="mr-1.5 h-4 w-4" />
                                                    Kongsi
                                                </Button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
`;

    const menVsWomenContent = `
                {/* ── Men vs Women Dialog ── */}
                <Dialog open={isMenVsWomenDialogOpen} onOpenChange={setIsMenVsWomenDialogOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 bg-slate-50 border-0 rounded-2xl sm:rounded-3xl shadow-2xl [&>button]:hidden">
                        <div ref={menVsWomenRef} className="bg-slate-50 min-h-full">
                            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 sm:p-5 text-white flex items-center justify-between sticky top-0 z-20 shadow-md" data-html2canvas-ignore={isCapturingScreenshot ? "true" : undefined}>
                                <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold">
                                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <span className="line-clamp-1 drop-shadow-sm tracking-wide">Men vs Women <span className="opacity-75 font-medium ml-1">| {games.find(g => g.id === selectedGame)?.game_name}</span></span>
                                </DialogTitle>
                                
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
                            </div>
                            
                            <div className="p-4 sm:p-6 sm:pt-8 relative pb-10">
                                {loadingMenVsWomen ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                                        <p className="text-slate-500 font-medium animate-pulse">Mengira markah pertempuran...</p>
                                    </div>
                                ) : !menVsWomenData ? (
                                    <div className="text-center py-16 text-slate-400">
                                        <div className="bg-slate-200/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users className="h-12 w-12 opacity-50" />
                                        </div>
                                        <p className="text-base font-medium">Tiada data Men vs Women</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 sm:space-y-8">
                                        {/* Score Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 relative">
                                            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-white rounded-full items-center justify-center font-black text-xl text-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.15)] border-4 border-slate-50">
                                                VS
                                            </div>
                                            
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={\`relative overflow-hidden p-6 sm:p-8 rounded-[2rem] border border-blue-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-300 \${
                                                    menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                        ? "bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 shadow-blue-500/30 shadow-[0_15px_50px_rgb(59,130,246,0.3)] transform sm:scale-105 z-10 border-none"
                                                        : "bg-white"
                                                }\`}
                                            >
                                                <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                                <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
                                                
                                                <div className="relative z-10 flex flex-col items-center text-center">
                                                    <div className={\`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl mb-4 shadow-inner \${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal ? "bg-white/20 backdrop-blur-md border border-white/30" : "bg-blue-50 border border-blue-100"
                                                    }\`}>
                                                        👨
                                                    </div>
                                                    <h3 className={\`text-sm sm:text-base font-bold tracking-[0.2em] mb-2 uppercase \${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal ? "text-blue-50" : "text-slate-500"
                                                    }\`}>
                                                        Men Team
                                                    </h3>
                                                    <div className={\`text-5xl sm:text-7xl font-black tracking-tighter mb-4 drop-shadow-sm \${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal ? "text-white" : "text-blue-600"
                                                    }\`}>
                                                        {menVsWomenData.menTotal}
                                                    </div>
                                                    <div className={\`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm \${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal ? "bg-black/15 text-white backdrop-blur-sm border border-white/10" : "bg-slate-100 text-slate-600 border border-slate-200"
                                                    }\`}>
                                                        <Users className="w-4 h-4" />
                                                        {menVsWomenData.menCount} Pemain
                                                    </div>
                                                </div>
                                            </motion.div>

                                            <div className="flex sm:hidden justify-center -my-3 relative z-20">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-black text-lg text-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.15)] border-4 border-slate-50">
                                                    VS
                                                </div>
                                            </div>

                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className={\`relative overflow-hidden p-6 sm:p-8 rounded-[2rem] border border-pink-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-300 \${
                                                    menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                        ? "bg-gradient-to-br from-pink-600 via-pink-500 to-rose-400 shadow-pink-500/30 shadow-[0_15px_50px_rgb(236,72,153,0.3)] transform sm:scale-105 z-10 border-none"
                                                        : "bg-white"
                                                }\`}
                                            >
                                                <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                                <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-pink-400/10 rounded-full blur-3xl pointer-events-none"></div>
                                                
                                                <div className="relative z-10 flex flex-col items-center text-center">
                                                    <div className={\`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl mb-4 shadow-inner \${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal ? "bg-white/20 backdrop-blur-md border border-white/30" : "bg-pink-50 border border-pink-100"
                                                    }\`}>
                                                        👩
                                                    </div>
                                                    <h3 className={\`text-sm sm:text-base font-bold tracking-[0.2em] mb-2 uppercase \${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal ? "text-pink-50" : "text-slate-500"
                                                    }\`}>
                                                        Women Team
                                                    </h3>
                                                    <div className={\`text-5xl sm:text-7xl font-black tracking-tighter mb-4 drop-shadow-sm \${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal ? "text-white" : "text-pink-600"
                                                    }\`}>
                                                        {menVsWomenData.womenTotal}
                                                    </div>
                                                    <div className={\`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm \${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal ? "bg-black/15 text-white backdrop-blur-sm border border-white/10" : "bg-slate-100 text-slate-600 border border-slate-200"
                                                    }\`}>
                                                        <Users className="w-4 h-4" />
                                                        {menVsWomenData.womenCount} Pemain
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Winner Banner */}
                                        <motion.div
                                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                                            className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 p-1 shadow-[0_10px_30px_rgb(251,191,36,0.3)] mx-auto max-w-2xl"
                                        >
                                            <div className="absolute inset-0 bg-[url('/bowling-pattern.svg')] opacity-10 mix-blend-overlay bg-repeat pointer-events-none"></div>
                                            <div className="relative bg-white/95 backdrop-blur-md rounded-[1.25rem] py-5 sm:py-6 px-4 text-center border border-white/60 shadow-inner">
                                                <div className="flex justify-center items-center gap-3 sm:gap-4 mb-3">
                                                    <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 drop-shadow-sm" />
                                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">
                                                        {menVsWomenData.menTotal > menVsWomenData.womenTotal ? "Kemenangan Lelaki!" :
                                                         menVsWomenData.womenTotal > menVsWomenData.menTotal ? "Kemenangan Wanita!" :
                                                         "Perlawanan Seri!"}
                                                    </h3>
                                                    <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 drop-shadow-sm" />
                                                </div>
                                                <div className="inline-flex items-center gap-2 bg-slate-800 text-white px-5 py-2 rounded-full text-sm font-bold shadow-md">
                                                    <span>Beza Markah:</span>
                                                    <span className="text-amber-400 text-base">{Math.abs(menVsWomenData.menTotal - menVsWomenData.womenTotal)} pin</span>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Breakdown Section */}
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                            className="bg-white rounded-[1.5rem] border border-slate-200/60 p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
                                        >
                                            <h4 className="font-bold text-slate-800 mb-5 text-sm sm:text-base flex items-center gap-3 uppercase tracking-wide">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                                    <Target className="w-4 h-4" />
                                                </div>
                                                Perincian Markah
                                            </h4>
                                            
                                            <div className="space-y-4 sm:space-y-5 text-sm sm:text-base">
                                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                    <div className="flex items-center gap-3 text-slate-600 font-medium">
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm shadow-sm border border-blue-100">👨</div>
                                                        Jumlah Markah Lelaki
                                                    </div>
                                                    <span className="font-bold text-blue-700 text-xl">{menVsWomenData.menTotal}</span>
                                                </div>
                                                
                                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                    <div className="flex items-center gap-3 text-slate-600 font-medium">
                                                        <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-sm shadow-sm border border-pink-100">👩</div>
                                                        Markah Asas Wanita
                                                    </div>
                                                    <span className="font-bold text-pink-600 text-xl">
                                                        {menVsWomenData.womenTotal - (menVsWomenData.womenHandicap * menVsWomenData.womenCount)}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex justify-between items-center py-3 border-b border-slate-100 bg-amber-50/40 -mx-3 px-3 rounded-xl border border-amber-100/50">
                                                    <div className="flex items-center gap-3 text-slate-600 font-medium">
                                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm text-amber-700 shadow-sm border border-amber-200">➕</div>
                                                        <div>
                                                            <div className="text-amber-900 font-semibold">Handicap Wanita</div>
                                                            <div className="text-xs text-amber-600/80 mt-0.5 font-normal">{menVsWomenData.womenHandicap} pin × {menVsWomenData.womenCount} org</div>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-amber-600 text-xl bg-white px-3 py-1 rounded-lg shadow-sm border border-amber-100">
                                                        +{menVsWomenData.womenHandicap * menVsWomenData.womenCount}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex justify-between items-center pt-4 mt-2">
                                                    <div className="flex items-center gap-3 text-slate-800 font-bold">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm shadow-md text-white">🏆</div>
                                                        <span className="text-lg">Jumlah Akhir Wanita</span>
                                                    </div>
                                                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 text-3xl drop-shadow-sm">{menVsWomenData.womenTotal}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        </MemberLayout>
    );
}
`;

    const currentContent = fs.readFileSync('src/pages/member/blok.tsx', 'utf8');
    // Cari bahagian Double Game Dialog yang tamat
    const cutoffText = 'Kongsi\n                                                </Button>\n                                            </div>\n                                        </motion.div>\n                                    );\n                                })}\n                            </div>\n                        )}\n                    </DialogContent>\n                </Dialog>';
    
    const cutOffIndex = currentContent.indexOf(cutoffText);
    
    if (cutOffIndex !== -1) {
        const topPart = currentContent.substring(0, cutOffIndex + cutoffText.length);
        fs.writeFileSync('src/pages/member/blok.tsx', topPart + trioDialog + menVsWomenContent);
        console.log("SUCCESS: Bottom of blok.tsx replaced perfectly.");
    } else {
        console.error("FAILED: Could not find cutoff point.");
    }
} catch(e) {
    console.error(e);
}