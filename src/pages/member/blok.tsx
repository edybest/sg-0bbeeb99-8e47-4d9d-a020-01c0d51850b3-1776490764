import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { motion } from "framer-motion";
import {
    Trophy,
    Loader2,
    ArrowLeft,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronRight,
} from "lucide-react";

import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { MobileNav } from "@/components/member/MobileNav";
import { PageAccessGuard } from "@/components/PageAccessGuard";

type GameSummary = Pick<
    Tables<"games">,
    "id" | "game_name" | "game_format" | "game_date" | "created_at"
>;

interface RawPlayerScore extends Tables<"game_players"> {
    member: {
        id: string;
        username: string;
        full_name: string;
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

const STICKY_LEFT = {
    rank: "left-0",
    avatar: "left-14",
    player: "left-28",
    overall: "left-[13rem]",
    diff: "left-[19rem]",
};

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
        if ((b.overall_score ?? 0) !== (a.overall_score ?? 0)) {
            return (b.overall_score ?? 0) - (a.overall_score ?? 0);
        }
        if ((b.game5_score ?? 0) !== (a.game5_score ?? 0)) {
            return (b.game5_score ?? 0) - (a.game5_score ?? 0);
        }
        if ((b.game4_score ?? 0) !== (a.game4_score ?? 0)) {
            return (b.game4_score ?? 0) - (a.game4_score ?? 0);
        }
        if ((b.game3_score ?? 0) !== (a.game3_score ?? 0)) {
            return (b.game3_score ?? 0) - (a.game3_score ?? 0);
        }
        if ((b.game2_score ?? 0) !== (a.game2_score ?? 0)) {
            return (b.game2_score ?? 0) - (a.game2_score ?? 0);
        }
        return (b.game1_score ?? 0) - (a.game1_score ?? 0);
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
    }));
}

