import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Edit, Calendar, Users, Target, ChevronLeft, ChevronRight, Trophy, Printer, Sparkles, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { gameService } from "@/services/gameService";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";

type Game = Database["public"]["Tables"]["games"]["Row"] & {
  player_count?: number;
  five_five_count?: number;
  clean_game_count?: number;
  players?: any[];
  men_vs_women_enabled?: boolean;
  women_handicap?: number;
};

interface DoubleRecord {
  id: string;
  game_id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  total_score: number;
  include_handicap: boolean;
  player1_handicap?: number;
  player2_handicap?: number;
  player1?: {
    id: string;
    username: string;
    full_name: string;
  };
  player2?: {
    id: string;
    username: string;
    full_name: string;
  };
}

interface TrioRecord {
  id: string;
  game_id: string;
  player1_id: string;
  player2_id: string;
  player3_id: string;
  player1_score: number;
  player2_score: number;
  player3_score: number;
  total_score: number;
  include_handicap: boolean;
  player1_handicap?: number;
  player2_handicap?: number;
  player3_handicap?: number;
  player1?: {
    id: string;
    username: string;
    full_name: string;
  };
  player2?: {
    id: string;
    username: string;
    full_name: string;
  };
  player3?: {
    id: string;
    username: string;
    full_name: string;
  };
}

const ITEMS_PER_PAGE = 5;

const OPENING_MESSAGES = [
"Tahniah [WINNER] menjadi champion blok mingguan AMBC.\nTerima kasih juga kepada semua yang sertai blok minggu ini. Anda semua terbaik!!",
"Syabas [WINNER] kerana menjuarai blok minggu ini!\nKepada semua peserta, terima kasih atas penyertaan yang hebat!",
"Alhamdulillah! Selamat kepada [WINNER] yang menjadi juara blok kali ini.\nAppreciate semua yang join. Keep up the good work!",
"Gempak! [WINNER] berjaya mencipta sejarah sebagai juara blok minggu ini!\nKudos kepada semua pemain. Anda semua rockstar!"];


const CLOSING_MESSAGES = [
"Jumpa lagi di blok akan datang.",
"See you next blok! Semoga lebih ramai join!",
"Blok seterusnya tunggu anda semua ya!",
"Sampai jumpa lagi dalam blok akan datang. Good luck!"];


