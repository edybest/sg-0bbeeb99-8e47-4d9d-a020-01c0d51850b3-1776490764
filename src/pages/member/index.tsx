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
  Shuffle,
  LayoutGrid,
  Crown,
  Dices,
  MapPin,
  ArrowRight } from
"lucide-react";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon } from "lucide-react";

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
  href: string;
  icon: any;
  gradient: string;
  badgeText?: string;
};

export default function MemberDashboard() {
  const router = useRouter();
  const { member, isAuthenticated, loading: authLoading } = useAuth(false); // Tidak require login
  const [statsLoading, setStatsLoading] = useState(true);
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
      setStatsLoading(false);
    }
  }, [isAuthenticated, member, authLoading]);

  async function loadStats() {
    setStatsLoading(true);
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
      setStatsLoading(false);
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
    href: "/member/blok",
    icon: Trophy,
    gradient: "from-purple-500 to-fuchsia-400"
  },
  {
    title: "Couple",
    href: "/member/couple",
    icon: Heart,
    gradient: "from-teal-400 to-emerald-300"
  },
  {
    title: "Five+Five",
    href: "/member/five-five",
    icon: Star,
    gradient: "from-blue-500 to-sky-400"
  },
  {
    title: "Mini Blok",
    href: "/member/mini-blok",
    icon: LayoutGrid,
    gradient: "from-orange-400 to-amber-300"
  },
  {
    title: "Hall of Fame",
    href: "/member/hall-of-fame",
    icon: Crown,
    gradient: "from-sky-400 to-cyan-300"
  },
  {
    title: "Training",
    href: "/member/training",
    icon: Target,
    gradient: "from-rose-500 to-red-400"
  },
  {
    title: "Purata Skor",
    href: "/member/average-score",
    icon: TrendingUp,
    gradient: "from-cyan-400 to-teal-300"
  },
  {
    title: "Undi Lane",
    href: "/member/undi-lane",
    icon: Dices,
    gradient: "from-pink-500 to-rose-400"
  },
  {
    title: "Lane",
    href: "/member/lane",
    icon: MapPin,
    gradient: "from-indigo-500 to-purple-400"
  },
  {
    title: "Gallery",
    href: "/member/gallery",
    icon: ImageIcon,
    gradient: "from-teal-500 to-emerald-400"
  },
  {
    title: "Feedback",
    href: "/member/feedback",
    icon: MessageSquare,
    gradient: "from-amber-500 to-orange-400"
  }];


  // Tidak perlu loading screen - biar user terus masuk ke dashboard
  // if (authLoading) {
  //   return (
  //     <MemberLayout>
  //       <SEO 
  //         title="Dashboard | AMBC Club" 
  //         description="Member dashboard for AMBC Bowling Club"
  //       />
  //       <div className="min-h-[60vh] flex items-center justify-center">
  //         <div className="flex flex-col items-center gap-4">
  //           <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
  //           <p className="text-sky-600 font-medium">Memuatkan profil anda...</p>
  //         </div>
  //       </div>
  //     </MemberLayout>
  //   );
  // }

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
                {member?.full_name || "AMBC Club"}
              </h1>
              <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto px-4">
                Dashboard anda untuk semua aktiviti bowling di AMBC Club 🎳
              </p>
              
              {/* Login Button untuk pengguna yang belum log masuk */}
              {!member &&
              <div className="mt-6">
                  <Link href="/login">
                    <Button size="lg" className="bg-white text-sky-600 hover:bg-gray-100 font-semibold shadow-lg px-8 py-6 text-lg">
                      <Users className="h-5 w-5 mr-2" />
                      Log Masuk
                    </Button>
                  </Link>
                </div>
              }
            </motion.div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-3 md:px-4 py-6 md:py-8 space-y-6 md:space-y-8 pb-24 md:pb-8">
          {/* Login Promotion Card - Only show for non-logged in users */}
          {!member &&
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}>
              <Link href="/login">
                <Card className="border-2 border-sky-400 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
                  <CardContent className="py-8 px-6 md:py-10 md:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg flex-shrink-0">
                          <Trophy className="h-8 w-8 md:h-10 md:w-10 text-white" />
                        </div>
                        <div className="text-center md:text-left">
                          <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-2">
                            Lihat Statistik Anda!
                          </h3>
                          <p className="text-sm md:text-base text-muted-foreground">
                            Log masuk untuk melihat purata skor, kedudukan, rekod tertinggi dan banyak lagi 📊
                          </p>
                        </div>
                      </div>
                      <Button size="lg" className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white shadow-lg px-8 whitespace-nowrap">
                        <Users className="h-5 w-5 mr-2" />
                        Log Masuk Sekarang
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          }
          
          {/* Quick Stats - Only show for logged in members */}
          {member &&
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
          }

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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 px-1 md:px-0">
              {navigationCards.map((card, index) =>
              <motion.div
                key={card.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="group">
                
                  <Link href={card.href} className="block h-full">
                    <div className={`relative overflow-hidden rounded-[16px] h-24 md:h-28 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 active:scale-95 bg-gradient-to-r ${card.gradient}`}>
                      
                      {/* Decorative elements matching the screenshot */}
                      <span className="absolute top-2 left-2 text-white/50 text-[10px] font-black leading-none select-none">+</span>
                      <span className="absolute bottom-3 left-6 text-white/40 text-[10px] font-black leading-none select-none">+</span>
                      <span className="absolute top-4 right-1/2 text-white/30 text-[12px] font-black leading-none select-none">+</span>
                      <Sparkles className="absolute top-2 right-4 text-white/40 w-3 h-3" />
                      <div className="absolute top-1/2 left-3 text-white/30 w-1 h-1 rounded-full bg-white" />

                      {/* Title */}
                      <div className="absolute top-3 left-4 md:top-4 md:left-5 z-10">
                        <span className="font-bold text-[15px] md:text-lg text-white tracking-wide drop-shadow-md">
                          {card.title}
                        </span>
                      </div>

                      {/* 3D/Glass Layered Icon Effect */}
                      <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 w-16 h-16 md:w-20 md:h-20 text-white opacity-20 transform rotate-[-15deg] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0">
                        <card.icon className="w-full h-full" strokeWidth={3} />
                      </div>
                      <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-16 h-16 md:w-20 md:h-20 text-white opacity-[0.55] transform rotate-[-15deg] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0">
                        <card.icon className="w-full h-full" strokeWidth={1.5} />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}
            </div>
          </div>

          {/* Couple */}
          <Link href="/member/couple">
            


















            
          </Link>

          {/* Trio */}
          <Link href="/member/trio">
            


















            
          </Link>

          {/* Profile Quick Link - Only show for logged in members */}
          {member &&
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
          }
        </div>
      </div>
    </MemberLayout>);

}