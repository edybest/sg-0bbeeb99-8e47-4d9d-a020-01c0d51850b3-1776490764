import React, { useState, useEffect, useRef } from "react";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getTrioEnabledGames, getTrioRecordByGame, getGamePlayers, upsertTrioRecord, type TrioPlayer } from "@/services/trioService";
import { Loader2, Users, Trophy, UserPlus, RefreshCw } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];

export default function UndiTrioPage() {
  const { toast } = useToast();
  const { member } = useAuth();
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  
  const [players, setPlayers] = useState<TrioPlayer[]>([]);
  
  // Game State
  // 1: Pilih A, 2: Undi B, 3: Undi C, 4: Selesai
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); 
  const [playerA, setPlayerA] = useState<TrioPlayer | null>(null);
  const [playerB, setPlayerB] = useState<TrioPlayer | null>(null);
  const [playerC, setPlayerC] = useState<TrioPlayer | null>(null);
  
  const [resultName, setResultName] = useState<string | null>(null);
  
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  const isAdmin = member?.is_admin || false;

  useEffect(() => {
    loadGames();
    // Load audio files
    spinAudioRef.current = new Audio("/spin.mp3");
    winAudioRef.current = new Audio("/win.mp3");
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadGameData();
    }
  }, [selectedGameId]);

  async function loadGames() {
    try {
      setLoading(true);
      const trioGames = await getTrioEnabledGames();
      setGames(trioGames);
      
      if (trioGames.length > 0) {
        setSelectedGameId(trioGames[0].id);
      }
    } catch (error) {
      console.error("Error loading games:", error);
      toast({ title: "Error", description: "Gagal memuatkan senarai game", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function loadGameData() {
    try {
      setLoading(true);
      // Reset state
      setStep(1);
      setPlayerA(null);
      setPlayerB(null);
      setPlayerC(null);
      setResultName(null);

      // Load all players for this game
      const gamePlayers = await getGamePlayers(selectedGameId);
      setPlayers(gamePlayers);

      // Check if trio record already exists
      const trioRecord = await getTrioRecordByGame(selectedGameId);
      if (trioRecord && trioRecord.player1_id) {
        if (trioRecord.player1) setPlayerA(trioRecord.player1);
        if (trioRecord.player2) setPlayerB(trioRecord.player2);
        if (trioRecord.player3) setPlayerC(trioRecord.player3);
        setStep(4); // Completed
      }
    } catch (error) {
      console.error("Error loading game data:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectPlayerA = (playerId: string) => {
    const selected = players.find(p => p.id === playerId);
    if (selected) {
      setPlayerA(selected);
      setStep(2); // Move to Spin B
    }
  };

  async function saveTrioToDatabase(a: TrioPlayer, b: TrioPlayer, c: TrioPlayer) {
    try {
      await upsertTrioRecord({
        game_id: selectedGameId,
        player1_id: a.id,
        player2_id: b.id,
        player3_id: c.id,
        player1_handicap: a.handicap || 0,
        player2_handicap: b.handicap || 0,
        player3_handicap: c.handicap || 0,
        player1_score: 0,
        player2_score: 0,
        player3_score: 0,
        total_score: 0
      });
      
      toast({
        title: "✅ Selesai!",
        description: "Data Trio telah berjaya disimpan ke dalam database.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error saving trio:", error);
      toast({
        title: "Ralat Menyimpan",
        description: "Gagal menyimpan rekod trio ke database.",
        variant: "destructive",
      });
    }
  }

  async function handleSpin() {
    if (!isAdmin) return;

    // Determine available players
    let availablePlayers = players.filter(p => p.id !== playerA?.id);
    if (step === 3) {
      availablePlayers = availablePlayers.filter(p => p.id !== playerB?.id);
    }

    if (availablePlayers.length === 0) {
      toast({ title: "Tiada Pemain", description: "Tiada pemain yang tinggal untuk diundi", variant: "destructive" });
      return;
    }

    setSpinning(true);
    setResultName(null);

    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.play().catch(console.error);
    }

    const spinDuration = 3000 + Math.random() * 2000;
    const startTime = Date.now();

    const spinInterval = setInterval(() => {
      if (wheelRef.current) {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / spinDuration;
        const rotation = progress * 360 * 5;
        wheelRef.current.style.transform = `rotate(${rotation}deg)`;
      }
    }, 16);

    setTimeout(() => {
      clearInterval(spinInterval);
      
      const pickedPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
      setResultName(pickedPlayer.username);
      setSpinning(false);

      if (winAudioRef.current) {
        winAudioRef.current.currentTime = 0;
        winAudioRef.current.play().catch(console.error);
      }

      if (step === 2) {
        setPlayerB(pickedPlayer);
        setStep(3); // Move to Spin C
      } else if (step === 3) {
        setPlayerC(pickedPlayer);
        setStep(4); // Done
        if (playerA && playerB && pickedPlayer) {
          saveTrioToDatabase(playerA, playerB, pickedPlayer);
        }
      }

    }, spinDuration);
  }

  function handleReset() {
    if (!confirm("Anda pasti mahu reset undian untuk game ini? Ini akan mengosongkan Player B & C yang telah diundi (belum padam dari database sehingga disave baru).")) return;
    setStep(1);
    setPlayerA(null);
    setPlayerB(null);
    setPlayerC(null);
    setResultName(null);
  }

  if (loading && games.length === 0) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MemberLayout>
    );
  }

  if (games.length === 0) {
    return (
      <MemberLayout>
        <div className="container mx-auto p-4 max-w-4xl">
          <Card className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Tiada Game Trio Aktif</h2>
            <p className="text-muted-foreground">Sila aktifkan Trio Mode pada mana-man game di ruang Admin dahulu.</p>
          </Card>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="container mx-auto p-4 max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-purple-600 text-white px-4 py-2 text-lg">PENCARIAN TRIO</Badge>
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Undian Trio Bowling</h1>
            <p className="text-muted-foreground mt-1">Lengkapkan Trio anda dengan roda undian</p>
          </div>

          <div className="w-full md:w-64">
            <Select value={selectedGameId} onValueChange={setSelectedGameId} disabled={spinning}>
              <SelectTrigger className="w-full bg-white shadow-sm border-purple-200">
                <SelectValue placeholder="Pilih Game" />
              </SelectTrigger>
              <SelectContent>
                {games.map((game) => (
                  <SelectItem key={game.id} value={game.id}>
                    {new Date(game.game_date).toLocaleDateString("ms-MY", {
                      day: "numeric", month: "short"
                    })} - {game.game_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Players Display Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* PLAYER A */}
          <Card className={`p-5 border-2 transition-all ${step === 1 ? 'border-red-500 shadow-md ring-4 ring-red-100' : 'border-red-200 opacity-90'}`}>
            <div className="flex justify-between items-center mb-4">
              <Badge className="bg-red-500 hover:bg-red-600">PLAYER A (KETUA)</Badge>
              {step > 1 && isAdmin && (
                <button onClick={handleReset} className="text-xs text-red-500 hover:underline flex items-center">
                  <RefreshCw className="w-3 h-3 mr-1" /> Reset
                </button>
              )}
            </div>
            
            {step === 1 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium">Sila pilih Player A dahulu:</p>
                <Select onValueChange={handleSelectPlayerA} disabled={!isAdmin}>
                  <SelectTrigger className="w-full border-red-300 bg-red-50">
                    <SelectValue placeholder="Pilih dari senarai..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.username} (HC: {p.handicap})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isAdmin && <p className="text-xs text-red-500 mt-2">Hanya Admin boleh buat pilihan</p>}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {playerA?.avatar_url ? (
                  <img src={playerA.avatar_url} alt="" className="w-14 h-14 rounded-full border-2 border-red-500 object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-500 border-2 border-red-500">
                    <Users className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{playerA?.username}</h3>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mt-1">HC: {playerA?.handicap}</Badge>
                </div>
              </div>
            )}
          </Card>

          {/* PLAYER B */}
          <Card className={`p-5 border-2 transition-all ${step === 2 ? 'border-blue-500 shadow-md ring-4 ring-blue-100' : 'border-blue-200 opacity-90'}`}>
            <div className="mb-4">
              <Badge className="bg-blue-500 hover:bg-blue-600">PLAYER B</Badge>
            </div>
            
            {!playerB ? (
              <div className="flex flex-col items-center justify-center py-2 text-blue-300">
                <UserPlus className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">{step === 2 ? "Menunggu undian..." : "Kunci Player A dahulu"}</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-500">
                {playerB?.avatar_url ? (
                  <img src={playerB.avatar_url} alt="" className="w-14 h-14 rounded-full border-2 border-blue-500 object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 border-2 border-blue-500">
                    <Users className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{playerB?.username}</h3>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mt-1">HC: {playerB?.handicap}</Badge>
                </div>
              </div>
            )}
          </Card>

          {/* PLAYER C */}
          <Card className={`p-5 border-2 transition-all ${step === 3 ? 'border-green-500 shadow-md ring-4 ring-green-100' : 'border-green-200 opacity-90'}`}>
            <div className="mb-4">
              <Badge className="bg-green-500 hover:bg-green-600">PLAYER C</Badge>
            </div>
            
            {!playerC ? (
              <div className="flex flex-col items-center justify-center py-2 text-green-300">
                <UserPlus className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">{step === 3 ? "Menunggu undian..." : "Tunggu giliran"}</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-500">
                {playerC?.avatar_url ? (
                  <img src={playerC.avatar_url} alt="" className="w-14 h-14 rounded-full border-2 border-green-500 object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-500 border-2 border-green-500">
                    <Users className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{playerC?.username}</h3>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-1">HC: {playerC?.handicap}</Badge>
                </div>
              </div>
            )}
          </Card>

        </div>

        {/* Action Area (Spinning Wheel) */}
        {step > 1 && step < 4 && (
          <Card className="p-8 border-t-4 border-t-purple-500 shadow-xl bg-gradient-to-b from-white to-purple-50">
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-black text-gray-800 mb-6 uppercase tracking-wider">
                Masa untuk undi Player {step === 2 ? "B" : "C"}!
              </h2>

              {/* Wheel */}
              <div className="relative w-64 h-64 mb-8">
                <div
                  ref={wheelRef}
                  className={`w-full h-full rounded-full border-[10px] shadow-2xl flex items-center justify-center transition-transform bg-gradient-to-br ${
                    step === 2 ? 'border-blue-500 from-blue-300 to-blue-600' : 'border-green-500 from-green-300 to-green-600'
                  }`}
                  style={{ transitionDuration: "0ms" }}
                >
                  <div className="text-white text-7xl font-bold filter drop-shadow-md">🎳</div>
                </div>
                {/* Pointer */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-t-[40px] border-l-transparent border-r-transparent z-10 ${
                  step === 2 ? 'border-t-blue-800' : 'border-t-green-800'
                }`}></div>
              </div>

              {/* Result Pop */}
              {resultName && !spinning && (
                <div className="mb-6 text-center animate-bounce">
                  <div className={`text-white rounded-2xl p-6 shadow-2xl ${
                    step === 2 ? 'bg-blue-600' : 'bg-green-600'
                  }`}>
                    <div className="text-sm font-semibold mb-1 opacity-80 uppercase tracking-widest">TERPILIH!</div>
                    <div className="text-4xl font-black tracking-tight">{resultName}</div>
                  </div>
                </div>
              )}

              {/* Spin Button */}
              <Button
                onClick={handleSpin}
                disabled={spinning || !isAdmin}
                size="lg"
                className={`px-12 py-8 text-2xl font-black rounded-2xl shadow-xl transition-all hover:scale-105 ${
                  step === 2 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {spinning ? (
                  <><Loader2 className="w-8 h-8 mr-3 animate-spin" /> BERPUSING...</>
                ) : (
                  `🎰 PUTAR UNTUK PLAYER ${step === 2 ? 'B' : 'C'}`
                )}
              </Button>

              {!isAdmin && (
                <p className="text-red-500 font-medium mt-4 bg-red-50 px-4 py-2 rounded-lg">
                  ⚠️ Hanya admin kelab yang dibenarkan menekan butang undian
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Completion State */}
        {step === 4 && (
          <Card className="p-10 text-center bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-2xl border-none">
            <Trophy className="w-24 h-24 mx-auto mb-6 text-yellow-300 drop-shadow-lg" />
            <h2 className="text-4xl font-black mb-4">TRIO LENGKAP!</h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Tahniah! Formasi Trio untuk game ini telah berjaya diundi dan direkodkan ke dalam database.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button onClick={() => window.location.reload()} variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 px-8 py-6 text-lg font-bold">
                Kembali ke Utama
              </Button>
              {isAdmin && (
                <Button onClick={handleReset} className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 text-lg font-bold shadow-lg">
                  Buat Undian Baru (Reset)
                </Button>
              )}
            </div>
          </Card>
        )}

      </div>
    </MemberLayout>
  );
}