import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Crown, Star, Sparkles, Loader2, Award } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/hooks/useAuth";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type Champion = {
  year: number;
  game_name: string;
  game_date: string;
  winner: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    overall_score: number;
  };
};

export default function HallOfFamePage() {
  const router = useRouter();
  const { member, loading, isAuthenticated } = useAuth(false);

  const [champions, setChampions] = useState<Champion[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [years, setYears] = useState<number[]>([]);
  const [loadingChampions, setLoadingChampions] = useState(true);

  useEffect(() => {
    loadChampions();

    // Trigger confetti celebration when page loads
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#FFD700", "#FFA500", "#FF6347"]
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#FFD700", "#FFA500", "#FF6347"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>);

  }

  async function loadChampions() {
    try {
      setLoadingChampions(true);

      // Get all Blok games with their top scorer
      const { data: games, error } = await supabase.
      from("games").
      select(`
          id,
          game_name,
          game_date,
          year,
          game_players!inner (
            id,
            member_id,
            overall_score,
            members (
              id,
              username,
              full_name,
              avatar_url
            )
          )
        `).
      eq("game_type", "Blok Rasmi 10 PIN").
      order("game_date", { ascending: false });

      if (error) throw error;

      // Extract champions (top scorer for each game)
      const championsData: Champion[] = [];
      const yearsSet = new Set<number>();

      games?.forEach((game: any) => {
        if (game.game_players && game.game_players.length > 0) {
          // Find top scorer
          const topPlayer = game.game_players.reduce((max: any, player: any) =>
          player.overall_score > max.overall_score ? player : max
          );

          championsData.push({
            year: game.year,
            game_name: game.game_name,
            game_date: game.game_date,
            winner: {
              id: topPlayer.members.id,
              username: topPlayer.members.username,
              full_name: topPlayer.members.full_name,
              avatar_url: topPlayer.members.avatar_url,
              overall_score: topPlayer.overall_score
            }
          });

          yearsSet.add(game.year);
        }
      });

      setChampions(championsData);
      setYears(Array.from(yearsSet).sort((a, b) => b - a));
    } catch (error) {
      console.error("Load champions error:", error);
    } finally {
      setLoadingChampions(false);
    }
  }

  const filteredChampions = selectedYear === "all" ?
  champions :
  champions.filter((c) => c.year.toString() === selectedYear);

  return (
    <PageAccessGuard pagePath="/member/hall-of-fame" requireAuth={true}>
      <MemberLayout>
      <>
        <SEO title="Hall of Fame - AMBC Club" description="Senarai juara mengikut tahun" />
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
          {/* Header */}
          <header className="bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg sticky top-0 z-40">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/member")}
                    className="text-white hover:bg-white/20">
                    
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">Hall of Fame</h1>
                    <p className="text-sm text-yellow-100">Pemain Terbaik AMBC</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="container mx-auto px-4 py-6">
            {/* Year Filter */}
            <Card className="mb-6 bg-gradient-to-r from-rose-100 to-pink-100 border-rose-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-pink-600" />
                  Filter Tahun
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {years.map((year) =>
                    <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Champions List */}
            {loadingChampions ?
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
              </div> :
            filteredChampions.length === 0 ?
            <Card>
                <CardContent className="py-12 text-center text-rose-500">
                  Tiada juara dijumpai
                </CardContent>
              </Card> :

            <div className="space-y-4">
                {filteredChampions.map((champion, index) => (
                  <Card
                    key={`${champion.game_name}-${index}`}
                    className="transform transition-all hover:scale-[1.02] hover:shadow-xl bg-gradient-to-r from-white to-yellow-50 border-2 border-rose-200"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Avatar - Now on LEFT */}
                        <Avatar className="w-16 h-16 flex-shrink-0 border-2 border-pink-200">
                          <AvatarImage src={champion.winner.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-700 font-semibold text-xl">
                            {champion.winner.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>

                        {/* Trophy Icon - Now in CENTER (where avatar was) */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-lg">
                            <Trophy className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Name and Username */}
                          <div className="mb-2">
                            {/* Name */}
                            <div className="font-bold text-lg">
                              {champion.winner.full_name || "Pemain"}
                            </div>
                            {/* Username */}
                            <div className="text-sm text-gray-500">
                              @{champion.winner.username || "username"}
                            </div>
                          </div>

                          {/* Game Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                                {champion.year}
                              </Badge>
                              <span className="text-sm font-medium">{champion.game_name}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(champion.game_date).toLocaleDateString("ms-MY", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-gray-500">Score</span>
                            <span className="text-2xl font-bold text-pink-600">
                              {champion.winner.overall_score}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          </main>
        </div>
      </>
      </MemberLayout>
    </PageAccessGuard>);

}