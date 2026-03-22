import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Edit, Calendar, Users, Target, Star, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Game = Database["public"]["Tables"]["games"]["Row"] & {
  player_count?: number;
  five_five_count?: number;
  players?: Array<{
    id: string;
    member_id: string;
    member_name: string;
    is_fivefive: boolean;
    username?: string;
    full_name?: string;
  }>;
};

const ITEMS_PER_PAGE = 10;

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
    game_type: "BLOK" as "BLOK" | "MINI_BLOK" | "UNDI_LANE",
  });

  // Delete Game Dialog
  const [deleteGameDialog, setDeleteGameDialog] = useState<{ open: boolean; game: Game | null }>({
    open: false,
    game: null,
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
    gameId: null,
  });

  const [loadingMembers, setLoadingMembers] = useState(false);

  // Add Player states
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [selectedGameForPlayer, setSelectedGameForPlayer] = useState<string | null>(null);
  const [availableMembers, setAvailableMembers] = useState<Array<{ id: string; username: string; full_name: string }>>([]);
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
      const formattedGames = (data as any[]).map(game => ({
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
        variant: "destructive",
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
        variant: "destructive",
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
      game_type: "BLOK",
    });
    setIsGameDialogOpen(true);
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setGameForm({
      game_name: game.game_name,
      game_date: game.game_date,
      game_type: game.game_type as "BLOK" | "MINI_BLOK" | "UNDI_LANE",
    });
    setIsGameDialogOpen(true);
  };

  const handleSaveGame = async () => {
    try {
      if (!gameForm.game_name.trim()) {
        toast({
          title: "Ralat",
          description: "Sila masukkan nama permainan",
          variant: "destructive",
        });
        return;
      }

      if (editingGame) {
        await gameService.updateGame(editingGame.id, gameForm);
        toast({
          title: "Berjaya",
          description: "Permainan telah dikemaskini",
        });
      } else {
        await gameService.createGame(gameForm);
        toast({
          title: "Berjaya",
          description: "Permainan baharu telah dicipta",
        });
      }

      setIsGameDialogOpen(false);
      loadGames();
    } catch (error) {
      console.error("Error saving game:", error);
      toast({
        title: "Ralat",
        description: editingGame ? "Gagal mengemaskini permainan" : "Gagal mencipta permainan",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGame = async () => {
    if (!deleteGameDialog.game) return;

    try {
      await gameService.deleteGame(deleteGameDialog.game.id);
      toast({
        title: "Berjaya",
        description: "Permainan telah dipadam",
      });
      setDeleteGameDialog({ open: false, game: null });
      loadGames();
    } catch (error) {
      console.error("Error deleting game:", error);
      toast({
        title: "Ralat",
        description: "Gagal memadam permainan",
        variant: "destructive",
      });
    }
  };

  const handleToggleFiveFive = async (playerId: string, currentStatus: boolean) => {
    try {
      await gameService.updatePlayerFiveFiveStatus(playerId, !currentStatus);
      toast({
        title: "Berjaya",
        description: `Status Five-Five telah ${!currentStatus ? "diaktifkan" : "dinyahaktifkan"}`,
      });
      loadGames();
    } catch (error) {
      console.error("Error updating Five-Five status:", error);
      toast({
        title: "Ralat",
        description: "Gagal mengemaskini status Five-Five",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlayer = async () => {
    if (!deletePlayerDialog.playerId) return;

    try {
      await gameService.deletePlayerFromGameById(deletePlayerDialog.playerId);
      toast({
        title: "Berjaya",
        description: `${deletePlayerDialog.playerName} telah dibuang dari permainan`,
      });
      setDeletePlayerDialog({
        open: false,
        playerId: null,
        playerName: "",
        gameId: null,
      });
      loadGames();
    } catch (error) {
      console.error("Error deleting player:", error);
      toast({
        title: "Ralat",
        description: "Gagal membuang pemain",
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    try {
      const players = selectedMemberIds.map((memberId) => ({
        member_id: memberId,
        is_fivefive: newPlayerFiveFive,
      }));

      const result = await gameService.addPlayersToGameWithFiveFive(
        selectedGameForPlayer,
        players
      );

      toast({
        title: "Berjaya",
        description: result?.message || "Pemain telah ditambah ke permainan",
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
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ms-MY", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const gameTypeLabels = {
    BLOK: "Blok",
    MINI_BLOK: "Mini Blok",
    UNDI_LANE: "Undi Lane",
  };

  const gameTypeColors = {
    BLOK: "bg-blue-500",
    MINI_BLOK: "bg-green-500",
    UNDI_LANE: "bg-purple-500",
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
      </div>
    );
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

        {games.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Belum ada permainan dijadualkan.
                <br />
                Klik butang di atas untuk tambah permainan baharu.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {currentGames.map((game) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
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
                          {game.game_type === "BLOK" ? "BLOK" : game.game_type === "MINI_BLOK" ? "MINI BLOK" : "UNDI LANE"}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAddPlayer(game.id)}
                            >
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
                              onClick={() => handleEditGame(game)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Permainan</TooltipContent>
                        </Tooltip>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Statistics */}
                      <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">{game.player_count || 0} pemain berdaftar</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-pink-600" />
                          <span className="font-medium">{game.five_five_count || 0} main Five-Five</span>
                        </div>
                      </div>

                      {/* Players List */}
                      {game.players && game.players.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {game.players.map((player) => (
                            <DropdownMenu key={player.id}>
                              <DropdownMenuTrigger asChild>
                                <Badge
                                  variant={player.is_fivefive ? "default" : "secondary"}
                                  className={`cursor-pointer hover:scale-105 transition-all ${
                                    player.is_fivefive
                                      ? "bg-pink-500 hover:bg-pink-600 text-white"
                                      : ""
                                  }`}
                                >
                                  {player.username || "Unknown"}
                                  {player.is_fivefive && " ⭐"}
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
                                  }
                                >
                                  {player.is_fivefive
                                    ? "Nyahaktifkan Five-Five"
                                    : "Tandakan sebagai Five-Five"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setDeletePlayerDialog({
                                      open: true,
                                      playerId: player.id,
                                      playerName: player.username || player.full_name || "Pemain",
                                      gameId: game.id,
                                    })
                                  }
                                >
                                  Buang dari permainan
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Belum ada pemain didaftarkan untuk permainan ini.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className={currentPage === page ? "bg-pink-600 hover:bg-pink-700" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            <p className="text-sm text-center text-muted-foreground">
              Menunjukkan {startIndex + 1} - {Math.min(endIndex, games.length)} daripada {games.length} permainan
            </p>
          </>
        )}

        {/* Create/Edit Game Dialog */}
        <Dialog open={isGameDialogOpen} onOpenChange={setIsGameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGame ? "Edit Permainan" : "Tambah Permainan Baharu"}</DialogTitle>
              <DialogDescription>
                {editingGame
                  ? "Kemaskini maklumat permainan"
                  : "Isikan maklumat untuk permainan baharu"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="game_name">Nama Permainan</Label>
                <Input
                  id="game_name"
                  placeholder="Contoh: Blok 1"
                  value={gameForm.game_name}
                  onChange={(e) => setGameForm({ ...gameForm, game_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game_date">Tarikh Permainan</Label>
                <Input
                  id="game_date"
                  type="date"
                  value={gameForm.game_date}
                  onChange={(e) => setGameForm({ ...gameForm, game_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game_type">Jenis Permainan</Label>
                <Select
                  value={gameForm.game_type}
                  onValueChange={(value: "BLOK" | "MINI_BLOK" | "UNDI_LANE") =>
                    setGameForm({ ...gameForm, game_type: value })
                  }
                >
                  <SelectTrigger id="game_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BLOK">Blok</SelectItem>
                    <SelectItem value="MINI_BLOK">Mini Blok</SelectItem>
                    <SelectItem value="UNDI_LANE">Undi Lane</SelectItem>
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
                className="bg-destructive hover:bg-destructive/90"
              >
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
              gameId: null,
            })
          }
        >
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
                className="bg-destructive hover:bg-destructive/90"
              >
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
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                  </div>
                ) : availableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Semua ahli sudah didaftarkan dalam permainan ini
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-md border p-2 space-y-1">
                    {availableMembers.map((member) => {
                      const checked = selectedMemberIds.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setSelectedMemberIds((prev) =>
                              prev.includes(member.id)
                                ? prev.filter((id) => id !== member.id)
                                : [...prev, member.id]
                            );
                          }}
                          className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-muted ${
                            checked ? "bg-muted" : ""
                          }`}
                        >
                          <span>
                            {member.username} ({member.full_name})
                          </span>
                          <span
                            className={`h-4 w-4 rounded border ${
                              checked ? "bg-pink-600 border-pink-600" : "border-muted-foreground/40"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {selectedMemberIds.length} ahli dipilih
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="add-fivefive"
                  checked={newPlayerFiveFive}
                  onCheckedChange={setNewPlayerFiveFive}
                />
                <label
                  htmlFor="add-fivefive"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
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
                disabled={selectedMemberIds.length === 0 || loadingMembers}
              >
                Tambah {selectedMemberIds.length > 0 ? `${selectedMemberIds.length} Pemain` : "Pemain"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}