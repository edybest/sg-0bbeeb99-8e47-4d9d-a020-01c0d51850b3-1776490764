import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { doubleService } from "@/services/doubleService";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { MemberLayout } from "@/components/member/MemberLayout";

import {
    Trophy,
    Sparkles,
    Loader2,
    ArrowLeft,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronRight,
    Users,
    Star,
    Crown,
    Share2,
    X,
    Camera,
    Target,
    Search
} from "lucide-react";

import { motion } from "framer-motion";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


// ─── Types ───────────────────────────────────────────────────────────────────

type GameSummary = Pick<
    Tables<"games">,
    "id" | "game_name" | "game_format" | "game_date" | "created_at" | "double_enabled"
> & {
    trio_enabled?: boolean;
    men_vs_women_enabled?: boolean;
    women_handicap?: number;
};

interface RawPlayerScore extends Tables<"game_players"> {
    member: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
        sex: string;
        bowling_technique: string | null;
    };
}

interface DoubleRecord {
    id: string;
    game_id: string;
    player1_id: string;
    player2_id: string;
    player1_score: number;
    player2_score: number;
    total_score: number;
    include_handicap: boolean;
    player1_handicap?: number;
    player2_handicap?: number;
    player1?: {
        id: string;
        username: string;
        full_name?: string;
        avatar_url: string | null;
    };
    player2?: {
        id: string;
        username: string;
        full_name?: string;
        avatar_url: string | null;
    };
}

interface TrioRecord {
    id: string;
    game_id: string;
    player1_id: string;
    player2_id: string;
    player3_id: string;
    player1_score: number;
    player2_score: number;
    player3_score: number;
    total_score: number;
    include_handicap: boolean;
    player1_handicap?: number;
    player2_handicap?: number;
    player3_handicap?: number;
    player1?: {
        id: string;
        username: string;
        full_name?: string;
        avatar_url: string | null;
    };
    player2?: {
        id: string;
        username: string;
        full_name?: string;
        avatar_url: string | null;
    };
    player3?: {
        id: string;
        username: string;
        full_name?: string;
        avatar_url: string | null;
    };
}

interface LeaderboardEntry {
    id: string;
    member: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
        sex: string;
        bowling_technique: string | null;
    };
    game1_score: number;
    game2_score: number;
    game3_score: number;
    game4_score: number;
    game5_score: number;
    handicap: number;
    total_score: number;
    overall_score: number;
    average_score: number;
    difference: number;
    rank: number;
    clean_game: boolean;
}

interface ParticleEntry {
    id: string;
    x: number;
    y: number;
    dir: number;
}

type SortField =
    | "rank"
    | "username"
    | "game1_score"
    | "game2_score"
    | "game3_score"
    | "game4_score"
    | "game5_score"
    | "handicap"
    | "total_score"
    | "overall_score"
    | "average_score"
    | "difference";

type SortDirection = "asc" | "desc";

// ─── Constants ───────────────────────────────────────────────────────────────

const STICKY_LEFT = {
    rank: "left-0",
    avatar: "left-14",
    player: "left-28",
    overall: "left-[13rem]",
    diff: "left-[19rem]",
};

const MAX_LIKES_PER_GAME = 5;

// ─── Pure helpers ────────────────────────────────────────────────────────────

