import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Trophy, User, BarChart3, Award, Users, Target, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function MemberDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<{
    full_name: string;
    username: string;
    avatar_url: string | null;
  } | null>(null);
  const [stats, setStats] = useState({
    totalGames: 0,
    avgScore: 0,
    bestScore: 0,
    currentRank: 0
  });

  useEffect(() => {
    checkMemberAuth();
  }, []);

  async function checkMemberAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: member } = await supabase
        .from("members")
        .select("full_name, username, avatar_url, is_admin")
        .eq("user_id", session.user.id)
        .single();

      if (!member) {
        router.push("/login");
        return;
      }

      if (member.is_admin) {
        router.push("/admin");
        return;
      }

      setMemberData(member);

      // Load member stats
      const { data: memberRecord } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (memberRecord) {
        // Get total games played
        const { data: games } = await supabase
          .from("game_players")
          .select("id, total_score, overall_score")
          .eq("member_id", memberRecord.id);

        if (games && games.length > 0) {
          const totalGames = games.length;
          const avgScore = Math.round(
            games.reduce((sum, g) => sum + g.total_score, 0) / totalGames
          );
          const bestScore = Math.max(...games.map(g => g.overall_score));

          // Get current rank (count members with higher overall score in latest game)
          const latestGame = await supabase
            .from("games")
            .select("id")
            .order("game_date", { ascending: false })
            .limit(1)
            .single();

          if (latestGame) {
            const { data: myScore } = await supabase
              .from("game_players")
              .select("overall_score")
              .eq("member_id", memberRecord.id)
              .eq("game_id", latestGame.id)
              .single();

            if (myScore) {
              const { count } = await supabase
                .from("game_players")
                .select("id", { count: "exact", head: true })
                .eq("game_id", latestGame.id)
                .gt("overall_score", myScore.overall_score);

              setStats({
                totalGames,
                avgScore,
                bestScore,
                currentRank: (count || 0) + 1
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 via-black to-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Dashboard - AMBC Club"
        description="Dashboard ahli bowling AMBC Club"
      />
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-black to-gray-900">
        <header className="bg-black/50 backdrop-blur border-b border-red-900/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Image 
                  src="/ambc-logo.png" 
                  alt="AMBC Club" 
                  width={60} 
                  height={60}
                  className="drop-shadow-2xl"
                />
                <div>
                  <h1 className="text-2xl font-bold text-red-500">AMBC CLUB</h1>
                  <p className="text-sm text-gray-400">Member Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/member/profile">
                  {memberData?.avatar_url ? (
                    <Image 
                      src={memberData.avatar_url} 
                      alt={memberData.username} 
                      width={40} 
                      height={40}
                      className="rounded-full border-2 border-red-500"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center border-2 border-red-500">
                      <span className="text-white font-bold">
                        {memberData?.username[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="border-red-900/50 hover:bg-red-950/50"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Welcome Message */}
            <Card className="bg-gradient-to-r from-red-900/30 to-black/50 border-red-900/50">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                      Selamat Datang, {memberData?.full_name}!
                    </h2>
                    <p className="text-gray-400">@{memberData?.username}</p>
                  </div>
                  <Image 
                    src="/ambc-logo.png" 
                    alt="AMBC Club" 
                    width={120} 
                    height={120}
                    className="drop-shadow-2xl"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-black/50 border-red-900/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Games</p>
                      <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
                    </div>
                    <Trophy className="h-10 w-10 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-red-900/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Purata Skor</p>
                      <p className="text-3xl font-bold text-white">{stats.avgScore}</p>
                    </div>
                    <BarChart3 className="h-10 w-10 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-red-900/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Skor Tertinggi</p>
                      <p className="text-3xl font-bold text-white">{stats.bestScore}</p>
                    </div>
                    <Award className="h-10 w-10 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-red-900/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Kedudukan</p>
                      <p className="text-3xl font-bold text-white">#{stats.currentRank}</p>
                    </div>
                    <Target className="h-10 w-10 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Link href="/member/blok">
                <Card className="bg-black/50 border-red-900/50 hover:bg-red-950/30 transition-colors cursor-pointer h-full">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                    <Trophy className="h-12 w-12 text-red-500" />
                    <h3 className="text-lg font-bold text-white">BLOK</h3>
                    <p className="text-xs text-gray-400">Leaderboard</p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="bg-black/50 border-red-900/50 opacity-50 cursor-not-allowed h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <Users className="h-12 w-12 text-gray-500" />
                  <h3 className="text-lg font-bold text-gray-500">FIVE-FIVE</h3>
                  <p className="text-xs text-gray-600">Coming Soon</p>
                </CardContent>
              </Card>

              <Link href="/member/hall-of-fame">
                <Card className="bg-black/50 border-red-900/50 hover:bg-red-950/30 transition-colors cursor-pointer h-full">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                    <Award className="h-12 w-12 text-red-500" />
                    <h3 className="text-lg font-bold text-white">HALL OF FAME</h3>
                    <p className="text-xs text-gray-400">Champions</p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="bg-black/50 border-red-900/50 opacity-50 cursor-not-allowed h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <Trophy className="h-12 w-12 text-gray-500" />
                  <h3 className="text-lg font-bold text-gray-500">LIGA</h3>
                  <p className="text-xs text-gray-600">Coming Soon</p>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-red-900/50 opacity-50 cursor-not-allowed h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <Users className="h-12 w-12 text-gray-500" />
                  <h3 className="text-lg font-bold text-gray-500">COUPLE</h3>
                  <p className="text-xs text-gray-600">Coming Soon</p>
                </CardContent>
              </Card>

              <Link href="/member/average-score">
                <Card className="bg-black/50 border-red-900/50 hover:bg-red-950/30 transition-colors cursor-pointer h-full">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                    <BarChart3 className="h-12 w-12 text-red-500" />
                    <h3 className="text-lg font-bold text-white">AVERAGE SCORE</h3>
                    <p className="text-xs text-gray-400">Statistics</p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="bg-black/50 border-red-900/50 opacity-50 cursor-not-allowed h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <Target className="h-12 w-12 text-gray-500" />
                  <h3 className="text-lg font-bold text-gray-500">LANE</h3>
                  <p className="text-xs text-gray-600">Coming Soon</p>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-red-900/50 opacity-50 cursor-not-allowed h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <Trophy className="h-12 w-12 text-gray-500" />
                  <h3 className="text-lg font-bold text-gray-500">TRAINING</h3>
                  <p className="text-xs text-gray-600">Coming Soon</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}