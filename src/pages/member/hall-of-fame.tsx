import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { gameService } from "@/services/gameService";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trophy, Crown, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Champion = {
  id: string;
  game_id: string;
  member_id: string;
  overall_score: number;
  games: {
    game_name: string;
    game_date: string;
    year: number;
  };
  members: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

export default function HallOfFamePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [champions, setChampions] = useState<Champion[]>([]);

  useEffect(() => {
    checkAuth();
    loadYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadChampions(parseInt(selectedYear));
    }
  }, [selectedYear]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
    }
  }

  async function loadYears() {
    try {
      const { data, error } = await supabase
        .from("games")
        .select("year")
        .order("year", { ascending: false });

      if (error) throw error;

      const uniqueYears = [...new Set(data.map(g => g.year))];
      setYears(uniqueYears);
      if (uniqueYears.length > 0) {
        setSelectedYear(uniqueYears[0].toString());
      }
    } catch (error) {
      console.error("Error loading years:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadChampions(year: number) {
    try {
      setLoading(true);
      
      // Get all games for the selected year
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("id, game_name, game_date, year")
        .eq("year", year)
        .order("game_date", { ascending: false });

      if (gamesError) throw gamesError;

      const championsData: Champion[] = [];

      // For each game, get the top player
      for (const game of gamesData || []) {
        const { data: topPlayer, error: playerError } = await supabase
          .from("game_players")
          .select(`
            id,
            game_id,
            member_id,
            overall_score,
            members (
              username,
              full_name,
              avatar_url
            )
          `)
          .eq("game_id", game.id)
          .order("overall_score", { ascending: false })
          .limit(1)
          .single();

        if (!playerError && topPlayer) {
          championsData.push({
            ...topPlayer,
            games: game,
            members: topPlayer.members as any
          });
        }
      }

      setChampions(championsData);
    } catch (error) {
      console.error("Error loading champions:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SEO 
        title="Hall of Fame - AMBC Club"
        description="Dewan kemasyhuran juara bowling AMBC Club"
      />
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-black to-gray-900">
        <header className="bg-black/50 backdrop-blur border-b border-red-900/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/member">
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-950/50">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-yellow-400" />
                <div>
                  <h1 className="text-2xl font-bold text-red-500">HALL OF FAME</h1>
                  <p className="text-sm text-gray-400">Dewan Kemasyhuran</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="bg-black/50 border-red-900/50 mb-6">
            <CardHeader>
              <CardTitle className="text-red-500">Pilih Tahun</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                  <SelectValue placeholder="Pilih tahun..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-white">
                      {year}
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
              {champions.map((champion, index) => (
                <Card 
                  key={champion.id}
                  className="bg-gradient-to-r from-yellow-900/30 to-black/50 border-2 border-yellow-500/50 transition-all hover:scale-[1.02]"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex items-center gap-4 flex-1">
                        <Crown className="h-12 w-12 text-yellow-400 animate-pulse" />
                        <div className="flex items-center gap-4">
                          {champion.members.avatar_url ? (
                            <Image 
                              src={champion.members.avatar_url} 
                              alt={champion.members.username} 
                              width={60} 
                              height={60}
                              className="rounded-full border-3 border-yellow-400"
                            />
                          ) : (
                            <div className="w-15 h-15 rounded-full bg-yellow-600 flex items-center justify-center border-3 border-yellow-400">
                              <span className="text-white font-bold text-xl">
                                {champion.members.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <Link href={`/member/profile/${champion.members.username}`}>
                              <p className="text-white font-bold text-xl hover:text-yellow-400">
                                {champion.members.username}
                              </p>
                            </Link>
                            <p className="text-gray-400">{champion.members.full_name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4 md:items-center">
                        <div className="text-center md:text-right">
                          <p className="text-gray-400 text-sm mb-1">{champion.games.game_name}</p>
                          <p className="text-white font-semibold">
                            {new Date(champion.games.game_date).toLocaleDateString("ms-MY", {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })}
                          </p>
                        </div>
                        <div className="bg-yellow-900/50 rounded-lg px-6 py-3 border border-yellow-500/50">
                          <p className="text-yellow-400 text-sm mb-1">Skor Juara</p>
                          <p className="text-white font-bold text-2xl">{champion.overall_score}</p>
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