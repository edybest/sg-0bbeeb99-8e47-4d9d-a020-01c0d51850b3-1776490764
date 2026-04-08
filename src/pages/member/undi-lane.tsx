import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/SEO";
import { Loader2, RotateCcw, Sparkles, Trash2, Play, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getMemberSpinResult,
  getGameSpinResults,
  saveSpinResult,
  getSpunLanePositions,
  resetAllSpinResults,
} from "@/services/laneSpinService";
import { gameService } from "@/services/gameService";
import { laneService } from "@/services/laneService";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import Image from "next/image";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LaneSpinWheel } from "@/components/admin/LaneSpinWheel";

interface SpinResultWithMember {
  id: string;
  member_id: string;
  lane_position: string;
  spun_at: string;
  members?: {
    full_name: string;
    username: string;
  };
}

// Soft blue & cool colors for the wheel theme
const WHEEL_COLORS = [
  "#3B82F6", // blue-500
  "#0EA5E9", // sky-500
  "#06B6D4", // cyan-500
  "#14B8A6", // teal-500
  "#6366F1", // indigo-500
  "#8B5CF6", // violet-500
  "#38BDF8", // sky-400
  "#60A5FA", // blue-400
  "#2DD4BF", // teal-400
  "#818CF8", // indigo-400
];

