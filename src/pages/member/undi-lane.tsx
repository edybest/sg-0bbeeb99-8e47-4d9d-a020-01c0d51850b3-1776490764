import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, ArrowLeft, Sparkles, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { resetAllSpinResults } from "@/services/laneSpinService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LaneAssignment {
  id: string;
  lane_position: string;
  member_id: string;
}

interface SpinResult {
  id: string;
  member_id: string;
  lane_position: string;
  spun_at: string;
}

export default function UndiLane() {
  const router = useRouter();
  const { toast } = useToast();
  const { member, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [availableLanes, setAvailableLanes] = useState<LaneAssignment[]>([]);
  const [myResult, setMyResult] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !member) {
        router.push("/login");
      } else {
        loadData(member.id, member.username);
      }
    }
  }, [authLoading, isAuthenticated, member, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
  }, []);

  async function loadData(currentMemberId: string, currentUsername: string) {
    try {
      setLoading(true);
      setMemberId(currentMemberId);
      setUsername(currentUsername);

      const { data: game, error: gameError } = await supabase
        .from("games")
        .select("id, game_date")
        .order("game_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (gameError) {
        console.error("Error loading game:", gameError);
        toast({
          title: "Error",
          description: "Failed to load game data.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!game) {
        setLoading(false);
        return;
      }

      setActiveGameId(game.id);
      await loadLaneData(currentMemberId, game.id);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  async function loadLaneData(currentMemberId: string, gameId: string) {
    try {
      const { data: existingResult, error: resultError } = await supabase
        .from("lane_spin_results")
        .select("*")
        .eq("member_id", currentMemberId)
        .eq("game_id", gameId)
        .maybeSingle();

      if (resultError) {
        console.error("Error checking spin result:", resultError);
      }

      if (existingResult) {
        setMyResult(existingResult);
        setSelectedLane(existingResult.lane_position);
        setShowResult(true);
      } else {
        const { data: spunResults, error: spunError } = await supabase
          .from("lane_spin_results")
          .select("lane_position")
          .eq("game_id", gameId);

        if (spunError) {
          console.error("Error loading spun results:", spunError);
        }

        const spunLanes = spunResults?.map(r => r.lane_position) || [];

        const { data: assignments, error: assignError } = await supabase
          .from("lane_assignments")
          .select("*")
          .eq("game_id", gameId)
          .order("lane_position");

        if (assignError) {
          console.error("Error loading assignments:", assignError);
          toast({
            title: "Error",
            description: "Failed to load lane data.",
            variant: "destructive",
          });
        } else {
          const available = (assignments || []).filter(
            a => !spunLanes.includes(a.lane_position)
          );
          setAvailableLanes(available);
        }
      }
    } catch (error) {
      console.error("Error loading lane data:", error);
      toast({
        title: "Error",
        description: "Failed to load lane data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function playSpinSound() {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 200;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  function playWinSound() {
    if (!audioContext) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + index * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.15 + 0.3);

      oscillator.start(audioContext.currentTime + index * 0.15);
      oscillator.stop(audioContext.currentTime + index * 0.15 + 0.3);
    });
  }

  async function spinWheel() {
    if (availableLanes.length === 0 || !memberId || !activeGameId || spinning) return;

    setSpinning(true);
    setShowResult(false);

    playSpinSound();

    const randomIndex = Math.floor(Math.random() * availableLanes.length);
    const selectedAssignment = availableLanes[randomIndex];

    const baseRotation = 360 * (7 + Math.random() * 3);
    const segmentAngle = 360 / availableLanes.length;
    const targetRotation = baseRotation + (randomIndex * segmentAngle);

    setRotation(targetRotation);

    setTimeout(async () => {
      try {
        const { data: result, error: saveError } = await supabase
          .from("lane_spin_results")
          .insert({
            game_id: activeGameId,
            member_id: memberId,
            lane_position: selectedAssignment.lane_position
          })
          .select()
          .single();

        if (saveError) {
          console.error("Error saving result:", saveError);
          toast({
            title: "Error",
            description: "Failed to save result. Please try again.",
            variant: "destructive",
          });
          setSpinning(false);
          return;
        }

        playWinSound();

        setMyResult(result);
        setSelectedLane(selectedAssignment.lane_position);
        setShowResult(true);
        setSpinning(false);

        setAvailableLanes(prev => prev.filter(l => l.id !== selectedAssignment.id));
      } catch (error) {
        console.error("Error in spin:", error);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setSpinning(false);
      }
    }, 5000);
  }

  async function handleResetSpins() {
    if (!activeGameId || !memberId || !username) return;

    try {
      setResetting(true);
      await resetAllSpinResults(activeGameId);
      
      toast({
        title: "Reset Berjaya",
        description: "Semua undian telah direset. Ahli boleh undi semula.",
      });

      await loadData(memberId, username);
    } catch (error) {
      console.error("Error resetting spins:", error);
      toast({
        title: "Error",
        description: "Gagal reset undian. Sila cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Undi Lane - AMBC Club</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-950 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link href="/member">
                <Button variant="outline" size="icon" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-8 w-8 text-yellow-400" />
                  Roda Impian Lane
                </h1>
                <p className="text-red-200 mt-1">Pusing roda untuk dapatkan lane anda!</p>
              </div>
            </div>

            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resetting}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    {resetting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Reset Undian
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Semua Undian?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini akan memadam semua rekod undian untuk game ini. 
                      Semua ahli boleh undi semula. Tindakan ini tidak boleh dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetSpins}>
                      Ya, Reset Undian
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {myResult ? (
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-4 border-yellow-400">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-6">
                      <Trophy className="h-16 w-16 text-white" />
                    </div>
                  </div>
                </div>
                <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Tahniah {username}!
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 mt-2">
                  Lane anda telah ditentukan
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8 mb-6 border-2 border-red-200">
                  <div className="text-7xl md:text-9xl font-black bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent animate-pulse">
                    {selectedLane}
                  </div>
                  <p className="text-xl text-gray-700 mt-4 font-semibold">Lane Anda</p>
                </div>

                <p className="text-gray-600 mb-6 text-lg">
                  Lane ini telah diperuntukkan kepada anda. Semoga berjaya dalam perlawanan!
                </p>

                <Link href="/member/lane">
                  <Button size="lg" className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-lg px-8 py-6">
                    Lihat Carta Lane
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : availableLanes.length === 0 ? (
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Tiada Lane Tersedia</CardTitle>
                <CardDescription className="text-lg mt-2">
                  Semua lane telah diundi atau belum ada assignment dari admin.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Link href="/member">
                  <Button variant="outline" size="lg">
                    Kembali ke Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <Card className="bg-white/95 backdrop-blur-sm shadow-2xl overflow-visible">
                <CardContent className="p-8 md:p-12">
                  <div className="relative flex justify-center items-center">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500 blur-md" />
                        <div className="relative w-0 h-0 border-l-[25px] border-r-[25px] border-t-[40px] border-l-transparent border-r-transparent border-t-red-600 drop-shadow-2xl" />
                      </div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-[420px] h-[420px] rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 blur-2xl opacity-30 ${spinning ? "animate-pulse" : ""}`} />
                    </div>

                    <div 
                      className="relative w-96 h-96 md:w-[420px] md:h-[420px] rounded-full shadow-2xl"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: spinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                        background: `conic-gradient(${availableLanes.map((_, i) => {
                          const colors = ["#DC2626", "#EA580C", "#D97706", "#CA8A04", "#EAB308", "#F59E0B"];
                          const color = colors[i % colors.length];
                          const nextColor = colors[(i + 1) % colors.length];
                          const percent1 = (i / availableLanes.length) * 100;
                          const percent2 = ((i + 1) / availableLanes.length) * 100;
                          return `${color} ${percent1}% ${percent2}%`;
                        }).join(", ")})`,
                        border: "8px solid #FCD34D",
                        boxShadow: "0 0 60px rgba(252, 211, 77, 0.6), inset 0 0 40px rgba(0,0,0,0.2)"
                      }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-yellow-400 z-10">
                        <Image
                          src="/ambc-logo.png"
                          alt="AMBC Logo"
                          width={80}
                          height={80}
                          className="object-contain"
                        />
                      </div>

                      {availableLanes.map((lane, index) => {
                        const angle = (360 / availableLanes.length) * index;
                        const radius = 150;
                        const x = Math.sin((angle * Math.PI) / 180) * radius;
                        const y = -Math.cos((angle * Math.PI) / 180) * radius;

                        return (
                          <div
                            key={lane.id}
                            className="absolute top-1/2 left-1/2 font-black text-white text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                            style={{
                              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${-rotation}deg)`,
                              textShadow: "3px 3px 6px rgba(0,0,0,0.9), -1px -1px 2px rgba(255,255,255,0.3)"
                            }}
                          >
                            {lane.lane_position}
                          </div>
                        );
                      })}

                      {availableLanes.map((_, index) => {
                        const angle = (360 / availableLanes.length) * index;
                        return (
                          <div
                            key={`divider-${index}`}
                            className="absolute top-1/2 left-1/2 w-1 bg-white/30 origin-bottom"
                            style={{
                              height: "50%",
                              transform: `translate(-50%, -100%) rotate(${angle}deg)`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <Button
                  size="lg"
                  onClick={spinWheel}
                  disabled={spinning || availableLanes.length === 0}
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-2xl px-16 py-8 rounded-full shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                >
                  {spinning ? (
                    <>
                      <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                      Memutar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-3 h-7 w-7" />
                      PUSING RODA!
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </Button>

                <p className="text-white/90 mt-6 text-lg font-semibold">
                  {availableLanes.length} lane masih tersedia
                </p>
              </div>

              {showResult && selectedLane && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-500">
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-ping"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `-10%`,
                          animationDelay: `${Math.random() * 2}s`,
                          animationDuration: `${2 + Math.random() * 2}s`
                        }}
                      />
                    ))}
                  </div>

                  <Card className="bg-white max-w-md mx-4 shadow-2xl border-4 border-yellow-400 animate-in zoom-in duration-700 relative">
                    <CardContent className="p-10 text-center">
                      <div className="mb-6">
                        <div className="relative inline-block">
                          <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl animate-pulse" />
                          <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full w-32 h-32 flex items-center justify-center animate-bounce shadow-2xl">
                            <Trophy className="h-16 w-16 text-white" />
                          </div>
                        </div>
                      </div>

                      <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                        Tahniah {username}!
                      </h2>
                      
                      <p className="text-lg text-gray-600 mb-6">Lane anda telah ditentukan</p>

                      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-8 mb-6 border-2 border-red-200">
                        <div className="text-9xl font-black bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent animate-pulse">
                          {selectedLane}
                        </div>
                      </div>

                      <p className="text-gray-600 mb-6 text-lg">
                        Semoga berjaya dalam perlawanan!
                      </p>

                      <Button
                        onClick={() => setShowResult(false)}
                        className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                        size="lg"
                      >
                        OK
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}