import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { memberService } from "@/services/memberService";
import { gameService } from "@/services/gameService";
import { storageService } from "@/services/storageService";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Save, Loader2, Camera, Upload, History, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Get ID from query param or session
  const queryId = router.query.id as string;

  useEffect(() => {
    if (router.isReady) {
      loadProfile();
    }
  }, [router.isReady, queryId]);

  async function loadProfile() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      // Determine whose profile to show
      let targetId = queryId;
      
      // If no query ID, find current user's member ID
      if (!targetId) {
        const { data: currentMember } = await supabase
          .from("members")
          .select("id")
          .eq("user_id", session.user.id)
          .single();
          
        if (currentMember) {
          targetId = currentMember.id;
          setIsOwnProfile(true);
        } else {
          // Should not happen if logged in properly
          router.push("/login");
          return;
        }
      } else {
        // Check if viewing own profile via ID
        const { data: currentMember } = await supabase
          .from("members")
          .select("id")
          .eq("user_id", session.user.id)
          .single();
          
        if (currentMember && currentMember.id === targetId) {
          setIsOwnProfile(true);
        }
      }

      // Load member data
      const memberData = await memberService.getMemberById(targetId);
      setMember(memberData as Member);

      // Load game history
      const historyData = await gameService.getMemberGameHistory(targetId);
      setHistory(historyData as GameHistory[]);

    } catch (error) {
      console.error("Load profile error:", error);
      toast({
        title: "Error",
        description: "Gagal memuatkan profil",
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
        phone: member.phone,
        sex: member.sex,
        birthday: member.birthday,
        technique: member.technique,
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
      
      const publicUrl = await storageService.uploadAvatar(file);
      
      await memberService.updateMember(member.id, {
        avatar_url: publicUrl
      });

      setMember(prev => prev ? { ...prev, avatar_url: publicUrl } : null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
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
    <>
      <SEO title={`${member.full_name} - Profile`} description="Member Profile" />
      <div className="min-h-screen bg-gray-50 pb-8">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/member">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <User className="h-6 w-6 text-red-600" />
                  <h1 className="text-xl font-bold text-red-600">
                    {isOwnProfile ? "My Profile" : "Member Profile"}
                  </h1>
                </div>
              </div>
              <Image src="/ambc-logo.png" alt="AMBC" width={40} height={40} />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="details">Butiran Diri</TabsTrigger>
              <TabsTrigger value="history">Sejarah Game</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Avatar Section */}
                <Card className="md:col-span-1">
                  <CardContent className="pt-6 flex flex-col items-center">
                    <div className="relative mb-4">
                      {member.avatar_url ? (
                        <Image
                          src={member.avatar_url}
                          alt={member.username}
                          width={150}
                          height={150}
                          className="rounded-full border-4 border-red-100 object-cover w-[150px] h-[150px]"
                        />
                      ) : (
                        <div className="w-[150px] h-[150px] rounded-full bg-red-100 flex items-center justify-center text-red-600 text-4xl font-bold border-4 border-white shadow">
                          {member.username[0].toUpperCase()}
                        </div>
                      )}
                      
                      {isOwnProfile && (
                        <Button
                          size="icon"
                          className="absolute bottom-0 right-0 rounded-full shadow-lg"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4" />
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
                    
                    <h2 className="text-2xl font-bold text-center">{member.full_name}</h2>
                    <p className="text-gray-500 text-center mb-2">@{member.username}</p>
                    <Badge variant="outline" className="mb-4">
                      Handicap: {member.handicap}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Edit Form */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Maklumat Peribadi</CardTitle>
                    <CardDescription>
                      {isOwnProfile ? "Kemaskini maklumat anda di sini." : "Maklumat lengkap ahli."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input id="username" value={member.username} disabled />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" value={member.email || "-"} disabled />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="full_name">Nama Penuh</Label>
                          <Input 
                            id="full_name" 
                            value={member.full_name} 
                            onChange={(e) => setMember({...member, full_name: e.target.value})}
                            disabled={!isOwnProfile}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">No. Telefon</Label>
                          <Input 
                            id="phone" 
                            value={member.phone || ""} 
                            onChange={(e) => setMember({...member, phone: e.target.value})}
                            placeholder="+60123456789"
                            disabled={!isOwnProfile}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sex">Jantina</Label>
                          <Select 
                            value={member.sex || "Lelaki"} 
                            onValueChange={(val) => setMember({...member, sex: val})}
                            disabled={!isOwnProfile}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Lelaki">Lelaki</SelectItem>
                              <SelectItem value="Perempuan">Perempuan</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="birthday">Tarikh Lahir</Label>
                          <Input 
                            id="birthday" 
                            type="date"
                            value={member.birthday || ""} 
                            onChange={(e) => setMember({...member, birthday: e.target.value})}
                            disabled={!isOwnProfile}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="technique">Teknik Balingan</Label>
                          <Select 
                            value={member.technique || "Straight"} 
                            onValueChange={(val) => setMember({...member, technique: val})}
                            disabled={!isOwnProfile}
                          >
                            <SelectTrigger>
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
                        <div className="pt-4 flex justify-end">
                          <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700">
                            {saving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Sejarah Permainan
                  </CardTitle>
                  <CardDescription>
                    10 game terkini yang disertai
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Belum ada rekod permainan.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {history.map((game) => (
                        <div 
                          key={game.id} 
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold">{game.games.game_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(game.games.game_date).toLocaleDateString("ms-MY")} • {game.games.game_type}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground">Overall</span>
                              <p className="text-xl font-bold text-red-600">{game.overall_score}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-5 gap-2 text-center text-sm">
                            <div className="bg-gray-100 rounded p-1">
                              <span className="text-xs text-gray-500 block">G1</span>
                              <span className="font-medium">{game.game1_score}</span>
                            </div>
                            <div className="bg-gray-100 rounded p-1">
                              <span className="text-xs text-gray-500 block">G2</span>
                              <span className="font-medium">{game.game2_score}</span>
                            </div>
                            <div className="bg-gray-100 rounded p-1">
                              <span className="text-xs text-gray-500 block">G3</span>
                              <span className="font-medium">{game.game3_score}</span>
                            </div>
                            <div className="bg-gray-100 rounded p-1">
                              <span className="text-xs text-gray-500 block">G4</span>
                              <span className="font-medium">{game.game4_score}</span>
                            </div>
                            <div className="bg-gray-100 rounded p-1">
                              <span className="text-xs text-gray-500 block">G5</span>
                              <span className="font-medium">{game.game5_score}</span>
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
        </main>
      </div>
    </>
  );
}