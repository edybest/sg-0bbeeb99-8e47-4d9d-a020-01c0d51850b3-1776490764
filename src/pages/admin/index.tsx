import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberManagement } from "@/components/admin/MemberManagement";
import { GameManagement } from "@/components/admin/GameManagement";
import { ScoreManagement } from "@/components/admin/ScoreManagement";
import { ClubSettings } from "@/components/admin/ClubSettings";
import { FeedbackManagement } from "@/components/admin/FeedbackManagement";
import { GalleryPermissionsPanel } from "@/components/admin/GalleryPermissionsPanel";
import { LaneManagement } from "@/components/admin/LaneManagement";
import { StatisticsPanel } from "@/components/admin/StatisticsPanel";
import { ThemeSettingsPanel } from "@/components/admin/ThemeSettingsPanel";
import { PushMessagePanel } from "@/components/admin/PushMessagePanel";
import { FonnteGroupSync } from "@/components/admin/FonnteGroupSync";
import { Loader2, Bell, ListChecks, ArrowRightLeft, BarChart3 } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { AdminPwaInstallCard } from "@/components/pwa/AdminPwaInstallCard";
import { CommentManagementPanel } from "@/components/admin/CommentManagementPanel";
import {
  Settings,
  Trophy,
  Users,
  Target,
  Grid3x3,
  MessageSquare,
  MessageCircle,
  LogOut,
  Heart,
} from "lucide-react";
import { CoupleManagement } from "@/components/admin/CoupleManagement";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<{ full_name: string } | null>(null);

  const tabs = [
    { id: "settings", label: "Club Settings", icon: Settings },
    { id: "games", label: "Games", icon: Trophy },
    { id: "members", label: "Members", icon: Users },
    { id: "scores", label: "Scores", icon: Target },
    { id: "lanes", label: "Lanes", icon: Grid3x3 },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
    { id: "comments", label: "Comments", icon: MessageCircle },
  ];

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
    <PageAccessGuard pagePath="/admin" requireAuth={true}>
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
            <div className="mb-6">
              <AdminPwaInstallCard className="max-w-xl" />
            </div>
            <Tabs defaultValue="statistics" className="w-full">
              <TabsList className="flex w-full overflow-x-auto bg-white border border-gray-200 mb-8 shadow-sm p-1 rounded-lg">
                <TabsTrigger 
                  value="statistics" 
                  className="data-[state=active]:bg-sky-600 data-[state=active]:text-white whitespace-nowrap px-4"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Statistik
                </TabsTrigger>
                <TabsTrigger 
                  value="members" 
                  className="data-[state=active]:bg-sky-600 data-[state=active]:text-white whitespace-nowrap px-4"
                >
                  <Users className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Pengurusan</span> Ahli
                </TabsTrigger>
                <TabsTrigger 
                  value="games"
                  className="data-[state=active]:bg-sky-600 data-[state=active]:text-white whitespace-nowrap px-4"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Pengurusan</span> Game
                </TabsTrigger>
                <TabsTrigger 
                  value="scores"
                  className="data-[state=active]:bg-sky-600 data-[state=active]:text-white whitespace-nowrap px-4"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Pengurusan</span> Skor
                </TabsTrigger>
                <TabsTrigger 
                  value="couples"
                  className="data-[state=active]:bg-sky-600 data-[state=active]:text-white whitespace-nowrap px-4"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Pengurusan Pasangan
                </TabsTrigger>
                <TabsTrigger 
                  value="lanes"
                  className="data-[state=active]:bg-sky-600 data-[state=active]:text-white whitespace-nowrap px-4"
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Pengurusan</span> Lane
                </TabsTrigger>
                <TabsTrigger 
                  value="settings"
                  className="data-[state=active]:bg-sky-600 data-[state=active]:text-white whitespace-nowrap px-4"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
                <TabsTrigger 
                  value="feedback"
                  className="data-[state=active]:bg-sky-600 data-[state=active]:text-white whitespace-nowrap px-4"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Maklum Balas</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="gallery"
                  className="data-[state=active]:bg-sky-600 data-[state=active]:text-white whitespace-nowrap px-4"
                >
                  <ListChecks className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Galeri</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="statistics">
                <StatisticsPanel />
              </TabsContent>

              <TabsContent value="members">
                <MemberManagement />
              </TabsContent>

              <TabsContent value="games">
                <GameManagement />
              </TabsContent>

              <TabsContent value="scores" className="space-y-6">
                <ScoreManagement />
              </TabsContent>

              <TabsContent value="couples" className="space-y-6">
                <CoupleManagement />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <ClubSettings />
                <ThemeSettingsPanel />
                <GalleryPermissionsPanel />
                <FonnteGroupSync />
              </TabsContent>

              <TabsContent value="feedback">
                <FeedbackManagement />
              </TabsContent>

              <TabsContent value="comments">
                <CommentManagementPanel />
              </TabsContent>

              <TabsContent value="gallery">
                <GalleryPermissionsPanel />
              </TabsContent>

              <TabsContent value="lanes">
                <LaneManagement />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </>
    </PageAccessGuard>
  );
}