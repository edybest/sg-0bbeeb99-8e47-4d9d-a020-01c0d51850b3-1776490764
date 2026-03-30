import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, TrendingUp, Award, Calendar, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StatisticsData = {
  totalMembers: number;
  activeMembers: number;
  totalGames: number;
  totalScores: number;
  averageScore: number;
  highestScore: number;
  highestScoreMember: string;
  gamesThisMonth: number;
  recentGames: Array<{
    id: string;
    game_name: string;
    game_date: string;
    player_count: number;
  }>;
};

export function StatisticsPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsData>({
    totalMembers: 0,
    activeMembers: 0,
    totalGames: 0,
    totalScores: 0,
    averageScore: 0,
    highestScore: 0,
    highestScoreMember: "-",
    gamesThisMonth: 0,
    recentGames: []
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  async function loadStatistics() {
    try {
      setLoading(true);

      const [membersResult, gamesResult, gamePlayersResult, recentGamesResult] = await Promise.all([
        supabase.from("members").select("id, full_name"),
        supabase.from("games").select("id, game_name, game_date"),
        supabase.from("game_players").select("id, overall_score, member_id, members(full_name)"),
        supabase.from("games").select("id, game_name, game_date").order("game_date", { ascending: false }).limit(5)
      ]);

      const members = membersResult.data || [];
      const games = gamesResult.data || [];
      const gamePlayers = gamePlayersResult.data || [];
      const recentGames = recentGamesResult.data || [];

      const totalScores = gamePlayers.length;
      const averageScore = totalScores > 0 
        ? Math.round(gamePlayers.reduce((sum, gp) => sum + (gp.overall_score || 0), 0) / totalScores)
        : 0;

      const highestScoreData = gamePlayers.reduce((max, current) => 
        (current.overall_score || 0) > (max.overall_score || 0) ? current : max
      , { overall_score: 0, members: { full_name: "-" } });

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const gamesThisMonth = games.filter(g => {
        const gameDate = new Date(g.game_date);
        return gameDate.getMonth() === currentMonth && gameDate.getFullYear() === currentYear;
      }).length;

      const recentGamesWithCount = await Promise.all(
        recentGames.map(async (game) => {
          const { count } = await supabase
            .from("game_players")
            .select("*", { count: "exact", head: true })
            .eq("game_id", game.id);
          
          return {
            id: game.id,
            game_name: game.game_name,
            game_date: game.game_date,
            player_count: count || 0
          };
        })
      );

      setStats({
        totalMembers: members.length,
        activeMembers: members.length,
        totalGames: games.length,
        totalScores,
        averageScore,
        highestScore: highestScoreData.overall_score || 0,
        highestScoreMember: (highestScoreData.members as any)?.full_name || "-",
        gamesThisMonth,
        recentGames: recentGamesWithCount
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Jumlah Ahli",
      value: stats.totalMembers,
      subtitle: `${stats.activeMembers} ahli berdaftar`,
      icon: Users,
      color: "text-sky-600",
      bgColor: "bg-sky-50"
    },
    {
      title: "Jumlah Permainan",
      value: stats.totalGames,
      subtitle: `${stats.gamesThisMonth} bulan ini`,
      icon: Trophy,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Purata Skor",
      value: stats.averageScore,
      subtitle: `Dari ${stats.totalScores} rekod`,
      icon: TrendingUp,
      color: "text-violet-600",
      bgColor: "bg-violet-50"
    },
    {
      title: "Skor Tertinggi",
      value: stats.highestScore,
      subtitle: stats.highestScoreMember,
      icon: Award,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sky-600" />
                Permainan Terkini
              </CardTitle>
              <CardDescription>5 permainan terbaru yang telah dijalankan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentGames.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Belum ada permainan direkodkan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentGames.map((game, index) => (
                <div 
                  key={game.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-600 text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{game.game_name}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(game.game_date).toLocaleDateString("ms-MY", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-sky-100 text-sky-700">
                    <Users className="h-3 w-3 mr-1" />
                    {game.player_count} pemain
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}