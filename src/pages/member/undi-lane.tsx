import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { MobileNav } from "@/components/member/MobileNav";
import { ArrowLeft, Loader2, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
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

const WHEEL_COLORS = [
  "#E74C3C",
  "#3498DB",
  "#F39C12",
  "#2ECC71",
  "#9B59B6",
  "#E67E22",
  "#1ABC9C",
  "#E91E63",
  "#F1C40F",
  "#34495E",
];

type AudioGraph = {
  ctx: AudioContext;
  master: GainNode;
  spinOsc: OscillatorNode;
  spinLfo: OscillatorNode;
  spinLfoGain: GainNode;
  spinGain: GainNode;
  isSpinning: boolean;
  tickGain: GainNode;
};

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

  const audioRef = useRef<AudioGraph | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  const stopSpinSound = useCallback(() => {
    const graph = audioRef.current;
    if (!graph) return;
    graph.isSpinning = false;
    graph.spinGain.gain.cancelScheduledValues(graph.ctx.currentTime);
    graph.spinGain.gain.setTargetAtTime(0.0001, graph.ctx.currentTime, 0.03);
  }, []);

  const ensureAudio = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    if (!audioRef.current) {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return false;

      const ctx = new AudioContextCtor();

      const master = ctx.createGain();
      master.gain.value = 0.18;
      master.connect(ctx.destination);

      const spinOsc = ctx.createOscillator();
      spinOsc.type = "sawtooth";
      spinOsc.frequency.value = 160;

      const spinGain = ctx.createGain();
      spinGain.gain.value = 0.0001;

      const spinFilter = ctx.createBiquadFilter();
      spinFilter.type = "lowpass";
      spinFilter.frequency.value = 1200;
      spinFilter.Q.value = 0.7;

      const spinLfo = ctx.createOscillator();
      spinLfo.type = "sine";
      spinLfo.frequency.value = 8;

      const spinLfoGain = ctx.createGain();
      spinLfoGain.gain.value = 45;

      const tickGain = ctx.createGain();
      tickGain.gain.value = 0.0001;
      tickGain.connect(master);

      spinLfo.connect(spinLfoGain);
      spinLfoGain.connect(spinOsc.frequency);

      spinOsc.connect(spinFilter);
      spinFilter.connect(spinGain);
      spinGain.connect(master);

      spinOsc.start();
      spinLfo.start();

      audioRef.current = {
        ctx,
        master,
        spinOsc,
        spinLfo,
        spinLfoGain,
        spinGain,
        tickGain,
        isSpinning: false,
      };
    }

    const graph = audioRef.current;
    if (!graph) return false;

    if (graph.ctx.state !== "running") {
      try {
        await graph.ctx.resume();
      } catch {
        return false;
      }
    }

    if (graph.ctx.state === "running") {
      setAudioReady(true);
      return true;
    }

    return false;
  }, []);

  const playSpinSound = useCallback(async () => {
    const ok = await ensureAudio();
    if (!ok) return false;

    const graph = audioRef.current;
    if (!graph) return false;

    graph.isSpinning = true;

    const t = graph.ctx.currentTime;
    graph.spinGain.gain.cancelScheduledValues(t);
    graph.spinGain.gain.setTargetAtTime(0.14, t, 0.04);

    graph.spinOsc.frequency.cancelScheduledValues(t);
    graph.spinOsc.frequency.setTargetAtTime(220, t, 0.08);

    graph.spinLfo.frequency.cancelScheduledValues(t);
    graph.spinLfo.frequency.setTargetAtTime(12, t, 0.12);

    return true;
  }, [ensureAudio]);

  const playWinSound = useCallback(async () => {
    const ok = await ensureAudio();
    if (!ok) return false;

    const graph = audioRef.current;
    if (!graph) return false;

    const t0 = graph.ctx.currentTime;

    const osc = graph.ctx.createOscillator();
    const gain = graph.ctx.createGain();
    const filter = graph.ctx.createBiquadFilter();

    filter.type = "highpass";
    filter.frequency.value = 250;

    osc.type = "triangle";

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);

    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.12);
    osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(graph.master);

    osc.start(t0);
    osc.stop(t0 + 0.5);

    return true;
  }, [ensureAudio]);

  const playTick = useCallback((when: number, strength = 0.18) => {
    const graph = audioRef.current;
    if (!graph) return;
    const osc = graph.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 1800;

    const g = graph.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, strength), when + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.025);

    osc.connect(g);
    g.connect(graph.tickGain);

    osc.start(when);
    osc.stop(when + 0.03);
  }, []);

  const scheduleTicks = useCallback((durationMs: number, segments: number) => {
    const graph = audioRef.current;
    if (!graph) return;
    const t0 = graph.ctx.currentTime;
    const durationSec = durationMs / 1000;

    const safeSegments = Math.max(1, segments);
    const tickCount = Math.min(80, safeSegments * 3);
    for (let i = 0; i < tickCount; i++) {
      const x = i / tickCount;
      const eased = x * x * (3 - 2 * x);
      const when = t0 + eased * durationSec;
      const strength = 0.08 + 0.14 * (1 - x);
      playTick(when, strength);
    }
  }, [playTick]);

  useEffect(() => {
    return () => {
      try {
        stopSpinSound();
        const graph = audioRef.current;
        if (graph) {
          graph.spinOsc.stop();
          graph.spinLfo.stop();
          graph.ctx.close();
        }
      } catch {
      } finally {
        audioRef.current = null;
      }
    };
  }, [stopSpinSound]);

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

      const list = gamesSnapshot ?? games;
      const selectedGame = list.find((g) => g.id === gameId) || list[0];
      const assignedCount = Array.isArray(assignedLanePositions) ? assignedLanePositions.length : 0;
      const baseTotalLanes = selectedGame?.lanes || 20;
      const totalLanes = assignedCount > 0 ? Math.min(baseTotalLanes, assignedCount) : baseTotalLanes;

      const adminAssigned = await laneService.getAdminAssignedLanePositionsForGame(gameId);

      const assignedList = Array.isArray(adminAssigned) ? adminAssigned.filter(Boolean) : [];
      const fallbackList = Array.isArray(assignedLanePositions) ? assignedLanePositions.filter(Boolean) : [];

      const wheelSegments = assignedList.length > 0 ? assignedList : fallbackList;

      const available = wheelSegments.filter((lane) => !spunLanes.includes(lane));
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

    if (!audioReady) {
      const unlocked = await ensureAudio();
      if (!unlocked) {
        toast({
          title: "Sound",
          description: "Browser block audio. Tap SPIN sekali lagi untuk enable sound.",
        });
      }
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
    const startedSound = await playSpinSound();
    scheduleTicks(5000, availableLanes.length);
    if (!startedSound && audioReady) {
      toast({
        title: "Sound",
        description: "Tap SPIN sekali lagi untuk enable sound.",
      });
    }

    let winningLane: string | null = null;

    try {
      const existingAssignment = await withLoading("member:undi-lane:check-existing-assignment", async () =>
        laneService.getMemberLaneAssignment(activeGameId, member.id)
      );
      if (existingAssignment?.lane_position) {
        winningLane = existingAssignment.lane_position;
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
    const spins = 5;
    const finalRotation = spins * 360 + (360 - winningAngle) - segmentAngle / 2;

    setRotation(finalRotation);

    setTimeout(async () => {
      stopSpinSound();
      await playWinSound();

      setShowConfetti(true);

      try {
        await withLoading("member:undi-lane:spin-save", async () => {
          await saveSpinResult(activeGameId, member.id, winningLane as string);
        });

        await withLoading("member:undi-lane:lane-assignment-upsert", async () => {
          await laneService.upsertLaneAssignmentFromSpin(activeGameId, member.id, winningLane as string);
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
    }, 5000);
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

  if (authLoading) return null;
  if (loading) return null;

  return (
    <PageAccessGuard pagePath="/member/undi-lane" requireAuth={true}>
      <>
        <SEO title="Undi Lane - AMBC Club" description="Spin the wheel to get your lane assignment" />

        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-20 md:pb-8">
          {showConfetti ? (
            <div className="fixed inset-0 pointer-events-none z-50">
              {[...Array(50)].map((_, i) => (
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
                      width: `${10 + Math.random() * 20}px`,
                      height: `${10 + Math.random() * 20}px`,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <header className="bg-gray-800 shadow-lg border-b border-gray-700 sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/member">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </Link>
                  <MobileNav />
                  <ClubLogo size="sm" />
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-red-500">Undi Lane</h1>
                    <p className="text-xs md:text-sm text-gray-400">Spin to Win</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-6 max-w-6xl">
            <Card className="mb-6 bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Select Game</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={activeGameId} onValueChange={handleGameChange}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Choose a game" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {games.map((game) => (
                      <SelectItem key={game.id} value={game.id} className="text-white">
                        {game.name} - {new Date(game.game_date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-center text-white text-2xl">
                    {myResult ? "Your Lane" : "Click to Spin!"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col items-center justify-center p-4 md:p-8">
                  {myResult ? (
                    <div className="text-center">
                      <div className="text-8xl font-black text-red-500 mb-4 animate-bounce">{myResult.lane_position}</div>
                      <p className="text-gray-400 text-lg">Your assigned lane</p>
                    </div>
                  ) : (
                    <div className="relative w-full max-w-[400px] aspect-square flex flex-col items-center">
                      <div className="relative w-full">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
                          <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-yellow-400 drop-shadow-2xl" />
                        </div>

                        <div className="relative w-full aspect-square">
                          <svg
                            viewBox="0 0 400 400"
                            className="w-full h-full drop-shadow-2xl"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              transition: spinning ? "transform 5s cubic-bezier(0.12, 0.75, 0.06, 0.98)" : "none",
                            }}
                          >
                            <defs>
                              <radialGradient id="rimGrad" cx="50%" cy="50%" r="60%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                                <stop offset="55%" stopColor="#d1d5db" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.95" />
                              </radialGradient>
                              <radialGradient id="innerShadow" cx="50%" cy="45%" r="60%">
                                <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                                <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
                              </radialGradient>
                              <linearGradient id="gloss" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                              </linearGradient>
                            </defs>

                            <circle cx="200" cy="200" r="197" fill="none" stroke="url(#rimGrad)" strokeWidth="12" />
                            <circle cx="200" cy="200" r="191" fill="none" stroke="#111827" strokeOpacity="0.55" strokeWidth="2" />

                            {availableLanes.map((lane, index) => {
                              const segmentAngle = 360 / availableLanes.length;
                              const startAngle = index * segmentAngle - 90;
                              const endAngle = startAngle + segmentAngle;

                              const startRad = (startAngle * Math.PI) / 180;
                              const endRad = (endAngle * Math.PI) / 180;

                              const x1 = 200 + 190 * Math.cos(startRad);
                              const y1 = 200 + 190 * Math.sin(startRad);
                              const x2 = 200 + 190 * Math.cos(endRad);
                              const y2 = 200 + 190 * Math.sin(endRad);

                              const largeArc = segmentAngle > 180 ? 1 : 0;
                              const pathData = `M 200 200 L ${x1} ${y1} A 190 190 0 ${largeArc} 1 ${x2} ${y2} Z`;

                              const color = WHEEL_COLORS[index % WHEEL_COLORS.length];

                              const midAngle = startAngle + segmentAngle / 2;
                              const textRadius = 130;
                              const textX = 200 + textRadius * Math.cos((midAngle * Math.PI) / 180);
                              const textY = 200 + textRadius * Math.sin((midAngle * Math.PI) / 180);

                              return (
                                <g key={lane}>
                                  <path d={pathData} fill={color} stroke="#fff" strokeWidth="3" />
                                  <text
                                    x={textX}
                                    y={textY}
                                    fill="white"
                                    fontSize="28"
                                    fontWeight="800"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                                    style={{
                                      paintOrder: "stroke",
                                      stroke: "rgba(0,0,0,0.45)",
                                      strokeWidth: 3,
                                      textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                                      fontFamily: "Arial, sans-serif",
                                    }}
                                  >
                                    {lane}
                                  </text>
                                </g>
                              );
                            })}

                            <circle cx="200" cy="200" r="82" fill="rgba(255,255,255,0.9)" />
                            <circle cx="200" cy="200" r="78" fill="white" stroke="#111827" strokeOpacity="0.35" strokeWidth="3" />
                            <circle cx="200" cy="200" r="190" fill="url(#gloss)" />
                            <circle cx="200" cy="200" r="190" fill="url(#innerShadow)" opacity="0.25" />
                          </svg>

                          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                            <div className="h-24 w-24 rounded-full bg-white shadow-2xl ring-4 ring-gray-900/20 flex items-center justify-center overflow-hidden">
                              <div className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-red-600/30">
                                <Image src="/ambc-logo.png" alt="AMBC Logo" fill className="object-cover" priority />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={spinWheel}
                        disabled={spinning || availableLanes.length === 0 || !isRegisteredForGame}
                        className="mt-8 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xl px-10 py-6 rounded-full shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform transition-transform hover:scale-105"
                      >
                        {spinning ? (
                          <>
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            Spinning...
                          </>
                        ) : (
                          "SPIN!"
                        )}
                      </Button>

                      {!isRegisteredForGame ? (
                        <p className="mt-3 text-sm text-red-200 text-center max-w-sm">
                          Anda tidak tersenarai untuk game ini. Admin sahaja boleh masukkan nama anda dalam senarai pemain.
                        </p>
                      ) : null}

                      {selectedLane ? <p className="mt-3 text-xs text-gray-400">Target: {selectedLane}</p> : null}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">All Results ({allResults.length})</CardTitle>
                  {member?.is_admin ? (
                    <Button
                      onClick={handleResetSpins}
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset All
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {allResults.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p>No spins yet. Be the first!</p>
                      </div>
                    ) : (
                      allResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg">
                              {result.lane_position}
                            </div>
                            <div>
                              <p className="font-semibold text-white">
                                {result.members?.full_name || result.members?.username || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-400">{new Date(result.spun_at).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Available Lanes ({availableLanes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {availableLanes.map((lane) => (
                    <div
                      key={lane}
                      className="px-4 py-2 bg-gray-700 rounded-lg text-white font-semibold border border-gray-600"
                    >
                      {lane}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <style jsx>{`
            @keyframes confetti {
              0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
              }
            }
            .animate-confetti {
              animation: confetti linear forwards;
            }
          `}</style>
        </div>
      </>
    </PageAccessGuard>
  );
}