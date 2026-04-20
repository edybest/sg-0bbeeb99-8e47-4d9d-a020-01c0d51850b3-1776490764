import React, { useState, useEffect, useRef } from "react";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getTrioEnabledGames, getAllTrioRecordsByGame, type TrioRecordWithPlayers, type TrioPlayer } from "@/services/trioService";
import { LaneSpinWheel } from "@/components/admin/LaneSpinWheel";
import { Loader2, Users, Trophy, UserPlus, RefreshCw } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];

export default function UndiTrioPage() {
  const { toast } = useToast();
  const { member } = useAuth();
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [trios, setTrios] = useState<TrioRecordWithPlayers[]>([]);
  
  // Process state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Select A, 2: Spin B, 3: Spin C, 4: Done
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  // Selection state
  const [selectedTrio, setSelectedTrio] = useState<TrioRecordWithPlayers | null>(null);
  const [playerA, setPlayerA] = useState<TrioPlayer | null>(null);
  const [playerB, setPlayerB] = useState<TrioPlayer | null>(null);
  const [playerC, setPlayerC] = useState<TrioPlayer | null>(null);
  
  // Dummy pool state (for spinning effect)
  const [poolB, setPoolB] = useState<TrioPlayer[]>([]);
  const [poolC, setPoolC] = useState<TrioPlayer[]>([]);

  // Refs for animation & audio
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  const isAdmin = member?.is_admin || false;

  useEffect(() => {
    loadData();
    spinAudioRef.current = new Audio("/spin.mp3");
    winAudioRef.current = new Audio("/win.mp3");
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadGameTrios();
    }
  }, [selectedGameId]);

  async function loadData() {
    try {
      setLoading(true);
      const trioGames = await getTrioEnabledGames();
      setGames(trioGames);
      
      if (trioGames.length > 0) {
        setSelectedGameId(trioGames[0].id);
      }
    } catch (error) {
      console.error("Error loading games:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan senarai game",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadGameTrios() {
    if (!selectedGameId) return;

    try {
      const records = await getAllTrioRecordsByGame(selectedGameId);
      setTrios(records);
      
      // Build dummy pools for spinning from ALL configured B and C players
      const allB = records.map(r => r.player2).filter(p => p != null) as TrioPlayer[];
      const allC = records.map(r => r.player3).filter(p => p != null) as TrioPlayer[];
      
      setPoolB(allB);
      setPoolC(allC);
      
      // Reset state when game changes
      handleReset();
    } catch (error) {
      console.error("Error loading trios:", error);
    }
  }

  function handleSelectPlayerA(trioId: string) {
    const trio = trios.find(t => t.id === trioId);
    if (trio && trio.player1) {
      setSelectedTrio(trio);
      setPlayerA(trio.player1);
      setStep(2);
    }
  }

  async function handleSpinForB() {
    if (!selectedTrio || !selectedTrio.player2 || poolB.length === 0) return;
    
    setSpinning(true);

    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.play().catch(console.error);
    }

    // Calculate target rotation to land on the correct player
    const targetIndex = poolB.findIndex(p => p.id === selectedTrio.player2!.id);
    const segmentAngle = 360 / poolB.length;
    const targetAngle = targetIndex * segmentAngle;
    
    // Add multiple full rotations for dramatic effect (5-7 spins)
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const finalRotation = fullRotations * 360 + targetAngle;
    
    setRotation(finalRotation);

    const spinDuration = 5200; // Match LaneSpinWheel transition duration

    setTimeout(() => {
      setPlayerB(selectedTrio.player2!);
      setSpinning(false);
      setStep(3);

      if (winAudioRef.current) {
        winAudioRef.current.currentTime = 0;
        winAudioRef.current.play().catch(console.error);
      }

      toast({
        title: "🎉 Undian Selesai!",
        description: `${selectedTrio.player2!.username} dipilih sebagai Player B!`,
        duration: 3000,
      });
    }, spinDuration);
  }

  async function handleSpinForC() {
    if (!selectedTrio || !selectedTrio.player3) return;
    
    setSpinning(true);

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

    setTimeout(async () => {
      clearInterval(spinInterval);
      
      // Magic: Wheel stops, we show the actual pre-configured Player C!
      setPlayerC(selectedTrio.player3!);
      setSpinning(false);
      setStep(4);

      if (winAudioRef.current) {
        winAudioRef.current.currentTime = 0;
        winAudioRef.current.play().catch(console.error);
      }

      toast({
        title: "🎉 Pasukan Lengkap!",
        description: `Trio untuk ${playerA?.username} telah dilengkapkan!`,
        duration: 5000,
      });
      
    }, spinDuration);
  }

  function handleReset() {
    setStep(1);
    setPlayerA(null);
    setPlayerB(null);
    setPlayerC(null);
    setSelectedTrio(null);
    setSpinning(false);
    setRotation(0);
  }

  // --- Rendering UI --- //

  if (loading) {
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
          <Card className="p-12 text-center shadow-lg border-2 border-dashed border-gray-200">
            <Users className="w-20 h-20 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-bold mb-2">Tiada Game Trio Aktif</h2>
            <p className="text-muted-foreground">Sila aktifkan Trio Mode pada game dari panel admin.</p>
          </Card>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl font-black tracking-tight">LIVE DRAW TRIO</h1>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <p className="text-slate-300 text-lg">Undian Pasukan Trio Secara Langsung</p>
        </div>

        {/* Game Selection */}
        <Card className="p-6 mb-8 border-2 border-blue-100 shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-2/3">
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Sesi Cabutan (Game):
              </label>
              <Select value={selectedGameId} onValueChange={setSelectedGameId} disabled={step > 1}>
                <SelectTrigger className="w-full bg-white text-lg h-12">
                  <SelectValue placeholder="Pilih game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id} className="text-base py-3">
                      {new Date(game.game_date).toLocaleDateString("ms-MY", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })} - {game.game_name || "Game"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="w-full md:w-auto h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Undi Pasukan Lain
              </Button>
            )}
          </div>
        </Card>

        {trios.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-2">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-bold mb-2">Tiada Trio Dikonfigurasi</h3>
            <p className="text-muted-foreground">Admin perlu configure trio di panel Game Management terlebih dahulu.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Team Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Player A Card */}
              <Card className={`relative overflow-hidden transition-all duration-500 ${step >= 1 ? 'ring-4 ring-red-500 shadow-xl shadow-red-100 scale-100 opacity-100' : 'opacity-50 scale-95'}`}>
                <div className="bg-red-600 text-white p-3 text-center font-bold tracking-widest">
                  PLAYER A
                </div>
                <div className="p-6 text-center min-h-[160px] flex flex-col items-center justify-center bg-gradient-to-b from-white to-red-50">
                  {step === 1 ? (
                    <div className="w-full">
                      <p className="text-sm font-semibold text-red-600 mb-3 animate-pulse">
                        Admin: Sila Pilih Player A
                      </p>
                      <Select onValueChange={handleSelectPlayerA} disabled={!isAdmin}>
                        <SelectTrigger className="w-full border-red-200 focus:ring-red-500">
                          <SelectValue placeholder="Pilih Player A..." />
                        </SelectTrigger>
                        <SelectContent>
                          {trios.map((trio) => (
                            <SelectItem key={trio.id} value={trio.id}>
                              {trio.player1?.username || "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isAdmin && <p className="text-xs text-red-500 mt-2">Hanya admin boleh pilih</p>}
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-black mb-3 shadow-inner">
                        {playerA?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-2xl font-black text-slate-900">{playerA?.username}</div>
                      <div className="text-sm font-medium text-red-600 mt-1">Ketua Trio</div>
                    </>
                  )}
                </div>
              </Card>

              {/* Player B Card */}
              <Card className={`relative overflow-hidden transition-all duration-500 ${step >= 2 ? 'ring-4 ring-blue-500 shadow-xl shadow-blue-100 scale-100 opacity-100' : 'opacity-40 scale-95 grayscale'}`}>
                <div className="bg-blue-600 text-white p-3 text-center font-bold tracking-widest">
                  PLAYER B
                </div>
                <div className="p-6 text-center min-h-[160px] flex flex-col items-center justify-center bg-gradient-to-b from-white to-blue-50">
                  {!playerB ? (
                    <Users className="w-12 h-12 text-blue-200 mb-2" />
                  ) : (
                    <div className="animate-in zoom-in duration-500">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-black mb-3 shadow-inner mx-auto">
                        {playerB.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-2xl font-black text-slate-900">{playerB.username}</div>
                    </div>
                  )}
                  {step === 2 && !playerB && (
                    <div className="absolute inset-0 bg-blue-900/10 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg animate-pulse">
                        Menunggu Undian...
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Player C Card */}
              <Card className={`relative overflow-hidden transition-all duration-500 ${step >= 3 ? 'ring-4 ring-green-500 shadow-xl shadow-green-100 scale-100 opacity-100' : 'opacity-40 scale-95 grayscale'}`}>
                <div className="bg-green-600 text-white p-3 text-center font-bold tracking-widest">
                  PLAYER C
                </div>
                <div className="p-6 text-center min-h-[160px] flex flex-col items-center justify-center bg-gradient-to-b from-white to-green-50">
                  {!playerC ? (
                    <Users className="w-12 h-12 text-green-200 mb-2" />
                  ) : (
                    <div className="animate-in zoom-in duration-500">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl font-black mb-3 shadow-inner mx-auto">
                        {playerC.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-2xl font-black text-slate-900">{playerC.username}</div>
                    </div>
                  )}
                  {step === 3 && !playerC && (
                    <div className="absolute inset-0 bg-green-900/10 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg animate-pulse">
                        Menunggu Undian...
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Spinning Wheel Area */}
            {(step === 2 || step === 3) && (
              <Card className="p-8 bg-slate-900 text-white shadow-2xl border-0 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-slate-900 to-slate-900"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <h3 className="text-2xl font-bold mb-8 text-center">
                    CABUTAN UNDI UNTUK <span className={step === 2 ? "text-blue-400" : "text-green-400"}>
                      PLAYER {step === 2 ? "B" : "C"}
                    </span>
                  </h3>
                  
                  {/* LaneSpinWheel Component */}
                  <div className="mb-10">
                    <LaneSpinWheel
                      ref={canvasRef}
                      items={(step === 2 ? poolB : poolC).map(p => p.username)}
                      rotation={rotation}
                      isSpinning={spinning}
                      onSpinClick={() => {}}
                    />
                  </div>

                  {/* Spin Button */}
                  <Button
                    onClick={step === 2 ? handleSpinForB : handleSpinForC}
                    disabled={spinning || !isAdmin}
                    size="lg"
                    className={`px-16 py-8 text-2xl font-black rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 ${
                      step === 2
                        ? "bg-blue-600 hover:bg-blue-500 text-white"
                        : "bg-green-600 hover:bg-green-500 text-white"
                    }`}
                  >
                    {spinning ? (
                      <>
                        <Loader2 className="w-8 h-8 mr-3 animate-spin" />
                        MEMUTAR...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-8 h-8 mr-3" />
                        PUTAR RODA!
                      </>
                    )}
                  </Button>

                  {!isAdmin && (
                    <p className="text-sm text-slate-400 mt-4 bg-black/20 px-4 py-2 rounded-full">
                      ⚠️ Hanya admin boleh tekan butang putar
                    </p>
                  )}

                  {/* Player pool info */}
                  <div className="mt-8 text-center">
                    <p className="text-slate-400 text-sm font-medium tracking-wide">
                      {(step === 2 ? poolB : poolC).length} calon dalam undian
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Completion State */}
            {step === 4 && (
              <Card className="p-10 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-slate-900 shadow-2xl border-0 text-center animate-in slide-in-from-bottom-8 duration-700">
                <Trophy className="w-24 h-24 mx-auto mb-6 text-white drop-shadow-lg animate-bounce" />
                <h2 className="text-4xl font-black mb-2 tracking-tight drop-shadow-sm">
                  PASUKAN TRIO LENGKAP!
                </h2>
                <p className="text-xl font-bold mb-8 opacity-90 drop-shadow-sm">
                  Pasukan {playerA?.username} sedia untuk berentap!
                </p>
                <Button 
                  onClick={handleReset} 
                  size="lg"
                  className="bg-white text-yellow-600 hover:bg-slate-50 px-10 py-6 text-xl font-bold rounded-xl shadow-lg"
                >
                  <RefreshCw className="w-6 h-6 mr-2" />
                  UNDI PASUKAN LAIN
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </MemberLayout>
  );
}