function sortData(
    data: LeaderboardEntry[],
    field: SortField,
    direction: SortDirection
): LeaderboardEntry[] {
    return [...data].sort((a, b) => {
        const aValue = field === "username" ? a.member.username.toLowerCase() : a[field];
        const bValue = field === "username" ? b.member.username.toLowerCase() : b[field];

        if (typeof aValue === "string" && typeof bValue === "string") {
            return direction === "asc"
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        return direction === "asc"
            ? Number(aValue) - Number(bValue)
            : Number(bValue) - Number(aValue);
    });
}

function buildLeaderboard(scores: RawPlayerScore[]): LeaderboardEntry[] {
    const sortedByRules = [...scores].sort((a, b) => {
        if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
        if (b.game5_score !== a.game5_score) return b.game5_score - a.game5_score;
        if (b.game4_score !== a.game4_score) return b.game4_score - a.game4_score;
        if (b.game3_score !== a.game3_score) return b.game3_score - a.game3_score;
        if (b.game2_score !== a.game2_score) return b.game2_score - a.game2_score;
        return b.game1_score - a.game1_score;
    });

    const topScore = sortedByRules[0]?.overall_score ?? 0;

    return sortedByRules.map((entry, index) => ({
        id: entry.id,
        member: entry.member,
        game1_score: entry.game1_score ?? 0,
        game2_score: entry.game2_score ?? 0,
        game3_score: entry.game3_score ?? 0,
        game4_score: entry.game4_score ?? 0,
        game5_score: entry.game5_score ?? 0,
        handicap: entry.handicap ?? 0,
        total_score: entry.total_score ?? 0,
        overall_score: entry.overall_score ?? 0,
        average_score: entry.average_score ?? 0,
        difference: index === 0 ? 0 : topScore - (entry.overall_score ?? 0),
        rank: index + 1,
        clean_game: entry.clean_game ?? false,
    }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BlokPage() {
    const router = useRouter();
    const { loading: authLoading, member: currentUser } = useAuth(false);
    const { toast } = useToast();

    const [games, setGames] = useState < GameSummary[] > ([]);
    const [selectedGame, setSelectedGame] = useState < string | null > (null);

    const [loadingGames, setLoadingGames] = useState(true);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState < string | null > (null);

    const [leaderboardBase, setLeaderboardBase] = useState < LeaderboardEntry[] > ([]);
    const [leaderboard, setLeaderboard] = useState < LeaderboardEntry[] > ([]);

    const [cleanGameDialogOpen, setCleanGameDialogOpen] = useState(false);
    const [cleanGameDataByGame, setCleanGameDataByGame] = useState < Record < number, Array< { member_name: string; avatar_url: string | null; prize: number } >>> ({});
    const [loadingCleanGame, setLoadingCleanGame] = useState(false);

    const [doubleRecords, setDoubleRecords] = useState < DoubleRecord[] > ([]);
    const [isDoubleDialogOpen, setIsDoubleDialogOpen] = useState(false);
    const [loadingDoubles, setLoadingDoubles] = useState(false);

    const [trioRecords, setTrioRecords] = useState < TrioRecord[] > ([]);
    const [isTrioDialogOpen, setIsTrioDialogOpen] = useState(false);
    const [loadingTrios, setLoadingTrios] = useState(false);

    const [isMenVsWomenDialogOpen, setIsMenVsWomenDialogOpen] = useState(false);
    const [menVsWomenData, setMenVsWomenData] = useState<{
        menTotal: number;
        womenTotal: number;
        menCount: number;
        womenCount: number;
        womenHandicap: number;
    } | null>(null);

    const [loadingMenVsWomen, setLoadingMenVsWomen] = useState(false);

    const menVsWomenRef = useRef < HTMLDivElement > (null);

    const handleOpenMenVsWomenDialog = async () => {
        if (!selectedGame) return;

        setIsMenVsWomenDialogOpen(true);
        setLoadingMenVsWomen(true);

        try {
            const currentGame = games.find(g => g.id === selectedGame);
            const womenHandicap = currentGame?.women_handicap || 0;

            const { data: gamePlayers, error } = await supabase
                .from("game_players")
                .select(`
                    total_score,
                    exclude_from_men_vs_women,
                    member:members!game_players_member_id_fkey (
                        sex
                    )
                `)
                .eq("game_id", selectedGame);

            if (error) throw error;

            let menTotal = 0;
            let womenTotal = 0;
            let menCount = 0;
            let womenCount = 0;

            (gamePlayers || []).forEach((gp: any) => {
                if (gp.exclude_from_men_vs_women) return;

                const score = gp.total_score || 0;
                const sex = gp.member?.sex;

                if (sex === "men") {
                    menTotal += score;
                    menCount++;
                } else if (sex === "women") {
                    womenTotal += score;
                    womenCount++;
                }
            });

            const womenFinalTotal = womenTotal + (womenHandicap * womenCount);

            setMenVsWomenData({
                menTotal,
                womenTotal: womenFinalTotal,
                menCount,
                womenCount,
                womenHandicap,
            });
        } catch (err) {
            console.error("Error loading Men vs Women data:", err);
            toast({
                title: "Error",
                description: "Failed to load Men vs Women data",
                variant: "destructive",
            });
        } finally {
            setLoadingMenVsWomen(false);
        }
    };

    const handleRetry = () => setRetryCount((prev) => prev + 1);

    const handleSort = (field: SortField) => {
        const newDirection: SortDirection =
            field === sortField
                ? sortDirection === "asc"
                    ? "desc"
                    : "asc"
                : field === "rank" || field === "username"
                    ? "asc"
                    : "desc";

        setSortField(field);
        setSortDirection(newDirection);
        setLeaderboard(applyCurrentSort(leaderboardBase, field, newDirection));
    };

    const buildDoubleShareMessage = useCallback(
        (record: DoubleRecord, rank: number) => {
            const gameName = games.find((game) => game.id === selectedGame)?.game_name ?? "Blok";
            const memberNames = [
                record.player1?.username ? `@${record.player1.username}` : "@Unknown",
                record.player2?.username ? `@${record.player2.username}` : "@Unknown",
            ];

            return [
                "🏆 Keputusan Double Score AMBC Club",
                `Game: ${gameName}`,
                `Ranking: #${rank}`,
                `Pasukan: ${memberNames.join(" + ")}`,
                `${record.include_handicap ? "Jumlah termasuk handicap" : "Jumlah tanpa handicap"}: ${record.total_score}`,
            ].join("\n");
        },
        [games, selectedGame]
    );

    const handleShareDouble = useCallback(
        async (record: DoubleRecord, rank: number) => {
            const shareText = buildDoubleShareMessage(record, rank);
            const shareUrl =
                typeof window !== "undefined"
                    ? `${window.location.origin}${router.asPath}`
                    : undefined;
            const sharePayload = {
                title: `Double Score #${rank} - AMBC Club`,
                text: shareText,
                url: shareUrl,
            };

            try {
                if (typeof navigator !== "undefined" && navigator.share) {
                    await navigator.share(sharePayload);
                    return;
                }

                if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(
                        shareUrl ? `${shareText}\n${shareUrl}` : shareText
                    );
                    toast({
                        title: "Teks perkongsian disalin",
                        description: "Keputusan double sudah disalin dan sedia untuk dikongsi.",
                    });
                    return;
                }

                toast({
                    title: "Perkongsian tidak disokong",
                    description: "Browser ini tidak menyokong fungsi kongsi atau salin.",
                    variant: "destructive",
                });
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }

                toast({
                    title: "Gagal berkongsi",
                    description: "Cuba semula atau gunakan browser yang menyokong fungsi kongsi.",
                    variant: "destructive",
                });
            }
        },
        [buildDoubleShareMessage, router.asPath, toast]
    );

    const buildTrioShareMessage = useCallback(
        (record: TrioRecord, rank: number) => {
            const gameName = games.find((game) => game.id === selectedGame)?.game_name ?? "Blok";
            const memberNames = [
                record.player1?.username ? `@${record.player1.username}` : "@Unknown",
                record.player2?.username ? `@${record.player2.username}` : "@Unknown",
                record.player3?.username ? `@${record.player3.username}` : "@Unknown",
            ];

            return [
                "🏆 Keputusan Trio Score AMBC Club",
                `Game: ${gameName}`,
                `Ranking: #${rank}`,
                `Pasukan: ${memberNames.join(" + ")}`,
                `${record.include_handicap ? "Jumlah termasuk handicap" : "Jumlah tanpa handicap"}: ${record.total_score}`,
            ].join("\n");
        },
        [games, selectedGame]
    );

    const handleShareTrio = useCallback(
        async (record: TrioRecord, rank: number) => {
            const shareText = buildTrioShareMessage(record, rank);
            const shareUrl =
                typeof window !== "undefined"
                    ? `${window.location.origin}${router.asPath}`
                    : undefined;
            const sharePayload = {
                title: `Trio Score #${rank} - AMBC Club`,
                text: shareText,
                url: shareUrl,
            };

            try {
                if (typeof navigator !== "undefined" && navigator.share) {
                    await navigator.share(sharePayload);
                    return;
                }

                if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(
                        shareUrl ? `${shareText}\n${shareUrl}` : shareText
                    );
                    toast({
                        title: "Teks perkongsian disalin",
                        description: "Keputusan trio sudah disalin dan sedia untuk dikongsi.",
                    });
                    return;
                }

                toast({
                    title: "Perkongsian tidak disokong",
                    description: "Browser ini tidak menyokong fungsi kongsi atau salin.",
                    variant: "destructive",
                });
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }

                toast({
                    title: "Gagal berkongsi",
                    description: "Cuba semula atau gunakan browser yang menyokong fungsi kongsi.",
                    variant: "destructive",
                });
            }
        },
        [buildTrioShareMessage, router.asPath, toast]
    );

    const getSortIcon = (field: SortField) => {
        if (sortField !== field)
            return (
                <ArrowUpDown className="w-4 h-4 ml-1 opacity-20 hover:opacity-100 transition-opacity" />
            );
        return sortDirection === "asc"
            ? (
                <ArrowUp className="w-4 h-4 ml-1 text-sky-600" />
            )
            : (
                <ArrowDown className="w-4 h-4 ml-1 text-sky-600" />
            );
    };

    // ─── Rank display ─────────────────────────────────────────────────────────

    const getRankDisplay = (rank: number) => {
        switch (rank) {
            case 1:
                return (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 10 }}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-lg font-bold text-white border-2 border-yellow-300 shadow-lg"
                    >
                        1
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 180, damping: 12 }}
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-base font-bold text-white border-2 border-gray-200 shadow-md"
                    >
                        2
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 160, damping: 14 }}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-sm font-bold text-white border-2 border-amber-500 shadow-md"
                    >
                        3
                    </motion.div>
                );
            default:
                return (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + rank * 0.02, type: "spring" }}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-bold text-sky-600 border-2 border-sky-300 shadow-sm"
                    >
                        {rank}
                    </motion.div>
                );
        }
    };

    const formatScore = (score: number | null, rowId: string) => {
        if (score === null || score === 0) return "-";
        return (
            <span
                className={`${score >= 200 ? "text-emerald-600 font-bold" : ""} ${animatingScores.has(rowId) ? "score-changed" : ""
                    }`}
            >
                {score}
            </span>
        );
    };

    // ─── Error state ──────────────────────────────────────────────────────────

    if (error && !loadingGames) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
                <header className="bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg sticky top-0 z-40">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push("/member")}
                                className="text-white hover:bg-white/20"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-sky-900">Blok Leaderboard</h1>
                                <p className="text-sm text-sky-100">Kedudukan Semasa</p>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="container mx-auto px-4 py-8">
                    <Card className="max-w-md mx-auto">
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="text-red-500 text-5xl">⚠️</div>
                            <h2 className="text-xl font-semibold">Connection Error</h2>
                            <p className="text-sky-600">{error}</p>
                            <div className="bg-sky-100 p-3 rounded text-xs text-left">
                                <p className="font-mono text-sky-700 break-all">{error}</p>
                            </div>
                            <div className="text-sm text-sky-500">
                                Please check browser console (F12) for more details.
                            </div>
                            <Button
                                onClick={handleRetry}
                                className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                            >
                                Try Again
                            </Button>
                            <Button
                                onClick={() => router.push("/member")}
                                variant="outline"
                                className="w-full text-sky-600 border-sky-200"
                            >
                                Back to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    // ─── Loading state ────────────────────────────────────────────────────────

    if (isPageLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <header className="sticky top-0 z-40 bg-white border-b border-sky-200 shadow-sm">
                    <div className="container mx-auto px-4 py-4 flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/member")}
                            className="text-sky-700 hover:text-blue-600"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-sky-900">Blok Leaderboard</h1>
                            <p className="text-sm text-sky-600">Kedudukan Semasa</p>
                        </div>
                    </div>
                </header>
                <main className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto" />
                            <p className="text-sky-600">Loading games...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ─── Main render ──────────────────────────────────────────────────────────

    return (
        <MemberLayout>
            <>
                <style jsx global>{`
                    @keyframes scoreChange {
                        0%   { transform: scale(1);   background-color: transparent; }
                        50%  { transform: scale(1.1); background-color: rgb(254, 240, 138); }
                        100% { transform: scale(1);   background-color: transparent; }
                    }
                    .score-changed { animation: scoreChange 1s ease-in-out; }
                `}</style>

                <SEO
                    title="Blok Leaderboard - AMBC Club"
                    description="View Blok game leaderboard and rankings"
                />

                <div className="min-h-screen bg-white">
                    {/* ── Header ── */}
                    <header className="sticky top-0 z-40 bg-white border-b border-sky-200 shadow-sm">
                        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => router.push("/member")}
                                        className="text-sky-700 hover:text-blue-600 flex-shrink-0"
                                    >
                                        <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                                    </Button>
                                    <div className="min-w-0">
                                        <h1 className="text-lg md:text-xl font-bold text-sky-900 truncate">
                                            Blok Leaderboard
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="container mx-auto px-3 md:px-4 py-6">

                        {/* ── Game Selector + Most Liked ── */}
                        <div className="mb-6">
                            <Card className="bg-white border-sky-200 shadow-md">
                                <CardHeader className="border-b border-sky-100/50 pb-3 md:pb-4">
                                    <CardTitle className="text-sky-900 flex items-center gap-2 text-lg md:text-xl">
                                        <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                                        Pilih Game
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 md:pt-6">
                                    {games.length === 0 ? (
                                        <div className="text-center py-6 text-sky-500">
                                            <p>Tiada game dijumpai</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <label className="text-sm font-medium text-sky-700">
                                                Sila pilih game untuk lihat leaderboard:
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={selectedGame || ""}
                                                    onChange={(e) => setSelectedGame(e.target.value)}
                                                    className="w-full px-3 md:px-4 py-2.5 md:py-3 pr-10 rounded-lg border-2 border-sky-200 bg-white text-sky-900 font-semibold focus:border-sky-500 focus:ring-0 shadow-sm text-sm md:text-base appearance-none cursor-pointer"
                                                >
                                                    {games.map((game) => (
                                                        <option key={game.id} value={game.id}>
                                                            {game.game_name} (
                                                            {new Date(game.game_date).toLocaleDateString("ms-MY", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                            })}
                                                            )
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sky-600">
                                                    <ChevronRight className="w-5 h-5 rotate-90" />
                                                </div>
                                            </div>

                                            {/* Double Game Button */}
                                            {selectedGame && games.find(g => g.id === selectedGame)?.double_enabled && (
                                                <Button
                                                    variant="outline"
                                                    className="w-full mt-2 border-2 border-blue-500 text-blue-700 hover:bg-blue-50"
                                                    onClick={handleOpenDoubleDialog}
                                                >
                                                    <Users className="w-4 h-4 mr-2" />
                                                    Score Double
                                                </Button>
                                            )}

                                            {/* Trio Game Button */}
                                            {selectedGame && games.find(g => g.id === selectedGame)?.trio_enabled && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (selectedGame) {
                                                            const game = games.find(g => g.id === selectedGame);
                                                            if (game) {
                                                                router.push(`/member/trio?date=${game.game_date}`);
                                                            }
                                                        }
                                                    }}
                                                    className="w-full mt-2 border-2 border-purple-500 text-purple-700 hover:bg-purple-50"
                                                >
                                                    <Users className="w-4 h-4 mr-2" />
                                                    Score Trio
                                                </Button>
                                            )}

                                            {/* Men vs Women Button */}
                                            {selectedGame && games.find(g => g.id === selectedGame)?.men_vs_women_enabled && (
                                                <Button
                                                    variant="outline"
                                                    onClick={handleOpenMenVsWomenDialog}
                                                    className="flex-1 h-16 text-lg font-bold transition-all hover:border-pink-400 hover:text-pink-600 hover:bg-pink-50"
                                                >
                                                    <Users className="w-6 h-6 mr-2" />
                                                    Men vs Women
                                                </Button>
                                            )}

                                            {/* Clean Game Button */}
                                            {selectedGame && leaderboard.some((p) => p.clean_game) && (
                                                <Button
                                                    variant="outline"
                                                    className="w-full mt-2 border-2 border-amber-500 text-amber-700 hover:bg-amber-50"
                                                    onClick={handleOpenCleanGameDialog}
                                                >
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    Clean Game Winners
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Clean Game Section has been removed and replaced by the single button above */}

                        {/* ── Clean Game Dialog ── */}
                        <Dialog open={isDoubleDialogOpen} onOpenChange={setIsDoubleDialogOpen}>
                            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                                        <Sparkles className="w-5 h-5 text-amber-500" />
                                        Clean Game Winners
                                    </DialogTitle>
                                </DialogHeader>
                                {loadingCleanGame ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                    </div>
                                ) : Object.keys(cleanGameDataByGame).length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">Tiada data clean game dijumpai.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4, 5].map((gameNum) => {
                                            const winners = cleanGameDataByGame[gameNum] || [];
                                            return (
                                                <div key={`game-${gameNum}`} className="bg-amber-50/50 rounded-lg p-3 border border-amber-100/50">
                                                    <div className="font-bold text-amber-900 border-b border-amber-200 pb-2 mb-2">
                                                        Game {gameNum}
                                                    </div>
                                                    {winners.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {winners.map((winner, index) => (
                                                                <div key={index} className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        {winner.avatar_url ? (
                                                                            <Image
                                                                                src={winner.avatar_url}
                                                                                alt={winner.member_name}
                                                                                width={32}
                                                                                height={32}
                                                                                className="w-8 h-8 rounded-full object-cover border-2 border-white"
                                                                                loading="lazy"
                                                                                unoptimized
                                                                            />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-sm border-2 border-white">
                                                                                {winner.member_name[0].toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <div className="font-bold text-sm text-slate-800">{winner.member_name}</div>
                                                                            <div className="text-xs text-amber-600/80 mt-0.5 font-normal">Pemenang</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="font-bold text-emerald-600">
                                                                        RM {winner.prize.toFixed(2)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-slate-500 italic">Tiada pemenang</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>



                        {/* ── menvswomen Game Dialog ── */}
                        <Dialog open={isMenVsWomenDialogOpen} onOpenChange={setIsMenVsWomenDialogOpen}>
                            <DialogContent
                                className="w-[96vw] max-w-[96vw] sm:max-w-2xl p-0 bg-slate-50 border-0 rounded-2xl sm:rounded-3xl shadow-2xl [&>button]:hidden max-h-[88vh] overflow-y-auto overflow-x-hidden"
                            >
                                <div
                                    ref={menVsWomenRef}
                                    className="bg-slate-50"
                                >
                                    <div
                                        className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-4 sm:px-5 sm:py-5 text-white flex items-start sm:items-center justify-between gap-3 shadow-md sticky top-0 z-20"
                                    >
                                        <DialogTitle className="flex items-center gap-3 min-w-0 text-base sm:text-xl font-bold">
                                            <div className="bg-white/20 p-2 rounded-xl shrink-0">
                                                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="truncate leading-tight">Men vs Women</div>
                                                <div className="text-xs sm:text-base text-white/80 truncate font-medium mt-0.5">
                                                    {games.find((g) => g.id === selectedGame)?.game_name}
                                                </div>
                                            </div>
                                        </DialogTitle>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => setIsMenVsWomenDialogOpen(false)}
                                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                                title="Tutup"
                                            >
                                                <X className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 sm:p-6 pb-6 sm:pb-8">
                                        {loadingMenVsWomen ? (
                                            <div className="flex flex-col items-center justify-center py-16">
                                                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                                                <p className="text-slate-500 font-medium">Mengira markah pertempuran...</p>
                                            </div>
                                        ) : !menVsWomenData ? (
                                            <div className="text-center py-16 text-slate-400">
                                                <div className="bg-slate-200/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Users className="h-10 w-10 opacity-50" />
                                                </div>
                                                <p className="text-sm sm:text-base font-medium">Tiada data Men vs Women</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-5 sm:space-y-8">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 relative">
                                                    <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-white rounded-full flex items-center justify-center text-3xl font-black shadow-lg border-4 border-slate-50">
                                                        VS
                                                    </div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 12 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={`relative overflow-hidden rounded-3xl p-4 sm:p-7 border shadow-sm ${menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                                ? "bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 border-transparent text-white"
                                                                : "bg-white border-blue-100"
                                                            }`}
                                                    >
                                                        <div className="relative z-10 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div
                                                                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl shrink-0 ${menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                                            ? "bg-white/20"
                                                                            : "bg-blue-50 border border-blue-100"
                                                                        }`}
                                                                >
                                                                    👨
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <div
                                                                        className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                                                ? "text-white/80"
                                                                                : "text-slate-500"
                                                                            }`}
                                                                    >
                                                                        Men Team
                                                                    </div>
                                                                    <div
                                                                        className={`text-xs sm:text-sm ${menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                                                ? "text-white/70"
                                                                                : "text-slate-400"
                                                                            }`}
                                                                    >
                                                                        {menVsWomenData.menCount} pemain
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div
                                                                className={`text-3xl sm:text-6xl font-black leading-none shrink-0 ${menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                                        ? "text-white"
                                                                        : "text-pink-600"
                                                                    }`}
                                                            >
                                                                {menVsWomenData.menTotal}
                                                            </div>
                                                        </div>
                                                    </motion.div>

                                                    <div className="flex sm:hidden justify-center -my-1 relative z-20">
                                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-sm text-slate-800 shadow-md border-2 border-slate-100">
                                                            VS
                                                        </div>
                                                    </div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 12 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                        className={`relative overflow-hidden rounded-3xl p-4 sm:p-7 border shadow-sm ${menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                                ? "bg-gradient-to-br from-pink-600 via-pink-500 to-rose-400 border-transparent text-white"
                                                                : "bg-white border-pink-100"
                                                            }`}
                                                    >
                                                        <div className="relative z-10 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div
                                                                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl shrink-0 ${menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                                            ? "bg-white/20"
                                                                            : "bg-pink-50 border border-pink-100"
                                                                        }`}
                                                                >
                                                                    👩
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <div
                                                                        className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                                                ? "text-white/80"
                                                                                : "text-slate-500"
                                                                            }`}
                                                                    >
                                                                        Women Team
                                                                    </div>
                                                                    <div
                                                                        className={`text-xs sm:text-sm ${menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                                                ? "text-white/70"
                                                                                : "text-slate-400"
                                                                            }`}
                                                                    >
                                                                        {menVsWomenData.womenCount} pemain
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div
                                                                className={`text-3xl sm:text-6xl font-black leading-none shrink-0 ${menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                                        ? "text-white"
                                                                        : "text-pink-600"
                                                                    }`}
                                                            >
                                                                {menVsWomenData.womenTotal}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </div>

                                                <motion.div
                                                    initial={{ scale: 0.98, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: 0.2 }}
                                                    className="rounded-3xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 p-[1px] shadow-lg"
                                                >
                                                    <div className="bg-white rounded-3xl px-4 py-4 sm:px-6 sm:py-5 text-center">
                                                        <div className="flex items-center justify-center gap-2 mb-2">
                                                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
                                                            <h3 className="text-base sm:text-2xl font-black text-slate-800 leading-tight">
                                                                {menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                                    ? "Kemenangan Lelaki!"
                                                                    : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                                        ? "Kemenangan Wanita!"
                                                                        : "Perlawanan Seri!"}
                                                            </h3>
                                                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
                                                        </div>

                                                        <div className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-bold">
                                                            <span>Beza Markah:</span>
                                                            <span className="text-amber-400">
                                                                {Math.abs(menVsWomenData.menTotal - menVsWomenData.womenTotal)} pin
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>

                                                <motion.div
                                                    initial={{ opacity: 0, y: 14 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.3 }}
                                                    className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm"
                                                >
                                                    <h4 className="font-bold text-slate-800 mb-4 text-sm sm:text-base flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shrink-0">
                                                            <Target className="w-4 h-4" />
                                                        </div>
                                                        Perincian Markah
                                                    </h4>

                                                    <div className="space-y-3 text-sm sm:text-base">
                                                        <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100">
                                                            <div className="flex items-center gap-3 text-slate-600 font-medium min-w-0">
                                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                                                                    👨
                                                                </div>
                                                                <span className="truncate">Jumlah Markah Lelaki</span>
                                                            </div>
                                                            <span className="font-bold text-blue-700 text-lg sm:text-xl shrink-0">
                                                                {menVsWomenData.menTotal}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100">
                                                            <div className="flex items-center gap-3 text-slate-600 font-medium min-w-0">
                                                                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center border border-pink-100 shrink-0">
                                                                    👩
                                                                </div>
                                                                <span className="truncate">Markah Asas Wanita</span>
                                                            </div>
                                                            <span className="font-bold text-pink-600 text-lg sm:text-xl shrink-0">
                                                                {menVsWomenData.womenTotal - (menVsWomenData.womenHandicap * menVsWomenData.womenCount)}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-3 py-3 px-3 rounded-2xl bg-amber-50 border border-amber-100">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                                                    ➕
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-amber-900 font-semibold">Handicap Wanita</div>
                                                                    <div className="text-xs text-amber-700 truncate">
                                                                        {menVsWomenData.womenHandicap} pin × {menVsWomenData.womenCount} org
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span className="font-bold text-amber-700 text-base sm:text-lg shrink-0">
                                                                +{menVsWomenData.womenHandicap * menVsWomenData.womenCount}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-3 pt-2">
                                                            <div className="flex items-center gap-3 text-slate-800 font-bold min-w-0">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                                                                    🏆
                                                                </div>
                                                                <span className="truncate">Jumlah Akhir Wanita</span>
                                                            </div>
                                                            <span className="font-black text-pink-600 text-2xl sm:text-3xl shrink-0">
                                                                {menVsWomenData.womenTotal}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </main>
                </div>
            </>
        </MemberLayout>
    );
}