import { useState, useEffect } from "react";
import { gameService } from "@/services/gameService";
import { memberService } from "@/services/memberService";
import { coupleService } from "@/services/coupleService";
import { CoupleScoreEntry } from "./CoupleScoreEntry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Search, Upload, X, Check, AlertCircle, AlertTriangle, Info, RefreshCw, FileText, Sparkles, Heart } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";

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
  clean_game?: boolean;
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

type Member = {
  id: string;
  username: string;
  full_name: string;
};

type ParsedScore = {
  name: string;
  scores: {
    game1?: number;
    game2?: number;
    game3?: number;
    game4?: number;
    game5?: number;
  };
  handicap?: number;
  fivefive?: boolean;
  date?: string;
  confidence: number;
  matchedMember?: Member;
  matchConfidence?: number;
};

type OCRResult = {
  success: boolean;
  text?: string;
  confidence?: number;
  scores?: ParsedScore[];
  error?: string;
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

  // Image upload states
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [parsedScores, setParsedScores] = useState<ParsedScore[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [showRawText, setShowRawText] = useState(false);

  // Couple score states
  const [couples, setCouples] = useState<any[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string>("");
  const [coupleScores, setCoupleScores] = useState<any[]>([]);
  const [editingCoupleScore, setEditingCoupleScore] = useState<any>(null);
  const [savingCouple, setSavingCouple] = useState(false);

  // CSV upload states
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [uploadedCsv, setUploadedCsv] = useState<File | null>(null);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvParsedScores, setCsvParsedScores] = useState<ParsedScore[]>([]);

  const [cleanGameWinners, setCleanGameWinners] = useState<{
    game1: string[];
    game2: string[];
    game3: string[];
    game4: string[];
    game5: string[];
  }>({ game1: [], game2: [], game3: [], game4: [], game5: [] });

  useEffect(() => {
    loadGames();
    loadAllMembers();
    loadCouples();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadGamePlayers(selectedGameId);
      loadCoupleScores(selectedGameId);
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

  async function loadAllMembers() {
    try {
      const data = await memberService.getAllMembers();
      setAllMembers(data.map((m: any) => ({
        id: m.id,
        username: m.username,
        full_name: m.full_name
      })));
    } catch (error) {
      console.error("Error loading members:", error);
    }
  }

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

  async function loadGamePlayers(gameId: string) {
    try {
      setLoading(true);
      const data = await gameService.getGamePlayers(gameId);
      
      const playersData = data as unknown as GamePlayer[];
      const sortedData = [...playersData].sort((a, b) => {
        if (a.overall_score !== b.overall_score) return b.overall_score - a.overall_score;
        if (a.game5_score !== b.game5_score) return b.game5_score - a.game5_score;
        if (a.game4_score !== b.game4_score) return b.game4_score - a.game4_score;
        if (a.game3_score !== b.game3_score) return b.game3_score - a.game3_score;
        if (a.game2_score !== b.game2_score) return b.game2_score - a.game2_score;
        return b.game1_score - a.game1_score;
      });

      setPlayers(sortedData);
      setFilteredPlayers(sortedData);
      setSortField("rank");
      setSortDirection("asc");
      
      await loadCleanGameWinners(gameId);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCleanGameWinners(gameId: string) {
    try {
      const { data, error } = await supabase
        .from("games")
        .select("clean_game_data")
        .eq("id", gameId)
        .single();

      if (error) throw error;

      const cleanGameData = data?.clean_game_data as any;
      setCleanGameWinners({
        game1: cleanGameData?.game1 || [],
        game2: cleanGameData?.game2 || [],
        game3: cleanGameData?.game3 || [],
        game4: cleanGameData?.game4 || [],
        game5: cleanGameData?.game5 || [],
      });
    } catch (error) {
      console.error("Error loading clean game winners:", error);
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
      if (field === "rank" || field === "overall_score" || field === "total_score") {
        const mult = newDirection === "asc" ? -1 : 1;
        
        const pA = field === "rank" ? getPlayerScore(a, "overall_score") : getPlayerScore(a, field as keyof GamePlayer);
        const pB = field === "rank" ? getPlayerScore(b, "overall_score") : getPlayerScore(b, field as keyof GamePlayer);
        
        if (pA !== pB) return (pA - pB) * mult;

        const g5A = getPlayerScore(a, "game5_score");
        const g5B = getPlayerScore(b, "game5_score");
        if (g5A !== g5B) return (g5A - g5B) * mult;

        const g4A = getPlayerScore(a, "game4_score");
        const g4B = getPlayerScore(b, "game4_score");
        if (g4A !== g4B) return (g4A - g4B) * mult;

        const g3A = getPlayerScore(a, "game3_score");
        const g3B = getPlayerScore(b, "game3_score");
        if (g3A !== g3B) return (g3A - g3B) * mult;

        const g2A = getPlayerScore(a, "game2_score");
        const g2B = getPlayerScore(b, "game2_score");
        if (g2A !== g2B) return (g2A - g2B) * mult;

        const g1A = getPlayerScore(a, "game1_score");
        const g1B = getPlayerScore(b, "game1_score");
        return (g1A - g1B) * mult;
      } else if (field === "username" || field === "fullname") {
        const aValue = field === "username" ? a.members.username.toLowerCase() : a.members.full_name.toLowerCase();
        const bValue = field === "username" ? b.members.username.toLowerCase() : b.members.full_name.toLowerCase();
        if (newDirection === "asc") return aValue > bValue ? 1 : -1;
        return aValue < bValue ? 1 : -1;
      } else {
        const aValue = getPlayerScore(a, field as keyof GamePlayer);
        const bValue = getPlayerScore(b, field as keyof GamePlayer);
        if (newDirection === "asc") return aValue > bValue ? 1 : -1;
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

  async function handleSaveAll() {
    const playerIds = Object.keys(editingScores);
    if (playerIds.length === 0) return;

    setSaving("all");
    try {
      const promises = playerIds.map(playerId => {
        const updates = editingScores[playerId];
        return gameService.updatePlayerScores(playerId, {
          game1_score: updates.game1_score,
          game2_score: updates.game2_score,
          game3_score: updates.game3_score,
          game4_score: updates.game4_score,
          game5_score: updates.game5_score,
          handicap: updates.handicap
        });
      });

      await Promise.all(promises);

      await loadGamePlayers(selectedGameId);
      
      setEditingScores({});
    } catch (error) {
      console.error("Error saving all scores:", error);
      alert("Gagal menyimpan semua skor");
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleCleanGameWinner(memberId: string, gameNumber: 1 | 2 | 3 | 4 | 5) {
    const gameKey = `game${gameNumber}` as keyof typeof cleanGameWinners;
    const currentWinners = cleanGameWinners[gameKey];
    const isWinner = currentWinners.includes(memberId);

    const updatedWinners = isWinner
      ? currentWinners.filter(id => id !== memberId)
      : [...currentWinners, memberId];

    const newCleanGameData = {
      ...cleanGameWinners,
      [gameKey]: updatedWinners
    };

    try {
      const { error } = await supabase
        .from("games")
        .update({ clean_game_data: newCleanGameData })
        .eq("id", selectedGameId);

      if (error) throw error;

      setCleanGameWinners(newCleanGameData);
    } catch (error) {
      console.error("Error updating clean game winner:", error);
      alert("Gagal mengemaskini pemenang clean game");
    }
  }

  function getPlayerScore(player: GamePlayer, field: keyof GamePlayer): number {
    const editing = editingScores[player.id];
    if (editing && field in editing) {
      return editing[field] as number;
    }
    return player[field] as number;
  }

  // Image upload handlers
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploadedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Reset previous results
    setOcrResult(null);
    setParsedScores([]);
    setShowRawText(false);
  }

  async function handleParseImage() {
    if (!uploadedImage) return;

    setParsing(true);
    
    try {
      const formData = new FormData();
      formData.append("image", uploadedImage);
      formData.append("members", JSON.stringify(allMembers));

      const response = await fetch("/api/parse-score-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setOcrResult({
          success: false,
          error: data.error || "Failed to parse image"
        });
        return;
      }

      setOcrResult(data);
      
      if (data.scores && data.scores.length > 0) {
        const scoresWithMatches = data.scores.map((score: any) => {
          const match = findBestMemberMatch(score.name);
          return {
            ...score,
            matchedMember: match?.member,
            matchConfidence: match?.confidence
          };
        });
        setParsedScores(scoresWithMatches);
      } else {
        setParsedScores([]);
      }
      
    } catch (error) {
      console.error("Error parsing image:", error);
      setOcrResult({
        success: false,
        error: "Failed to parse image file"
      });
    } finally {
      setParsing(false);
    }
  }

  function retryWithNewImage() {
    setUploadedImage(null);
    setImagePreview(null);
    setOcrResult(null);
    setParsedScores([]);
    setShowRawText(false);
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

  function resetUpload() {
    setUploadedImage(null);
    setImagePreview(null);
    setOcrResult(null);
    setParsedScores([]);
    setShowRawText(false);
    setShowUploadModal(false);
  }

  function fuzzyMatch(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 80;
    
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    let matchCount = 0;
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
          matchCount++;
          break;
        }
      }
    }
    
    return (matchCount / Math.max(words1.length, words2.length)) * 100;
  }

  function findBestMemberMatch(name: string): { member: Member; confidence: number } | null {
    let bestMatch: Member | null = null;
    let bestScore = 0;

    for (const member of allMembers) {
      const usernameScore = fuzzyMatch(name, member.username);
      const fullNameScore = fuzzyMatch(name, member.full_name);
      const score = Math.max(usernameScore, fullNameScore);

      if (score > bestScore && score >= 60) {
        bestScore = score;
        bestMatch = member;
      }
    }

    return bestMatch ? { member: bestMatch, confidence: bestScore } : null;
  }

  function getConfidenceColor(confidence?: number): string {
    if (!confidence) return "text-gray-500";
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  }

  function getConfidenceBadge(confidence?: number): JSX.Element {
    if (!confidence) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600">
          Unknown
        </span>
      );
    }
    
    if (confidence >= 80) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700 flex items-center gap-1">
          <Check className="h-3 w-3" />
          High ({confidence.toFixed(0)}%)
        </span>
      );
    }
    
    if (confidence >= 60) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Medium ({confidence.toFixed(0)}%)
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Low ({confidence.toFixed(0)}%)
      </span>
    );
  }

  // CSV upload handlers
  function handleCsvSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file");
      return;
    }

    setUploadedCsv(file);
    setCsvParsedScores([]);
  }

  async function handleParseCsv() {
    if (!uploadedCsv) return;

    setCsvParsing(true);
    
    try {
      const formData = new FormData();
      formData.append("csv", uploadedCsv);
      formData.append("members", JSON.stringify(allMembers));

      const response = await fetch("/api/parse-score-csv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.error || "Failed to parse CSV");
        return;
      }

      setCsvParsedScores(data.scores || []);
      
      if (data.scores.length === 0) {
        alert("No scores detected in CSV. Check column names: name/player, g1/game1, g2/game2, etc.");
      }
      
    } catch (error) {
      console.error("Error parsing CSV:", error);
      alert("Failed to parse CSV file");
    } finally {
      setCsvParsing(false);
    }
  }

  async function handleApplyCsvScore(parsedScore: ParsedScore) {
    if (!parsedScore.matchedMember) return;

    let targetGameId = selectedGameId;

    if (parsedScore.date) {
      const existingGame = games.find(g => g.game_date === parsedScore.date);
      if (existingGame) {
        targetGameId = existingGame.id;
        if (targetGameId !== selectedGameId) {
          setSelectedGameId(targetGameId);
        }
      } else {
        try {
          const newGame = await gameService.createGame({
            game_name: "10 PIN",
            game_type: "BLOK",
            game_date: parsedScore.date,
            year: new Date(parsedScore.date).getFullYear()
          });
          targetGameId = newGame.id;
          
          const updatedGames = await gameService.getAllGames();
          setGames(updatedGames as unknown as Game[]);
          setSelectedGameId(targetGameId);
        } catch (err) {
          console.error("Failed to create game:", err);
          alert("Gagal mencipta permainan baru untuk tarikh " + parsedScore.date);
          return;
        }
      }
    }

    if (!targetGameId) {
      alert("Sila pilih perlawanan (game) terlebih dahulu.");
      return;
    }

    let currentPlayers = targetGameId === selectedGameId ? players : [];
    if (targetGameId !== selectedGameId) {
      const data = await gameService.getGamePlayers(targetGameId);
      currentPlayers = data as unknown as GamePlayer[];
    }

    let player = currentPlayers.find(p => p.member_id === parsedScore.matchedMember!.id);

    if (!player) {
      try {
        await gameService.addPlayerToGame(targetGameId, parsedScore.matchedMember!.id, !!parsedScore.fivefive);
        const updatedData = await gameService.getGamePlayers(targetGameId);
        currentPlayers = updatedData as unknown as GamePlayer[];
        player = currentPlayers.find(p => p.member_id === parsedScore.matchedMember!.id);
      } catch (err) {
        console.error(err);
        alert("Gagal menambah pemain baru ke dalam perlawanan");
        return;
      }
    } else if (parsedScore.fivefive) {
      await gameService.updatePlayerFiveFiveStatus(player.id, true);
    }
    
    setPlayers(currentPlayers);
    setFilteredPlayers(currentPlayers);

    if (!player) return;

    setEditingScores(prev => {
      const next = targetGameId === selectedGameId ? { ...prev } : {};
      const updated = { ...(next[player.id] || player) };
      if (parsedScore.scores.game1 !== undefined) updated.game1_score = parsedScore.scores.game1;
      if (parsedScore.scores.game2 !== undefined) updated.game2_score = parsedScore.scores.game2;
      if (parsedScore.scores.game3 !== undefined) updated.game3_score = parsedScore.scores.game3;
      if (parsedScore.scores.game4 !== undefined) updated.game4_score = parsedScore.scores.game4;
      if (parsedScore.scores.game5 !== undefined) updated.game5_score = parsedScore.scores.game5;
      if (parsedScore.handicap !== undefined) updated.handicap = parsedScore.handicap;

      const total = updated.game1_score + updated.game2_score + updated.game3_score + 
                    updated.game4_score + updated.game5_score;
      updated.total_score = total;
      updated.overall_score = total + updated.handicap;

      next[player.id] = updated;
      return next;
    });

    setTimeout(() => {
      const playerElement = document.getElementById(`player-${player!.id}`);
      if (playerElement) {
        playerElement.scrollIntoView({ behavior: "smooth", block: "center" });
        playerElement.classList.add("ring-4", "ring-green-500", "ring-opacity-50");
        setTimeout(() => {
          playerElement.classList.remove("ring-4", "ring-green-500", "ring-opacity-50");
        }, 2000);
      }
    }, 100);
  }

  async function handleApplyParsedScore(parsedScore: ParsedScore) {
    return handleApplyCsvScore(parsedScore);
  }

  async function handleApplyAllScores() {
    return handleApplyAllCsvScores();
  }

  async function handleApplyAllCsvScores() {
    const highConfidenceScores = csvParsedScores.filter(s => s.matchConfidence && s.matchConfidence >= 80);
    
    if (highConfidenceScores.length === 0) {
      alert("Tiada skor dengan confidence tinggi (≥80%) untuk diaplikasikan");
      return;
    }

    for (const score of highConfidenceScores) {
      await handleApplyCsvScore(score);
    }

    alert(`${highConfidenceScores.length} skor telah berjaya diaplikasikan!`);
  }

  function resetCsvUpload() {
    setUploadedCsv(null);
    setCsvParsedScores([]);
    setShowCsvModal(false);
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
        <div className="flex gap-2">
          {Object.keys(editingScores).length > 0 && (
            <Button
              onClick={handleSaveAll}
              disabled={saving === "all"}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving === "all" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save All ({Object.keys(editingScores).length})
            </Button>
          )}
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Score Image
          </Button>
          <Button
            onClick={() => setShowCsvModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Upload & Parse Score Image</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetUpload}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Image Upload */}
              {!imagePreview && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">Upload gambar score sheet</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Pastikan gambar jelas dengan labels: Name/Player, G1-G5, HCP
                  </p>
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
                      Pilih Gambar
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Image Preview & Parse */}
              {imagePreview && !ocrResult && (
                <div className="space-y-4">
                  <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={imagePreview}
                      alt="Score preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleParseImage}
                      disabled={parsing}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {parsing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing OCR...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Parse Score (AI)
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={retryWithNewImage}
                      variant="outline"
                      className="border-gray-300"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Change Image
                    </Button>
                  </div>
                </div>
              )}

              {/* OCR Results */}
              {ocrResult && (
                <div className="space-y-4">
                  {/* OCR Success/Failure Banner */}
                  {!ocrResult.success ? (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 mb-1">OCR Detection Failed</h4>
                          <p className="text-sm text-red-700 mb-3">
                            {ocrResult.error || "Gagal mengesan text dari gambar"}
                          </p>
                          <div className="space-y-2 text-sm text-red-800">
                            <p className="font-medium">Pastikan gambar ada labels:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li><code className="bg-red-100 px-1 rounded">Name:</code> atau <code className="bg-red-100 px-1 rounded">Player:</code></li>
                              <li><code className="bg-red-100 px-1 rounded">G1:</code>, <code className="bg-red-100 px-1 rounded">G2:</code>, <code className="bg-red-100 px-1 rounded">G3:</code>, etc.</li>
                              <li><code className="bg-red-100 px-1 rounded">HCP:</code> atau <code className="bg-red-100 px-1 rounded">Handicap:</code></li>
                            </ul>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={() => setShowRawText(true)}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Try Another Image
                            </Button>
                            <Button
                              onClick={resetUpload}
                              size="sm"
                              variant="outline"
                              className="border-red-300"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* OCR Confidence Summary */}
                      <div className={`border-2 rounded-lg p-4 ${
                        (ocrResult.confidence || 0) >= 80 ? "bg-green-50 border-green-200" :
                        (ocrResult.confidence || 0) >= 60 ? "bg-yellow-50 border-yellow-200" :
                        "bg-red-50 border-red-200"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Info className={`h-5 w-5 ${getConfidenceColor(ocrResult.confidence)}`} />
                            <h4 className="font-semibold text-gray-900">OCR Detection Results</h4>
                          </div>
                          {getConfidenceBadge(ocrResult.confidence)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                          <div>
                            <span className="text-gray-600">Overall Confidence:</span>
                            <span className={`ml-2 font-bold ${getConfidenceColor(ocrResult.confidence)}`}>
                              {ocrResult.confidence?.toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Scores Detected:</span>
                            <span className="ml-2 font-bold text-gray-900">
                              {parsedScores.length} player{parsedScores.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        {/* Low Confidence Warning */}
                        {ocrResult.confidence && ocrResult.confidence < 70 && (
                          <div className="mt-3 pt-3 border-t border-yellow-300">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-yellow-800">
                                <strong>Low confidence detection.</strong> Sila semak raw text di bawah dan verify semua scores before applying.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Raw OCR Text Toggle */}
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-900">
                          Detected Players ({parsedScores.length})
                        </h4>
                        <Button
                          onClick={() => setShowRawText(!showRawText)}
                          size="sm"
                          variant="outline"
                          className="border-gray-300"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {showRawText ? "Hide" : "Show"} Raw Text
                        </Button>
                      </div>

                      {/* Raw OCR Text Display */}
                      {showRawText && ocrResult.text && (
                        <Card className="bg-gray-50 border-2 border-gray-300">
                          <CardContent className="p-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Raw OCR Text (What AI Detected)
                            </h5>
                            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-gray-200 max-h-48 overflow-y-auto">
                              {ocrResult.text}
                            </pre>
                            <p className="text-xs text-gray-600 mt-2">
                              💡 Use this to debug if scores are not detected correctly. Check for labels like "Name:", "G1:", "G2:", etc.
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* No Scores Detected */}
                      {parsedScores.length === 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-yellow-900 mb-1">No Scores Detected</h4>
                              <p className="text-sm text-yellow-700 mb-3">
                                OCR detected text tetapi tidak dapat extract structured scores.
                              </p>
                              <div className="space-y-2 text-sm text-yellow-800">
                                <p className="font-medium">Pastikan gambar ada labels:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                  <li><code className="bg-yellow-100 px-1 rounded">Name:</code> atau <code className="bg-yellow-100 px-1 rounded">Player:</code></li>
                                  <li><code className="bg-yellow-100 px-1 rounded">G1:</code>, <code className="bg-yellow-100 px-1 rounded">G2:</code>, <code className="bg-yellow-100 px-1 rounded">G3:</code>, etc.</li>
                                  <li><code className="bg-yellow-100 px-1 rounded">HCP:</code> atau <code className="bg-yellow-100 px-1 rounded">Handicap:</code></li>
                                </ul>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  onClick={() => setShowRawText(true)}
                                  size="sm"
                                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Show What Was Detected
                                </Button>
                                <Button
                                  onClick={retryWithNewImage}
                                  size="sm"
                                  variant="outline"
                                  className="border-yellow-300"
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Try Another Image
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Parsed Scores List */}
                      {parsedScores.length > 0 && (
                        <>
                          <div className="flex justify-end">
                            <Button
                              onClick={handleApplyAllScores}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={!parsedScores.some(s => s.matchConfidence && s.matchConfidence >= 80)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Apply All High Confidence (≥80%)
                            </Button>
                          </div>

                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {parsedScores.map((score, idx) => (
                              <Card key={idx} className={`border-2 ${
                                score.matchConfidence && score.matchConfidence >= 80
                                  ? "border-green-200 bg-green-50"
                                  : score.matchConfidence && score.matchConfidence >= 60
                                  ? "border-yellow-200 bg-yellow-50"
                                  : "border-red-200 bg-red-50"
                              }`}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">
                                        Detected: {score.name}
                                      </p>
                                      {score.matchedMember ? (
                                        <div className="mt-1">
                                          <p className="text-sm text-gray-600">
                                            → Matched: {score.matchedMember.username} ({score.matchedMember.full_name})
                                          </p>
                                          <div className="mt-1 flex items-center gap-2">
                                            {getConfidenceBadge(score.matchConfidence)}
                                            {!players.some(p => p.member_id === score.matchedMember!.id) && (
                                              <span className="px-2 py-1 text-[10px] font-semibold rounded bg-blue-100 text-blue-700">
                                                + New Player
                                              </span>
                                            )}
                                            {score.fivefive && (
                                              <span className="px-2 py-1 text-[10px] font-semibold rounded bg-purple-100 text-purple-700">
                                                Five-Five
                                              </span>
                                            )}
                                            {score.date && (
                                              <span className="px-2 py-1 text-[10px] font-semibold rounded bg-gray-100 text-gray-700">
                                                {score.date}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                                          <AlertCircle className="h-3 w-3" />
                                          No match found - Please enter manually
                                        </p>
                                      )}
                                    </div>
                                    {score.matchedMember && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleApplyParsedScore(score)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                      >
                                        Apply
                                      </Button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-5 gap-2 text-sm mt-3">
                                    {score.scores.game1 !== undefined && (
                                      <div className="bg-white rounded px-2 py-1 text-center border border-blue-200">
                                        <div className="text-xs text-gray-500">G1</div>
                                        <div className="font-semibold text-blue-600">{score.scores.game1}</div>
                                      </div>
                                    )}
                                    {score.scores.game2 !== undefined && (
                                      <div className="bg-white rounded px-2 py-1 text-center border border-green-200">
                                        <div className="text-xs text-gray-500">G2</div>
                                        <div className="font-semibold text-green-600">{score.scores.game2}</div>
                                      </div>
                                    )}
                                    {score.scores.game3 !== undefined && (
                                      <div className="bg-white rounded px-2 py-1 text-center border border-purple-200">
                                        <div className="text-xs text-gray-500">G3</div>
                                        <div className="font-semibold text-purple-600">{score.scores.game3}</div>
                                      </div>
                                    )}
                                    {score.scores.game4 !== undefined && (
                                      <div className="bg-white rounded px-2 py-1 text-center border border-orange-200">
                                        <div className="text-xs text-gray-500">G4</div>
                                        <div className="font-semibold text-orange-600">{score.scores.game4}</div>
                                      </div>
                                    )}
                                    {score.scores.game5 !== undefined && (
                                      <div className="bg-white rounded px-2 py-1 text-center border border-pink-200">
                                        <div className="text-xs text-gray-500">G5</div>
                                        <div className="font-semibold text-pink-600">{score.scores.game5}</div>
                                      </div>
                                    )}
                                  </div>
                                  {score.handicap !== undefined && (
                                    <div className="mt-2 text-sm">
                                      <span className="text-gray-600">Handicap:</span>
                                      <span className="ml-2 font-semibold text-yellow-600">{score.handicap}</span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </>
                      )}

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={retryWithNewImage}
                          variant="outline"
                          className="flex-1 border-gray-300"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Upload New Image
                        </Button>
                        <Button
                          onClick={() => setShowUploadModal(false)}
                          variant="outline"
                          className="flex-1 border-gray-300"
                        >
                          Close
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Upload CSV Score File</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetCsvUpload}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* CSV Upload Instructions */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  CSV Format Requirements
                </h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>Required columns (case-insensitive):</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li><code className="bg-blue-100 px-1 rounded">name</code> or <code className="bg-blue-100 px-1 rounded">player</code> - Player name</li>
                    <li><code className="bg-blue-100 px-1 rounded">g1</code> / <code className="bg-blue-100 px-1 rounded">game1</code> - Game 1 score</li>
                    <li><code className="bg-blue-100 px-1 rounded">g2</code> / <code className="bg-blue-100 px-1 rounded">game2</code> - Game 2 score</li>
                    <li><code className="bg-blue-100 px-1 rounded">g3</code> / <code className="bg-blue-100 px-1 rounded">game3</code> - Game 3 score</li>
                    <li><code className="bg-blue-100 px-1 rounded">g4</code> / <code className="bg-blue-100 px-1 rounded">game4</code> - Game 4 score</li>
                    <li><code className="bg-blue-100 px-1 rounded">g5</code> / <code className="bg-blue-100 px-1 rounded">game5</code> - Game 5 score</li>
                    <li><code className="bg-blue-100 px-1 rounded">hcp</code> / <code className="bg-blue-100 px-1 rounded">handicap</code> - Handicap (optional)</li>
                    <li><code className="bg-blue-100 px-1 rounded">fivefive</code> - Five-Five (Optional: yes/no)</li>
                    <li><code className="bg-blue-100 px-1 rounded">date</code> - Date (Optional: yyyy/mm/dd)</li>
                  </ul>
                  <p className="mt-2"><strong>Example CSV:</strong></p>
                  <pre className="bg-blue-100 p-2 rounded text-xs overflow-x-auto">
name,date,g1,g2,g3,g4,g5,hcp,fivefive
HL,2026/03/24,190,159,199,215,166,24,yes
Eby,,168,116,153,152,176,18,no</pre>
                </div>
              </div>

              {/* CSV File Upload */}
              {!uploadedCsv && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">Upload CSV file</p>
                  <p className="text-sm text-gray-500 mb-4">
                    File must be in CSV format with proper column headers
                  </p>
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-block">
                      Select CSV File
                    </span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* CSV File Selected */}
              {uploadedCsv && csvParsedScores.length === 0 && (
                <div className="space-y-4">
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-900">{uploadedCsv.name}</p>
                          <p className="text-sm text-green-700">
                            {(uploadedCsv.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setUploadedCsv(null)}
                        variant="ghost"
                        size="sm"
                        className="text-green-700 hover:text-green-900"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleParseCsv}
                      disabled={csvParsing}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {csvParsing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing CSV...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Parse & Match Players
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setUploadedCsv(null)}
                      variant="outline"
                      className="border-gray-300"
                    >
                      Change File
                    </Button>
                  </div>
                </div>
              )}

              {/* CSV Parsed Results */}
              {csvParsedScores.length > 0 && (
                <>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold text-green-900">CSV Parsed Successfully</h4>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-green-700">Total Rows:</span>
                        <span className="ml-2 font-bold text-green-900">{csvParsedScores.length}</span>
                      </div>
                      <div>
                        <span className="text-green-700">High Confidence Matches:</span>
                        <span className="ml-2 font-bold text-green-900">
                          {csvParsedScores.filter(s => s.matchConfidence && s.matchConfidence >= 80).length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={handleApplyAllCsvScores}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!csvParsedScores.some(s => s.matchConfidence && s.matchConfidence >= 80)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Apply All High Confidence (≥80%)
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {csvParsedScores.map((score, idx) => (
                      <Card key={idx} className={`border-2 ${
                        score.matchConfidence && score.matchConfidence >= 80
                          ? "border-green-200 bg-green-50"
                          : score.matchConfidence && score.matchConfidence >= 60
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-red-200 bg-red-50"
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">
                                CSV: {score.name}
                              </p>
                              {score.matchedMember ? (
                                <div className="mt-1">
                                  <p className="text-sm text-gray-600">
                                    → Matched: {score.matchedMember.username} ({score.matchedMember.full_name})
                                  </p>
                                  <div className="mt-1 flex items-center gap-2">
                                    {getConfidenceBadge(score.matchConfidence)}
                                    {!players.some(p => p.member_id === score.matchedMember!.id) && (
                                      <span className="px-2 py-1 text-[10px] font-semibold rounded bg-blue-100 text-blue-700">
                                        + New Player
                                      </span>
                                    )}
                                    {score.fivefive && (
                                      <span className="px-2 py-1 text-[10px] font-semibold rounded bg-purple-100 text-purple-700">
                                        Five-Five
                                      </span>
                                    )}
                                    {score.date && (
                                      <span className="px-2 py-1 text-[10px] font-semibold rounded bg-gray-100 text-gray-700">
                                        {score.date}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                                  <AlertCircle className="h-3 w-3" />
                                  No match found - Please enter manually
                                </p>
                              )}
                            </div>
                            {score.matchedMember && (
                              <Button
                                size="sm"
                                onClick={() => handleApplyCsvScore(score)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Apply
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-5 gap-2 text-sm mt-3">
                            {score.scores.game1 !== undefined && (
                              <div className="bg-white rounded px-2 py-1 text-center border border-blue-200">
                                <div className="text-xs text-gray-500">G1</div>
                                <div className="font-semibold text-blue-600">{score.scores.game1}</div>
                              </div>
                            )}
                            {score.scores.game2 !== undefined && (
                              <div className="bg-white rounded px-2 py-1 text-center border border-green-200">
                                <div className="text-xs text-gray-500">G2</div>
                                <div className="font-semibold text-green-600">{score.scores.game2}</div>
                              </div>
                            )}
                            {score.scores.game3 !== undefined && (
                              <div className="bg-white rounded px-2 py-1 text-center border border-purple-200">
                                <div className="text-xs text-gray-500">G3</div>
                                <div className="font-semibold text-purple-600">{score.scores.game3}</div>
                              </div>
                            )}
                            {score.scores.game4 !== undefined && (
                              <div className="bg-white rounded px-2 py-1 text-center border border-orange-200">
                                <div className="text-xs text-gray-500">G4</div>
                                <div className="font-semibold text-orange-600">{score.scores.game4}</div>
                              </div>
                            )}
                            {score.scores.game5 !== undefined && (
                              <div className="bg-white rounded px-2 py-1 text-center border border-pink-200">
                                <div className="text-xs text-gray-500">G5</div>
                                <div className="font-semibold text-pink-600">{score.scores.game5}</div>
                              </div>
                            )}
                          </div>
                          {score.handicap !== undefined && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-600">Handicap:</span>
                              <span className="ml-2 font-semibold text-yellow-600">{score.handicap}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4 border-t mt-4">
                    <Button
                      onClick={() => {
                        setUploadedCsv(null);
                        setCsvParsedScores([]);
                      }}
                      variant="outline"
                      className="flex-1 border-gray-300"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Upload New CSV
                    </Button>
                    <Button
                      onClick={() => setShowCsvModal(false)}
                      variant="outline"
                      className="flex-1 border-gray-300"
                    >
                      Close
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                {games.map((game) => {
                  const date = new Date(game.game_date);
                  const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
                  return (
                    <option key={game.id} value={game.id}>
                      {game.game_name} - {formattedDate}
                    </option>
                  );
                })}
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

      {/* Couple Score Entry */}
          <CoupleScoreEntry selectedGameId={selectedGameId} />

          {/* Clean Game Prize Summary */}
          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
            <CardContent className="p-4">
              <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Clean Game Prize Pool
              </h3>
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((gameNum) => {
                  const gameKey = `game${gameNum}` as keyof typeof cleanGameWinners;
                  const winners = cleanGameWinners[gameKey];
                  const cleanGamePlayersCount = players.filter(p => p.clean_game).length;
                  const totalPrize = cleanGamePlayersCount * 2;
                  const prizePerWinner = winners.length > 0 ? totalPrize / winners.length : 0;

                  return (
                    <div key={gameNum} className="bg-white rounded-lg p-3 border-2 border-yellow-300 text-center">
                      <div className="text-xs font-semibold text-gray-600 mb-1">Game {gameNum}</div>
                      <div className="text-lg font-bold text-amber-600">RM{totalPrize}</div>
                      {winners.length > 0 && (
                        <>
                          <div className="text-xs text-gray-500 mt-1">{winners.length} pemenang</div>
                          <div className="text-sm font-semibold text-green-600">RM{prizePerWinner.toFixed(2)}/org</div>
                        </>
                      )}
                      {winners.length === 0 && (
                        <div className="text-xs text-gray-400 mt-1">Tiada pemenang</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

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
                          id={`player-${player.id}`}
                          className={`transition-all duration-200 ${
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
                                <div className="text-gray-900 font-medium flex items-center gap-1">
                                  {player.members.username}
                                  {player.clean_game && (
                                    <span title="Joined Clean Game">
                                      <Sparkles className="w-3 h-3 text-amber-500" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-500 text-xs">{player.members.full_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Input
                              type="number"
                              value={getPlayerScore(player, "game1_score")}
                              onChange={(e) => handleScoreChange(player.id, "game1_score", e.target.value)}
                              className="w-20 h-9 bg-blue-50 border border-blue-200 text-blue-900 text-center font-bold transition-all duration-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/50 focus:bg-white focus:scale-110 focus:shadow-xl relative z-0 focus:z-10"
                              onFocus={(e) => e.target.select()}
                            />
                            <div className="flex items-center justify-center mt-1">
                              <Checkbox
                                checked={cleanGameWinners.game1.includes(player.member_id)}
                                onCheckedChange={() => handleToggleCleanGameWinner(player.member_id, 1)}
                                className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                              />
                              <span className="ml-1 text-xs text-gray-500">Clean</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Input
                              type="number"
                              value={getPlayerScore(player, "game2_score")}
                              onChange={(e) => handleScoreChange(player.id, "game2_score", e.target.value)}
                              className="w-20 h-9 bg-green-50 border border-green-200 text-green-900 text-center font-bold transition-all duration-200 focus:border-green-600 focus:ring-4 focus:ring-green-500/50 focus:bg-white focus:scale-110 focus:shadow-xl relative z-0 focus:z-10"
                              onFocus={(e) => e.target.select()}
                            />
                            <div className="flex items-center justify-center mt-1">
                              <Checkbox
                                checked={cleanGameWinners.game2.includes(player.member_id)}
                                onCheckedChange={() => handleToggleCleanGameWinner(player.member_id, 2)}
                                className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                              />
                              <span className="ml-1 text-xs text-gray-500">Clean</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Input
                              type="number"
                              value={getPlayerScore(player, "game3_score")}
                              onChange={(e) => handleScoreChange(player.id, "game3_score", e.target.value)}
                              className="w-20 h-9 bg-purple-50 border border-purple-200 text-purple-900 text-center font-bold transition-all duration-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-500/50 focus:bg-white focus:scale-110 focus:shadow-xl relative z-0 focus:z-10"
                              onFocus={(e) => e.target.select()}
                            />
                            <div className="flex items-center justify-center mt-1">
                              <Checkbox
                                checked={cleanGameWinners.game3.includes(player.member_id)}
                                onCheckedChange={() => handleToggleCleanGameWinner(player.member_id, 3)}
                                className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                              />
                              <span className="ml-1 text-xs text-gray-500">Clean</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Input
                              type="number"
                              value={getPlayerScore(player, "game4_score")}
                              onChange={(e) => handleScoreChange(player.id, "game4_score", e.target.value)}
                              className="w-20 h-9 bg-orange-50 border border-orange-200 text-orange-900 text-center font-bold transition-all duration-200 focus:border-orange-600 focus:ring-4 focus:ring-orange-500/50 focus:bg-white focus:scale-110 focus:shadow-xl relative z-0 focus:z-10"
                              onFocus={(e) => e.target.select()}
                            />
                            <div className="flex items-center justify-center mt-1">
                              <Checkbox
                                checked={cleanGameWinners.game4.includes(player.member_id)}
                                onCheckedChange={() => handleToggleCleanGameWinner(player.member_id, 4)}
                                className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                              />
                              <span className="ml-1 text-xs text-gray-500">Clean</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Input
                              type="number"
                              value={getPlayerScore(player, "game5_score")}
                              onChange={(e) => handleScoreChange(player.id, "game5_score", e.target.value)}
                              className="w-20 h-9 bg-pink-50 border border-pink-200 text-pink-900 text-center font-bold transition-all duration-200 focus:border-pink-600 focus:ring-4 focus:ring-pink-500/50 focus:bg-white focus:scale-110 focus:shadow-xl relative z-0 focus:z-10"
                              onFocus={(e) => e.target.select()}
                            />
                            <div className="flex items-center justify-center mt-1">
                              <Checkbox
                                checked={cleanGameWinners.game5.includes(player.member_id)}
                                onCheckedChange={() => handleToggleCleanGameWinner(player.member_id, 5)}
                                className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                              />
                              <span className="ml-1 text-xs text-gray-500">Clean</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <Input
                              type="number"
                              value={getPlayerScore(player, "handicap")}
                              onChange={(e) => handleScoreChange(player.id, "handicap", e.target.value)}
                              className="w-20 h-9 bg-yellow-50 border border-yellow-200 text-yellow-900 text-center font-bold transition-all duration-200 focus:border-yellow-600 focus:ring-4 focus:ring-yellow-500/50 focus:bg-white focus:scale-110 focus:shadow-xl relative z-0 focus:z-10"
                              onFocus={(e) => e.target.select()}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 font-semibold">
                            {getPlayerScore(player, "total_score")}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-red-600 font-bold">
                            {getPlayerScore(player, "overall_score")}
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
        </>
      )}
    </div>
  );
}