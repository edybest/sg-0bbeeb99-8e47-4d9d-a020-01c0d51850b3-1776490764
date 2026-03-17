import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { MemberLayout } from "@/components/member/MemberLayout";
import { BowlingBallLoader } from "@/components/BowlingBallLoader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Users, 
  BarChart3,
  Sparkles,
  Star,
  Award,
  ImageIcon,
  MessageSquare,
  Shuffle
} from "lucide-react";

type Member = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
};

type QuickStat = {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  gradient: string;
};

type NavigationCard = {
  title: string;
  description: string;
  href: string;
  icon: any;
  gradient: string;
  iconColor: string;
  badgeText?: string;
  badgeColor?: string;
};

export default function MemberDashboard() {
  const router = useRouter();
  const { member, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGames: 0,
    averageScore: 0,
    highScore: 0,
    rank: "-"
  });

  useEffect(() => {
    if (isAuthenticated && member) {
      loadStats();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, member]);

  async function loadStats() {
    try {
      if (!member?.id) return;

      const { data: playerData } = await supabase
        .from("game_players")
        .select("total_score")
        .eq("member_id", member.id);

      const scores = playerData?.map(p => p.total_score || 0) || [];
      const totalGames = scores.length;
      const averageScore = totalGames > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / totalGames)
        : 0;
      const highScore = totalGames > 0 ? Math.max(...scores) : 0;

      setStats({
        totalGames,
        averageScore,
        highScore,
        rank: "-"
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  }

  const quickStats: QuickStat[] = [
    {
      icon: Target,
      label: "Permainan",
      value: stats.totalGames,
      color: "text-rose-600",
      gradient: "from-rose-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      label: "Purata",
      value: stats.averageScore,
      color: "text-purple-600",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Trophy,
      label: "Tertinggi",
      value: stats.highScore,
      color: "text-amber-600",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      icon: Award,
      label: "Kedudukan",
      value: stats.rank,
      color: "text-blue-600",
      gradient: "from-blue-500 to-cyan-500"
    }
  ];

  const navigationCards: NavigationCard[] = [
    {
      title: "Blok",
      description: "Lihat kedudukan liga blok",
      href: "/member/blok",
      icon: Trophy,
      gradient: "from-rose-400 to-pink-500",
      iconColor: "text-rose-100",
      badgeText: "Liga",
      badgeColor: "bg-rose-100 text-rose-700"
    },
    {
      title: "Five-Five",
      description: "Sertai pertandingan five-five",
      href: "/member/five-five",
      icon: Star,
      gradient: "from-purple-400 to-pink-500",
      iconColor: "text-purple-100",
      badgeText: "Popular",
      badgeColor: "bg-purple-100 text-purple-700"
    },
    {
      title: "Mini Blok",
      description: "Rekod mini blok anda",
      href: "/member/mini-blok",
      icon: BarChart3,
      gradient: "from-pink-400 to-rose-500",
      iconColor: "text-pink-100"
    },
    {
      title: "Hall of Fame",
      description: "Senarai pencapaian terbaik",
      href: "/member/hall-of-fame",
      icon: Award,
      gradient: "from-amber-400 to-orange-500",
      iconColor: "text-amber-100",
      badgeText: "Trending",
      badgeColor: "bg-amber-100 text-amber-700"
    },
    {
      title: "Training",
      description: "Rekod latihan bowling",
      href: "/member/training",
      icon: Target,
      gradient: "from-blue-400 to-cyan-500",
      iconColor: "text-blue-100"
    },
    {
      title: "Purata Skor",
      description: "Statistik purata skor ahli",
      href: "/member/average-score",
      icon: TrendingUp,
      gradient: "from-green-400 to-emerald-500",
      iconColor: "text-green-100"
    },
    {
      title: "Undi Lane",
      description: "Undian lane secara rawak",
      href: "/member/undi-lane",
      icon: Shuffle,
      gradient: "from-violet-400 to-purple-500",
      iconColor: "text-violet-100",
      badgeText: "Fun",
      badgeColor: "bg-violet-100 text-violet-700"
    },
    {
      title: "Lane",
      description: "Semak tugasan lane",
      href: "/member/lane",
      icon: Users,
      gradient: "from-indigo-400 to-blue-500",
      iconColor: "text-indigo-100"
    },
    {
      title: "Gallery",
      description: "Album foto & aktiviti",
      href: "/member/gallery",
      icon: ImageIcon,
      gradient: "from-fuchsia-400 to-pink-500",
      iconColor: "text-fuchsia-100"
    },
    {
      title: "Feedback",
      description: "Hantar maklum balas",
      href: "/member/feedback",
      icon: MessageSquare,
      gradient: "from-cyan-400 to-blue-500",
      iconColor: "text-cyan-100"
    }
  ];

  if (loading) {
    return (
      <MemberLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <BowlingBallLoader />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <SEO 
        title="Dashboard - AMBC Club" 
        description="Dashboard ahli AMBC Bowling Club"
      />

      <div className="min-h-screen bg-gradient-to-br from-rose-50/30 via-pink-50/20 to-purple-50/30">
        {/* Welcome Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 via-pink-400 to-purple-400 text-white">
          <div className="absolute inset-0 bg-[url('/bowling-pattern.svg')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          <div className="relative container max-w-6xl mx-auto px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Selamat Datang</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-lg">
                {member?.full_name || "Ahli AMBC"}
              </h1>
              <p className="text-lg text-white/90 max-w-2xl mx-auto">
                Dashboard anda untuk semua aktiviti bowling di AMBC Club 🎳
              </p>
            </motion.div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {quickStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
                  <CardContent className="pt-6 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} bg-opacity-10`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Navigation Cards */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent mb-2">
                Menu Utama
              </h2>
              <p className="text-muted-foreground">Pilih aktiviti yang anda ingin akses</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {navigationCards.map((card, index) => (
                <motion.div
                  key={card.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                >
                  <Link href={card.href}>
                    <Card className="group h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-pointer">
                      <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${card.gradient} transition-all duration-300 group-hover:h-full group-hover:opacity-10`} />
                      
                      <CardHeader className="relative">
                        <div className="flex items-start justify-between mb-2">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                          </div>
                          {card.badgeText && (
                            <Badge className={`${card.badgeColor} border-0`}>
                              {card.badgeText}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl group-hover:bg-gradient-to-r group-hover:from-rose-500 group-hover:to-pink-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                          {card.title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="relative">
                        <p className="text-sm text-muted-foreground mb-4">
                          {card.description}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="w-full group-hover:bg-gradient-to-r group-hover:from-rose-500 group-hover:to-pink-500 group-hover:text-white transition-all duration-300"
                        >
                          Buka
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Profile Quick Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Link href="/member/profile">
              <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50/50 to-pink-50/30 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {member?.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Profil Anda</p>
                        <p className="text-lg font-bold text-rose-600">{member?.full_name}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
                      Lihat Profil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </div>
    </MemberLayout>
  );
}