export function GameManagement() {
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Create/Edit Game Dialog
  const [isGameDialogOpen, setIsGameDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameForm, setGameForm] = useState({
    game_name: "",
    game_date: "",
    game_type: "BLOK"
  });

  // Double Game States
  const [isDoubleDialogOpen, setIsDoubleDialogOpen] = useState(false);
  const [selectedGameForDouble, setSelectedGameForDouble] = useState<Game | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [doubleRecords, setDoubleRecords] = useState<Record<string, DoubleRecord[]>>({});
  const [loadingDoubles, setLoadingDoubles] = useState<Record<string, boolean>>({});
  const [availableMembers, setAvailableMembers] = useState<Array<{id: string;username: string;full_name: string;}>>([]);
  const [doubleForm, setDoubleForm] = useState({
    player1_id: "",
    player2_id: "",
    include_handicap: true
  });

  // Men vs Women Exclusion states
  const [isMenVsWomenExclusionDialogOpen, setIsMenVsWomenExclusionDialogOpen] = useState(false);
  const [menVsWomenPlayers, setMenVsWomenPlayers] = useState<any[]>([]);
  const [loadingMenVsWomenPlayers, setLoadingMenVsWomenPlayers] = useState(false);
  const [selectedGameForMenVsWomen, setSelectedGameForMenVsWomen] = useState<string | null>(null);

  // Delete Game Dialog
  const [deleteGameDialog, setDeleteGameDialog] = useState<{open: boolean;game: Game | null;}>({
    open: false,
    game: null
  });

  // Delete Player Dialog
  const [deletePlayerDialog, setDeletePlayerDialog] = useState<{
    open: boolean;
    playerId: string | null;
    playerName: string;
    gameId: string | null;
  }>({
    open: false,
    playerId: null,
    playerName: "",
    gameId: null
  });

  const [loadingMembers, setLoadingMembers] = useState(false);

  // WhatsApp Share states
  const [showWhatsAppShare, setShowWhatsAppShare] = useState(false);
  const [selectedGameForShare, setSelectedGameForShare] = useState<Game | null>(null);
  const [selectedOpeningMessage, setSelectedOpeningMessage] = useState(0);
  const [selectedClosingMessage, setSelectedClosingMessage] = useState(0);
  const [sharePreview, setSharePreview] = useState("");
  const [loadingTopPlayers, setLoadingTopPlayers] = useState(false);
  const [topPlayers, setTopPlayers] = useState<Array<{rank: number;username: string;overall_score: number;}>>([]);

  // Add Player states
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [selectedGameForPlayer, setSelectedGameForPlayer] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [newPlayerFiveFive, setNewPlayerFiveFive] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const data = await gameService.listGamesWithPlayers();

      // Sort players alphabetically A-Z for each game
      const formattedGames = (data as any[]).map((game) => ({
        ...game,
        players: game.players?.sort((a: any, b: any) => {
          const nameA = (a.username || a.full_name || "").toLowerCase();
          const nameB = (b.username || b.full_name || "").toLowerCase();
          return nameA.localeCompare(nameB, 'ms-MY');
        }) || []
      }));

      setGames(formattedGames);
    } catch (error) {
      console.error("Error loading games:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan senarai permainan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableMembers = async (gameId: string) => {
    try {
      setLoadingMembers(true);
      const data = await gameService.getAvailableMembersForGame(gameId);

      // Sort available members alphabetically A-Z
      const sortedMembers = (data || []).sort((a: any, b: any) => {
        const nameA = (a.username || a.full_name || "").toLowerCase();
        const nameB = (b.username || b.full_name || "").toLowerCase();
        return nameA.localeCompare(nameB, 'ms-MY');
      });

      setAvailableMembers(sortedMembers);
    } catch (error) {
      console.error("Error loading available members:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan senarai ahli",
        variant: "destructive"
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateGame = () => {
    setEditingGame(null);
    setGameForm({
      game_name: "",
      game_date: new Date().toISOString().split("T")[0],
      game_type: "BLOK"
    });
    setIsGameDialogOpen(true);
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setGameForm({
      game_name: game.game_name,
      game_date: game.game_date,
      game_type: game.game_type as "BLOK" | "BLOK_SUKA_SUKI" | "COUPLE" || "BLOK"
    });
    setIsGameDialogOpen(true);
  };

  const handleSaveGame = async () => {
    try {
      if (!gameForm.game_name.trim()) {
        toast({
          title: "Ralat",
          description: "Sila masukkan nama permainan",
          variant: "destructive"
        });
        return;
      }

      if (editingGame) {
        await gameService.updateGame(editingGame.id, gameForm);
        toast({
          title: "Berjaya",
          description: "Permainan telah dikemaskini"
        });
      } else {
        await gameService.createGame(gameForm);
        toast({
          title: "Berjaya",
          description: "Permainan baharu telah dicipta"
        });
      }

      setIsGameDialogOpen(false);
      loadGames();
    } catch (error) {
      console.error("Error saving game:", error);
      toast({
        title: "Ralat",
        description: editingGame ? "Gagal mengemaskini permainan" : "Gagal mencipta permainan",
        variant: "destructive"
      });
    }
  };

  const handleOpenWhatsAppShare = async (game: Game) => {
    setSelectedGameForShare(game);
    setShowWhatsAppShare(true);
    setLoadingTopPlayers(true);

    try {
      const { data: players, error } = await supabase.
      from("game_players").
      select(`
          id,
          member:members(id, username, full_name),
          game1_score,
          game2_score,
          game3_score,
          game4_score,
          game5_score,
          total_score,
          handicap
        `).
      eq("game_id", game.id);

      if (error) throw error;

      const leaderboard = (players || []).map((p: any) => ({
        username: p.member.username || p.member.full_name || "Unknown",
        overall_score: (p.total_score || 0) + (p.handicap || 0)
      })).
      sort((a, b) => b.overall_score - a.overall_score).
      slice(0, 3).
      map((p, idx) => ({
        rank: idx + 1,
        username: p.username,
        overall_score: p.overall_score
      }));

      setTopPlayers(leaderboard);
      generatePreview(leaderboard, selectedOpeningMessage, selectedClosingMessage);
    } catch (error) {
      console.error("Error loading top players:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan senarai pemain teratas",
        variant: "destructive"
      });
    } finally {
      setLoadingTopPlayers(false);
    }
  };

  const generatePreview = (players: typeof topPlayers, openingIdx: number, closingIdx: number) => {
    if (players.length === 0) {
      setSharePreview("Tiada pemain dijumpai untuk permainan ini.");
      return;
    }

    const winner = players[0]?.username || "N/A";
    const openingMsg = OPENING_MESSAGES[openingIdx].replace("[WINNER]", winner);
    const closingMsg = CLOSING_MESSAGES[closingIdx];

    const medals = ["🥇", "🥈", "🥉"];
    const top3Lines = players.map((p, idx) => `${medals[idx]}${p.username}`).join("\n");

    const message = `${openingMsg}

TOP 3

${top3Lines}

Latest score
➡️https://ambc.club/member/blok

Latest 5/5
➡️https://ambc.club/member/five-five

${closingMsg}`;

    setSharePreview(message);
  };

  const handleShareToWhatsApp = () => {
    const encoded = encodeURIComponent(sharePreview);
    const whatsappUrl = `https://wa.me/?text=${encoded}`;
    window.open(whatsappUrl, "_blank");
    setShowWhatsAppShare(false);
    toast({
      title: "WhatsApp dibuka",
      description: "Sila pilih penerima dan hantar mesej"
    });
  };

  const handleDeleteGame = async () => {
    if (!deleteGameDialog.game) return;

    try {
      await gameService.deleteGame(deleteGameDialog.game.id);
      toast({
        title: "Berjaya Dipadam",
        description: `Permainan "${deleteGameDialog.game.game_name}" telah dipadam.`
      });
      setDeleteGameDialog({ open: false, game: null });
      loadGames();
    } catch (error: any) {
      console.error("Error deleting game:", error);
      toast({
        title: "Ralat",
        description: error.message || "Gagal memadam permainan.",
        variant: "destructive"
      });
    }
  };

  const handleToggleFiveFive = async (playerId: string, currentStatus: boolean) => {
    try {
      await gameService.updatePlayerFiveFiveStatus(playerId, !currentStatus);
      toast({
        title: "Berjaya",
        description: `Status Five-Five telah ${!currentStatus ? "diaktifkan" : "dinyahaktifkan"}`
      });
      loadGames();
    } catch (error) {
      console.error("Error updating Five-Five status:", error);
      toast({
        title: "Ralat",
        description: "Gagal mengemaskini status Five-Five",
        variant: "destructive"
      });
    }
  };

  const handleToggleCleanGame = async (playerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.
      from("game_players").
      update({ clean_game: !currentStatus }).
      eq("id", playerId);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: `Status Clean Game telah ${!currentStatus ? "diaktifkan" : "dinyahaktifkan"}`
      });
      loadGames();
    } catch (error) {
      console.error("Error updating Clean Game status:", error);
      toast({
        title: "Ralat",
        description: "Gagal mengemaskini status Clean Game",
        variant: "destructive"
      });
    }
  };

  const handleDeletePlayer = async () => {
    if (!deletePlayerDialog.playerId) return;

    try {
      await gameService.deletePlayerFromGameById(deletePlayerDialog.playerId);
      toast({
        title: "Berjaya",
        description: `${deletePlayerDialog.playerName} telah dibuang dari permainan`
      });
      setDeletePlayerDialog({
        open: false,
        playerId: null,
        playerName: "",
        gameId: null
      });
      loadGames();
    } catch (error) {
      console.error("Error deleting player:", error);
      toast({
        title: "Ralat",
        description: "Gagal membuang pemain",
        variant: "destructive"
      });
    }
  };

  const handleOpenAddPlayer = async (gameId: string) => {
    setSelectedGameForPlayer(gameId);
    setSelectedMemberIds([]);
    setNewPlayerFiveFive(false);
    setShowAddPlayer(true);
    await loadAvailableMembers(gameId);
  };

  const handleAddPlayer = async () => {
    if (!selectedGameForPlayer || selectedMemberIds.length === 0) {
      toast({
        title: "Ralat",
        description: "Sila pilih sekurang-kurangnya seorang ahli",
        variant: "destructive"
      });
      return;
    }

    try {
      const players = selectedMemberIds.map((memberId) => ({
        member_id: memberId,
        is_fivefive: newPlayerFiveFive
      }));

      const result = await gameService.addPlayersToGameWithFiveFive(
        selectedGameForPlayer,
        players
      );

      toast({
        title: "Berjaya",
        description: result?.message || "Pemain telah ditambah ke permainan"
      });

      setShowAddPlayer(false);
      setSelectedGameForPlayer(null);
      setSelectedMemberIds([]);
      setNewPlayerFiveFive(false);
      loadGames();
    } catch (error) {
      console.error("Error adding players:", error);
      toast({
        title: "Ralat",
        description: "Gagal menambah pemain",
        variant: "destructive"
      });
    }
  };

  const handlePrintScoresheet = (game: Game) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Ralat",
        description: "Sila benarkan 'pop-ups' untuk mencetak",
        variant: "destructive"
      });
      return;
    }

    const players = game.players || [];
    const half = Math.ceil(players.length / 2);
    const leftPlayers = players.slice(0, half);
    const rightPlayers = players.slice(half);

    const generateTableRows = (playerList: any[], startIndex: number) => {
      return playerList.map((p, i) => `
        <tr>
          <td style="text-align: center;">${startIndex + i + 1}</td>
          <td>${p.username || p.full_name || 'Unknown'}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `).join('');
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Borang - ${game.game_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { margin-bottom: 5px; font-size: 22px; text-transform: uppercase; font-weight: normal; }
          .date { margin-bottom: 20px; font-size: 14px; color: #333; }
          .container { display: flex; gap: 40px; align-items: flex-start; }
          table { border-collapse: collapse; width: 100%; font-size: 13px; }
          th, td { border: 1px solid #000; padding: 8px; }
          th { background-color: #fde047 !important; text-align: center; font-weight: bold; }
          .col-num { width: 25px; }
          .col-name { width: auto; text-align: left; }
          .col-box { width: 40px; }
          td { height: 22px; }
          @media print {
            body { padding: 0; }
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        <h1>AMBC ${game.game_type === 'COUPLE' ? 'COUPLE' : game.game_type.replace('_', ' ')}</h1>
        <div class="date">Date: ${game.game_date}</div>
        <div class="container">
          <div style="flex: 1;">
            <table>
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th class="col-name">Name</th>
                  <th class="col-box">Game</th>
                  <th class="col-box">CG</th>
                  <th class="col-box">5/5</th>
                </tr>
              </thead>
              <tbody>
                ${players.length > 0 ? generateTableRows(leftPlayers, 0) : '<tr><td colspan="5" style="text-align: center;">Tiada pemain didaftarkan</td></tr>'}
              </tbody>
            </table>
          </div>
          ${rightPlayers.length > 0 ? `
          <div style="flex: 1;">
            <table>
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th class="col-name">Name</th>
                  <th class="col-box">Game</th>
                  <th class="col-box">CG</th>
                  <th class="col-box">5/5</th>
                </tr>
              </thead>
              <tbody>
                ${generateTableRows(rightPlayers, half)}
              </tbody>
            </table>
          </div>
          ` : `
          <div style="flex: 1;"></div>
          `}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Double Game Functions
  const loadAvailableMembersForDouble = async (gameId: string) => {
    try {
      // Fetch players who are playing in this specific game
      const { data: gamePlayers, error } = await supabase.
      from("game_players").
      select(`
          member_id,
          members (
            id,
            username,
            full_name
          )
        `).
      eq("game_id", gameId);

      if (error) throw error;

      // Extract and sort members
      const players = (gamePlayers || []).
      map((gp: any) => ({
        id: gp.members.id,
        username: gp.members.username,
        full_name: gp.members.full_name
      })).
      sort((a: any, b: any) => {
        const nameA = (a.username || a.full_name || "").toLowerCase();
        const nameB = (b.username || b.full_name || "").toLowerCase();
        return nameA.localeCompare(nameB, 'ms-MY');
      });

      setAvailableMembers(players);
    } catch (error) {
      console.error("Error loading players for double:", error);
      setAvailableMembers([]);
    }
  };

  const fetchDoubleRecords = async (gameId: string) => {
    try {
      setLoadingDoubles((prev) => ({ ...prev, [gameId]: true }));

      const { data, error } = await (supabase as any).
      from("double_records").
      select(`
          *,
          player1:members!double_records_player1_id_fkey(id, username, full_name),
          player2:members!double_records_player2_id_fkey(id, username, full_name)
        `).
      eq("game_id", gameId).
      order("total_score", { ascending: false });

      if (error) throw error;

      setDoubleRecords((prev) => ({
        ...prev,
        [gameId]: data || []
      }));
    } catch (error) {
      console.error("Error fetching double records:", error);
    } finally {
      setLoadingDoubles((prev) => ({ ...prev, [gameId]: false }));
    }
  };

  const toggleGameDouble = async (gameId: string, currentValue: boolean) => {
    console.log("🔄 Toggling double game:", { gameId, currentValue, newValue: !currentValue });

    try {
      // Check if user is admin first
      const { data: { user } } = await supabase.auth.getUser();
      console.log("👤 Current user:", user?.id);

      const { data: member } = await supabase.
      from("members").
      select("id, username, is_admin").
      eq("user_id", user?.id).
      single();

      console.log("👤 Member data:", member);

      if (!member?.is_admin) {
        toast({
          title: "Akses Ditolak",
          description: "Hanya admin boleh mengubah tetapan ini",
          variant: "destructive"
        });
        return;
      }

      console.log("⚙️ Updating game double_enabled...");
      const { data, error } = await supabase.
      from("games").
      update({ double_enabled: !currentValue }).
      eq("id", gameId).
      select();

      console.log("✅ Update result:", { data, error });

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      toast({
        title: "Berjaya",
        description: `Double game ${!currentValue ? "diaktifkan" : "dinyahaktifkan"}`
      });

      console.log("🔄 Reloading games...");
      await loadGames();
      console.log("✅ Games reloaded!");
    } catch (error) {
      console.error("❌ Error toggling double:", error);
      toast({
        title: "Ralat",
        description: `Gagal mengemaskini: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    }
  };

  const toggleGameTrio = async (gameId: string, currentValue: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from("members")
        .select("id, username, is_admin")
        .eq("user_id", user?.id)
        .single();
      
      if (!member?.is_admin) {
        toast({
          title: "Akses Ditolak",
          description: "Hanya admin boleh mengubah tetapan ini",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from("games")
        .update({ trio_enabled: !currentValue })
        .eq("id", gameId);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: `Trio game ${!currentValue ? "diaktifkan" : "dinyahaktifkan"}`
      });

      await loadGames();
    } catch (error) {
      console.error("Error toggling trio:", error);
      toast({
        title: "Ralat",
        description: "Gagal mengemaskini tetapan trio",
        variant: "destructive"
      });
    }
  };

  const toggleMenVsWomen = async (gameId: string, currentValue: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.
      from("members").
      select("is_admin").
      eq("user_id", user?.id).
      single();
      
      if (!member?.is_admin) {
        toast({ title: "Akses Ditolak", description: "Hanya admin boleh mengubah", variant: "destructive" });
        return;
      }

      const { error } = await supabase.
      from("games").
      update({ men_vs_women_enabled: !currentValue }).
      eq("id", gameId);

      if (error) throw error;
      toast({ title: "Berjaya", description: `Men vs Women ${!currentValue ? "diaktifkan" : "dinyahaktifkan"}` });
      await loadGames();
    } catch (error) {
      toast({ title: "Ralat", description: "Gagal mengemaskini", variant: "destructive" });
    }
  };

  const updateWomenHandicap = async (gameId: string, handicap: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from("members")
        .select("is_admin")
        .eq("user_id", user?.id)
        .single();
      
      if (!member?.is_admin) return;

      const { error } = await supabase
        .from("games")
        .update({ women_handicap: handicap })
        .eq("id", gameId);

      if (error) throw error;
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, women_handicap: handicap } : g));
    } catch (error) {
      console.error("Error updating women handicap:", error);
    }
  };

  const openMenVsWomenExclusionDialog = async (gameId: string) => {
    setSelectedGameForMenVsWomen(gameId);
    setIsMenVsWomenExclusionDialogOpen(true);
    setLoadingMenVsWomenPlayers(true);

    try {
      const { data: gamePlayers, error } = await supabase
        .from("game_players")
        .select(`
          id,
          member_id,
          exclude_from_men_vs_women,
          members (
            id,
            username,
            full_name,
            sex
          )
        `)
        .eq("game_id", gameId);

      if (error) throw error;

      const sorted = (gamePlayers || []).sort((a: any, b: any) => {
        const nameA = (a.members?.username || "").toLowerCase();
        const nameB = (b.members?.username || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setMenVsWomenPlayers(sorted);
    } catch (error) {
      console.error("Error loading players:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan senarai pemain",
        variant: "destructive",
      });
    } finally {
      setLoadingMenVsWomenPlayers(false);
    }
  };

  const togglePlayerExclusion = async (gamePlayerId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("game_players")
        .update({ exclude_from_men_vs_women: !currentValue })
        .eq("id", gamePlayerId);

      if (error) throw error;

      setMenVsWomenPlayers(prev => prev.map(p => 
        p.id === gamePlayerId 
          ? { ...p, exclude_from_men_vs_women: !currentValue }
          : p
      ));

      toast({
        title: "Berjaya",
        description: `Pemain ${!currentValue ? "dikecualikan" : "dimasukkan semula"}`,
      });
    } catch (error) {
      console.error("Error toggling player exclusion:", error);
      toast({
        title: "Ralat",
        description: "Gagal mengemaskini",
        variant: "destructive",
      });
    }
  };

  const fetchTrioRecords = async (gameId: string) => {
    try {
      setLoadingTrios((prev) => ({ ...prev, [gameId]: true }));

      const { data, error } = await (supabase as any)
        .from("trio_records")
        .select(`
          *,
          player1:members!trio_records_player1_id_fkey(id, username, full_name),
          player2:members!trio_records_player2_id_fkey(id, username, full_name),
          player3:members!trio_records_player3_id_fkey(id, username, full_name)
        `)
        .eq("game_id", gameId)
        .order("total_score", { ascending: false });

      if (error) throw error;

      setTrioRecords((prev) => ({
        ...prev,
        [gameId]: data || []
      }));
    } catch (error) {
      console.error("Error fetching trio records:", error);
    } finally {
      setLoadingTrios((prev) => ({ ...prev, [gameId]: false }));
    }
  };

  const handleAddDouble = async () => {
    if (!selectedGameForDouble || !doubleForm.player1_id || !doubleForm.player2_id) {
      toast({
        title: "Ralat",
        description: "Sila pilih kedua-dua pemain",
        variant: "destructive"
      });
      return;
    }

    if (doubleForm.player1_id === doubleForm.player2_id) {
      toast({
        title: "Ralat",
        description: "Sila pilih pemain yang berbeza",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: gamePlayers, error: fetchError } = await supabase
        .from("game_players")
        .select("member_id, total_score, handicap")
        .eq("game_id", selectedGameForDouble.id)
        .in("member_id", [doubleForm.player1_id, doubleForm.player2_id]);

      if (fetchError) throw fetchError;

      const player1 = gamePlayers?.find((p) => p.member_id === doubleForm.player1_id);
      const player2 = gamePlayers?.find((p) => p.member_id === doubleForm.player2_id);

      const player1BaseScore = player1?.total_score || 0;
      const player2BaseScore = player2?.total_score || 0;
      const player1Handicap = player1?.handicap || 0;
      const player2Handicap = player2?.handicap || 0;

      const player1Total = player1BaseScore + (doubleForm.include_handicap ? player1Handicap : 0);
      const player2Total = player2BaseScore + (doubleForm.include_handicap ? player2Handicap : 0);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      const { error } = await supabase.from("double_records").insert([{
        game_id: selectedGameForDouble.id,
        player1_id: doubleForm.player1_id,
        player2_id: doubleForm.player2_id,
        player1_score: player1BaseScore,
        player2_score: player2BaseScore,
        player1_handicap: player1Handicap,
        player2_handicap: player2Handicap,
        include_handicap: doubleForm.include_handicap,
        created_by: member?.id
      }]);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: `Rekod double telah ditambah (${doubleForm.include_handicap ? "termasuk" : "tanpa"} handicap)`
      });

      setIsDoubleDialogOpen(false);
      setDoubleForm({ player1_id: "", player2_id: "", include_handicap: true });
      fetchDoubleRecords(selectedGameForDouble.id);
    } catch (error) {
      console.error("Error adding double:", error);
      toast({
        title: "Ralat",
        description: "Gagal menambah rekod double",
        variant: "destructive"
      });
    }
  };

  const handleAddTrio = async () => {
    if (!selectedGameForTrio || !trioForm.player1_id || !trioForm.player2_id || !trioForm.player3_id) {
      toast({
        title: "Ralat",
        description: "Sila pilih ketiga-tiga pemain",
        variant: "destructive"
      });
      return;
    }

    if (
      trioForm.player1_id === trioForm.player2_id ||
      trioForm.player1_id === trioForm.player3_id ||
      trioForm.player2_id === trioForm.player3_id
    ) {
      toast({
        title: "Ralat",
        description: "Sila pilih 3 pemain yang berbeza",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: gamePlayers, error: fetchError } = await supabase
        .from("game_players")
        .select("member_id, total_score, handicap")
        .eq("game_id", selectedGameForTrio.id)
        .in("member_id", [trioForm.player1_id, trioForm.player2_id, trioForm.player3_id]);

      if (fetchError) throw fetchError;

      const player1 = gamePlayers?.find((p) => p.member_id === trioForm.player1_id);
      const player2 = gamePlayers?.find((p) => p.member_id === trioForm.player2_id);
      const player3 = gamePlayers?.find((p) => p.member_id === trioForm.player3_id);

      const player1BaseScore = player1?.total_score || 0;
      const player2BaseScore = player2?.total_score || 0;
      const player3BaseScore = player3?.total_score || 0;
      const player1Handicap = player1?.handicap || 0;
      const player2Handicap = player2?.handicap || 0;
      const player3Handicap = player3?.handicap || 0;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      const { error } = await supabase.from("trio_records").insert([{
        game_id: selectedGameForTrio.id,
        player1_id: trioForm.player1_id,
        player2_id: trioForm.player2_id,
        player3_id: trioForm.player3_id,
        player1_score: player1BaseScore,
        player2_score: player2BaseScore,
        player3_score: player3BaseScore,
        player1_handicap: player1Handicap,
        player2_handicap: player2Handicap,
        player3_handicap: player3Handicap,
        include_handicap: trioForm.include_handicap,
        created_by: member?.id
      }]);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: `Rekod trio telah ditambah (${trioForm.include_handicap ? "termasuk" : "tanpa"} handicap)`
      });

      setIsTrioDialogOpen(false);
      setTrioForm({
        player1_id: "",
        player2_id: "",
        player3_id: "",
        include_handicap: true
      });
      fetchTrioRecords(selectedGameForTrio.id);
    } catch (error) {
      console.error("Error adding trio:", error);
      toast({
        title: "Ralat",
        description: "Gagal menambah rekod trio",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDouble = async (doubleId: string, gameId: string) => {
    if (!confirm("Adakah anda pasti mahu memadam rekod double ini?")) return;

    try {
      const { error } = await supabase.
      from("double_records").
      delete().
      eq("id", doubleId);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: "Rekod double telah dipadam"
      });

      fetchDoubleRecords(gameId);
    } catch (error) {
      console.error("Error deleting double:", error);
      toast({
        title: "Ralat",
        description: "Gagal memadam rekod double",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTrio = async (trioId: string, gameId: string) => {
    if (!confirm("Adakah anda pasti mahu memadam rekod trio ini?")) return;

    try {
      const { error } = await supabase
        .from("trio_records")
        .delete()
        .eq("id", trioId);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: "Rekod trio telah dipadam"
      });

      fetchTrioRecords(gameId);
    } catch (error) {
      console.error("Error deleting trio:", error);
      toast({
        title: "Ralat",
        description: "Gagal memadam rekod trio",
        variant: "destructive"
      });
    }
  };

  const toggleExpandedGame = (gameId: string) => {
    if (expandedGame === gameId) {
      setExpandedGame(null);
    } else {
      setExpandedGame(gameId);
      if (!doubleRecords[gameId]) {
        fetchDoubleRecords(gameId);
      }
    }
  };

  const toggleExpandedTrioGame = (gameId: string) => {
    if (expandedTrioGame === gameId) {
      setExpandedTrioGame(null);
    } else {
      setExpandedTrioGame(gameId);
      if (!trioRecords[gameId]) {
        fetchTrioRecords(gameId);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ms-MY", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const gameTypeLabels = {
    BLOK: "Blok",
    BLOK_SUKA_SUKI: "Blok Suka Suki",
    COUPLE: "Couple"
  };

  const gameTypeColors = {
    BLOK: "bg-blue-500",
    BLOK_SUKA_SUKI: "bg-green-500",
    COUPLE: "bg-pink-500"
  };

  // Pagination
  const totalPages = Math.ceil(games.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentGames = games.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>);

  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Pengurusan Permainan</h2>
            <p className="text-muted-foreground">Urus permainan dan pemain</p>
          </div>
          <Button onClick={handleCreateGame} className="bg-pink-600 hover:bg-pink-700">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Permainan
          </Button>
        </div>

        {games.length === 0 ?
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Belum ada permainan dijadualkan.
                <br />
                Klik butang di atas untuk tambah permainan baharu.
              </p>
            </CardContent>
          </Card> :

        <>
            <div className="grid gap-4">
              {currentGames.map((game) =>
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}>
              
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-pink-600" />
                          <CardTitle className="text-lg">{game.game_name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(game.game_date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {game.game_type === "BLOK" ? "BLOK" : game.game_type === "BLOK_SUKA_SUKI" ? "BLOK SUKA SUKI" : "COUPLE"}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintScoresheet(game)}>
                          
                              <Printer className="h-4 w-4 text-slate-600 hover:text-slate-900" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cetak Borang Markah</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenWhatsAppShare(game)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50">
                          
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.916 1.164-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.297 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                              </svg>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Share ke WhatsApp</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAddPlayer(game.id)}>
                          
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Tambah Pemain</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGame(game)}>
                          
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Permainan</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteGameDialog({ open: true, game })}>
                          
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Padam Permainan</TooltipContent>
                        </Tooltip>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Statistics */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Pemain</p>
                          <p className="text-2xl font-bold">{game.player_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Five-Five</p>
                          <p className="text-2xl font-bold text-pink-600">{game.five_five_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Clean Game</p>
                          <p className="text-2xl font-bold text-green-600">{game.clean_game_count || 0}</p>
                        </div>
                      </div>

                      {/* Double Game Section */}
                      <div className="border-t pt-4 mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Double Game</Label>
                            <p className="text-sm text-muted-foreground">Pemain main berpasangan</p>
                          </div>
                        </div>

                        {game.double_enabled &&
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpandedGame(game.id)}
                            >
                              {expandedGame === game.id ? "Tutup" : "Lihat"} Rekod Double
                              {doubleRecords[game.id] && doubleRecords[game.id].length > 0 &&
                                <Badge variant="secondary" className="ml-2">
                                  {doubleRecords[game.id].length}
                                </Badge>
                              }
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedGameForDouble(game);
                                setIsDoubleDialogOpen(true);
                                loadAvailableMembersForDouble(game.id);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Tambah Double
                            </Button>
                          </div>
                        }
                      </div>

                      <div className="border-t pt-4 mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Trio Game</Label>
                            <p className="text-sm text-muted-foreground">Pemain main bertiga</p>
                          </div>
                        </div>

                        {game.trio_enabled &&
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpandedTrioGame(game.id)}
                            >
                              {expandedTrioGame === game.id ? "Tutup" : "Lihat"} Rekod Trio
                              {trioRecords[game.id] && trioRecords[game.id].length > 0 &&
                                <Badge variant="secondary" className="ml-2">
                                  {trioRecords[game.id].length}
                                </Badge>
                              }
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedGameForTrio(game);
                                setIsTrioDialogOpen(true);
                                loadAvailableMembersForDouble(game.id);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Tambah Trio
                            </Button>
                          </div>
                        }
                      </div>

                      {/* Men vs Women Toggle */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`double-${game.id}`} className="text-sm whitespace-nowrap">
                            Double Game
                          </Label>
                          <Switch
                            id={`double-${game.id}`}
                            checked={game.double_enabled || false}
                            onCheckedChange={() => toggleGameDouble(game.id, game.double_enabled || false)}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Label htmlFor={`trio-${game.id}`} className="text-sm whitespace-nowrap">
                            Trio Game
                          </Label>
                          <Switch
                            id={`trio-${game.id}`}
                            checked={game.trio_enabled || false}
                            onCheckedChange={() => toggleGameTrio(game.id, game.trio_enabled || false)}
                          />
                        </div>

                        {game.men_vs_women_enabled && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`hcp-${game.id}`} className="text-sm whitespace-nowrap">
                              HCP Women
                            </Label>
                            <Input
                              id={`hcp-${game.id}`}
                              type="number"
                              min="0"
                              value={game.women_handicap || 0}
                              onChange={(e) => updateWomenHandicap(game.id, parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openMenVsWomenExclusionDialog(game.id)}
                            >
                              <Users className="w-4 h-4 mr-1" />
                              Urus Pemain
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Players List */}
                      {game.players && game.players.length > 0 ?
                  <div className="flex flex-wrap gap-2 mt-4">
                          {game.players.map((player) =>
                    <DropdownMenu key={player.id}>
                              <DropdownMenuTrigger asChild>
                                <Badge
                          variant={player.is_fivefive || player.clean_game ? "default" : "secondary"}
                          className={`cursor-pointer hover:scale-105 transition-all px-3 py-1 text-sm ${
                          player.is_fivefive && player.clean_game ?
                          "bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white border-0 ring-2 ring-amber-400 ring-offset-1 shadow-sm" :
                          player.is_fivefive ?
                          "bg-pink-500 hover:bg-pink-600 text-white border-0" :
                          player.clean_game ?
                          "bg-amber-500 hover:bg-amber-600 text-white border-0 ring-2 ring-amber-400 ring-offset-1 shadow-sm" :
                          ""}`
                          }>
                          
                                  {player.username || "Unknown"}
                                  {player.is_fivefive && " ⭐"}
                                  {player.clean_game && " ✨"}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-56">
                                <DropdownMenuLabel>
                                  {player.username || player.full_name || "Pemain"}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                          onClick={() =>
                          handleToggleFiveFive(player.id, !!player.is_fivefive)
                          }>
                          
                                  {player.is_fivefive ?
                          "Nyahaktifkan Five-Five" :
                          "Tandakan sebagai Five-Five"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                          onClick={() =>
                          handleToggleCleanGame(player.id, !!player.clean_game)
                          }>
                          
                                  {player.clean_game ?
                          "Nyahaktifkan Clean Game" :
                          "Tandakan sebagai Clean Game"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                          setDeletePlayerDialog({
                            open: true,
                            playerId: player.id,
                            playerName: player.username || player.full_name || "Pemain",
                            gameId: game.id
                          })
                          }>
                          
                                  Buang dari permainan
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                    )}
                        </div> :

                  <p className="text-sm text-muted-foreground italic">
                          Belum ada pemain didaftarkan untuk permainan ini.
                        </p>
                  }

                      {/* Double Records List */}
                      {expandedGame === game.id && game.double_enabled &&
                  <CardContent className="border-t bg-muted/20 pt-4">
                          {loadingDoubles[game.id] ?
                    <div className="text-center py-4">
                              <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
                            </div> :
                    !doubleRecords[game.id] || doubleRecords[game.id].length === 0 ?
                    <div className="text-center py-6 text-muted-foreground">
                              <p>Tiada rekod double lagi</p>
                            </div> :

                    <div className="space-y-2">
                              <h4 className="font-semibold mb-3">Rekod Double ({doubleRecords[game.id].length})</h4>
                              {doubleRecords[game.id].map((record, index) =>
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="w-8 justify-center">
                                      #{index + 1}
                                    </Badge>
                                    <div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="font-medium">@{record.player1?.username}</span>
                                        <Badge variant="secondary">{record.player1_score}</Badge>
                                        <span className="text-muted-foreground">+</span>
                                        <span className="font-medium">@{record.player2?.username}</span>
                                        <Badge variant="secondary">{record.player2_score}</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {record.include_handicap ? "Jumlah termasuk handicap" : "Jumlah tanpa handicap"}:
                                        <span className="font-bold text-primary ml-1">{record.total_score}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDouble(record.id, game.id)}>
                          
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                      )}
                            </div>
                    }
                        </CardContent>
                  </Card>
                </motion.div>
            )}
            </div>

            {/* Pagination */}
            {totalPages > 1 &&
          <div className="flex items-center justify-center gap-2 mt-6">
                <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}>
              
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) =>
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(page)}
                className={currentPage === page ? "bg-pink-600 hover:bg-pink-700" : ""}>
                
                      {page}
                    </Button>
              )}
                </div>

                <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}>
              
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
          }

            <p className="text-sm text-center text-muted-foreground">
              Menunjukkan {startIndex + 1} - {Math.min(endIndex, games.length)} daripada {games.length} permainan
            </p>
          </>
        }

        {/* Create/Edit Game Dialog */}
        <Dialog open={isGameDialogOpen} onOpenChange={setIsGameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGame ? "Edit Permainan" : "Tambah Permainan Baharu"}</DialogTitle>
              <DialogDescription>
                {editingGame ?
                "Kemaskini maklumat permainan" :
                "Isikan maklumat untuk permainan baharu"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="game_name">Nama Permainan</Label>
                <Input
                  id="game_name"
                  placeholder="Contoh: Blok 1"
                  value={gameForm.game_name}
                  onChange={(e) => setGameForm({ ...gameForm, game_name: e.target.value })} />
                
              </div>

              <div className="space-y-2">
                <Label htmlFor="game_date">Tarikh Permainan</Label>
                <Input
                  id="game_date"
                  type="date"
                  value={gameForm.game_date}
                  onChange={(e) => setGameForm({ ...gameForm, game_date: e.target.value })} />
                
              </div>

              <div className="space-y-2">
                <Label htmlFor="game_type">Jenis Permainan</Label>
                <Select
                  value={gameForm.game_type}
                  onValueChange={(value: "BLOK" | "BLOK_SUKA_SUKI" | "COUPLE") =>
                  setGameForm({ ...gameForm, game_type: value })
                  }>
                  
                  <SelectTrigger id="game_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BLOK">Blok</SelectItem>
                    <SelectItem value="BLOK_SUKA_SUKI">Blok Suka Suki</SelectItem>
                    <SelectItem value="COUPLE">Couple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGameDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveGame} className="bg-pink-600 hover:bg-pink-700">
                {editingGame ? "Kemaskini" : "Tambah"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* WhatsApp Share Dialog */}
        <Dialog open={showWhatsAppShare} onOpenChange={setShowWhatsAppShare}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Share Keputusan ke WhatsApp</DialogTitle>
              <DialogDescription>
                Pilih ayat pembuka dan penutup, kemudian share ke WhatsApp
              </DialogDescription>
            </DialogHeader>

            {loadingTopPlayers ?
            <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
              </div> :

            <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Pilih Ayat Pembuka</Label>
                  <div className="grid gap-2">
                    {OPENING_MESSAGES.map((msg, idx) =>
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedOpeningMessage(idx);
                      generatePreview(topPlayers, idx, selectedClosingMessage);
                    }}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                    selectedOpeningMessage === idx ?
                    "border-pink-600 bg-pink-50" :
                    "border-gray-200 hover:border-pink-300"}`
                    }>
                    
                        <p className="text-sm text-gray-700">
                          {msg.replace("[WINNER]", topPlayers[0]?.username || "N/A")}
                        </p>
                      </button>
                  )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pilih Ayat Penutup</Label>
                  <div className="grid gap-2">
                    {CLOSING_MESSAGES.map((msg, idx) =>
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedClosingMessage(idx);
                      generatePreview(topPlayers, selectedOpeningMessage, idx);
                    }}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                    selectedClosingMessage === idx ?
                    "border-pink-600 bg-pink-50" :
                    "border-gray-200 hover:border-pink-300"}`
                    }>
                    
                        <p className="text-sm text-gray-700">{msg}</p>
                      </button>
                  )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preview Mesej</Label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {sharePreview}
                    </pre>
                  </div>
                </div>
              </div>
            }

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWhatsAppShare(false)}>
                Batal
              </Button>
              <Button
                onClick={handleShareToWhatsApp}
                disabled={loadingTopPlayers}
                className="bg-green-600 hover:bg-green-700">
                
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.916 1.164-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.297 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Share ke WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Game Confirmation */}
        <AlertDialog open={deleteGameDialog.open} onOpenChange={(open) => setDeleteGameDialog({ open, game: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Padam Permainan?</AlertDialogTitle>
              <AlertDialogDescription>
                Adakah anda pasti mahu memadam permainan <strong>{deleteGameDialog.game?.game_name}</strong>?
                <br />
                <br />
                Tindakan ini akan turut membuang semua pemain yang didaftarkan untuk permainan ini dan tidak boleh dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteGame}
                className="bg-destructive hover:bg-destructive/90">
                
                Padam
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Player Confirmation */}
        <AlertDialog
          open={deletePlayerDialog.open}
          onOpenChange={(open) =>
          setDeletePlayerDialog({
            open,
            playerId: null,
            playerName: "",
            gameId: null
          })
          }>
          
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Buang Pemain?</AlertDialogTitle>
              <AlertDialogDescription>
                Adakah anda pasti mahu membuang <strong>{deletePlayerDialog.playerName}</strong> dari permainan ini?
                <br />
                <br />
                Tindakan ini tidak boleh dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlayer}
                className="bg-destructive hover:bg-destructive/90">
                
                Buang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Player Dialog */}
        <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Pemain ke Permainan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Ahli (boleh pilih ramai)</label>
                {loadingMembers ?
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                  </div> :
                availableMembers.length === 0 ?
                <p className="text-sm text-muted-foreground py-4 text-center">
                    Semua ahli sudah didaftarkan dalam permainan ini
                  </p> :

                <div className="max-h-64 overflow-y-auto rounded-md border p-2 space-y-1">
                    {availableMembers.map((member) => {
                    const checked = selectedMemberIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberIds((prev) =>
                          prev.includes(member.id) ?
                          prev.filter((id) => id !== member.id) :
                          [...prev, member.id]
                          );
                        }}
                        className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-muted ${
                        checked ? "bg-muted" : ""}`
                        }>
                        
                          <span>
                            {member.username} ({member.full_name})
                          </span>
                          <span
                          className={`h-4 w-4 rounded border ${
                          checked ? "bg-pink-600 border-pink-600" : "border-muted-foreground/40"}`
                          } />
                        
                        </button>);

                  })}
                  </div>
                }
                <p className="text-xs text-muted-foreground">
                  {selectedMemberIds.length} ahli dipilih
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="add-fivefive"
                  checked={newPlayerFiveFive}
                  onCheckedChange={setNewPlayerFiveFive} />
                
                <label
                  htmlFor="add-fivefive"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  
                  Main Five-Five ⭐ (aplikasi kepada semua yang dipilih)
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddPlayer(false)}>
                Batal
              </Button>
              <Button
                onClick={handleAddPlayer}
                disabled={selectedMemberIds.length === 0 || loadingMembers}>
                
                Tambah {selectedMemberIds.length > 0 ? `${selectedMemberIds.length} Pemain` : "Pemain"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Double Dialog */}
        <Dialog open={isDoubleDialogOpen} onOpenChange={setIsDoubleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Rekod Double</DialogTitle>
              <DialogDescription>
                Pilih 2 pemain yang main game ini dan tetapkan sama ada jumlah score termasuk handicap atau tidak.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pemain 1</Label>
                  <Select
                    value={doubleForm.player1_id}
                    onValueChange={(value) => setDoubleForm({ ...doubleForm, player1_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pemain 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.map((member) => (
                        <SelectItem key={`p1-${member.id}`} value={member.id}>
                          @{member.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pemain 2</Label>
                  <Select
                    value={doubleForm.player2_id}
                    onValueChange={(value) => setDoubleForm({ ...doubleForm, player2_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pemain 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.map((member) => (
                        <SelectItem key={`p2-${member.id}`} value={member.id}>
                          @{member.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <Switch
                  id="double-include-handicap"
                  checked={doubleForm.include_handicap}
                  onCheckedChange={(checked) => setDoubleForm({ ...doubleForm, include_handicap: checked })}
                />
                <Label htmlFor="double-include-handicap">
                  Kira jumlah score termasuk handicap
                </Label>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">💡 Nota:</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Hanya pemain yang main game ini akan dipaparkan</li>
                  <li>Score akan diambil automatik dari rekod pemain semasa</li>
                  <li>Anda boleh pilih sama ada jumlah akhir termasuk handicap atau tidak</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDoubleDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddDouble}>
                Tambah Rekod Double
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTrioDialogOpen} onOpenChange={setIsTrioDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Rekod Trio</DialogTitle>
              <DialogDescription>
                Pilih 3 pemain yang main game ini dan tetapkan sama ada jumlah score termasuk handicap atau tidak.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Pemain 1</Label>
                  <Select
                    value={trioForm.player1_id}
                    onValueChange={(value) => setTrioForm({ ...trioForm, player1_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pemain 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.map((member) => (
                        <SelectItem key={`t1-${member.id}`} value={member.id}>
                          @{member.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pemain 2</Label>
                  <Select
                    value={trioForm.player2_id}
                    onValueChange={(value) => setTrioForm({ ...trioForm, player2_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pemain 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.map((member) => (
                        <SelectItem key={`t2-${member.id}`} value={member.id}>
                          @{member.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pemain 3</Label>
                  <Select
                    value={trioForm.player3_id}
                    onValueChange={(value) => setTrioForm({ ...trioForm, player3_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pemain 3" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.map((member) => (
                        <SelectItem key={`t3-${member.id}`} value={member.id}>
                          @{member.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <Switch
                  id="trio-include-handicap"
                  checked={trioForm.include_handicap}
                  onCheckedChange={(checked) => setTrioForm({ ...trioForm, include_handicap: checked })}
                />
                <Label htmlFor="trio-include-handicap">
                  Kira jumlah score termasuk handicap
                </Label>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-900 mb-2">💡 Nota:</p>
                <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
                  <li>Hanya pemain yang main game ini akan dipaparkan</li>
                  <li>Score akan diambil automatik dari rekod pemain semasa</li>
                  <li>Anda boleh pilih sama ada jumlah akhir termasuk handicap atau tidak</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTrioDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddTrio}>
                Tambah Rekod Trio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Men vs Women Exclusion Dialog */}
        <Dialog open={isMenVsWomenExclusionDialogOpen} onOpenChange={setIsMenVsWomenExclusionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Urus Pemain - Men vs Women
              </DialogTitle>
              <DialogDescription>
                Tandakan pemain yang TIDAK bermain Men vs Women
              </DialogDescription>
            </DialogHeader>

            {loadingMenVsWomenPlayers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : menVsWomenPlayers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Tiada pemain dalam game ini</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-purple-900">
                    💡 <strong>Nota:</strong> Secara default, semua pemain akan bermain Men vs Women. 
                    Tick checkbox untuk mengecualikan pemain tertentu.
                  </p>
                </div>

                <div className="space-y-2">
                  {menVsWomenPlayers.map((player: any) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        player.exclude_from_men_vs_women
                          ? "bg-gray-100 border-gray-300"
                          : player.members?.sex === "men"
                            ? "bg-blue-50 border-blue-200"
                            : "bg-pink-50 border-pink-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {player.members?.sex === "men" ? "👨" : "👩"}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            @{player.members?.username}
                          </div>
                          {player.members?.full_name && (
                            <div className="text-sm text-gray-600">
                              {player.members.full_name}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {player.members?.sex === "men" ? "Lelaki" : "Perempuan"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`exclude-${player.id}`}
                          className={`text-sm whitespace-nowrap ${
                            player.exclude_from_men_vs_women
                              ? "text-red-700 font-semibold"
                              : "text-gray-600"
                          }`}
                        >
                          {player.exclude_from_men_vs_women ? "Dikecualikan" : "Bermain"}
                        </Label>
                        <Switch
                          id={`exclude-${player.id}`}
                          checked={player.exclude_from_men_vs_women || false}
                          onCheckedChange={() => togglePlayerExclusion(player.id, player.exclude_from_men_vs_women || false)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-50 border-2 border-blue-200 rounded" />
                    <span>Lelaki</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-pink-50 border-2 border-pink-200 rounded" />
                    <span>Perempuan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded" />
                    <span>Dikecualikan</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setIsMenVsWomenExclusionDialogOpen(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>);

}