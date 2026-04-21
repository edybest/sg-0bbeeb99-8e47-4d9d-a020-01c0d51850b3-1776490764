import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    Trophy,
    Users,
    Medal,
    TrendingUp,
    Calendar,
    Crown,
    Zap,
    Star,
    Loader2,
} from "lucide-react";
import { getTrioEnabledGames, getAllTrioRecordsByGame } from "@/services/trioService";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];

interface TrioTeam {
    id: string;
    rank: number;
    teamName: string;
    playerA: string;
    playerAId: string;
    playerB: string;
    playerBId: string;
    playerC: string;
    playerCId: string;
    scoreA: number;
    scoreB: number;
    scoreC: number;
    totalScore: number;
    averageScore: number;
}

export default function TrioPage() {
    const { toast } = useToast();
    const router = useRouter();

    const [games, setGames] = useState < Game[] > ([]);
    const [selectedGameId, setSelectedGameId] = useState < string > ("");
    const [trios, setTrios] = useState < TrioTeam[] > ([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isTrioLoading, setIsTrioLoading] = useState(false);

    const sortedTrios = useMemo(() => {
        return [...trios]
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((team, index) => ({
                ...team,
                rank: index + 1,
            }));
    }, [trios]);

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="w-6 h-6 text-yellow-400" />;
        if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
        if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />;
        return <Star className="w-5 h-5 text-slate-400" />;
    };

    const getRankBadgeColor = (index: number) => {
        if (index === 0) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
        if (index === 1) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
        if (index === 2) return "bg-gradient-to-r from-amber-500 to-amber-700 text-white";
        return "bg-slate-200 text-slate-700";
    };

    const getCardBorderColor = (index: number) => {
        if (index === 0) return "border-yellow-400 ring-2 ring-yellow-400 shadow-xl shadow-yellow-100";
        if (index === 1) return "border-gray-400 ring-2 ring-gray-300 shadow-lg shadow-gray-100";
        if (index === 2) return "border-amber-500 ring-2 ring-amber-400 shadow-lg shadow-amber-100";
        return "border-slate-200";
    };

    const loadGames = useCallback(async () => {
        try {
            setIsInitialLoading(true);

            const trioGames = await getTrioEnabledGames();
            setGames(trioGames);

            const dateFromQuery =
                typeof router.query.date === "string" ? router.query.date : "";

            if (dateFromQuery) {
                const matchedGame = trioGames.find((game) => game.game_date === dateFromQuery);
                if (matchedGame) {
                    setSelectedGameId(matchedGame.id);
                    return;
                }
            }

            if (trioGames.length > 0) {
                setSelectedGameId((prev) => prev || trioGames[0].id);
            } else {
                setSelectedGameId("");
                setTrios([]);
            }
        } catch (error) {
            console.error("Error loading games:", error);
            toast({
                title: "Error",
                description: "Gagal memuatkan data games",
                variant: "destructive",
            });
        } finally {
            setIsInitialLoading(false);
        }
    }, [router.query.date, toast]);

    const loadTrioData = useCallback(async (gameId: string) => {
        if (!gameId) {
            setTrios([]);
            return;
        }

        try {
            setIsTrioLoading(true);

            const selectedGame = games.find((game) => game.id === gameId);
            if (!selectedGame) {
                setTrios([]);
                return;
            }

            const allTrioRecords = await getAllTrioRecordsByGame(selectedGame.id);
            const trioRecords = allTrioRecords.filter((trio) => trio.is_drawn === true);

            const { data: gamePlayers, error: scoresError } = await supabase
                .from("game_players")
                .select("member_id, overall_score")
                .eq("game_id", selectedGame.id);

            if (scoresError) {
                console.error("Error fetching scores:", scoresError);
                throw scoresError;
            }

            const scoreMap = new Map < string, number> ();
            for (const player of gamePlayers ?? []) {
                scoreMap.set(player.member_id, player.overall_score ?? 0);
            }

            const teams: TrioTeam[] = trioRecords
                .filter((trio) => trio.player1 && trio.player2 && trio.player3)
                .map((trio) => {
                    const player1 = trio.player1!;
                    const player2 = trio.player2!;
                    const player3 = trio.player3!;

                    const scoreA = scoreMap.get(player1.id) ?? 0;
                    const scoreB = scoreMap.get(player2.id) ?? 0;
                    const scoreC = scoreMap.get(player3.id) ?? 0;
                    const totalScore = scoreA + scoreB + scoreC;

                    return {
                        id: trio.id,
                        rank: 0,
                        teamName: player1.username,
                        playerA: player1.username,
                        playerAId: player1.id,
                        playerB: player2.username,
                        playerBId: player2.id,
                        playerC: player3.username,
                        playerCId: player3.id,
                        scoreA,
                        scoreB,
                        scoreC,
                        totalScore,
                        averageScore: Number((totalScore / 3).toFixed(2)),
                    };
                });

            setTrios(teams);
        } catch (error) {
            console.error("Error loading trio data:", error);
            setTrios([]);
            toast({
                title: "Error",
                description: "Gagal memuatkan data trio",
                variant: "destructive",
            });
        } finally {
            setIsTrioLoading(false);
        }
    }, [games, toast]);

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    useEffect(() => {
        const dateFromQuery = typeof router.query.date === "string" ? router.query.date : "";
        if (!dateFromQuery || games.length === 0) return;

        const matchedGame = games.find((game) => game.game_date === dateFromQuery);
        if (matchedGame && matchedGame.id !== selectedGameId) {
            setSelectedGameId(matchedGame.id);
        }
    }, [router.query.date, games, selectedGameId]);

    useEffect(() => {
        if (!selectedGameId || games.length === 0) return;
        loadTrioData(selectedGameId);
    }, [selectedGameId, games, loadTrioData]);

    const hasGames = games.length > 0;
    const hasTrios = sortedTrios.length > 0;

    if (isInitialLoading) {
        return (
            <MemberLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </MemberLayout>
        );
    }

    return (
        <MemberLayout>
            <div className="container mx-auto max-w-6xl px-3 py-4 sm:p-4">
                <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-4 py-6 text-white shadow-xl sm:mb-8 sm:rounded-3xl sm:p-8 sm:shadow-2xl">
                    <div className="absolute inset-0 bg-[url('/bowling-pattern.svg')] opacity-10" />
                    <div className="relative z-10">
                        <div className="mb-2 flex items-center justify-center gap-2 sm:mb-3 sm:gap-3">
                            <Trophy className="h-8 w-8 animate-pulse text-yellow-300 sm:h-12 sm:w-12" />
                            <h1 className="text-center text-2xl font-black tracking-tight drop-shadow-lg sm:text-5xl">
                                TRIO LEADERBOARD
                            </h1>
                            <Trophy className="h-8 w-8 animate-pulse text-yellow-300 sm:h-12 sm:w-12" />
                        </div>
                        <p className="text-center text-sm font-medium text-indigo-100 sm:text-xl">
                            Battle Royale Edition
                        </p>
                    </div>
                    <div className="absolute -bottom-8 -right-8 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -left-8 -top-8 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                </div>

                <Card className="mb-5 border border-indigo-100 bg-white p-4 shadow-sm sm:mb-8 sm:border-2 sm:bg-gradient-to-r sm:from-white sm:to-indigo-50 sm:p-6 sm:shadow-lg">
                    <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
                        <Calendar className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6" />
                        <h2 className="text-base font-bold text-slate-800 sm:text-xl">Pilih Tarikh Game</h2>
                    </div>
                    <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                        <SelectTrigger className="h-11 w-full border-indigo-200 bg-white text-sm focus:ring-indigo-500 sm:h-14 sm:text-lg">
                            <SelectValue placeholder="Pilih game untuk lihat leaderboard" />
                        </SelectTrigger>
                        <SelectContent>
                            {games.map((game) => (
                                <SelectItem key={game.id} value={game.id} className="py-3 text-base">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-indigo-600" />
                                        {new Date(game.game_date).toLocaleDateString("ms-MY", {
                                            day: "2-digit",
                                            month: "long",
                                            year: "numeric",
                                        })}{" "}
                                        - {game.game_name || "Game"}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Card>

                {isTrioLoading ? (
                    <Card className="p-12 text-center shadow-lg">
                        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-indigo-600" />
                        <h3 className="text-2xl font-bold mb-2">Memuatkan Leaderboard Trio</h3>
                        <p className="text-muted-foreground">Sila tunggu sebentar...</p>
                    </Card>
                ) : !hasGames ? (
                    <Card className="border-2 border-dashed p-12 text-center shadow-lg">
                        <Trophy className="mx-auto mb-4 h-20 w-20 text-slate-300" />
                        <h3 className="mb-2 text-2xl font-bold">Tiada Game Trio</h3>
                        <p className="text-muted-foreground">
                            Belum ada game dengan Trio Mode diaktifkan.
                        </p>
                    </Card>
                ) : !hasTrios ? (
                    <Card className="border-2 border-dashed p-12 text-center shadow-lg">
                        <Users className="mx-auto mb-4 h-20 w-20 text-slate-300" />
                        <h3 className="mb-2 text-2xl font-bold">Tiada Pasukan Trio</h3>
                        <p className="text-muted-foreground">
                            Belum ada pasukan trio yang telah di-draw untuk game ini.
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sortedTrios.slice(0, 3).length > 0 && (
                            <div className="mb-6 grid grid-cols-1 gap-3 sm:gap-4 md:mb-8 md:grid-cols-3 md:gap-6">
                                {sortedTrios[1] && (
                                    <Card className="border border-gray-300 bg-white p-4 shadow-sm transition-all duration-300 sm:border-2 sm:bg-gradient-to-br sm:from-gray-50 sm:to-gray-100 sm:p-6 sm:shadow-xl sm:hover:scale-105">
                                        <div className="mb-4 text-center">
                                            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 shadow sm:mb-3 sm:h-16 sm:w-16 sm:bg-gray-300 sm:shadow-lg">
                                                <Medal className="h-10 w-10 text-gray-600" />
                                            </div>
                                            <div className="mb-1 text-4xl font-black text-gray-600 sm:mb-2 sm:text-6xl">2</div>
                                            <Badge className="bg-gray-400 px-3 py-1 text-sm text-white">SILVER</Badge>
                                        </div>
                                        <div className="space-y-2 text-center">
                                            <div className="text-sm font-semibold text-gray-600">Ketua Trio</div>
                                            <div className="text-lg font-bold text-gray-900 sm:text-xl">
                                                {sortedTrios[1].playerA}
                                                <span className="ml-1 font-medium text-gray-500">
                                                    ({sortedTrios[1].scoreA})
                                                </span>
                                            </div>
                                            <div className="mb-2 text-[11px] leading-relaxed text-gray-500 sm:text-xs">
                                                B: {sortedTrios[1].playerB} ({sortedTrios[1].scoreB}) • C: {sortedTrios[1].playerC} ({sortedTrios[1].scoreC})
                                            </div>
                                            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 sm:mt-4 sm:bg-white/70 sm:p-3">
                                                <TrendingUp className="h-5 w-5 text-gray-600" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-2xl font-black text-gray-700 sm:text-3xl">
                                                        {sortedTrios[1].totalScore}
                                                    </span>
                                                    <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                        Total Score
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {sortedTrios[0] && (
                                    <Card className="order-first border-2 border-yellow-300 bg-white p-5 shadow-md transition-all duration-300 sm:border-4 sm:border-yellow-400 sm:bg-gradient-to-br sm:from-yellow-50 sm:via-yellow-100 sm:to-amber-100 sm:p-8 sm:shadow-2xl sm:hover:scale-105 md:order-none md:-translate-y-4">
                                        <div className="mb-4 text-center">
                                            <div className="mb-2 inline-flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg sm:mb-3 sm:h-20 sm:w-20 sm:shadow-2xl">
                                                <Crown className="h-8 w-8 text-white sm:h-12 sm:w-12" />
                                            </div>
                                            <div className="mb-1 text-5xl font-black text-yellow-600 drop-shadow-lg sm:mb-2 sm:text-7xl">1</div>
                                            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-4 py-1.5 text-base text-white shadow-lg">
                                                CHAMPION 🏆
                                            </Badge>
                                        </div>
                                        <div className="space-y-3 text-center">
                                            <div className="text-sm font-bold uppercase tracking-wider text-yellow-700">
                                                Ketua Trio
                                            </div>
                                            <div className="text-xl font-black text-yellow-900 sm:text-2xl">
                                                {sortedTrios[0].playerA}
                                                <span className="ml-1 font-medium text-yellow-700">
                                                    ({sortedTrios[0].scoreA})
                                                </span>
                                            </div>
                                            <div className="mb-3 text-xs font-medium leading-relaxed text-yellow-700 sm:text-sm">
                                                B: {sortedTrios[0].playerB} ({sortedTrios[0].scoreB}) • C: {sortedTrios[0].playerC} ({sortedTrios[0].scoreC})
                                            </div>
                                            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-3 shadow sm:mt-4 sm:bg-white/80 sm:p-4 sm:shadow-lg">
                                                <Zap className="h-6 w-6 text-yellow-600" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-3xl font-black text-yellow-700 sm:text-4xl">
                                                        {sortedTrios[0].totalScore}
                                                    </span>
                                                    <span className="mt-1 text-[11px] font-bold uppercase tracking-widest text-yellow-600">
                                                        Total Score
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {sortedTrios[2] && (
                                    <Card className="border border-amber-300 bg-white p-4 shadow-sm transition-all duration-300 sm:border-2 sm:border-amber-500 sm:bg-gradient-to-br sm:from-amber-50 sm:to-amber-100 sm:p-6 sm:shadow-xl sm:hover:scale-105">
                                        <div className="mb-4 text-center">
                                            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-300 shadow sm:mb-3 sm:h-16 sm:w-16 sm:bg-amber-400 sm:shadow-lg">
                                                <Medal className="h-10 w-10 text-amber-700" />
                                            </div>
                                            <div className="mb-1 text-4xl font-black text-amber-700 sm:mb-2 sm:text-6xl">3</div>
                                            <Badge className="bg-amber-500 px-3 py-1 text-sm text-white">BRONZE</Badge>
                                        </div>
                                        <div className="space-y-2 text-center">
                                            <div className="text-sm font-semibold text-amber-700">Ketua Trio</div>
                                            <div className="text-lg font-bold text-amber-900 sm:text-xl">
                                                {sortedTrios[2].playerA}
                                                <span className="ml-1 font-medium text-amber-700">
                                                    ({sortedTrios[2].scoreA})
                                                </span>
                                            </div>
                                            <div className="mb-2 text-[11px] leading-relaxed text-amber-700 sm:text-xs">
                                                B: {sortedTrios[2].playerB} ({sortedTrios[2].scoreB}) • C: {sortedTrios[2].playerC} ({sortedTrios[2].scoreC})
                                            </div>
                                            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 sm:mt-4 sm:bg-white/70 sm:p-3">
                                                <TrendingUp className="h-5 w-5 text-amber-600" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-2xl font-black text-amber-700 sm:text-3xl">
                                                        {sortedTrios[2].totalScore}
                                                    </span>
                                                    <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                                                        Total Score
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        )}

                        {sortedTrios.slice(3).map((trio, idx) => {
                            const actualIndex = idx + 3;

                            return (
                                <Card
                                    key={trio.id}
                                    className={`border p-4 transition-all duration-300 sm:border-2 sm:p-6 sm:hover:-translate-y-1 sm:hover:shadow-lg ${getCardBorderColor(actualIndex)}`}
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                                        <div className="flex items-center gap-3 md:flex-shrink-0">
                                            <div
                                                className={`flex h-11 w-11 items-center justify-center rounded-lg shadow ${getRankBadgeColor(actualIndex)} sm:h-16 sm:w-16 sm:rounded-xl sm:shadow-lg`}
                                            >
                                                <span className="text-xl font-black sm:text-3xl">{actualIndex + 1}</span>
                                            </div>
                                            <div className="md:hidden">
                                                <div className="mb-1 flex items-center gap-2">
                                                    {getRankIcon(actualIndex)}
                                                    <Badge
                                                        variant="outline"
                                                        className="border-indigo-200 bg-indigo-50 text-[10px] text-indigo-600"
                                                    >
                                                        Ketua Trio
                                                    </Badge>
                                                </div>
                                                <h3 className="text-lg font-black text-slate-900 leading-tight">
                                                    {trio.playerA}
                                                    <span className="ml-1 text-base font-medium text-slate-500">
                                                        ({trio.scoreA})
                                                    </span>
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="w-full min-w-0 flex-1">
                                            <div className="mb-2 hidden items-center gap-2 md:flex">
                                                {getRankIcon(actualIndex)}
                                                <h3 className="truncate text-2xl font-black text-slate-900">
                                                    {trio.playerA}
                                                    <span className="ml-1 text-lg font-medium text-slate-500">
                                                        ({trio.scoreA})
                                                    </span>
                                                </h3>
                                                <Badge
                                                    variant="outline"
                                                    className="ml-2 border-indigo-200 bg-indigo-50 text-xs text-indigo-600"
                                                >
                                                    Ketua Trio
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2 sm:gap-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-blue-500 shadow-sm" />
                                                        <span className="font-medium text-slate-600">Player B:</span>
                                                        <span className="truncate font-bold text-slate-900">
                                                            {trio.playerB}
                                                        </span>
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className="border border-slate-200 bg-white font-black text-slate-700"
                                                    >
                                                        {trio.scoreB}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-sm" />
                                                        <span className="font-medium text-slate-600">Player C:</span>
                                                        <span className="truncate font-bold text-slate-900">
                                                            {trio.playerC}
                                                        </span>
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className="border border-slate-200 bg-white font-black text-slate-700"
                                                    >
                                                        {trio.scoreC}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full flex-shrink-0 text-left md:mt-0 md:w-auto md:text-right">
                                            <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 shadow-inner md:justify-end md:gap-2 md:px-6">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 md:hidden">
                                                    Total Score
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6" />
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-3xl font-black leading-none text-indigo-700 sm:text-4xl">
                                                            {trio.totalScore}
                                                        </span>
                                                        <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-wider text-indigo-500 md:block">
                                                            Total Score
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <div className="mt-6 text-center sm:mt-8">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => router.push("/member/blok")}
                        className="w-full px-5 py-5 text-base font-bold shadow-sm hover:border-indigo-300 hover:bg-indigo-50 sm:w-auto sm:px-8 sm:py-6 sm:text-lg"
                    >
                        ← Kembali ke Page Blok
                    </Button>
                </div>
            </div>
        </MemberLayout>
    );
}
