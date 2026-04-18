import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MemberLayout } from "@/components/member/MemberLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Trophy, Users } from "lucide-react";

type GameSummary = Pick<
  Tables<"games">,
  "id" | "game_name" | "game_date" | "double_enabled" | "trio_enabled" | "men_vs_women_enabled" | "women_handicap"
>;

type RawPlayerScore = Pick<
  Tables<"game_players">,
  "id" | "game1_score" | "game2_score" | "game3_score" | "game4_score" | "game5_score" | "handicap" | "total_score" | "overall_score" | "average_score"
> & {
  member: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    sex: string | null;
  } | null;
};

interface LeaderboardEntry {
  id: string;
  memberId: string;
  username: string;
  avatarUrl: string | null;
  sex: string | null;
  game1: number;
  game2: number;
  game3: number;
  game4: number;
  game5: number;
  handicap: number;
  total: number;
  overall: number;
  average: number;
  rank: number;
}

interface DoubleRecord {
  id: string;
  player1?: { username: string; avatar_url: string | null };
  player2?: { username: string; avatar_url: string | null };
  player1_score: number;
  player2_score: number;
  total_score: number;
}

interface TrioRecord {
  id: string;
  player1?: { username: string; avatar_url: string | null };
  player2?: { username: string; avatar_url: string | null };
  player3?: { username: string; avatar_url: string | null };
  player1_score: number;
  player2_score: number;
  player3_score: number;
  total_score: number;
}

interface MenVsWomenSummary {
  menTotal: number;
  womenTotal: number;
  menCount: number;
  womenCount: number;
  womenHandicap: number;
}

function buildLeaderboard(rows: RawPlayerScore[]): LeaderboardEntry[] {
  return [...rows]
    .sort((a, b) => {
      if ((b.overall_score ?? 0) !== (a.overall_score ?? 0)) return (b.overall_score ?? 0) - (a.overall_score ?? 0);
      return (b.total_score ?? 0) - (a.total_score ?? 0);
    })
    .map((row, index) => ({
      id: row.id,
      memberId: row.member?.id ?? row.id,
      username: row.member?.username ?? "unknown",
      avatarUrl: row.member?.avatar_url ?? null,
      sex: row.member?.sex ?? null,
      game1: row.game1_score ?? 0,
      game2: row.game2_score ?? 0,
      game3: row.game3_score ?? 0,
      game4: row.game4_score ?? 0,
      game5: row.game5_score ?? 0,
      handicap: row.handicap ?? 0,
      total: row.total_score ?? 0,
      overall: row.overall_score ?? 0,
      average: row.average_score ?? 0,
      rank: index + 1,
    }));
}

