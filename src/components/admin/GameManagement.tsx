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
    game_type: "BLOK" as "BLOK" | "BLOK_SUKA_SUKI" | "COUPLE"
  });

  // Double Game States
  const [isDoubleDialogOpen, setIsDoubleDialogOpen] = useState(false);
  const [doubleRecords, setDoubleRecords] = useState<DoubleRecord[]>([]);
  const [loadingDoubles, setLoadingDoubles] = useState(false);
  const [selectedGameForDouble, setSelectedGameForDouble] = useState<Game | null>(null);

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

      console.log("🔄 Toggling Men vs Women game:", { gameId, currentValue, newValue: !currentValue });

      const { data, error } = await supabase.
      from("games").
      update({ men_vs_women_enabled: !currentValue }).
      eq("id", gameId).
      select();

      console.log("✅ Update result:", { data, error });

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      toast({
        title: "Berjaya",
        description: `Men vs Women game ${!currentValue ? "diaktifkan" : "dinyahaktifkan"}`
      });

      console.log("🔄 Reloading games...");
      await loadGames();
      console.log("✅ Games reloaded!");
    } catch (error) {
      console.error("❌ Error toggling Men vs Women:", error);
      toast({
        title: "Ralat",
        description: `Gagal mengemaskini: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
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
        .eq("game_id", gameId)
        .order("members(username)");

      if (error) throw error;

      setMenVsWomenPlayers(gamePlayers || []);
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
      // Fetch player scores from game_players table (if exists)
      const { data: gamePlayers, error: fetchError } = await supabase.
      from("game_players").
      select("member_id, total_score, handicap").
      eq("game_id", selectedGameForDouble.id).
      in("member_id", [doubleForm.player1_id, doubleForm.player2_id]);

      if (fetchError) throw fetchError;

      // Get scores or default to 0 if not yet entered
      const player1 = gamePlayers?.find((p) => p.member_id === doubleForm.player1_id);
      const player2 = gamePlayers?.find((p) => p.member_id === doubleForm.player2_id);

      const player1Score = (player1?.total_score || 0) + (player1?.handicap || 0);
      const player2Score = (player2?.total_score || 0) + (player2?.handicap || 0);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase.
      from("members").
      select("id").
      eq("user_id", user?.id).
      single();

      const { error } = await supabase.from("double_records").insert([{
        game_id: selectedGameForDouble.id,
        player1_id: doubleForm.player1_id,
        player2_id: doubleForm.player2_id,
        player1_score: player1Score,
        player2_score: player2Score,
        created_by: member?.id
      }]);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: `Rekod double telah ditambah (${player1Score} + ${player2Score} = ${player1Score + player2Score})`
      });

      setIsDoubleDialogOpen(false);
      setDoubleForm({ player1_id: "", player2_id: "", player1_score: "", player2_score: "" });
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
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 1.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.248c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002 0c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.719 1.016-1.016 2.016-.306 0-.356.25-.574.297m-.574 1.148c.218.05 1.394.05 1.602 0m-.002