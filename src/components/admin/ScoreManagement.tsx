import { useState, useEffect } from "react";
import { gameService } from "@/services/gameService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Search } from "lucide-react";
import Image from "next/image";

type GamePlayer = {
  id: string;
  member_id: string;
  game1_score: number;
  game2_score: number;
  game3_score: number;
  game4_score: number;
  game5_score: number;
  handicap: number;
  total_score: number;
  overall_score: number;
  average_score: number;
  members: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

type Game = {
  id: string;
  game_name: string;
  game_date: string;
};

export function ScoreManagement() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<GamePlayer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingScores, setEditingScores] = useState<{ [key: string]: GamePlayer }>({});

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadGamePlayers(selectedGameId);
    }
  }, [selectedGameId]);

  useEffect(() => {
    filterPlayers();
  }, [searchQuery, players]);

  async function loadGames() {
    try {
      const data = await gameService.getAllGames();
      setGames(data as Game[]);
      if (data.length > 0) {
        setSelectedGameId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadGamePlayers(gameId: string) {
    try {
      setLoading(true);
      const data = await gameService.getGamePlayers(gameId);
      setPlayers(data as GamePlayer[]);
      setFilteredPlayers(data as GamePlayer[]);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterPlayers() {
    if (!searchQuery) {
      setFilteredPlayers(players);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = players.filter(
      (p) => p.members.username.toLowerCase().includes(query) || 
             p.members.full_name.toLowerCase().includes(query)
    );
    setFilteredPlayers(filtered);
  }

  function handleScoreChange(playerId: string, field: string, value: string) {
    const numValue = parseInt(value) || 0;
    
    setEditingScores(prev => {
      const current = prev[playerId] || players.find(p => p.id === playerId)!;
      const updated = { ...current, [field]: numValue };
      
      // Recalculate total_score and overall_score
      const total = updated.game1_score + updated.game2_score + updated.game3_score + 
                    updated.game4_score + updated.game5_score;
      updated.total_score = total;
      updated.overall_score = total + updated.handicap;
      updated.average_score = Math.round(total / 5);
      
      return { ...prev, [playerId]: updated };
    });
  }

  async function handleSave(playerId: string) {
    const updates = editingScores[playerId];
    if (!updates) return;

    setSaving(playerId);
    try {
      await gameService.updatePlayerScore(playerId, {
        game1_score: updates.game1_score,
        game2_score: updates.game2_score,
        game3_score: updates.game3_score,
        game4_score: updates.game4_score,
        game5_score: updates.game5_score,
        handicap: updates.handicap
      });

      // Reload players to get updated scores
      await loadGamePlayers(selectedGameId);
      
      // Clear editing state
      setEditingScores(prev => {
        const { [playerId]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error("Error saving score:", error);
      alert("Gagal menyimpan skor");
    } finally {
      setSaving(null);
    }
  }

  function getPlayerScore(player: GamePlayer, field: keyof GamePlayer): number {
    const editing = editingScores[player.id];
    if (editing && field in editing) {
      return editing[field] as number;
    }
    return player[field] as number;
  }

  function calculateDifference(player: GamePlayer): number {
    if (filteredPlayers.length === 0) return 0;
    const topScore = filteredPlayers[0].overall_score;
    return topScore - player.overall_score;
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
          <CardTitle className="text-2xl text-red-500">Pengurusan Skor</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedGameId} onValueChange={setSelectedGameId}>
              <SelectTrigger className="w-full sm:w-64 bg-gray-900/50 border-gray-700 text-white">
                <SelectValue placeholder="Pilih Game" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {games.map((game) => (
                  <SelectItem key={game.id} value={game.id} className="text-white">
                    {game.game_name} - {new Date(game.game_date).toLocaleDateString("ms-MY")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari pemain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="text-gray-300 sticky left-0 bg-black/90 z-10">Kedudukan</TableHead>
                <TableHead className="text-gray-300 sticky left-20 bg-black/90 z-10">Pemain</TableHead>
                <TableHead className="text-gray-300">Game 1</TableHead>
                <TableHead className="text-gray-300">Game 2</TableHead>
                <TableHead className="text-gray-300">Game 3</TableHead>
                <TableHead className="text-gray-300">Game 4</TableHead>
                <TableHead className="text-gray-300">Game 5</TableHead>
                <TableHead className="text-gray-300">Total</TableHead>
                <TableHead className="text-gray-300">Handicap</TableHead>
                <TableHead className="text-gray-300">Overall</TableHead>
                <TableHead className="text-gray-300">Beza</TableHead>
                <TableHead className="text-gray-300">Purata</TableHead>
                <TableHead className="text-gray-300">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((player, index) => (
                <TableRow key={player.id} className="border-gray-800">
                  <TableCell className="text-white font-bold sticky left-0 bg-black/90 z-10">
                    #{index + 1}
                  </TableCell>
                  <TableCell className="sticky left-20 bg-black/90 z-10">
                    <div className="flex items-center gap-2">
                      {player.members.avatar_url ? (
                        <Image 
                          src={player.members.avatar_url} 
                          alt={player.members.username} 
                          width={32} 
                          height={32} 
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                          {player.members.username[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">{player.members.username}</div>
                        <div className="text-gray-400 text-xs">{player.members.full_name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={getPlayerScore(player, "game1_score")}
                      onChange={(e) => handleScoreChange(player.id, "game1_score", e.target.value)}
                      className="w-20 bg-gray-800 border-gray-700 text-white text-center"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={getPlayerScore(player, "game2_score")}
                      onChange={(e) => handleScoreChange(player.id, "game2_score", e.target.value)}
                      className="w-20 bg-gray-800 border-gray-700 text-white text-center"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={getPlayerScore(player, "game3_score")}
                      onChange={(e) => handleScoreChange(player.id, "game3_score", e.target.value)}
                      className="w-20 bg-gray-800 border-gray-700 text-white text-center"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={getPlayerScore(player, "game4_score")}
                      onChange={(e) => handleScoreChange(player.id, "game4_score", e.target.value)}
                      className="w-20 bg-gray-800 border-gray-700 text-white text-center"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={getPlayerScore(player, "game5_score")}
                      onChange={(e) => handleScoreChange(player.id, "game5_score", e.target.value)}
                      className="w-20 bg-gray-800 border-gray-700 text-white text-center"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </TableCell>
                  <TableCell className="text-white font-bold">
                    {getPlayerScore(player, "total_score")}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={getPlayerScore(player, "handicap")}
                      onChange={(e) => handleScoreChange(player.id, "handicap", e.target.value)}
                      className="w-20 bg-gray-800 border-gray-700 text-white text-center"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </TableCell>
                  <TableCell className="text-red-500 font-bold">
                    {getPlayerScore(player, "overall_score")}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    -{calculateDifference(player)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {getPlayerScore(player, "average_score")}
                  </TableCell>
                  <TableCell>
                    {editingScores[player.id] && (
                      <Button
                        size="sm"
                        onClick={() => handleSave(player.id)}
                        disabled={saving === player.id}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {saving === player.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                      </Button>
                    )}
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