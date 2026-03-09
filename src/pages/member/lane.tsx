import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { useToast } from "@/hooks/use-toast";
import { laneService, type LaneConfigurationWithDetails, type LaneAssignmentWithMember } from "@/services/laneService";
import { gameService } from "@/services/gameService";
import { ArrowLeft, Save, Users, Loader2, GripVertical, X } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/member/MobileNav";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [laneConfigs, setLaneConfigs] = useState<LaneConfigurationWithDetails[]>([]);
  const [assignments, setAssignments] = useState<LaneAssignmentWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  const [draggedMember, setDraggedMember] = useState<Member | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadLaneAssignments();
    }
  }, [selectedGameId]);

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
        .select("is_admin")
        .eq("user_id", session.user.id)
        .single();

      if (memberError) {
        console.error("Member lookup error:", memberError);
        toast({
          title: "Error",
          description: "Failed to load member data. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!member) {
        console.error("No member found for user");
        router.push("/login");
        return;
      }

      if (member?.is_admin) {
        setIsAdmin(true);
      }

      await loadData();
    } catch (error) {
      console.error("Auth check error:", error);
      toast({
        title: "Error",
        description: "Authentication error. Please login again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadData() {
    try {
      const [gamesData, configsData, membersData] = await Promise.all([
        gameService.getAllGames(),
        laneService.getLaneConfigurations(),
        laneService.getAllMembers(),
      ]);

      setGames(gamesData);
      setLaneConfigs(configsData);
      setMembers(membersData);
      
      // Auto select latest game
      if (gamesData.length > 0) {
        setSelectedGameId(gamesData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }
  }

  async function loadLaneAssignments() {
    try {
      const data = await laneService.getLaneAssignments(selectedGameId);
      setAssignments(data);
    } catch (error) {
      console.error("Error loading assignments:", error);
    }
  }

  async function handleSaveConfig(configId: string) {
    if (!isAdmin) return;
    try {
      setSaving(true);
      await laneService.updateLaneConfiguration(configId, editValue);
      
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
      await laneService.assignMemberToLane(selectedGameId, draggedMember.id, lanePosition);
      await loadLaneAssignments();
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
      await laneService.removeMemberFromLane(selectedGameId, memberId);
      await loadLaneAssignments();
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

  function getMemberAtPosition(lanePosition: string): LaneAssignmentWithMember | undefined {
    return assignments.find(a => a.lane_position === lanePosition);
  }

  function renderLaneSlot(lanePosition: string) {
    const assignment = getMemberAtPosition(lanePosition);

    return (
      <div
        className={`flex items-center px-3 py-2 min-h-[50px] transition-colors ${isAdmin ? "hover:bg-red-50" : ""}`}
        onDragOver={isAdmin ? handleDragOver : undefined}
        onDrop={isAdmin ? (e) => handleDrop(e, lanePosition) : undefined}
      >
        <span className="text-sm font-semibold text-gray-800 w-10 shrink-0">{lanePosition} -</span>
        
        {assignment ? (
          <div className="flex items-center justify-between flex-1 min-w-0 bg-white border border-gray-200 rounded px-2 py-1 shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              {assignment.member.avatar_url ? (
                <Image
                  src={assignment.member.avatar_url}
                  alt={assignment.member.username}
                  width={24}
                  height={24}
                  className="rounded-full shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {assignment.member.username[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium truncate">{assignment.member.username}</span>
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

    // Susunan seperti dalam gambar
    // Kiri: A, B, C | Kanan: A, B, C
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-red-600" />
      </div>
    );
  }

  return (
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
              <ClubLogo size="sm" />
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
            
            {/* Kiri: Lane Grid (Ambil 3 column atau full bergantung role) */}
            <div className={`space-y-6 ${isAdmin ? "lg:col-span-3" : "lg:col-span-4 max-w-5xl mx-auto w-full"}`}>
              {/* Pemilihan Game */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  Pilih Game:
                </h2>
                <div className="w-full sm:w-72">
                  <Select value={selectedGameId} onValueChange={setSelectedGameId}>
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

              {selectedGameId ? (
                <>
                  {/* Lane Layouts - Tiru Gambar Tepat-Tepat */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    {laneConfigs.map(config => renderLaneSection(config))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                  Sila pilih game untuk melihat lane
                </div>
              )}
            </div>

            {/* Kanan: Drag & Drop List (HANYA UNTUK ADMIN) */}
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
                      {members.map(member => (
                        <div
                          key={member.id}
                          draggable
                          onDragStart={() => handleDragStart(member)}
                          className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-red-400 hover:shadow cursor-move transition-all group"
                        >
                          <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-red-400" />
                          {member.avatar_url ? (
                            <Image
                              src={member.avatar_url}
                              alt={member.username}
                              width={28}
                              height={28}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                              {member.username[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">{member.username}</p>
                            <p className="text-[10px] text-gray-500 truncate">{member.full_name}</p>
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
  );
}