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
import { ArrowLeft, Save, Users, Loader2, GripVertical, X } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/member/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { BowlingBallLoaderOverlay } from "@/components/BowlingBallLoader";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";

interface Game {
  id: string;
  game_name: string;
  game_date: string;
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
  const isLaneRevealed = (lanePosition: string, memberId: string) => {
    if (isAdmin) return true;
    return spinResults.some(r => r.lane_position === lanePosition && r.member_id === memberId);
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

  async function handleSaveConfig(configId: string) {
    if (!isAdmin) return;
    try {
      setSaving(true);
      await withLoading("member:lane:save-config", async () =>
        laneService.updateLaneConfiguration(configId, editValue)
      );
      
      setLaneConfigs(prev => 
        prev.map(config => 
          config.id === configId 
            ? { ...config, lane_sebenar: editValue }
            : config
        )
      );

      setEditingConfig(null);
      toast({
        title: "Berjaya",
        description: "Lane sebenar telah dikemaskini",
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
      await withLoading("member:lane:assign-member", async () => {
        await laneService.assignMemberToLane(selectedGameId, draggedMember.id, lanePosition);
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
      await withLoading("member:lane:remove-member", async () => {
        await laneService.removeMemberFromLane(selectedGameId, memberId);
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
      setDownloading(false);
    }
  }

  function getMemberAtPosition(lanePosition: string): LaneAssignmentWithMember | undefined {
    return assignments.find(a => a.lane_position === lanePosition);
  }

  function renderLaneSlot(lanePosition: string) {
    const assignment = getMemberAtPosition(lanePosition);
    
    // Check if lane is revealed
    const revealed = assignment ? isLaneRevealed(lanePosition, assignment.member_id) : false;

    return (
      <div
        className={`flex items-center px-3 py-2 min-h-[50px] transition-colors ${isAdmin ? "hover:bg-red-50" : ""}`}
        onDragOver={isAdmin ? handleDragOver : undefined}
        onDrop={isAdmin ? (e) => handleDrop(e, lanePosition) : undefined}
      >
        <span className="text-sm font-semibold text-gray-800 w-10 shrink-0">{lanePosition} -</span>
        
        {assignment ? (
          <div className="flex items-center justify-between flex-1 min-w-0 bg-white border border-gray-200 rounded px-2 py-1 shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              {revealed ? (
                <span className="text-xs font-semibold truncate whitespace-nowrap">{assignment.member.username}</span>
              ) : (
                <span className="text-xs font-medium text-gray-500 italic truncate whitespace-nowrap">Belum Undi</span>
              )}
            </div>
            
            {isAdmin && (
              <button
                onClick={() => handleRemoveMember(assignment.member_id)}
                className="text-gray-400 hover:text-red-600 p-1 shrink-0 ml-1"
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
      <Card key={config.id} className="overflow-hidden border border-gray-200 shadow-sm">
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
    <PageAccessGuard pagePath="/member/lane" requireAuth={true}>
      <>
        <SEO 
          title="Lane Assignment - AMBC Club"
          description="Kedudukan Lane Ahli"
        />
        <div className="min-h-screen bg-gray-50 pb-20">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-4">
                <MobileNav />
                <Link href="/member">
                  <Button variant="ghost" size="icon" className="hidden sm:flex">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-red-600">Kedudukan Lane</h1>
                  <p className="text-xs text-gray-600">
                    {isAdmin ? "Admin: Drag & Drop Ahli" : "Lihat kedudukan lane terkini"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Kiri: Lane Grid */}
              <div className={`space-y-6 ${isAdmin ? "lg:col-span-3" : "lg:col-span-4 max-w-5xl mx-auto w-full"}`}>
                {/* Pemilihan Game */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center justify-between w-full gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                        Pilih Game:
                      </h2>
                      {activeGame?.game_date ? (
                        <p className="text-xs text-gray-600 mt-0.5">
                          Tarikh Blok:{" "}
                          <span className="font-semibold text-gray-800">
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
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
                      <p className="text-sm font-semibold text-gray-800">
                        Tarikh Blok:{" "}
                        <span className="font-bold text-red-600">
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
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                      Sila pilih game untuk melihat lane
                    </div>
                  )}
                </div>
              </div>

              {/* Kanan: Drag & Drop List (ADMIN SAHAJA) */}
              {isAdmin && (
                <div className="lg:col-span-1">
                  <Card className="sticky top-24 shadow-sm border-gray-200">
                    <div className="bg-red-600 text-white p-3 rounded-t-lg">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" /> Senarai Ahli
                      </h3>
                      <p className="text-[10px] text-red-100 mt-1">Drag (Tarik) nama ahli ke dalam kotak Lane di sebelah</p>
                    </div>
                    <CardContent className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                      <div className="space-y-1.5">
                        {members.map(m => (
                          <div
                            key={m.id}
                            draggable
                            onDragStart={() => handleDragStart(m)}
                            className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-red-400 hover:shadow cursor-move transition-all group"
                          >
                            <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-red-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate whitespace-nowrap leading-tight">{m.username}</p>
                              <p className="text-[10px] text-gray-500 truncate whitespace-nowrap">{m.full_name}</p>
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
      </>
    </PageAccessGuard>
  );
}