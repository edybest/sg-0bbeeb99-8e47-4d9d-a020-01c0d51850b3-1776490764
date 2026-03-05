import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { gameService } from "@/services/gameService";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Medal, Award, Loader2 } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";

type GamePlayer = {
  id: string;
  member_id: string;
  game1_score: number;
  game2_score: number;
  game3_score: number;
  game4_score: number;
  game5_score: number;
  handicap: number;
  total_score: number;
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
  game_type: string;
};

export default function BlokPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadGamePlayers(selectedGameId);
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
      const blokGames = data.filter(g => g.game_type.includes("Blok"));
      setGames(blokGames);
      if (blokGames.length > 0) {
        setSelectedGameId(blokGames[0].id);
      }
    } catch (error) {
      console.error("Load games error:", error);
    }
  }

  async function loadGamePlayers(gameId: string) {
    try {
      setLoading(true);
      const data = await gameService.getGamePlayers(gameId);
      setPlayers(data as GamePlayer[]);
    } catch (error) {
      console.error("Load players error:", error);
    } finally {
      setLoading(false);
    }
  }

  function getMedalIcon(position: number) {
    if (position === 1) return <Trophy className="h-8 w-8 text-yellow-400 animate-bounce" />;
    if (position === 2) return <Medal className="h-7 w-7 text-gray-400 animate-pulse" />;
    if (position === 3) return <Medal className="h-6 w-6 text-orange-400 animate-pulse" />;
    return null;
  }

  function calculateDifference(player: GamePlayer): number {
    if (players.length === 0) return 0;
    const topScore = players[0].overall_score;
    return topScore - player.overall_score;
  }

  return (
    <>
      <SEO title="Blok Leaderboard - AMBC Club" description="View current bowling tournament standings" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Link href="/member">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <ClubLogo size="sm" />
              <div>
                <h1 className="text-lg font-bold">Blok Leaderboard</h1>
                <p className="text-xs text-muted-foreground">Kedudukan Semasa</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-6">
          {/* Game Selector */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Pilih Game</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih game..." />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.game_name} - {new Date(game.game_date).toLocaleDateString("ms-MY")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : players.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Tiada pemain dalam game ini
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {players.map((player, index) => (
                <Card
                  key={player.id}
                  className={`transform transition-all hover:scale-[1.02] hover:shadow-lg ${
                    index < 3 ? "border-2 border-red-600" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Position & Medal */}
                      <div className="flex flex-col items-center min-w-[60px]">
                        <span className="text-2xl font-bold text-gray-700">#{index + 1}</span>
                        {getMedalIcon(index + 1)}
                      </div>

                      {/* Avatar & Name */}
                      <Link href={`/member/profile?id=${player.member_id}`} className="flex-shrink-0">
                        {player.members.avatar_url ? (
                          <Image
                            src={player.members.avatar_url}
                            alt={player.members.username}
                            width={60}
                            height={60}
                            className="rounded-full border-2 border-red-600"
                          />
                        ) : (
                          <div className="w-[60px] h-[60px] rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xl">
                            {player.members.username[0].toUpperCase()}
                          </div>
                        )}
                      </Link>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/member/profile?id=${player.member_id}`}>
                          <h3 className="font-bold text-lg hover:text-red-600 transition-colors truncate">
                            {player.members.full_name}
                          </h3>
                          <p className="text-sm text-gray-600">@{player.members.username}</p>
                        </Link>

                        {/* Scores - Desktop */}
                        <div className="hidden md:grid grid-cols-5 gap-2 mt-3">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <div key={num} className="text-center">
                              <p className="text-xs text-gray-500">Game {num}</p>
                              <Badge variant="outline" className="w-full">
                                {player[`game${num}_score` as 'game1_score' | 'game2_score' | 'game3_score' | 'game4_score' | 'game5_score']}
                              </Badge>
                            </div>
                          ))}
                        </div>

                        {/* Scores - Mobile */}
                        <div className="md:hidden grid grid-cols-5 gap-1 mt-2 text-xs">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <div key={num} className="text-center bg-gray-100 rounded p-1">
                              <span className="font-semibold">
                                {player[`game${num}_score` as 'game1_score' | 'game2_score' | 'game3_score' | 'game4_score' | 'game5_score']}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right space-y-1 min-w-[100px]">
                        <div>
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold">{player.total_score}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">HCP</p>
                          <p className="font-semibold text-blue-600">{player.handicap}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Overall</p>
                          <p className="font-bold text-red-600 text-lg">{player.overall_score}</p>
                        </div>
                        {index > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">Beza</p>
                            <p className="text-sm text-gray-600">-{calculateDifference(player)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500">Avg</p>
                          <p className="text-sm">{player.average_score}</p>
                        </div>
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