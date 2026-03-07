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
  const [sortField, setSortField] = useState<string>("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  function handleSort(field: string) {
    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);

    const sorted = [...filteredPlayers].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      if (field === "rank") {
        aValue = filteredPlayers.indexOf(a);
        bValue = filteredPlayers.indexOf(b);
      } else if (field === "username") {
        aValue = a.members.username.toLowerCase();
        bValue = b.members.username.toLowerCase();
      } else if (field === "fullname") {
        aValue = a.members.full_name.toLowerCase();
        bValue = b.members.full_name.toLowerCase();
      } else {
        aValue = getPlayerScore(a, field as keyof GamePlayer);
        bValue = getPlayerScore(b, field as keyof GamePlayer);
      }

      if (newDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPlayers(sorted);
  }

  function getSortIcon(field: string) {
    if (sortField !== field) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    return sortDirection === "asc" ? 
      <span className="text-red-600 ml-1">↑</span> : 
      <span className="text-red-600 ml-1">↓</span>;
  }

  function handleScoreChange(playerId: string, field: string, value: string) {
    const numValue = parseInt(value) || 0;
    
    setEditingScores(prev => {
      const current = prev[playerId] || players.find(p => p.id === playerId)!;
      const updated = { ...current, [field]: numValue };
      
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

      await loadGamePlayers(selectedGameId);
      
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("rank")}
                        className="flex items-center hover:text-red-600 transition-colors"
                      >
                        Rank {getSortIcon("rank")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("username")}
                        className="flex items-center hover:text-red-600 transition-colors"
                      >
                        Player {getSortIcon("username")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("game1_score")}
                        className="flex items-center justify-center w-full hover:text-blue-600 transition-colors"
                      >
                        Game 1 {getSortIcon("game1_score")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("game2_score")}
                        className="flex items-center justify-center w-full hover:text-green-600 transition-colors"
                      >
                        Game 2 {getSortIcon("game2_score")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("game3_score")}
                        className="flex items-center justify-center w-full hover:text-purple-600 transition-colors"
                      >
                        Game 3 {getSortIcon("game3_score")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("game4_score")}
                        className="flex items-center justify-center w-full hover:text-orange-600 transition-colors"
                      >
                        Game 4 {getSortIcon("game4_score")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("game5_score")}
                        className="flex items-center justify-center w-full hover:text-pink-600 transition-colors"
                      >
                        Game 5 {getSortIcon("game5_score")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("handicap")}
                        className="flex items-center justify-center w-full hover:text-yellow-600 transition-colors"
                      >
                        Handicap {getSortIcon("handicap")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("total_score")}
                        className="flex items-center justify-center w-full hover:text-gray-900 transition-colors"
                      >
                        Total {getSortIcon("total_score")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("overall_score")}
                        className="flex items-center justify-center w-full hover:text-red-600 transition-colors"
                      >
                        Overall {getSortIcon("overall_score")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("average_score")}
                        className="flex items-center justify-center w-full hover:text-gray-900 transition-colors"
                      >
                        Average {getSortIcon("average_score")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Diff
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredPlayers.map((player, index) => {
                    const hasChanges = !!editingScores[player.id];
                    return (
                      <tr 
                        key={player.id} 
                        className={`transition-colors ${
                          hasChanges 
                            ? 'bg-yellow-50' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`font-bold ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-3">
                            {player.members.avatar_url ? (
                              <Image 
                                src={player.members.avatar_url} 
                                alt={player.members.username} 
                                width={32} 
                                height={32} 
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">
                                {player.members.username[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-gray-900 font-medium">{player.members.username}</div>
                              <div className="text-gray-500 text-xs">{player.members.full_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game1_score")}
                            onChange={(e) => handleScoreChange(player.id, "game1_score", e.target.value)}
                            className="w-20 h-9 bg-blue-50 border border-blue-200 text-blue-900 text-center mx-auto font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game2_score")}
                            onChange={(e) => handleScoreChange(player.id, "game2_score", e.target.value)}
                            className="w-20 h-9 bg-green-50 border border-green-200 text-green-900 text-center mx-auto font-medium focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game3_score")}
                            onChange={(e) => handleScoreChange(player.id, "game3_score", e.target.value)}
                            className="w-20 h-9 bg-purple-50 border border-purple-200 text-purple-900 text-center mx-auto font-medium focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game4_score")}
                            onChange={(e) => handleScoreChange(player.id, "game4_score", e.target.value)}
                            className="w-20 h-9 bg-orange-50 border border-orange-200 text-orange-900 text-center mx-auto font-medium focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game5_score")}
                            onChange={(e) => handleScoreChange(player.id, "game5_score", e.target.value)}
                            className="w-20 h-9 bg-pink-50 border border-pink-200 text-pink-900 text-center mx-auto font-medium focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "handicap")}
                            onChange={(e) => handleScoreChange(player.id, "handicap", e.target.value)}
                            className="w-20 h-9 bg-yellow-50 border border-yellow-300 text-yellow-900 text-center mx-auto font-semibold focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 font-semibold">
                          {getPlayerScore(player, "total_score")}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-red-600 font-bold">
                          {getPlayerScore(player, "overall_score")}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700 font-medium">
                          {getPlayerScore(player, "average_score")}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-500">
                          -{calculateDifference(player)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {hasChanges && (
                            <Button
                              size="sm"
                              onClick={() => handleSave(player.id)}
                              disabled={saving === player.id}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              {saving === player.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredPlayers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No scores found for this game</p>
                <p className="text-gray-500 text-sm mt-1">Try selecting a different game or add players first</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}