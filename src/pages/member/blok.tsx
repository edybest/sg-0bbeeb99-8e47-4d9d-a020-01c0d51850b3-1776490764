import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trophy, 
  Medal, 
  Award, 
  Loader2, 
  TrendingDown, 
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { MobileNav } from "@/components/member/MobileNav";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

// Define specific types for what we fetch to avoid TS errors
type GameSummary = Pick<Tables<"games">, "id" | "game_name" | "game_format" | "game_date" | "created_at">;

// Raw data shape from Supabase join
interface RawPlayerScore extends Tables<"game_players"> {
  member: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Final shape for UI
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

export default function BlokPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // ALL HOOKS MUST BE DECLARED FIRST
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [previousLeaderboard, setPreviousLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [animatingScores, setAnimatingScores] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const loadGames = async (showToast = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🎯 Blok: Starting to fetch games from Supabase...");
      
      const { data, error: dbError } = await supabase
        .from("games")
        .select("id, game_name, game_format, game_date, created_at")
        .order("game_date", { ascending: false });

      console.log("🎯 Blok: Supabase response:", { data, error: dbError });

      if (dbError) {
        console.error("❌ Blok: Database error:", dbError);
        throw dbError;
      }

      if (data && data.length > 0) {
        console.log(`✅ Blok: Successfully loaded ${data.length} games`);
        setGames(data);
        setSelectedGame(data[0].id);
      } else {
        console.log("⚠️ Blok: No games found in database");
        setGames([]);
      }
      
      if (showToast) {
        toast({
          title: "Data refreshed",
          description: "Games loaded successfully",
        });
      }
    } catch (err) {
      console.error("❌ Blok: Error loading games:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load games";
      setError(errorMessage);
      
      if (showToast) {
        toast({
          title: "Connection error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, [retryCount]); // Re-run when retryCount changes

  useEffect(() => {
    if (selectedGame) {
      loadLeaderboard(selectedGame);
    }
  }, [selectedGame]);

  // Retry handler
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Error state UI
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <MobileNav />
                <ClubLogo size="sm" skipFetch />
                <h1 className="text-xl font-bold text-gray-900">Blok Leaderboard</h1>
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
                Please check browser console (F12) for more details
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

  // Loading state
  if (loading && games.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <MobileNav />
                <ClubLogo size="sm" skipFetch />
                <h1 className="text-xl font-bold text-gray-900">Blok Leaderboard</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-gray-600">Loading games...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const loadLeaderboard = async (gameId: string) => {
    if (!gameId) return;

    setLoading(true);
    try {
      // 1. Fetch raw data
      const { data: rawData, error } = await supabase
        .from("game_players")
        .select(`
          *,
          member:members(id, username, full_name, avatar_url)
        `)
        .eq("game_id", gameId);

      if (error) throw error;

      if (rawData) {
        // Cast to our known type including the joined member
        const scores = rawData as unknown as RawPlayerScore[];

        // 2. Calculate Ranks based on standard bowling rules (Overall -> Game 5 -> Game 4...)
        const sortedByRules = [...scores].sort((a, b) => {
          // Primary: Overall score (descending)
          if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
          // Tiebreakers: G5 -> G4 -> G3 -> G2 -> G1
          if (b.game5_score !== a.game5_score) return b.game5_score - a.game5_score;
          if (b.game4_score !== a.game4_score) return b.game4_score - a.game4_score;
          if (b.game3_score !== a.game3_score) return b.game3_score - a.game3_score;
          if (b.game2_score !== a.game2_score) return b.game2_score - a.game2_score;
          return b.game1_score - a.game1_score;
        });

        const topScore = sortedByRules[0]?.overall_score || 0;

        // 3. Create fully populated LeaderboardEntry objects
        const fullLeaderboard: LeaderboardEntry[] = sortedByRules.map((entry, index) => ({
          id: entry.id,
          member: entry.member,
          game1_score: entry.game1_score,
          game2_score: entry.game2_score,
          game3_score: entry.game3_score,
          game4_score: entry.game4_score,
          game5_score: entry.game5_score,
          handicap: entry.handicap,
          total_score: entry.total_score,
          overall_score: entry.overall_score,
          average_score: entry.average_score,
          difference: index === 0 ? 0 : topScore - entry.overall_score,
          rank: index + 1
        }));

        // 4. Detect changes and show notifications
        if (previousLeaderboard.length > 0) {
          const changedMembers = new Set<string>();
          const notifications: string[] = [];

          fullLeaderboard.forEach(newEntry => {
            const oldEntry = previousLeaderboard.find(old => old.id === newEntry.id);
            
            if (oldEntry) {
              let hasChanges = false;
              const changes: string[] = [];

              // Check each game score
              if (oldEntry.game1_score !== newEntry.game1_score) {
                hasChanges = true;
                changes.push(`G1: ${oldEntry.game1_score} → ${newEntry.game1_score}`);
              }
              if (oldEntry.game2_score !== newEntry.game2_score) {
                hasChanges = true;
                changes.push(`G2: ${oldEntry.game2_score} → ${newEntry.game2_score}`);
              }
              if (oldEntry.game3_score !== newEntry.game3_score) {
                hasChanges = true;
                changes.push(`G3: ${oldEntry.game3_score} → ${newEntry.game3_score}`);
              }
              if (oldEntry.game4_score !== newEntry.game4_score) {
                hasChanges = true;
                changes.push(`G4: ${oldEntry.game4_score} → ${newEntry.game4_score}`);
              }
              if (oldEntry.game5_score !== newEntry.game5_score) {
                hasChanges = true;
                changes.push(`G5: ${oldEntry.game5_score} → ${newEntry.game5_score}`);
              }

              if (hasChanges) {
                changedMembers.add(newEntry.id);
                
                // Check rank change
                const rankChange = oldEntry.rank - newEntry.rank;
                const rankText = rankChange > 0 
                  ? `↑${rankChange} (Rank ${newEntry.rank})` 
                  : rankChange < 0 
                    ? `↓${Math.abs(rankChange)} (Rank ${newEntry.rank})`
                    : `(Rank ${newEntry.rank})`;

                notifications.push(
                  `${newEntry.member.username} ${rankText}\n${changes.join(", ")}`
                );
              }
            }
          });

          // Show toast notifications for changes
          if (notifications.length > 0) {
            toast({
              title: "🎳 Skor Dikemaskini!",
              description: (
                <div className="space-y-2 mt-2">
                  {notifications.map((notif, idx) => (
                    <div key={idx} className="text-sm whitespace-pre-line border-l-2 border-red-500 pl-2">
                      {notif}
                    </div>
                  ))}
                </div>
              ),
              duration: 5000,
            });
          }

          // Trigger animations
          if (changedMembers.size > 0) {
            setAnimatingScores(changedMembers);
            setTimeout(() => setAnimatingScores(new Set()), 1000);
          }
        }

        // 5. Save current state for next comparison
        setPreviousLeaderboard(fullLeaderboard);

        // 6. Apply current sort
        let finalDisplay = fullLeaderboard;
        if (sortField !== "rank") {
          finalDisplay = sortData(fullLeaderboard, sortField, sortDirection);
        } else if (sortDirection === "desc") {
          finalDisplay = [...fullLeaderboard].reverse();
        }

        setLeaderboard(finalDisplay);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortData = (
    data: LeaderboardEntry[],
    field: SortField,
    direction: SortDirection
  ): LeaderboardEntry[] => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (field === "username") {
        aValue = a.member.username.toLowerCase();
        bValue = b.member.username.toLowerCase();
      } else {
        aValue = a[field];
        bValue = b[field];
      }

      if (typeof aValue === "string") {
        return direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Numeric sort
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  };

  const handleSort = (field: SortField) => {
    let newDirection: SortDirection = "asc";
    
    if (field === sortField) {
      // Toggle direction if clicking same field
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      // Default directions for new fields
      // Scores/Numeric usually want DESC first (highest first)
      // Rank/Name usually want ASC first (1-10 or A-Z)
      if (["username", "rank"].includes(field)) {
        newDirection = "asc";
      } else {
        newDirection = "desc";
      }
    }

    setSortField(field);
    setSortDirection(newDirection);

    // If we're just sorting existing data, no need to reload
    // BUT since 'rank' depends on the initial rule-based sort, we sort the *current* leaderboard state
    // Wait - if we sort by Score, Rank should stay fixed to the person? Yes.
    // Rank 1 is always the person who won, even if I sort the table by Name.
    setLeaderboard(sortData(leaderboard, field, newDirection));
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-20 hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 ml-1 text-red-600" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 text-red-600" />
    );
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
            }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 10,
              duration: 0.8
            }}
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
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="rounded-full"
            >
              <Trophy className="w-10 h-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
            </motion.div>
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-yellow-400 blur-xl -z-10"
            />
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ scale: 0, y: -50 }}
            animate={{ 
              scale: [0, 1.1, 1],
              y: [-50, 0, 0]
            }}
            transition={{ 
              delay: 0.15,
              type: "spring",
              stiffness: 180,
              damping: 12
            }}
            className="relative"
          >
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Trophy className="w-9 h-9 text-gray-400 drop-shadow-[0_0_12px_rgba(156,163,175,0.7)]" />
            </motion.div>
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-gray-300 blur-lg -z-10"
            />
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial={{ scale: 0, x: 50, opacity: 0 }}
            animate={{ 
              scale: [0, 1.15, 1],
              x: [50, 0, 0],
              opacity: [0, 1, 1]
            }}
            transition={{ 
              delay: 0.3,
              type: "spring",
              stiffness: 160,
              damping: 14
            }}
            className="relative"
          >
            <motion.div
              animate={{
                y: [0, -3, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Award className="w-8 h-8 text-amber-700 drop-shadow-[0_0_10px_rgba(180,83,9,0.6)]" />
            </motion.div>
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-amber-600 blur-lg -z-10"
            />
          </motion.div>
        );
      default:
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.4 + (rank * 0.05),
              type: "spring"
            }}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 border-2 border-gray-300 shadow-sm"
          >
            {rank}
          </motion.div>
        );
    }
  };

  const formatScore = (score: number | null, memberId: string) => {
    if (score === null || score === 0) return "-";
    const isAnimating = animatingScores.has(memberId);
    return (
      <span className={`${score >= 200 ? "text-red-600 font-bold" : ""} ${isAnimating ? "score-changed" : ""}`}>
        {score}
      </span>
    );
  };

  return (
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

        @keyframes rankChange {
          0% {
            transform: translateX(-10px);
            opacity: 0.5;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .score-changed {
          animation: scoreChange 1s ease-in-out;
        }

        .rank-changed {
          animation: rankChange 0.5s ease-out;
        }
      `}</style>
      <SEO 
        title="Blok Leaderboard - AMBC Club"
        description="View Blok game leaderboard and rankings"
      />
      <div className="min-h-screen bg-white">
        {/* Header with white background */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
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
                
                <ClubLogo size="sm" skipFetch />
                
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Blok Leaderboard</h1>
                  <p className="text-sm text-gray-600">Kedudukan Semasa</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900">Pilih Game</CardTitle>
              <CardDescription className="text-gray-600">
                Pilih game untuk melihat kedudukan
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {loading && games.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                </div>
              ) : games.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Tiada game tersedia
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {games.map((game) => (
                    <motion.button
                      key={game.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedGame(game.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedGame === game.id
                          ? "bg-red-600 border-red-600 text-white shadow-lg"
                          : "bg-white border-gray-200 text-gray-700 hover:border-red-300 hover:bg-red-50"
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
            <Card className="mt-6 bg-white border-gray-200 shadow-md overflow-hidden">
              <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                    <span className="ml-3 text-gray-600">Memuatkan skor...</span>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Tiada skor untuk game ini</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile View - Compact Cards */}
                    <div className="block md:hidden space-y-2">
                      {leaderboard.map((entry, index) => (
                        <Card
                          key={entry.id}
                          className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            animatingScores.has(entry.id) 
                              ? 'animate-pulse bg-yellow-50 border-yellow-400 border-2' 
                              : ''
                          }`}
                          onClick={() => setExpandedRow(
                            expandedRow === entry.id ? null : entry.id
                          )}
                        >
                          <CardContent className="p-4">
                            {/* Compact View */}
                            <div className="flex items-center gap-3">
                              {/* Rank - Now with animated medals for top 3 */}
                              <div className="flex-shrink-0">
                                {getRankDisplay(entry.rank)}
                              </div>

                              {/* Avatar */}
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
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                                    {entry.member.username[0].toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Username & Scores */}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{entry.member.username}</div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <span className="font-bold text-red-600">{entry.overall_score || "-"}</span>
                                  <span className="text-gray-400">•</span>
                                  <span>{entry.difference > 0 ? `+${entry.difference}` : entry.difference}</span>
                                </div>
                              </div>

                              {/* Expand Indicator */}
                              <ChevronRight 
                                className={`w-5 h-5 text-gray-400 transition-transform ${
                                  expandedRow === entry.id ? "rotate-90" : ""
                                }`}
                              />
                            </div>

                            {/* Expanded Details */}
                            {expandedRow === entry.id && (
                              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                {/* Game Scores Grid */}
                                <div className="grid grid-cols-5 gap-2">
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">G1</div>
                                    <div className="text-sm font-semibold">{formatScore(entry.game1_score, entry.member.id)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">G2</div>
                                    <div className="text-sm font-semibold">{formatScore(entry.game2_score, entry.member.id)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">G3</div>
                                    <div className="text-sm font-semibold">{formatScore(entry.game3_score, entry.member.id)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">G4</div>
                                    <div className="text-sm font-semibold">{formatScore(entry.game4_score, entry.member.id)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">G5</div>
                                    <div className="text-sm font-semibold">{formatScore(entry.game5_score, entry.member.id)}</div>
                                  </div>
                                </div>

                                {/* Stats */}
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
                                    <div className="font-semibold">{entry.average_score || "-"}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop View - Table */}
                    <div className="hidden md:block">
                      {/* Scroll hint gradient for mobile */}
                      <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-20" />
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              {/* Rank - Sortable */}
                              <th 
                                className="sticky left-0 z-20 bg-white px-2 sm:px-4 py-3 text-left cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("rank")}
                              >
                                <div className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  #
                                  {getSortIcon("rank")}
                                </div>
                              </th>

                              {/* Avatar - Not sortable */}
                              <th className="sticky left-12 sm:left-16 z-20 bg-white px-2 py-3">
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  Avatar
                                </span>
                              </th>

                              {/* Username - Sortable */}
                              <th 
                                className="sticky left-24 sm:left-32 z-20 bg-white px-2 sm:px-4 py-3 text-left cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("username")}
                              >
                                <div className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  Player
                                  {getSortIcon("username")}
                                </div>
                              </th>

                              {/* Overall - Sortable */}
                              <th 
                                className="sticky left-44 sm:left-60 z-20 bg-white px-2 sm:px-4 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("overall_score")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  Overall
                                  {getSortIcon("overall_score")}
                                </div>
                              </th>

                              {/* Difference - Sortable */}
                              <th 
                                className="sticky left-60 sm:left-80 z-20 bg-white px-2 sm:px-4 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("difference")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  Diff
                                  {getSortIcon("difference")}
                                </div>
                              </th>

                              {/* Game 1 - Sortable */}
                              <th 
                                className="px-3 py-3 text-center border-l border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("game1_score")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  G1
                                  {getSortIcon("game1_score")}
                                </div>
                              </th>

                              {/* Game 2 - Sortable */}
                              <th 
                                className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("game2_score")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  G2
                                  {getSortIcon("game2_score")}
                                </div>
                              </th>

                              {/* Game 3 - Sortable */}
                              <th 
                                className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("game3_score")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  G3
                                  {getSortIcon("game3_score")}
                                </div>
                              </th>

                              {/* Game 4 - Sortable */}
                              <th 
                                className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("game4_score")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  G4
                                  {getSortIcon("game4_score")}
                                </div>
                              </th>

                              {/* Game 5 - Sortable */}
                              <th 
                                className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("game5_score")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  G5
                                  {getSortIcon("game5_score")}
                                </div>
                              </th>

                              {/* Handicap - Sortable */}
                              <th 
                                className="px-3 py-3 text-center border-l border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("handicap")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  HCP
                                  {getSortIcon("handicap")}
                                </div>
                              </th>

                              {/* Total - Sortable */}
                              <th 
                                className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("total_score")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  Total
                                  {getSortIcon("total_score")}
                                </div>
                              </th>

                              {/* Average - Sortable */}
                              <th 
                                className="px-3 py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort("average_score")}
                              >
                                <div className="flex items-center justify-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                  Avg
                                  {getSortIcon("average_score")}
                                </div>
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {leaderboard.map((entry, index) => (
                              <tr 
                                key={entry.member.id} 
                                className={`border-b transition-all duration-500 ${
                                  animatingScores.has(entry.member.id)
                                    ? 'bg-yellow-100 animate-pulse'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center justify-center">
                                    {getRankDisplay(entry.rank)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    {entry.member.avatar_url ? (
                                      <Image
                                        src={entry.member.avatar_url}
                                        alt={entry.member.username}
                                        width={40}
                                        height={40}
                                        className="rounded-full border-2 border-gray-200"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                                        {entry.member.username[0].toUpperCase()}
                                      </div>
                                    )}
                                    <span className="font-medium">{entry.member.username}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">{formatScore(entry.game1_score, entry.member.id)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">{formatScore(entry.game2_score, entry.member.id)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">{formatScore(entry.game3_score, entry.member.id)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">{formatScore(entry.game4_score, entry.member.id)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">{formatScore(entry.game5_score, entry.member.id)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center font-semibold">{entry.handicap || "-"}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-red-600">{entry.overall_score || "-"}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">{entry.total_score || "-"}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">{entry.average_score || "-"}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center font-semibold">
                                  {entry.difference > 0 ? `+${entry.difference}` : entry.difference}
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
  );
}