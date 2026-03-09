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
import { ClubLogo } from "@/components/ClubLogo";
import confetti from "canvas-confetti";
import { useAuth } from "@/hooks/useAuth";

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
  const { member, loading, isAuthenticated } = useAuth(true);
  
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
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  async function loadChampions() {
    try {
      setLoadingChampions(true);

      // Get all Blok games with their top scorer
      const { data: games, error } = await supabase
        .from("games")
        .select(`
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
        `)
        .eq("game_type", "Blok Rasmi 10 PIN")
        .order("game_date", { ascending: false });

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

  const filteredChampions = selectedYear === "all" 
    ? champions 
    : champions.filter(c => c.year.toString() === selectedYear);

  return (
    <>
      <SEO title="Hall of Fame - AMBC Club" description="Senarai juara mengikut tahun" />
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/member")}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <ClubLogo size="sm" />
                <div>
                  <h1 className="text-2xl font-bold">Hall of Fame</h1>
                  <p className="text-sm text-yellow-100">Atlet Terbaik AMBC</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-6">
          {/* Year Filter */}
          <Card className="mb-6 bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
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
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Champions List */}
          {loadingChampions ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
            </div>
          ) : filteredChampions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Tiada juara dijumpai
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredChampions.map((champion, index) => (
                <Card
                  key={`${champion.game_name}-${index}`}
                  className="transform transition-all hover:scale-[1.02] hover:shadow-xl bg-gradient-to-r from-white to-yellow-50 border-2 border-yellow-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      {/* Trophy Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <Trophy className="h-8 w-8 text-white" />
                        </div>
                      </div>

                      {/* Champion Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-yellow-600 text-white">
                            {champion.year}
                          </Badge>
                          <h3 className="font-bold text-lg text-gray-800">
                            {champion.game_name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {new Date(champion.game_date).toLocaleDateString("ms-MY", {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </p>

                        <div className="flex items-center gap-3">
                          <Link href={`/member/profile?id=${champion.winner.id}`}>
                            {champion.winner.avatar_url ? (
                              <Image
                                src={champion.winner.avatar_url}
                                alt={champion.winner.username}
                                width={50}
                                height={50}
                                className="rounded-full border-2 border-yellow-400 shadow-md"
                              />
                            ) : (
                              <div className="w-[50px] h-[50px] rounded-full bg-yellow-600 flex items-center justify-center text-white font-bold">
                                {champion.winner.username[0].toUpperCase()}
                              </div>
                            )}
                          </Link>
                          <div>
                            <Link href={`/member/profile?id=${champion.winner.id}`}>
                              <p className="font-bold text-lg hover:text-yellow-600 transition-colors">
                                {champion.winner.full_name}
                              </p>
                              <p className="text-sm text-gray-600">@{champion.winner.username}</p>
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Score</p>
                        <p className="text-3xl font-bold text-yellow-600">
                          {champion.winner.overall_score}
                        </p>
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