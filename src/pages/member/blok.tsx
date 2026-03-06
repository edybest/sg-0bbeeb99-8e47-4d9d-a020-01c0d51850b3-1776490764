import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Medal, Award, Loader2, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { motion } from "framer-motion";

// Defined specifically for the leaderboard display
type LeaderboardEntry = {
  id: string;
  member_id: string;
  rank: number;
  difference: number;
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
};

type Game = {
  id: string;
  game_name: string;
  game_format: string;
  game_date: string;
  created_at: string;
};

export default function BlokPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    checkAuth();
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      loadLeaderboard();
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

  const loadLeaderboard = async () => {
    if (!selectedGame) return;

    setLoading(true);
    try {
      const { data: scores, error } = await supabase
        .from("game_players")
        .select(`
          *,
          member:members(id, username, full_name, avatar_url)
        `)
        .eq("game_id", selectedGame)
        .order("overall_score", { ascending: false });

      if (error) throw error;

      if (scores) {
        // Sort with tiebreaker: overall → game5 → game4 → game3 → game2 → game1
        const sortedScores = scores.sort((a, b) => {
          // Primary: Overall score (descending)
          if (b.overall_score !== a.overall_score) {
            return b.overall_score - a.overall_score;
          }
          
          // Tiebreaker 1: Game 5 score (descending)
          if (b.game5_score !== a.game5_score) {
            return b.game5_score - a.game5_score;
          }
          
          // Tiebreaker 2: Game 4 score (descending)
          if (b.game4_score !== a.game4_score) {
            return b.game4_score - a.game4_score;
          }
          
          // Tiebreaker 3: Game 3 score (descending)
          if (b.game3_score !== a.game3_score) {
            return b.game3_score - a.game3_score;
          }
          
          // Tiebreaker 4: Game 2 score (descending)
          if (b.game2_score !== a.game2_score) {
            return b.game2_score - a.game2_score;
          }
          
          // Tiebreaker 5: Game 1 score (descending)
          return b.game1_score - a.game1_score;
        });

        const topScore = sortedScores[0]?.overall_score || 0;
        
        const formatted: LeaderboardEntry[] = sortedScores.map((score, index) => ({
          id: score.id,
          member_id: score.member_id,
          rank: index + 1,
          member: score.member,
          game1_score: score.game1_score || 0,
          game2_score: score.game2_score || 0,
          game3_score: score.game3_score || 0,
          game4_score: score.game4_score || 0,
          game5_score: score.game5_score || 0,
          handicap: score.handicap || 0,
          total_score: score.total_score || 0,
          overall_score: score.overall_score || 0,
          average_score: score.average_score || 0,
          difference: topScore - score.overall_score,
        }));

        setLeaderboard(formatted);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
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
                      className={`p-4 rounded-lg border-2 transition-all ${
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
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            {/* Sticky columns */}
                            <th className="sticky left-0 z-30 bg-gray-100 px-3 py-3 text-left text-xs font-semibold text-gray-700 border-r border-gray-200">
                              #
                            </th>
                            <th className="sticky left-[50px] z-30 bg-gray-100 px-2 py-3 text-left text-xs font-semibold text-gray-700 border-r border-gray-200">
                              Avatar
                            </th>
                            <th className="sticky left-[90px] z-30 bg-gray-100 px-3 py-3 text-left text-xs font-semibold text-gray-700 border-r border-gray-200 min-w-[120px]">
                              Username
                            </th>
                            <th className="sticky left-[210px] z-30 bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 md:static md:left-auto">
                              Overall
                            </th>
                            <th className="sticky left-[280px] z-30 bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r-2 border-gray-300 md:static md:left-auto">
                              Diff
                            </th>
                            
                            {/* Scrollable columns */}
                            <th className="bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">G1</th>
                            <th className="bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">G2</th>
                            <th className="bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">G3</th>
                            <th className="bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">G4</th>
                            <th className="bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">G5</th>
                            <th className="bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">HCP</th>
                            <th className="bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700 border-r border-gray-200">Total</th>
                            <th className="bg-gray-100 px-3 py-3 text-center text-xs font-semibold text-gray-700">Avg</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {leaderboard.map((entry, index) => (
                            <motion.tr
                              key={entry.member_id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-gray-100 hover:bg-red-50 transition-colors"
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