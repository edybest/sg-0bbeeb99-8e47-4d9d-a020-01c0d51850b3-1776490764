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
  ArrowDown
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";

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
  const [games, setGames] = useState<GameSummary[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    checkAuth();
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      loadLeaderboard(selectedGame);
    }
  }, [selectedGame]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
    }
  };

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from("games")
        .select("id, game_name, game_format, game_date, created_at")
        .order("game_date", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setGames(data);
        setSelectedGame(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading games:", error);
      setLoading(false);
    }
  };

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

        // 4. Apply current sort (if user changed it from default 'rank')
        let finalDisplay = fullLeaderboard;
        if (sortField !== "rank") {
          finalDisplay = sortData(fullLeaderboard, sortField, sortDirection);
        } else if (sortDirection === "desc") {
          // Special case: if sorting by Rank DESC (bottom to top)
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
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
          >
            <Medal className="w-7 h-7 text-gray-400 drop-shadow-[0_0_8px_rgba(156,163,175,0.5)]" />
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Award className="w-6 h-6 text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]" />
          </motion.div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 border border-gray-200">
            {rank}
          </div>
        );
    }
  };

  return (
    <>
      <SEO 
        title="Blok Leaderboard - AMBC CLUB"
        description="Leaderboard kedudukan terkini pemain bowling AMBC Club"
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
                
                <ClubLogo size="sm" />
                
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
                  <div className="relative">
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
                            <motion.tr
                              key={entry.member.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                              {/* Sticky columns */}
                              <td className="sticky left-0 z-20 bg-white px-3 py-3 border-r border-gray-200">
                                {getRankDisplay(entry.rank)}
                              </td>
                              <td className="sticky left-[50px] z-20 bg-white px-2 py-3 border-r border-gray-200">
                                {entry.member.avatar_url ? (
                                  <img
                                    src={entry.member.avatar_url}
                                    alt={entry.member.username}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold border border-gray-300">
                                    {entry.member.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </td>
                              <td className="sticky left-[90px] z-20 bg-white px-3 py-3 border-r border-gray-200">
                                <Link href={`/member/profile?id=${entry.member.id}`}>
                                  <span className="font-medium text-gray-900 hover:text-red-600 hover:underline cursor-pointer transition-colors block truncate max-w-[100px]">
                                    @{entry.member.username}
                                  </span>
                                </Link>
                              </td>
                              <td className="sticky left-[210px] z-20 bg-white px-3 py-3 text-center font-bold text-gray-900 border-r border-gray-200 md:static md:left-auto">
                                {entry.overall_score}
                              </td>
                              <td className="sticky left-[280px] z-20 bg-white px-3 py-3 text-center border-r-2 border-gray-300 md:static md:left-auto">
                                {entry.difference === 0 ? (
                                  <span className="text-yellow-600 font-semibold text-xs bg-yellow-100 px-2 py-1 rounded-full border border-yellow-200">
                                    LEADER
                                  </span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1 text-red-600 text-sm font-medium">
                                    <TrendingDown className="w-3 h-3" />
                                    -{entry.difference}
                                  </div>
                                )}
                              </td>
                              
                              {/* Scrollable columns */}
                              <td className="bg-white px-3 py-3 text-center text-gray-700 border-r border-gray-200 hover:bg-gray-50 transition-colors">
                                {entry.game1_score}
                              </td>
                              <td className="bg-white px-3 py-3 text-center text-gray-700 border-r border-gray-200 hover:bg-gray-50 transition-colors">
                                {entry.game2_score}
                              </td>
                              <td className="bg-white px-3 py-3 text-center text-gray-700 border-r border-gray-200 hover:bg-gray-50 transition-colors">
                                {entry.game3_score}
                              </td>
                              <td className="bg-white px-3 py-3 text-center text-gray-700 border-r border-gray-200 hover:bg-gray-50 transition-colors">
                                {entry.game4_score}
                              </td>
                              <td className="bg-white px-3 py-3 text-center text-gray-700 border-r border-gray-200 hover:bg-gray-50 transition-colors">
                                {entry.game5_score}
                              </td>
                              <td className="bg-white px-3 py-3 text-center text-blue-600 font-medium border-r border-gray-200 bg-blue-50/30">
                                {entry.handicap}
                              </td>
                              <td className="bg-white px-3 py-3 text-center font-semibold text-gray-900 border-r border-gray-200">
                                {entry.total_score}
                              </td>
                              <td className="bg-white px-3 py-3 text-center text-gray-700 font-medium">
                                {entry.average_score}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}