export default function BlokPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth(false);
  const { toast } = useToast();

  const [games, setGames] = useState<GameSummary[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [doubleDialogOpen, setDoubleDialogOpen] = useState(false);
  const [doubleRecords, setDoubleRecords] = useState<DoubleRecord[]>([]);
  const [loadingDoubles, setLoadingDoubles] = useState(false);

  const [trioDialogOpen, setTrioDialogOpen] = useState(false);
  const [trioRecords, setTrioRecords] = useState<TrioRecord[]>([]);
  const [loadingTrios, setLoadingTrios] = useState(false);

  const [menDialogOpen, setMenDialogOpen] = useState(false);
  const [menSummary, setMenSummary] = useState<MenVsWomenSummary | null>(null);
  const [loadingMenSummary, setLoadingMenSummary] = useState(false);

  const currentGame = useMemo(
    () => games.find((game) => game.id === selectedGame) ?? null,
    [games, selectedGame]
  );

  const loadGames = useCallback(async () => {
    try {
      setLoadingGames(true);
      const { data, error: dbError } = await supabase
        .from("games")
        .select("id, game_name, game_date, double_enabled, trio_enabled, men_vs_women_enabled, women_handicap")
        .neq("game_type", "COUPLE")
        .order("game_date", { ascending: false });

      if (dbError) throw dbError;
      const nextGames = data ?? [];
      setGames(nextGames);

      const queryGameId = typeof router.query.gameId === "string" ? router.query.gameId : "";
      const initialGameId = queryGameId && nextGames.some((game) => game.id === queryGameId) ? queryGameId : nextGames[0]?.id ?? "";
      setSelectedGame((prev) => prev || initialGameId);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load games";
      setError(message);
    } finally {
      setLoadingGames(false);
    }
  }, [router.query.gameId]);

  const loadLeaderboard = useCallback(async (gameId: string) => {
    if (!gameId) return;
    setLoadingLeaderboard(true);
    setLoadingProgress(8);
    const progressTimer = window.setInterval(() => {
      setLoadingProgress((prev) => (prev >= 88 ? prev : prev + 8));
    }, 180);

    try {
      const { data, error: dbError } = await supabase
        .from("game_players")
        .select("id, game1_score, game2_score, game3_score, game4_score, game5_score, handicap, total_score, overall_score, average_score, member:members!game_players_member_id_fkey(id, username, full_name, avatar_url, sex)")
        .eq("game_id", gameId);

      if (dbError) throw dbError;
      setLeaderboard(buildLeaderboard((data ?? []) as unknown as RawPlayerScore[]));
      setError(null);
      setLoadingProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load leaderboard";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      window.clearInterval(progressTimer);
      setLoadingLeaderboard(false);
      setLoadingProgress(0);
    }
  }, [toast]);

  const loadDoubleRecords = useCallback(async (gameId: string) => {
    try {
      setLoadingDoubles(true);
      const { data, error: dbError } = await supabase
        .from("double_records")
        .select("id, player1_score, player2_score, total_score, player1:members!double_records_player1_id_fkey(username, avatar_url), player2:members!double_records_player2_id_fkey(username, avatar_url)")
        .eq("game_id", gameId)
        .order("total_score", { ascending: false });
      if (dbError) throw dbError;
      setDoubleRecords((data ?? []) as DoubleRecord[]);
    } catch {
      toast({ title: "Error", description: "Failed to load double records", variant: "destructive" });
    } finally {
      setLoadingDoubles(false);
    }
  }, [toast]);

  const loadTrioRecords = useCallback(async (gameId: string) => {
    try {
      setLoadingTrios(true);
      const { data, error: dbError } = await supabase
        .from("trio_records")
        .select("id, player1_score, player2_score, player3_score, total_score, player1:members!trio_records_player1_id_fkey(username, avatar_url), player2:members!trio_records_player2_id_fkey(username, avatar_url), player3:members!trio_records_player3_id_fkey(username, avatar_url)")
        .eq("game_id", gameId)
        .order("total_score", { ascending: false });
      if (dbError) throw dbError;
      setTrioRecords((data ?? []) as TrioRecord[]);
    } catch {
      toast({ title: "Error", description: "Failed to load trio records", variant: "destructive" });
    } finally {
      setLoadingTrios(false);
    }
  }, [toast]);

  const loadMenVsWomen = useCallback(async (gameId: string) => {
    try {
      setLoadingMenSummary(true);
      const game = games.find((entry) => entry.id === gameId);
      const { data, error: dbError } = await supabase
        .from("game_players")
        .select("total_score, exclude_from_men_vs_women, member:members!game_players_member_id_fkey(sex)")
        .eq("game_id", gameId);

      if (dbError) throw dbError;

      let menTotal = 0;
      let womenTotal = 0;
      let menCount = 0;
      let womenCount = 0;

      (data ?? []).forEach((row: any) => {
        if (row.exclude_from_men_vs_women) return;
        if (row.member?.sex === "men") {
          menTotal += row.total_score ?? 0;
          menCount += 1;
        }
        if (row.member?.sex === "women") {
          womenTotal += row.total_score ?? 0;
          womenCount += 1;
        }
      });

      const womenHandicap = game?.women_handicap ?? 0;
      setMenSummary({ menTotal, womenTotal: womenTotal + womenHandicap * womenCount, menCount, womenCount, womenHandicap });
    } catch {
      toast({ title: "Error", description: "Failed to load Men vs Women data", variant: "destructive" });
    } finally {
      setLoadingMenSummary(false);
    }
  }, [games, toast]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  useEffect(() => {
    if (selectedGame) void loadLeaderboard(selectedGame);
  }, [selectedGame, loadLeaderboard]);

  if (authLoading || loadingGames) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  }

  return (
    <MemberLayout>
      <>
        <SEO title="Blok Leaderboard - AMBC CLUB" description="View Blok leaderboard, Double, Trio, and Men vs Women results." />
        <div className="min-h-screen bg-slate-50">
          <header className="sticky top-0 z-20 border-b bg-white">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/member")}><ArrowLeft className="h-5 w-5" /></Button>
              <div><h1 className="text-xl font-bold text-slate-900">Blok Leaderboard</h1><p className="text-sm text-slate-500">Live standings</p></div>
            </div>
          </header>

          <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />Select Game</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <select value={selectedGame} onChange={(event) => setSelectedGame(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.game_name} ({new Date(game.game_date).toLocaleDateString("ms-MY", { day: "2-digit", month: "short", year: "numeric" })})
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-2">
                  {currentGame?.double_enabled && <Button variant="outline" onClick={() => { setDoubleDialogOpen(true); void loadDoubleRecords(selectedGame); }}>Score Double</Button>}
                  {currentGame?.trio_enabled && <Button variant="outline" onClick={() => { setTrioDialogOpen(true); void loadTrioRecords(selectedGame); }}>Score Trio</Button>}
                  {currentGame?.men_vs_women_enabled && <Button variant="outline" onClick={() => { setMenDialogOpen(true); void loadMenVsWomen(selectedGame); }}>Men vs Women</Button>}
                </div>
              </CardContent>
            </Card>

            {loadingLeaderboard ? (
              <Card><CardContent className="py-10"><div className="mx-auto max-w-md text-center"><Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-sky-600" /><div className="mb-2 h-2.5 overflow-hidden rounded-full bg-sky-100"><div className="h-2.5 rounded-full bg-sky-600 transition-all duration-200" style={{ width: `${loadingProgress}%` }} /></div><p className="text-sm font-semibold text-sky-700">Loading leaderboard... {loadingProgress}%</p></div></CardContent></Card>
            ) : error ? (
              <Card><CardContent className="py-10 text-center text-red-600">{error}</CardContent></Card>
            ) : leaderboard.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-slate-500">No leaderboard data yet for this game.</CardContent></Card>
            ) : (
              <>
                <div className="md:hidden">
                  <div className="mb-2 grid grid-cols-[1fr_88px] gap-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>Pemain</span>
                    <span className="text-right">Score</span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {leaderboard.map((player, index) => (
                      <div
                        key={player.id}
                        className={`grid grid-cols-[1fr_88px] gap-3 px-3 py-3 ${index === 0 ? "" : "border-t border-slate-100"}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                            {player.rank}
                          </div>

                          {player.avatarUrl ? (
                            <Image
                              src={player.avatarUrl}
                              alt={player.username}
                              width={36}
                              height={36}
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
                              {player.username[0]?.toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <Link
                              href={`/member/profile?id=${player.memberId}`}
                              className="block truncate text-sm font-semibold text-slate-900 hover:text-sky-700"
                            >
                              @{player.username}
                            </Link>
                            <p className="truncate text-xs text-slate-500">
                              Avg {player.average} · HDCP {player.handicap}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold leading-none text-sky-700">{player.overall}</p>
                          <p className="mt-1 text-xs text-slate-500">Total {player.total}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Card className="hidden md:block">
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-slate-700"><tr><th className="px-4 py-3 text-left">Rank</th><th className="px-4 py-3 text-left">Player</th><th className="px-3 py-3 text-right">G1</th><th className="px-3 py-3 text-right">G2</th><th className="px-3 py-3 text-right">G3</th><th className="px-3 py-3 text-right">G4</th><th className="px-3 py-3 text-right">G5</th><th className="px-3 py-3 text-right">HDCP</th><th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3 text-right">Overall</th></tr></thead>
                      <tbody>
                        {leaderboard.map((player) => (
                          <tr key={player.id} className="border-t">
                            <td className="px-4 py-3 font-semibold">#{player.rank}</td>
                            <td className="px-4 py-3"><Link href={`/member/profile?id=${player.memberId}`} className="font-medium text-slate-900 hover:text-sky-700">@{player.username}</Link></td>
                            <td className="px-3 py-3 text-right">{player.game1}</td><td className="px-3 py-3 text-right">{player.game2}</td><td className="px-3 py-3 text-right">{player.game3}</td><td className="px-3 py-3 text-right">{player.game4}</td><td className="px-3 py-3 text-right">{player.game5}</td><td className="px-3 py-3 text-right">{player.handicap}</td><td className="px-3 py-3 text-right font-semibold">{player.total}</td><td className="px-3 py-3 text-right font-bold text-sky-700">{player.overall}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
            )}
          </main>
        </div>

        <Dialog open={doubleDialogOpen} onOpenChange={setDoubleDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Score Double</DialogTitle><DialogDescription>Highest total score appears at the top.</DialogDescription></DialogHeader>{loadingDoubles ? <div className="py-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" /></div> : <div className="space-y-3">{doubleRecords.length === 0 ? <p className="text-sm text-slate-500">No double records yet.</p> : doubleRecords.map((record, index) => <div key={record.id} className="rounded-lg border p-3"><p className="font-semibold">#{index + 1} @{record.player1?.username} + @{record.player2?.username}</p><p className="text-sm text-slate-500">{record.player1_score} + {record.player2_score}</p><p className="font-bold text-sky-700">{record.total_score}</p></div>)}</div>}</DialogContent>
        </Dialog>

        <Dialog open={trioDialogOpen} onOpenChange={setTrioDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Score Trio</DialogTitle><DialogDescription>Highest trio total score appears at the top.</DialogDescription></DialogHeader>{loadingTrios ? <div className="py-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" /></div> : <div className="space-y-3">{trioRecords.length === 0 ? <p className="text-sm text-slate-500">No trio records yet.</p> : trioRecords.map((record, index) => <div key={record.id} className="rounded-lg border p-3"><p className="font-semibold">#{index + 1} @{record.player1?.username} + @{record.player2?.username} + @{record.player3?.username}</p><p className="text-sm text-slate-500">{record.player1_score} + {record.player2_score} + {record.player3_score}</p><p className="font-bold text-purple-700">{record.total_score}</p></div>)}</div>}</DialogContent>
        </Dialog>

        <Dialog open={menDialogOpen} onOpenChange={setMenDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Men vs Women</DialogTitle><DialogDescription>Summary for the selected game.</DialogDescription></DialogHeader>{loadingMenSummary ? <div className="py-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-pink-600" /></div> : menSummary && <div className="grid grid-cols-2 gap-4"><div className="rounded-lg border p-4"><p className="text-sm text-slate-500">Men</p><p className="text-2xl font-bold text-sky-700">{menSummary.menTotal}</p><p className="text-xs text-slate-500">{menSummary.menCount} players</p></div><div className="rounded-lg border p-4"><p className="text-sm text-slate-500">Women</p><p className="text-2xl font-bold text-pink-700">{menSummary.womenTotal}</p><p className="text-xs text-slate-500">{menSummary.womenCount} players · HDCP {menSummary.womenHandicap}</p></div></div>}</DialogContent>
        </Dialog>
      </>
    </MemberLayout>
  );
}