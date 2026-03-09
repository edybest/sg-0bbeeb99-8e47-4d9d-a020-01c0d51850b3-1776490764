import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [availableLanes, setAvailableLanes] = useState<LaneAssignment[]>([]);
  const [myResult, setMyResult] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedLane, setSelectedLane] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        router.push("/login");
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (memberError || !member) {
        console.error("Member lookup error:", memberError);
        toast({
          title: "Error",
          description: "Failed to load member data. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setMemberId(member.id);
      await loadLaneData(member.id);
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/login");
    }
  }

  async function loadLaneData(currentMemberId: string) {
    try {
      // Check if member already spun
      const { data: existingResult, error: resultError } = await supabase
        .from("lane_spin_results")
        .select("*")
        .eq("member_id", currentMemberId)
        .maybeSingle();

      if (resultError) {
        console.error("Error checking spin result:", resultError);
      }

      if (existingResult) {
        setMyResult(existingResult);
        setSelectedLane(existingResult.lane_position);
        setShowResult(true);
      } else {
        // Load available lanes (not yet spun)
        const { data: spunResults, error: spunError } = await supabase
          .from("lane_spin_results")
          .select("lane_position");

        if (spunError) {
          console.error("Error loading spun results:", spunError);
        }

        const spunLanes = spunResults?.map(r => r.lane_position) || [];

        const { data: assignments, error: assignError } = await supabase
          .from("lane_assignments")
          .select("*")
          .not("lane_position", "in", `(${spunLanes.length > 0 ? spunLanes.map(l => `'${l}'`).join(",") : "''"})`)
          .order("lane_position");

        if (assignError) {
          console.error("Error loading assignments:", assignError);
          toast({
            title: "Error",
            description: "Failed to load lane data.",
            variant: "destructive",
          });
        } else {
          setAvailableLanes(assignments || []);
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

  async function spinWheel() {
    if (availableLanes.length === 0 || !memberId || spinning) return;

    setSpinning(true);
    setShowResult(false);

    // Random lane selection
    const randomIndex = Math.floor(Math.random() * availableLanes.length);
    const selectedAssignment = availableLanes[randomIndex];

    // Calculate rotation for animation (5-8 full spins + position)
    const baseRotation = 360 * (5 + Math.random() * 3);
    const segmentAngle = 360 / availableLanes.length;
    const targetRotation = baseRotation + (randomIndex * segmentAngle);

    setRotation(targetRotation);

    // Wait for animation to complete
    setTimeout(async () => {
      try {
        // Save result to database
        const { data: result, error: saveError } = await supabase
          .from("lane_spin_results")
          .insert({
            member_id: memberId,
            lane_assignment_id: selectedAssignment.id,
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

        setMyResult(result);
        setSelectedLane(selectedAssignment.lane_position);
        setShowResult(true);
        setSpinning(false);

        // Remove selected lane from available lanes
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
    }, 4000); // 4 seconds spin animation
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Undi Lane - AMBC Club</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/member">
              <Button variant="outline" size="icon" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Roda Impian Lane</h1>
              <p className="text-blue-200 mt-1">Pusing roda untuk dapatkan lane anda!</p>
            </div>
          </div>

          {/* Main Content */}
          {myResult ? (
            // Show Result
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-yellow-400">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-6">
                    <Trophy className="h-16 w-16 text-white" />
                  </div>
                </div>
                <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Tahniah!
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 mt-2">
                  Lane anda telah ditentukan
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-8 mb-6">
                  <div className="text-6xl md:text-8xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent animate-pulse">
                    {selectedLane}
                  </div>
                  <p className="text-xl text-gray-700 mt-4 font-semibold">Lane Anda</p>
                </div>

                <p className="text-gray-600 mb-6">
                  Lane ini telah diperuntukkan kepada anda. Semoga berjaya dalam perlawanan!
                </p>

                <Link href="/member/lane">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    Lihat Carta Lane
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : availableLanes.length === 0 ? (
            // No lanes available
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
            // Spinning Wheel
            <div className="space-y-8">
              {/* Wheel Container */}
              <Card className="bg-white/95 backdrop-blur-sm shadow-2xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="relative flex justify-center items-center">
                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                      <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-500 drop-shadow-lg" />
                    </div>

                    {/* Wheel */}
                    <div 
                      className="relative w-80 h-80 md:w-96 md:h-96 rounded-full shadow-2xl border-8 border-yellow-400"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                        background: `conic-gradient(${availableLanes.map((_, i) => {
                          const colors = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
                          const color = colors[i % colors.length];
                          const nextColor = colors[(i + 1) % colors.length];
                          const percent1 = (i / availableLanes.length) * 100;
                          const percent2 = ((i + 1) / availableLanes.length) * 100;
                          return `${color} ${percent1}% ${percent2}%`;
                        }).join(", ")})`
                      }}
                    >
                      {/* Center Circle */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full shadow-lg flex items-center justify-center border-4 border-white">
                        <Trophy className="h-10 w-10 text-white" />
                      </div>

                      {/* Lane Labels */}
                      {availableLanes.map((lane, index) => {
                        const angle = (360 / availableLanes.length) * index;
                        const radius = 140; // Distance from center
                        const x = Math.sin((angle * Math.PI) / 180) * radius;
                        const y = -Math.cos((angle * Math.PI) / 180) * radius;

                        return (
                          <div
                            key={lane.id}
                            className="absolute top-1/2 left-1/2 font-bold text-white text-xl"
                            style={{
                              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${-rotation}deg)`,
                              textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
                            }}
                          >
                            {lane.lane_position}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spin Button */}
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={spinWheel}
                  disabled={spinning || availableLanes.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-xl px-12 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {spinning ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Memutar...
                    </>
                  ) : (
                    "PUSING RODA!"
                  )}
                </Button>

                <p className="text-white/80 mt-4 text-sm">
                  {availableLanes.length} lane masih tersedia
                </p>
              </div>

              {/* Result Animation */}
              {showResult && selectedLane && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-500">
                  <Card className="bg-white max-w-md mx-4 shadow-2xl border-4 border-yellow-400 animate-in zoom-in duration-700">
                    <CardContent className="p-8 text-center">
                      <div className="mb-6">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-24 h-24 mx-auto flex items-center justify-center animate-bounce">
                          <Trophy className="h-12 w-12 text-white" />
                        </div>
                      </div>

                      <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Lane Anda
                      </h2>

                      <div className="text-8xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6 animate-pulse">
                        {selectedLane}
                      </div>

                      <p className="text-gray-600 mb-6">
                        Tahniah! Lane ini telah diperuntukkan kepada anda.
                      </p>

                      <Button
                        onClick={() => setShowResult(false)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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