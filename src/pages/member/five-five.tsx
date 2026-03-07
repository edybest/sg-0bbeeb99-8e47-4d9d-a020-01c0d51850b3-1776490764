import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fivefiveService, type ParticipantWithPrizes } from "@/services/fivefiveService";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, Calendar, Trophy, DollarSign } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";

type FiveFiveGame = Tables<"fivefive_games">;

export default function FiveFivePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<FiveFiveGame[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<FiveFiveGame | null>(null);
  const [prizes, setPrizes] = useState<ParticipantWithPrizes[]>([]);
  const [loadingPrizes, setLoadingPrizes] = useState(false);

  useEffect(() => {
    checkAuth();
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadGamesByDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedGame) {
      calculatePrizes();
    }
  }, [selectedGame]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }
  };

  const loadGames = async () => {
    try {
      setLoading(true);
      const data = await fivefiveService.getAllGames();
      setGames(data);

      // Set today's date as default
      const today = new Date().toISOString().split("T")[0];
      setSelectedDate(today);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGamesByDate = async (date: string) => {
    try {
      const data = await fivefiveService.getGamesByDate(date);
      if (data.length > 0) {
        setSelectedGame(data[0]); // Select first game of the day
      } else {
        setSelectedGame(null);
        setPrizes([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculatePrizes = async () => {
    if (!selectedGame) return;

    try {
      setLoadingPrizes(true);
      const calculatedPrizes = await fivefiveService.calculatePrizes(selectedGame.id);
      setPrizes(calculatedPrizes);
    } catch (error: any) {
      toast({
        title: "Error calculating prizes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPrizes(false);
    }
  };

  // Get unique dates from games
  const uniqueDates = Array.from(new Set(games.map((g) => g.game_date))).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-MY", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <SEO
        title="FiveFive Prize Distribution | AMBC CLUB"
        description="View FiveFive game prize distribution and winnings"
      />

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <ClubLogo size="md" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">FiveFive</h1>
                  <p className="text-sm text-gray-600">Prize Distribution</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/member")}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Date Selector Card */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-red-600" />
                    Select Game Date
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Choose a date to view FiveFive prize distribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-gray-700">
                        Game Date
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    {uniqueDates.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-gray-700">Recent Games</Label>
                        <div className="flex flex-wrap gap-2">
                          {uniqueDates.slice(0, 5).map((date) => (
                            <Button
                              key={date}
                              variant={selectedDate === date ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedDate(date)}
                              className={
                                selectedDate === date
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
                              }
                            >
                              {formatDate(date)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Prize Distribution Table */}
              {selectedGame ? (
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-red-600" />
                      Prize Distribution
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {formatDate(selectedGame.game_date)} - Total {prizes.length} players
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingPrizes ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                      </div>
                    ) : prizes.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Player
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                G1
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                G2
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                G3
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                G4
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                G5
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider bg-red-50">
                                Total Prize
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {prizes
                              .sort((a, b) => (b.total_prize || 0) - (a.total_prize || 0))
                              .map((prize) => (
                                <tr
                                  key={prize.member_id}
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      {prize.member.avatar_url ? (
                                        <img
                                          src={prize.member.avatar_url}
                                          alt={prize.member.username}
                                          className="w-10 h-10 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold">
                                          {prize.member.username.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-medium text-gray-900">
                                          {prize.member.full_name}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          @{prize.member.username}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                                    {formatCurrency(prize.game1_prize || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                                    {formatCurrency(prize.game2_prize || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                                    {formatCurrency(prize.game3_prize || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                                    {formatCurrency(prize.game4_prize || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                                    {formatCurrency(prize.game5_prize || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right bg-red-50">
                                    <div className="font-bold text-red-600 flex items-center justify-end gap-1">
                                      <DollarSign className="w-4 h-4" />
                                      {formatCurrency(prize.total_prize || 0)}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                          <tfoot className="border-t-2 border-gray-300">
                            <tr className="bg-gray-50">
                              <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                {formatCurrency(
                                  prizes.reduce((sum, p) => sum + (p.game1_prize || 0), 0)
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                {formatCurrency(
                                  prizes.reduce((sum, p) => sum + (p.game2_prize || 0), 0)
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                {formatCurrency(
                                  prizes.reduce((sum, p) => sum + (p.game3_prize || 0), 0)
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                {formatCurrency(
                                  prizes.reduce((sum, p) => sum + (p.game4_prize || 0), 0)
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                {formatCurrency(
                                  prizes.reduce((sum, p) => sum + (p.game5_prize || 0), 0)
                                )}
                              </td>
                              <td className="px-4 py-3 text-right bg-red-50">
                                <div className="font-bold text-red-600 flex items-center justify-end gap-1">
                                  <DollarSign className="w-5 h-5" />
                                  {formatCurrency(
                                    prizes.reduce((sum, p) => sum + (p.total_prize || 0), 0)
                                  )}
                                </div>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No prize data available for this date</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Scores must be entered first to calculate prizes
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white border-gray-200">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No game found for selected date</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Please select a different date or check with admin
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}