export default function BlokPage() {
    const router = useRouter();
    const { loading: authLoading } = useAuth(true);
    const { toast } = useToast();

    const animationTimeoutRef = useRef < number | null > (null);
    const lastLoadedGameRef = useRef < string | null > (null);

    const [games, setGames] = useState < GameSummary[] > ([]);
    const [selectedGame, setSelectedGame] = useState < string | null > (null);

    const [loadingGames, setLoadingGames] = useState(true);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [error, setError] = useState < string | null > (null);

    const [leaderboardBase, setLeaderboardBase] = useState < LeaderboardEntry[] > ([]);
    const [leaderboard, setLeaderboard] = useState < LeaderboardEntry[] > ([]);
    const [previousLeaderboard, setPreviousLeaderboard] = useState < LeaderboardEntry[] > ([]);
    const [expandedRow, setExpandedRow] = useState < string | null > (null);
    const [animatingScores, setAnimatingScores] = useState < Set < string >> (new Set());
    const [retryCount, setRetryCount] = useState(0);

    const [sortField, setSortField] = useState < SortField > ("rank");
    const [sortDirection, setSortDirection] = useState < SortDirection > ("asc");

    const isInitialLoading = loadingGames && games.length === 0;
    const isPageLoading = authLoading || isInitialLoading;

    const clearScoreAnimationTimer = useCallback(() => {
        if (animationTimeoutRef.current) {
            window.clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = null;
        }
    }, []);

    const applyCurrentSort = useCallback(
        (baseData: LeaderboardEntry[], field: SortField, direction: SortDirection) => {
            if (field === "rank") {
                return direction === "asc" ? [...baseData] : [...baseData].reverse();
            }
            return sortData(baseData, field, direction);
        },
        []
    );

    const triggerScoreAnimation = useCallback(
        (changedIds: Set<string>) => {
            if (changedIds.size === 0) return;

            clearScoreAnimationTimer();
            setAnimatingScores(changedIds);

            animationTimeoutRef.current = window.setTimeout(() => {
                setAnimatingScores(new Set());
                animationTimeoutRef.current = null;
            }, 1000);
        },
        [clearScoreAnimationTimer]
    );

    const loadGames = useCallback(
        async (showToast = false) => {
            try {
                setLoadingGames(true);
                setError(null);

                const { data, error: dbError } = await supabase
                    .from("games")
                    .select("id, game_name, game_format, game_date, created_at")
                    .order("game_date", { ascending: false });

                if (dbError) throw dbError;

                const gameList = data ?? [];
                setGames(gameList);

                if (gameList.length > 0) {
                    setSelectedGame((current) => {
                        if (current && gameList.some((game) => game.id === current)) return current;
                        return gameList[0].id;
                    });
                } else {
                    setSelectedGame(null);
                }

                if (showToast) {
                    toast({
                        title: "Data refreshed",
                        description: "Games loaded successfully.",
                    });
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load games";
                setError(message);

                if (showToast) {
                    toast({
                        title: "Connection error",
                        description: message,
                        variant: "destructive",
                    });
                }
            } finally {
                setLoadingGames(false);
            }
        },
        [toast]
    );

    const loadLeaderboard = useCallback(
        async (gameId: string) => {
            if (!gameId) return;

            try {
                setLoadingLeaderboard(true);

                const isSameGameRefresh = lastLoadedGameRef.current === gameId;

                const { data: rawData, error: dbError } = await supabase
                    .from("game_players")
                    .select(
                        `
              *,
              member:members(id, username, full_name, avatar_url)
            `
                    )
                    .eq("game_id", gameId);

                if (dbError) throw dbError;

                const scores = (rawData ?? []) as unknown as RawPlayerScore[];
                const nextBase = buildLeaderboard(scores);

                const previousData = isSameGameRefresh ? previousLeaderboard : [];
                const changedIds = new Set < string > ();
                const notifications: string[] = [];

                if (previousData.length > 0) {
                    nextBase.forEach((newEntry) => {
                        const oldEntry = previousData.find((old) => old.id === newEntry.id);
                        if (!oldEntry) return;

                        const changes: string[] = [];

                        if (oldEntry.game1_score !== newEntry.game1_score) {
                            changes.push(`G1: ${oldEntry.game1_score} → ${newEntry.game1_score}`);
                        }
                        if (oldEntry.game2_score !== newEntry.game2_score) {
                            changes.push(`G2: ${oldEntry.game2_score} → ${newEntry.game2_score}`);
                        }
                        if (oldEntry.game3_score !== newEntry.game3_score) {
                            changes.push(`G3: ${oldEntry.game3_score} → ${newEntry.game3_score}`);
                        }
                        if (oldEntry.game4_score !== newEntry.game4_score) {
                            changes.push(`G4: ${oldEntry.game4_score} → ${newEntry.game4_score}`);
                        }
                        if (oldEntry.game5_score !== newEntry.game5_score) {
                            changes.push(`G5: ${oldEntry.game5_score} → ${newEntry.game5_score}`);
                        }

                        if (changes.length > 0) {
                            changedIds.add(newEntry.id);

                            const rankChange = oldEntry.rank - newEntry.rank;
                            const rankText =
                                rankChange > 0
                                    ? `↑${rankChange} (Rank ${newEntry.rank})`
                                    : rankChange < 0
                                        ? `↓${Math.abs(rankChange)} (Rank ${newEntry.rank})`
                                        : `(Rank ${newEntry.rank})`;

                            notifications.push(
                                `${newEntry.member.username} ${rankText}\n${changes.join(", ")}`
                            );
                        }
                    });
                }

                if (notifications.length > 0) {
                    toast({
                        title: "🎳 Skor Dikemaskini!",
                        description: (
                            <div className="mt-2 space-y-2">
                                {notifications.map((notification, index) => (
                                    <div
                                        key={index}
                                        className="whitespace-pre-line border-l-2 border-red-500 pl-2 text-sm"
                                    >
                                        {notification}
                                    </div>
                                ))}
                            </div>
                        ),
                        duration: 5000,
                    });
                }

                triggerScoreAnimation(changedIds);

                setPreviousLeaderboard(nextBase);
                setLeaderboardBase(nextBase);
                setLeaderboard(applyCurrentSort(nextBase, sortField, sortDirection));
                lastLoadedGameRef.current = gameId;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load leaderboard";
                toast({
                    title: "Error",
                    description: message,
                    variant: "destructive",
                });
            } finally {
                setLoadingLeaderboard(false);
            }
        },
        [applyCurrentSort, previousLeaderboard, sortField, sortDirection, toast, triggerScoreAnimation]
    );

    useEffect(() => {
        void loadGames();
    }, [loadGames, retryCount]);

    useEffect(() => {
        clearScoreAnimationTimer();

        setExpandedRow(null);
        setAnimatingScores(new Set());

        if (!selectedGame) {
            setPreviousLeaderboard([]);
            setLeaderboard([]);
            setLeaderboardBase([]);
            lastLoadedGameRef.current = null;
            return;
        }

        if (lastLoadedGameRef.current !== selectedGame) {
            setPreviousLeaderboard([]);
        }

        void loadLeaderboard(selectedGame);
    }, [selectedGame, loadLeaderboard, clearScoreAnimationTimer]);

    useEffect(() => {
        setLeaderboard(applyCurrentSort(leaderboardBase, sortField, sortDirection));
    }, [leaderboardBase, sortField, sortDirection, applyCurrentSort]);

    useEffect(() => {
        return () => {
            clearScoreAnimationTimer();
        };
    }, [clearScoreAnimationTimer]);

    const handleRetry = () => {
        setRetryCount((prev) => prev + 1);
    };

    const handleSort = (field: SortField) => {
        const nextDirection: SortDirection =
            field === sortField
                ? sortDirection === "asc"
                    ? "desc"
                    : "asc"
                : field === "rank" || field === "username"
                    ? "asc"
                    : "desc";

        setSortField(field);
        setSortDirection(nextDirection);
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="ml-1 h-4 w-4 opacity-20 transition-opacity hover:opacity-100" />;
        }

        return sortDirection === "asc" ? (
            <ArrowUp className="ml-1 h-4 w-4 text-red-600" />
        ) : (
            <ArrowDown className="ml-1 h-4 w-4 text-red-600" />
        );
    };

    const getRankDisplay = (rank: number) => {
        switch (rank) {
            case 1:
                return (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: [0, 1.2, 1], rotate: [180, 360, 0] }}
                        transition={{ type: "spring", stiffness: 200, damping: 10, duration: 0.8 }}
                        className="relative"
                    >
                        <motion.div
                            animate={{
                                boxShadow: [
                                    "0 0 20px rgba(234,179,8,0.3)",
                                    "0 0 40px rgba(234,179,8,0.6)",
                                    "0 0 20px rgba(234,179,8,0.3)",
                                ],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="rounded-full"
                        >
                            <Trophy className="h-10 w-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
                        </motion.div>
                        <motion.div
                            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 -z-10 rounded-full bg-yellow-400 blur-xl"
                        />
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div
                        initial={{ scale: 0, y: -50 }}
                        animate={{ scale: [0, 1.1, 1], y: [-50, 0, 0] }}
                        transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 12 }}
                        className="relative"
                    >
                        <motion.div
                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Trophy className="h-9 w-9 text-gray-400 drop-shadow-[0_0_12px_rgba(156,163,175,0.7)]" />
                        </motion.div>
                        <motion.div
                            animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 -z-10 rounded-full bg-gray-300 blur-lg"
                        />
                    </motion.div>
                );

            case 3:
                return (
                    <motion.div
                        initial={{ scale: 0, x: 50, opacity: 0 }}
                        animate={{ scale: [0, 1.15, 1], x: [50, 0, 0], opacity: [0, 1, 1] }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 160, damping: 14 }}
                        className="relative"
                    >
                        <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Trophy className="h-8 w-8 text-amber-700 drop-shadow-[0_0_10px_rgba(180,83,9,0.6)]" />
                        </motion.div>
                        <motion.div
                            animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 -z-10 rounded-full bg-amber-600 blur-lg"
                        />
                    </motion.div>
                );

            default:
                return (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4 + rank * 0.05, type: "spring" }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-bold text-gray-600 shadow-sm"
                    >
                        {rank}
                    </motion.div>
                );
        }
    };

    const formatScore = (score: number | null | undefined, rowId: string) => {
        if (score == null) return "-";

        return (
            <span
                className={[
                    score >= 200 ? "font-bold text-red-600" : "",
                    animatingScores.has(rowId) ? "score-changed" : "",
                ].join(" ")}
            >
                {score}
            </span>
        );
    };

    if (error && !loadingGames) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 shadow-sm backdrop-blur-md">
                    <div className="container mx-auto px-4">
                        <div className="flex h-16 items-center justify-between">
                            <div className="flex items-center gap-4">
                                <MobileNav />
                                <ClubLogo size="sm" />
                                <h1 className="text-xl font-bold text-gray-900">Blok Leaderboard</h1>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8">
                    <Card className="mx-auto max-w-md">
                        <CardContent className="space-y-4 pt-6 text-center">
                            <div className="text-5xl text-red-500">⚠️</div>
                            <h2 className="text-xl font-semibold">Connection Error</h2>
                            <p className="text-gray-600">{error}</p>

                            <div className="rounded bg-gray-100 p-3 text-left text-xs">
                                <p className="break-all font-mono text-gray-700">{error}</p>
                            </div>

                            <div className="text-sm text-gray-500">
                                Please check browser console (F12) for more details.
                            </div>

                            <Button onClick={handleRetry} className="w-full">
                                Try Again
                            </Button>

                            <Button
                                onClick={() => router.push("/member")}
                                variant="outline"
                                className="w-full"
                            >
                                Back to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    if (isPageLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 shadow-sm backdrop-blur-md">
                    <div className="container mx-auto px-4">
                        <div className="flex h-16 items-center justify-between">
                            <div className="flex items-center gap-4">
                                <MobileNav />
                                <ClubLogo size="sm" />
                                <h1 className="text-xl font-bold text-gray-900">Blok Leaderboard</h1>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8">
                    <div className="flex min-h-[400px] items-center justify-center">
                        <div className="space-y-4 text-center">
                            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
                            <p className="text-gray-600">Loading games...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <PageAccessGuard pagePath="/member/blok" requireAuth={true}>
            <>
                <style jsx global>{`
          @keyframes scoreChange {
            0% {
              transform: scale(1);
              background-color: transparent;
            }
            50% {
              transform: scale(1.1);
              background-color: rgb(254, 240, 138);
            }
            100% {
              transform: scale(1);
              background-color: transparent;
            }
          }

          .score-changed {
            animation: scoreChange 1s ease-in-out;
          }
        `}</style>

                <SEO
                    title="Blok Leaderboard - AMBC Club"
                    description="View Blok game leaderboard and rankings"
                />

                <div className="min-h-screen bg-white">
                    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
                        <div className="container mx-auto px-4 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => router.push("/member")}
                                        className="text-gray-700 hover:text-red-600"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>

                                    <ClubLogo size="sm" />

                                    <div>
                                        <h1 className="text-xl font-bold text-gray-900">Blok Leaderboard</h1>
                                        <p className="text-sm text-gray-600">Kedudukan Semasa</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="container mx-auto space-y-6 px-4 py-6">
                        <Card className="border-gray-200 bg-white shadow-md">
                            <CardHeader className="border-b border-gray-200">
                                <CardTitle className="text-gray-900">Pilih Game</CardTitle>
                                <CardDescription className="text-gray-600">
                                    Pilih game untuk melihat kedudukan
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-4">
                                {loadingGames && games.length === 0 ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                                    </div>
                                ) : games.length === 0 ? (
                                    <div className="py-8 text-center text-gray-500">Tiada game tersedia</div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                        {games.map((game) => (
                                            <motion.button
                                                key={game.id}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => setSelectedGame(game.id)}
                                                className={`rounded-lg border-2 p-4 text-left transition-all ${selectedGame === game.id
                                                        ? "border-red-600 bg-red-600 text-white shadow-lg"
                                                        : "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50"
                                                    }`}
                                            >
                                                <div className="font-semibold">{game.game_name}</div>
                                                <div className="text-sm opacity-80">
                                                    {new Date(game.game_date).toLocaleDateString("ms-MY")}
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {selectedGame && (
                            <Card className="overflow-hidden border-gray-200 bg-white shadow-md">
                                <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                                    <CardTitle className="flex items-center gap-2 text-gray-900">
                                        <Trophy className="h-5 w-5 text-yellow-500" />
                                        Leaderboard
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-0">
                                    {loadingLeaderboard ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                                            <span className="ml-3 text-gray-600">Memuatkan skor...</span>
                                        </div>
                                    ) : leaderboard.length === 0 ? (
                                        <div className="py-20 text-center text-gray-500">
                                            <Trophy className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                                            <p>Tiada skor untuk game ini</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="block space-y-2 p-2 md:hidden">
                                                {leaderboard.map((entry) => (
                                                    <Card
                                                        key={entry.id}
                                                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${animatingScores.has(entry.id)
                                                                ? "animate-pulse border-2 border-yellow-400 bg-yellow-50"
                                                                : ""
                                                            }`}
                                                        onClick={() =>
                                                            setExpandedRow((current) => (current === entry.id ? null : entry.id))
                                                        }
                                                    >
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="shrink-0">{getRankDisplay(entry.rank)}</div>

                                                                <div className="shrink-0">
                                                                    {entry.member.avatar_url ? (
                                                                        <Image
                                                                            src={entry.member.avatar_url}
                                                                            alt={entry.member.username}
                                                                            width={40}
                                                                            height={40}
                                                                            className="rounded-full border-2 border-gray-200"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-600">
                                                                            {entry.member.username[0]?.toUpperCase() ?? "?"}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0 flex-1">
                                                                    <div className="truncate text-sm font-semibold">
                                                                        {entry.member.username}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                        <span className="font-bold text-red-600">
                                                                            {entry.overall_score ?? "-"}
                                                                        </span>
                                                                        <span className="text-gray-400">•</span>
                                                                        <span>
                                                                            {entry.difference > 0
                                                                                ? `+${entry.difference}`
                                                                                : entry.difference}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <ChevronRight
                                                                    className={`h-5 w-5 text-gray-400 transition-transform ${expandedRow === entry.id ? "rotate-90" : ""
                                                                        }`}
                                                                />
                                                            </div>

                                                            {expandedRow === entry.id && (
                                                                <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                                                                    <div className="grid grid-cols-5 gap-2">
                                                                        {[
                                                                            ["G1", entry.game1_score],
                                                                            ["G2", entry.game2_score],
                                                                            ["G3", entry.game3_score],
                                                                            ["G4", entry.game4_score],
                                                                            ["G5", entry.game5_score],
                                                                        ].map(([label, score]) => (
                                                                            <div key={label} className="text-center">
                                                                                <div className="mb-1 text-xs text-gray-500">{label}</div>
                                                                                <div className="text-sm font-semibold">
                                                                                    {formatScore(Number(score), entry.id)}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                                                        <div className="rounded bg-gray-50 p-2">
                                                                            <div className="text-xs text-gray-500">Handicap</div>
                                                                            <div className="font-semibold">{entry.handicap ?? "-"}</div>
                                                                        </div>
                                                                        <div className="rounded bg-gray-50 p-2">
                                                                            <div className="text-xs text-gray-500">Total Games</div>
                                                                            <div className="font-semibold">
                                                                                {entry.total_score ?? "-"}
                                                                            </div>
                                                                        </div>
                                                                        <div className="rounded bg-gray-50 p-2">
                                                                            <div className="text-xs text-gray-500">Average</div>
                                                                            <div className="font-semibold">
                                                                                {entry.average_score ?? "-"}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>

                                            <div className="hidden md:block">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-[1200px] w-full">
                                                        <thead>
                                                            <tr className="border-b border-gray-200">
                                                                <th
                                                                    className={`sticky ${STICKY_LEFT.rank} z-20 cursor-pointer bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50`}
                                                                    onClick={() => handleSort("rank")}
                                                                >
                                                                    <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        #
                                                                        {getSortIcon("rank")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className={`sticky ${STICKY_LEFT.avatar} z-20 w-14 bg-white px-2 py-3 text-center`}
                                                                >
                                                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        Avatar
                                                                    </span>
                                                                </th>

                                                                <th
                                                                    className={`sticky ${STICKY_LEFT.player} z-20 min-w-[160px] cursor-pointer bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50`}
                                                                    onClick={() => handleSort("username")}
                                                                >
                                                                    <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        Player
                                                                        {getSortIcon("username")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className={`sticky ${STICKY_LEFT.overall} z-20 cursor-pointer bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50`}
                                                                    onClick={() => handleSort("overall_score")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        Overall
                                                                        {getSortIcon("overall_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className={`sticky ${STICKY_LEFT.diff} z-20 cursor-pointer bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50`}
                                                                    onClick={() => handleSort("difference")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        Diff
                                                                        {getSortIcon("difference")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className="cursor-pointer border-l border-gray-200 px-3 py-3 text-center transition-colors hover:bg-gray-50"
                                                                    onClick={() => handleSort("game1_score")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        G1
                                                                        {getSortIcon("game1_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className="cursor-pointer px-3 py-3 text-center transition-colors hover:bg-gray-50"
                                                                    onClick={() => handleSort("game2_score")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        G2
                                                                        {getSortIcon("game2_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className="cursor-pointer px-3 py-3 text-center transition-colors hover:bg-gray-50"
                                                                    onClick={() => handleSort("game3_score")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        G3
                                                                        {getSortIcon("game3_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className="cursor-pointer px-3 py-3 text-center transition-colors hover:bg-gray-50"
                                                                    onClick={() => handleSort("game4_score")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        G4
                                                                        {getSortIcon("game4_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className="cursor-pointer px-3 py-3 text-center transition-colors hover:bg-gray-50"
                                                                    onClick={() => handleSort("game5_score")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        G5
                                                                        {getSortIcon("game5_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className="cursor-pointer border-l border-gray-200 px-3 py-3 text-center transition-colors hover:bg-gray-50"
                                                                    onClick={() => handleSort("handicap")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        HCP
                                                                        {getSortIcon("handicap")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className="cursor-pointer px-3 py-3 text-center transition-colors hover:bg-gray-50"
                                                                    onClick={() => handleSort("total_score")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        Total
                                                                        {getSortIcon("total_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                                                                    className="cursor-pointer px-3 py-3 text-center transition-colors hover:bg-gray-50"
                                                                    onClick={() => handleSort("average_score")}
                                                                >
                                                                    <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                                                                        Avg
                                                                        {getSortIcon("average_score")}
                                                                    </div>
                                                                </th>
                                                            </tr>
                                                        </thead>

                                                        <tbody>
                                                            {leaderboard.map((entry) => (
                                                                <tr
                                                                    key={entry.id}
                                                                    className={`border-b transition-all duration-500 ${animatingScores.has(entry.id)
                                                                            ? "animate-pulse bg-yellow-100"
                                                                            : "hover:bg-gray-50"
                                                                        }`}
                                                                >
                                                                    <td
                                                                        className={`sticky ${STICKY_LEFT.rank} z-10 whitespace-nowrap bg-white px-4 py-4 text-center`}
                                                                    >
                                                                        <div className="flex items-center justify-center">
                                                                            {getRankDisplay(entry.rank)}
                                                                        </div>
                                                                    </td>

                                                                    <td
                                                                        className={`sticky ${STICKY_LEFT.avatar} z-10 whitespace-nowrap bg-white px-2 py-4 text-center`}
                                                                    >
                                                                        {entry.member.avatar_url ? (
                                                                            <Image
                                                                                src={entry.member.avatar_url}
                                                                                alt={entry.member.username}
                                                                                width={40}
                                                                                height={40}
                                                                                className="mx-auto rounded-full border-2 border-gray-200"
                                                                            />
                                                                        ) : (
                                                                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-600">
                                                                                {entry.member.username[0]?.toUpperCase() ?? "?"}
                                                                            </div>
                                                                        )}
                                                                    </td>

                                                                    <td
                                                                        className={`sticky ${STICKY_LEFT.player} z-10 whitespace-nowrap bg-white px-4 py-4`}
                                                                    >
                                                                        <span className="font-medium">{entry.member.username}</span>
                                                                    </td>

                                                                    <td
                                                                        className={`sticky ${STICKY_LEFT.overall} z-10 whitespace-nowrap bg-white px-4 py-4 text-center font-semibold text-red-600`}
                                                                    >
                                                                        {entry.overall_score ?? "-"}
                                                                    </td>

                                                                    <td
                                                                        className={`sticky ${STICKY_LEFT.diff} z-10 whitespace-nowrap bg-white px-4 py-4 text-center font-semibold`}
                                                                    >
                                                                        {entry.difference > 0
                                                                            ? `+${entry.difference}`
                                                                            : entry.difference}
                                                                    </td>

                                                                    <td className="whitespace-nowrap border-l border-gray-100 px-3 py-4 text-center">
                                                                        {formatScore(entry.game1_score, entry.id)}
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-center">
                                                                        {formatScore(entry.game2_score, entry.id)}
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-center">
                                                                        {formatScore(entry.game3_score, entry.id)}
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-center">
                                                                        {formatScore(entry.game4_score, entry.id)}
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-center">
                                                                        {formatScore(entry.game5_score, entry.id)}
                                                                    </td>

                                                                    <td className="whitespace-nowrap border-l border-gray-100 px-3 py-4 text-center font-semibold">
                                                                        {entry.handicap ?? "-"}
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-center">
                                                                        {entry.total_score ?? "-"}
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-center">
                                                                        {entry.average_score ?? "-"}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </main>
                </div>
            </>
        </PageAccessGuard>
    );
}