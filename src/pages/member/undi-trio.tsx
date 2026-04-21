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
import { Loader2, Users, Trophy, UserPlus, RefreshCw, RefreshCcw } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

const supabaseClient = supabase;

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
  
  // Track used/selected players (players that have been drawn)
  const [usedPlayerIds, setUsedPlayerIds] = useState<Set<string>>(new Set());
  // Track completed trios (trio IDs that have been fully drawn)
  const [completedTrioIds, setCompletedTrioIds] = useState<Set<string>>(new Set());
  
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
      loadTrioRecordsForGame(selectedGameId);
    }
  }, [selectedGameId]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      const trioGames = await getTrioEnabledGames();
      setGames(trioGames);
      
      if (trioGames.length > 0) {
        setSelectedGameId(trioGames[0].id);
        await loadTrioRecordsForGame(trioGames[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Gagal memuatkan data games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadTrioRecordsForGame(gameId: string) {
    try {
      const records = await getAllTrioRecordsByGame(gameId);
      setTrios(records);
      
      // Check which trios are already drawn
      const drawnIds = new Set<string>();
      
      records.forEach(record => {
        if (record.is_drawn) {
          drawnIds.add(record.id);
        }
      });
      
      setCompletedTrioIds(drawnIds);
      
    } catch (error) {
      console.error("Error loading trio records:", error);
      toast({
        title: "Error",
        description: "Gagal memuatkan rekod trio",
        variant: "destructive",
      });
    }
  }

  async function loadGameTrios() {
    if (!selectedGameId) return;

    try {
      const records = await getAllTrioRecordsByGame(selectedGameId);
      setTrios(records);
      
      // Build dummy pools for spinning from ALL configured B and C players
      // Filter out players that have already been drawn/used
      const allB = records
        .map(r => r.player2)
        .filter(p => p != null && !usedPlayerIds.has(p.id)) as TrioPlayer[];
      
      const allC = records
        .map(r => r.player3)
        .filter(p => p != null && !usedPlayerIds.has(p.id)) as TrioPlayer[];
      
      setPoolB(allB);
      setPoolC(allC);
      
      // Reset current selection state when game changes
      setStep(1);
      setPlayerA(null);
      setPlayerB(null);
      setPlayerC(null);
      setSelectedTrio(null);
      setSpinning(false);
      setRotation(0);
    } catch (error) {
      console.error("Error loading trios:", error);
    }
  }

  function handleSelectPlayerA(trioId: string) {
    const trio = trios.find(t => t.id === trioId);
    if (!trio || !trio.player1) return;
    
    setSelectedTrio(trio);
    setPlayerA(trio.player1);
    
    // Check if this trio has already been completed (drawn before)
    if (completedTrioIds.has(trio.id)) {
      // Trio already drawn, skip spinning and show results directly
      setPlayerB(trio.player2!);
      setPlayerC(trio.player3!);
      setStep(4);
      
      toast({
        title: "ℹ️ Trio Sudah Diundi",
        description: `Pasukan ${trio.player1.username} telah diundi sebelum ini`,
        duration: 3000,
      });
    } else {
      // New trio, proceed to spinning
      setPlayerB(null);
      setPlayerC(null);
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

    const spinDuration = 5200;

    setTimeout(() => {
      const selectedPlayerB = selectedTrio.player2!;
      setPlayerB(selectedPlayerB);
      setSpinning(false);
      setStep(3);
      
      // Mark Player B as used
      setUsedPlayerIds(prev => new Set([...prev, selectedPlayerB.id]));
      
      // Remove Player B from pool C (player can't be both B and C)
      setPoolC(prevPool => prevPool.filter(p => p.id !== selectedPlayerB.id));

      if (winAudioRef.current) {
        winAudioRef.current.currentTime = 0;
        winAudioRef.current.play().catch(console.error);
      }

      toast({
        title: "🎉 Undian Selesai!",
        description: `${selectedPlayerB.username} dipilih sebagai Player B!`,
        duration: 3000,
      });
    }, spinDuration);
  }

  async function handleSpinForC() {
    if (!selectedTrio || !selectedTrio.player3 || poolC.length === 0) return;
    
    setSpinning(true);

    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.play().catch(console.error);
    }

    // Calculate target rotation to land on the correct player
    const targetIndex = poolC.findIndex(p => p.id === selectedTrio.player3!.id);
    const segmentAngle = 360 / poolC.length;
    const targetAngle = targetIndex * segmentAngle;
    
    // Add multiple full rotations for dramatic effect
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const finalRotation = fullRotations * 360 + targetAngle;
    
    setRotation(finalRotation);

    const spinDuration = 5200;

    setTimeout(async () => {
      const selectedPlayerC = selectedTrio.player3!;
      setPlayerC(selectedPlayerC);
      setSpinning(false);
      setStep(4);
      
      // Mark Player C as used
      setUsedPlayerIds(prev => new Set([...prev, selectedPlayerC.id]));
      
      // Mark this trio as completed
      setCompletedTrioIds(prev => new Set([...prev, selectedTrio.id]));
      
      // Remove used players from pools for next draw
      setPoolB(prevPool => prevPool.filter(p => 
        p.id !== selectedTrio.player2!.id && p.id !== selectedPlayerC.id
      ));
      setPoolC(prevPool => prevPool.filter(p => 
        p.id !== selectedTrio.player2!.id && p.id !== selectedPlayerC.id
      ));

      // 🔥 MARK TRIO AS DRAWN IN DATABASE
      try {
        const { error: updateError } = await supabaseClient
          .from("trio_records")
          .update({ 
            is_drawn: true,
            drawn_at: new Date().toISOString()
          })
          .eq("id", selectedTrio.id);

        if (updateError) {
          console.error("Error marking trio as drawn:", updateError);
        }
      } catch (error) {
        console.error("Error updating trio record:", error);
      }

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
    // Only reset current selection state
    // Keep usedPlayerIds and completedTrioIds to track drawn players
    setStep(1);
    setPlayerA(null);
    setPlayerB(null);
    setPlayerC(null);
    setSelectedTrio(null);
    setSpinning(false);
    setRotation(0);
  }

  function handleSelectTrio(trioId: string) {
    const trio = trios.find(t => t.id === trioId);
    if (!trio) return;
    
    setSelectedTrio(trio);
    
    if (trio.player1) {
      setPlayerA(trio.player1);
    }
    
    // 🔒 CHECK IF TRIO IS ALREADY DRAWN
    if (trio.is_drawn && trio.player1 && trio.player2 && trio.player3) {
      // Restore complete state
      setPlayerA(trio.player1);
      setPlayerB(trio.player2);
      setPlayerC(trio.player3);
      setStep(4); // Set to final step (complete)
      
      toast({
        title: "✅ Trio Telah Diundi",
        description: `Trio ini telah siap diundi sebelum ini.`,
        duration: 3000,
      });
    } else {
      // Fresh draw
      setStep(1);
      setPlayerB(null);
      setPlayerC(null);
    }
    
    setRotation(0);
  }

  function handleNextTrio() {
    // Find next undrawn trio
    const nextTrio = trios.find(
      t => !completedTrioIds.has(t.id) && t.id !== selectedTrio?.id
    );
    
    if (nextTrio) {
      handleSelectTrio(nextTrio.id);
    } else {
      toast({
        title: "✅ Semua Trio Telah Siap",
        description: "Semua pasukan trio telah lengkap diundi!",
        duration: 5000,
      });
      
      setStep(1);
      setSelectedTrio(null);
      setPlayerA(null);
      setPlayerB(null);
      setPlayerC(null);
    }
  }

  async function handleResetDraw() {
    if (!selectedTrio) return;
    
    const confirmed = confirm(
      `Reset undi untuk trio ${selectedTrio.player1?.username}?\n\n` +
      "Ini akan membolehkan undi semula dan memadam rekod undian sebelum ini."
    );
    
    if (!confirmed) return;
    
    try {
      // Reset is_drawn status in database
      const { error } = await supabase
        .from("trio_records")
        .update({ 
          is_drawn: false,
          drawn_at: null
        })
        .eq("id", selectedTrio.id);
      
      if (error) throw error;
      
      // Remove from completedTrioIds
      setCompletedTrioIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedTrio.id);
        return newSet;
      });
      
      // Reset UI state
      setStep(1);
      setPlayerB(null);
      setPlayerC(null);
      setRotation(0);
      
      // Reload trio records to refresh is_drawn status
      if (selectedGameId) {
        await loadTrioRecordsForGame(selectedGameId);
      }
      
      toast({
        title: "✅ Undi Direset",
        description: "Trio ini boleh diundi semula sekarang",
        duration: 3000,
      });
      
    } catch (error) {
      console.error("Error resetting draw:", error);
      toast({
        title: "Error",
        description: "Gagal reset undi",
        variant: "destructive",
      });
    }
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
                          {/* Only show unique Player A names, no trio details */}
                          {Array.from(new Set(trios.map(t => t.player1?.username)))
                            .filter(Boolean)
                            .map((username) => {
                              const trio = trios.find(t => t.player1?.username === username);
                              return (
                                <SelectItem key={trio!.id} value={trio!.id}>
                                  {username}
                                </SelectItem>
                              );
                            })}
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
                      hideInstructions={true}
                    />
                  </div>

                  {/* Spin Button */}
                  <Button
                    onClick={handleSpinForB}
                    disabled={spinning || !isAdmin || poolB.length === 0 || selectedTrio?.is_drawn}
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6 text-xl"
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

                  <Button
                    onClick={handleSpinForC}
                    disabled={spinning || !isAdmin || poolC.length === 0 || selectedTrio?.is_drawn}
                    size="lg"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-xl"
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

            {step === 2 && playerA && selectedTrio?.player2 && (
              <Card className="p-6">
                <h3 className="text-2xl font-bold text-center mb-6 text-blue-600">
                  CABUTAN UNDI UNTUK <span className="text-blue-700">PLAYER B</span>
                </h3>
                
                <div className="mb-6">
                  <LaneSpinWheel
                    ref={wheelRefB}
                    items={poolB.map(p => p.username)}
                    rotation={rotation}
                    isSpinning={spinning}
                    onSpinClick={handleSpinForB}
                  />
                </div>

                <div className="text-center space-y-4">
                  {playerB && (
                    <div className="bg-blue-100 rounded-lg p-4 mb-4">
                      <div className="text-sm text-blue-600 mb-1">Player B Terpilih:</div>
                      <div className="text-2xl font-bold text-blue-700">{playerB.username}</div>
                    </div>
                  )}
                  
                  {!spinning && !playerB && (
                    <Button
                      onClick={handleSpinForB}
                      disabled={spinning || !isAdmin || poolB.length === 0 || selectedTrio?.is_drawn}
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6 text-xl"
                    >
                      {spinning ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                          Memutar...
                        </>
                      ) : (
                        "🎰 PUTAR RODA!"
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {step === 3 && playerA && playerB && selectedTrio?.player3 && (
              <Card className="p-6">
                <h3 className="text-2xl font-bold text-center mb-6 text-green-600">
                  CABUTAN UNDI UNTUK <span className="text-green-700">PLAYER C</span>
                </h3>
                
                <div className="mb-6">
                  <LaneSpinWheel
                    ref={wheelRefC}
                    items={poolC.map(p => p.username)}
                    rotation={rotation}
                    isSpinning={spinning}
                    onSpinClick={handleSpinForC}
                  />
                </div>

                <div className="text-center space-y-4">
                  {playerC && (
                    <div className="bg-green-100 rounded-lg p-4 mb-4">
                      <div className="text-sm text-green-600 mb-1">Player C Terpilih:</div>
                      <div className="text-2xl font-bold text-green-700">{playerC.username}</div>
                    </div>
                  )}
                  
                  {!spinning && !playerC && (
                    <Button
                      onClick={handleSpinForC}
                      disabled={spinning || !isAdmin || poolC.length === 0 || selectedTrio?.is_drawn}
                      size="lg"
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-xl"
                    >
                      {spinning ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                          Memutar...
                        </>
                      ) : (
                        "🎰 PUTAR RODA!"
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Completion State */}
            {step === 4 && playerA && playerB && playerC && (
              <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-6">
                    <Trophy className="w-16 h-16 text-green-600" />
                  </div>
                  
                  {selectedTrio?.is_drawn && (
                    <Badge className="mb-4 bg-green-600 text-white px-4 py-2 text-sm">
                      ✅ Telah Diundi Sebelum Ini
                    </Badge>
                  )}
                  
                  <h3 className="text-3xl font-black text-green-900 mb-4">🎉 Pasukan Lengkap!</h3>
                  
                  <div className="space-y-4 max-w-md mx-auto mb-6">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Player A</div>
                      <div className="text-xl font-bold text-red-600">{playerA.username}</div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Player B</div>
                      <div className="text-xl font-bold text-blue-600">{playerB.username}</div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Player C</div>
                      <div className="text-xl font-bold text-green-600">{playerC.username}</div>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={handleNextTrio}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-bold"
                    >
                      Undi Trio Seterusnya
                    </Button>
                    
                    {isAdmin && selectedTrio?.is_drawn && (
                      <Button
                        onClick={handleResetDraw}
                        variant="outline"
                        size="lg"
                        className="border-2 border-red-500 text-red-600 hover:bg-red-50 px-8 py-6 text-lg font-bold"
                      >
                        <RefreshCcw className="w-5 h-5 mr-2" />
                        Reset Undi
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </MemberLayout>
  );
}