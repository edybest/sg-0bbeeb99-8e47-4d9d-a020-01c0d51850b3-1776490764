import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { MobileNav } from "@/components/member/MobileNav";
import { Trophy, Target, Award, Loader2, LogOut, BarChart3, User, Users, LayoutGrid, Shuffle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function MemberDashboard() {
  const router = useRouter();
  const { member, loading, isAuthenticated, logout } = useAuth(true);

  async function handleLogout() {
    await logout();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Member Dashboard - AMBC Club"
        description="Dashboard ahli AMBC Club"
      />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <MobileNav />
                <ClubLogo size="sm" />
                <div>
                  <h1 className="text-2xl font-bold text-red-600">AMBC CLUB</h1>
                  <p className="text-sm text-gray-600">Member Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {member ? (
                  <>
                    {member.avatar_url ? (
                      <Image 
                        src={member.avatar_url} 
                        alt={member.username}
                        width={40}
                        height={40}
                        className="rounded-full border-2 border-red-600"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                        {member.username[0].toUpperCase()}
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={handleLogout}
                      className="border-gray-300 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Logout</span>
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => router.push("/login")}
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <User className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Login</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Welcome Section */}
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">
                    {member ? `Selamat Datang, ${member.full_name}! 🎳` : "Selamat Datang ke AMBC Club! 🎳"}
                  </h2>
                  {member && (
                    <p className="text-red-100">
                      @{member.username}
                    </p>
                  )}
                  {!member && (
                    <p className="text-red-100">
                      Sila login untuk akses penuh
                    </p>
                  )}
                </div>
                <ClubLogo size="xl" />
              </div>
            </CardContent>
          </Card>

          {/* Navigation Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Blok Card */}
            <Link href="/member/blok" className="block transition-transform hover:scale-105">
              <Card className="h-full cursor-pointer hover:shadow-lg border-2 hover:border-yellow-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Blok</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Leaderboard & Rankings</p>
                  </div>
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </CardHeader>
              </Card>
            </Link>

            {/* FiveFive Card */}
            <Link href="/member/five-five" className="block transition-transform hover:scale-105">
              <Card className="h-full cursor-pointer hover:shadow-lg border-2 hover:border-blue-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">FiveFive</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Prize Distribution</p>
                  </div>
                  <Target className="h-6 w-6 text-blue-600" />
                </CardHeader>
              </Card>
            </Link>

            {/* Training Card */}
            <Link href="/member/training" className="block transition-transform hover:scale-105">
              <Card className="h-full cursor-pointer hover:shadow-lg border-2 hover:border-green-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Training</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Practice Scores</p>
                  </div>
                  <Target className="h-6 w-6 text-green-600" />
                </CardHeader>
              </Card>
            </Link>

            {/* Hall of Fame Card */}
            <Link href="/member/hall-of-fame" className="block transition-transform hover:scale-105">
              <Card className="h-full cursor-pointer hover:shadow-lg border-2 hover:border-amber-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Hall of Fame</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Top Performers</p>
                  </div>
                  <Trophy className="h-6 w-6 text-amber-600" />
                </CardHeader>
              </Card>
            </Link>

            {/* Lane Card */}
            <Link href="/member/lane" className="block transition-transform hover:scale-105">
              <Card className="h-full cursor-pointer hover:shadow-lg border-2 hover:border-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Lane</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Kedudukan Lane</p>
                  </div>
                  <LayoutGrid className="h-6 w-6 text-orange-500" />
                </CardHeader>
              </Card>
            </Link>

            {/* Undi Lane Card - NEW */}
            <Link href="/member/undi-lane" className="block transition-transform hover:scale-105">
              <Card className="h-full cursor-pointer hover:shadow-lg border-2 hover:border-purple-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Undi Lane</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Undian Lane Bertuah</p>
                  </div>
                  <Shuffle className="h-6 w-6 text-purple-600" />
                </CardHeader>
              </Card>
            </Link>

            {/* Average Score Card */}
            <Link href="/member/average-score" className="block transition-transform hover:scale-105">
              <Card className="h-full cursor-pointer hover:shadow-lg border-2 hover:border-red-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Average Score</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Purata 3 game terkini</p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-red-600" />
                </CardHeader>
              </Card>
            </Link>

            {/* Profile Card - Only show if logged in */}
            {member && (
              <Link href="/member/profile" className="block transition-transform hover:scale-105">
                <Card className="h-full cursor-pointer hover:shadow-lg border-2 hover:border-red-600">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">Profile</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Edit profile & rekod game</p>
                    </div>
                    <User className="h-6 w-6 text-red-600" />
                  </CardHeader>
                </Card>
              </Link>
            )}
          </div>

          {/* Coming Soon Features */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Coming Soon</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="opacity-60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">Liga</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Coming Soon</p>
                  </div>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
              </Card>

              <Card className="opacity-60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">Couple</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Coming Soon</p>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}