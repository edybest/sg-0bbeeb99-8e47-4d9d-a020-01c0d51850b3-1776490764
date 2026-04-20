import React, { useState, useEffect } from "react";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, TrendingUp, Calendar, Clock, Target, Users as UsersIcon, Heart, Zap, Star, ArrowRight, Flame, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function MemberDashboard() {
  const { member } = useAuth();
  const [stats, setStats] = useState({
    totalGames: 0,
    averageScore: 0,
    highestScore: 0,
    rank: 0,
  });

  useEffect(() => {
    if (member?.id) {
      loadStats();
    }
  }, [member?.id]);

  async function loadStats() {
    try {
      // Get total games participated
      const { count: gamesCount } = await supabase
        .from("game_players")
        .select("*", { count: "exact", head: true })
        .eq("member_id", member!.id);

      // Get average score
      const { data: scoresData } = await supabase
        .from("game_players")
        .select("overall_score")
        .eq("member_id", member!.id);

      const scores = scoresData?.map(s => s.overall_score || 0) || [];
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

      setStats({
        totalGames: gamesCount || 0,
        averageScore: avgScore,
        highestScore: maxScore,
        rank: 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  return (
    <MemberLayout>
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Selamat Datang
            </span>
            <Flame className="w-8 h-8 text-orange-500" />
          </h1>
          <p className="text-xl text-gray-600 font-medium">{member?.username || "Member"}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-6 h-6 opacity-80" />
              <Badge className="bg-white/20 text-white border-0 text-xs">Total</Badge>
            </div>
            <div className="text-3xl font-black mb-1">{stats.totalGames}</div>
            <div className="text-sm opacity-90 font-medium">Permainan</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-6 h-6 opacity-80" />
              <Badge className="bg-white/20 text-white border-0 text-xs">Avg</Badge>
            </div>
            <div className="text-3xl font-black mb-1">{stats.averageScore}</div>
            <div className="text-sm opacity-90 font-medium">Purata</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 border-0 text-white">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-6 h-6 opacity-80" />
              <Badge className="bg-white/20 text-white border-0 text-xs">Max</Badge>
            </div>
            <div className="text-3xl font-black mb-1">{stats.highestScore}</div>
            <div className="text-sm opacity-90 font-medium">Tertinggi</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-gray-700 to-gray-800 border-0 text-white">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-6 h-6 opacity-80" />
              <Badge className="bg-white/20 text-white border-0 text-xs">Rank</Badge>
            </div>
            <div className="text-3xl font-black mb-1">-</div>
            <div className="text-sm opacity-90 font-medium">Kedudukan</div>
          </Card>
        </div>

        {/* Menu Utama Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Menu Utama</h2>
          <p className="text-gray-600">Pilih aktiviti yang anda ingin akses</p>
        </div>

        {/* Main Menu Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Blok */}
          <Link href="/member/blok">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <Trophy className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Blok</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Couple */}
          <Link href="/member/couple">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <Heart className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Couple</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Trio */}
          <Link href="/member/trio">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <Users className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Trio</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Five+Five */}
          <Link href="/member/five-five">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <Star className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">5+5</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Mini Blok */}
          <Link href="/member/mini-blok">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-500 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <Zap className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Mini Blok</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Hall of Fame */}
          <Link href="/member/hall-of-fame">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-cyan-400 via-blue-400 to-indigo-500 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <Trophy className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Hall of Fame</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Training */}
          <Link href="/member/training">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-red-400 via-rose-400 to-pink-500 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <Target className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Training</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Purata Skor */}
          <Link href="/member/average-score">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-teal-400 via-emerald-400 to-green-500 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <TrendingUp className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Purata Skor</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Undi Lane */}
          <Link href="/member/undi-lane">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <Flame className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Undi Lane</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Lane */}
          <Link href="/member/lane">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <Target className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Lane</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Gallery */}
          <Link href="/member/gallery">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <svg className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Gallery</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Feedback */}
          <Link href="/member/feedback">
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500 border-0 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-6">
                <div className="flex items-start justify-between">
                  <svg className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <div className="w-20 h-20 rounded-full bg-white/10 absolute -right-4 -top-4 group-hover:scale-110 transition-transform"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg mb-1">Feedback</h3>
                  <div className="h-1 w-12 bg-white/50 rounded-full"></div>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </MemberLayout>
  );
}