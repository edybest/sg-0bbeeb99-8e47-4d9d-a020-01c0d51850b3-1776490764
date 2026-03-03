import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BarChart3, Loader2, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type PlayerAverage = {
  member_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  sex: string;
  birthday: string;
  last_game1: number | null;
  last_game2: number | null;
  last_game3: number | null;
  average_score: number;
  handicap: number;
};

export default function AverageScorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerAverage[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerAverage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAuth();
    loadPlayerAverages();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [searchQuery, players]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
    }
  }

  async function loadPlayerAverages() {
    try {
      setLoading(true);

      // Get all members
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("id, username, full_name, avatar_url, sex, birthday");

      if (membersError) throw membersError;

      const playerAverages: PlayerAverage[] = [];

      for (const member of members || []) {
        // Get last 3 official BLOK games for this member
        const { data: lastGames, error: gamesError } = await supabase
          .from("game_players")
          .select(`
            total_score,
            games!inner (
              game_type,
              is_official,
              game_date
            )
          `)
          .eq("member_id", member.id)
          .eq("games.game_type", "BLOK")
          .eq("games.is_official", true)
          .order("games(game_date)", { ascending: false })
          .limit(3);

        if (gamesError) throw gamesError;

        const scores = lastGames?.map(g => g.total_score) || [];
        const avgScore = scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

        // Calculate handicap based on rules
        let handicap = 0;
        const age = member.birthday 
          ? Math.floor((Date.now() - new Date(member.birthday).getTime()) / 31557600000)
          : 0;

        if (scores.length < 3) {
          // Less than 3 games - handicap is 0 (except special female bowlers - would need a flag)
          if (member.sex === "WOMEN") {
            handicap = 25; // Max handicap for female bowlers
          }
        } else {
          // Calculate handicap: (200 - average) * 0.8
          const calculatedHandicap = Math.round((200 - avgScore) * 0.8);
          handicap = Math.max(0, Math.min(calculatedHandicap, 50));

          // Minimum handicap for under 15
          if (age < 15) {
            handicap = Math.max(handicap, 15);
          }
        }

        playerAverages.push({
          member_id: member.id,
          username: member.username,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
          sex: member.sex,
          birthday: member.birthday,
          last_game1: scores[0] || null,
          last_game2: scores[1] || null,
          last_game3: scores[2] || null,
          average_score: avgScore,
          handicap
        });
      }

      // Sort by average score descending
      playerAverages.sort((a, b) => b.average_score - a.average_score);
      setPlayers(playerAverages);
      setFilteredPlayers(playerAverages);
    } catch (error) {
      console.error("Error loading player averages:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterPlayers() {
    if (!searchQuery) {
      setFilteredPlayers(players);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = players.filter(
      (p) => p.username.toLowerCase().includes(query) || 
             p.full_name.toLowerCase().includes(query)
    );
    setFilteredPlayers(filtered);
  }

  return (
    <>
      <SEO 
        title="Average Score - AMBC Club"
        description="Statistik purata skor ahli bowling AMBC Club"
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
                <BarChart3 className="h-8 w-8 text-red-500" />
                <div>
                  <h1 className="text-2xl font-bold text-red-500">AVERAGE SCORE</h1>
                  <p className="text-sm text-gray-400">Purata Skor & Handicap</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="bg-black/50 border-red-900/50">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-red-500">Statistik Pemain</CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari pemain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-900/50 border-gray-700 text-white"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="text-gray-300">Kedudukan</TableHead>
                        <TableHead className="text-gray-300">Pemain</TableHead>
                        <TableHead className="text-gray-300 text-center">Game 1</TableHead>
                        <TableHead className="text-gray-300 text-center">Game 2</TableHead>
                        <TableHead className="text-gray-300 text-center">Game 3</TableHead>
                        <TableHead className="text-gray-300 text-center">Purata</TableHead>
                        <TableHead className="text-gray-300 text-center">Handicap</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.map((player, index) => (
                        <TableRow key={player.member_id} className="border-gray-800">
                          <TableCell className="text-white font-bold">#{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {player.avatar_url ? (
                                <Image 
                                  src={player.avatar_url} 
                                  alt={player.username} 
                                  width={32} 
                                  height={32} 
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                                  {player.username[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <Link href={`/member/profile/${player.username}`}>
                                  <p className="text-white font-medium hover:text-red-400">
                                    {player.username}
                                  </p>
                                </Link>
                                <p className="text-gray-400 text-xs">{player.full_name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white text-center">
                            {player.last_game1 || "-"}
                          </TableCell>
                          <TableCell className="text-white text-center">
                            {player.last_game2 || "-"}
                          </TableCell>
                          <TableCell className="text-white text-center">
                            {player.last_game3 || "-"}
                          </TableCell>
                          <TableCell className="text-red-500 font-bold text-center">
                            {player.average_score || "-"}
                          </TableCell>
                          <TableCell className="text-yellow-400 font-bold text-center">
                            {player.handicap}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Handicap Rules Info */}
          <Card className="bg-black/50 border-red-900/50 mt-6">
            <CardHeader>
              <CardTitle className="text-red-500">Peraturan Handicap</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-2 text-sm">
              <p>• Handicap dikira berdasarkan 3 blok terakhir yang ahli join</p>
              <p>• Hanya blok Rasmi 10 PIN sahaja dikira</p>
              <p>• Formula: (200 - purata) × 0.8</p>
              <p>• Ahli yang belum cukup 3 kali join blok akan dikira 0 handicap</p>
              <p>• Bowler perempuan tertentu diberi maksima sehingga 25 handicap</p>
              <p>• Untuk bowler bawah umur 15, handicap minimum 15</p>
              <p>• Lebih 3 bulan tidak join blok rasmi, handicap jadi 0 semula</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}