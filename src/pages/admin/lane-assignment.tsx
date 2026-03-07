import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { useToast } from "@/hooks/use-toast";
import { laneService, type LaneConfigurationWithDetails, type LaneAssignmentWithMember } from "@/services/laneService";
import { gameService } from "@/services/gameService";
import { ArrowLeft, Save, Users, Loader2, GripVertical } from "lucide-react";
import Link from "next/link";

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

export default function LaneAssignmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [laneConfigs, setLaneConfigs] = useState<LaneConfigurationWithDetails[]>([]);
  const [assignments, setAssignments] = useState<LaneAssignmentWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [draggedMember, setDraggedMember] = useState<Member | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadLaneAssignments();
    }
  }, [selectedGameId]);

  async function checkAdminAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { data: member } = await supabase
        .from("members")
        .select("is_admin")
        .eq("user_id", session.user.id)
        .single();

      if (!member?.is_admin) {
        router.push("/admin/login");
        return;
      }

      await loadData();
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/admin/login");
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
      toast({
        title: "Error",
        description: "Failed to load lane assignments",
        variant: "destructive",
      });
    }
  }

  async function handleSaveConfig(configId: string) {
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
        title: "Success",
        description: "Lane configuration updated",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Error",
        description: "Failed to update lane configuration",
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
      await laneService.assignMemberToLane(selectedGameId, draggedMember.id, lanePosition);
      await loadLaneAssignments();
      
      toast({
        title: "Success",
        description: `${draggedMember.username} assigned to ${lanePosition}`,
      });
    } catch (error) {
      console.error("Error assigning member:", error);
      toast({
        title: "Error",
        description: "Failed to assign member to lane",
        variant: "destructive",
      });
    } finally {
      setDraggedMember(null);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!selectedGameId) return;

    try {
      await laneService.removeMemberFromLane(selectedGameId, memberId);
      await loadLaneAssignments();
      
      toast({
        title: "Success",
        description: "Member removed from lane",
      });
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member",
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
        className="border-2 border-dashed border-gray-300 rounded p-2 min-h-[60px] hover:border-red-400 hover:bg-red-50 transition-colors"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, lanePosition)}
      >
        {assignment ? (
          <div className="flex items-center gap-2 bg-white rounded p-2 shadow-sm">
            {assignment.member.avatar_url ? (
              <Image
                src={assignment.member.avatar_url}
                alt={assignment.member.username}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                {assignment.member.username[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{assignment.member.username}</p>
            </div>
            <button
              onClick={() => handleRemoveMember(assignment.member_id)}
              className="text-red-600 hover:text-red-800 text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            {lanePosition}
          </div>
        )}
      </div>
    );
  }

  function renderLaneSection(config: LaneConfigurationWithDetails, positions: string[]) {
    const isEditing = editingConfig === config.id;

    return (
      <Card key={config.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">LANE UNDIAN {config.lane_undian}</p>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g., 5/6"
                    className="w-32"
                  />
                  <Button size="sm" onClick={() => handleSaveConfig(config.id)} disabled={saving}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingConfig(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <CardTitle 
                  className="text-lg cursor-pointer hover:text-red-600"
                  onClick={() => {
                    setEditingConfig(config.id);
                    setEditValue(config.lane_sebenar);
                  }}
                >
                  LANE SEBENAR {config.lane_sebenar}
                </CardTitle>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {positions.map(pos => (
              <div key={pos}>
                {renderLaneSlot(pos)}
              </div>
            ))}
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
        title="Lane Assignment - AMBC Club Admin"
        description="Manage lane assignments for games"
      />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <ClubLogo size="sm" />
                <div>
                  <h1 className="text-2xl font-bold text-red-600">Lane Assignment</h1>
                  <p className="text-sm text-gray-600">Drag & drop members to lanes</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Side - Lane Table */}
            <div className="lg:col-span-3">
              {/* Game Selection */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Select Game</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a game" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map(game => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.game_name} - {new Date(game.game_date).toLocaleDateString("ms-MY")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedGameId && (
                <>
                  {/* Lane Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {laneConfigs.slice(0, 2).map(config => 
                      renderLaneSection(config, [
                        `${config.lane_sebenar.split("/")[0]}A`,
                        `${config.lane_sebenar.split("/")[1]}A`,
                        `${config.lane_sebenar.split("/")[0]}B`,
                        `${config.lane_sebenar.split("/")[1]}B`,
                        `${config.lane_sebenar.split("/")[0]}C`,
                        `${config.lane_sebenar.split("/")[1]}C`,
                      ])
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {laneConfigs.slice(2, 4).map(config => 
                      renderLaneSection(config, [
                        `${config.lane_sebenar.split("/")[0]}A`,
                        `${config.lane_sebenar.split("/")[1]}A`,
                        `${config.lane_sebenar.split("/")[0]}B`,
                        `${config.lane_sebenar.split("/")[1]}B`,
                        `${config.lane_sebenar.split("/")[0]}C`,
                        `${config.lane_sebenar.split("/")[1]}C`,
                      ])
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {laneConfigs.slice(4, 6).map(config => 
                      renderLaneSection(config, [
                        `${config.lane_sebenar.split("/")[0]}A`,
                        `${config.lane_sebenar.split("/")[1]}A`,
                        `${config.lane_sebenar.split("/")[0]}B`,
                        `${config.lane_sebenar.split("/")[1]}B`,
                        `${config.lane_sebenar.split("/")[0]}C`,
                        `${config.lane_sebenar.split("/")[1]}C`,
                      ])
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {laneConfigs.slice(6, 8).map(config => 
                      renderLaneSection(config, [
                        `${config.lane_sebenar.split("/")[0]}A`,
                        `${config.lane_sebenar.split("/")[1]}A`,
                        `${config.lane_sebenar.split("/")[0]}B`,
                        `${config.lane_sebenar.split("/")[1]}B`,
                        `${config.lane_sebenar.split("/")[0]}C`,
                        `${config.lane_sebenar.split("/")[1]}C`,
                      ])
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Side - Member List */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Members
                  </CardTitle>
                  <p className="text-sm text-gray-600">Drag to assign</p>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  <div className="space-y-2">
                    {members.map(member => (
                      <div
                        key={member.id}
                        draggable
                        onDragStart={() => handleDragStart(member)}
                        className="flex items-center gap-2 p-2 bg-white rounded border-2 border-gray-200 hover:border-red-400 hover:shadow-md cursor-move transition-all"
                      >
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        {member.avatar_url ? (
                          <Image
                            src={member.avatar_url}
                            alt={member.username}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                            {member.username[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.username}</p>
                          <p className="text-xs text-gray-500 truncate">{member.full_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}