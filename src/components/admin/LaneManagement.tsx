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
import { Save, Users, GripVertical, X, RotateCcw, Shuffle, MessageCircle, User } from "lucide-react";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";

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

interface CoupleData {
  id: string;           // couple_id
  username: string;     // couple_name
  full_name: string;    // player1_username + player2_username
  avatar_url: null;
}

const LANES = [
  { id: "1/2", label: "Lane 1/2", laneNumber: 1 },
  { id: "3/4", label: "Lane 3/4", laneNumber: 3 },
  { id: "5/6", label: "Lane 5/6", laneNumber: 5 },
  { id: "7/8", label: "Lane 7/8", laneNumber: 7 },
  { id: "9/10", label: "Lane 9/10", laneNumber: 9 },
  { id: "11/12", label: "Lane 11/12", laneNumber: 11 },
  { id: "13/14", label: "Lane 13/14", laneNumber: 13 },
  { id: "15/16", label: "Lane 15/16", laneNumber: 15 },
  { id: "17/18", label: "Lane 17/18", laneNumber: 17 },
  { id: "19/20", label: "Lane 19/20", laneNumber: 19 },
];

export function LaneManagement() {
  const { toast } = useToast();
  const { withLoading } = useGlobalLoading();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [spinResults, setSpinResults] = useState<Array<{ id: string; lane_position: string; member_id: string }>>([]);
  const [hiddenLanes, setHiddenLanes] = useState<Set<string>>(new Set());
  
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [laneConfigs, setLaneConfigs] = useState<LaneConfigurationWithDetails[]>([]);
  const [assignments, setAssignments] = useState<LaneAssignmentWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [laneAssignments, setLaneAssignments] = useState<{ [key: string]: Member[] }>({});
  
  const [draggedMember, setDraggedMember] = useState<Member | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [downloading, setDownloading] = useState(false);
  const screenshotRef = useRef<HTMLDivElement | null>(null);

  // Helper function to format lane display
  function formatLaneDisplay(lanePosition: number | null | undefined): string {
    if (!lanePosition) return "?/?";
    
    // Convert single number to lane pair (1 or 2 → 1/2, 3 or 4 → 3/4, etc.)
    const isEven = lanePosition % 2 === 0;
    const laneStart = isEven ? lanePosition - 1 : lanePosition;
    return `${laneStart}/${laneStart + 1}`;
  }

  // Helper function to parse lane input (1, 2 → 1, 3, 4 → 3, etc.)
  function parseLaneInput(input: string): number | null {
    const num = parseInt(input, 10);
    if (isNaN(num) || num < 1 || num > 20) return null;
    
    // Return the odd number of the pair (1 or 2 → 1, 3 or 4 → 3, etc.)
    return num % 2 === 0 ? num - 1 : num;
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadLaneAssignments(selectedGameId);
      loadSpinResults(selectedGameId);
    }
  }, [selectedGameId]);

  async function loadData() {
    try {
      setLoading(true);
      
      const [gamesData, configsData, hiddenLanesData] = await withLoading(
        "admin:lane:load-data",
        async () =>
          Promise.all([
            gameService.getAllGames(),
            laneService.getLaneConfigurations(),
            laneService.getHiddenLaneUndian(),
          ])
      );

      setGames(gamesData);
      setLaneConfigs(configsData);
      setHiddenLanes(new Set(hiddenLanesData));
      
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

  const isLaneRevealed = (lanePosition: string) => {
    return spinResults.some(r => r.lane_position === lanePosition);
  };

  const loadUnassignedPlayers = async (gameId: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      const isCouple = game?.game_type === 'COUPLE';
      
      console.log('[DEBUG] loadUnassignedPlayers:', {
        gameId,
        gameName: game?.game_name,
        gameType: game?.game_type,
        isCouple
      });

      if (isCouple) {
        // Ambil senarai couple dari couple_scores untuk game ini
        const client: any = supabase;
        const response = await client
          .from('couple_scores')
          .select(`
            couple_id,
            couple:couples(
              id,
              couple_name,
              player1:members!couples_player1_id_fkey(username),
              player2:members!couples_player2_id_fkey(username)
            )
          `)
          .eq('game_id', gameId);
          
        const coupleScores = response.data;
        const error = response.error;

        if (error) throw error;

        // Ambil senarai lane_assignments untuk game ini untuk periksa couple mana dah assign
        const { data: assignments } = await supabase
          .from('lane_assignments')
          .select('couple_id')
          .eq('game_id', gameId)
          .not('couple_id', 'is', null);
        
        const assignedCoupleIds = new Set(assignments?.map(a => a.couple_id) || []);

        const unassignedCouples: CoupleData[] = [];

        for (const cs of coupleScores || []) {
          const couple = cs.couple as any;
          if (!couple) continue;

          if (!assignedCoupleIds.has(couple.id)) {
            unassignedCouples.push({
              id: couple.id,
              username: couple.couple_name,
              full_name: `${couple.player1?.username || ''} + ${couple.player2?.username || ''}`,
              avatar_url: null
            });
          }
        }

        console.log('[DEBUG] Unassigned couples:', unassignedCouples.length);
        setMembers(unassignedCouples as Member[]);
      } else {
        // BLOK/individu - fetch only players selected by admin in GameManagement
        const client: any = supabase;
        const [gamePlayersData, assignmentsData] = await Promise.all([
          client
            .from("game_players")
            .select(`
              member_id,
              members!game_players_member_id_fkey(
                id,
                username,
                full_name,
                avatar_url
              )
            `)
            .eq("game_id", gameId)
            .order("members(username)"),
          client
            .from("lane_assignments")
            .select("member_id")
            .eq("game_id", gameId)
            .not('member_id', 'is', null)
        ]);

        if (gamePlayersData.error) throw gamePlayersData.error;

        const assignedIds = new Set(assignmentsData.data?.map((a: any) => a.member_id) || []);
        
        // Extract member data from game_players and filter out assigned ones
        const unassignedMembers = (gamePlayersData.data || [])
          .map((gp: any) => gp.members)
          .filter((m: any) => m && !assignedIds.has(m.id));
        
        console.log('[DEBUG] Game players (selected by admin):', gamePlayersData.data?.length || 0);
        console.log('[DEBUG] Already assigned to lanes:', assignedIds.size);
        console.log('[DEBUG] Unassigned members:', unassignedMembers.length);
        setMembers(unassignedMembers as Member[]);
      }
    } catch (error) {
      console.error("Error loading unassigned players:", error);
    }
  };

  const loadLaneAssignments = async (gameId: string) => {
    try {
      setLoading(true);
      const laneAssignmentsData = await laneService.getLaneAssignments(gameId);
      
      // Data sudah lengkap dari query dengan couple info, terus set sahaja
      setAssignments(laneAssignmentsData);

      // Load senarai unassigned bila assignment ditukar
      loadUnassignedPlayers(gameId);
    } catch (error) {
      console.error("Error loading lane assignments:", error);
      toast({
        title: "Error",
        description: "Gagal memuat turun data lorong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  async function handleSaveConfig(configId: string) {
    const config = laneConfigs.find(c => c.id === configId);
    if (!config) return;

    try {
      setSaving(true);
      
      // Smart auto-format for lane input
      let formattedValue = editValue.trim();
      
      // If no "/" format detected, auto-pair the number
      if (!formattedValue.includes('/')) {
        const num = parseInt(formattedValue);
        if (!isNaN(num)) {
          // If odd number (1,3,5...), pair with next (1/2, 3/4, 5/6)
          // If even number (2,4,6...), pair with previous (1/2, 3/4, 5/6)
          const leftLane = num % 2 === 1 ? num : num - 1;
          const rightLane = leftLane + 1;
          formattedValue = `${leftLane}/${rightLane}`;
          
          toast({
            title: "Auto-Format",
            description: `"${editValue}" → "${formattedValue}"`,
            duration: 2000,
          });
        }
      }
      
      await withLoading("admin:lane:save-config", async () =>
        laneService.updateLaneConfiguration(configId, config.lane_sebenar, formattedValue, selectedGameId)
      );
      
      setLaneConfigs(prev => 
        prev.map(c => 
          c.id === configId 
            ? { ...c, lane_sebenar: formattedValue }
            : c
        )
      );

      // Reload assignments to show players in new lane names
      await loadLaneAssignments(selectedGameId);
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
      const game = games.find(g => g.id === selectedGameId);
      const isCouple = game?.game_type === 'COUPLE';
      
      await withLoading("admin:lane:assign-member", async () => {
        if (isCouple) {
          // For COUPLE games, draggedMember.id is actually couple_id
          await laneService.assignMemberToLane(selectedGameId, draggedMember.id, lanePosition, draggedMember.id);
        } else {
          // For BLOK games, use member_id as usual
          await laneService.assignMemberToLane(selectedGameId, draggedMember.id, lanePosition);
        }
        await loadLaneAssignments(selectedGameId);
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
      const game = games.find(g => g.id === selectedGameId);
      const isCouple = game?.game_type === 'COUPLE';
      
      await withLoading("admin:lane:remove-member", async () => {
        if (isCouple) {
          // For COUPLE games, memberId is actually couple_id
          await laneService.removeMemberFromLane(selectedGameId, memberId, memberId);
        } else {
          // For BLOK games, use member_id as usual
          await laneService.removeMemberFromLane(selectedGameId, memberId);
        }
        await loadLaneAssignments(selectedGameId);
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

  async function handleResetSpin(lanePosition: string) {
    if (!selectedGameId) return;
    
    if (!confirm("Adakah anda pasti mahu set semula (reset) undian untuk lane ini? Mereka perlu memutar roda undian semula.")) return;

    try {
      await withLoading("admin:lane:reset-spin", async () => {
        const { error } = await supabase
          .from("lane_spin_results")
          .delete()
          .eq("game_id", selectedGameId)
          .eq("lane_position", lanePosition);
          
        if (error) throw error;
        
        await loadSpinResults(selectedGameId);
      });
      
      toast({
        title: "Berjaya",
        description: "Status undian lane telah di reset",
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

  async function handleAutoRandomAssign() {
    if (!selectedGameId || members.length === 0) {
      toast({
        title: "Tiada Ahli",
        description: "Tiada ahli dalam senarai yang belum disusun.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Anda pasti mahu menyusun secara automatik (rawak) ${members.length} ahli ke dalam lane yang masih kosong?`)) return;

    try {
      const game = games.find(g => g.id === selectedGameId);
      const isCouple = game?.game_type === 'COUPLE';
      
      await withLoading("admin:lane:auto-assign", async () => {
        // Find all empty slots
        const emptySlots: string[] = [];
        laneConfigs.forEach(config => {
          const { leftLane, rightLane } = getSlotLaneLabels(config);
          const positions = [
            `${leftLane}A`, `${leftLane}B`, `${leftLane}C`,
            `${rightLane}A`, `${rightLane}B`, `${rightLane}C`
          ];
          
          positions.forEach(pos => {
            if (!assignments.some(a => a.lane_position === pos)) {
              emptySlots.push(pos);
            }
          });
        });

        if (emptySlots.length < members.length) {
          toast({
            title: "Slot Tidak Mencukupi",
            description: `Terdapat ${members.length} ahli tetapi hanya ${emptySlots.length} slot lane kosong! Sila tambah konfigurasi lane.`,
            variant: "destructive",
          });
          return;
        }

        // Shuffle empty slots to be fully random
        const shuffledSlots = [...emptySlots].sort(() => Math.random() - 0.5);
        // Shuffle members to be fully random
        const shuffledMembers = [...members].sort(() => Math.random() - 0.5);

        // Assign each member to a random empty slot
        const promises = shuffledMembers.map((member, i) => {
          const slot = shuffledSlots[i];
          if (isCouple) {
            // For COUPLE games, member.id is couple_id
            return laneService.assignMemberToLane(selectedGameId, member.id, slot, member.id);
          } else {
            // For BLOK games, member.id is member_id
            return laneService.assignMemberToLane(selectedGameId, member.id, slot);
          }
        });

        // Execute all inserts
        await Promise.all(promises);

        // Reload the UI
        await loadLaneAssignments(selectedGameId);
      });

      toast({
        title: "Berjaya!",
        description: `Telah berjaya menyusun rawak ${members.length} ahli ke dalam lane.`,
      });
    } catch (error) {
      console.error("Error auto assigning:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyusun lane automatik",
        variant: "destructive",
      });
    }
  }

  async function handleResetMemberList() {
    if (!selectedGameId) return;

    if (assignments.length === 0) {
      toast({
        title: "Info",
        description: "Tiada ahli yang telah disusun untuk game ini.",
      });
      return;
    }

    const game = games.find((g) => g.id === selectedGameId);
    const label = game?.game_type === "COUPLE" ? "pasangan" : "ahli";

    if (!confirm(`Buang semua ${label} yang telah disusun dari lane dan kembalikan ke senarai asal?`)) {
      return;
    }

    try {
      const totalAssignments = assignments.length;

      await withLoading("admin:lane:reset-member-list", async () => {
        await laneService.resetAssignmentsForGame(selectedGameId);
        await loadLaneAssignments(selectedGameId);
      });

      toast({
        title: "Berjaya",
        description: `${totalAssignments} ${label} telah dikembalikan ke senarai belum susun.`,
      });
    } catch (error) {
      console.error("Error resetting member list:", error);
      toast({
        title: "Ralat",
        description: "Gagal reset senarai ahli",
        variant: "destructive",
      });
    }
  }

  function handleShareReminder() {
    if (!activeGame) return;
    
    // Filter assignments that haven't spun yet
    const unspunAssignments = assignments.filter(a => !isLaneRevealed(a.lane_position));
    
    if (unspunAssignments.length === 0) {
      toast({
        title: "Semua Telah Undi!",
        description: "Semua pemain yang ditugaskan telah selesai membuat undian.",
      });
      return;
    }

    const isCouple = activeGame.game_type === 'COUPLE';
    const typeLabel = isCouple ? 'Couple' : 'Pemain';
    
    let message = `🎳 *PERINGATAN UNDIAN LANE AMBC* 🎳\n\n`;
    message += `Game: *${activeGame.game_name}*\n`;
    message += `Tarikh: *${new Date(activeGame.game_date).toLocaleDateString("ms-MY")}*\n\n`;
    
    message += `Terdapat *${unspunAssignments.length} ${typeLabel}* yang masih belum membuat undian lane.\n\n`;
    
    message += `*Senarai Belum Undi:*\n`;
    unspunAssignments.forEach((a, index) => {
      if (isCouple && (a as any).couple) {
        const couple = (a as any).couple;
        message += `${index + 1}. ${couple.couple_name} (${couple.player1?.username || ''} & ${couple.player2?.username || ''})\n`;
      } else if (a.member) {
        message += `${index + 1}. ${a.member.username}\n`;
      } else {
        message += `${index + 1}. Unknown\n`;
      }
    });
    
    message += `\n🎰 *Sila buat undian segera sebelum game bermula!*\n`;
    
    const siteUrl = window.location.origin;
    message += `👉 Klik sini untuk undi: ${siteUrl}/member/undi-lane\n\n`;
    message += `Terima kasih! 🙏`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
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

  function getSlotLaneLabels(config: LaneConfigurationWithDetails) {
    const laneSource = config.lane_sebenar.trim() === "?/?" ? config.lane_undian : config.lane_sebenar;
    const lanes = laneSource.split("/");
    const leftLane = lanes[0] || "?";
    const rightLane = lanes[1] || "?";

    return { leftLane, rightLane };
  }

  function renderLaneSlot(lanePosition: string) {
    const assignment = getMemberAtPosition(lanePosition);
    const revealed = assignment ? isLaneRevealed(lanePosition) : false;
    
    // For set as spun, we need a valid member_id (not couple_id) to avoid foreign key errors
    const validMemberId = assignment?.member_id || (assignment as any)?.couple?.player1_id || '';

    return (
      <div
        className="flex items-center px-3 py-2 min-h-[55px] transition-colors hover:bg-red-50 border-b border-gray-100 last:border-0"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, lanePosition)}
      >
        <span className="text-sm font-semibold text-gray-800 w-10 shrink-0">{lanePosition} -</span>
        
        {assignment ? (
          <div className="flex items-center justify-between flex-1 min-w-0 bg-white border border-gray-200 rounded px-2 py-1.5 shadow-sm group">
            <div className="flex flex-col min-w-0">
              {(assignment as any).couple ? (
                <>
                  <span className="text-sm font-semibold text-pink-700 truncate">
                    {(assignment as any).couple.couple_name}
                  </span>
                  <span className="text-[10px] text-gray-500 truncate">
                    {(assignment as any).couple.player1?.username || ''} + {(assignment as any).couple.player2?.username || ''}
                  </span>
                </>
              ) : assignment.member ? (
                <span className="text-sm font-semibold truncate">{assignment.member.username}</span>
              ) : (
                <span className="text-sm font-semibold truncate text-gray-400">Unknown</span>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <span
                className={revealed ? "h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" : "h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0"}
                title={revealed ? "Telah Undi" : "Belum Undi"}
              />
              
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                {/* Change Voting Status */}
                {revealed ? (
                  <button
                    onClick={() => handleResetSpin(lanePosition)}
                    className="text-gray-400 hover:text-orange-600 p-1"
                    title="Reset Undian (Boleh undi semula)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSetAsSpun(lanePosition, validMemberId)}
                    className="text-gray-400 hover:text-green-600 p-1"
                    title="Tandakan Telah Undi (Skip pusingan roda)"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </button>
                )}
                
                <button
                  onClick={() => handleRemoveMember(assignment.member_id || assignment.couple_id || '')}
                  className="text-gray-400 hover:text-red-600 p-1"
                  title="Keluarkan dari lane"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
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
    const { leftLane, rightLane } = getSlotLaneLabels(config);

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

  async function resetToSpinResults() {
    if (!selectedGameId) {
      toast({
        title: "Ralat",
        description: "Sila pilih game terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    if (!confirm("Reset semua lane sebenar kepada ?/? ? Admin perlu set semula lane sebenar secara manual selepas ini.")) {
      return;
    }

    const configsToReset = laneConfigs.filter((config) => config.lane_sebenar !== "?/?");

    if (configsToReset.length === 0) {
      toast({
        title: "Info",
        description: "Semua lane sebenar sudah berada pada ?/?",
      });
      return;
    }

    try {
      setLoading(true);

      await withLoading("admin:lane:reset-actual-lanes", async () => {
        await Promise.all(
          configsToReset.map((config) =>
            laneService.updateLaneConfiguration(config.id, config.lane_sebenar, "?/?", selectedGameId)
          )
        );
      });

      setLaneConfigs((prev) =>
        prev.map((config) => ({
          ...config,
          lane_sebenar: "?/?",
        }))
      );

      await loadLaneAssignments(selectedGameId);
      await loadSpinResults(selectedGameId);

      toast({
        title: "Berjaya",
        description: "Semua lane sebenar telah direset kepada ?/?",
      });
    } catch (error) {
      console.error("Error resetting lanes:", error);
      toast({
        title: "Ralat",
        description: "Gagal reset lane sebenar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function toggleLaneVisibility(laneId: string) {
    const previousHiddenLanes = new Set(hiddenLanes);
    const nextHiddenLanes = new Set(hiddenLanes);

    if (nextHiddenLanes.has(laneId)) {
      nextHiddenLanes.delete(laneId);
    } else {
      nextHiddenLanes.add(laneId);
    }

    setHiddenLanes(nextHiddenLanes);

    try {
      await withLoading("admin:lane:save-hidden-lanes", async () =>
        laneService.saveHiddenLaneUndian(Array.from(nextHiddenLanes))
      );
    } catch (error) {
      console.error("Error saving hidden lanes:", error);
      setHiddenLanes(previousHiddenLanes);
      toast({
        title: "Ralat",
        description: "Gagal simpan tetapan paparan lane",
        variant: "destructive",
      });
    }
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
                  value={selectedGameId || ""}
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

              {selectedGameId && (
                <div className="flex flex-col gap-4 mt-4">
                  {/* Reset Button */}
                  <Button
                    onClick={resetToSpinResults}
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Semua Lane Sebenar
                  </Button>

                  {/* Lane Visibility Toggles */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3 text-sm">Papar/Sembunyikan Lane</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {LANES.map((lane) => (
                        <div key={lane.id} className="flex items-center gap-2">
                          <Switch
                            checked={!hiddenLanes.has(lane.id)}
                            onCheckedChange={() => toggleLaneVisibility(lane.id)}
                            id={`toggle-${lane.id}`}
                          />
                          <label htmlFor={`toggle-${lane.id}`} className="text-sm cursor-pointer">
                            {lane.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full sm:w-auto flex flex-wrap justify-end gap-2 mt-3 sm:mt-0">
                <Button
                  variant="outline"
                  onClick={handleResetMemberList}
                  disabled={!selectedGameId || assignments.length === 0}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Senarai Ahli
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAutoRandomAssign}
                  disabled={!selectedGameId || members.length === 0}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Auto Random
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShareReminder}
                  disabled={!selectedGameId || assignments.length === 0}
                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Share Reminder
                </Button>
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
                  <div className="bg-gray-100 px-3 py-2 rounded-md inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" title="Telah Undi" />
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" title="Belum Undi" />
                  </div>
                </div>
              </div>
            )}

            {selectedGameId ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-6">
                {laneConfigs
                  .filter((config) => !hiddenLanes.has(config.lane_undian))
                  .map((config) => renderLaneSection(config))}
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {m.avatar_url ? (
                              <Avatar className="h-8 w-8">
                                <img src={m.avatar_url} alt={m.username} />
                              </Avatar>
                            ) : (
                              <User className="h-8 w-8 text-muted-foreground" />
                            )}
                            <div>
                              <div className="font-medium text-sm">{m.username}</div>
                              <div className="text-xs text-muted-foreground">{m.full_name}</div>
                            </div>
                          </div>
                        </div>
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