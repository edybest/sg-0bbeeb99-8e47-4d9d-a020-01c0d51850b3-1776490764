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
        <Card className="bg-white border-gray-200 shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="sticky left-0 z-20 bg-gray-100 px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r-2 border-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">#</span> Rank
                      </div>
                    </th>
                    <th className="sticky left-20 z-20 bg-gray-100 px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r-2 border-gray-300 min-w-[200px]">
                      Player
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 border-r border-gray-200">
                      Game 1
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-green-700 uppercase tracking-wider bg-green-50 border-r border-gray-200">
                      Game 2
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-purple-700 uppercase tracking-wider bg-purple-50 border-r border-gray-200">
                      Game 3
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-orange-700 uppercase tracking-wider bg-orange-50 border-r border-gray-200">
                      Game 4
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-pink-700 uppercase tracking-wider bg-pink-50 border-r-2 border-gray-300">
                      Game 5
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-yellow-700 uppercase tracking-wider bg-yellow-50 border-r-2 border-gray-300">
                      Handicap
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Total
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-red-700 uppercase tracking-wider bg-red-50 border-r border-gray-200">
                      Overall
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Average
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-50 border-r-2 border-gray-300">
                      Diff
                    </th>
                    <th className="sticky right-0 z-20 bg-gray-100 px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-l-2 border-gray-300">
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
                        className={`transition-all duration-200 ${
                          hasChanges 
                            ? 'bg-yellow-50 ring-2 ring-yellow-300 ring-inset' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-4 border-r-2 border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${
                              index === 0 ? 'text-yellow-500' :
                              index === 1 ? 'text-gray-400' :
                              index === 2 ? 'text-orange-600' :
                              'text-gray-600'
                            }`}>
                              #{index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="sticky left-20 z-10 bg-inherit px-6 py-4 border-r-2 border-gray-200">
                          <div className="flex items-center gap-3">
                            {player.members.avatar_url ? (
                              <Image 
                                src={player.members.avatar_url} 
                                alt={player.members.username} 
                                width={40} 
                                height={40} 
                                className="rounded-full ring-2 ring-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-base font-bold ring-2 ring-gray-200">
                                {player.members.username[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-gray-900 font-semibold">{player.members.username}</div>
                              <div className="text-gray-500 text-xs">{player.members.full_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 bg-blue-50/50 border-r border-gray-200">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game1_score")}
                            onChange={(e) => handleScoreChange(player.id, "game1_score", e.target.value)}
                            className="w-20 h-10 bg-white border-2 border-blue-200 text-blue-900 text-center mx-auto font-semibold text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-3 py-3 bg-green-50/50 border-r border-gray-200">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game2_score")}
                            onChange={(e) => handleScoreChange(player.id, "game2_score", e.target.value)}
                            className="w-20 h-10 bg-white border-2 border-green-200 text-green-900 text-center mx-auto font-semibold text-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-3 py-3 bg-purple-50/50 border-r border-gray-200">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game3_score")}
                            onChange={(e) => handleScoreChange(player.id, "game3_score", e.target.value)}
                            className="w-20 h-10 bg-white border-2 border-purple-200 text-purple-900 text-center mx-auto font-semibold text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-3 py-3 bg-orange-50/50 border-r border-gray-200">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game4_score")}
                            onChange={(e) => handleScoreChange(player.id, "game4_score", e.target.value)}
                            className="w-20 h-10 bg-white border-2 border-orange-200 text-orange-900 text-center mx-auto font-semibold text-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-3 py-3 bg-pink-50/50 border-r-2 border-gray-300">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "game5_score")}
                            onChange={(e) => handleScoreChange(player.id, "game5_score", e.target.value)}
                            className="w-20 h-10 bg-white border-2 border-pink-200 text-pink-900 text-center mx-auto font-semibold text-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-3 py-3 bg-yellow-50/50 border-r-2 border-gray-300">
                          <Input
                            type="number"
                            value={getPlayerScore(player, "handicap")}
                            onChange={(e) => handleScoreChange(player.id, "handicap", e.target.value)}
                            className="w-20 h-10 bg-white border-2 border-yellow-300 text-yellow-900 text-center mx-auto font-bold text-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                            onFocus={(e) => e.target.select()}
                          />
                        </td>
                        <td className="px-4 py-4 bg-gray-50/50 border-r border-gray-200">
                          <div className="text-gray-900 font-bold text-lg text-center">
                            {getPlayerScore(player, "total_score")}
                          </div>
                        </td>
                        <td className="px-4 py-4 bg-red-50/50 border-r border-gray-200">
                          <div className="text-red-600 font-bold text-xl text-center">
                            {getPlayerScore(player, "overall_score")}
                          </div>
                        </td>
                        <td className="px-4 py-4 bg-gray-50/50 border-r border-gray-200">
                          <div className="text-gray-600 font-semibold text-base text-center">
                            {getPlayerScore(player, "average_score")}
                          </div>
                        </td>
                        <td className="px-4 py-4 bg-gray-50/50 border-r-2 border-gray-300">
                          <div className="text-gray-500 font-medium text-base text-center">
                            -{calculateDifference(player)}
                          </div>
                        </td>
                        <td className="sticky right-0 z-10 bg-inherit px-4 py-4 text-center border-l-2 border-gray-200">
                          {hasChanges && (
                            <Button
                              size="sm"
                              onClick={() => handleSave(player.id)}
                              disabled={saving === player.id}
                              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200"
                            >
                              {saving === player.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
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
              <div className="text-center py-16">
                <div className="text-gray-400 text-5xl mb-4">🎯</div>
                <p className="text-gray-600 text-lg font-medium">No scores found for this game</p>
                <p className="text-gray-400 text-sm mt-2">Try selecting a different game or add players first</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}