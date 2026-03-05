import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberManagement } from "@/components/admin/MemberManagement";
import { GameManagement } from "@/components/admin/GameManagement";
import { ScoreManagement } from "@/components/admin/ScoreManagement";
import { ClubSettings } from "@/components/admin/ClubSettings";
import { LogOut, Users, Trophy, BarChart3, Settings, Loader2 } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: member } = await supabase
        .from("members")
        .select("is_admin, full_name")
        .eq("user_id", session.user.id)
        .single();

      if (!member?.is_admin) {
        router.push("/member");
        return;
      }

      setAdminData(member);
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
        title="Admin Dashboard - AMBC Club"
        description="Sistem pengurusan keahlian AMBC Club"
      />
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ClubLogo size="sm" />
                <div>
                  <h1 className="text-2xl font-bold text-red-600">AMBC CLUB</h1>
                  <p className="text-sm text-gray-600">Admin Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-700 hidden sm:inline">Selamat datang, {adminData?.full_name}</span>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="border-gray-300 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200 mb-8 shadow-sm">
              <TabsTrigger 
                value="members" 
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Pengurusan</span> Ahli
              </TabsTrigger>
              <TabsTrigger 
                value="games"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                <Trophy className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Pengurusan</span> Game
              </TabsTrigger>
              <TabsTrigger 
                value="scores"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Pengurusan</span> Skor
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <MemberManagement />
            </TabsContent>

            <TabsContent value="games">
              <GameManagement />
            </TabsContent>

            <TabsContent value="scores">
              <ScoreManagement />
            </TabsContent>

            <TabsContent value="settings">
              <ClubSettings />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}