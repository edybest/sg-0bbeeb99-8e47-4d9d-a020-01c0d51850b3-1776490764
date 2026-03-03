import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { memberService } from "@/services/memberService";
import { gameService } from "@/services/gameService";
import { storageService } from "@/services/storageService";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, Save, Loader2, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type MemberProfile = {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  birthday: string;
  sex: string;
  avatar_url: string | null;
  bowling_technique: string | null;
};

type GameHistory = {
  id: string;
  game_id: string;
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
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: member } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (!member) {
        router.push("/login");
        return;
      }

      setProfile(member as MemberProfile);

      // Load game history (last 10 games)
      const { data: history } = await supabase
        .from("game_players")
        .select(`
          id,
          game_id,
          game1_score,
          game2_score,
          game3_score,
          game4_score,
          game5_score,
          total_score,
          overall_score,
          games (
            game_name,
            game_date
          )
        `)
        .eq("member_id", member.id)
        .order("games(game_date)", { ascending: false })
        .limit(10);

      setGameHistory((history || []) as GameHistory[]);
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    try {
      // Upload to Supabase Storage
      const avatarUrl = await storageService.uploadAvatar(profile.id, file);
      
      // Update member record with new avatar URL
      await memberService.updateAvatar(profile.id, avatarUrl);
      
      // Update local state
      setProfile({ ...profile, avatar_url: avatarUrl });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Gagal memuat naik avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;

    setSaving(true);
    try {
      await memberService.updateMember(profile.id, {
        full_name: profile.full_name,
        phone: profile.phone,
        birthday: profile.birthday,
        sex: profile.sex,
        bowling_technique: profile.bowling_technique
      });

      setEditMode(false);
      alert("Profil berjaya dikemaskini");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  }

  function getHighestScore(): number {
    if (gameHistory.length === 0) return 0;
    return Math.max(...gameHistory.map(g => g.overall_score));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 via-black to-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${profile?.username} - Profil AMBC Club`}
        description="Profil ahli bowling AMBC Club"
      />
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-black to-gray-900">
        <header className="bg-black/50 backdrop-blur border-b border-red-900/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/member">
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-950/50">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-red-500">PROFIL</h1>
                <p className="text-sm text-gray-400">Maklumat Ahli</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <Card className="bg-black/50 border-red-900/50">
                <CardHeader>
                  <CardTitle className="text-red-500">Avatar</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  {profile?.avatar_url ? (
                    <Image 
                      src={storageService.getAvatarUrl(profile.avatar_url) || profile.avatar_url} 
                      alt={profile.username} 
                      width={150} 
                      height={150}
                      className="rounded-full border-4 border-red-500"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-red-600 flex items-center justify-center border-4 border-red-500">
                      <span className="text-white font-bold text-5xl">
                        {profile?.username[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white">{profile?.username}</h2>
                    <p className="text-gray-400">{profile?.full_name}</p>
                  </div>
                  <label className="cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                    <Button 
                      variant="outline" 
                      className="border-red-900/50 hover:bg-red-950/50"
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Tukar Avatar
                    </Button>
                  </label>
                </CardContent>
              </Card>

              {/* Stats Card */}
              <Card className="bg-black/50 border-red-900/50 mt-4">
                <CardHeader>
                  <CardTitle className="text-red-500">Statistik</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Jumlah Game:</span>
                    <span className="text-white font-bold">{gameHistory.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Skor Tertinggi:</span>
                    <span className="text-red-500 font-bold">{getHighestScore()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile Details & Game History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Details */}
              <Card className="bg-black/50 border-red-900/50">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-red-500">Maklumat Peribadi</CardTitle>
                    {!editMode ? (
                      <Button 
                        onClick={() => setEditMode(true)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Edit Profil
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => setEditMode(false)}
                          className="border-gray-700"
                        >
                          Batal
                        </Button>
                        <Button 
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Simpan
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Username</Label>
                      <Input 
                        value={profile?.username || ""} 
                        disabled
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Email</Label>
                      <Input 
                        value={profile?.email || ""} 
                        disabled
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Nama Penuh</Label>
                      <Input 
                        value={profile?.full_name || ""} 
                        onChange={(e) => setProfile(profile ? {...profile, full_name: e.target.value} : null)}
                        disabled={!editMode}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Telefon</Label>
                      <Input 
                        value={profile?.phone || ""} 
                        onChange={(e) => setProfile(profile ? {...profile, phone: e.target.value} : null)}
                        disabled={!editMode}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Tarikh Lahir</Label>
                      <Input 
                        type="date"
                        value={profile?.birthday || ""} 
                        onChange={(e) => setProfile(profile ? {...profile, birthday: e.target.value} : null)}
                        disabled={!editMode}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Jantina</Label>
                      <Select 
                        value={profile?.sex || ""} 
                        onValueChange={(value) => setProfile(profile ? {...profile, sex: value} : null)}
                        disabled={!editMode}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          <SelectItem value="MEN" className="text-white">Lelaki</SelectItem>
                          <SelectItem value="WOMEN" className="text-white">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-gray-300">Teknik Bowling</Label>
                      <Input 
                        value={profile?.bowling_technique || ""} 
                        onChange={(e) => setProfile(profile ? {...profile, bowling_technique: e.target.value} : null)}
                        disabled={!editMode}
                        placeholder="Contoh: Two-handed, Hook, Straight"
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Game History */}
              <Card className="bg-black/50 border-red-900/50">
                <CardHeader>
                  <CardTitle className="text-red-500 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Sejarah Game (10 Terkini)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gameHistory.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Tiada rekod game</p>
                  ) : (
                    <div className="space-y-3">
                      {gameHistory.map((game) => (
                        <div 
                          key={game.id}
                          className="bg-gray-900/50 rounded-lg p-4 border border-gray-800"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <p className="text-white font-semibold">{game.games.game_name}</p>
                              <p className="text-gray-400 text-sm">
                                {new Date(game.games.game_date).toLocaleDateString("ms-MY")}
                              </p>
                            </div>
                            <div className="grid grid-cols-5 gap-2 text-center">
                              <div>
                                <p className="text-gray-400 text-xs">G1</p>
                                <p className="text-white font-semibold">{game.game1_score}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs">G2</p>
                                <p className="text-white font-semibold">{game.game2_score}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs">G3</p>
                                <p className="text-white font-semibold">{game.game3_score}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs">G4</p>
                                <p className="text-white font-semibold">{game.game4_score}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs">G5</p>
                                <p className="text-white font-semibold">{game.game5_score}</p>
                              </div>
                            </div>
                            <div className="flex gap-4 text-center">
                              <div>
                                <p className="text-gray-400 text-xs">Total</p>
                                <p className="text-white font-bold">{game.total_score}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs">Overall</p>
                                <p className="text-red-500 font-bold text-lg">{game.overall_score}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}