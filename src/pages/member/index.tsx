import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Trophy, BarChart3, Calendar, Users, Award, Target, Loader2, Medal, User } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";

export default function MemberDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<{
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null>(null);

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
        .select("id, username, full_name, avatar_url")
        .eq("user_id", session.user.id)
        .single();

      if (!member) {
        router.push("/login");
        return;
      }

      setMemberData(member);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-red-600" />
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
                <ClubLogo size="sm" />
                <div>
                  <h1 className="text-2xl font-bold text-red-600">AMBC CLUB</h1>
                  <p className="text-sm text-gray-600">Member Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {memberData?.avatar_url ? (
                  <Image 
                    src={memberData.avatar_url} 
                    alt={memberData.username}
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-red-600"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                    {memberData?.username[0].toUpperCase()}
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
                    Selamat Datang, {memberData?.full_name}! 🎳
                  </h2>
                  <p className="text-red-100">
                    @{memberData?.username}
                  </p>
                </div>
                <ClubLogo size="xl" />
              </div>
            </CardContent>
          </Card>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link href="/member/blok">
              <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-red-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Trophy className="h-5 w-5" />
                    Blok
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Leaderboard & ranking terkini
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/member/hall-of-fame">
              <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-red-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Medal className="h-5 w-5" />
                    Hall of Fame
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Senarai juara mengikut tahun
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/member/average-score">
              <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-red-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <BarChart3 className="h-5 w-5" />
                    Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Purata skor 3 game terkini
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/member/profile">
              <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-red-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <User className="h-5 w-5" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Edit profile & rekod game
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Coming Soon Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {["Five-Five", "Liga", "Couple", "Training"].map((title) => (
              <Card key={title} className="opacity-50 cursor-not-allowed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-400">
                    <Award className="h-5 w-5" />
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400">
                    Coming Soon...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}