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
    Users
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
    const [loadingDoubles, setLoadingDoubles] = useState(false);
    const [doubleDialogOpen, setDoubleDialogOpen] = useState(false);

    const [trioRecords, setTrioRecords] = useState<Array<{
        id: string;
        player1: { id: string; username: string; avatar_url: string | null; };
        player2: { id: string; username: string; avatar_url: string | null; };
        player3: { id: string; username: string; avatar_url: string | null; };
        player1_score: number;
        player2_score: number;
        player3_score: number;
        total_score: number;
    }>>([]);
    const [loadingTrios, setLoadingTrios] = useState(false);
    const [trioDialogOpen, setTrioDialogOpen] = useState(false);

    const [menVsWomenDialogOpen, setMenVsWomenDialogOpen] = useState(false);
    const [menVsWomenData, setMenVsWomenData] = useState<{
        menTotal: number;
        womenTotal: number;
        menCount: number;
        womenCount: number;
        womenHandicap: number;
    } | null>(null);
    const [loadingMenVsWomen, setLoadingMenVsWomen] = useState(false);

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
                    .select("id, game_name, game_format, game_date, created_at, double_enabled, men_vs_women_enabled, women_handicap")
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

    const loadDoubleRecords = useCallback(async (gameId: string) => {
        if (!gameId) return;

        try {
            setLoadingDoubles(true);
            const { data, error } = await supabase
                .from("double_records")
                .select(`
                    *,
                    player1:members!double_records_player1_id_fkey(id, username, avatar_url),
                    player2:members!double_records_player2_id_fkey(id, username, avatar_url)
                `)
                .eq("game_id", gameId)
                .order("total_score", { ascending: false });

            if (error) throw error;

            setDoubleRecords(data || []);
        } catch (err) {
            console.error("Error loading double records:", err);
            toast({
                title: "Ralat",
                description: "Gagal memuatkan rekod double",
                variant: "destructive",
            });
        } finally {
            setLoadingDoubles(false);
        }
    }, [toast]);

    const loadTrioRecords = useCallback(async (gameId: string) => {
        if (!gameId) return;

        try {
            setLoadingTrios(true);
            const { data, error } = await supabase
                .from("trio_records")
                .select(`
                    *,
                    player1:members!trio_records_player1_id_fkey(id, username, avatar_url),
                    player2:members!trio_records_player2_id_fkey(id, username, avatar_url),
                    player3:members!trio_records_player3_id_fkey(id, username, avatar_url)
                `)
                .eq("game_id", gameId)
                .order("total_score", { ascending: false });

            if (error) throw error;

            setTrioRecords(data || []);
        } catch (err) {
            console.error("Error loading trio records:", err);
            toast({
                title: "Ralat",
                description: "Gagal memuatkan rekod trio",
                variant: "destructive",
            });
        } finally {
            setLoadingTrios(false);
        }
    }, [toast]);

    const loadMenVsWomenData = useCallback(async (gameId: string) => {
        if (!gameId) return;

        try {
            setLoadingMenVsWomen(true);

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
    }, [toast]);

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

            setLoadingLeaderboard(true);
            setLoadingProgress(0);

            // Simulasi progress bar supaya nampak lebih responsif
            const progressInterval = setInterval(() => {
                setLoadingProgress((prev) => {
                    if (prev >= 85) return prev; // Hold at 85% until real data finishes
                    return prev + Math.floor(Math.random() * 15) + 5;
                });
            }, 300);

            try {
                const { data: rawData, error: dbError } = await supabase
                    .from("game_players")
                    .select(
                        `*, member:members(id, username, full_name, avatar_url, sex, bowling_technique)`
                    )
                    .eq("game_id", gameId);

                if (dbError) throw dbError;
                setLoadingProgress(90);

                const scores = (rawData ?? []) as unknown as RawPlayerScore[];
                const nextBase = buildLeaderboard(scores);

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
                
                await loadUserLikesCount(
                    nextBase.map((p) => p.id),
                    gameId
                );
                
                setLoadingProgress(100);
                console.log("First player member data:", nextBase[0]?.member);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to load leaderboard";
                toast({ title: "Error", description: message, variant: "destructive" });
                setLoadingProgress(100);
            } finally {
                clearInterval(progressInterval);
                setLoadingLeaderboard(false);
                setLoadingProgress(0);
            }
        },
        [applyCurrentSort, loadUserLikesCount, sortDirection, sortField, toast]
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

        setDoubleDialogOpen(true);
        
        if (doubleRecords.length === 0) {
            await loadDoubleRecords(selectedGame);
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

        setMenVsWomenDialogOpen(true);
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

    const getSortIcon = (field: SortField) => {
        if (sortField !== field)
            return (
                <ArrowUpDown className="w-4 h-4 ml-1 opacity-20 hover:opacity-100 transition-opacity" />
            );
        return sortDirection === "asc" ? (
            <ArrowUp className="w-4 h-4 ml-1 text-sky-600" />
        ) : (
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
                    @keyframes particle-6 {
                        0%   { transform: translate(-50%, 0)               scale(1); opacity: 1; }
                        100% { transform: translate(calc(-50% - 60px), 0)  scale(0); opacity: 0; }
                    }
                    @keyframes particle-7 {
                        0%   { transform: translate(-50%, 0)                       scale(1); opacity: 1; }
                        100% { transform: translate(calc(-50% - 42px), -42px)      scale(0); opacity: 0; }
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
                                <CardHeader className="border-b border-sky-100 pb-3 md:pb-4">
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

                                            {selectedGame && games.find(g => g.id === selectedGame)?.double_enabled && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        void loadDoubleRecords(selectedGame);
                                                        setDoubleDialogOpen(true);
                                                    }}
                                                    className="flex-1"
                                                >
                                                    <Users className="w-4 h-4 mr-2" />
                                                    Score Double
                                                </Button>
                                            )}

                                            {selectedGame && (games.find(g => g.id === selectedGame) as any)?.trio_enabled && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        void loadTrioRecords(selectedGame);
                                                        setTrioDialogOpen(true);
                                                    }}
                                                    className="flex-1"
                                                >
                                                    <Users className="w-4 h-4 mr-2" />
                                                    Score Trio
                                                </Button>
                                            )}

                                            {selectedGame && games.find(g => g.id === selectedGame)?.men_vs_women_enabled && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        void handleOpenMenVsWomenDialog();
                                                    }}
                                                    className="flex-1"
                                                >
                                                    <Users className="w-4 h-4 mr-2" />
                                                    Men vs Women
                                                </Button>
                                            )}

                                            {selectedGame && leaderboard.some((p) => p.clean_game) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        void handleOpenCleanGameDialog();
                                                    }}
                                                    className="flex-1"
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
                                    <CardHeader className="border-b border-red-100 pb-3 md:pb-4">
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
                                                    className="flex items-center justify-between bg-white/60 p-2 rounded-lg border border-red-100"
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
                                    <DialogTitle className="flex items-center gap-2">
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
                                        <p>Tiada data clean game dijumpai.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4, 5].map((gameNum) => {
                                            const winners = cleanGameDataByGame[gameNum] || [];
                                            return (
                                                <div key={`game-${gameNum}`} className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
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
                                                                            <div className="text-xs text-amber-600">Pemenang</div>
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

                        {/* Double Dialog */}
                        <Dialog open={doubleDialogOpen} onOpenChange={setDoubleDialogOpen}>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-blue-600" />
                                        Score Double
                                    </DialogTitle>
                                    <DialogDescription>
                                        Top ranking untuk pemain yang main berpasangan (2 pemain)
                                    </DialogDescription>
                                </DialogHeader>

                                {loadingDoubles ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                                        <p className="text-sm text-muted-foreground">Memuatkan rekod double...</p>
                                    </div>
                                ) : doubleRecords.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                        <p className="text-muted-foreground">Tiada rekod double lagi untuk game ini</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {doubleRecords.map((record, index) => (
                                            <motion.div
                                                key={record.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="flex items-center gap-4 p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-sky-50 hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg shrink-0">
                                                    {index + 1}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <div className="flex items-center gap-2">
                                                            {record.player1?.avatar_url && (
                                                                <img
                                                                    src={record.player1.avatar_url}
                                                                    alt={record.player1.username}
                                                                    className="w-6 h-6 rounded-full object-cover"
                                                                />
                                                            )}
                                                            <span className="font-semibold text-blue-900">
                                                                @{record.player1?.username}
                                                            </span>
                                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                                                {record.player1_score}
                                                            </Badge>
                                                        </div>

                                                        <span className="text-muted-foreground font-bold">+</span>

                                                        <div className="flex items-center gap-2">
                                                            {record.player2?.avatar_url && (
                                                                <img
                                                                    src={record.player2.avatar_url}
                                                                    alt={record.player2.username}
                                                                    className="w-6 h-6 rounded-full object-cover"
                                                                />
                                                            )}
                                                            <span className="font-semibold text-blue-900">
                                                                @{record.player2?.username}
                                                            </span>
                                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                                                {record.player2_score}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground">Jumlah:</span>
                                                        <span className="text-lg font-bold text-blue-600">
                                                            {record.total_score}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* Trio Dialog */}
                        <Dialog open={trioDialogOpen} onOpenChange={setTrioDialogOpen}>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-purple-600" />
                                        Score Trio
                                    </DialogTitle>
                                    <DialogDescription>
                                        Top ranking untuk pemain yang main bertiga (3 pemain)
                                    </DialogDescription>
                                </DialogHeader>

                                {loadingTrios ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
                                        <p className="text-sm text-muted-foreground">Memuatkan rekod trio...</p>
                                    </div>
                                ) : trioRecords.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                        <p className="text-muted-foreground">Tiada rekod trio lagi untuk game ini</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {trioRecords.map((record, index) => (
                                            <motion.div
                                                key={record.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="flex items-center gap-4 p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 text-white font-bold text-lg shrink-0">
                                                    {index + 1}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <div className="flex items-center gap-2">
                                                            {record.player1?.avatar_url && (
                                                                <img
                                                                    src={record.player1.avatar_url}
                                                                    alt={record.player1.username}
                                                                    className="w-6 h-6 rounded-full object-cover"
                                                                />
                                                            )}
                                                            <span className="font-semibold text-purple-900">
                                                                @{record.player1?.username}
                                                            </span>
                                                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                                {record.player1_score}
                                                            </Badge>
                                                        </div>

                                                        <span className="text-muted-foreground font-bold">+</span>

                                                        <div className="flex items-center gap-2">
                                                            {record.player2?.avatar_url && (
                                                                <img
                                                                    src={record.player2.avatar_url}
                                                                    alt={record.player2.username}
                                                                    className="w-6 h-6 rounded-full object-cover"
                                                                />
                                                            )}
                                                            <span className="font-semibold text-purple-900">
                                                                @{record.player2?.username}
                                                            </span>
                                                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                                {record.player2_score}
                                                            </Badge>
                                                        </div>

                                                        <span className="text-muted-foreground font-bold">+</span>

                                                        <div className="flex items-center gap-2">
                                                            {record.player3?.avatar_url && (
                                                                <img
                                                                    src={record.player3.avatar_url}
                                                                    alt={record.player3.username}
                                                                    className="w-6 h-6 rounded-full object-cover"
                                                                />
                                                            )}
                                                            <span className="font-semibold text-purple-900">
                                                                @{record.player3?.username}
                                                            </span>
                                                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                                {record.player3_score}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground">Jumlah:</span>
                                                        <span className="text-lg font-bold text-purple-600">
                                                            {record.total_score}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* Men vs Women Dialog */}
                        <Dialog open={menVsWomenDialogOpen} onOpenChange={setMenVsWomenDialogOpen}>
                            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                                        <span className="line-clamp-1">Men vs Women - {games.find(g => g.id === selectedGame)?.game_name}</span>
                                    </DialogTitle>
                                </DialogHeader>
                                {loadingMenVsWomen ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                    </div>
                                ) : !menVsWomenData ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">Tiada data Men vs Women</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 sm:space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <motion.div
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`p-4 sm:p-6 rounded-xl border-3 sm:border-4 ${
                                                    menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                        ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300"
                                                        : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                            ? "bg-gradient-to-br from-pink-500 to-pink-600 border-pink-300"
                                                            : "bg-gradient-to-br from-gray-500 to-gray-600 border-gray-300"
                                                }`}
                                            >
                                                <div className="text-center">
                                                    <div className="text-3xl sm:text-4xl mb-2">👨</div>
                                                    <h3 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-4 flex items-center justify-center gap-2 ${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                            ? "text-white"
                                                            : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                                ? "text-pink-900"
                                                                : "text-gray-900"
                                                    }`}>
                                                        <span>MEN TEAM</span>
                                                        {menVsWomenData.menTotal > menVsWomenData.womenTotal && (
                                                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                                                        )}
                                                    </h3>
                                                    <div className={`text-4xl sm:text-5xl font-black mb-2 sm:mb-4 ${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                            ? "text-white"
                                                            : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                                ? "text-pink-700"
                                                                : "text-gray-700"
                                                    }`}>
                                                        {menVsWomenData.menTotal}
                                                    </div>
                                                    <div className={`text-xs sm:text-sm ${
                                                        menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                            ? "text-blue-100"
                                                            : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                                ? "text-pink-100"
                                                                : "text-gray-500"
                                                    }`}>
                                                        {menVsWomenData.menCount} pemain
                                                    </div>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className={`p-4 sm:p-6 rounded-xl border-3 sm:border-4 ${
                                                    menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                        ? "bg-gradient-to-br from-pink-500 to-pink-600 border-pink-300"
                                                        : menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                            ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300"
                                                            : "bg-gradient-to-br from-gray-500 to-gray-600 border-gray-300"
                                                }`}
                                            >
                                                <div className="text-center">
                                                    <div className="text-3xl sm:text-4xl mb-2">👩</div>
                                                    <h3 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-4 flex items-center justify-center gap-2 ${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                            ? "text-white"
                                                            : menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                                ? "text-blue-900"
                                                                : "text-gray-900"
                                                    }`}>
                                                        <span>WOMEN TEAM</span>
                                                        {menVsWomenData.womenTotal > menVsWomenData.menTotal && (
                                                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                                                        )}
                                                    </h3>
                                                    <div className={`text-4xl sm:text-5xl font-black mb-2 sm:mb-4 ${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                            ? "text-white"
                                                            : menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                                ? "text-blue-700"
                                                                : "text-gray-700"
                                                    }`}>
                                                        {menVsWomenData.womenTotal}
                                                    </div>
                                                    <div className={`text-xs sm:text-sm ${
                                                        menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                            ? "text-pink-100"
                                                            : menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                                ? "text-blue-100"
                                                                : "text-gray-500"
                                                    }`}>
                                                        {menVsWomenData.womenCount} pemain
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>

                                        <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200">
                                            <h4 className="font-bold text-purple-900 mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
                                                <span className="text-base sm:text-lg">📊</span>
                                                Breakdown Kiraan:
                                            </h4>
                                            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-gray-700">👨 Men Total Score:</span>
                                                    <span className="font-bold text-blue-700">{menVsWomenData.menTotal}</span>
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-gray-700">👩 Women Total Score:</span>
                                                    <span className="font-bold text-pink-700">
                                                        {menVsWomenData.womenTotal - (menVsWomenData.womenHandicap * menVsWomenData.womenCount)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-gray-700 flex-shrink-0">➕ Women Handicap:</span>
                                                    <span className="font-bold text-pink-700 text-right">
                                                        {menVsWomenData.womenHandicap} × {menVsWomenData.womenCount} = {menVsWomenData.womenHandicap * menVsWomenData.womenCount}
                                                    </span>
                                                </div>
                                                <div className="border-t border-purple-300 pt-2 mt-2 flex justify-between items-center gap-2">
                                                    <span className="text-gray-700 font-bold flex-shrink-0">👩 Women Final Total:</span>
                                                    <span className="font-black text-pink-700">{menVsWomenData.womenTotal}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.3, type: "spring" }}
                                            className={`p-4 sm:p-6 rounded-xl text-center ${
                                                menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                    ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                                    : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                        ? "bg-gradient-to-r from-pink-500 to-pink-600"
                                                        : "bg-gradient-to-r from-gray-500 to-gray-600"
                                            }`}
                                        >
                                            <div className="text-4xl sm:text-6xl mb-2 sm:mb-3">
                                                {menVsWomenData.menTotal > menVsWomenData.womenTotal ? "👨🏆" :
                                                 menVsWomenData.womenTotal > menVsWomenData.menTotal ? "👩🏆" :
                                                 "🤝"}
                                            </div>
                                            <h3 className="text-xl sm:text-3xl font-black text-white mb-1 sm:mb-2">
                                                {menVsWomenData.menTotal > menVsWomenData.womenTotal ? "MEN TEAM MENANG!" :
                                                 menVsWomenData.womenTotal > menVsWomenData.menTotal ? "WOMEN TEAM MENANG!" :
                                                 "SERI!"}
                                            </h3>
                                            <p className="text-white text-sm sm:text-lg">
                                                Perbezaan: {Math.abs(menVsWomenData.menTotal - menVsWomenData.womenTotal)} pin
                                            </p>
                                        </motion.div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
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
                <Dialog open={doubleDialogOpen} onOpenChange={setDoubleDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                Score Double
                            </DialogTitle>
                            <DialogDescription>
                                Top ranking untuk pemain yang main berpasangan (2 pemain)
                            </DialogDescription>
                        </DialogHeader>

                        {loadingDoubles ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                                <p className="text-sm text-muted-foreground">Memuatkan rekod double...</p>
                            </div>
                        ) : doubleRecords.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground">Tiada rekod double lagi untuk game ini</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {doubleRecords.map((record, index) => (
                                    <motion.div
                                        key={record.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center gap-4 p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-sky-50 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg shrink-0">
                                            {index + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <div className="flex items-center gap-2">
                                                    {record.player1?.avatar_url && (
                                                        <img
                                                            src={record.player1.avatar_url}
                                                            alt={record.player1.username}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    )}
                                                    <span className="font-semibold text-blue-900">
                                                        @{record.player1?.username}
                                                    </span>
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                                        {record.player1_score}
                                                    </Badge>
                                                </div>

                                                <span className="text-muted-foreground font-bold">+</span>

                                                <div className="flex items-center gap-2">
                                                    {record.player2?.avatar_url && (
                                                        <img
                                                            src={record.player2.avatar_url}
                                                            alt={record.player2.username}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    )}
                                                    <span className="font-semibold text-blue-900">
                                                        @{record.player2?.username}
                                                    </span>
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                                        {record.player2_score}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">Jumlah:</span>
                                                <span className="text-lg font-bold text-blue-600">
                                                    {record.total_score}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Trio Dialog */}
                <Dialog open={trioDialogOpen} onOpenChange={setTrioDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-600" />
                                Score Trio
                            </DialogTitle>
                            <DialogDescription>
                                Top ranking untuk pemain yang main bertiga (3 pemain)
                            </DialogDescription>
                        </DialogHeader>

                        {loadingTrios ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
                                <p className="text-sm text-muted-foreground">Memuatkan rekod trio...</p>
                            </div>
                        ) : trioRecords.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground">Tiada rekod trio lagi untuk game ini</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {trioRecords.map((record, index) => (
                                    <motion.div
                                        key={record.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center gap-4 p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 text-white font-bold text-lg shrink-0">
                                            {index + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <div className="flex items-center gap-2">
                                                    {record.player1?.avatar_url && (
                                                        <img
                                                            src={record.player1.avatar_url}
                                                            alt={record.player1.username}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    )}
                                                    <span className="font-semibold text-purple-900">
                                                        @{record.player1?.username}
                                                    </span>
                                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                        {record.player1_score}
                                                    </Badge>
                                                </div>

                                                <span className="text-muted-foreground font-bold">+</span>

                                                <div className="flex items-center gap-2">
                                                    {record.player2?.avatar_url && (
                                                        <img
                                                            src={record.player2.avatar_url}
                                                            alt={record.player2.username}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    )}
                                                    <span className="font-semibold text-purple-900">
                                                        @{record.player2?.username}
                                                    </span>
                                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                        {record.player2_score}
                                                    </Badge>
                                                </div>

                                                <span className="text-muted-foreground font-bold">+</span>

                                                <div className="flex items-center gap-2">
                                                    {record.player3?.avatar_url && (
                                                        <img
                                                            src={record.player3.avatar_url}
                                                            alt={record.player3.username}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    )}
                                                    <span className="font-semibold text-purple-900">
                                                        @{record.player3?.username}
                                                    </span>
                                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                                        {record.player3_score}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">Jumlah:</span>
                                                <span className="text-lg font-bold text-purple-600">
                                                    {record.total_score}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Men vs Women Dialog */}
                <Dialog open={menVsWomenDialogOpen} onOpenChange={setMenVsWomenDialogOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                                <span className="line-clamp-1">Men vs Women - {games.find(g => g.id === selectedGame)?.game_name}</span>
                            </DialogTitle>
                        </DialogHeader>
                        {loadingMenVsWomen ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            </div>
                        ) : !menVsWomenData ? (
                            <div className="text-center py-8 text-gray-500">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Tiada data Men vs Women</p>
                            </div>
                        ) : (
                            <div className="space-y-4 sm:space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 sm:p-6 rounded-xl border-3 sm:border-4 ${
                                            menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300"
                                                : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                    ? "bg-gradient-to-br from-pink-500 to-pink-600 border-pink-300"
                                                    : "bg-gradient-to-br from-gray-500 to-gray-600 border-gray-300"
                                        }`}
                                    >
                                        <div className="text-center">
                                            <div className="text-3xl sm:text-4xl mb-2">👨</div>
                                            <h3 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-4 flex items-center justify-center gap-2 ${
                                                menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                    ? "text-white"
                                                    : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                        ? "text-pink-900"
                                                        : "text-gray-900"
                                            }`}>
                                                <span>MEN TEAM</span>
                                                {menVsWomenData.menTotal > menVsWomenData.womenTotal && (
                                                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                                                )}
                                            </h3>
                                            <div className={`text-4xl sm:text-5xl font-black mb-2 sm:mb-4 ${
                                                menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                    ? "text-white"
                                                    : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                        ? "text-pink-700"
                                                        : "text-gray-700"
                                            }`}>
                                                {menVsWomenData.menTotal}
                                            </div>
                                            <div className={`text-xs sm:text-sm ${
                                                menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                    ? "text-blue-100"
                                                    : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                        ? "text-pink-100"
                                                        : "text-gray-500"
                                            }`}>
                                                {menVsWomenData.menCount} pemain
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className={`p-4 sm:p-6 rounded-xl border-3 sm:border-4 ${
                                            menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                ? "bg-gradient-to-br from-pink-500 to-pink-600 border-pink-300"
                                                : menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                    ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300"
                                                    : "bg-gradient-to-br from-gray-500 to-gray-600 border-gray-300"
                                        }`}
                                    >
                                        <div className="text-center">
                                            <div className="text-3xl sm:text-4xl mb-2">👩</div>
                                            <h3 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-4 flex items-center justify-center gap-2 ${
                                                menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                    ? "text-white"
                                                    : menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                        ? "text-blue-900"
                                                        : "text-gray-900"
                                            }`}>
                                                <span>WOMEN TEAM</span>
                                                {menVsWomenData.womenTotal > menVsWomenData.menTotal && (
                                                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                                                )}
                                            </h3>
                                            <div className={`text-4xl sm:text-5xl font-black mb-2 sm:mb-4 ${
                                                menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                    ? "text-white"
                                                    : menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                        ? "text-blue-700"
                                                        : "text-gray-700"
                                            }`}>
                                                {menVsWomenData.womenTotal}
                                            </div>
                                            <div className={`text-xs sm:text-sm ${
                                                menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                    ? "text-pink-100"
                                                    : menVsWomenData.menTotal > menVsWomenData.womenTotal
                                                        ? "text-blue-100"
                                                        : "text-gray-500"
                                            }`}>
                                                {menVsWomenData.womenCount} pemain
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200">
                                    <h4 className="font-bold text-purple-900 mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
                                        <span className="text-base sm:text-lg">📊</span>
                                        Breakdown Kiraan:
                                    </h4>
                                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-gray-700">👨 Men Total Score:</span>
                                            <span className="font-bold text-blue-700">{menVsWomenData.menTotal}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-gray-700">👩 Women Total Score:</span>
                                            <span className="font-bold text-pink-700">
                                                {menVsWomenData.womenTotal - (menVsWomenData.womenHandicap * menVsWomenData.womenCount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-gray-700 flex-shrink-0">➕ Women Handicap:</span>
                                            <span className="font-bold text-pink-700 text-right">
                                                {menVsWomenData.womenHandicap} × {menVsWomenData.womenCount} = {menVsWomenData.womenHandicap * menVsWomenData.womenCount}
                                            </span>
                                        </div>
                                        <div className="border-t border-purple-300 pt-2 mt-2 flex justify-between items-center gap-2">
                                            <span className="text-gray-700 font-bold flex-shrink-0">👩 Women Final Total:</span>
                                            <span className="font-black text-pink-700">{menVsWomenData.womenTotal}</span>
                                        </div>
                                    </div>
                                </div>

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.3, type: "spring" }}
                                    className={`p-4 sm:p-6 rounded-xl text-center ${
                                        menVsWomenData.menTotal > menVsWomenData.womenTotal
                                            ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                            : menVsWomenData.womenTotal > menVsWomenData.menTotal
                                                ? "bg-gradient-to-r from-pink-500 to-pink-600"
                                                : "bg-gradient-to-r from-gray-500 to-gray-600"
                                    }`}
                                >
                                    <div className="text-4xl sm:text-6xl mb-2 sm:mb-3">
                                        {menVsWomenData.menTotal > menVsWomenData.womenTotal ? "👨🏆" :
                                         menVsWomenData.womenTotal > menVsWomenData.menTotal ? "👩🏆" :
                                         "🤝"}
                                    </div>
                                    <h3 className="text-xl sm:text-3xl font-black text-white mb-1 sm:mb-2">
                                        {menVsWomenData.menTotal > menVsWomenData.womenTotal ? "MEN TEAM MENANG!" :
                                         menVsWomenData.womenTotal > menVsWomenData.menTotal ? "WOMEN TEAM MENANG!" :
                                         "SERI!"}
                                    </h3>
                                    <p className="text-white text-sm sm:text-lg">
                                        Perbezaan: {Math.abs(menVsWomenData.menTotal - menVsWomenData.womenTotal)} pin
                                    </p>
                                </motion.div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </>
        </MemberLayout>
    );
}