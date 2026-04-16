import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { laneService, type LaneConfigurationWithDetails, type LaneAssignmentWithMember } from "@/services/laneService";
import { gameService } from "@/services/gameService";
import { ArrowLeft, Save, Users, Loader2, GripVertical, X, Target, Calendar } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/member/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { MemberLayout } from "@/components/member/MemberLayout";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";

interface Game {
  id: string;
  game_name: string;
  game_date: string;
  game_type?: string;
}

interface Member {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export default function LanePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { withLoading } = useGlobalLoading();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGame, setActiveGame] = useState<any>(null);
  const [spinResults, setSpinResults] = useState<any[]>([]);
  
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [laneConfigs, setLaneConfigs] = useState<LaneConfigurationWithDetails[]>([]);
  const [assignments, setAssignments] = useState<LaneAssignmentWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  const [draggedMember, setDraggedMember] = useState<Member | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { member, loading: authLoading, isAuthenticated, isAdmin } = useAuth(true);
  const [downloading, setDownloading] = useState(false);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const screenshotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (router.isReady && !authLoading && isAuthenticated) {
      loadData();
    }
  }, [router.isReady, authLoading, isAuthenticated]);

  useEffect(() => {
    if (selectedGameId) {
      loadLaneAssignments();
      loadSpinResults(selectedGameId);
    }
  }, [selectedGameId]);

  async function loadData() {
    try {
      setLoading(true);
      
      const [gamesData, configsData] = await withLoading(
        "member:lane:load-data",
        async () =>
          Promise.all([
            gameService.getAllGames(),
            laneService.getLaneConfigurations(),
          ])
      );

      setGames(gamesData);
      setLaneConfigs(configsData);
      
      // Auto select latest game
      if (gamesData && gamesData.length > 0) {
        setActiveGame(gamesData[0]);
        setSelectedGameId(gamesData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSpinResults(gameId: string) {
    try {
      const { data, error } = await withLoading("member:lane:spin-results-query", async () =>
        supabase
          .from("lane_spin_results")
          .select("lane_position, member_id")
          .eq("game_id", gameId)
      );
      
      if (error) throw error;
      setSpinResults(data || []);
    } catch (error) {
      console.error("Error loading spin results:", error);
    }
  }

  // Helper to check if a lane is revealed
  const isLaneRevealed = (lanePosition: string) => {
    if (isAdmin) return true;
    return spinResults.some(r => r.lane_position === lanePosition);
  };

  async function loadLaneAssignments() {
    try {
      const data = await withLoading("member:lane:load-assignments", async () =>
        laneService.getLaneAssignments(selectedGameId)
      );
      setAssignments(data);

      if (isAdmin) {
        const registered = await withLoading("member:lane:load-registered-players", async () =>
          laneService.getRegisteredPlayersForGame(selectedGameId)
        );

        const assignedIds = new Set((data || []).map((a) => a.member_id));
        const availablePlayers = registered
          .filter((p) => !assignedIds.has(p.member_id))
          .map((p) => ({
            id: p.member_id,
            username: p.username,
            full_name: p.full_name,
            avatar_url: null,
          }));

        setMembers(availablePlayers);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Error loading assignments:", error);
    }
  }

  function normalizeLaneNumber(input: string): string {
    // Jika sudah ada "/", biarkan sahaja
    if (input.includes("/")) {
      return input.trim();
    }

    // Cuba parse sebagai nombor
    const num = parseInt(input.trim());
    if (isNaN(num) || num < 1) {
      return input.trim();
    }

    // Auto-pair: nombor ganjil dengan nombor genap selepasnya
    // 1→1/2, 2→1/2, 3→3/4, 4→3/4, 5→5/6, 6→5/6, dst
    const baseLane = num % 2 === 1 ? num : num - 1;
    return `${baseLane}/${baseLane + 1}`;
  }

  async function handleSaveConfig(configId: string) {
    if (!isAdmin) return;
    const config = laneConfigs.find(c => c.id === configId);
    if (!config) return;

    try {
      setSaving(true);
      const normalizedLane = normalizeLaneNumber(editValue);
      
      await withLoading("member:lane:save-config", async () =>
        laneService.updateLaneConfiguration(configId, config.lane_sebenar, normalizedLane, selectedGameId)
      );
      
      setLaneConfigs(prev => 
        prev.map(c => 
          c.id === configId 
            ? { ...c, lane_sebenar: normalizedLane }
            : c
        )
      );

      // Reload assignments to show players in new lane names
      await loadLaneAssignments();
      if (selectedGameId) {
        await loadSpinResults(selectedGameId);
      }

      setEditingConfig(null);
      toast({
        title: "Berjaya",
        description: "Lane dikemaskini. Kedudukan pemain dikekalkan.",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Ralat",
        description: "Gagal kemaskini lane",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(member: Member) {
    if (!isAdmin) return;
    setDraggedMember(member);
  }

  function handleDragOver(e: React.DragEvent) {
    if (!isAdmin) return;
    e.preventDefault();
  }

  async function handleDrop(e: React.DragEvent, lanePosition: string) {
    e.preventDefault();
    if (!isAdmin || !draggedMember || !selectedGameId) return;

    try {
      const game = games.find(g => g.id === selectedGameId);
      const isCouple = game?.game_type === 'COUPLE';
      
      await withLoading("member:lane:assign-member", async () => {
        if (isCouple) {
          // For COUPLE games, draggedMember.id is actually couple_id
          await laneService.assignMemberToLane(selectedGameId, draggedMember.id, lanePosition, draggedMember.id);
        } else {
          // For BLOK games, use member_id as usual
          await laneService.assignMemberToLane(selectedGameId, draggedMember.id, lanePosition);
        }
        await loadLaneAssignments();
      });
      toast({
        title: "Berjaya",
        description: `${draggedMember.username} dimasukkan ke ${lanePosition}`,
      });
    } catch (error) {
      console.error("Error assigning member:", error);
      toast({
        title: "Ralat",
        description: "Gagal menetapkan lane ahli",
        variant: "destructive",
      });
    } finally {
      setDraggedMember(null);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!isAdmin || !selectedGameId) return;

    try {
      const game = games.find(g => g.id === selectedGameId);
      const isCouple = game?.game_type === 'COUPLE';
      
      await withLoading("member:lane:remove-member", async () => {
        if (isCouple) {
          // For COUPLE games, memberId is actually couple_id
          await laneService.removeMemberFromLane(selectedGameId, memberId, memberId);
        } else {
          // For BLOK games, use member_id as usual
          await laneService.removeMemberFromLane(selectedGameId, memberId);
        }
        await loadLaneAssignments();
      });
      toast({
        title: "Dibuang",
        description: "Ahli dikeluarkan dari lane",
      });
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Ralat",
        description: "Gagal membuang ahli",
        variant: "destructive",
      });
    }
  }

  async function handleDownloadScreenshot() {
    if (!screenshotRef.current || !activeGame) return;

    try {
      setDownloading(true);
      setIsScreenshotMode(true); // Aktifkan screenshot mode untuk hide butang X

      const element = screenshotRef.current;
      
      // Calculate actual dimensions to prevent clipping
      const width = element.scrollWidth;
      const height = element.scrollHeight;

      // Add a small delay to ensure all DOM updates/renders are complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f9fafb",
        width: width,
        height: height + 40, // Add 40px buffer height to prevent bottom cut-off
        style: {
          paddingBottom: '40px', // Add padding to push content up from the bottom edge
          margin: '0',
        }
      });

      const a = document.createElement("a");
      const safeDate = new Date(activeGame.game_date).toISOString().slice(0, 10);
      a.download = `AMBC-Lane-${activeGame.game_name}-${safeDate}.png`;
      a.href = dataUrl;
      a.click();

      toast({
        title: "Berjaya",
        description: "Screenshot telah dimuat turun",
      });
    } catch (error) {
      console.error("Screenshot download error:", error);
      toast({
        title: "Ralat",
        description: "Gagal buat screenshot. Cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsScreenshotMode(false); // Matikan screenshot mode
      setDownloading(false);
    }
  }

  function getMemberAtPosition(lanePosition: string): LaneAssignmentWithMember | undefined {
    return assignments.find(a => a.lane_position === lanePosition);
  }

  function renderLaneSlot(lanePosition: string) {
    const assignment = getMemberAtPosition(lanePosition);
    
    // Check if lane is revealed
    const revealed = assignment ? isLaneRevealed(lanePosition) : false;

    return (
      <div
        className={`flex items-center px-3 py-2 min-h-[50px] transition-colors ${isAdmin ? "hover:bg-pink-50" : ""}`}
        onDragOver={isAdmin ? handleDragOver : undefined}
        onDrop={isAdmin ? (e) => handleDrop(e, lanePosition) : undefined}
      >
        <span className="text-sm font-semibold text-rose-800 w-10 shrink-0">{lanePosition} -</span>
        
        {assignment ? (
          <div className="flex items-center justify-between flex-1 min-w-0 bg-white border border-rose-200 rounded px-2 py-1 shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              {revealed ? (
                <>
                  {(assignment as any).couple ? (
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-pink-700 truncate whitespace-nowrap">
                        {(assignment as any).couple.couple_name}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate whitespace-nowrap">
                        {(assignment as any).couple.player1?.username || ''} + {(assignment as any).couple.player2?.username || ''}
                      </span>
                    </div>
                  ) : assignment.member ? (
                    <span className="text-xs font-semibold truncate whitespace-nowrap">{assignment.member.username}</span>
                  ) : (
                    <span className="text-xs font-semibold truncate whitespace-nowrap text-gray-400">Unknown</span>
                  )}
                </>
              ) : (
                <span className="text-xs font-medium text-rose-500 italic truncate whitespace-nowrap">Belum Undi</span>
              )}
            </div>
            
            {isAdmin && !isScreenshotMode && (
              <button
                onClick={() => handleRemoveMember(assignment.member_id || assignment.couple_id || '')}
                className="text-gray-400 hover:text-pink-600 p-1 shrink-0 ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 text-transparent select-none">Kosong</div>
        )}
      </div>
    );
  }

  function renderLaneSection(config: LaneConfigurationWithDetails) {
    const isEditing = editingConfig === config.id;
    const lanes = config.lane_sebenar.split("/");
    const leftLane = lanes[0] || "?";
    const rightLane = lanes[1] || "?";

    const leftPositions = [`${leftLane}A`, `${leftLane}B`, `${leftLane}C`];
    const rightPositions = [`${rightLane}A`, `${rightLane}B`, `${rightLane}C`];

    return (
      <Card key={config.id} className="overflow-hidden border border-rose-200 shadow-sm">
        {/* Header Kuning */}
        <div className="bg-[#facc15] py-3 text-center border-b border-yellow-500">
          <p className="text-xs font-semibold text-yellow-900 mb-0.5">LANE UNDIAN {config.lane_undian}</p>
          
          {isEditing && isAdmin ? (
            <div className="flex items-center justify-center gap-2 mt-1">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="cth: 5/6"
                className="w-24 h-7 text-sm bg-white"
              />
              <Button size="icon" className="h-7 w-7" onClick={() => handleSaveConfig(config.id)} disabled={saving}>
                <Save className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-yellow-500 text-yellow-900" onClick={() => setEditingConfig(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <p 
              className={`text-sm font-bold text-black ${isAdmin ? "cursor-pointer hover:opacity-70" : ""}`}
              onClick={() => {
                if(isAdmin) {
                  setEditingConfig(config.id);
                  setEditValue(config.lane_sebenar);
                }
              }}
              title={isAdmin ? "Klik untuk edit" : ""}
            >
              LANE SEBENAR {config.lane_sebenar}
            </p>
          )}
        </div>
        
        {/* Grid Slots */}
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {/* Lajur Kiri */}
            <div className="flex flex-col divide-y divide-gray-200">
              {leftPositions.map(pos => <div key={pos}>{renderLaneSlot(pos)}</div>)}
            </div>
            {/* Lajur Kanan */}
            <div className="flex flex-col divide-y divide-gray-200">
              {rightPositions.map(pos => <div key={pos}>{renderLaneSlot(pos)}</div>)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading while checking auth
  if (authLoading || loading) {
    return null;
  }

  return (
    <PageAccessGuard
      pagePath="/member/lane"
      requireAuth
      renderLoading={() => null}
    >
      <MemberLayout>
        <SEO 
          title="Lane Assignment - AMBC Club"
          description="Semak pembahagian lane anda"
        />
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 pb-20 sm:pb-8">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-pink-100 shadow-sm">
            <div className="container mx-auto px-4 py-4 max-w-6xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push("/member")}
                    className="shrink-0 border-pink-200 text-pink-600 hover:bg-pink-50 hover:text-pink-700 rounded-full"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent flex items-center gap-2">
                      <Target className="w-6 h-6 text-pink-500" />
                      Kedudukan Lane
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Semak pembahagian lane anda</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Kiri: Lane Grid */}
              <div className={`space-y-6 ${isAdmin ? "lg:col-span-3" : "lg:col-span-4 max-w-5xl mx-auto w-full"}`}>
                {/* Pemilihan Game */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center justify-between w-full gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-rose-800 flex items-center gap-2">
                        Pilih Game:
                      </h2>
                      {activeGame?.game_date ? (
                        <p className="text-xs text-rose-600 mt-0.5">
                          Tarikh Blok:{" "}
                          <span className="font-semibold text-rose-800">
                            {new Date(activeGame.game_date).toLocaleDateString("ms-MY")}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={handleDownloadScreenshot}
                      disabled={!selectedGameId || downloading}
                    >
                      {downloading ? "Sedang buat..." : "Download Screenshot"}
                    </Button>
                  </div>

                  <div className="w-full sm:w-72">
                    <Select
                      value={selectedGameId}
                      onValueChange={(val) => {
                        setSelectedGameId(val);
                        const g = games.find((x) => x.id === val) || null;
                        setActiveGame(g);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tiada Game" />
                      </SelectTrigger>
                      <SelectContent>
                        {games.map(game => (
                          <SelectItem key={game.id} value={game.id}>
                            {game.game_name} ({new Date(game.game_date).toLocaleDateString("ms-MY")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div ref={screenshotRef} className="space-y-4">
                  {activeGame?.game_date ? (
                    <div className="bg-white rounded-lg border border-rose-200 px-4 py-3 shadow-sm">
                      <p className="text-sm font-semibold text-rose-800">
                        Tarikh Blok:{" "}
                        <span className="font-bold text-pink-600">
                          {new Date(activeGame.game_date).toLocaleDateString("ms-MY")}
                        </span>
                      </p>
                    </div>
                  ) : null}

                  {selectedGameId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      {laneConfigs.map(config => renderLaneSection(config))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-rose-500 bg-white rounded-lg border border-dashed">
                      Sila pilih game untuk melihat lane
                    </div>
                  )}
                </div>
              </div>

              {/* Kanan: Drag & Drop List (ADMIN SAHAJA) */}
              {isAdmin && (
                <div className="lg:col-span-1">
                  <Card className="sticky top-24 shadow-sm border-rose-200">
                    <div className="bg-pink-600 text-white p-3 rounded-t-lg">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" /> Senarai Ahli
                      </h3>
                      <p className="text-[10px] text-pink-100 mt-1">Drag (Tarik) nama ahli ke dalam kotak Lane di sebelah</p>
                    </div>
                    <CardContent className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                      <div className="space-y-1.5">
                        {members.map(m => (
                          <div
                            key={m.id}
                            draggable
                            onDragStart={() => handleDragStart(m)}
                            className="flex items-center gap-2 p-2 bg-white rounded border border-rose-200 hover:border-red-400 hover:shadow cursor-move transition-all group"
                          >
                            <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-red-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate whitespace-nowrap leading-tight">{m.username}</p>
                              <p className="text-[10px] text-rose-500 truncate whitespace-nowrap">{m.full_name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          </div>
        </div>
      </MemberLayout>
    </PageAccessGuard>
  );
}