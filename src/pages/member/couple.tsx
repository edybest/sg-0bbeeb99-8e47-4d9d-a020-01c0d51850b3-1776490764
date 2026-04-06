import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/router";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { gameService } from "@/services/gameService";
import { coupleService, type CoupleLeaderboardEntry } from "@/services/coupleService";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Heart,
  Target,
  Users,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MAX_LIKES_PER_GAME = 3;

export default function CouplePage() {
  const { member, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<CoupleLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [userLikesCount, setUserLikesCount] = useState(0);

  const prevLeaderboardRef = useRef<CoupleLeaderboardEntry[]>([]);

  const currentGame = games.find(g => g.id === selectedGameId);

  useEffect(() => {
    loadGames();
    fetchUserReactions();
  }, []);

  useEffect(() => {
    prevLeaderboardRef.current = leaderboard;
  }, [leaderboard]);

  useEffect(() => {
    if (selectedGameId) {
      loadLeaderboard(selectedGameId);
      loadGameReactions(selectedGameId);

      // Set up real-time subscription for couple scores
      const channel = supabase
        .channel(`couple_scores_${selectedGameId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, and DELETE
            schema: 'public',
            table: 'couple_scores',
            filter: `game_id=eq.${selectedGameId}`
          },
          (payload) => {
            console.log('Real-time couple score update received!', payload);
            // Reload the leaderboard silently in the background
            loadLeaderboard(selectedGameId, false);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedGameId]);

  const loadGames = async () => {
    try {
      const allGames = await gameService.getAllGames();
      // Filter only COUPLE type games
      const coupleGames = allGames.filter(game => game.game_type === 'COUPLE');
      setGames(coupleGames);
      
      // Auto-select first couple game if available
      if (coupleGames.length > 0 && !selectedGameId) {
        setSelectedGameId(coupleGames[0].id);
      }
    } catch (error) {
      console.error("Error loading games:", error);
      toast({
        title: "Error",
        description: "Failed to load games",
        variant: "destructive",
      });
    }
  };

  const loadLeaderboard = async (gameId: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await coupleService.getCoupleLeaderboard(gameId);
      const formattedData = data.map((item: any, index: number) => ({
        ...item,
        rank: index + 1
      }));

      // --- Real-time Notification Logic ---
      if (!showLoading && prevLeaderboardRef.current.length > 0) {
        const prevLeaderboard = prevLeaderboardRef.current;

        formattedData.forEach((newCouple: any) => {
          const prevCouple = prevLeaderboard.find(c => c.id === newCouple.id);
          
          if (prevCouple) {
            // Check if the current logged-in member belongs to this couple
            const isMe = member && (
              newCouple.player1_id === member.id || 
              newCouple.player2_id === member.id ||
              newCouple.player1_name === member.username || 
              newCouple.player2_name === member.username
            );

            const oldScore = prevCouple.overall_score || 0;
            const newScore = newCouple.overall_score || 0;

            // 1. Personal Score Update Alert
            if (isMe && oldScore !== newScore) {
              toast({
                title: "Markah Dikemas Kini! 🎳",
                description: `Markah anda bertukar dari ${oldScore} ke ${newScore}.`,
              });
            }

            // 2. Rank Change Alerts
            if (prevCouple.rank !== newCouple.rank) {
              if (isMe) {
                const improved = newCouple.rank < prevCouple.rank;
                toast({
                  title: improved ? "Tahniah! Ranking Naik 📈" : "Alamak! Ranking Turun 📉",
                  description: `Ranking anda berubah dari #${prevCouple.rank} ke #${newCouple.rank}.`,
                  variant: improved ? "default" : "destructive",
                });
              } else if (newCouple.rank === 1 && prevCouple.rank > 1) {
                // 3. General Notification if someone else takes the #1 spot
                toast({
                  title: "Pendahulu Baru! 🏆",
                  description: `${newCouple.couple_name} kini merampas kedudukan #1!`,
                });
              }
            }
          }
        });
      }
      // --- End Notification Logic ---

      setLeaderboard(formattedData);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadGameReactions = async (gameId: string) => {
    if (!gameId) return;

    try {
      const counts = await coupleService.getCoupleReactionCounts(gameId);
      setReactionCounts(counts);
    } catch (error) {
      console.error("Error loading game reactions:", error);
    }
  };

  const fetchUserReactions = async () => {
    if (!member?.id) return;

    try {
      const userReactionsList = await coupleService.getCoupleReactions("", member.id);
      setUserReactions(new Set(userReactionsList.map((r: any) => r.couple_score_id)));
      setUserLikesCount(userReactionsList.length);
    } catch (error) {
      console.error("Error fetching user reactions:", error);
    }
  };

  const handleReaction = async (coupleScoreId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!member?.id) {
      toast({
        title: "Login Required",
        description: "Please login to react to couple scores",
        variant: "destructive",
      });
      return;
    }

    if (!selectedGameId) {
      toast({
        title: "Error",
        description: "Please select a game first",
        variant: "destructive",
      });
      return;
    }

    if (userReactions.has(coupleScoreId)) {
      toast({
        title: "Already Liked",
        description: "You've already liked this couple",
        variant: "destructive",
      });
      return;
    }

    if (userLikesCount >= MAX_LIKES_PER_GAME) {
      toast({
        title: "Like Limit Reached",
        description: `You can only like ${MAX_LIKES_PER_GAME} couples per game`,
        variant: "destructive",
      });
      return;
    }

    try {
      await coupleService.addCoupleReaction(coupleScoreId, selectedGameId, member.id);

      setUserReactions((prev) => new Set([...prev, coupleScoreId]));
      setUserLikesCount((prev) => prev + 1);
      setReactionCounts((prev) => ({
        ...prev,
        [coupleScoreId]: (prev[coupleScoreId] || 0) + 1,
      }));

      setLeaderboard((prev) =>
        prev.map((entry) =>
          entry.id === coupleScoreId
            ? { ...entry, likes_count: (entry.likes_count || 0) + 1 }
            : entry
        )
      );

      toast({
        title: "Success",
        description: "Liked!",
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    }
  };

  const handleShareGame = async () => {
    if (!currentGame) return;
    
    const topCouple = leaderboard[0];
    const topText = topCouple ? `\n🥇 #1: ${topCouple.couple_name} (${topCouple.overall_score || 0} pts)` : '';
    const text = `🎳 Check out the Couple Leaderboard for ${currentGame.game_name}!${topText}\n\nView full ranking:`;
    const url = window.location.href;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentGame.game_name} Leaderboard`,
          text: text,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast({
          title: "Link disalin!",
          description: "Link leaderboard telah disalin untuk dikongsi ke WhatsApp/Media Sosial.",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleShareCouple = async (row: any, rank: number) => {
    if (!currentGame) return;

    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅";
    const text = `${medal} ${row.couple_name} kini berada di Ranking #${rank} dalam ${currentGame.game_name} dengan ${row.overall_score || 0} mata!\n\nLihat ranking penuh di sini:`;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Ranking #${rank} - ${row.couple_name}`,
          text: text,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast({
          title: "Link disalin!",
          description: "Maklumat ranking telah disalin untuk dikongsi ke WhatsApp/Media Sosial.",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 md:w-6 md:h-6 text-amber-700" />;
    return <span className="text-sm font-semibold text-gray-600">#{rank}</span>;
  };

  const getDifferenceIcon = (diff: number) => {
    if (diff === 0) return <Minus className="w-3 h-3 md:w-4 md:h-4" />;
    if (diff > 0) return <TrendingDown className="w-3 h-3 md:w-4 md:h-4" />;
    return <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />;
  };

  const getDifferenceColor = (diff: number) => {
    if (diff === 0) return "text-green-600 bg-green-50";
    if (diff <= 10) return "text-orange-600 bg-orange-50";
    if (diff <= 30) return "text-red-500 bg-red-50";
    return "text-red-700 bg-red-100";
  };

  return (
    <MemberLayout>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 pb-20">
        <div className="container max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 md:p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg">
                <Heart className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                  Couple Leaderboard
                </h1>
                <p className="text-xs md:text-sm text-gray-600">Team bowling competition standings</p>
              </div>
            </div>
          </div>

          {/* Game Selector */}
          <Card>
            <CardHeader className="bg-pink-50 border-b border-pink-100">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-pink-600" />
                <CardTitle className="text-xl md:text-2xl text-pink-900">Couple Leaderboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1">
                  <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Game (COUPLE sahaja)" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.game_name} {game.game_date ? `(${new Date(game.game_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {currentGame && leaderboard.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleShareGame}
                    className="shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50"
                    title="Share Leaderboard"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {loading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 md:w-12 md:h-12 animate-spin text-pink-500" />
                  </CardContent>
                </Card>
              ) : leaderboard.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <Users className="w-16 h-16 md:w-20 md:h-20 text-gray-300 mb-4" />
                    <p className="text-gray-500 text-center">No couples yet for this game</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden shadow-xl">
                  <CardContent className="p-0">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="sticky top-0 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-red-600 to-pink-700 text-white z-10 w-20">
                              Rank
                            </th>
                            <th className="sticky top-0 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-red-600 to-pink-700 text-white z-10 min-w-[200px]">
                              Couple
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-blue-600 to-cyan-600 text-white z-10">
                              G1
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-blue-600 to-cyan-600 text-white z-10">
                              G2
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-blue-600 to-cyan-600 text-white z-10">
                              G3
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-blue-600 to-cyan-600 text-white z-10">
                              G4
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-blue-600 to-cyan-600 text-white z-10">
                              G5
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-blue-600 to-cyan-600 text-white z-10">
                              G6
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-sky-600 to-blue-700 text-white z-10 border-l-2 border-white/20">
                              <div className="flex items-center justify-center gap-1">
                                <Target className="w-4 h-4" />
                                <span>Total</span>
                              </div>
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-purple-600 to-indigo-700 text-white z-10">
                              <div className="flex items-center justify-center gap-1">
                                <Award className="w-4 h-4" />
                                <span>Overall</span>
                              </div>
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-orange-500 to-red-600 text-white z-10">
                              <div className="flex items-center justify-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                <span>Diff</span>
                              </div>
                            </th>
                            <th className="sticky top-0 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider bg-gradient-to-br from-red-500 to-pink-600 text-white z-10">
                              <div className="flex items-center justify-center gap-2">
                                <Heart className="w-4 h-4" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {leaderboard.map((entry) => (
                            <tr
                              key={entry.id}
                              className="hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 transition-all duration-200"
                            >
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center">
                                  {getRankIcon(entry.rank)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <Avatar className="w-10 h-10 border-2 border-pink-200">
                                      <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                        <Heart className="w-5 h-5" />
                                      </div>
                                    </Avatar>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{entry.couple_name}</p>
                                    <p className="text-xs text-gray-500">
                                      {entry.player1_name} + {entry.player2_name}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-sm text-center hover:bg-blue-50 transition-colors">
                                {entry.game1_score || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-center hover:bg-blue-50 transition-colors">
                                {entry.game2_score || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-center hover:bg-blue-50 transition-colors">
                                {entry.game3_score || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-center hover:bg-blue-50 transition-colors">
                                {entry.game4_score || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-center hover:bg-blue-50 transition-colors">
                                {entry.game5_score || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-center hover:bg-blue-50 transition-colors">
                                {entry.game6_score || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-sm font-semibold text-center text-sky-700 hover:bg-sky-50 transition-colors">
                                {entry.total_score}
                              </td>
                              <td className="px-3 py-2.5 text-sm font-bold text-center text-purple-700 hover:bg-purple-50 transition-colors">
                                {entry.overall_score}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getDifferenceColor(entry.difference)}`}
                                >
                                  {getDifferenceIcon(entry.difference)}
                                  {entry.difference > 0 ? `+${entry.difference}` : entry.difference}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={(e) => handleReaction(entry.id, e)}
                                    disabled={userLikesCount >= MAX_LIKES_PER_GAME}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                                      entry.likes_count > 0 ? "bg-pink-50 text-pink-600" : "text-gray-400 hover:bg-gray-50"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    <Heart
                                      className={`h-4 w-4 ${entry.likes_count > 0 ? "fill-current" : ""}`}
                                    />
                                    <span className="text-xs font-bold">{entry.likes_count || 0}</span>
                                  </button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => handleShareCouple(entry, entry.rank)}
                                    title="Kongsi Ranking"
                                  >
                                    <Share2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-gray-200">
                      {leaderboard.map((row, index) => {
                        const rank = index + 1;
                        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
                        const rankColor = rank === 1 ? "bg-yellow-100 border-yellow-300" : rank === 2 ? "bg-gray-100 border-gray-300" : rank === 3 ? "bg-amber-100 border-amber-300" : "bg-pink-50 border-pink-200";
                        
                        return (
                          <Card
                            key={row.id}
                            className={`${rankColor} border-2`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-2xl font-bold text-pink-700">
                                      {medal} #{rank}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900">
                                      {row.couple_name}
                                    </h3>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {row.player1_name || "Unknown"} + {row.player2_name || "Unknown"}
                                  </div>
                                </div>
                                
                                <div className="flex items-center shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                                    onClick={() => handleShareCouple(row, rank)}
                                    title="Kongsi Ranking"
                                  >
                                    <Share2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-sky-600 mt-0.5">
                                <span className="flex items-center gap-1 text-sky-700">
                                  <Target className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                  {row.total_score}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="flex items-center gap-1 text-purple-700 font-semibold">
                                  <Award className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                  {row.overall_score}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span
                                  className={`flex items-center gap-1 font-semibold ${row.difference === 0 ? "text-green-600" : "text-orange-600"}`}
                                >
                                  <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                  {row.difference > 0 ? `+${row.difference}` : row.difference}
                                </span>
                                <button
                                  onClick={(e) => handleReaction(row.id, e)}
                                  disabled={userLikesCount >= MAX_LIKES_PER_GAME}
                                  className="flex items-center gap-1 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed ml-1"
                                >
                                  <Heart
                                    className={`w-3 h-3 md:w-3.5 md:h-3.5 ${row.likes_count > 0 ? "fill-red-500 text-red-500" : "text-gray-400"}`}
                                  />
                                  <span className="text-[9px] md:text-xs">{row.likes_count || 0}</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-6 gap-1.5 mt-2">
                                {[
                                  row.game1_score,
                                  row.game2_score,
                                  row.game3_score,
                                  row.game4_score,
                                  row.game5_score,
                                  row.game6_score,
                                ].map((score, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg p-2 text-center"
                                  >
                                    <div className="text-[9px] font-medium text-white/80">G{idx + 1}</div>
                                    <div className="text-sm font-bold text-white">{score || "-"}</div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  );
}