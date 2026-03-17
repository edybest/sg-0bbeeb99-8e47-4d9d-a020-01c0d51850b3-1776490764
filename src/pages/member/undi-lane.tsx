import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/SEO";
import { MobileNav } from "@/components/member/MobileNav";
import { MemberTopBarNav } from "@/components/member/MemberTopBarNav";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
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

  const [spinAnimKey, setSpinAnimKey] = useState(0);
  const [spinFromRotation, setSpinFromRotation] = useState(0);

  const wheelRef = useRef<SVGSVGElement>(null);
  const currentRotationRef = useRef(0);

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

  const scheduleTicks = useCallback(
    (durationMs: number, segments: number) => {
      const graph = audioRef.current;
      if (!graph) return;

      const t0 = graph.ctx.currentTime;
      const durationSec = durationMs / 1000;

      const seg = Math.max(1, segments);

      const ticksPerRevolution = Math.min(36, Math.max(12, Math.round(seg * 0.9)));
      const revolutions = 5;
      const tickCount = Math.min(90, Math.round(ticksPerRevolution * revolutions));

      for (let i = 0; i < tickCount; i++) {
        const x = i / Math.max(1, tickCount - 1);

        const easeOutCubic = 1 - Math.pow(1 - x, 3);
        const when = t0 + easeOutCubic * durationSec;

        const strength = 0.05 + 0.12 * (1 - x);
        playTick(when, strength);
      }
    },
    [playTick]
  );

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
    scheduleTicks(5200, availableLanes.length);
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

  if (authLoading) return null;
  if (loading) return null;

  const selectedGame = games.find((g) => g.id === activeGameId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastGame = selectedGame ? new Date(selectedGame.game_date).setHours(0, 0, 0, 0) < today.getTime() : false;

  return (
    <PageAccessGuard pagePath="/member/undi-lane" requireAuth={true}>
      <MemberLayout>
        <SEO title="Undi Lane - AMBC Club" description="Sistem undian lane secara rawak" />

        <div className="min-h-screen bg-rose-50 flex flex-col pb-20 sm:pb-0">
          <MemberTopBarNav />

          <main className="flex-1 container max-w-lg mx-auto p-4 sm:p-6 lg:p-8 relative">
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

            <div className="container mx-auto px-4 py-6 max-w-6xl">
              {/* Game Selector Card */}
              <Card className="border-2 border-pink-100 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden mb-8 transform transition-all duration-300 hover:shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-rose-500 to-purple-500"></div>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="w-full sm:w-1/3">
                      <Select value={activeGameId} onValueChange={handleGameChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a game" />
                        </SelectTrigger>
                        <SelectContent>
                          {games.map((game) => (
                            <SelectItem key={game.id} value={game.id}>
                              {game.name} - {new Date(game.game_date).toLocaleDateString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6 items-start">
                {/* WHEEL CARD */}
                <Card className="flex flex-col border-border shadow-md overflow-hidden bg-card">
                  <CardHeader className="bg-pink-600/5 border-b border-border/50 pb-4">
                    <CardTitle className="text-center text-pink-600 text-2xl font-black uppercase tracking-wider">
                      {myResult ? "Your Lane Assigned" : "Click to Spin!"}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex flex-col items-center justify-center p-6 md:p-8">
                    {myResult ? (
                      <div className="text-center animate-in zoom-in-50 fade-in duration-500 ease-out py-16">
                        <div className="text-[120px] md:text-[140px] leading-none font-black text-pink-600 mb-8 drop-shadow-2xl" style={{ animation: "resultBounce 2s infinite ease-in-out" }}>
                          {myResult.lane_position}
                        </div>
                        <div className="inline-block px-8 py-3 rounded-full bg-pink-600/10 text-pink-600 font-bold text-xl md:text-2xl animate-pulse border border-primary/20 shadow-sm">
                          🎉 Your Assigned Lane
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center">
                        <div className="relative w-full max-w-[320px] aspect-square flex flex-col items-center mb-8">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
                            <div className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[32px] border-t-primary drop-shadow-xl" />
                          </div>

                          <div className="relative w-full aspect-square">
                            <svg
                              ref={wheelRef}
                              key={spinAnimKey}
                              viewBox="0 0 400 400"
                              className="w-full h-full drop-shadow-2xl"
                              style={{
                                transform: `rotate(${spinning ? spinFromRotation : currentRotationRef.current}deg)`,
                                animation: spinning ? "wheel-spin-realistic 5.2s forwards cubic-bezier(0.2, 0.8, 0.1, 1)" : undefined,
                                ["--spin-to" as any]: `${rotation}deg`,
                                willChange: "transform",
                              }}
                            >
                              <defs>
                                <radialGradient id="rimGrad" cx="50%" cy="50%" r="60%">
                                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                                  <stop offset="55%" stopColor="#e5e7eb" stopOpacity="0.9" />
                                  <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.95" />
                                </radialGradient>
                                <radialGradient id="innerShadow" cx="50%" cy="45%" r="60%">
                                  <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                                  <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
                                </radialGradient>
                                <linearGradient id="gloss" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                                  <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
                                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </linearGradient>
                              </defs>

                              <circle cx="200" cy="200" r="197" fill="none" stroke="url(#rimGrad)" strokeWidth="12" />
                              <circle cx="200" cy="200" r="191" fill="none" stroke="var(--border)" strokeOpacity="0.2" strokeWidth="2" />

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
                                    <path d={pathData} fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
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
                                        stroke: "rgba(0,0,0,0.3)",
                                        strokeWidth: 4,
                                        textShadow: "1px 2px 4px rgba(0,0,0,0.6)",
                                        fontFamily: "var(--font-sans), sans-serif",
                                        letterSpacing: "1px"
                                      }}
                                    >
                                      {lane}
                                    </text>
                                  </g>
                                );
                              })}

                              <circle cx="200" cy="200" r="75" fill="var(--background)" fillOpacity="0.95" />
                              <circle cx="200" cy="200" r="70" fill="var(--card)" stroke="var(--border)" strokeWidth="3" />
                              <circle cx="200" cy="200" r="190" fill="url(#gloss)" />
                              <circle cx="200" cy="200" r="190" fill="url(#innerShadow)" opacity="0.25" />
                            </svg>

                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[38%] aspect-square">
                              <div className="w-full h-full rounded-full bg-white shadow-[0_0_20px_rgba(0,0,0,0.3)] border-[4px] border-rose-200 flex items-center justify-center p-2.5">
                                <div className="relative w-full h-full">
                                  <Image src="/ambc-logo.png" alt="AMBC Logo" fill className="object-contain" priority />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center space-y-4 w-full max-w-[280px] sm:max-w-[320px] relative z-10">
                          <Button
                            onClick={spinWheel}
                            disabled={spinning || availableLanes.length === 0 || !isRegisteredForGame || isPastGame}
                            className={`relative w-full text-xl sm:text-2xl font-black py-7 sm:py-8 rounded-2xl shadow-xl transition-all duration-300 uppercase tracking-widest overflow-hidden group ${
                              !spinning && availableLanes.length > 0 && isRegisteredForGame && !isPastGame 
                                ? "bg-pink-600 text-pink-600-foreground hover:bg-pink-600/90 hover:-translate-y-1" 
                                : "opacity-50"
                            }`}
                            style={!spinning && availableLanes.length > 0 && isRegisteredForGame && !isPastGame ? { animation: 'buttonPulse 2s infinite' } : {}}
                          >
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            {spinning ? (
                              <span className="flex items-center gap-3">
                                <Loader2 className="animate-spin h-6 w-6 sm:h-8 sm:w-8" /> SPINNING...
                              </span>
                            ) : "SPIN NOW!"}
                          </Button>

                          <div className="min-h-[50px] flex items-center justify-center w-full">
                            {isPastGame ? (
                              <div className="px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs sm:text-sm font-semibold border border-destructive/20 text-center w-full shadow-sm animate-in slide-in-from-bottom-2">
                                Tarikh untuk game ini telah lepas. Anda tidak boleh mengundi lagi.
                              </div>
                            ) : !isRegisteredForGame ? (
                              <div className="px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs sm:text-sm font-semibold border border-destructive/20 text-center w-full shadow-sm animate-in slide-in-from-bottom-2">
                                Anda tidak tersenarai untuk game ini. Sila hubungi admin.
                              </div>
                            ) : selectedLane ? (
                              <div className="px-6 py-2 rounded-full bg-pink-600/10 text-pink-600 font-bold text-base sm:text-lg animate-in zoom-in border border-primary/20 shadow-inner">
                                Target: <span className="text-xl sm:text-2xl ml-1">{selectedLane}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ALL RESULTS CARD */}
                <Card className="flex flex-col border-border shadow-md bg-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
                    <CardTitle className="text-xl">All Results ({allResults.length})</CardTitle>
                    {member?.is_admin ? (
                      <Button
                        onClick={handleResetSpins}
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset All
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 space-y-2 max-h-[550px] overflow-y-auto">
                      {allResults.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                          <p>No spins yet. Be the first!</p>
                        </div>
                      ) : (
                        allResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors rounded-xl border border-border"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center text-pink-600-foreground font-black text-lg shadow-sm">
                                {result.lane_position}
                              </div>
                              <div>
                                <p className="font-bold text-foreground">
                                  {result.members?.full_name || result.members?.username || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{new Date(result.spun_at).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6 shadow-md border-border bg-card">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    Available Lanes ({availableLanes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-wrap gap-3">
                    {availableLanes.map((lane) => (
                      <div
                        key={lane}
                        className="px-5 py-2.5 bg-background shadow-sm rounded-xl text-foreground font-bold border border-border flex items-center justify-center min-w-[3.5rem] cursor-pointer transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:bg-pink-600 hover:text-pink-600-foreground hover:shadow-lg hover:border-primary"
                      >
                        {lane}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

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
                0% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--primary) / 0.5); }
                70% { transform: scale(1.02); box-shadow: 0 0 0 20px hsl(var(--primary) / 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
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