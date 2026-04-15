import { useState, useEffect } from "react";
import { Trophy, Plus, Trash2, Edit2, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Game = Tables<"games">;
type Member = Tables<"members">;

interface DoubleRecord {
  id: string;
  game_id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  total_score: number;
  player1?: Member;
  player2?: Member;
}

export function GameManagement() {
  const [games, setGames] = useState<Game[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDoubleDialogOpen, setIsDoubleDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [doubleRecords, setDoubleRecords] = useState<Record<string, DoubleRecord[]>>({});
  const [loadingDoubles, setLoadingDoubles] = useState<Record<string, boolean>>({});
  
  const [newGame, setNewGame] = useState({
    game_name: "",
    game_date: "",
    location: "",
  });

  const [doubleForm, setDoubleForm] = useState({
    player1_id: "",
    player2_id: "",
    player1_score: "",
    player2_score: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchGames();
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  }

  async function fetchGames() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("game_date", { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error("Error fetching games:", error);
      toast({
        title: "Error",
        description: "Failed to load games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchDoubleRecords(gameId: string) {
    try {
      setLoadingDoubles(prev => ({ ...prev, [gameId]: true }));

      const { data, error } = await (supabase as any)
        .from("double_records")
        .select(`
          *,
          player1:members!double_records_player1_id_fkey(id, username, full_name),
          player2:members!double_records_player2_id_fkey(id, username, full_name)
        `)
        .eq("game_id", gameId)
        .order("total_score", { ascending: false });

      if (error) throw error;

      setDoubleRecords(prev => ({
        ...prev,
        [gameId]: data || []
      }));
    } catch (error) {
      console.error("Error fetching double records:", error);
    } finally {
      setLoadingDoubles(prev => ({ ...prev, [gameId]: false }));
    }
  }

  async function handleAddGame() {
    if (!newGame.game_name || !newGame.game_date) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("games").insert([{
        game_name: newGame.game_name,
        game_date: newGame.game_date,
        location: newGame.location,
        year: new Date(newGame.game_date).getFullYear(),
        double_enabled: false,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Game created successfully",
      });

      setIsAddDialogOpen(false);
      setNewGame({ game_name: "", game_date: "", location: "" });
      fetchGames();
    } catch (error) {
      console.error("Error creating game:", error);
      toast({
        title: "Error",
        description: "Failed to create game",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteGame(gameId: string) {
    if (!confirm("Are you sure you want to delete this game? All related records will also be deleted.")) return;

    try {
      const { error } = await supabase
        .from("games")
        .delete()
        .eq("id", gameId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Game deleted successfully",
      });

      fetchGames();
    } catch (error) {
      console.error("Error deleting game:", error);
      toast({
        title: "Error",
        description: "Failed to delete game",
        variant: "destructive",
      });
    }
  }

  async function toggleGameDouble(gameId: string, currentValue: boolean) {
    try {
      const { error } = await supabase
        .from("games")
        .update({ double_enabled: !currentValue })
        .eq("id", gameId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Double game ${!currentValue ? "enabled" : "disabled"}`,
      });

      fetchGames();
    } catch (error) {
      console.error("Error toggling double game:", error);
      toast({
        title: "Error",
        description: "Failed to update double game setting",
        variant: "destructive",
      });
    }
  }

  async function handleAddDouble() {
    if (!selectedGame || !doubleForm.player1_id || !doubleForm.player2_id || 
        !doubleForm.player1_score || !doubleForm.player2_score) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (doubleForm.player1_id === doubleForm.player2_id) {
      toast({
        title: "Error",
        description: "Please select different players",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      const { error } = await supabase.from("double_records").insert([{
        game_id: selectedGame.id,
        player1_id: doubleForm.player1_id,
        player2_id: doubleForm.player2_id,
        player1_score: parseInt(doubleForm.player1_score),
        player2_score: parseInt(doubleForm.player2_score),
        created_by: member?.id,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Double record added successfully",
      });

      setIsDoubleDialogOpen(false);
      setDoubleForm({ player1_id: "", player2_id: "", player1_score: "", player2_score: "" });
      fetchDoubleRecords(selectedGame.id);
    } catch (error) {
      console.error("Error adding double:", error);
      toast({
        title: "Error",
        description: "Failed to add double record",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteDouble(doubleId: string, gameId: string) {
    if (!confirm("Are you sure you want to delete this double record?")) return;

    try {
      const { error } = await supabase
        .from("double_records")
        .delete()
        .eq("id", doubleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Double record deleted",
      });

      fetchDoubleRecords(gameId);
    } catch (error) {
      console.error("Error deleting double:", error);
      toast({
        title: "Error",
        description: "Failed to delete double record",
        variant: "destructive",
      });
    }
  }

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

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Game Management</h2>
          <p className="text-muted-foreground">
            Create and manage bowling games
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Game
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
              <DialogDescription>
                Add a new bowling game to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="game_name">Title *</Label>
                <Input
                  id="game_name"
                  value={newGame.game_name}
                  onChange={(e) => setNewGame({ ...newGame, game_name: e.target.value })}
                  placeholder="e.g., Weekly Tournament"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="game_date">Date & Time *</Label>
                <Input
                  id="game_date"
                  type="datetime-local"
                  value={newGame.game_date}
                  onChange={(e) => setNewGame({ ...newGame, game_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newGame.location || ""}
                  onChange={(e) => setNewGame({ ...newGame, location: e.target.value })}
                  placeholder="Bowling alley name"
                />
              </div>
              <Button onClick={handleAddGame} className="w-full">
                Create Game
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {games.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No games found. Create your first game to get started.
            </CardContent>
          </Card>
        ) : (
          games.map((game) => (
            <Card key={game.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      {game.game_name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {new Date(game.game_date).toLocaleString("ms-MY", {
                        dateStyle: "medium",
                        timeStyle: "short"
                      })}
                      {game.location && ` • ${game.location}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {game.double_enabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpandedGame(game.id)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Double Records
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGame(game.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Double Game Feature</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable to allow players to form teams of two
                    </p>
                  </div>
                  <Switch
                    checked={game.double_enabled || false}
                    onCheckedChange={() => toggleGameDouble(game.id, game.double_enabled || false)}
                  />
                </div>
              </CardHeader>

              {expandedGame === game.id && game.double_enabled && (
                <CardContent className="border-t bg-slate-50/50 dark:bg-slate-900/50 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-sm">Double Game Records</h4>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedGame(game);
                        setIsDoubleDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Record
                    </Button>
                  </div>

                  {loadingDoubles[game.id] ? (
                    <div className="text-center py-4">Loading records...</div>
                  ) : !doubleRecords[game.id] || doubleRecords[game.id].length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No double records yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {doubleRecords[game.id].map((record, index) => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border rounded-lg shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="font-bold text-muted-foreground w-6">#{index + 1}</div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate max-w-[120px]">
                                  @{record.player1?.username || "Unknown"}
                                </span>
                                <Badge variant="outline">{record.player1_score}</Badge>
                                <span className="text-muted-foreground">+</span>
                                <span className="font-medium text-sm truncate max-w-[120px]">
                                  @{record.player2?.username || "Unknown"}
                                </span>
                                <Badge variant="outline">{record.player2_score}</Badge>
                              </div>
                              <div className="text-sm font-semibold text-primary">
                                Total: {record.total_score}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteDouble(record.id, game.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDoubleDialogOpen} onOpenChange={setIsDoubleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Double Record</DialogTitle>
            <DialogDescription>
              Record a double game for {selectedGame?.game_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Player 1</Label>
                <Select
                  value={doubleForm.player1_id}
                  onValueChange={(value) => setDoubleForm({ ...doubleForm, player1_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select player 1" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={`p1-${member.id}`} value={member.id}>
                        @{member.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Score 1</Label>
                <Input
                  type="number"
                  value={doubleForm.player1_score}
                  onChange={(e) => setDoubleForm({ ...doubleForm, player1_score: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Player 2</Label>
                <Select
                  value={doubleForm.player2_id}
                  onValueChange={(value) => setDoubleForm({ ...doubleForm, player2_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select player 2" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={`p2-${member.id}`} value={member.id}>
                        @{member.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Score 2</Label>
                <Input
                  type="number"
                  value={doubleForm.player2_score}
                  onChange={(e) => setDoubleForm({ ...doubleForm, player2_score: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            {doubleForm.player1_score && doubleForm.player2_score && (
              <div className="p-3 bg-primary/10 rounded-md border border-primary/20 text-center">
                <p className="text-sm font-medium text-primary">
                  Total Score: <span className="text-xl font-bold ml-1">
                    {parseInt(doubleForm.player1_score || "0") + parseInt(doubleForm.player2_score || "0")}
                  </span>
                </p>
              </div>
            )}
            
            <Button onClick={handleAddDouble} className="w-full">
              Save Double Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}