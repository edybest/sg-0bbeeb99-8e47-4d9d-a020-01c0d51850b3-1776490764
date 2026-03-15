"use client";

import { useState, useEffect } from "react";
import { gameService } from "@/services/gameService";
import { memberService } from "@/services/memberService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, Users, Calendar, Trophy, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Game = {
  id: string;
  game_name: string;
  game_type: string;
  game_date: string;
  year: number;
  location?: string | null;
  is_official?: boolean | null;
  created_at?: string;
};

type Member = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type MemberWithFiveFive = Member & {
  is_fivefive?: boolean;
};

export function GameManagement() {
  const [games, setGames] = useState<Game[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGame, setNewGame] = useState({ game_date: "", game_format: "10 PIN" });
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [playersDialogOpen, setPlayersDialogOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [fivefiveParticipants, setFivefiveParticipants] = useState<Set<string>>(new Set());
  const [initialFivefiveParticipants, setInitialFivefiveParticipants] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    game_name: "",
    game_type: "Blok Rasmi 10 PIN",
    game_date: new Date().toISOString().split("T")[0],
    location: "Wangsa Bowl, IOI City Mall",
    is_official: true
  });

  useEffect(() => {
    loadGames();
    loadMembers();
  }, []);

  async function loadGames() {
    try {
      setLoading(true);
      const data = await gameService.getAllGames();
      setGames(data || []);
    } catch (err: any) {
      console.error("Load games error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      const data = await memberService.getAllMembers();
      setMembers(data || []);
    } catch (err: any) {
      console.error("Load members error:", err);
    }
  }

  function openAddDialog() {
    setEditingGame(null);
    setFormData({
      game_name: "",
      game_type: "Blok Rasmi 10 PIN",
      game_date: new Date().toISOString().split("T")[0],
      location: "Daiman Bowl",
      is_official: true
    });
    setDialogOpen(true);
  }

  function openEditDialog(game: Game) {
    setEditingGame(game);
    setFormData({
      game_name: game.game_name,
      game_type: game.game_type,
      game_date: game.game_date,
      location: game.location || "Daiman Bowl",
      is_official: game.is_official ?? true
    });
    setDialogOpen(true);
  }

  const openPlayersDialog = async (gameId: string) => {
    setSelectedGameId(gameId);
    setSearchTerm("");
    
    try {
      const { data: gamePlayers, error } = await supabase
        .from("game_players")
        .select("member_id, is_fivefive")
        .eq("game_id", gameId);

      if (error) throw error;

      const playerIds = gamePlayers?.map((p) => p.member_id) || [];
      const fivefiveIds = gamePlayers
        ?.filter((p) => p.is_fivefive)
        .map((p) => p.member_id) || [];

      setSelectedPlayers(playerIds);
      setFivefiveParticipants(new Set(fivefiveIds));
      setInitialFivefiveParticipants(new Set(fivefiveIds));
      setPlayersDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal memuatkan data pemain",
        variant: "destructive",
      });
    }
  };

  const closePlayersDialog = () => {
    setPlayersDialogOpen(false);
    setSelectedPlayers([]);
    setFivefiveParticipants(new Set());
    setInitialFivefiveParticipants(new Set());
    setSearchTerm("");
  };

  const handleUpdatePlayers = async () => {
    if (!selectedGameId) return;

    try {
      setLoading(true);

      const currentPlayerIds = new Set(selectedPlayers);
      const { data: existingPlayers, error: fetchError } = await supabase
        .from("game_players")
        .select("member_id, is_fivefive")
        .eq("game_id", selectedGameId);

      if (fetchError) throw fetchError;

      const existingPlayerIds = new Set(existingPlayers?.map((p) => p.member_id) || []);

      const playersToAdd = selectedPlayers.filter((id) => !existingPlayerIds.has(id));
      const playersToRemove = Array.from(existingPlayerIds).filter(
        (id) => !currentPlayerIds.has(id)
      );

      const fivefiveChanges: Array<{ member_id: string; old_status: boolean; new_status: boolean }> = [];
      
      selectedPlayers.forEach((memberId) => {
        if (existingPlayerIds.has(memberId)) {
          const existingPlayer = existingPlayers?.find((p) => p.member_id === memberId);
          const oldFivefive = existingPlayer?.is_fivefive || false;
          const newFivefive = fivefiveParticipants.has(memberId);
          
          if (oldFivefive !== newFivefive) {
            fivefiveChanges.push({
              member_id: memberId,
              old_status: oldFivefive,
              new_status: newFivefive,
            });
          }
        }
      });

      if (playersToAdd.length === 0 && playersToRemove.length === 0 && fivefiveChanges.length === 0) {
        toast({
          title: "ℹ️ Tiada Perubahan",
          description: "Tiada perubahan pada senarai pemain atau status FiveFive.",
        });
        setLoading(false);
        return;
      }

      if (playersToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("game_players")
          .delete()
          .eq("game_id", selectedGameId)
          .in("member_id", playersToRemove);

        if (deleteError) throw deleteError;
      }

      if (playersToAdd.length > 0) {
        const gamePlayers = playersToAdd.map((memberId) => ({
          game_id: selectedGameId,
          member_id: memberId,
          is_fivefive: fivefiveParticipants.has(memberId),
        }));

        const { error: insertError } = await supabase
          .from("game_players")
          .insert(gamePlayers);

        if (insertError) throw insertError;
      }

      if (fivefiveChanges.length > 0) {
        for (const change of fivefiveChanges) {
          const { error: updateError } = await supabase
            .from("game_players")
            .update({ is_fivefive: change.new_status })
            .eq("game_id", selectedGameId)
            .eq("member_id", change.member_id);

          if (updateError) throw updateError;
        }
      }

      const messages: string[] = [];
      if (playersToAdd.length > 0) {
        messages.push(`${playersToAdd.length} pemain ditambah`);
      }
      if (playersToRemove.length > 0) {
        messages.push(`${playersToRemove.length} pemain dikeluarkan`);
      }
      if (fivefiveChanges.length > 0) {
        messages.push(`${fivefiveChanges.length} status FiveFive dikemaskini`);
      }

      toast({
        title: "✅ Berjaya!",
        description: messages.join(", ") + ".",
      });

      closePlayersDialog();
      loadGames();
    } catch (err: any) {
      toast({
        title: "❌ Ralat",
        description: err.message || "Gagal mengemaskini pemain",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerToggle = (memberId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleFivefiveToggle = (memberId: string) => {
    setFivefiveParticipants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  async function handleSubmit() {
    if (!formData.game_name.trim()) {
      setError("Nama game diperlukan");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const year = new Date(formData.game_date).getFullYear();
      
      const gameData = {
        ...formData,
        year
      };

      if (editingGame) {
        await gameService.updateGame(editingGame.id, gameData);
      } else {
        await gameService.createGame(gameData);
      }
      await loadGames();
      setDialogOpen(false);
    } catch (err: any) {
      console.error("Submit game error:", err);
      setError(err.message || "Ralat tidak diketahui");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(gameId: string) {
    if (!confirm("Anda pasti nak delete game ini? Semua scores akan hilang!")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await gameService.deleteGame(gameId);
      await loadGames();
    } catch (err: any) {
      console.error("Delete game error:", err);
      setError(err.message || "Ralat tidak diketahui");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Pengurusan Game
            </CardTitle>
            <CardDescription>Tambah dan urus game bowling</CardDescription>
          </div>
          <Button onClick={openAddDialog} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Game
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && games.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Tiada game dijumpai. Klik "Tambah Game" untuk create game baru.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Game</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tarikh</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="font-medium">
                      {game.game_name}
                      {game.is_official && (
                        <Badge variant="secondary" className="ml-2 text-xs">Official</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{game.game_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(game.game_date).toLocaleDateString("ms-MY")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {game.location || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPlayersDialog(game.id)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(game)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(game.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Game Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGame ? "Edit Game" : "Tambah Game Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingGame ? "Update maklumat game" : "Create game baru untuk bowling"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="game_name">Nama Game *</Label>
                <Input
                  id="game_name"
                  placeholder="Contoh: Blok Januari 2026"
                  value={formData.game_name}
                  onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="game_type">Jenis Game *</Label>
                  <Select
                    value={formData.game_type}
                    onValueChange={(value) => setFormData({ ...formData, game_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Blok Rasmi 10 PIN">Blok Rasmi 10 PIN</SelectItem>
                      <SelectItem value="Blok Tidak Rasmi">Blok Tidak Rasmi</SelectItem>
                      <SelectItem value="Liga">Liga</SelectItem>
                      <SelectItem value="Couple">Couple</SelectItem>
                      <SelectItem value="Training">Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game_date">Tarikh Game *</Label>
                  <Input
                    id="game_date"
                    type="date"
                    value={formData.game_date}
                    onChange={(e) => setFormData({ ...formData, game_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lokasi</Label>
                <Input
                  id="location"
                  placeholder="Contoh: Wangsa Bowl, IOI City Mall"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="is_official"
                  checked={formData.is_official}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_official: checked as boolean })}
                />
                <Label htmlFor="is_official">Game Rasmi (Kira untuk ranking)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-red-600 hover:bg-red-700">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingGame ? "Update" : "Tambah"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Players Dialog */}
        <Dialog open={playersDialogOpen} onOpenChange={setPlayersDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Pilih Pemain</DialogTitle>
              <DialogDescription>
                Pilih ahli yang join game ini dan tandakan jika main FiveFive
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedPlayers.includes(member.id)}
                    onCheckedChange={() => handlePlayerToggle(member.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-sm text-muted-foreground">@{member.username}</p>
                  </div>
                  {selectedPlayers.includes(member.id) && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`fivefive-${member.id}`}
                        checked={fivefiveParticipants.has(member.id)}
                        onCheckedChange={() => handleFivefiveToggle(member.id)}
                      />
                      <Label 
                        htmlFor={`fivefive-${member.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        Main FiveFive
                      </Label>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closePlayersDialog}>
                Batal
              </Button>
              <Button onClick={handleUpdatePlayers} disabled={loading} className="bg-red-600 hover:bg-red-700">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Tambah ${selectedPlayers.length} Pemain`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}