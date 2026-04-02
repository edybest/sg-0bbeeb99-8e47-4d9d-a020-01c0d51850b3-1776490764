import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { memberService } from "@/services/memberService";
import { gameService } from "@/services/gameService";
import { storageService } from "@/services/storageService";
import { sessionService } from "@/services/sessionService";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Save, Loader2, Camera, History, Calendar, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { MemberLayout } from "@/components/member/MemberLayout";

type Member = {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  sex: string | null;
  birthday: string | null;
  avatar_url: string | null;
  technique: string | null;
  handicap: number;
};

type GameHistory = {
  id: string;
  game1_score: number;
  game2_score: number;
  game3_score: number;
  game4_score: number;
  game5_score: number;
  total_score: number;
  overall_score: number;
  games: {
    game_name: string;
    game_date: string;
    game_type: string;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use new auth hook - will auto redirect if not logged in
  const { member: currentMember, loading: authLoading, isAuthenticated } = useAuth(true);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Get ID from query param or session
  const queryId = router.query.id as string;

  // Helper function to check if avatar is base64
  const isBase64Image = (url: string | null) => {
    if (!url) return false;
    return url.startsWith("data:image/");
  };

  // Privacy helper functions
  const canViewSensitiveData = () => {
    // Admin or viewing own profile
    return currentMember?.is_admin || isOwnProfile;
  };

  const maskPhone = (phone: string | null) => {
    if (!phone || canViewSensitiveData()) return phone || "-";
    // Mask phone: +60123456789 -> +601****6789
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 4) return "***-***-****";
    return `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`;
  };

  const maskEmail = (email: string | null) => {
    if (!email || canViewSensitiveData()) return email || "-";
    // Mask email: user@example.com -> u***@****.com
    const [username, domain] = email.split("@");
    if (!domain) return "***@****.com";
    return `${username[0]}***@****.${domain.split(".").pop()}`;
  };

  const formatBirthday = (birthday: string | null, showYear: boolean = true) => {
    if (!birthday) return "Not set";
    const date = new Date(birthday);
    
    // Hide year from others
    if (!showYear && !canViewSensitiveData()) {
      return date.toLocaleDateString("en-MY", {
        day: "2-digit",
        month: "short",
      });
    }
    
    return date.toLocaleDateString("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  async function loadProfile() {
    try {
      setLoading(true);

      // No need for session context - using native Supabase Auth
      if (!currentMember) {
        console.error("No current member found");
        return;
      }

      // Determine whose profile to show
      const targetId = queryId || currentMember.id;
      
      // Check if viewing own profile
      setIsOwnProfile(targetId === currentMember.id);

      // Load member data
      const memberData = await memberService.getMemberById(targetId);
      
      // Map bowling_technique to technique for our interface
      const mappedMember: Member = {
        id: memberData.id,
        username: memberData.username,
        full_name: memberData.full_name,
        email: memberData.email,
        phone: memberData.phone,
        sex: memberData.sex,
        birthday: memberData.birthday,
        avatar_url: memberData.avatar_url,
        technique: memberData.bowling_technique,
        handicap: memberData.handicap,
      };
      
      setMember(mappedMember);

      // Load game history
      const { data: gameHistory } = await supabase
        .from("game_players")
        .select(`
          id,
          game1_score,
          game2_score,
          game3_score,
          game4_score,
          game5_score,
          total_score,
          overall_score,
          average_score,
          created_at,
          games (
            game_name,
            game_date,
            game_format
          )
        `)
        .eq("member_id", targetId)
        .order("created_at", { ascending: false })
        .limit(10);

      const formattedHistory = (gameHistory || []).map((item) => ({
        id: item.id,
        game1_score: item.game1_score,
        game2_score: item.game2_score,
        game3_score: item.game3_score,
        game4_score: item.game4_score,
        game5_score: item.game5_score,
        total_score: item.total_score,
        overall_score: item.overall_score,
        games: {
          game_name: item.games?.game_name || "Unknown Game",
          game_date: item.games?.game_date || new Date().toISOString(),
          game_type: item.games?.game_format || "Unknown"
        }
      }));

      setHistory(formattedHistory);
    } catch (error) {
      console.error("Load profile error:", error);
      toast({
        title: "Error",
        description: "Gagal memuatkan profil. Sila cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;

    try {
      setSaving(true);
      
      await memberService.updateMember(member.id, {
        full_name: member.full_name,
        phone: member.phone || null,
        sex: member.sex,
        birthday: member.birthday || null,
        bowling_technique: member.technique,
      });

      toast({
        title: "Berjaya",
        description: "Profil berjaya dikemaskini",
      });
    } catch (error: any) {
      console.error("Update profile error:", error);
      toast({
        title: "Gagal",
        description: error.message || "Gagal mengemaskini profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    try {
      setUploading(true);
      
      const publicUrl = await storageService.uploadAvatar(member.id, file);
      
      // Add cache-busting parameter to force browser reload
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      
      await memberService.updateMember(member.id, {
        avatar_url: publicUrl  // Store clean URL in database
      });

      // Update local state with cache-busted URL for immediate display
      setMember(prev => prev ? { ...prev, avatar_url: urlWithCacheBust } : null);

      toast({
        title: "Berjaya",
        description: "Gambar profil berjaya dikemaskini",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Gagal",
        description: "Gagal muat naik gambar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [currentMember]);

  // Show loading while checking auth
  if (authLoading || loading) {
    return null;
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p>Member not found</p>
        <Link href="/member">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <PageAccessGuard
      pagePath="/member/profile"
      requireAuth={true}
      renderLoading={() => null}
    >
      <>
        <SEO title="Profile - AMBC Club" description="Profil ahli AMBC Club" />
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
          <MemberLayout>
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 pb-24 md:pb-6 max-w-4xl">
              
              {/* Hero Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 via-pink-500 to-purple-500 rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 lg:p-12 mb-6 md:mb-8">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs md:text-sm font-medium mb-3 md:mb-4">
                    <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span>Maklumat Ahli</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2 md:mb-3 tracking-tight drop-shadow-lg">
                    My Profile 👤
                  </h1>
                  <p className="text-pink-50 text-sm md:text-base lg:text-lg max-w-2xl">
                    Kemaskini maklumat peribadi anda
                  </p>
                </div>
              </div>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6 h-auto">
                  <TabsTrigger value="details" className="text-xs md:text-sm py-2 md:py-2.5">Butiran Diri</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs md:text-sm py-2 md:py-2.5">Sejarah Game</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                  <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                    {/* Avatar Section */}
                    <Card className="md:col-span-1">
                      <CardContent className="pt-4 md:pt-6 flex flex-col items-center">
                        <div className="relative mb-3 md:mb-4">
                          {member.avatar_url ? (
                            isBase64Image(member.avatar_url) ? (
                              <img
                                src={member.avatar_url}
                                alt={member.username}
                                className="rounded-full border-4 border-primary/20 object-cover w-[120px] h-[120px] md:w-[150px] md:h-[150px]"
                              />
                            ) : (
                              <Image
                                src={member.avatar_url}
                                alt={member.username}
                                width={150}
                                height={150}
                                className="rounded-full border-4 border-primary/20 object-cover w-[120px] h-[120px] md:w-[150px] md:h-[150px]"
                                unoptimized
                              />
                            )
                          ) : (
                            <div className="w-[120px] h-[120px] md:w-[150px] md:h-[150px] rounded-full bg-pink-600/10 flex items-center justify-center text-pink-600 text-3xl md:text-4xl font-bold border-4 border-primary/20 shadow">
                              {member.username[0].toUpperCase()}
                            </div>
                          )}
                          
                          {isOwnProfile && (
                            <Button
                              size="icon"
                              className="absolute bottom-0 right-0 rounded-full shadow-lg h-9 w-9 md:h-10 md:w-10"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              {uploading ? (
                                <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                              ) : (
                                <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
                              )}
                            </Button>
                          )}
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                          />
                        </div>
                        
                        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-center">{member.full_name}</h2>
                        <p className="text-rose-500 text-center mb-1.5 md:mb-2 text-sm md:text-base">@{member.username}</p>
                        <Badge variant="outline" className="mb-3 md:mb-4 text-xs md:text-sm">
                          Handicap: {member.handicap}
                        </Badge>
                      </CardContent>
                    </Card>

                    {/* Edit Form */}
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-3 md:pb-4">
                        <CardTitle className="text-base md:text-lg">Maklumat Peribadi</CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          {isOwnProfile ? "Kemaskini maklumat anda di sini." : "Maklumat lengkap ahli."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-3 md:space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                            <div className="space-y-1.5 md:space-y-2">
                              <Label htmlFor="username" className="text-xs md:text-sm">Username</Label>
                              <Input id="username" value={member.username} disabled className="text-sm" />
                            </div>
                            
                            <div className="space-y-1.5 md:space-y-2">
                              <Label htmlFor="email" className="text-xs md:text-sm">Email</Label>
                              <Input 
                                id="email" 
                                value={maskEmail(member.email)} 
                                disabled={!isOwnProfile}
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-1.5 md:space-y-2">
                              <Label htmlFor="full_name" className="text-xs md:text-sm">Nama Penuh</Label>
                              <Input 
                                id="full_name" 
                                value={member.full_name} 
                                onChange={(e) => setMember({...member, full_name: e.target.value})}
                                disabled={!isOwnProfile}
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-1.5 md:space-y-2">
                              <Label htmlFor="phone" className="text-xs md:text-sm">No. Telefon</Label>
                              <Input 
                                id="phone" 
                                value={isOwnProfile ? (member.phone || "") : maskPhone(member.phone)} 
                                onChange={(e) => setMember({...member, phone: e.target.value})}
                                placeholder="+60123456789"
                                disabled={!isOwnProfile}
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-1.5 md:space-y-2">
                              <Label htmlFor="sex" className="text-xs md:text-sm">Jantina</Label>
                              <Select 
                                value={member.sex || "men"} 
                                onValueChange={(val) => setMember({...member, sex: val})}
                                disabled={!isOwnProfile}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="men">Lelaki</SelectItem>
                                  <SelectItem value="women">Perempuan</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5 md:space-y-2">
                              <Label htmlFor="birthday" className="text-xs md:text-sm">Tarikh Lahir</Label>
                              <Input 
                                id="birthday" 
                                type={isOwnProfile ? "date" : "text"}
                                value={isOwnProfile ? (member.birthday || "") : formatBirthday(member.birthday, false)} 
                                onChange={(e) => setMember({...member, birthday: e.target.value})}
                                disabled={!isOwnProfile}
                                className="text-sm"
                              />
                            </div>

                            <div className="space-y-1.5 md:space-y-2">
                              <Label htmlFor="technique" className="text-xs md:text-sm">Teknik Balingan</Label>
                              <Select 
                                value={member.technique || "Straight"} 
                                onValueChange={(val) => setMember({...member, technique: val})}
                                disabled={!isOwnProfile}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Straight">Straight</SelectItem>
                                  <SelectItem value="Hook">Hook</SelectItem>
                                  <SelectItem value="Spinner">Spinner</SelectItem>
                                  <SelectItem value="Backup">Backup</SelectItem>
                                  <SelectItem value="Kidal">Kidal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {isOwnProfile && (
                            <div className="pt-3 md:pt-4 flex justify-end">
                              <Button type="submit" disabled={saving} className="bg-pink-600 hover:bg-pink-600 text-sm md:text-base px-4 md:px-6 h-9 md:h-10">
                                {saving ? (
                                  <>
                                    <Loader2 className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                                    Simpan Perubahan
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <Card>
                    <CardHeader className="pb-3 md:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <History className="h-4 w-4 md:h-5 md:w-5" />
                        Sejarah Permainan
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        10 game terkini yang disertai
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {history.length === 0 ? (
                        <div className="text-center py-6 md:py-8 text-muted-foreground text-sm md:text-base">
                          Belum ada rekod permainan.
                        </div>
                      ) : (
                        <div className="space-y-3 md:space-y-4">
                          {history.map((game) => (
                            <div 
                              key={game.id} 
                              className="border rounded-lg p-3 md:p-4 hover:bg-rose-50 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-2 md:mb-3 gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-bold text-sm md:text-base truncate">{game.games.game_name}</h3>
                                  <p className="text-xs md:text-sm text-muted-foreground">
                                    {new Date(game.games.game_date).toLocaleDateString("ms-MY")} • {game.games.game_type}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-[10px] md:text-xs text-muted-foreground">Overall</span>
                                  <p className="text-lg md:text-xl font-bold text-pink-600">{game.overall_score}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-5 gap-1.5 md:gap-2 text-center text-xs md:text-sm">
                                <div className="bg-rose-100 rounded p-1">
                                  <span className="text-[10px] md:text-xs text-rose-500 block">G1</span>
                                  <span className="font-medium text-xs md:text-sm">{game.game1_score}</span>
                                </div>
                                <div className="bg-rose-100 rounded p-1">
                                  <span className="text-[10px] md:text-xs text-rose-500 block">G2</span>
                                  <span className="font-medium text-xs md:text-sm">{game.game2_score}</span>
                                </div>
                                <div className="bg-rose-100 rounded p-1">
                                  <span className="text-[10px] md:text-xs text-rose-500 block">G3</span>
                                  <span className="font-medium text-xs md:text-sm">{game.game3_score}</span>
                                </div>
                                <div className="bg-rose-100 rounded p-1">
                                  <span className="text-[10px] md:text-xs text-rose-500 block">G4</span>
                                  <span className="font-medium text-xs md:text-sm">{game.game4_score}</span>
                                </div>
                                <div className="bg-rose-100 rounded p-1">
                                  <span className="text-[10px] md:text-xs text-rose-500 block">G5</span>
                                  <span className="font-medium text-xs md:text-sm">{game.game5_score}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </MemberLayout>
        </div>
      </>
    </PageAccessGuard>
  );
}