import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Loader2 } from "lucide-react";
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
  Heart,
  Shuffle } from
"lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const { member, isAuthenticated } = useAuth(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalGames: 0,
    averageScore: 0,
    highScore: 0,
    rank: "-"
  });

  useEffect(() => {
    if (isAuthenticated && member) {
      loadStats();
    }
  }, [isAuthenticated, member]);

  async function loadStats() {
    try {
      if (!member?.id) return;

      const { data: playerData } = await supabase.
      from("game_players").
      select("total_score").
      eq("member_id", member.id);

      const scores = playerData?.map((p) => p.total_score || 0) || [];
      const totalGames = scores.length;
      const averageScore = totalGames > 0 ?
      Math.round(scores.reduce((a, b) => a + b, 0) / totalGames) :
      0;
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
    color: "text-sky-100",
    gradient: "from-sky-500 to-blue-500"
  },
  {
    icon: TrendingUp,
    label: "Purata",
    value: stats.averageScore,
    color: "text-blue-100",
    gradient: "from-blue-500 to-indigo-500"
  },
  {
    icon: Trophy,
    label: "Tertinggi",
    value: stats.highScore,
    color: "text-amber-100",
    gradient: "from-amber-500 to-orange-500"
  },
  {
    icon: Award,
    label: "Kedudukan",
    value: stats.rank,
    color: "text-cyan-100",
    gradient: "from-cyan-500 to-blue-500"
  }];


  const navigationCards: NavigationCard[] = [
  {
    title: "Blok",
    description: "Lihat kedudukan blok",
    href: "/member/blok",
    icon: Trophy,
    gradient: "from-sky-400 to-blue-500",
    iconColor: "text-sky-100",
    badgeText: "Game",
    badgeColor: "bg-sky-100 text-sky-700"
  },
  {
    title: "Couple",
    description: "Leaderboard bergandingan",
    href: "/member/couple",
    icon: Heart,
    gradient: "from-pink-400 to-rose-500",
    iconColor: "text-pink-100",
    badgeText: "Team",
    badgeColor: "bg-pink-100 text-pink-700"
  },
  {
    title: "Five+Five",
    description: "Sertai pertandingan five-five",
    href: "/member/five-five",
    icon: Star,
    gradient: "from-blue-400 to-indigo-500",
    iconColor: "text-blue-100",
    badgeText: "5+5",
    badgeColor: "bg-blue-100 text-blue-700"
  },
  {
    title: "Mini Blok",
    description: "Rekod mini blok anda",
    href: "/member/mini-blok",
    icon: BarChart3,
    gradient: "from-indigo-400 to-blue-500",
    iconColor: "text-indigo-100"
  },
  {
    title: "Hall of Fame",
    description: "Senarai pencapaian terbaik",
    href: "/member/hall-of-fame",
    icon: Award,
    gradient: "from-amber-400 to-orange-500",
    iconColor: "text-amber-100",
    badgeText: "Juara",
    badgeColor: "bg-amber-100 text-amber-700"
  },
  {
    title: "Training",
    description: "Rekod latihan bowling",
    href: "/member/training",
    icon: Target,
    gradient: "from-cyan-400 to-sky-500",
    iconColor: "text-cyan-100"
  },
  {
    title: "Purata Skor",
    description: "Statistik purata skor ahli",
    href: "/member/average-score",
    icon: TrendingUp,
    gradient: "from-emerald-400 to-teal-500",
    iconColor: "text-emerald-100"
  },
  {
    title: "Undi Lane",
    description: "Undian lane secara rawak",
    href: "/member/undi-lane",
    icon: Shuffle,
    gradient: "from-slate-400 to-gray-500",
    iconColor: "text-slate-100",
    badgeText: "",
    badgeColor: "bg-slate-100 text-slate-700"
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
    gradient: "from-violet-400 to-purple-500",
    iconColor: "text-violet-100"
  },
  {
    title: "Feedback",
    description: "Hantar maklum balas",
    href: "/member/feedback",
    icon: MessageSquare,
    gradient: "from-sky-400 to-blue-500",
    iconColor: "text-sky-100"
  }];


  if (loading) {
    return (
      <MemberLayout>
        <SEO 
          title="Dashboard | AMBC Club" 
          description="Member dashboard for AMBC Bowling Club"
        />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
            <p className="text-sky-600 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <SEO
        title="Dashboard - AMBC Club"
        description="Dashboard ahli AMBC Bowling Club" />
      

      <div className="min-h-screen bg-gradient-to-br from-sky-50/30 via-blue-50/20 to-indigo-50/30">
        {/* Welcome Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 text-white">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          <div className="relative container max-w-6xl mx-auto px-4 py-8 md:py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center">
              
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 md:px-4 md:py-2 mb-3 md:mb-4">
                <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm font-medium">Selamat Datang</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 drop-shadow-lg">
                {member?.full_name || "Tetamu"}
              </h1>
              <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto px-4">
                Dashboard anda untuk semua aktiviti bowling di AMBC Club 🎳
              </p>
            </motion.div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-3 md:px-4 py-6 md:py-8 space-y-6 md:space-y-8 pb-24 md:pb-8">
          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            
            {quickStats.map((stat, index) =>
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}>
              
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
                  <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4 px-3 md:px-4">
                    <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
                      <div className={`p-1.5 md:p-2 rounded-lg bg-gradient-to-br ${stat.gradient} bg-opacity-10`}>
                        <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                      </div>
                    </div>
                    <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Navigation Cards */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-4 md:mb-6 px-1">
              
              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text text-transparent mb-1.5 md:mb-2">
                Menu Utama
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">Pilih aktiviti yang anda ingin akses</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {navigationCards.map((card, index) =>
              <motion.div
                key={card.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}>
                
                  <Link href={card.href}>
                    <Card className="group h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-pointer">
                      <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${card.gradient} transition-all duration-300 group-hover:h-full group-hover:opacity-10`} />
                      
                      <CardHeader className="relative pb-3 md:pb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className={`p-2.5 md:p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <card.icon className={`h-5 w-5 md:h-6 md:w-6 ${card.iconColor}`} />
                          </div>
                          {card.badgeText && (
                            <Badge className={`${card.badgeColor} text-xs`}>
                              {card.badgeText}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg md:text-xl group-hover:bg-gradient-to-r group-hover:from-sky-500 group-hover:to-blue-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                          {card.title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="relative pt-0">
                        <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                          {card.description}
                        </p>
                        <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs md:text-sm group-hover:bg-gradient-to-r group-hover:from-sky-500 group-hover:to-blue-500 group-hover:text-white transition-all duration-300">
                        
                          Buka
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )}
            </div>
          </div>

          {/* Profile Quick Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}>
            
            <Link href="/member/profile">
              <Card className="border-2 border-sky-200 bg-gradient-to-br from-sky-50/50 to-blue-50/30 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardContent className="py-4 md:py-6 px-4 md:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-md flex-shrink-0">
                        {member?.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs md:text-sm text-muted-foreground">Profil Anda</p>
                        <p className="text-base md:text-lg font-bold text-sky-600 truncate">{member?.full_name}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="border-sky-200 text-sky-600 hover:bg-sky-50 text-xs md:text-sm px-3 md:px-4 flex-shrink-0">
                      <span className="hidden sm:inline">Lihat Profil</span>
                      <span className="sm:hidden">Profil</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </div>
    </MemberLayout>);

}