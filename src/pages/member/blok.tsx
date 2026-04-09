import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { MemberLayout } from "@/components/member/MemberLayout";

import {
  Trophy,
  Award,
  Sparkles,
  Loader2,
  ArrowLeft,
  Calendar,
  Target
} from "lucide-react";

import { motion } from "framer-motion";
import Image from "next/image";

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
  clean_game: boolean;
  likes_count: number;
}

interface GameWithLeaderboard {
  game: GameSummary;
  leaderboard: LeaderboardEntry[];
  loading: boolean;
}

const GRADIENT_COLORS = [
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-blue-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-sky-600",
];

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
    likes_count: entry.likes_count ?? 0
  }));
}

export default function BlokPage() {
  const router = useRouter();
  const { loading: authLoading, member: currentUser } = useAuth(false);
  const { toast } = useToast();

  const [gamesWithLeaderboards, setGamesWithLeaderboards] = useState<GameWithLeaderboard[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPageLoading = authLoading || loadingGames;

  const loadGamesAndScores = async () => {
    try {
      setLoadingGames(true);
      setError(null);

      // Fetch all games
      const { data: games, error: gamesError } = await supabase
        .from("games")
        .select("id, game_name, game_format, game_date, created_at")
        .neq("game_type", "COUPLE")
        .order("game_date", { ascending: false })
        .limit(20); // Show latest 20 games

      if (gamesError) throw gamesError;

      if (!games || games.length === 0) {
        setGamesWithLeaderboards([]);
        setLoadingGames(false);
        return;
      }

      // Initialize games with empty leaderboards
      const initialGames: GameWithLeaderboard[] = games.map((game) => ({
        game,
        leaderboard: [],
        loading: true
      }));

      setGamesWithLeaderboards(initialGames);
      setLoadingGames(false);

      // Load leaderboards for each game in parallel
      const leaderboardPromises = games.map(async (game) => {
        try {
          const { data: rawData, error: scoresError } = await supabase
            .from("game_players")
            .select(`
              *,
              member:members(id, username, full_name, avatar_url)
            `)
            .eq("game_id", game.id);

          if (scoresError) throw scoresError;

          const scores = (rawData ?? []) as unknown as RawPlayerScore[];
          const leaderboard = buildLeaderboard(scores);

          return { gameId: game.id, leaderboard };
        } catch (err) {
          console.error(`Error loading leaderboard for game ${game.id}:`, err);
          return { gameId: game.id, leaderboard: [] };
        }
      });

      const results = await Promise.all(leaderboardPromises);

      // Update state with loaded leaderboards
      setGamesWithLeaderboards((prev) =>
        prev.map((gameData) => {
          const result = results.find((r) => r.gameId === gameData.game.id);
          return {
            ...gameData,
            leaderboard: result?.leaderboard ?? [],
            loading: false
          };
        })
      );

    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Failed to load games";
      setError(message);
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    loadGamesAndScores();
  }, []);

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500 drop-shadow-lg" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Trophy className="w-5 h-5 text-amber-700" />;
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
            {rank}
          </div>
        );
    }
  };

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
                <h1 className="text-xl font-bold">Blok Leaderboard</h1>
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
              <Button onClick={loadGamesAndScores} className="w-full bg-sky-600 hover:bg-sky-700">
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
        <header className="sticky top-0 z-40 bg-white border-b border-sky-200 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/member")}
                className="text-sky-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-sky-900">Blok Leaderboard</h1>
                <p className="text-sm text-sky-600">Semua Games</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="animate-spin h-12 w-12 mx-auto text-sky-600" />
              <p className="text-sky-600">Loading games...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <MemberLayout>
      <>
        <SEO
          title="Blok Leaderboard - AMBC Club"
          description="View all Blok game leaderboards"
        />

        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <header className="sticky top-0 z-40 bg-white border-b border-sky-200 shadow-sm">
            <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/member")}
                  className="text-sky-700 hover:text-blue-600"
                >
                  <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold text-sky-900">Blok Leaderboard</h1>
                  <p className="text-xs md:text-sm text-sky-600">Semua Games</p>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 pb-32 md:pb-8">
            {gamesWithLeaderboards.length === 0 ? (
              <Card className="max-w-md mx-auto">
                <CardContent className="pt-6 text-center space-y-4">
                  <Trophy className="w-16 h-16 mx-auto text-gray-300" />
                  <h2 className="text-xl font-semibold text-gray-700">Tiada Game Tersedia</h2>
                  <p className="text-gray-500">Belum ada game Blok yang dimainkan lagi.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {gamesWithLeaderboards.map((gameData, index) => {
                  const gameDate = new Date(gameData.game.game_date);
                  const colorClass = GRADIENT_COLORS[index % GRADIENT_COLORS.length];

                  return (
                    <motion.div
                      key={gameData.game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow border-0">
                        <div className={`bg-gradient-to-r ${colorClass} p-4 text-white`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg mb-1">{gameData.game.game_name}</h3>
                              <div className="flex items-center gap-2 text-sm opacity-90">
                                <Calendar className="w-4 h-4" />
                                {gameDate.toLocaleDateString("ms-MY", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                              <Target className="w-3 h-3" />
                              <span className="text-xs font-semibold">
                                {gameData.leaderboard.length} Players
                              </span>
                            </div>
                          </div>
                        </div>

                        <CardContent className="p-0">
                          {gameData.loading ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                          ) : gameData.leaderboard.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-20" />
                              <p className="text-sm">Tiada skor</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {gameData.leaderboard.slice(0, 5).map((entry) => (
                                <div
                                  key={entry.id}
                                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                                    currentUser?.id === entry.member.id ? "bg-blue-50" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">{getRankDisplay(entry.rank)}</div>

                                    <div className="flex-shrink-0">
                                      {entry.member.avatar_url ? (
                                        <Image
                                          src={entry.member.avatar_url}
                                          alt={entry.member.username}
                                          width={40}
                                          height={40}
                                          className="w-[40px] h-[40px] rounded-full object-cover border-2 border-gray-200"
                                          loading="lazy"
                                          unoptimized
                                        />
                                      ) : (
                                        <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center font-bold text-gray-600">
                                          {entry.member.username[0].toUpperCase()}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <Link
                                        href={`/member/profile?id=${entry.member.id}`}
                                        className={`font-semibold text-sm truncate block hover:text-blue-600 transition-colors ${
                                          currentUser?.id === entry.member.id ? "text-blue-600" : "text-gray-800"
                                        }`}
                                      >
                                        {entry.member.username}
                                      </Link>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                          Avg: <span className="font-semibold">{entry.average_score}</span>
                                        </span>
                                        {entry.clean_game && (
                                          <Sparkles className="w-3 h-3 text-amber-500" />
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <div className="flex items-center gap-1 text-emerald-600 font-bold text-lg">
                                        <Award className="w-4 h-4" />
                                        {entry.overall_score}
                                      </div>
                                      {entry.difference > 0 && (
                                        <div className="text-xs text-orange-600 font-medium">
                                          +{entry.difference}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {gameData.leaderboard.length > 5 && (
                                <Link href={`/member/blok?gameId=${gameData.game.id}`}>
                                  <div className="px-4 py-3 text-center text-sm text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer font-medium">
                                    Lihat semua {gameData.leaderboard.length} pemain →
                                  </div>
                                </Link>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </>
    </MemberLayout>
  );
}