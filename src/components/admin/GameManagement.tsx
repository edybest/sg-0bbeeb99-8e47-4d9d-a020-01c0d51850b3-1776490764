import { useState, useEffect } from "react";
import { gameService } from "@/services/gameService";
import { memberService } from "@/services/memberService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";

type Game = {
  id: string;
  game_name: string;
  game_date: string;
  game_format: string;
  location: string | null;
};

type Member = {
  id: string;
  username: string;
  full_name: string;
};

export function GameManagement() {
  const [games, setGames] = useState<Game[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    game_name: "",
    game_date: "",
    game_format: "BLOK",
    location: "",
    selected_players: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGames();
    loadMembers();
  }, []);

  async function loadGames() {
    try {
      const data = await gameService.getAllGames();
      setGames(data as Game[]);
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      const data = await memberService.getAllMembers();
      setMembers(data as Member[]);
    } catch (error) {
      console.error("Error loading members:", error);
    }
  }

  function openAddDialog() {
    setEditingGame(null);
    setFormData({
      game_name: "",
      game_date: new Date().toISOString().split("T")[0],
      game_format: "BLOK",
      location: "",
      selected_players: []
    });
    setDialogOpen(true);
  }

  function openEditDialog(game: Game) {
    setEditingGame(game);
    setFormData({
      game_name: game.game_name,
      game_date: game.game_date,
      game_format: game.game_format,
      location: game.location || "",
      selected_players: []
    });
    setDialogOpen(true);
  }

  function togglePlayer(memberId: string) {
    setFormData((prev) => ({
      ...prev,
      selected_players: prev.selected_players.includes(memberId)
        ? prev.selected_players.filter((id) => id !== memberId)
        : [...prev.selected_players, memberId]
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingGame) {
        await gameService.updateGame(editingGame.id, {
          game_name: formData.game_name,
          game_date: formData.game_date,
          game_format: formData.game_format,
          location: formData.location || null
        });
      } else {
        const newGame = await gameService.createGame({
          game_name: formData.game_name,
          game_date: formData.game_date,
          game_format: formData.game_format,
          location: formData.location || null
        });

        // Add selected players to the game
        for (const memberId of formData.selected_players) {
          await gameService.addPlayerToGame({
            game_id: newGame.id,
            member_id: memberId,
            game1: 0,
            game2: 0,
            game3: 0,
            game4: 0,
            game5: 0,
            handicap: 0,
            total_score: 0,
            overall_score: 0,
            average_score: 0,
            difference_score: 0
          });
        }
      }

      await loadGames();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving game:", error);
      alert("Gagal menyimpan game");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, gameName: string) {
    if (!confirm(`Adakah anda pasti untuk membuang game ${gameName}?`)) return;

    try {
      await gameService.deleteGame(id);
      await loadGames();
    } catch (error) {
      console.error("Error deleting game:", error);
      alert("Gagal membuang game");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <Card className="bg-black/50 border-red-900/50">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-2xl text-red-500">Pengurusan Game</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Game
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-red-900/50 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-red-500">
                  {editingGame ? "Edit Game" : "Tambah Game Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="game_name" className="text-gray-300">Nama Game *</Label>
                  <Input
                    id="game_name"
                    value={formData.game_name}
                    onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                    required
                    className="bg-gray-800 border-gray-700"
                    placeholder="Contoh: BLOK #1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="game_date" className="text-gray-300">Tarikh Game *</Label>
                    <Input
                      id="game_date"
                      type="date"
                      value={formData.game_date}
                      onChange={(e) => setFormData({ ...formData, game_date: e.target.value })}
                      required
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="game_format" className="text-gray-300">Format Game *</Label>
                    <Input
                      id="game_format"
                      value={formData.game_format}
                      onChange={(e) => setFormData({ ...formData, game_format: e.target.value })}
                      required
                      className="bg-gray-800 border-gray-700"
                      placeholder="BLOK / LIGA / COUPLE"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-300">Lokasi</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                {!editingGame && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Pilih Pemain</Label>
                    <div className="max-h-64 overflow-y-auto border border-gray-700 rounded p-4 space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={member.id}
                            checked={formData.selected_players.includes(member.id)}
                            onCheckedChange={() => togglePlayer(member.id)}
                          />
                          <Label htmlFor={member.id} className="text-gray-300 cursor-pointer">
                            {member.full_name} (@{member.username})
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingGame ? "Simpan" : "Tambah"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Batal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="text-gray-300">Nama Game</TableHead>
                <TableHead className="text-gray-300">Tarikh</TableHead>
                <TableHead className="text-gray-300">Format</TableHead>
                <TableHead className="text-gray-300">Lokasi</TableHead>
                <TableHead className="text-gray-300">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id} className="border-gray-800">
                  <TableCell className="text-white font-medium">{game.game_name}</TableCell>
                  <TableCell className="text-gray-300">{new Date(game.game_date).toLocaleDateString("ms-MY")}</TableCell>
                  <TableCell className="text-gray-300">{game.game_format}</TableCell>
                  <TableCell className="text-gray-300">{game.location || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(game)} className="border-gray-700">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(game.id, game.game_name)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}