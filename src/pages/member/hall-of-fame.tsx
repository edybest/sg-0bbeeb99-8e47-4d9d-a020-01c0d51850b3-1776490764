import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Loader2, ChevronDown, CalendarDays } from "lucide-react";
import confetti from "canvas-confetti";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

function formatDate(value?: string | null): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    return date.toLocaleDateString("ms-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

type ChampionWin = {
  game_id: string;
  game_name: string;
  game_date: string;
  overall_score: number;
};

type Champion = {
  member_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  year: number;
  total_champ: number;
  wins: ChampionWin[];
};

export default function HallOfFamePage() {
  const router = useRouter();

  const [champions, setChampions] = useState<Champion[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [years, setYears] = useState<number[]>([]);
  const [loadingChampions, setLoadingChampions] = useState(true);

  useEffect(() => {
    void loadChampions();

    // Confetti celebration on page load
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#FFD700", "#FFA500", "#FF6347"],
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#FFD700", "#FFA500", "#FF6347"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  async function loadChampions() {
    try {
      setLoadingChampions(true);

      // Ambil semua game BLOK rasmi beserta pemain
      const { data: games, error } = await supabase
        .from("games")
        .select(
          `
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
        `
        )
        .eq("game_type", "Blok Rasmi 10 PIN")
        .order("game_date", { ascending: false });

      if (error) throw error;

      // Kumpul juara per game, kemudian group ikut (tahun + member)
      const championMap = new Map<string, Champion>();

      (games || []).forEach((game: any) => {
        const players = game.game_players || [];
        if (!players.length) return;

        // Cari top scorer untuk game ini
        const topPlayer = players.reduce((max: any, player: any) => {
          const currentScore = player.overall_score ?? 0;
          const maxScore = max.overall_score ?? 0;
          return currentScore > maxScore ? player : max;
        }, players[0]);

        const member = topPlayer.members;
        if (!member) return;

        const year: number = game.year;
        const key = `${year}-${member.id}`;

        const win: ChampionWin = {
          game_id: game.id as string,
          game_name: game.game_name as string,
          game_date: game.game_date as string,
          overall_score: topPlayer.overall_score ?? 0,
        };

        if (!championMap.has(key)) {
          championMap.set(key, {
            member_id: member.id,
            username: member.username,
            full_name: member.full_name,
            avatar_url: member.avatar_url,
            year,
            total_champ: 1,
            wins: [win],
          });
        } else {
          const existing = championMap.get(key)!;
          existing.total_champ += 1;
          existing.wins.push(win);
        }
      });

      const championsList = Array.from(championMap.values());

      // Susun: tahun terbaru dulu, dalam tahun ikut bilangan juara (desc), lepas itu ikut username
      championsList.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        if (b.total_champ !== a.total_champ) return b.total_champ - a.total_champ;
        return (a.username || "").localeCompare(b.username || "");
      });

      const yearsSet = new Set<number>();
      championsList.forEach((c) => yearsSet.add(c.year));

      setChampions(championsList);
      setYears(Array.from(yearsSet).sort((a, b) => b - a));
    } catch (err) {
      console.error("Load champions error:", err);
    } finally {
      setLoadingChampions(false);
    }
  }

  const filteredChampions =
    selectedYear === "all"
      ? champions
      : champions.filter((c) => c.year.toString() === selectedYear);

  return (
    <PageAccessGuard
      pagePath="/member/hall-of-fame"
      requireAuth={true}
      renderLoading={() => null}
    >
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
                      className="text-white hover:bg-white/20"
                    >
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
                      <SelectValue placeholder="Pilih tahun" />
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
                  <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
                </div>
              ) : filteredChampions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-rose-500">
                    Tiada juara dijumpai
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredChampions.map((champion) => (
                    <Card
                      key={`${champion.year}-${champion.member_id}`}
                      className="transform transition-all hover:scale-[1.02] hover:shadow-xl bg-gradient-to-r from-white to-yellow-50 border-2 border-rose-200"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <Avatar className="w-16 h-16 flex-shrink-0 border-2 border-pink-200">
                            {champion.avatar_url ? (
                              <AvatarImage src={champion.avatar_url} alt={champion.full_name} />
                            ) : (
                              <AvatarImage src="" alt={champion.full_name} />
                            )}
                            <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-700 font-semibold text-xl">
                              {champion.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>

                          {/* Trophy Icon */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-lg">
                              <Trophy className="w-6 h-6 text-white" />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Name and Username */}
                            <div className="mb-2">
                              <div className="font-bold text-lg">
                                {champion.full_name || "Pemain"}
                              </div>
                              <div className="text-sm text-gray-500">
                                @{champion.username || "username"}
                              </div>
                            </div>

                            {/* Year & total champion count */}
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                                {champion.year}
                              </Badge>
                              <span className="text-sm font-medium text-rose-700">
                                Juara {champion.total_champ} kali
                              </span>
                            </div>

                            {/* Wins dropdown */}
                            {champion.wins.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 flex items-center gap-2"
                                  >
                                    <CalendarDays className="h-4 w-4" />
                                    <span>
                                      Tarikh juara ({champion.total_champ})
                                    </span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {champion.wins.map((win) => (
                                    <DropdownMenuItem key={win.game_id} asChild>
                                      <Link
                                        href={{
                                          pathname: "/member/blok",
                                          query: { gameId: win.game_id },
                                        }}
                                        className="flex w-full items-center justify-between"
                                      >
                                        <span>{formatDate(win.game_date)}</span>
                                        <span className="text-xs text-muted-foreground">
                                          Lihat Blok
                                        </span>
                                      </Link>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
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
      </MemberLayout>
    </PageAccessGuard>
  );
}