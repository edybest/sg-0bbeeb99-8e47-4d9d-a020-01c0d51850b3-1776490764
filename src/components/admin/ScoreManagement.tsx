import { useState, useEffect } from "react";
import { gameService } from "@/services/gameService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  game_type: string;
  year: number;
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
      setGames(data as unknown as Game[]);
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
      setPlayers(data as unknown as GamePlayer[]);
      setFilteredPlayers(data as unknown as GamePlayer[]);
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
      await gameService.updatePlayerScores(playerId, {
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
    const topScore = filteredPlayers.reduce((max, p) => Math.max(max, p.overall_score), 0);
    return topScore - player.overall_score;
  }

  if (loading && !selectedGameId) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Score Management</h2>
          <p className="text-gray-600 mt-1">Edit player scores for games</p>
        </div>
      </div>

      {/* Game Selection */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Game</label>
              <select
                value={selectedGameId || ""}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Choose a game...</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.game_name} - {new Date(game.game_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {selectedGameId && (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-white border-gray-300 text-gray-900"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scores Table */}
      {selectedGameId && (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
                    <th className="sticky left-16 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Player</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">G1</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">G2</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">G3</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">G4</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">G5</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">HCP</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Overall</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Diff</th>
                    <th className="sticky right-0 z-10 bg-gray-50 px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredPlayers.map((player, index) => (
                    <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                      <td className="text-gray-900 font-bold sticky left-0 bg-white z-10">
                        #{index + 1}
                      </td>
                      <td className="sticky left-16 bg-white z-10">
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
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                              {player.members.username[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-gray-900 font-medium">{player.members.username}</div>
                            <div className="text-gray-500 text-xs">{player.members.full_name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={getPlayerScore(player, "game1_score")}
                          onChange={(e) => handleScoreChange(player.id, "game1_score", e.target.value)}
                          className="w-16 bg-white border-gray-300 text-gray-900 text-center mx-auto"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={getPlayerScore(player, "game2_score")}
                          onChange={(e) => handleScoreChange(player.id, "game2_score", e.target.value)}
                          className="w-16 bg-white border-gray-300 text-gray-900 text-center mx-auto"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={getPlayerScore(player, "game3_score")}
                          onChange={(e) => handleScoreChange(player.id, "game3_score", e.target.value)}
                          className="w-16 bg-white border-gray-300 text-gray-900 text-center mx-auto"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={getPlayerScore(player, "game4_score")}
                          onChange={(e) => handleScoreChange(player.id, "game4_score", e.target.value)}
                          className="w-16 bg-white border-gray-300 text-gray-900 text-center mx-auto"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={getPlayerScore(player, "game5_score")}
                          onChange={(e) => handleScoreChange(player.id, "game5_score", e.target.value)}
                          className="w-16 bg-white border-gray-300 text-gray-900 text-center mx-auto"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </td>
                      <td className="text-gray-900 font-bold text-center">
                        <Input
                          type="number"
                          value={getPlayerScore(player, "handicap")}
                          onChange={(e) => handleScoreChange(player.id, "handicap", e.target.value)}
                          className="w-16 bg-white border-gray-300 text-gray-900 text-center mx-auto"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </td>
                      <td className="text-gray-700 font-bold text-center">
                        {getPlayerScore(player, "total_score")}
                      </td>
                      <td className="text-red-600 font-bold text-center">
                        {getPlayerScore(player, "overall_score")}
                      </td>
                      <td className="text-gray-600 text-center">
                        {getPlayerScore(player, "average_score")}
                      </td>
                      <td className="text-gray-500 text-center">
                        -{calculateDifference(player)}
                      </td>
                      <td className="text-right">
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
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPlayers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No scores found for this game</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}