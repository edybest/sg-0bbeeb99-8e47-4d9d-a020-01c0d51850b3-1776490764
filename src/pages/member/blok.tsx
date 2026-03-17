import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { MobileNav } from "@/components/member/MobileNav";
import { PageAccessGuard } from "@/components/PageAccessGuard";

import {
  Trophy,
  Loader2,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight
} from "lucide-react";

import { motion } from "framer-motion";
import Image from "next/image";

type GameSummary = Pick<
  Tables<"games">,
  "id" | "game_name" | "game_format" | "game_date" | "created_at">;


interface RawPlayerScore extends Tables<"game_players"> {
  member: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface LeaderboardEntry {
  id: string; // game_player id
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
"rank" |
"username" |
"game1_score" |
"game2_score" |
"game3_score" |
"game4_score" |
"game5_score" |
"handicap" |
"total_score" |
"overall_score" |
"average_score" |
"difference";

type SortDirection = "asc" | "desc";

const STICKY_LEFT = {
  rank: "left-0",
  avatar: "left-14",
  player: "left-28",
  overall: "left-[13rem]",
  diff: "left-[19rem]"
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
    rank: index + 1
  }));
}

export default function BlokPage() {
  const router = useRouter();
  const { loading: authLoading, member: currentUser } = useAuth(false);
  const { toast } = useToast();

  const [games, setGames] = useState<GameSummary[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leaderboardBase, setLeaderboardBase] = useState<LeaderboardEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [previousLeaderboard, setPreviousLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [animatingScores, setAnimatingScores] = useState<Set<string>>(new Set());
  const [retryCount, setRetryCount] = useState(0);

  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isInitialLoading = loadingGames && games.length === 0;
  const isPageLoading = authLoading || isInitialLoading;

  const applyCurrentSort = useMemo(() => {
    return (baseData: LeaderboardEntry[], field: SortField, direction: SortDirection) => {
      if (field === "rank") {
        return direction === "asc" ? [...baseData] : [...baseData].reverse();
      }
      return sortData(baseData, field, direction);
    };
  }, []);

  const loadGames = async (showToast = false) => {
    try {
      setLoadingGames(true);
      setError(null);

      const { data, error: dbError } = await supabase.
      from("games").
      select("id, game_name, game_format, game_date, created_at").
      order("game_date", { ascending: false });

      if (dbError) throw dbError;

      const gameList = data ?? [];
      setGames(gameList);

      if (gameList.length > 0) {
        setSelectedGame((current) => current ?? gameList[0].id);
      } else {
        setSelectedGame(null);
      }

      if (showToast) {
        toast({
          title: "Data refreshed",
          description: "Games loaded successfully."
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load games";
      setError(message);

      if (showToast) {
        toast({
          title: "Connection error",
          description: message,
          variant: "destructive"
        });
      }
    } finally {
      setLoadingGames(false);
    }
  };

  const loadLeaderboard = async (gameId: string) => {
    if (!gameId) return;

    try {
      setLoadingLeaderboard(true);

      const { data: rawData, error: dbError } = await supabase.
      from("game_players").
      select(
        `
          *,
          member:members(id, username, full_name, avatar_url)
        `
      ).
      eq("game_id", gameId);

      if (dbError) throw dbError;

      const scores = (rawData ?? []) as unknown as RawPlayerScore[];
      const nextBase = buildLeaderboard(scores);

      if (previousLeaderboard.length > 0) {
        const changedIds = new Set<string>();
        const notifications: string[] = [];

        nextBase.forEach((newEntry) => {
          const oldEntry = previousLeaderboard.find((old) => old.id === newEntry.id);
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
            rankChange > 0 ?
            `↑${rankChange} (Rank ${newEntry.rank})` :
            rankChange < 0 ?
            `↓${Math.abs(rankChange)} (Rank ${newEntry.rank})` :
            `(Rank ${newEntry.rank})`;

            notifications.push(
              `${newEntry.member.username} ${rankText}\n${changes.join(", ")}`
            );
          }
        });

        if (notifications.length > 0) {
          toast({
            title: "🎳 Skor Dikemaskini!",
            description:
            <div className="space-y-2 mt-2">
                                {notifications.map((notification, index) =>
              <div
                key={index}
                className="text-sm whitespace-pre-line border-l-2 border-red-500 pl-2">
                
                                        {notification}
                                    </div>
              )}
                            </div>,

            duration: 5000
          });
        }

        if (changedIds.size > 0) {
          setAnimatingScores(changedIds);
          window.setTimeout(() => {
            setAnimatingScores(new Set());
          }, 1000);
        }
      }

      setPreviousLeaderboard(nextBase);
      setLeaderboardBase(nextBase);
      setLeaderboard(applyCurrentSort(nextBase, sortField, sortDirection));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load leaderboard";
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    void loadGames();
  }, [retryCount]);

  useEffect(() => {
    if (selectedGame) {
      void loadLeaderboard(selectedGame);
    } else {
      setLeaderboard([]);
      setLeaderboardBase([]);
    }
  }, [selectedGame]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleSort = (field: SortField) => {
    let newDirection: SortDirection;

    if (field === sortField) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      newDirection = field === "rank" || field === "username" ? "asc" : "desc";
    }

    setSortField(field);
    setSortDirection(newDirection);
    setLeaderboard(applyCurrentSort(leaderboardBase, field, newDirection));
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-20 hover:opacity-100 transition-opacity" />;
    }

    return sortDirection === "asc" ?
    <ArrowUp className="w-4 h-4 ml-1 text-red-600" /> :

    <ArrowDown className="w-4 h-4 ml-1 text-red-600" />;

  };

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: [0, 1.2, 1],
              rotate: [180, 360, 0],
              y: [0, -3, 0],
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 10,
              duration: 0.8,
            }}
            className="relative"
          >
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
                boxShadow: [
                  "0 0 20px rgba(234,179,8,0.3)",
                  "0 0 40px rgba(234,179,8,0.6)",
                  "0 0 20px rgba(234,179,8,0.3)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-full"
            >
              <Trophy className="w-10 h-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-yellow-400 blur-xl -z-10"
            />
          </motion.div>);


      case 2:
        return (
          <motion.div
            initial={{ scale: 0, y: -50 }}
            animate={{ scale: [0, 1.1, 1], y: [-50, 0, 0] }}
            transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 12 }}
            className="relative">
            
                        <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              
                            <Trophy className="w-9 h-9 text-gray-400 drop-shadow-[0_0_12px_rgba(156,163,175,0.7)]" />
                        </motion.div>
                        <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-gray-300 blur-lg -z-10" />
            
                    </motion.div>);


      case 3:
        return (
          <motion.div
            initial={{ scale: 0, x: 50, opacity: 0 }}
            animate={{ scale: [0, 1.15, 1], x: [50, 0, 0], opacity: [0, 1, 1] }}
            transition={{ delay: 0.3, type: "spring", stiffness: 160, damping: 14 }}
            className="relative">
            
                        <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
              
                            <Trophy className="w-8 h-8 text-amber-700 drop-shadow-[0_0_10px_rgba(180,83,9,0.6)]" />
                        </motion.div>
                        <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-amber-600 blur-lg -z-10" />
            
                    </motion.div>);


      default:
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 + rank * 0.05, type: "spring" }}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 border-2 border-gray-300 shadow-sm">
            
                        {rank}
                    </motion.div>);

    }
  };

  const formatScore = (score: number | null, rowId: string) => {
    if (score === null || score === 0) return "-";

    return (
      <span
        className={`${score >= 200 ? "text-red-600 font-bold" : ""} ${animatingScores.has(rowId) ? "score-changed" : ""}`
        }>
        
                {score}
            </span>);

  };

  if (error && !loadingGames) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                {/* Header */}
          <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/member")}
                    className="text-gray-700 hover:text-red-600">
                    
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Blok Leaderboard</h1>
                    <p className="text-sm text-gray-600">Kedudukan Semasa</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

                <main className="container mx-auto px-4 py-8">
                    <Card className="max-w-md mx-auto">
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="text-red-500 text-5xl">⚠️</div>
                            <h2 className="text-xl font-semibold">Connection Error</h2>
                            <p className="text-gray-600">{error}</p>

                            <div className="bg-gray-100 p-3 rounded text-xs text-left">
                                <p className="font-mono text-gray-700 break-all">{error}</p>
                            </div>

                            <div className="text-sm text-gray-500">
                                Please check browser console (F12) for more details.
                            </div>

                            <Button onClick={handleRetry} className="w-full">
                                Try Again
                            </Button>

                            <Button onClick={() => router.push("/member")} variant="outline" className="w-full">
                                Back to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>);

  }

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                {/* Header */}
          <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/member")}
                    className="text-gray-700 hover:text-red-600">
                    
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Blok Leaderboard</h1>
                    <p className="text-sm text-gray-600">Kedudukan Semasa</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

                <main className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
                            <p className="text-gray-600">Loading games...</p>
                        </div>
                    </div>
                </main>
            </div>);

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
          description="View Blok game leaderboard and rankings" />
        

                <div className="min-h-screen bg-white">
                    {/* Header */}
          <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/member")}
                    className="text-gray-700 hover:text-red-600">
                    
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Blok Leaderboard</h1>
                    <p className="text-sm text-gray-600">Kedudukan Semasa</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

                    <main className="container mx-auto px-4 py-6 space-y-6">
                        {/* Game Selection */}
                        <Card className="bg-white border-gray-200 shadow-md">
                            <CardHeader className="border-b border-gray-200">
                                <CardTitle className="text-gray-900">Pilih Game</CardTitle>
                                <CardDescription className="text-gray-600">
                                    Pilih tarikh untuk melihat kedudukan
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                {loadingGames ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                                    </div>
                                ) : games.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">Tiada game tersedia</div>
                                ) : (
                                    <div className="max-w-md mx-auto">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tarikh & Game</label>
                                        <select
                                            value={selectedGame || ""}
                                            onChange={(e) => setSelectedGame(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 font-medium transition-colors cursor-pointer appearance-none"
                                            style={{
                                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                backgroundPosition: `right 0.75rem center`,
                                                backgroundRepeat: `no-repeat`,
                                                backgroundSize: `1.5em 1.5em`,
                                                paddingRight: `2.5rem`
                                            }}
                                        >
                                            <option value="" disabled>-- Sila Pilih Tarikh --</option>
                                            {games.map((game) => {
                                                const gameDate = new Date(game.game_date);
                                                
                                                // Format dates relatively
                                                const today = new Date();
                                                const yesterday = new Date(today);
                                                yesterday.setDate(yesterday.getDate() - 1);
                                                
                                                const isToday = gameDate.toDateString() === today.toDateString();
                                                const isYesterday = gameDate.toDateString() === yesterday.toDateString();
                                                
                                                let prefix = "";
                                                if (isToday) prefix = "🟢 Hari Ini - ";
                                                else if (isYesterday) prefix = "🔵 Semalam - ";
                                                
                                                const fullDate = gameDate.toLocaleDateString("ms-MY", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                });
                                                
                                                return (
                                                    <option key={game.id} value={game.id}>
                                                        {prefix}{game.game_name} ({fullDate})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {selectedGame &&
            <Card className="bg-white border-gray-200 shadow-md overflow-hidden">
                            <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                                <CardTitle className="text-gray-900 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    Leaderboard
                                </CardTitle>
                                <CardDescription className="text-gray-600">
                                    Skor untuk game yang dipilih
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-0">
                                {loadingLeaderboard ?
                <div className="flex justify-center items-center py-20">
                                            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                                            <span className="ml-3 text-gray-600">Memuatkan skor...</span>
                                        </div> :
                leaderboard.length === 0 ?
                <div className="text-center py-20 text-gray-500">
                                            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                            <p>Tiada skor untuk game ini</p>
                                        </div> :

                <>
                                            <div className="block md:hidden space-y-2 p-2">
                                                {leaderboard.map((entry) =>
                    <Card
                      key={entry.id}
                      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${animatingScores.has(entry.id) ?
                      "animate-pulse bg-yellow-50 border-yellow-400 border-2" :
                      ""}`
                      }
                      onClick={() =>
                      setExpandedRow((current) => current === entry.id ? null : entry.id)
                      }>
                      
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-shrink-0">{getRankDisplay(entry.rank)}</div>

                                                                <div className="flex-shrink-0">
                                                                    {entry.member.avatar_url ? (
                                                                        <Image
                                                                            src={entry.member.avatar_url}
                                                                            alt={entry.member.username}
                                                                            width={40}
                                                                            height={40}
                                                                            className="rounded-full border-2 border-gray-200"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-lg">
                                                                            {entry.member.username[0].toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <Link 
                                                                        href={`/member/profile?id=${entry.member.id}`}
                                                                        className={`font-semibold text-sm truncate hover:text-red-600 transition-colors block ${
                                                                            currentUser?.id === entry.member.id ? "font-bold text-red-600" : ""
                                                                        }`}
                                                                    >
                                                                        {entry.member.username}
                                                                    </Link>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                        <span className="font-bold text-red-600" style={{ fontSize: "24px" }}>
                                                                            {entry.overall_score || "-"}
                                                                        </span>
                                                                        <span className="text-gray-400">•</span>
                                                                        <span>
                                                                            {entry.difference > 0 ?
                                `+${entry.difference}` :
                                entry.difference}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <ChevronRight
                            className={`w-5 h-5 text-gray-400 transition-transform ${expandedRow === entry.id ? "rotate-90" : ""}`
                            } />
                          
                                                            </div>

                                                            {expandedRow === entry.id &&
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                                                    <div className="grid grid-cols-5 gap-2">
                                                                        <div className="text-center">
                                                                            <div className="text-xs text-gray-500 mb-1">G1</div>
                                                                            <div className="text-sm font-semibold">
                                                                                {formatScore(entry.game1_score, entry.id)}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <div className="text-xs text-gray-500 mb-1">G2</div>
                                                                            <div className="text-sm font-semibold">
                                                                                {formatScore(entry.game2_score, entry.id)}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <div className="text-xs text-gray-500 mb-1">G3</div>
                                                                            <div className="text-sm font-semibold">
                                                                                {formatScore(entry.game3_score, entry.id)}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <div className="text-xs text-gray-500 mb-1">G4</div>
                                                                            <div className="text-sm font-semibold">
                                                                                {formatScore(entry.game4_score, entry.id)}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <div className="text-xs text-gray-500 mb-1">G5</div>
                                                                            <div className="text-sm font-semibold">
                                                                                {formatScore(entry.game5_score, entry.id)}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                                                        <div className="bg-gray-50 p-2 rounded">
                                                                            <div className="text-xs text-gray-500">Handicap</div>
                                                                            <div className="font-semibold">{entry.handicap || "-"}</div>
                                                                        </div>
                                                                        <div className="bg-gray-50 p-2 rounded">
                                                                            <div className="text-xs text-gray-500">Total Games</div>
                                                                            <div className="font-semibold">{entry.total_score || "-"}</div>
                                                                        </div>
                                                                        <div className="bg-gray-50 p-2 rounded">
                                                                            <div className="text-xs text-gray-500">Average</div>
                                                                            <div className="font-semibold">
                                                                                {entry.average_score || "-"}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                        }
                                                        </CardContent>
                                                    </Card>
                    )}
                                            </div>

                                            <div className="hidden md:block">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[1200px]">
                                                        <thead>
                                                            <tr className="border-b border-gray-200">
                                                                <th
                              className={`sticky ${STICKY_LEFT.rank} z-20 bg-white px-4 py-3 text-left cursor-pointer hover:bg-gray-50 transition-colors`}
                              onClick={() => handleSort("rank")}>
                              
                                                                    <div className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        #
                                                                        {getSortIcon("rank")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className={`sticky ${STICKY_LEFT.avatar} z-20 bg-white w-14 px-2 py-3 text-center`}>
                              
                                                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Avatar
                                                                    </span>
                                                                </th>

                                                                <th
                              className={`sticky ${STICKY_LEFT.player} z-20 bg-white min-w-[160px] px-4 py-3 text-left cursor-pointer hover:bg-gray-50 transition-colors`}
                              onClick={() => handleSort("username")}>
                              
                                                                    <div className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Player
                                                                        {getSortIcon("username")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className={`sticky ${STICKY_LEFT.overall} z-20 bg-white px-4 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors`}
                              onClick={() => handleSort("overall_score")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Overall
                                                                        {getSortIcon("overall_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className={`sticky ${STICKY_LEFT.diff} z-20 bg-white px-4 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors`}
                              onClick={() => handleSort("difference")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Diff
                                                                        {getSortIcon("difference")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className="px-3 py-3 text-center border-l border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleSort("game1_score")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        G1
                                                                        {getSortIcon("game1_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleSort("game2_score")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        G2
                                                                        {getSortIcon("game2_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleSort("game3_score")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        G3
                                                                        {getSortIcon("game3_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleSort("game4_score")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        G4
                                                                        {getSortIcon("game4_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleSort("game5_score")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        G5
                                                                        {getSortIcon("game5_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className="px-3 py-3 text-center border-l border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleSort("handicap")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        HCP
                                                                        {getSortIcon("handicap")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleSort("total_score")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Total
                                                                        {getSortIcon("total_score")}
                                                                    </div>
                                                                </th>

                                                                <th
                              className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleSort("average_score")}>
                              
                                                                    <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                        Avg
                                                                        {getSortIcon("average_score")}
                                                                    </div>
                                                                </th>
                                                            </tr>
                                                        </thead>

                                                        <tbody>
                                                            {leaderboard.map((entry) =>
                          <tr
                            key={entry.id}
                            className={`border-b transition-all duration-500 ${animatingScores.has(entry.id) ?
                            "bg-yellow-100 animate-pulse" :
                            "hover:bg-gray-50"}`
                            }>
                            
                                                                    <td
                              className={`sticky ${STICKY_LEFT.rank} z-10 bg-white px-4 py-4 whitespace-nowrap text-center`}>
                              
                                                                        <div className="flex items-center justify-center">
                                                                            {getRankDisplay(entry.rank)}
                                                                        </div>
                                                                    </td>

                                                                    <td className={`sticky ${STICKY_LEFT.avatar} z-10 bg-white px-2 py-4 whitespace-nowrap text-center`}>
                                                                        {entry.member.avatar_url ? (
                                                                            <Image
                                                                                src={entry.member.avatar_url}
                                                                                alt={entry.member.username}
                                                                                width={40}
                                                                                height={40}
                                                                                className="rounded-full border-2 border-gray-200 mx-auto"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-lg mx-auto">
                                                                                {entry.member.username[0].toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                    </td>

                                                                    <td
                              className={`sticky ${STICKY_LEFT.player} z-10 bg-white px-4 py-4 whitespace-nowrap`}>
                              
                                                                        <Link
                                                                            href={`/member/profile?id=${entry.member.id}`}
                                                                            className={`font-medium hover:text-red-600 transition-colors ${
                                                                                currentUser?.id === entry.member.id ? "font-bold text-red-600" : ""
                                                                            }`}
                                                                        >
                                                                            {entry.member.username}
                                                                        </Link>
                                                                    </td>

                                                                    <td
                              className={`sticky ${STICKY_LEFT.overall} z-10 bg-white px-4 py-4 whitespace-nowrap text-center font-semibold text-red-600`} style={{ color: "#16a34a" }}>
                              
                                                                        {entry.overall_score || "-"}
                                                                    </td>

                                                                    <td
                              className={`sticky ${STICKY_LEFT.diff} z-10 bg-white px-4 py-4 whitespace-nowrap text-center font-semibold`}>
                              
                                                                        {entry.difference > 0 ?
                              `+${entry.difference}` :
                              entry.difference}
                                                                    </td>

                                                                    <td className="px-3 py-4 whitespace-nowrap text-center border-l border-gray-100">
                                                                        {formatScore(entry.game1_score, entry.id)}
                                                                    </td>
                                                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                                                        {formatScore(entry.game2_score, entry.id)}
                                                                    </td>
                                                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                                                        {formatScore(entry.game3_score, entry.id)}
                                                                    </td>
                                                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                                                        {formatScore(entry.game4_score, entry.id)}
                                                                    </td>
                                                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                                                        {formatScore(entry.game5_score, entry.id)}
                                                                    </td>

                                                                    <td className="px-3 py-4 whitespace-nowrap text-center font-semibold border-l border-gray-100">
                                                                        {entry.handicap || "-"}
                                                                    </td>
                                                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                                                        {entry.total_score || "-"}
                                                                    </td>
                                                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                                                        {entry.average_score || "-"}
                                                                    </td>
                                                                </tr>
                          )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </>
                }
                                </CardContent>
                            </Card>
            }
                    </main>
                </div>
            </>
        </PageAccessGuard>);

}