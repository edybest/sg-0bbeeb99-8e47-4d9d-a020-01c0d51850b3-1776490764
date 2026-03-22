import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Edit, Calendar, Users, Target, Star, ChevronLeft, ChevronRight } from "lucide-react";
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

type Game = Database["public"]["Tables"]["games"]["Row"] & {
  player_count?: number;
  five_five_count?: number;
  players?: Array<{
    id: string;
    member_id: string;
    member_name: string;
    is_fivefive: boolean;
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

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const data = await gameService.listGamesWithPlayers();
      setGames(data as any);
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
    if (!deletePlayerDialog.playerId || !deletePlayerDialog.gameId) return;

    try {
      await gameService.deletePlayerFromGameById(deletePlayerDialog.playerId);
      toast({
        title: "Berjaya",
        description: `${deletePlayerDialog.playerName} telah dibuang dari permainan`,
      });
      setDeletePlayerDialog({ open: false, playerId: null, playerName: "", gameId: null });
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
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl">{game.game_name}</CardTitle>
                          <Badge className={`${gameTypeColors[game.game_type]} text-white`}>
                            {gameTypeLabels[game.game_type]}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(game.game_date)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGame(game)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteGameDialog({ open: true, game })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Senarai Pemain Terlibat:</h4>
                        <div className="flex flex-wrap gap-2">
                          {game.players.map((player) => (
                            <TooltipProvider key={player.id}>
                              <div className="group relative">
                                <Badge
                                  variant={player.is_fivefive ? "default" : "secondary"}
                                  className={`${
                                    player.is_fivefive
                                      ? "bg-pink-100 text-pink-900 border-pink-300 hover:bg-pink-200 shadow-sm"
                                      : "bg-muted hover:bg-muted/80"
                                  } cursor-pointer transition-all px-3 py-1.5`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{player.member_name}</span>
                                    {player.is_fivefive && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Star className="w-3.5 h-3.5 fill-pink-600 text-pink-600" />
                                        </TooltipTrigger>
                                        <TooltipContent>Main Five-Five</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </Badge>
                                
                                {/* Player Actions (shown on hover) */}
                                <div className="absolute -top-10 left-0 hidden group-hover:flex gap-1 bg-white border rounded-md shadow-lg p-1 z-10">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2"
                                          onClick={() => handleToggleFiveFive(player.id, player.is_fivefive)}
                                        >
                                          <Star className={`w-3.5 h-3.5 ${player.is_fivefive ? "fill-pink-600 text-pink-600" : ""}`} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {player.is_fivefive ? "Nyahaktif Five-Five" : "Aktifkan Five-Five"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-destructive hover:text-destructive"
                                          onClick={() =>
                                            setDeletePlayerDialog({
                                              open: true,
                                              playerId: player.id,
                                              playerName: player.member_name,
                                              gameId: game.id,
                                            })
                                          }
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Buang pemain</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            </TooltipProvider>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          * Bintang (⭐) menunjukkan pemain menyertai Five-Five. Hover pada nama untuk edit/delete.
                        </p>
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
          setDeletePlayerDialog({ open, playerId: null, playerName: "", gameId: null })
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
    </div>
  );
}