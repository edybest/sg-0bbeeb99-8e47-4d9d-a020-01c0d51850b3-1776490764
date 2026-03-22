import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Edit, Calendar, Users, Trophy, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type Game = GameRow & {
  players?: { member_name: string; is_five_five: boolean }[];
  player_count?: number;
  five_five_count?: number;
};

type GameInsert = Database["public"]["Tables"]["games"]["Insert"];

export function GameManagement() {
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    game_name: "",
    game_date: new Date().toISOString().split("T")[0],
    game_type: "BLOK",
  });

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);

      // Fetch games and their players in a single joined query
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select(`
          *,
          game_players (
            is_fivefive,
            members (
              full_name
            )
          )
        `)
        .order("game_date", { ascending: false });

      if (gamesError) throw gamesError;

      const gamesWithPlayers = (gamesData || []).map((game: any) => {
        const players = (game.game_players || []).map((gp: any) => ({
          member_name: gp.members?.full_name || "Unknown",
          is_five_five: gp.is_fivefive || false
        }));

        return {
          ...game,
          players,
          player_count: players.length,
          five_five_count: players.filter((p: any) => p.is_five_five).length
        };
      });

      setGames(gamesWithPlayers as Game[]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const year = new Date(formData.game_date).getFullYear();

      const gameData: GameInsert = {
        game_name: formData.game_name,
        game_date: formData.game_date,
        game_type: formData.game_type,
        year: year,
      };

      if (editingId) {
        const { error } = await supabase
          .from("games")
          .update(gameData)
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Berjaya",
          description: "Permainan berjaya dikemaskini",
        });
      } else {
        const { error } = await supabase
          .from("games")
          .insert([gameData]);

        if (error) throw error;

        toast({
          title: "Berjaya",
          description: "Permainan baru berjaya ditambah",
        });
      }

      setFormData({
        game_name: "",
        game_date: new Date().toISOString().split("T")[0],
        game_type: "BLOK",
      });
      setEditingId(null);
      loadGames();
    } catch (error) {
      console.error("Error saving game:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan permainan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (game: Game) => {
    setEditingId(game.id);
    setFormData({
      game_name: game.game_name,
      game_date: game.game_date,
      game_type: game.game_type || "BLOK",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      game_name: "",
      game_date: new Date().toISOString().split("T")[0],
      game_type: "BLOK",
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("games")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: "Permainan berjaya dipadamkan",
      });

      loadGames();
    } catch (error) {
      console.error("Error deleting game:", error);
      toast({
        title: "Ralat",
        description: "Gagal memadamkan permainan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    };
    return date.toLocaleDateString("ms-MY", options);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {editingId ? "Kemaskini Permainan" : "Tambah Permainan Baru"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="game_name">Nama Permainan</Label>
                <Input
                  id="game_name"
                  type="text"
                  placeholder="Cth: Blok 1, Friendly Match"
                  value={formData.game_name}
                  onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game_date">Tarikh Permainan</Label>
                <Input
                  id="game_date"
                  type="date"
                  value={formData.game_date}
                  onChange={(e) => setFormData({ ...formData, game_date: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="game_type">Jenis Permainan</Label>
                <Input
                  id="game_type"
                  type="text"
                  placeholder="Cth: BLOK, LIGA"
                  value={formData.game_type}
                  onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {editingId ? "Kemaskini" : "Tambah"} Permainan
                  </>
                )}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Batal
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Senarai Permainan & Pemain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {games.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Tiada permainan lagi
              </p>
            ) : (
              games.map((game) => (
                <Card key={game.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default" className="text-sm">
                            {game.game_name}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {game.game_type}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(game.game_date)}</span>
                        </div>

                        {/* Player Statistics */}
                        <div className="flex items-center gap-4 text-sm bg-gray-50 p-2 rounded-md">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{game.player_count || 0} pemain berdaftar</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-pink-600" />
                            <span className="font-medium">{game.five_five_count || 0} main Five-Five</span>
                          </div>
                        </div>

                        {/* Players List */}
                        {game.players && game.players.length > 0 ? (
                          <div className="space-y-2 mt-4">
                            <p className="text-sm font-medium text-muted-foreground border-b pb-1">Senarai Pemain Terlibat:</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {game.players.map((player, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className={`px-3 py-1 text-sm font-normal ${
                                    player.is_five_five 
                                      ? "bg-pink-50 text-pink-700 border-pink-300 shadow-sm" 
                                      : "bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  {player.member_name}
                                  {player.is_five_five && (
                                    <span className="ml-1.5" title="Main Five-Five">⭐</span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                            {game.five_five_count && game.five_five_count > 0 ? (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                * Bintang (⭐) menunjukkan pemain menyertai Five-Five
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic mt-2">Belum ada pemain didaftarkan untuk permainan ini.</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(game)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteId(game.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adakah anda pasti?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak boleh dibatalkan. Ini akan memadamkan permainan dan semua skor/pemain yang berkaitan secara kekal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memadamkan...
                </>
              ) : (
                "Padam"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}