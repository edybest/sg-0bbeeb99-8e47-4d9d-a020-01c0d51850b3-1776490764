import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Beautiful alternating colors like wheelofnames.com
const WHEEL_COLORS = [
  "#E74C3C", // Red
  "#3498DB", // Blue
  "#F39C12", // Orange
  "#2ECC71", // Green
  "#9B59B6", // Purple
  "#E67E22", // Dark Orange
  "#1ABC9C", // Turquoise
  "#E91E63", // Pink
  "#F1C40F", // Yellow
  "#34495E", // Dark Blue
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

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !member) {
        router.push("/login");
      } else {
        loadGames();
      }
    }
  }, [authLoading, isAuthenticated, member, router]);

  async function loadGames() {
    try {
      await withLoading("member:undi-lane:load-games", async () => {
        const data = await gameService.getAllGames();
        setGames(data);
        if (data.length > 0 && member) {
          const firstGameId = data[0].id;
          setActiveGameId(firstGameId);
          await loadLaneData(member.id, firstGameId);
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

  async function loadLaneData(currentMemberId: string, gameId: string) {
    try {
      const [mySpinResult, gameResults, spunLanes] = await withLoading(
        "member:undi-lane:load-lane-data",
        async () =>
          Promise.all([
            getMemberSpinResult(gameId, currentMemberId),
            getGameSpinResults(gameId),
            getSpunLanePositions(gameId),
          ])
      );

      setMyResult(mySpinResult);
      setAllResults(gameResults);

      const selectedGame = games.find(g => g.id === gameId) || games[0];
      const totalLanes = selectedGame?.lanes || 20;
      const allLanes = Array.from({ length: totalLanes }, (_, i) => {
        const laneNum = i + 1;
        const side = laneNum % 2 === 0 ? "B" : "A";
        const pair = Math.ceil(laneNum / 2);
        return `${pair}${side}`;
      });

      const available = allLanes.filter(lane => !spunLanes.includes(lane));
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
    if (!member || availableLanes.length === 0) {
      toast({
        title: "No lanes available",
        description: "All lanes have been assigned",
        variant: "destructive",
      });
      return;
    }

    setSpinning(true);
    const randomIndex = Math.floor(Math.random() * availableLanes.length);
    const winningLane = availableLanes[randomIndex];
    setSelectedLane(winningLane);

    const segmentAngle = 360 / availableLanes.length;
    const winningAngle = randomIndex * segmentAngle;
    const spins = 5;
    const finalRotation = spins * 360 + (360 - winningAngle) - (segmentAngle / 2);

    setRotation(finalRotation);

    setTimeout(async () => {
      setShowConfetti(true);
      
      try {
        console.log("Saving spin result:", { gameId: activeGameId, memberId: member.id, lane: winningLane });
        await withLoading("member:undi-lane:spin-save", async () => {
          await saveSpinResult(activeGameId, member.id, winningLane);
        });

        await withLoading("member:undi-lane:lane-assignment-upsert", async () => {
          await laneService.upsertLaneAssignmentFromSpin(activeGameId, member.id, winningLane);
        });

        console.log("Spin result saved successfully");
        
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

  if (authLoading) {
    return null;
  }

  return (
    <PageAccessGuard pagePath="/member/undi-lane" requireAuth={true}>
      <>
        <SEO
          title="Undi Lane - AMBC Club"
          description="Spin the wheel to get your lane assignment"
        />
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-20 md:pb-8">
          {/* Confetti Effect */}
          {showConfetti && (
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
          )}

          {/* Header */}
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
            {/* Game Selector */}
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

            {/* Main Content */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Spinning Wheel */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-center text-white text-2xl">
                    {myResult ? "Your Lane" : "Click to Spin!"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-4 md:p-8">
                  {myResult ? (
                    <div className="text-center">
                      <div className="text-8xl font-black text-red-500 mb-4 animate-bounce">
                        {myResult.lane_position}
                      </div>
                      <p className="text-gray-400 text-lg">Your assigned lane</p>
                    </div>
                  ) : (
                    <div className="relative w-full max-w-[400px] aspect-square flex flex-col items-center">
                      {/* Wheel Container with Pointer */}
                      <div className="relative w-full">
                        {/* Pointer Arrow at Top */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
                          <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-yellow-400 drop-shadow-2xl" />
                        </div>

                        {/* Spinning Wheel */}
                        <div className="relative w-full aspect-square">
                          <svg
                            viewBox="0 0 400 400"
                            className="w-full h-full drop-shadow-2xl"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              transition: spinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                            }}
                          >
                            {/* Outer circle border */}
                            <circle cx="200" cy="200" r="195" fill="none" stroke="#fff" strokeWidth="10" />
                            
                            {/* Wheel segments */}
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
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                                    style={{ 
                                      textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                                      fontFamily: "Arial, sans-serif"
                                    }}
                                  >
                                    {lane}
                                  </text>
                                </g>
                              );
                            })}
                            
                            {/* Center circle with bowling pin */}
                            <circle cx="200" cy="200" r="50" fill="white" stroke="#333" strokeWidth="3" />
                            <text
                              x="200"
                              y="210"
                              fontSize="40"
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              🎳
                            </text>
                          </svg>
                        </div>
                      </div>

                      {/* Spin Button */}
                      <Button
                        onClick={spinWheel}
                        disabled={spinning || availableLanes.length === 0}
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
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Results */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">All Results ({allResults.length})</CardTitle>
                  {member?.is_admin && (
                    <Button
                      onClick={handleResetSpins}
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset All
                    </Button>
                  )}
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
                              <p className="text-xs text-gray-400">
                                {new Date(result.spun_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Available Lanes */}
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