export default function UndiLanePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { member, isAuthenticated, loading: authLoading } = useAuth();
  const { withLoading } = useGlobalLoading();

  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string>("");
  const [games, setGames] = useState<any[]>([]);
  const [myResult, setMyResult] = useState<SpinResultWithMember | null>(null);
  const [allResults, setAllResults] = useState<SpinResultWithMember[]>([]);
  const [availableLanes, setAvailableLanes] = useState<string[]>([]);
  const [rotation, setRotation] = useState(0);
  const [selectedLane, setSelectedLane] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [isRegisteredForGame, setIsRegisteredForGame] = useState<boolean>(true);

  const [spinAnimKey, setSpinAnimKey] = useState(0);
  const [spinFromRotation, setSpinFromRotation] = useState(0);

  const wheelRef = useRef<SVGSVGElement>(null);
  const currentRotationRef = useRef(0);

  // Audio Refs for MP3 files
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio Objects
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Create audio instances
      const spinAudio = new Audio("/spin.mp3");
      const winAudio = new Audio("/win.mp3");
      
      // Preload them so there's no delay on button click
      spinAudio.preload = "auto";
      winAudio.preload = "auto";

      spinAudioRef.current = spinAudio;
      winAudioRef.current = winAudio;
    }

    // Cleanup audio when component unmounts
    return () => {
      if (spinAudioRef.current) {
        spinAudioRef.current.pause();
        spinAudioRef.current.src = "";
      }
      if (winAudioRef.current) {
        winAudioRef.current.pause();
        winAudioRef.current.src = "";
      }
    };
  }, []);

  const playSpinSound = useCallback(() => {
    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.loop = true; // Loop sound while spinning
      
      // We catch the promise rejection (e.g. if user hasn't interacted yet)
      spinAudioRef.current.play().catch(e => {
        console.warn("Audio play was blocked by browser:", e);
      });
    }
  }, []);

  const stopSpinSound = useCallback(() => {
    if (spinAudioRef.current) {
      spinAudioRef.current.pause();
      spinAudioRef.current.currentTime = 0;
    }
  }, []);

  const playWinSound = useCallback(() => {
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0;
      winAudioRef.current.loop = false;
      winAudioRef.current.play().catch(e => {
        console.warn("Win Audio play was blocked by browser:", e);
      });
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const rotateWheel = (time: number) => {
      let deltaTime = time - lastTime;
      lastTime = time;
      
      if (deltaTime > 100) deltaTime = 16;

      if (!spinning && !myResult && availableLanes.length > 0) {
        currentRotationRef.current = (currentRotationRef.current + deltaTime * 0.02) % 360;
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${currentRotationRef.current}deg)`;
        }
      }
      animationFrameId = requestAnimationFrame(rotateWheel);
    };

    animationFrameId = requestAnimationFrame(rotateWheel);
    return () => cancelAnimationFrame(animationFrameId);
  }, [spinning, myResult, availableLanes.length]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !member) {
        router.push("/login");
      } else {
        loadGames();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, member, router]);

  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [deleteSpinId, setDeleteSpinId] = useState<string | null>(null);

  // Helper: Truncate long names for wheel display
  const truncateName = (name: string, maxLength: number = 15): string => {
    if (name.length <= maxLength) return name;
    
    // If has multiple words, show first word + initial
    const words = name.trim().split(/\s+/);
    if (words.length > 1) {
      return `${words[0]} ${words[1][0]}.`;
    }
    
    // Single word - truncate with ellipsis
    return name.substring(0, maxLength - 1) + '…';
  };

  async function loadGames() {
    try {
      await withLoading("member:undi-lane:load-games", async () => {
        const data = await gameService.getAllGames();
        setGames(data);
        if (data.length > 0 && member) {
          const firstGameId = data[0].id;
          setActiveGameId(firstGameId);
          await loadLaneData(member.id, firstGameId, data);
        }
      });
    } catch (error) {
      console.error("Error loading games:", error);
      toast({
        title: "Error",
        description: "Failed to load games",
        variant: "destructive",
      });
    }
    setLoading(false);
  }

  async function loadLaneData(currentMemberId: string, gameId: string, gamesSnapshot?: any[]) {
    try {
      const list = gamesSnapshot ?? games;
      const selectedGame = list.find((g) => g.id === gameId) || list[0];
      const isGameCouple = selectedGame?.game_type === 'COUPLE';

      const [mySpinResult, gameResults, spunLanes, registeredOk, assignedLanePositions] = await withLoading(
        "member:undi-lane:load-lane-data",
        async () =>
          Promise.all([
            getMemberSpinResult(gameId, currentMemberId),
            getGameSpinResults(gameId),
            getSpunLanePositions(gameId),
            laneService.isMemberRegisteredForGame(gameId, currentMemberId),
            laneService.getAssignedLanePositionsForGame(gameId),
          ])
      );

      setMyResult(mySpinResult as any);
      setAllResults(gameResults as any);
      setIsRegisteredForGame(registeredOk);

      const assignedCount = Array.isArray(assignedLanePositions) ? assignedLanePositions.length : 0;
      const baseTotalLanes = selectedGame?.lanes || 20;
      const totalLanes = assignedCount > 0 ? Math.min(baseTotalLanes, assignedCount) : baseTotalLanes;

      const adminAssigned = await laneService.getAdminAssignedLanePositionsForGame(gameId);

      const assignedList = Array.isArray(adminAssigned) ? adminAssigned.filter(Boolean) : [];
      const fallbackList = Array.isArray(assignedLanePositions) ? assignedLanePositions.filter(Boolean) : [];

      const wheelSegments = assignedList.length > 0 ? assignedList : fallbackList;

      // FIXED: Available lanes = wheel segments that DON'T have spin results
      // Pre-assigned lanes are NOT excluded - they're handled by spinWheel() logic
      // which assigns the correct lane when player spins
      const occupiedLanes = Array.isArray(spunLanes) ? spunLanes : [];
      const available = wheelSegments.filter((lane) => !occupiedLanes.includes(lane));
      
      setAvailableLanes(available);
    } catch (error) {
      console.error("Error loading lane data:", error);
      toast({
        title: "Error",
        description: "Failed to load lane data",
        variant: "destructive",
      });
    }
    setLoading(false);
  }

  async function handleGameChange(gameId: string) {
    if (!member) return;
    setActiveGameId(gameId);
    setLoading(true);
    await withLoading("member:undi-lane:change-game", async () => {
      await loadLaneData(member.id, gameId);
    });
    setLoading(false);
  }

  async function spinWheel() {
    if (!member) return;
    if (!activeGameId) return;

    if (!isRegisteredForGame) {
      toast({
        title: "Tidak tersenarai",
        description: "Anda tidak tersenarai untuk game ini. Sila hubungi admin.",
        variant: "destructive",
      });
      return;
    }

    if (availableLanes.length === 0) {
      toast({
        title: "No lanes available",
        description: "All lanes have been assigned",
        variant: "destructive",
      });
      return;
    }

    setSpinning(true);
    playSpinSound();

    let winningLane: string | null = null;
    let isCouple = false;
    let coupleId: string | null = null;

    // Detect game type
    const selectedGame = games.find((g) => g.id === activeGameId);
    isCouple = selectedGame?.game_type === 'COUPLE';

    try {
      if (isCouple) {
        // For COUPLE games: Check couple assignment
        const coupleData = await withLoading("member:undi-lane:check-couple-assignment", async () =>
          laneService.getCoupleByPlayerAndGame(member.id, activeGameId)
        );

        console.log("🎯 COUPLE GAME - Player couple check:", {
          playerId: member.id,
          playerName: member.username,
          gameId: activeGameId,
          foundCouple: coupleData ? {
            couple_id: coupleData.couple_id,
            couple_name: coupleData.couple?.couple_name,
            player1: coupleData.couple?.player1?.username,
            player2: coupleData.couple?.player2?.username
          } : null
        });

        if (coupleData?.couple_id) {
          coupleId = coupleData.couple_id;
          
          // Check if couple already has lane assignment
          const coupleAssignment = await laneService.getCoupleLaneAssignment(activeGameId, coupleId);
          if (coupleAssignment?.lane_position) {
            winningLane = coupleAssignment.lane_position;
            console.log("✅ Found pre-assigned lane for couple:", {
              couple_name: coupleData.couple?.couple_name,
              lane: winningLane
            });
          }
        } else {
          console.warn("⚠️ Player not in any couple for this game!");
          toast({
            title: "Tidak dijumpai couple",
            description: "Anda tidak disenaraikan dalam mana-mana couple untuk game ini. Sila hubungi admin.",
            variant: "destructive",
          });
          setSpinning(false);
          stopSpinSound();
          return;
        }
      } else {
        // For BLOK games: Check member assignment
        const existingAssignment = await withLoading("member:undi-lane:check-existing-assignment", async () =>
          laneService.getMemberLaneAssignment(activeGameId, member.id)
        );
        if (existingAssignment?.lane_position) {
          winningLane = existingAssignment.lane_position;
        }
      }
    } catch (e) {
      console.warn("Could not check existing lane assignment. Falling back to random.", e);
    }

    if (!winningLane) {
      const randomIndex = Math.floor(Math.random() * availableLanes.length);
      winningLane = availableLanes[randomIndex];
    }

    setSelectedLane(winningLane);

    const winningIndex = Math.max(0, availableLanes.indexOf(winningLane));
    const segmentAngle = 360 / availableLanes.length;
    const winningAngle = winningIndex * segmentAngle;
    const spins = 6;
    
    const currentRotation = currentRotationRef.current;
    const targetMod = (360 - winningAngle) - segmentAngle / 2;
    const currentMod = currentRotation % 360;
    let diff = targetMod - currentMod;
    if (diff <= 0) diff += 360;
    
    const finalRotation = currentRotation + (spins * 360) + diff;

    setSpinFromRotation(currentRotation);
    setRotation(finalRotation);
    currentRotationRef.current = finalRotation % 360;
    setSpinAnimKey((k) => k + 1);

    setTimeout(async () => {
      stopSpinSound();
      playWinSound();
      setShowConfetti(true);

      try {
        await withLoading("member:undi-lane:spin-save", async () => {
          if (isCouple && coupleId) {
            // Save spin result for couple
            await saveSpinResult(activeGameId, member.id, winningLane as string);
            // Upsert lane assignment with couple_id
            await laneService.upsertCoupleLaneAssignmentFromSpin(activeGameId, coupleId, winningLane as string);
          } else {
            // Save spin result for individual member
            await saveSpinResult(activeGameId, member.id, winningLane as string);
            // Upsert lane assignment with member_id
            await laneService.upsertLaneAssignmentFromSpin(activeGameId, member.id, winningLane as string);
          }
        });

        await withLoading("member:undi-lane:spin-reload", async () => {
          await loadLaneData(member.id, activeGameId);
        });

        toast({
          title: "🎉 Lane Assigned!",
          description: `You got Lane ${winningLane}!`,
          duration: 5000,
        });

        setTimeout(() => setShowConfetti(false), 3000);
      } catch (error) {
        console.error("Error saving spin result:", error);
        const err = error as { message?: string };
        toast({
          title: "Error",
          description: err?.message
            ? `Failed to save lane assignment: ${err.message}`
            : "Failed to save lane assignment. Please try again.",
          variant: "destructive",
        });
      } finally {
        setSpinning(false);
      }
    }, 5200);
  }

  async function handleResetSpins() {
    if (!member?.is_admin || !activeGameId) return;
    if (!confirm("Reset all spin results for this game?")) return;

    try {
      await withLoading("member:undi-lane:reset", async () => {
        await resetAllSpinResults(activeGameId);
        await loadLaneData(member.id, activeGameId);
      });
      toast({
        title: "Reset successful",
        description: "All spin results have been cleared",
      });
    } catch (error) {
      console.error("Error resetting spins:", error);
      toast({
        title: "Error",
        description: "Failed to reset spins",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteSpin(spinId: string) {
    try {
      await withLoading("member:undi-lane:delete-spin", async () =>
        laneService.deleteSpinResult(spinId)
      );
      
      await loadLaneData(member.id, activeGameId);
      setDeleteSpinId(null);
      
      toast({
        title: "Berjaya",
        description: "Rekod spin telah dipadam.",
      });
    } catch (error) {
      console.error("Error deleting spin:", error);
      toast({
        title: "Ralat",
        description: "Gagal padam rekod spin.",
        variant: "destructive",
      });
    }
  }

  const [currentGame, setCurrentGame] = useState<any>(null);
  const [laneDraws, setLaneDraws] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [myLaneNumber, setMyLaneNumber] = useState<number | null>(null);
  const [isGameCouple, setIsGameCouple] = useState(false);
  const [myCouple, setMyCouple] = useState<any>(null);
  const [partnerAlreadyDrawn, setPartnerAlreadyDrawn] = useState(false);

  useEffect(() => {
    if (currentGame && member) {
      checkDrawStatus();
      checkCoupleStatus();
    }
  }, [currentGame, member]);

  const checkCoupleStatus = async () => {
    if (!currentGame || !member || currentGame.game_type !== 'COUPLE') {
      setIsGameCouple(false);
      return;
    }

    try {
      setIsGameCouple(true);
      
      // Check if user is in a couple for this game
      const coupleData = await laneService.getCoupleByPlayerAndGame(member.id, currentGame.id);
      
      if (coupleData && coupleData.couple) {
        setMyCouple(coupleData.couple);
        
        // Check if partner has already drawn
        const partnerDrawn = await laneService.checkIfPartnerAlreadyDrawn(coupleData.couple_id, currentGame.id);
        setPartnerAlreadyDrawn(partnerDrawn);
      } else {
        setMyCouple(null);
        setPartnerAlreadyDrawn(false);
      }
    } catch (error) {
      console.error("Error checking couple status:", error);
    }
  };

  const checkDrawStatus = async () => {
  };

  const handleDrawLane = async () => {
    if (!member || !currentGame) return;

    // For couple games, check if partner already drawn
    if (isGameCouple && partnerAlreadyDrawn) {
      toast({
        title: "Partner Sudah Undi",
        description: "Pasangan anda sudah mengundi lane. Hanya seorang dari couple boleh mengundi.",
        variant: "destructive",
      });
      return;
    }

    setIsDrawing(true);
  };

  if (authLoading) return null;
  if (loading) return null;

  const selectedGame = games.find((g) => g.id === activeGameId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastGame = selectedGame ? new Date(selectedGame.game_date).setHours(0, 0, 0, 0) < today.getTime() : false;

  return (
    <PageAccessGuard
      pagePath="/member/undi-lane"
      requireAuth={true}
      renderLoading={() => null}
    >
      <MemberLayout>
        <SEO title="Undi Lane - AMBC Club" description="Sistem undian lane secara rawak" />

        <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-0">

          <main className="flex-1 container max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 relative">
            {showConfetti ? (
              <div className="fixed inset-0 pointer-events-none z-50">
                {/* Reduce confetti count on mobile for better performance */}
                {[...Array(typeof window !== 'undefined' && window.innerWidth < 640 ? 30 : 50)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `-${Math.random() * 20}%`,
                      animationDelay: `${Math.random() * 0.5}s`,
                      animationDuration: `${2 + Math.random() * 2}s`,
                    }}
                  >
                    <Sparkles
                      className="text-yellow-400"
                      style={{
                        width: `${10 + Math.random() * 15}px`,
                        height: `${10 + Math.random() * 15}px`,
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-6xl">
              <Card className="border-2 border-sky-100 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden mb-6 sm:mb-8 transform transition-all duration-300 hover:shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500"></div>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="w-full sm:w-1/3">
                      <Select value={activeGameId} onValueChange={handleGameChange}>
                        <SelectTrigger className="w-full border-sky-200 focus:ring-blue-500 h-12 text-base">
                          <SelectValue placeholder="Choose a game" />
                        </SelectTrigger>
                        <SelectContent>
                          {games.map((game) => {
                            const d = new Date(game.game_date);
                            const formattedDate = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                            return (
                              <SelectItem key={game.id} value={game.id}>
                                {game.name} - {formattedDate}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 items-start">
                <Card className="flex flex-col border-sky-100 shadow-md overflow-hidden bg-white">
                  <CardHeader className="bg-blue-50 border-b border-sky-100 pb-3 sm:pb-4">
                    <CardTitle className="text-center text-blue-700 text-xl sm:text-2xl font-black uppercase tracking-wider">
                      {myResult ? "Your Lane Assigned" : "Click to Spin!"}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
                    {myResult ? (
                      <div className="text-center animate-in zoom-in-50 fade-in duration-500 ease-out py-12 sm:py-16">
                        <div className="text-[100px] sm:text-[120px] md:text-[140px] leading-none font-black text-blue-600 mb-6 sm:mb-8 drop-shadow-2xl" style={{ animation: "resultBounce 2s infinite ease-in-out" }}>
                          {myResult.lane_position}
                        </div>
                        <div className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-blue-50 text-blue-700 font-bold text-lg sm:text-xl md:text-2xl animate-pulse border border-blue-200 shadow-sm">
                          🎉 Your Assigned Lane
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center">
                        {/* Spin Wheel */}
                        {selectedGame && availableLanes.length > 0 && (
                          <div className="flex flex-col items-center gap-6 sm:gap-8 md:gap-10 w-full relative pt-2 sm:pt-4 pb-6 sm:pb-8">
                            <LaneSpinWheel
                              ref={wheelRef as any}
                              items={availableLanes}
                              rotation={rotation}
                              isSpinning={spinning}
                              onSpinClick={spinWheel}
                            />

                            {/* Controls - Responsive button sizes */}
                            <div className="flex gap-3 sm:gap-4 mt-2 sm:mt-4">
                              <Button
                                onClick={handleResetSpins}
                                disabled={spinning || allResults.length === 0}
                                variant="outline"
                                size="lg"
                                className="h-12 sm:h-14 px-4 sm:px-6 rounded-2xl border-2 hover:bg-slate-100 text-sm sm:text-base touch-manipulation active:scale-95 transition-transform"
                              >
                                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                <span className="hidden sm:inline">Reset Game</span>
                                <span className="sm:hidden">Reset</span>
                              </Button>
                            </div>
                          </div>
                        )}
                        {selectedGame && availableLanes.length === 0 && (
                          <div className="text-center p-8 sm:p-10 w-full max-w-md bg-gradient-to-br from-sky-50 to-blue-50 rounded-3xl border-2 border-dashed border-sky-200 shadow-sm">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-sky-800 mb-2">Semua Lane Penuh!</h3>
                            <p className="text-sm sm:text-base text-sky-600">Terima kasih, semua peserta telah mendapat lane masing-masing.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="flex flex-col border-sky-100 shadow-md bg-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 sm:pb-4 border-b border-sky-100 bg-slate-50/50">
                    <CardTitle className="text-lg sm:text-xl text-slate-800">All Results ({allResults.length})</CardTitle>
                    {member?.is_admin ? (
                      <Button
                        onClick={handleResetSpins}
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors h-9 px-3 text-xs sm:text-sm touch-manipulation active:scale-95"
                      >
                        <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Reset All</span>
                        <span className="sm:hidden">Reset</span>
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-3 sm:p-4 space-y-2 max-h-[400px] sm:max-h-[550px] overflow-y-auto">
                      {allResults.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 text-slate-400">
                          <p className="text-sm sm:text-base">No spins yet. Be the first!</p>
                        </div>
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          {allResults.map((result, index) => {
                            // Check if this is a couple result AND the game type is COUPLE
                            const isCouple = selectedGame?.game_type === 'COUPLE' && (result as any).couples && (result as any).couples.length > 0;
                            const coupleData = isCouple ? (result as any).couples[0] : null;
                            
                            return (
                              <div
                                key={result.id}
                                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-card rounded-lg border"
                              >
                                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {isCouple && coupleData ? (
                                    <>
                                      <p className="font-bold text-pink-700 text-sm sm:text-base truncate">{coupleData.couple_name}</p>
                                      <p className="text-xs text-gray-600 truncate">
                                        {coupleData.player1?.username || ''} <span className="text-pink-400">+</span> {coupleData.player2?.username || ''}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="font-medium text-sm sm:text-base truncate">{result.members?.username}</p>
                                  )}
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    {new Date(result.spun_at).toLocaleString("ms-MY", { 
                                      dateStyle: 'short', 
                                      timeStyle: 'short' 
                                    })}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="font-mono text-xs sm:text-sm flex-shrink-0">
                                  {result.lane_position}
                                </Badge>
                                {member?.is_admin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 touch-manipulation active:scale-95"
                                    onClick={() => setDeleteSpinId(result.id)}
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4 sm:mt-6 shadow-md border-sky-100 bg-white">
                <CardHeader className="bg-slate-50/80 pb-3 sm:pb-4 border-b border-sky-100">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-800">
                    <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                    Available Lanes ({availableLanes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {availableLanes.map((lane) => (
                      <div
                        key={lane}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white shadow-sm rounded-xl text-slate-700 font-bold border border-slate-200 flex items-center justify-center min-w-[3rem] sm:min-w-[3.5rem] cursor-pointer transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-500/30 hover:border-blue-500 text-sm sm:text-base touch-manipulation active:scale-95"
                      >
                        {lane}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteSpinId} onOpenChange={(open) => !open && setDeleteSpinId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Padam Rekod Spin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini tidak boleh dibatalkan. Rekod spin akan dipadam secara kekal.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteSpinId && handleDeleteSpin(deleteSpinId)}
                  >
                    Padam
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <style jsx>{`
              @keyframes wheel-spin-realistic {
                0% { transform: rotate(0deg); }
                70% { transform: rotate(calc(var(--spin-to) - 18deg)); }
                88% { transform: rotate(calc(var(--spin-to) + 4deg)); }
                100% { transform: rotate(var(--spin-to)); }
              }

              @keyframes confetti {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
              }
              .animate-confetti {
                animation: confetti linear forwards;
              }

              @keyframes buttonPulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5); }
                70% { transform: scale(1.02); box-shadow: 0 0 0 20px rgba(37, 99, 235, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
              }

              @keyframes resultBounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.08) rotate(1deg); }
              }
            `}</style>
          </main>
        </div>
      </MemberLayout>
    </PageAccessGuard>
  );
}
UndiLanePage.disableGlobalLoadingOverlay = true;