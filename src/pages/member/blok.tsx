import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { gameService } from "@/services/gameService";
import { storageService } from "@/services/storageService";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trophy, Medal, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type LeaderboardPlayer = {
  id: string;
  member_id: string;
  game1_score: number;
  game2_score: number;
  game3_score: number;
  game4_score: number;
  game5_score: number;
  total_score: number;
  handicap: number;
  overall_score: number;
  average_score: number;
  members: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

type Game = {
  id: string;
  game_name: string;
  game_date: string;
};

export default function BlokPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [topScore, setTopScore] = useState(0);

  useEffect(() => {
    checkAuth();
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadLeaderboard(selectedGameId);
    }
  }, [selectedGameId]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
    }
  }

  async function loadGames() {
    try {
      const data = await gameService.getAllGames();
      setGames(data as Game[]);
      if (data.length > 0) {
        setSelectedGameId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard(gameId: string) {
    try {
      setLoading(true);
      const data = await gameService.getGamePlayers(gameId);
      setLeaderboard(data as LeaderboardPlayer[]);
      if (data.length > 0) {
        setTopScore(data[0].overall_score);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  }

  function getMedalIcon(rank: number) {
    if (rank === 1) return <Medal className="h-6 w-6 text-yellow-400 animate-pulse" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400 animate-pulse" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600 animate-pulse" />;
    return null;
  }

  function calculateDifference(score: number): number {
    return topScore - score;
  }

  return (
    <>
      <SEO 
        title="BLOK Leaderboard - AMBC Club"
        description="Carta leaderboard game BLOK AMBC Club"
      />
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-black to-gray-900">
        <header className="bg-black/50 backdrop-blur border-b border-red-900/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/member">
                  <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-950/50">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-red-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-red-500">BLOK LEADERBOARD</h1>
                    <p className="text-sm text-gray-400">Carta Kedudukan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="bg-black/50 border-red-900/50 mb-6">
            <CardHeader>
              <CardTitle className="text-red-500">Pilih Game</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                  <SelectValue placeholder="Pilih game..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id} className="text-white">
                      {game.game_name} - {new Date(game.game_date).toLocaleDateString("ms-MY")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-12 w-12 animate-spin text-red-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((player, index) => (
                <Card 
                  key={player.id}
                  className={`bg-gradient-to-r border-2 transition-all hover:scale-[1.02] ${
                    index === 0 
                      ? "from-yellow-900/30 to-black/50 border-yellow-500/50"
                      : index === 1
                      ? "from-gray-700/30 to-black/50 border-gray-400/50"
                      : index === 2
                      ? "from-amber-900/30 to-black/50 border-amber-600/50"
                      : "from-black/30 to-black/50 border-red-900/50"
                  }`}
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Rank & Avatar */}
                      <div className="md:col-span-3 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getMedalIcon(index + 1)}
                          <span className="text-2xl md:text-3xl font-bold text-white">
                            #{index + 1}
                          </span>
                        </div>
                        <Link href={`/member/profile/${player.members.username}`} className="flex items-center gap-3 hover:opacity-80">
                          {player.members.avatar_url ? (
                            <Image 
                              src={storageService.getAvatarUrl(player.members.avatar_url) || player.members.avatar_url} 
                              alt={player.members.username} 
                              width={50} 
                              height={50}
                              className="rounded-full border-2 border-red-500"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center border-2 border-red-500">
                              <span className="text-white font-bold text-lg">
                                {player.members.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-white font-bold">{player.members.username}</p>
                            <p className="text-gray-400 text-sm">{player.members.full_name}</p>
                          </div>
                        </Link>
                      </div>

                      {/* Scores */}
                      <div className="md:col-span-5 grid grid-cols-5 gap-2">
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">G1</p>
                          <p className="text-white font-semibold">{player.game1_score}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">G2</p>
                          <p className="text-white font-semibold">{player.game2_score}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">G3</p>
                          <p className="text-white font-semibold">{player.game3_score}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">G4</p>
                          <p className="text-white font-semibold">{player.game4_score}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">G5</p>
                          <p className="text-white font-semibold">{player.game5_score}</p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">Total</p>
                          <p className="text-white font-bold">{player.total_score}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">HCP</p>
                          <p className="text-white font-bold">{player.handicap}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">Overall</p>
                          <p className="text-red-500 font-bold text-lg">{player.overall_score}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">Beza</p>
                          <p className="text-gray-400 font-semibold">-{calculateDifference(player.overall_score)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Average on mobile */}
                    <div className="mt-3 pt-3 border-t border-gray-800 md:hidden">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Purata Skor:</span>
                        <span className="text-white font-bold">{player.average_score}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}