import { useState, useEffect, useRef } from "react";
import { coupleService } from "@/services/coupleService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, Heart, Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoupleScoreEntryProps {
  selectedGameId: string;
}

export function CoupleScoreEntry({ selectedGameId }: CoupleScoreEntryProps) {
  const [couples, setCouples] = useState<any[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string>("");
  const [coupleScores, setCoupleScores] = useState<any[]>([]);
  const [editingCoupleScore, setEditingCoupleScore] = useState<any>(null);
  const [savingCouple, setSavingCouple] = useState(false);
  const [loadingCoupleScores, setLoadingCoupleScores] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listeningField, setListeningField] = useState<string | null>(null);
  const { toast } = useToast();

  // Refs for auto-focus
  const game1Ref = useRef<HTMLInputElement>(null);
  const game2Ref = useRef<HTMLInputElement>(null);
  const game3Ref = useRef<HTMLInputElement>(null);
  const game4Ref = useRef<HTMLInputElement>(null);
  const game5Ref = useRef<HTMLInputElement>(null);
  const game6Ref = useRef<HTMLInputElement>(null);
  const handicapRef = useRef<HTMLInputElement>(null);
  
  // Voice recognition ref
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadCouples();
    
    // Initialize Web Speech API
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'ms-MY'; // Malay language
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceResult(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setListeningField(null);
        toast({
          title: "Ralat Suara",
          description: "Gagal menangkap suara. Sila cuba lagi.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setListeningField(null);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadCoupleScores(selectedGameId);
    }
  }, [selectedGameId]);

  useEffect(() => {
    // Auto-focus on Game 1 input when couple is selected
    if (selectedCoupleId && game1Ref.current) {
      setTimeout(() => {
        game1Ref.current?.focus();
      }, 100);
    }
  }, [selectedCoupleId]);

  async function loadCouples() {
    try {
      const data = await coupleService.getAllCouples();
      setCouples(data);
    } catch (error) {
      console.error("Error loading couples:", error);
    }
  }

  const loadCoupleScores = async (gameId: string) => {
    setLoadingCoupleScores(true);
    try {
      const scores = await coupleService.getCoupleScoresByGame(gameId);
      // Sort by overall_score descending (highest first)
      const sortedScores = scores.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
      setCoupleScores(sortedScores);
    } catch (error) {
      console.error("Error loading couple scores:", error);
      toast({
        title: "Error",
        description: "Failed to load couple scores",
        variant: "destructive",
      });
    } finally {
      setLoadingCoupleScores(false);
    }
  };

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

  const startVoiceInput = (field: string, nextRef: React.RefObject<HTMLInputElement> | null) => {
    if (!recognitionRef.current) {
      toast({
        title: "Tidak Disokong",
        description: "Pelayar anda tidak menyokong input suara.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsListening(true);
      setListeningField(field);
      recognitionRef.current.start();
      
      // Store next ref for auto-advance
      (recognitionRef.current as any).nextRef = nextRef;
      (recognitionRef.current as any).currentField = field;
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      setIsListening(false);
      setListeningField(null);
    }
  };

  const handleVoiceResult = (transcript: string) => {
    const field = (recognitionRef.current as any).currentField;
    const nextRef = (recognitionRef.current as any).nextRef;
    
    if (!field) return;

    // Extract numbers from transcript
    const numberMatch = transcript.match(/\d+/);
    if (numberMatch) {
      const value = numberMatch[0];
      handleCoupleScoreChange(field, value, nextRef);
      
      toast({
        title: "Suara Ditangkap",
        description: `Markah "${value}" telah dimasukkan`,
      });
    } else {
      toast({
        title: "Tiada Nombor",
        description: "Sila sebut nombor markah dengan jelas",
        variant: "destructive",
      });
    }
  };

  function handleCoupleScoreChange(field: string, value: string, nextRef: React.RefObject<HTMLInputElement> | null = null) {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(numValue)) return;
    
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

    // Auto-advance to next input if 3 digits are typed
    if (value.length === 3 && nextRef && nextRef.current) {
      nextRef.current.focus();
      setTimeout(() => {
        nextRef.current?.select();
      }, 10);
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startingField: string) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, ''); // Extract only numbers
    if (!pastedText) return;

    const fields = [
      'game1_score', 'game2_score', 'game3_score', 
      'game4_score', 'game5_score', 'game6_score'
    ];
    
    const startIndex = fields.indexOf(startingField);
    if (startIndex === -1) return;

    setEditingCoupleScore((prev: any) => {
      const current = prev || {
        game1_score: 0, game2_score: 0, game3_score: 0,
        game4_score: 0, game5_score: 0, game6_score: 0,
        handicap: 0,
      };
      
      const updated = { ...current };
      
      let charIndex = 0;
      let lastUpdatedIndex = startIndex;
      
      for (let i = startIndex; i < fields.length; i++) {
        if (charIndex >= pastedText.length) break;
        
        // Take up to 3 digits per game
        const chunk = pastedText.slice(charIndex, charIndex + 3);
        updated[fields[i]] = parseInt(chunk, 10);
        charIndex += chunk.length;
        lastUpdatedIndex = i;
      }

      // Recalculate totals
      const total = (updated.game1_score || 0) + (updated.game2_score || 0) + 
                    (updated.game3_score || 0) + (updated.game4_score || 0) + 
                    (updated.game5_score || 0) + (updated.game6_score || 0);
      updated.total_score = total;
      updated.overall_score = total + (updated.handicap || 0);

      // Focus the next available input after paste
      setTimeout(() => {
        const refs = [game1Ref, game2Ref, game3Ref, game4Ref, game5Ref, game6Ref, handicapRef];
        const nextRefToFocus = refs[lastUpdatedIndex + 1] || handicapRef;
        if (nextRefToFocus && nextRefToFocus.current) {
          nextRefToFocus.current.focus();
          nextRefToFocus.current.select();
        }
      }, 50);

      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement> | null) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  };

  if (!selectedGameId) return null;

  return (
    <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-600" />
          Couple Score Entry (Manual Override)
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
                <label className="block text-sm font-medium mb-1">
                  Game 1
                </label>
                <div className="relative">
                  <Input
                    ref={game1Ref}
                    type="number"
                    value={editingCoupleScore.game1_score || ""}
                    onChange={(e) => handleCoupleScoreChange("game1_score", e.target.value, game2Ref)}
                    onKeyDown={(e) => handleKeyDown(e, game2Ref)}
                    onPaste={(e) => handlePaste(e, "game1_score")}
                    onFocus={(e) => e.target.select()}
                    className="text-center focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput("game1_score", game2Ref)}
                    disabled={isListening && listeningField !== "game1_score"}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                      isListening && listeningField === "game1_score"
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {isListening && listeningField === "game1_score" ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Game 2
                </label>
                <div className="relative">
                  <Input
                    ref={game2Ref}
                    type="number"
                    value={editingCoupleScore.game2_score || ""}
                    onChange={(e) => handleCoupleScoreChange("game2_score", e.target.value, game3Ref)}
                    onKeyDown={(e) => handleKeyDown(e, game3Ref)}
                    onPaste={(e) => handlePaste(e, "game2_score")}
                    onFocus={(e) => e.target.select()}
                    className="text-center focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput("game2_score", game3Ref)}
                    disabled={isListening && listeningField !== "game2_score"}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                      isListening && listeningField === "game2_score"
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {isListening && listeningField === "game2_score" ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Game 3
                </label>
                <div className="relative">
                  <Input
                    ref={game3Ref}
                    type="number"
                    value={editingCoupleScore.game3_score || ""}
                    onChange={(e) => handleCoupleScoreChange("game3_score", e.target.value, game4Ref)}
                    onKeyDown={(e) => handleKeyDown(e, game4Ref)}
                    onPaste={(e) => handlePaste(e, "game3_score")}
                    onFocus={(e) => e.target.select()}
                    className="text-center focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput("game3_score", game4Ref)}
                    disabled={isListening && listeningField !== "game3_score"}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                      isListening && listeningField === "game3_score"
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {isListening && listeningField === "game3_score" ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Game 4
                </label>
                <div className="relative">
                  <Input
                    ref={game4Ref}
                    type="number"
                    value={editingCoupleScore.game4_score || ""}
                    onChange={(e) => handleCoupleScoreChange("game4_score", e.target.value, game5Ref)}
                    onKeyDown={(e) => handleKeyDown(e, game5Ref)}
                    onPaste={(e) => handlePaste(e, "game4_score")}
                    onFocus={(e) => e.target.select()}
                    className="text-center focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput("game4_score", game5Ref)}
                    disabled={isListening && listeningField !== "game4_score"}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                      isListening && listeningField === "game4_score"
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {isListening && listeningField === "game4_score" ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Game 5
                </label>
                <div className="relative">
                  <Input
                    ref={game5Ref}
                    type="number"
                    value={editingCoupleScore.game5_score || ""}
                    onChange={(e) => handleCoupleScoreChange("game5_score", e.target.value, game6Ref)}
                    onKeyDown={(e) => handleKeyDown(e, game6Ref)}
                    onPaste={(e) => handlePaste(e, "game5_score")}
                    onFocus={(e) => e.target.select()}
                    className="text-center focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput("game5_score", game6Ref)}
                    disabled={isListening && listeningField !== "game5_score"}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                      isListening && listeningField === "game5_score"
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {isListening && listeningField === "game5_score" ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Game 6
                </label>
                <div className="relative">
                  <Input
                    ref={game6Ref}
                    type="number"
                    value={editingCoupleScore.game6_score || ""}
                    onChange={(e) => handleCoupleScoreChange("game6_score", e.target.value, null)}
                    onKeyDown={(e) => handleKeyDown(e, handicapRef)}
                    onPaste={(e) => handlePaste(e, "game6_score")}
                    onFocus={(e) => e.target.select()}
                    className="text-center focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => startVoiceInput("game6_score", handicapRef)}
                    disabled={isListening && listeningField !== "game6_score"}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                      isListening && listeningField === "game6_score"
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {isListening && listeningField === "game6_score" ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Handicap, Total, Overall */}
          {selectedCoupleId && editingCoupleScore && (
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-pink-200">
              <div>
                <label className="block text-xs font-medium text-yellow-700 mb-1">Handicap (N/A)</label>
                <Input
                  type="number"
                  value={0}
                  disabled
                  className="bg-gray-100 border-gray-300 text-center font-bold text-gray-500"
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-pink-200 bg-pink-50/50">
                      <th className="text-left p-2 font-semibold text-pink-900">Rank</th>
                      <th className="text-left p-2 font-semibold text-pink-900">Couple</th>
                      <th className="text-left p-2 font-semibold text-pink-900">Players</th>
                      <th className="text-center p-2 font-semibold text-pink-900">G1</th>
                      <th className="text-center p-2 font-semibold text-pink-900">G2</th>
                      <th className="text-center p-2 font-semibold text-pink-900">G3</th>
                      <th className="text-center p-2 font-semibold text-pink-900">G4</th>
                      <th className="text-center p-2 font-semibold text-pink-900">G5</th>
                      <th className="text-center p-2 font-semibold text-pink-900">G6</th>
                      <th className="text-center p-2 font-semibold text-pink-900">Total</th>
                      <th className="text-center p-2 font-semibold text-pink-900">Hdcp</th>
                      <th className="text-center p-2 font-semibold text-pink-900">Overall</th>
                      <th className="text-right p-2 font-semibold text-pink-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupleScores.map((score, index) => {
                      const rank = index + 1;
                      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
                      
                      return (
                        <tr key={score.id} className="border-b border-pink-100 hover:bg-pink-50/30">
                          <td className="p-2 font-bold text-pink-700">
                            {medal} #{rank}
                          </td>
                          <td className="p-2 font-medium">{score.couple_name}</td>
                          <td className="p-2 text-xs text-gray-600">
                            {score.player1_name} + {score.player2_name}
                          </td>
                          <td className="p-2 text-center font-mono">{score.game1_score || 0}</td>
                          <td className="p-2 text-center font-mono">{score.game2_score || 0}</td>
                          <td className="p-2 text-center font-mono">{score.game3_score || 0}</td>
                          <td className="p-2 text-center font-mono">{score.game4_score || 0}</td>
                          <td className="p-2 text-center font-mono">{score.game5_score || 0}</td>
                          <td className="p-2 text-center font-mono">{score.game6_score || 0}</td>
                          <td className="p-2 text-center font-bold">{score.total_score || 0}</td>
                          <td className="p-2 text-center text-blue-600">{score.handicap || 0}</td>
                          <td className="p-2 text-center font-bold text-pink-700 text-lg">
                            {score.overall_score || 0}
                          </td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCoupleId(score.couple_id);
                                setEditingCoupleScore({
                                  game1_score: score.game1_score || 0,
                                  game2_score: score.game2_score || 0,
                                  game3_score: score.game3_score || 0,
                                  game4_score: score.game4_score || 0,
                                  game5_score: score.game5_score || 0,
                                  game6_score: score.game6_score || 0,
                                  handicap: score.handicap || 0,
                                  total_score: score.total_score || 0,
                                  overall_score: score.overall_score || 0,
                                });
                              }}
                              className="border-pink-300 text-pink-700 hover:bg-pink-50"
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}