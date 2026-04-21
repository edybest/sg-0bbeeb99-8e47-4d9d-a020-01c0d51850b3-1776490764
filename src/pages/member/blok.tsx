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
    ThumbsUp,
    Heart,
    Target,
    Search,
    Users,
    Star,
    Crown,
    Share2,
    X,
    Camera
} from "lucide-react";

import { motion } from "framer-motion";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";

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
    likes_count: number;
    loves_count: number;
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
        likes_count: entry.likes_count ?? 0,
        loves_count: entry.loves_count ?? 0,
    }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BlokPage() {
    const router = useRouter();
    const { loading: authLoading, member: currentUser } = useAuth(false);
    const { toast } = useToast();

    const [games, setGames] = useState<GameSummary[]>([]);
    const [selectedGame, setSelectedGame] = useState<string | null>(null);

    const [loadingGames, setLoadingGames] = useState(true);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const [leaderboardBase, setLeaderboardBase] = useState<LeaderboardEntry[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    const [cleanGameDialogOpen, setCleanGameDialogOpen] = useState(false);
    const [cleanGameDataByGame, setCleanGameDataByGame] = useState<Record<number, Array<{ member_name: string; avatar_url: string | null; prize: number }>>>({});
    const [loadingCleanGame, setLoadingCleanGame] = useState(false);

    const [doubleRecords, setDoubleRecords] = useState<DoubleRecord[]>([]);
    const [isDoubleDialogOpen, setIsDoubleDialogOpen] = useState(false);
    const [loadingDoubles, setLoadingDoubles] = useState(false);

    const [trioRecords, setTrioRecords] = useState<TrioRecord[]>([]);
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

            const file = new File([blob], `AMBC-Men-vs-Women-${Date.now()}.png`, { type: "image/png" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: "Keputusan Men vs Women AMBC",
                    text: `Keputusan terkini Men vs Women bagi game ${games.find(g => g.id === selectedGame)?.game_name || ''}!`,
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


    const previousLeaderboardRef = useRef<LeaderboardEntry[]>([]);

    const [animatingScores, setAnimatingScores] = useState<Set<string>>(new Set());
    const [retryCount, setRetryCount] = useState(0);

    const [sortField, setSortField] = useState<SortField>("rank");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [reactions, setReactions] = useState<{ id: string; playerId: string; x: number; y: number }[]>([]);
    const [particles, setParticles] = useState<ParticleEntry[]>([]);
    const [userLikesCount, setUserLikesCount] = useState<number>(0);

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [genderFilter, setGenderFilter] = useState<string>("ALL");
    const [techniqueFilter, setTechniqueFilter] = useState<string>("ALL");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const isInitialLoading = loadingGames && games.length === 0;
    const isPageLoading = authLoading || isInitialLoading;

    // ─── Derived / memos ─────────────────────────────────────────────────────

    const filteredLeaderboard = useMemo(() => {
        let filtered = [...leaderboard];

        if (searchQuery.trim()) {
            const searchTerms = searchQuery
                .split(",")
                .map((t) => t.trim().toLowerCase())
                .filter((t) => t.length > 0);

            if (searchTerms.length > 0) {
                filtered = filtered.filter((player) => {
                    const username = player.member.username.toLowerCase();
                    return searchTerms.some((term) => username.includes(term));
                });
            }
        }

        if (genderFilter !== "ALL") {
            filtered = filtered.filter((player) => player.member.sex === genderFilter);
        }

        if (techniqueFilter !== "ALL") {
            filtered = filtered.filter(
                (player) => player.member.bowling_technique === techniqueFilter
            );
        }

        return filtered;
    }, [leaderboard, searchQuery, genderFilter, techniqueFilter]);

    const mostLikedPlayers = useMemo(
        () =>
            [...filteredLeaderboard]
                .filter((p) => p.likes_count > 0)
                .sort((a, b) => b.likes_count - a.likes_count)
                .slice(0, 3),
        [filteredLeaderboard]
    );

    const applyCurrentSort = useCallback(
        (baseData: LeaderboardEntry[], field: SortField, direction: SortDirection) => {
            if (field === "rank") {
                return direction === "asc" ? [...baseData] : [...baseData].reverse();
            }
            return sortData(baseData, field, direction);
        },
        []
    );

    // ─── Data loaders ─────────────────────────────────────────────────────────

    const loadGames = useCallback(
        async (showToast = false) => {
            try {
                setLoadingGames(true);
                setError(null);

                const { data, error: dbError } = await supabase
                    .from("games")
                    .select("id, game_name, game_format, game_date, created_at, double_enabled, trio_enabled, men_vs_women_enabled, women_handicap")
                    .neq("game_type", "COUPLE")
                    .order("game_date", { ascending: false });

                if (dbError) throw dbError;

                const gameList = data ?? [];
                setGames(gameList);

                const query = router.query as Record<string, string | string[] | undefined>;
                const urlGameId =
                    typeof query.gameId === "string" ? query.gameId : undefined;
                const urlDate =
                    typeof query.date === "string" ? query.date : undefined;

                if (gameList.length > 0) {
                    setSelectedGame((current) => {
                        if (urlGameId && gameList.some((g) => g.id === urlGameId))
                            return urlGameId;
                        if (urlDate) {
                            const matched = gameList.find((g) => g.game_date === urlDate);
                            if (matched) return matched.id;
                        }
                        return current ?? gameList[0].id;
                    });
                } else {
                    setSelectedGame(null);
                }

                if (showToast) {
                    toast({ title: "Data refreshed", description: "Games loaded successfully." });
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to load games";
                setError(message);
                if (showToast) {
                    toast({ title: "Connection error", description: message, variant: "destructive" });
                }
            } finally {
                setLoadingGames(false);
            }
        },
        [router.query, toast]
    );

    const loadDoubleRecords = useCallback(
        async (gameId: string) => {
            if (!gameId) return;

            try {
                setLoadingDoubles(true);

                const { data: doublesData, error: doublesError } = await (supabase as any)
                    .from("double_records")
                    .select(`
                        id,
                        player1_id,
                        player2_id,
                        player1_score,
                        player2_score,
                        total_score,
                        include_handicap,
                        player1_handicap,
                        player2_handicap,
                        player1:members!double_records_player1_id_fkey(id, username, full_name, avatar_url),
                        player2:members!double_records_player2_id_fkey(id, username, full_name, avatar_url)
                    `)
                    .eq("game_id", gameId)
                    .order("total_score", { ascending: false });

                if (doublesError) throw doublesError;

                setDoubleRecords((doublesData as any) || []);
            } catch (err) {
                console.error("Error loading double records:", err);
                toast({
                    title: "Error",
                    description: "Failed to load double records",
                    variant: "destructive",
                });
            } finally {
                setLoadingDoubles(false);
            }
        },
        [toast]
    );

    const loadTrioRecords = useCallback(
        async (gameId: string) => {
            if (!gameId) return;

            try {
                setLoadingTrios(true);

                const { data: triosData, error: triosError } = await (supabase as any)
                    .from("trio_records")
                    .select(`
                        id,
                        player1_id,
                        player2_id,
                        player3_id,
                        player1_score,
                        player2_score,
                        player3_score,
                        total_score,
                        include_handicap,
                        player1_handicap,
                        player2_handicap,
                        player3_handicap,
                        player1:members!trio_records_player1_id_fkey(id, username, full_name, avatar_url),
                        player2:members!trio_records_player2_id_fkey(id, username, full_name, avatar_url),
                        player3:members!trio_records_player3_id_fkey(id, username, full_name, avatar_url)
                    `)
                    .eq("game_id", gameId)
                    .order("total_score", { ascending: false });

                if (triosError) throw triosError;

                setTrioRecords((triosData as any) || []);
            } catch (err) {
                console.error("Error loading trio records:", err);
                toast({
                    title: "Error",
                    description: "Failed to load trio records",
                    variant: "destructive",
                });
            } finally {
                setLoadingTrios(false);
            }
        },
        [toast]
    );

    const loadUserLikesCount = useCallback(
        async (playerIds: string[], gameId: string) => {
            if (!currentUser?.user_id || !gameId || playerIds.length === 0) {
                setUserLikesCount(0);
                return;
            }
            try {
                const { count } = await supabase
                    .from("player_reactions_log")
                    .select("*", { count: "exact", head: true })
                    .eq("member_id", currentUser.user_id)
                    .in("game_player_id", playerIds);

                setUserLikesCount(count ?? 0);
            } catch (err) {
                console.error("Error loading user likes count:", err);
                setUserLikesCount(0);
            }
        },
        [currentUser?.user_id]
    );

    const loadLeaderboard = useCallback(
        async (gameId: string) => {
            if (!gameId) return;

            try {
                setLoadingLeaderboard(true);
                setLoadingProgress(10);

                const { data: rawData, error: dbError } = await supabase
                    .from("game_players")
                    .select(
                        `
                        id,
                        member_id,
                        game_id,
                        game1_score,
                        game2_score,
                        game3_score,
                        game4_score,
                        game5_score,
                        total_score,
                        handicap,
                        overall_score,
                        average_score,
                        clean_game,
                        likes_count,
                        loves_count,
                        member:members!game_players_member_id_fkey(
                            id,
                            username,
                            full_name,
                            avatar_url,
                            sex,
                            bowling_technique
                        )
                        `
                    )
                    .eq("game_id", gameId)
                    .order("overall_score", { ascending: false })
                    .limit(150);

                setLoadingProgress(50);

                if (dbError) throw dbError;

                const scores = (rawData ?? []) as unknown as RawPlayerScore[];
                
                setLoadingProgress(70);
                
                const nextBase = buildLeaderboard(scores);

                setLoadingProgress(85);

                if (previousLeaderboardRef.current.length > 0) {
                    const changedIds = new Set<string>();
                    const notifications: string[] = [];

                    nextBase.forEach((newEntry) => {
                        const oldEntry = previousLeaderboardRef.current.find(
                            (old) => old.id === newEntry.id
                        );
                        if (!oldEntry) return;

                        const changes: string[] = [];
                        if (oldEntry.game1_score !== newEntry.game1_score)
                            changes.push(`G1: ${oldEntry.game1_score} → ${newEntry.game1_score}`);
                        if (oldEntry.game2_score !== newEntry.game2_score)
                            changes.push(`G2: ${oldEntry.game2_score} → ${newEntry.game2_score}`);
                        if (oldEntry.game3_score !== newEntry.game3_score)
                            changes.push(`G3: ${oldEntry.game3_score} → ${newEntry.game3_score}`);
                        if (oldEntry.game4_score !== newEntry.game4_score)
                            changes.push(`G4: ${oldEntry.game4_score} → ${newEntry.game4_score}`);
                        if (oldEntry.game5_score !== newEntry.game5_score)
                            changes.push(`G5: ${oldEntry.game5_score} → ${newEntry.game5_score}`);

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

                    if (notifications.length > 0) {
                        toast({
                            title: "🎳 Skor Dikemaskini!",
                            description: (
                                <div className="space-y-2 mt-2">
                                    {notifications.map((n, i) => (
                                        <div
                                            key={i}
                                            className="text-sm whitespace-pre-line border-l-2 border-red-500 pl-2"
                                        >
                                            {n}
                                        </div>
                                    ))}
                                </div>
                            ),
                            duration: 5000,
                        });
                    }

                    if (changedIds.size > 0) {
                        setAnimatingScores(changedIds);
                        window.setTimeout(() => setAnimatingScores(new Set()), 1000);
                    }
                }

                previousLeaderboardRef.current = nextBase;
                setLeaderboardBase(nextBase);
                setLeaderboard(applyCurrentSort(nextBase, sortField, sortDirection));
                
                setLoadingProgress(95);
                
                void loadUserLikesCount(
                    nextBase.map((p) => p.id),
                    gameId
                );
                
                setLoadingProgress(100);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to load leaderboard";
                toast({ title: "Error", description: message, variant: "destructive" });
            } finally {
                setTimeout(() => {
                    setLoadingLeaderboard(false);
                    setLoadingProgress(0);
                }, 300);
            }
        },
        [sortField, sortDirection, toast, loadUserLikesCount]
    );

    // ─── Effects ──────────────────────────────────────────────────────────────

    const { gameId: queryGameId, date: queryDate } = router.query as {
        gameId?: string;
        date?: string;
    };

    useEffect(() => {
        void loadGames();
    }, [loadGames, retryCount, queryGameId, queryDate]);

    useEffect(() => {
        if (selectedGame) void loadLeaderboard(selectedGame);
    }, [selectedGame, loadLeaderboard]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleOpenDoubleDialog = async () => {
        if (!selectedGame) return;

        setIsDoubleDialogOpen(true);
        
        if (doubleRecords.length === 0) {
            await loadDoubleRecords(selectedGame);
        }
    };

    const handleOpenTrioDialog = async () => {
        if (!selectedGame) return;

        setIsTrioDialogOpen(true);
        
        if (trioRecords.length === 0) {
            await loadTrioRecords(selectedGame);
        }
    };

    const handleOpenCleanGameDialog = async () => {
        if (!selectedGame) return;
        setCleanGameDialogOpen(true);
        setLoadingCleanGame(true);

        try {
            const { data: gameData, error } = await supabase
                .from("games")
                .select("clean_game_data")
                .eq("id", selectedGame)
                .single();

            if (error) throw error;

            const cleanGameData = gameData?.clean_game_data as any;
            
            if (!cleanGameData) {
                setCleanGameDataByGame({});
                setLoadingCleanGame(false);
                return;
            }

            const { data: playersData, error: playersError } = await supabase
                .from("game_players")
                .select("id")
                .eq("game_id", selectedGame)
                .eq("clean_game", true);

            if (playersError) throw playersError;

            const cleanGamePlayersCount = playersData?.length || 0;
            const totalPrize = cleanGamePlayersCount * 2;

            const allWinnerIds = new Set<string>();
            for (let i = 1; i <= 5; i++) {
                const wIds = cleanGameData[`game${i}`] || [];
                wIds.forEach((id: string) => allWinnerIds.add(id));
            }

            const membersMap: Record<string, { username: string, avatar_url: string | null }> = {};
            
            if (allWinnerIds.size > 0) {
                const { data: members, error: membersError } = await supabase
                    .from("members")
                    .select("id, username, avatar_url")
                    .in("id", Array.from(allWinnerIds));

                if (membersError) throw membersError;
                
                members?.forEach(m => {
                    membersMap[m.id] = { username: m.username, avatar_url: m.avatar_url };
                });
            }

            const winnersByGame: Record<number, Array<{ member_name: string; avatar_url: string | null; prize: number }>> = {};

            for (let i = 1; i <= 5; i++) {
                const wIds = cleanGameData[`game${i}`] || [];
                const prizePerWinner = wIds.length > 0 ? Math.floor(totalPrize / wIds.length) : 0;
                
                winnersByGame[i] = wIds.map((id: string) => ({
                    member_name: membersMap[id]?.username || "Unknown",
                    prize: prizePerWinner
                }));
            }

            setCleanGameDataByGame(winnersByGame);
        } catch (error) {
            console.error("Error loading clean game winners:", error);
            setCleanGameDataByGame({});
        } finally {
            setLoadingCleanGame(false);
        }
    };

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

    const handleReaction = async (
        playerId: string,
        event: React.MouseEvent<HTMLButtonElement>
    ) => {
        if (!currentUser || !selectedGame) return;

        if (userLikesCount >= MAX_LIKES_PER_GAME) {
            toast({
                title: "Had Like Tercapai",
                description: `Anda telah menggunakan semua ${MAX_LIKES_PER_GAME} like untuk game ini.`,
                variant: "destructive",
            });
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top;

        const reactionId = `reaction-${Date.now()}-${Math.random()}`;
        setReactions((prev) => [...prev, { id: reactionId, playerId, x, y }]);

        const particleEntries: ParticleEntry[] = Array.from({ length: 8 }, (_, i) => ({
            id: `particle-${Date.now()}-${i}`,
            x,
            y,
            dir: i,
        }));
        setParticles((prev) => [...prev, ...particleEntries]);

        setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== reactionId));
            setParticles((prev) =>
                prev.filter((p) => !particleEntries.some((pe) => pe.id === p.id))
            );
        }, 2000);

        try {
            const playerEntry = leaderboard.find((p) => p.id === playerId);
            const currentLikesCount = playerEntry?.likes_count ?? 0;

            setLeaderboard((prev) =>
                prev.map((p) =>
                    p.id === playerId ? { ...p, likes_count: p.likes_count + 1 } : p
                )
            );

            if (currentUser.user_id) {
                await supabase.from("player_reactions_log").insert({
                    game_player_id: playerId,
                    member_id: currentUser.user_id,
                    reaction_type: "like",
                });

                await supabase
                    .from("game_players")
                    .update({ likes_count: currentLikesCount + 1 })
                    .eq("id", playerId);

                setUserLikesCount((prev) => {
                    const next = prev + 1;
                    const remaining = MAX_LIKES_PER_GAME - next;
                    toast({
                        title: "Like Berjaya!",
                        description:
                            remaining > 0
                                ? `${remaining} like lagi. Anda boleh like pemain yang sama berkali-kali.`
                                : "Semua 5 like telah digunakan untuk game ini.",
                    });
                    return next;
                });
            }
        } catch (err) {
            console.error("Error toggling like:", err);
        }
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

                    @keyframes heartPop {
                        0%   { transform: translate(-50%, 0)    scale(0);   opacity: 1; }
                        50%  { transform: translate(-50%, -30px) scale(1.2); opacity: 1; }
                        100% { transform: translate(-50%, -80px) scale(0.8); opacity: 0; }
                    }
                    .heart-pop { animation: heartPop 1s ease-out forwards; }

                    @keyframes particle-0 {
                        0%   { transform: translate(-50%, 0)              scale(1); opacity: 1; }
                        100% { transform: translate(-50%, -60px)          scale(0); opacity: 0; }
                    }
                    @keyframes particle-1 {
                        0%   { transform: translate(-50%, 0)                       scale(1); opacity: 1; }
                        100% { transform: translate(calc(-50% + 42px), -42px)      scale(0); opacity: 0; }
                    }
                    @keyframes particle-2 {
                        0%   { transform: translate(-50%, 0)               scale(1); opacity: 1; }
                        100% { transform: translate(calc(-50% + 60px), 0)  scale(0); opacity: 0; }
                    }
                    @keyframes particle-3 {
                        0%   { transform: translate(-50%, 0)                      scale(1); opacity: 1; }
                        100% { transform: translate(calc(-50% + 42px), 42px)      scale(0); opacity: 0; }
                    }
                    @keyframes particle-4 {
                        0%   { transform: translate(-50%, 0)    scale(1); opacity: 1; }
                        100% { transform: translate(-50%, 60px) scale(0); opacity: 0; }
                    }
                    @keyframes particle-5 {
                        0%   { transform: translate(-50%, 0)                       scale(1); opacity: 1; }
                        100% { transform: translate(calc(-50% - 42px), 42px)       scale(0); opacity: 0; }
                    }
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

                                {selectedGame && (
                                    <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full border border-red-200 shadow-md flex-shrink-0">
                                        <span className="text-xl">👍</span>
                                        <span className="text-xs md:text-sm font-bold text-red-700">
                                            {userLikesCount}/{MAX_LIKES_PER_GAME} Likes
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    <main className="container mx-auto px-3 md:px-4 py-6">

                        {/* ── Game Selector + Most Liked ── */}
                        <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                            <Card className="bg-white border-sky-200 shadow-md lg:col-span-2">
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

                            {selectedGame && mostLikedPlayers.length > 0 && (
                                <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 shadow-md">
                                    <CardHeader className="border-b border-red-100/50 pb-3 md:pb-4">
                                        <CardTitle className="text-red-900 flex items-center gap-2 text-lg md:text-xl">
                                            <Heart className="w-5 h-5 md:w-6 md:h-6 text-red-500 fill-red-500" />
                                            Pilihan Ramai
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 md:pt-6">
                                        <div className="space-y-3">
                                            {mostLikedPlayers.map((player, index) => (
                                                <div
                                                    key={`liked-${player.id}`}
                                                    className="flex items-center justify-between bg-white/60 p-2 rounded-lg border border-red-100/50"
                                                >
                                                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                        <span className="font-bold text-red-400 w-4 md:w-5 text-sm md:text-base">
                                                            #{index + 1}
                                                        </span>
                                                        {player.member.avatar_url ? (
                                                            <Image
                                                                src={player.member.avatar_url}
                                                                alt={player.member.username}
                                                                width={28}
                                                                height={28}
                                                                className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border-2 border-white shadow-sm"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600 text-xs md:text-sm border-2 border-white shadow-sm">
                                                                {player.member.username[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                        <Link
                                                            href={`/member/profile?id=${player.member.id}`}
                                                            className="font-semibold text-red-900 hover:text-red-700 truncate text-xs md:text-sm"
                                                        >
                                                            {player.member.username}
                                                        </Link>
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 md:py-1 rounded text-xs md:text-sm font-bold shadow-sm flex-shrink-0 ml-2">
                                                        <span>👍</span>
                                                        {player.likes_count}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Clean Game Section has been removed and replaced by the single button above */}

                        {/* ── Clean Game Dialog ── */}
                        <Dialog open={cleanGameDialogOpen} onOpenChange={setCleanGameDialogOpen}>
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

                        {/* ── Search & Filter ── */}
                        {selectedGame && (
                            <Card className="bg-white border-sky-200 shadow-md mb-6">
                                <CardHeader className="border-b border-sky-200 pb-3 md:pb-4">
                                    <CardTitle className="text-sky-900 flex items-center gap-2 text-lg">
                                        <Search className="w-5 h-5 text-sky-600" />
                                        Carian & Penapisan
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 md:p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-sky-700 mb-2">
                                            Cari Nama (pisahkan dengan koma)
                                        </label>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Contoh: zali, samdol, lan"
                                            className="w-full px-4 py-3 border border-sky-300 rounded-lg bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-900"
                                        />
                                        {searchQuery && (
                                            <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 px-2 py-1 rounded text-xs font-semibold">
                                                Carian: {searchQuery.split(",").filter((s) => s.trim()).length} nama
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="hover:text-red-600 ml-1 bg-sky-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs md:text-sm text-sky-700">
                                            Penapis lanjutan untuk jantina dan teknik balingan
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAdvancedFilters((prev) => !prev)}
                                            className="h-9 rounded-full border-sky-300 px-4 text-sky-700 hover:bg-sky-50"
                                        >
                                            {showAdvancedFilters ? "Less..." : "More..."}
                                        </Button>
                                    </div>

                                    {showAdvancedFilters && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-sky-700 mb-2">
                                                    Jantina
                                                </label>
                                                <select
                                                    value={genderFilter}
                                                    onChange={(e) => setGenderFilter(e.target.value)}
                                                    className="w-full px-4 py-3 border border-sky-300 rounded-lg bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-900 cursor-pointer"
                                                >
                                                    <option value="ALL">Semua Jantina</option>
                                                    <option value="men">Lelaki</option>
                                                    <option value="women">Perempuan</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-sky-700 mb-2">
                                                    Teknik Balingan
                                                </label>
                                                <select
                                                    value={techniqueFilter}
                                                    onChange={(e) => setTechniqueFilter(e.target.value)}
                                                    className="w-full px-4 py-3 border border-sky-300 rounded-lg bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-900 cursor-pointer"
                                                >
                                                    <option value="ALL">Semua Teknik</option>
                                                    <option value="Straight">Straight</option>
                                                    <option value="Hook">Hook</option>
                                                    <option value="Spinner">Spinner</option>
                                                    <option value="Backup">Backup</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {(searchQuery || genderFilter !== "ALL" || techniqueFilter !== "ALL") && (
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-sky-200">
                                            <span className="text-sm font-medium text-sky-700 mt-1">Aktif:</span>
                                            {searchQuery && (
                                                <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 px-2 py-1 rounded text-xs font-semibold">
                                                    Carian: {searchQuery.split(",").filter((s) => s.trim()).length} nama
                                                    <button
                                                        onClick={() => setSearchQuery("")}
                                                        className="hover:text-red-600 ml-1 bg-sky-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            )}
                                            {genderFilter !== "ALL" && (
                                                <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 px-2 py-1 rounded text-xs font-semibold">
                                                    {genderFilter === "men" ? "Lelaki" : "Perempuan"}
                                                    <button
                                                        onClick={() => setGenderFilter("ALL")}
                                                        className="hover:text-red-600 ml-1 bg-sky-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            )}
                                            {techniqueFilter !== "ALL" && (
                                                <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 px-2 py-1 rounded text-xs font-semibold">
                                                    {techniqueFilter}
                                                    <button
                                                        onClick={() => setTechniqueFilter("ALL")}
                                                        className="hover:text-red-600 ml-1 bg-sky-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    setGenderFilter("ALL");
                                                    setTechniqueFilter("ALL");
                                                }}
                                                className="text-xs text-red-600 hover:text-red-800 font-bold ml-auto bg-red-50 px-2 py-1 rounded transition-colors"
                                            >
                                                Reset Semua
                                            </button>
                                        </div>
                                    )}

                                    <div className="text-sm text-sky-700 bg-sky-50 px-3 py-2 rounded-lg border border-sky-100">
                                        Menunjukkan{" "}
                                        <span className="font-bold">{filteredLeaderboard.length}</span> daripada{" "}
                                        <span className="font-bold">{leaderboard.length}</span> pemain
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {selectedGame && (
                            <>
                                <div className="block md:hidden space-y-3 mb-6">
                                    {filteredLeaderboard.map((player, index) => {
                                        const isTop3 = player.rank <= 3;
                                        const cardBg = isTop3
                                            ? "bg-gradient-to-br from-amber-500 to-yellow-100/50 border-amber-200"
                                            : "bg-white border-sky-100";

                                        return (
                                            <motion.div
                                                key={player.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: Math.min(index * 0.05, 0.5) }}
                                                className={`${cardBg} rounded-xl border shadow-sm p-3`}
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="flex-shrink-0 w-8 flex justify-center">
                                                        {player.rank <= 3 ? (
                                                            <div
                                                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                                                                    player.rank === 1
                                                                        ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                                                                        : player.rank === 2
                                                                            ? "bg-gradient-to-br from-gray-300 to-gray-500"
                                                                            : "bg-gradient-to-br from-amber-600 to-amber-800"
                                                                }`}
                                                            >
                                                                {player.rank}
                                                            </div>
                                                        ) : (
                                                            <span className="font-bold text-slate-500 text-sm">#{player.rank}</span>
                                                        )}
                                                    </div>

                                                    <div className="flex-shrink-0 relative">
                                                        {player.member.avatar_url ? (
                                                            <Image
                                                                src={player.member.avatar_url}
                                                                alt={player.member.username}
                                                                width={36}
                                                                height={36}
                                                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                                                loading="lazy"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center font-bold text-sky-700 text-sm border border-sky-200">
                                                                {player.member.username[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <Link
                                                            href={`/member/profile?id=${player.member.id}`}
                                                            className="font-bold text-sm text-slate-800 truncate hover:text-sky-600 block"
                                                        >
                                                            {player.member.username}
                                                        </Link>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <button
                                                                onClick={(e) => handleReaction(player.id, e)}
                                                                disabled={userLikesCount >= MAX_LIKES_PER_GAME}
                                                                className="flex items-center gap-1 text-red-500 text-[10px] font-bold bg-red-50 px-1.5 py-0.5 rounded hover:bg-red-100 disabled:opacity-50"
                                                            >
                                                                <ThumbsUp className="w-3 h-3" /> {player.likes_count || 0}
                                                            </button>
                                                            {player.rank > 1 && leaderboard[0] && (
                                                                <span className="text-[10px] text-red-500 font-bold">
                                                                    Diff: -{leaderboard[0].overall_score - player.overall_score}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex-shrink-0 text-right">
                                                        <div className="text-[9px] font-bold text-emerald-600 uppercase">Overall</div>
                                                        <div className="text-xl font-black text-emerald-600 leading-none">{player.overall_score}</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-5 gap-1 mb-2">
                                                    {[1, 2, 3, 4, 5].map((gameNum) => {
                                                        const scoreKey = `game${gameNum}_score` as keyof LeaderboardEntry;
                                                        const score = player[scoreKey] as number;
                                                        return (
                                                            <div key={gameNum} className="bg-white border border-slate-200 rounded p-1 text-center shadow-sm">
                                                                <div className="text-[9px] font-bold text-slate-400">G{gameNum}</div>
                                                                <div className="text-xs font-bold text-slate-700 mt-0.5">{score || 0}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="grid grid-cols-3 gap-1.5">
                                                    <div className="bg-slate-50 border border-slate-200 rounded py-1 text-center shadow-sm">
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Total</div>
                                                        <div className="text-sm font-black text-slate-700">{player.total_score}</div>
                                                    </div>
                                                    <div className="bg-sky-50 border border-sky-100 rounded py-1 text-center shadow-sm">
                                                        <div className="text-[9px] font-bold text-sky-600 uppercase">Hcp</div>
                                                        <div className="text-sm font-black text-sky-700">{player.handicap || 0}</div>
                                                    </div>
                                                    <div className="bg-purple-50 border border-purple-100 rounded py-1 text-center shadow-sm">
                                                        <div className="text-[9px] font-bold text-purple-600 uppercase">Avg</div>
                                                        <div className="text-sm font-black text-purple-700">{player.average_score.toFixed(1)}</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                <div className="hidden md:block">
                                    <div className="overflow-x-auto rounded-xl border border-sky-200 shadow-md">
                                        <table className="w-full min-w-[1200px] bg-white">
                                            <thead>
                                                <tr className="border-b border-sky-200">
                                                    <th
                                                        className={`sticky ${STICKY_LEFT.rank} z-20 bg-sky-50 px-4 py-3 text-left cursor-pointer hover:bg-sky-100 transition-colors border-r border-sky-200`}
                                                        onClick={() => handleSort("rank")}
                                                    >
                                                        <div className="flex items-center text-xs font-semibold text-sky-800 uppercase tracking-wider">
                                                            # {getSortIcon("rank")}
                                                        </div>
                                                    </th>
                                                    <th className={`sticky ${STICKY_LEFT.avatar} z-20 bg-sky-50 w-14 px-2 py-3 text-center border-r border-sky-200`}>
                                                        <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider">Avatar</span>
                                                    </th>
                                                    <th
                                                        className={`sticky ${STICKY_LEFT.player} z-20 bg-sky-50 min-w-[160px] px-4 py-3 text-left cursor-pointer hover:bg-sky-100 transition-colors border-r-2 border-sky-200`}
                                                        onClick={() => handleSort("username")}
                                                    >
                                                        <div className="flex items-center text-xs font-semibold text-sky-800 uppercase tracking-wider">
                                                            Player {getSortIcon("username")}
                                                        </div>
                                                    </th>
                                                    <th
                                                        className={`sticky ${STICKY_LEFT.overall} z-20 bg-sky-100 px-4 py-3 text-center cursor-pointer hover:bg-sky-200 transition-colors border-r-2 border-sky-200`}
                                                        onClick={() => handleSort("overall_score")}
                                                    >
                                                        <div className="flex items-center justify-center text-xs font-extrabold text-sky-900 uppercase tracking-wider">
                                                            Overall {getSortIcon("overall_score")}
                                                        </div>
                                                    </th>
                                                    <th
                                                        className={`sticky ${STICKY_LEFT.diff} z-20 bg-sky-50 px-4 py-3 text-center cursor-pointer hover:bg-sky-100 transition-colors border-r-2 border-sky-200`}
                                                        onClick={() => handleSort("difference")}
                                                    >
                                                        <div className="flex items-center justify-center text-xs font-semibold text-sky-800 uppercase tracking-wider">
                                                            Diff {getSortIcon("difference")}
                                                        </div>
                                                    </th>
                                                    {["Game 1", "Game 2", "Game 3", "Game 4", "Game 5"].map((g) => (
                                                        <th
                                                            key={g}
                                                            className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-b from-sky-500 to-sky-600 text-white z-10 border-r-2 border-white/20"
                                                        >
                                                            {g}
                                                        </th>
                                                    ))}
                                                    <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-blue-500 to-indigo-600 text-white z-10 border-l-2 border-white/20">
                                                        Total
                                                    </th>
                                                    <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-blue-600 to-indigo-700 text-white z-10 border-l-2 border-white/20">
                                                        Handicap
                                                    </th>
                                                    <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-red-500 to-pink-600 text-white z-10 border-l-2 border-white/20">
                                                        <Heart className="w-4 h-4 mx-auto" />
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loadingLeaderboard ? (
                                                    <tr>
                                                        <td colSpan={13} className="py-20 text-center">
                                                            <div className="flex flex-col items-center gap-4">
                                                                <div className="relative">
                                                                    <div className="w-20 h-20 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin"></div>
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <span className="text-2xl">🎳</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-sky-600 font-semibold mb-1">Memuatkan skor...</div>
                                                                    <div className="text-sky-500 text-sm">{loadingProgress}% selesai</div>
                                                                </div>
                                                                <div className="w-64 h-2 bg-sky-100 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300 ease-out rounded-full"
                                                                        style={{ width: `${loadingProgress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : filteredLeaderboard.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={13} className="py-20 text-center bg-slate-50">
                                                            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                                            <p className="text-sky-500">Tiada skor dijumpai untuk kriteria carian</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredLeaderboard.map((player, index) => {
                                                        const isTop3 = player.rank <= 3;
                                                        const rowBg = isTop3
                                                            ? index % 2 === 0
                                                                ? "bg-amber-50/30 hover:bg-amber-100/50"
                                                                : "bg-amber-50/60 hover:bg-amber-100/50"
                                                            : index % 2 === 0
                                                                ? "bg-white hover:bg-sky-50/50"
                                                                : "bg-slate-50/50 hover:bg-sky-50/50";

                                                        const stickyBg = isTop3 ? "bg-amber-50/80" : "bg-white";

                                                        return (
                                                            <tr key={player.id} className={`border-b border-sky-100 transition-colors group ${rowBg}`}>
                                                                <td className={`sticky ${STICKY_LEFT.rank} z-10 ${stickyBg} group-hover:bg-sky-50/80 px-4 py-3 border-r border-sky-100 transition-colors`}>
                                                                    {getRankDisplay(player.rank)}
                                                                </td>
                                                                <td className={`sticky ${STICKY_LEFT.avatar} z-10 ${stickyBg} group-hover:bg-sky-50/80 px-2 py-3 border-r border-sky-100 text-center transition-colors`}>
                                                                    <div className="relative inline-block">
                                                                        {player.member.avatar_url ? (
                                                                            <Image
                                                                                src={player.member.avatar_url}
                                                                                alt={player.member.username}
                                                                                width={40}
                                                                                height={40}
                                                                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                                                unoptimized
                                                                                loading="lazy"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center font-bold text-sky-700 border-2 border-white shadow-sm">
                                                                                {player.member.username[0].toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        {player.clean_game && (
                                                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-md">
                                                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className={`sticky ${STICKY_LEFT.player} z-10 bg-white group-hover:bg-sky-50/50 px-4 py-3 border-r border-sky-100`}>
                                                                    <Link
                                                                        href={`/member/profile?id=${player.member.id}`}
                                                                        className="font-bold text-sm text-sky-900 hover:text-blue-600 truncate block max-w-[140px]"
                                                                    >
                                                                        {player.member.username}
                                                                    </Link>
                                                                    <div className="flex items-center gap-1 mt-1">
                                                                        <span className="text-xs font-bold text-slate-500">
                                                                            {player.member.sex === "men" ? "♂️ L" : "♀️ P"}
                                                                        </span>
                                                                        {player.member.bowling_technique && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span className="text-xs font-bold text-slate-500">
                                                                                    {player.member.bowling_technique}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td
                                                                    className={`sticky ${STICKY_LEFT.overall} z-10 ${
                                                                        isTop3 ? "bg-amber-100/80" : "bg-sky-100/80"
                                                                    } group-hover:bg-sky-100/80 px-4 py-3 border-r border-sky-200 text-center transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]`}
                                                                >
                                                                    <span className="font-black text-lg text-emerald-700">{player.overall_score}</span>
                                                                </td>
                                                                <td className={`sticky ${STICKY_LEFT.diff} z-10 ${stickyBg} group-hover:bg-sky-50/80 px-4 py-3 border-r-2 border-sky-200 text-center transition-colors`}>
                                                                    <span className="font-bold text-sm text-orange-600">
                                                                        {player.difference > 0 ? `+${player.difference}` : "-"}
                                                                    </span>
                                                                </td>
                                                                {[player.game1_score, player.game2_score, player.game3_score, player.game4_score, player.game5_score].map((score, i) => (
                                                                    <td key={i} className="px-3 py-3 text-center border-r border-sky-200">
                                                                        <span className="font-semibold text-sky-900">{formatScore(score, player.id)}</span>
                                                                    </td>
                                                                ))}
                                                                <td className="px-3 py-3 text-center border-r border-sky-200">
                                                                    <span className="font-bold text-slate-800">{player.total_score || 0}</span>
                                                                </td>
                                                                <td className="px-3 py-3 text-center border-r border-sky-200">
                                                                    <span className="font-bold text-blue-600">{player.handicap || 0}</span>
                                                                </td>
                                                                <td className="px-3 py-3 text-center">
                                                                    <button
                                                                        onClick={(e) => handleReaction(player.id, e)}
                                                                        disabled={userLikesCount >= MAX_LIKES_PER_GAME}
                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50 shadow-sm"
                                                                    >
                                                                        <ThumbsUp className="w-4 h-4" />
                                                                        <span className="font-bold text-sm">{player.likes_count || 0}</span>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </main>
                </div>

                {/* ── Floating reactions ── */}
                {reactions.map((reaction) => (
                    <div
                        key={reaction.id}
                        className="heart-pop fixed pointer-events-none z-50 text-6xl"
                        style={{ left: `${reaction.x}px`, top: `${reaction.y}px` }}
                    >
                        👍
                    </div>
                ))}

                {particles.map((particle) => (
                    <div
                        key={particle.id}
                        className="fixed pointer-events-none z-50"
                        style={{
                            left: `${particle.x}px`,
                            top: `${particle.y}px`,
                            animation: `particle-${particle.dir} 1s ease-out forwards`,
                        }}
                    >
                        <span className="text-2xl">👍</span>
                    </div>
                ))}

                {/* ── Double Game Dialog ── */}
                <Dialog open={isDoubleDialogOpen} onOpenChange={setIsDoubleDialogOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Users className="w-5 h-5 text-blue-500" />
                                <span className="line-clamp-1">Score Double - {games.find(g => g.id === selectedGame)?.game_name}</span>
                            </DialogTitle>
                        </DialogHeader>
                        {loadingDoubles ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : doubleRecords.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Tiada rekod double untuk game ini</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                    Jumlah Pasukan: <span className="font-bold">{doubleRecords.length}</span>
                                </div>
                                {doubleRecords.map((record, index) => {
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
                                    ];

                                    const accent = index === 0
                                        ? {
                                            card: "border-amber-300 bg-gradient-to-br from-amber-500 to-yellow-500",
                                            badge: "bg-amber-500 text-white",
                                            total: "text-amber-600",
                                            pill: "bg-amber-100 text-amber-800",
                                        }
                                        : index === 1
                                            ? {
                                                card: "border-slate-300 bg-gradient-to-br from-slate-500 to-slate-600",
                                                badge: "bg-slate-500 text-white",
                                                total: "text-slate-700",
                                                pill: "bg-slate-200 text-slate-800",
                                            }
                                            : index === 2
                                                ? {
                                                    card: "border-orange-300 bg-gradient-to-br from-orange-500 to-orange-600",
                                                    badge: "bg-orange-500 text-white",
                                                    total: "text-orange-700",
                                                    pill: "bg-orange-100 text-orange-800",
                                                }
                                                : {
                                                    card: "border-blue-300 bg-gradient-to-br from-blue-500 to-blue-600",
                                                    badge: "bg-blue-500 text-white",
                                                    total: "text-blue-700",
                                                    pill: "bg-blue-100 text-blue-800",
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
                                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-blue-100 font-bold text-blue-700 shadow-sm">
                                                                {item.player?.username?.[0]?.toUpperCase() || "?"}
                                                            </div>
                                                        )}

                                                        <div className="min-w-0 flex-1">
                                                            <Link
                                                                href={`/member/profile?id=${item.id}`}
                                                                className="block truncate text-sm font-bold text-blue-900 hover:text-blue-700"
                                                            >
                                                                @{item.player?.username}
                                                            </Link>
                                                            <p className="text-[11px] text-slate-500">
                                                                {record.include_handicap ? `Handicap +${item.handicap}` : "Tanpa handicap"}
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
                                                    onClick={() => void handleShareDouble(record, index + 1)}
                                                    className="h-9 rounded-full border-white/70 bg-white/85 px-4 text-xs font-semibold text-blue-700 shadow-sm hover:bg-white"
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
                {/* ── Trio Game Dialog ── */}
                <Dialog open={isTrioDialogOpen} onOpenChange={setIsTrioDialogOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden p-0 bg-slate-50 border-0 rounded-2xl sm:rounded-3xl shadow-2xl [&>button]:hidden">
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
                                            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-white rounded-full flex items-center justify-center text-4xl sm:text-5xl mb-4 shadow-[0_0_20px_rgba(0,0,0,0.15)] border-4 border-slate-50">
                                                VS
                                            </div>
                                            
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`relative overflow-hidden p-6 sm:p-8 rounded-[2rem] border border-blue-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-300 ${
                                                    menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                        ? "bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 shadow-pink-500/30 shadow-[0_10px_30px_rgb(59,130,246,0.3)] transform sm:scale-105 z-10 border-none"
                                                        : "bg-white"
                                                }`}
                                            >
                                                <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                                <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-pink-400/10 rounded-full blur-3xl pointer-events-none"></div>
                                                
                                                <div className="relative z-10 flex flex-col items-center text-center">
                                                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl mb-4 shadow-inner ${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal ? "bg-white/20 backdrop-blur-md border border-white/30" : "bg-pink-50 border border-pink-100"
                                                    }`}>
                                                        👨
                                                    </div>
                                                    <h3 className={`text-sm sm:text-base font-bold tracking-[0.2em] mb-2 uppercase ${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal ? "text-pink-50" : "text-slate-500"
                                                    }`}>
                                                        Men Team
                                                    </h3>
                                                    <div className={`text-5xl sm:text-7xl font-black tracking-tighter mb-4 drop-shadow-sm ${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal ? "text-white" : "text-pink-600"
                                                    }`}>
                                                        {menVsWomenData.menTotal}
                                                    </div>
                                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm ${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal ? "bg-black/15 text-white backdrop-blur-sm border border-white/10" : "bg-slate-100 text-slate-600 border border-slate-200"
                                                    }`}>
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
                                                className={`relative overflow-hidden p-6 sm:p-8 rounded-[2rem] border border-pink-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-300 ${
                                                    menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                        ? "bg-gradient-to-br from-pink-600 via-pink-500 to-rose-400 shadow-pink-500/30 shadow-[0_20px_30px_rgb(236,72,153,0.3)] transform sm:scale-105 z-10 border-none"
                                                        : "bg-white"
                                                }`}
                                            >
                                                <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                                <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-pink-400/10 rounded-full blur-3xl pointer-events-none"></div>
                                                
                                                <div className="relative z-10 flex flex-col items-center text-center">
                                                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl mb-4 shadow-inner ${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal ? "bg-white/20 backdrop-blur-md border border-white/30" : "bg-pink-50 border border-pink-100"
                                                    }`}>
                                                        👩
                                                    </div>
                                                    <h3 className={`text-sm sm:text-base font-bold tracking-[0.2em] mb-2 uppercase ${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal ? "text-pink-50" : "text-slate-500"
                                                    }`}>
                                                        Women Team
                                                    </h3>
                                                    <div className={`text-5xl sm:text-7xl font-black tracking-tighter mb-4 drop-shadow-sm ${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal ? "text-white" : "text-pink-600"
                                                    }`}>
                                                        {menVsWomenData.womenTotal}
                                                    </div>
                                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm ${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal ? "bg-black/15 text-white backdrop-blur-sm border border-white/10" : "bg-slate-100 text-slate-600 border border-slate-200"
                                                    }`}>
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
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-sm border border-indigo-100">
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
