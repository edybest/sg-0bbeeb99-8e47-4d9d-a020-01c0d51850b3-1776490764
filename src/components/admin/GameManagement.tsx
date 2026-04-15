import { useState, useEffect } from "react";
import { 
  Trophy, Plus, Trash2, Save, Users, Calendar, Clock, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

interface GamePlayers {
  players: Member[];
  doubles: DoubleRecord[];
}

export function GameManagement() {
  const [games, setGames] = useState<Game[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [gamePlayers, setGamePlayers] = useState<Record<string, GamePlayers>>({});
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState<Record<string, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDoubleDialogOpen, setIsDoubleDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  
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
        .order("username");

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

  async function fetchGamePlayers(gameId: string) {
    try {
      setLoadingPlayers(prev => ({ ...prev, [gameId]: true }));

      // Fetch players who played this game
      const { data: playersData, error: playersError } = await supabase
        .from("game_players")
        .select(`
          member_id,
          members:member_id (*)
        `)
        .eq("game_id", gameId);

      if (playersError) throw playersError;

      // Fetch double records
      const { data: doublesData, error: doublesError } = await (supabase as any)
        .from("double_records")
        .select(`
          *,
          player1:members!double_records_player1_id_fkey(id, username, full_name),
          player2:members!double_records_player2_id_fkey(id, username, full_name)
        `)
        .eq("game_id", gameId)
        .order("total_score", { ascending: false });

      if (doublesError) throw doublesError;

      // Extract unique players
      const players = (playersData || [])
        .map((p: any) => p.members)
        .filter((m: any) => m !== null);

      setGamePlayers(prev => ({
        ...prev,
        [gameId]: {
          players: players as Member[],
          doubles: (doublesData as any) || [],
        }
      }));
    } catch (error) {
      console.error("Error fetching game players:", error);
      toast({
        title: "Error",
        description: "Failed to load game players",
        variant: "destructive",
      });
    } finally {
      setLoadingPlayers(prev => ({ ...prev, [gameId]: false }));
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
      const { data: { user } } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      const { error } = await supabase.from("games").insert([{
        game_name: newGame.game_name,
        game_date: newGame.game_date,
        location: newGame.location,
        year: new Date(newGame.game_date).getFullYear(),
        double_enabled: false,
        created_by: member?.id,
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

  async function toggleGameDouble(gameId: string, currentValue: boolean) {
    try {
      const { error } = await supabase
        .from("games")
        .update({ double_enabled: !currentValue })
        .eq("id", gameId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Double ${!currentValue ? "enabled" : "disabled"} for this game`,
      });

      fetchGames();
    } catch (error) {
      console.error("Error toggling double:", error);
      toast({
        title: "Error",
        description: "Failed to update double setting",
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
      if (expandedGame === selectedGame.id) {
        fetchGamePlayers(selectedGame.id);
      }
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

      fetchGamePlayers(gameId);
    } catch (error) {
      console.error("Error deleting double:", error);
      toast({
        title: "Error",
        description: "Failed to delete double record",
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

  const toggleGameExpanded = async (gameId: string) => {
    if (expandedGame === gameId) {
      setExpandedGame(null);
    } else {
      setExpandedGame(gameId);
      await fetchGamePlayers(gameId);
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
                <Save className="mr-2 h-4 w-4" />
                Create Game
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Games List */}
      <div className="space-y-4">
        {games.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No games found. Create your first game to get started.
            </CardContent>
          </Card>
        ) : (
          games.map((game) => {
            const players = gamePlayers[game.id];
            const isLoading = loadingPlayers[game.id];

            return (
              <Card key={game.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          {game.game_name}
                        </CardTitle>
                        {game.double_enabled && (
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            Double Enabled
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(game.game_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {game.location && (
                            <span className="flex items-center gap-1">
                              📍 {game.location}
                            </span>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGame(game.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Double Game Controls */}
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <Label htmlFor={`double-${game.id}`}>Double Game</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Enable players to compete in doubles
                        </p>
                      </div>
                      <Switch
                        id={`double-${game.id}`}
                        checked={game.double_enabled || false}
                        onCheckedChange={() => toggleGameDouble(game.id, game.double_enabled || false)}
                      />
                    </div>

                    {game.double_enabled && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleGameExpanded(game.id)}
                        >
                          {expandedGame === game.id ? "Hide" : "Show"} Double Records
                          {players?.doubles && players.doubles.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {players.doubles.length}
                            </Badge>
                          )}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedGame(game);
                            setIsDoubleDialogOpen(true);
                            if (!players) {
                              fetchGamePlayers(game.id);
                            }
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Double
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Expanded Double Records */}
                {expandedGame === game.id && game.double_enabled && (
                  <CardContent className="border-t">
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : !players?.doubles || players.doubles.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No double records yet</p>
                        <p className="text-sm mt-1">Add the first double record for this game</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="font-semibold mb-3">Double Records ({players.doubles.length})</h4>
                        {players.doubles.map((record, index) => (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-4">
                              <Badge variant="outline" className="text-lg font-bold w-12 justify-center">
                                #{index + 1}
                              </Badge>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    @{record.player1?.username || "Unknown"}
                                  </span>
                                  <Badge variant="secondary">{record.player1_score}</Badge>
                                  <span className="text-muted-foreground">+</span>
                                  <span className="font-medium">
                                    @{record.player2?.username || "Unknown"}
                                  </span>
                                  <Badge variant="secondary">{record.player2_score}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Total: <span className="font-bold text-primary">{record.total_score}</span>
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDouble(record.id, game.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Add Double Dialog */}
      <Dialog open={isDoubleDialogOpen} onOpenChange={setIsDoubleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Double Record</DialogTitle>
            <DialogDescription>
              Record a double game for {selectedGame?.game_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player1">Player 1 *</Label>
              <Select
                value={doubleForm.player1_id}
                onValueChange={(value) => setDoubleForm({ ...doubleForm, player1_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select player 1" />
                </SelectTrigger>
                <SelectContent>
                  {(gamePlayers[selectedGame?.id || ""]?.players || members).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      @{member.username} ({member.full_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="player1_score">Player 1 Score *</Label>
              <Input
                id="player1_score"
                type="number"
                value={doubleForm.player1_score}
                onChange={(e) => setDoubleForm({ ...doubleForm, player1_score: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player2">Player 2 *</Label>
              <Select
                value={doubleForm.player2_id}
                onValueChange={(value) => setDoubleForm({ ...doubleForm, player2_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select player 2" />
                </SelectTrigger>
                <SelectContent>
                  {(gamePlayers[selectedGame?.id || ""]?.players || members).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      @{member.username} ({member.full_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="player2_score">Player 2 Score *</Label>
              <Input
                id="player2_score"
                type="number"
                value={doubleForm.player2_score}
                onChange={(e) => setDoubleForm({ ...doubleForm, player2_score: e.target.value })}
                placeholder="0"
              />
            </div>
            {doubleForm.player1_score && doubleForm.player2_score && (
              <div className="p-3 bg-primary/10 rounded-md">
                <p className="text-sm font-medium">
                  Total Combined Score: 
                  <span className="text-lg font-bold text-primary ml-2">
                    {parseInt(doubleForm.player1_score || "0") + parseInt(doubleForm.player2_score || "0")}
                  </span>
                </p>
              </div>
            )}
            <Button onClick={handleAddDouble} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Add Double Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}