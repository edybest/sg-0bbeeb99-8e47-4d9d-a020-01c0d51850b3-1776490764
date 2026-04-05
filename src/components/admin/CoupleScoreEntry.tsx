import { useState, useEffect } from "react";
import { coupleService } from "@/services/coupleService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, Heart } from "lucide-react";

interface CoupleScoreEntryProps {
  selectedGameId: string;
}

export function CoupleScoreEntry({ selectedGameId }: CoupleScoreEntryProps) {
  const [couples, setCouples] = useState<any[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string>("");
  const [coupleScores, setCoupleScores] = useState<any[]>([]);
  const [editingCoupleScore, setEditingCoupleScore] = useState<any>(null);
  const [savingCouple, setSavingCouple] = useState(false);

  useEffect(() => {
    loadCouples();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadCoupleScores(selectedGameId);
    }
  }, [selectedGameId]);

  async function loadCouples() {
    try {
      const data = await coupleService.getAllCouples();
      setCouples(data);
    } catch (error) {
      console.error("Error loading couples:", error);
    }
  }

  async function loadCoupleScores(gameId: string) {
    try {
      const data = await coupleService.getCoupleScoresByGame(gameId);
      setCoupleScores(data);
    } catch (error) {
      console.error("Error loading couple scores:", error);
    }
  }

  async function handleSaveCoupleScore() {
    if (!selectedCoupleId || !selectedGameId) {
      alert("Sila pilih couple dan game terlebih dahulu");
      return;
    }

    if (!editingCoupleScore) {
      alert("Tiada perubahan untuk disimpan");
      return;
    }

    setSavingCouple(true);
    try {
      await coupleService.upsertCoupleScore({
        couple_id: selectedCoupleId,
        game_id: selectedGameId,
        game1_score: editingCoupleScore.game1_score || 0,
        game2_score: editingCoupleScore.game2_score || 0,
        game3_score: editingCoupleScore.game3_score || 0,
        game4_score: editingCoupleScore.game4_score || 0,
        game5_score: editingCoupleScore.game5_score || 0,
        game6_score: editingCoupleScore.game6_score || 0,
        handicap: editingCoupleScore.handicap || 0,
        total_score: editingCoupleScore.total_score || 0,
        overall_score: editingCoupleScore.overall_score || 0,
      });

      await loadCoupleScores(selectedGameId);
      setEditingCoupleScore(null);
      setSelectedCoupleId("");
      alert("Skor couple berjaya disimpan!");
    } catch (error) {
      console.error("Error saving couple score:", error);
      alert("Gagal menyimpan skor couple");
    } finally {
      setSavingCouple(false);
    }
  }

  function handleCoupleScoreChange(field: string, value: string) {
    const numValue = parseInt(value) || 0;
    
    setEditingCoupleScore((prev: any) => {
      const current = prev || {
        game1_score: 0,
        game2_score: 0,
        game3_score: 0,
        game4_score: 0,
        game5_score: 0,
        game6_score: 0,
        handicap: 0,
      };
      
      const updated = { ...current, [field]: numValue };
      
      const total = updated.game1_score + updated.game2_score + updated.game3_score + 
                    updated.game4_score + updated.game5_score + updated.game6_score;
      updated.total_score = total;
      updated.overall_score = total + updated.handicap;
      
      return updated;
    });
  }

  if (!selectedGameId) return null;

  return (
    <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-600" />
          Couple Score Entry
        </h3>

        <div className="space-y-4">
          {/* Couple Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Couple</label>
            <select
              value={selectedCoupleId}
              onChange={(e) => {
                setSelectedCoupleId(e.target.value);
                const existing = coupleScores.find(cs => cs.couple_id === e.target.value);
                if (existing) {
                  setEditingCoupleScore({
                    game1_score: existing.game1_score || 0,
                    game2_score: existing.game2_score || 0,
                    game3_score: existing.game3_score || 0,
                    game4_score: existing.game4_score || 0,
                    game5_score: existing.game5_score || 0,
                    game6_score: existing.game6_score || 0,
                    handicap: existing.handicap || 0,
                    total_score: existing.total_score || 0,
                    overall_score: existing.overall_score || 0,
                  });
                } else {
                  setEditingCoupleScore({
                    game1_score: 0,
                    game2_score: 0,
                    game3_score: 0,
                    game4_score: 0,
                    game5_score: 0,
                    game6_score: 0,
                    handicap: 0,
                    total_score: 0,
                    overall_score: 0,
                  });
                }
              }}
              className="w-full px-4 py-2 bg-white border border-pink-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Choose a couple...</option>
              {couples.map((couple) => (
                <option key={couple.id} value={couple.id}>
                  {couple.couple_name} ({couple.player1_name} + {couple.player2_name})
                </option>
              ))}
            </select>
          </div>

          {/* Score Inputs */}
          {selectedCoupleId && editingCoupleScore && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Game 1</label>
                <Input
                  type="number"
                  value={editingCoupleScore.game1_score}
                  onChange={(e) => handleCoupleScoreChange("game1_score", e.target.value)}
                  className="bg-blue-50 border-blue-200 text-center font-bold"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">Game 2</label>
                <Input
                  type="number"
                  value={editingCoupleScore.game2_score}
                  onChange={(e) => handleCoupleScoreChange("game2_score", e.target.value)}
                  className="bg-green-50 border-green-200 text-center font-bold"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-700 mb-1">Game 3</label>
                <Input
                  type="number"
                  value={editingCoupleScore.game3_score}
                  onChange={(e) => handleCoupleScoreChange("game3_score", e.target.value)}
                  className="bg-purple-50 border-purple-200 text-center font-bold"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-orange-700 mb-1">Game 4</label>
                <Input
                  type="number"
                  value={editingCoupleScore.game4_score}
                  onChange={(e) => handleCoupleScoreChange("game4_score", e.target.value)}
                  className="bg-orange-50 border-orange-200 text-center font-bold"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-pink-700 mb-1">Game 5</label>
                <Input
                  type="number"
                  value={editingCoupleScore.game5_score}
                  onChange={(e) => handleCoupleScoreChange("game5_score", e.target.value)}
                  className="bg-pink-50 border-pink-200 text-center font-bold"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-700 mb-1">Game 6</label>
                <Input
                  type="number"
                  value={editingCoupleScore.game6_score}
                  onChange={(e) => handleCoupleScoreChange("game6_score", e.target.value)}
                  className="bg-indigo-50 border-indigo-200 text-center font-bold"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Handicap, Total, Overall */}
          {selectedCoupleId && editingCoupleScore && (
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-pink-200">
              <div>
                <label className="block text-xs font-medium text-yellow-700 mb-1">Handicap</label>
                <Input
                  type="number"
                  value={editingCoupleScore.handicap}
                  onChange={(e) => handleCoupleScoreChange("handicap", e.target.value)}
                  className="bg-yellow-50 border-yellow-200 text-center font-bold"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                <Input
                  type="number"
                  value={editingCoupleScore.total_score}
                  disabled
                  className="bg-gray-100 border-gray-300 text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-red-700 mb-1">Overall</label>
                <Input
                  type="number"
                  value={editingCoupleScore.overall_score}
                  disabled
                  className="bg-red-50 border-red-300 text-center font-bold text-red-600"
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          {selectedCoupleId && editingCoupleScore && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveCoupleScore}
                disabled={savingCouple}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                {savingCouple ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Couple Score
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Existing Couple Scores List */}
          {coupleScores.length > 0 && (
            <div className="mt-6 pt-4 border-t border-pink-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Couple Scores in This Game</h4>
              <div className="space-y-2">
                {coupleScores.map((cs) => (
                  <div key={cs.id} className="bg-white rounded-lg p-3 border-2 border-pink-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{cs.couple_name}</div>
                      <div className="text-xs text-gray-600">{cs.player1_name} + {cs.player2_name}</div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">Total: <span className="font-bold">{cs.total_score || 0}</span></span>
                      <span className="text-pink-600">Overall: <span className="font-bold">{cs.overall_score || 0}</span></span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCoupleId(cs.couple_id);
                          setEditingCoupleScore({
                            game1_score: cs.game1_score || 0,
                            game2_score: cs.game2_score || 0,
                            game3_score: cs.game3_score || 0,
                            game4_score: cs.game4_score || 0,
                            game5_score: cs.game5_score || 0,
                            game6_score: cs.game6_score || 0,
                            handicap: cs.handicap || 0,
                            total_score: cs.total_score || 0,
                            overall_score: cs.overall_score || 0,
                          });
                        }}
                        className="border-pink-300 text-pink-700 hover:bg-pink-50"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}