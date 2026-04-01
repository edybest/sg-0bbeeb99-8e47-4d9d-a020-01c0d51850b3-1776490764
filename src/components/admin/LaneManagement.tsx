import { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { laneService, type LaneConfigurationWithDetails, type LaneAssignmentWithMember } from "@/services/laneService";
import { gameService } from "@/services/gameService";
import { Save, Users, GripVertical, X, RotateCcw } from "lucide-react";
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

export function LaneManagement() {
  const { toast } = useToast();
  const { withLoading } = useGlobalLoading();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [spinResults, setSpinResults] = useState<any[]>([]);
  
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [laneConfigs, setLaneConfigs] = useState<LaneConfigurationWithDetails[]>([]);
  const [assignments, setAssignments] = useState<LaneAssignmentWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  const [draggedMember, setDraggedMember] = useState<Member | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [downloading, setDownloading] = useState(false);
  const screenshotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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
        "admin:lane:load-data",
        async () =>
          Promise.all([
            gameService.getAllGames(),
            laneService.getLaneConfigurations(),
          ])
      );

      setGames(gamesData);
      setLaneConfigs(configsData);
      
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
      const { data, error } = await supabase
        .from("lane_spin_results")
        .select("id, lane_position, member_id")
        .eq("game_id", gameId);
      
      if (error) throw error;
      setSpinResults(data || []);
    } catch (error) {
      console.error("Error loading spin results:", error);
    }
  }

  const isLaneRevealed = (lanePosition: string, memberId: string) => {
    return spinResults.some(r => r.lane_position === lanePosition && r.member_id === memberId);
  };

  async function loadLaneAssignments() {
    try {
      const data = await withLoading("admin:lane:load-assignments", async () =>
        laneService.getLaneAssignments(selectedGameId)
      );
      setAssignments(data || []);

      const registered = await withLoading("admin:lane:load-registered-players", async () =>
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
    } catch (error) {
      console.error("Error loading assignments:", error);
    }
  }

  async function handleSaveConfig(configId: string) {
    const config = laneConfigs.find(c => c.id === configId);
    if (!config) return;

    try {
      setSaving(true);
      await withLoading("admin:lane:save-config", async () =>
        laneService.updateLaneConfiguration(configId, config.lane_sebenar, editValue, selectedGameId)
      );
      
      setLaneConfigs(prev => 
        prev.map(c => 
          c.id === configId 
            ? { ...c, lane_sebenar: editValue }
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
    setDraggedMember(member);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(e: React.DragEvent, lanePosition: string) {
    e.preventDefault();
    if (!draggedMember || !selectedGameId) return;

    try {
      await withLoading("admin:lane:assign-member", async () => {
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
    if (!selectedGameId) return;

    try {
      await withLoading("admin:lane:remove-member", async () => {
        await laneService.removeMemberFromLane(selectedGameId, memberId);
        await loadLaneAssignments();
        await loadSpinResults(selectedGameId); // Refresh spins just in case
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

  async function handleResetSpin(memberId: string) {
    if (!selectedGameId) return;
    
    if (!confirm("Adakah anda pasti mahu set semula (reset) undian ahli ini? Mereka perlu memutar roda undian semula.")) return;

    try {
      await withLoading("admin:lane:reset-spin", async () => {
        const { error } = await supabase
          .from("lane_spin_results")
          .delete()
          .eq("game_id", selectedGameId)
          .eq("member_id", memberId);
          
        if (error) throw error;
        
        await loadSpinResults(selectedGameId);
      });
      
      toast({
        title: "Berjaya",
        description: "Status undian ahli telah di reset",
      });
    } catch (error) {
      console.error("Error resetting spin:", error);
      toast({
        title: "Ralat",
        description: "Gagal reset undian",
        variant: "destructive",
      });
    }
  }

  async function handleSetAsSpun(lanePosition: string, memberId: string) {
    if (!selectedGameId) return;
    
    try {
      await withLoading("admin:lane:set-spun", async () => {
        const { error } = await supabase
          .from("lane_spin_results")
          .insert({
            game_id: selectedGameId,
            member_id: memberId,
            lane_position: lanePosition
          });
          
        if (error) throw error;
        
        await loadSpinResults(selectedGameId);
      });
      
      toast({
        title: "Berjaya",
        description: "Ahli ditandakan sebagai telah mengundi",
      });
    } catch (error) {
      console.error("Error setting as spun:", error);
      toast({
        title: "Ralat",
        description: "Gagal menetapkan status",
        variant: "destructive",
      });
    }
  }

  async function handleDownloadScreenshot() {
    if (!screenshotRef.current || !activeGame) return;

    try {
      setDownloading(true);
      const element = screenshotRef.current;
      const width = element.scrollWidth;
      const height = element.scrollHeight;

      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: width,
        height: height + 40,
        style: {
          paddingBottom: '40px',
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
    const revealed = assignment ? isLaneRevealed(lanePosition, assignment.member_id) : false;

    return (
      <div
        className="flex items-center px-3 py-2 min-h-[55px] transition-colors hover:bg-red-50 border-b border-gray-100 last:border-0"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, lanePosition)}
      >
        <span className="text-sm font-semibold text-gray-800 w-10 shrink-0">{lanePosition} -</span>
        
        {assignment ? (
          <div className="flex items-center justify-between flex-1 min-w-0 bg-white border border-gray-200 rounded px-2 py-1.5 shadow-sm group">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <span className="text-sm font-semibold truncate whitespace-nowrap">{assignment.member.username}</span>
              
              {/* Status Indicator */}
              {revealed ? (
                <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold shrink-0">Telah Undi</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold shrink-0">Belum Undi</span>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Change Voting Status */}
              {revealed ? (
                <button
                  onClick={() => handleResetSpin(assignment.member_id)}
                  className="text-gray-400 hover:text-orange-600 p-1"
                  title="Reset Undian (Boleh undi semula)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => handleSetAsSpun(lanePosition, assignment.member_id)}
                  className="text-gray-400 hover:text-green-600 p-1"
                  title="Tandakan Telah Undi (Skip pusingan roda)"
                >
                  <Save className="h-3.5 w-3.5" />
                </button>
              )}
              
              <button
                onClick={() => handleRemoveMember(assignment.member_id)}
                className="text-gray-400 hover:text-red-600 p-1"
                title="Keluarkan dari lane"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 text-transparent select-none text-sm">Kosong (Tarik nama ke sini)</div>
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
        <div className="bg-[#facc15] py-3 text-center border-b border-yellow-500">
          <p className="text-xs font-semibold text-yellow-900 mb-0.5">LANE UNDIAN {config.lane_undian}</p>
          
          {isEditing ? (
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
              className="text-sm font-bold text-black cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => {
                setEditingConfig(config.id);
                setEditValue(config.lane_sebenar);
              }}
              title="Klik untuk edit lane sebenar"
            >
              LANE SEBENAR {config.lane_sebenar}
            </p>
          )}
        </div>
        
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            <div className="flex flex-col">
              {leftPositions.map(pos => <div key={pos}>{renderLaneSlot(pos)}</div>)}
            </div>
            <div className="flex flex-col">
              {rightPositions.map(pos => <div key={pos}>{renderLaneSlot(pos)}</div>)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && games.length === 0) {
    return <div className="p-8 text-center text-gray-500">Memuatkan data lane...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pengurusan Lane & Undian</h2>
          <p className="text-sm text-gray-500">Urus kedudukan pemain dan status undian roda (Spin)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Lane Area */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-1/2">
                <label className="text-sm font-medium mb-1.5 block">Pilih Game</label>
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

              <div className="w-full sm:w-auto flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleDownloadScreenshot}
                  disabled={!selectedGameId || downloading}
                >
                  {downloading ? "Menyimpan..." : "Muat Turun Screenshot"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div ref={screenshotRef} className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            {activeGame?.game_date && (
              <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{activeGame.game_name}</h3>
                  <p className="text-sm text-gray-500">
                    Tarikh Blok: <span className="font-semibold text-red-600">{new Date(activeGame.game_date).toLocaleDateString("ms-MY")}</span>
                  </p>
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-xs bg-gray-100 px-3 py-1.5 rounded-md inline-block font-medium text-gray-600">
                    Status Undian Roda (Spin):<br/>
                    <span className="text-green-600 mr-2">• Telah Undi</span>
                    <span className="text-orange-600">• Belum Undi</span>
                  </div>
                </div>
              </div>
            )}

            {selectedGameId ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-6">
                {laneConfigs.map(config => renderLaneSection(config))}
              </div>
            ) : (
               <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                Sila pilih game untuk menguruskan lane
              </div>
            )}
          </div>
        </div>

        {/* Drag & Drop Player List */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 shadow-sm border-gray-200 flex flex-col h-[calc(100vh-100px)]">
            <div className="bg-red-600 text-white p-3 rounded-t-lg shrink-0">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" /> Senarai Ahli (Belum Susun)
              </h3>
              <p className="text-[10px] text-red-100 mt-1">
                Tarik nama ahli ke kotak Lane di sebelah
              </p>
            </div>
            
            <CardContent className="p-3 flex-1 overflow-y-auto bg-gray-50/50">
              {members.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">
                  Semua ahli berdaftar telah disusun dalam lane.
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map(m => (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={() => handleDragStart(m)}
                      className="flex items-center gap-3 p-2.5 bg-white rounded-md border border-gray-200 hover:border-red-400 hover:shadow-md cursor-move transition-all group"
                    >
                      <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-gray-800 leading-tight">{m.username}</p>
                        <p className="text-[10px] text-gray-500 truncate">{m.full_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}