import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Medal, Award, Loader2, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { motion } from "framer-motion";

type GamePlayer = {
  id: string;
  member_id: string;
  game_id: string;
  game1_score: number;
  game2_score: number;
  game3_score: number;
  game4_score: number;
  game5_score: number;
  handicap: number;
  total_score: number;
  overall_score: number;
  average_score: number;
  created_at: string;
  member: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

type LeaderboardEntry = GamePlayer & {
  rank: number;
  difference: number;
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
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("game_players")
        .select(`
          *,
          member:members(id, username, full_name, avatar_url)
        `)
        .eq("game_id", selectedGame)
        .order("overall_score", { ascending: false });

      if (error) throw error;

      if (data && Array.isArray(data)) {
        // Find top score to calculate difference
        const topScore = data.length > 0 ? data[0].overall_score : 0;
        
        const leaderboardData: LeaderboardEntry[] = data.map((score: any, index: number) => ({
          ...score,
          rank: index + 1,
          difference: topScore - score.overall_score,
        }));

        setLeaderboard(leaderboardData);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
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
            <Medal className="w-7 h-7 text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]" />
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
        return null;
    }
  };

  if (loading && games.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Blok Leaderboard - AMBC CLUB"
        description="Leaderboard kedudukan terkini pemain bowling AMBC Club"
      />
      <div className="min-h-screen bg-[url('/bg-pattern.png')] bg-fixed bg-slate-950 text-white pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-red-950/80 to-slate-950/90 pointer-events-none" />
        
        {/* Header */}
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/member">
                  <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <ClubLogo size="sm" />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Leaderboard
                  </h1>
                  <p className="text-xs text-red-400 font-medium tracking-wider uppercase">Official Standings</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative container mx-auto px-4 py-6 space-y-6 z-10">
          {/* Game Selector */}
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {games.map((game) => (
              <motion.button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                whileTap={{ scale: 0.95 }}
                className={`
                  snap-start flex-shrink-0 min-w-[140px] p-3 rounded-xl border transition-all duration-300
                  flex flex-col gap-1
                  ${selectedGame === game.id
                    ? "bg-gradient-to-br from-red-600 to-red-900 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                    : "bg-slate-800/50 border-white/5 hover:bg-slate-800 hover:border-white/20"
                  }
                `}
              >
                <span className={`text-xs font-bold uppercase tracking-wider ${selectedGame === game.id ? "text-red-100" : "text-gray-400"}`}>
                  {game.game_format}
                </span>
                <span className="font-bold text-sm truncate">{game.game_name}</span>
                <div className="flex items-center gap-1 text-[10px] opacity-80 mt-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(game.game_date).toLocaleDateString()}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Top 3 Podium (Mobile Only) */}
          {leaderboard.length >= 3 && (
            <div className="md:hidden pt-8 pb-4">
              <div className="flex items-end justify-center gap-2">
                {/* 2nd Place */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center w-1/3"
                >
                  <div className="relative mb-2">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                      <Medal className="w-8 h-8 text-gray-300 drop-shadow-lg" />
                    </div>
                    <Avatar className="w-16 h-16 border-2 border-gray-400 shadow-[0_0_15px_rgba(156,163,175,0.3)]">
                      <AvatarImage src={leaderboard[1].member.avatar_url || ""} />
                      <AvatarFallback className="bg-gray-800 text-gray-400">
                        {leaderboard[1].member.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="bg-gradient-to-t from-gray-900 to-gray-800 w-full rounded-t-lg p-2 pt-4 text-center border-t border-gray-600 relative overflow-hidden">
                    <div className="font-bold text-sm truncate px-1">{leaderboard[1].member.username}</div>
                    <div className="text-gray-400 text-xs font-mono">{leaderboard[1].overall_score}</div>
                    <div className="text-[10px] text-gray-500 mt-1 font-bold">2ND</div>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-500" />
                  </div>
                </motion.div>

                {/* 1st Place */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center w-1/3 -mb-4 z-10"
                >
                  <div className="relative mb-3">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce">
                      <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
                    </div>
                    <Avatar className="w-20 h-20 border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                      <AvatarImage src={leaderboard[0].member.avatar_url || ""} />
                      <AvatarFallback className="bg-yellow-900 text-yellow-500">
                        {leaderboard[0].member.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="bg-gradient-to-t from-yellow-900 to-yellow-800 w-full rounded-t-xl p-2 pt-6 text-center border-t border-yellow-500 shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                    <div className="font-bold text-base truncate px-1 text-yellow-100">{leaderboard[0].member.username}</div>
                    <div className="text-yellow-400 text-sm font-black font-mono tracking-wider">{leaderboard[0].overall_score}</div>
                    <div className="text-[10px] text-yellow-500 mt-1 font-bold">CHAMPION</div>
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                  </div>
                </motion.div>

                {/* 3rd Place */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center w-1/3"
                >
                  <div className="relative mb-2">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                      <Award className="w-8 h-8 text-amber-700 drop-shadow-lg" />
                    </div>
                    <Avatar className="w-16 h-16 border-2 border-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.3)]">
                      <AvatarImage src={leaderboard[2].member.avatar_url || ""} />
                      <AvatarFallback className="bg-amber-950 text-amber-700">
                        {leaderboard[2].member.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="bg-gradient-to-t from-amber-950 to-amber-900 w-full rounded-t-lg p-2 pt-4 text-center border-t border-amber-800 relative overflow-hidden">
                    <div className="font-bold text-sm truncate px-1">{leaderboard[2].member.username}</div>
                    <div className="text-amber-500 text-xs font-mono">{leaderboard[2].overall_score}</div>
                    <div className="text-[10px] text-amber-600 mt-1 font-bold">3RD</div>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-700" />
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md overflow-hidden shadow-xl">
            <CardHeader className="bg-white/5 border-b border-white/5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Trophy className="w-4 h-4 text-red-500" />
                  Ranking
                </CardTitle>
                <div className="text-xs text-gray-400">
                  Total Players: <span className="text-white font-mono">{leaderboard.length}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboard.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="bg-slate-800/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-medium">No records found</p>
                  <p className="text-xs mt-1">Select another game block</p>
                </div>
              ) : (
                <div className="overflow-x-auto relative">
                  {/* Scroll Hint */}
                  <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/80 to-transparent pointer-events-none z-20" />
                  
                  <div className="flex min-w-full">
                    {/* Sticky Column: Player Info */}
                    <div className="sticky left-0 z-10 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <table className="w-full">
                        <thead>
                          <tr className="h-10">
                            <th className="px-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12 bg-slate-900/95">#</th>
                            <th className="px-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[140px] bg-slate-900/95">Player</th>
                            <th className="px-2 text-center text-[10px] font-bold text-white uppercase tracking-wider bg-slate-900/95 border-r border-white/5">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((entry) => (
                            <tr 
                              key={entry.id}
                              className={`
                                h-16 border-b border-white/5 transition-colors
                                ${entry.rank <= 3 ? 'bg-gradient-to-r from-red-900/10 to-transparent' : ''}
                                ${entry.member_id === leaderboard[0].member_id ? 'bg-white/5' : ''}
                              `}
                            >
                              <td className="px-3">
                                <div className={`
                                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                  ${entry.rank === 1 ? 'bg-yellow-500 text-black' : 
                                    entry.rank === 2 ? 'bg-gray-400 text-black' : 
                                    entry.rank === 3 ? 'bg-amber-700 text-white' : 
                                    'bg-slate-800 text-gray-400'}
                                `}>
                                  {entry.rank}
                                </div>
                              </td>
                              <td className="px-3">
                                <Link href={`/member/profile?id=${entry.member.id}`} className="flex items-center gap-2">
                                  <Avatar className="w-8 h-8 border border-white/10">
                                    <AvatarImage src={entry.member.avatar_url || ""} />
                                    <AvatarFallback className="bg-slate-800 text-[10px]">
                                      {entry.member.username.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-white truncate max-w-[90px]">
                                      {entry.member.username}
                                    </span>
                                    {entry.difference !== 0 && (
                                      <div className="flex items-center text-[10px] text-red-400">
                                        <TrendingDown className="w-3 h-3 mr-0.5" />
                                        -{entry.difference}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              </td>
                              <td className="px-2 text-center border-r border-white/5 bg-slate-900/50">
                                <div className="font-bold text-white font-mono">{entry.overall_score}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Scrollable Column: Stats */}
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="h-10 bg-white/5">
                            <th className="px-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12">G1</th>
                            <th className="px-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12">G2</th>
                            <th className="px-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12">G3</th>
                            <th className="px-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12">G4</th>
                            <th className="px-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12">G5</th>
                            <th className="px-2 text-center text-[10px] font-bold text-blue-400 uppercase tracking-wider w-14 border-l border-white/5">HCP</th>
                            <th className="px-2 text-center text-[10px] font-bold text-purple-400 uppercase tracking-wider w-16">Total</th>
                            <th className="px-2 text-center text-[10px] font-bold text-orange-400 uppercase tracking-wider w-16">Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((entry) => (
                            <tr key={`${entry.id}-scores`} className="h-16 border-b border-white/5">
                              <td className="px-2 text-center font-mono text-gray-300">{entry.game1_score}</td>
                              <td className="px-2 text-center font-mono text-gray-300">{entry.game2_score}</td>
                              <td className="px-2 text-center font-mono text-gray-300">{entry.game3_score}</td>
                              <td className="px-2 text-center font-mono text-gray-300">{entry.game4_score}</td>
                              <td className="px-2 text-center font-mono text-gray-300">{entry.game5_score}</td>
                              <td className="px-2 text-center font-mono font-bold text-blue-400 border-l border-white/5">
                                {entry.handicap}
                              </td>
                              <td className="px-2 text-center font-mono font-bold text-purple-400">
                                {entry.total_score}
                              </td>
                              <td className="px-2 text-center font-mono font-bold text-orange-400">
                                {entry.average_score}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}