import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { gameService } from "@/services/gameService";
import { memberService } from "@/services/memberService";
import { coupleService } from "@/services/coupleService";
import { doubleService } from "@/services/doubleService";
import { CoupleScoreEntry } from "./CoupleScoreEntry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2,
    Save,
    Search,
    Upload,
    Check,
    AlertCircle,
    AlertTriangle,
    Info,
    RefreshCw,
    FileText,
    Sparkles,
} from "lucide-react";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

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
    handicap?: number;
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

type CleanGameWinners = {
    game1: string[];
    game2: string[];
    game3: string[];
    game4: string[];
    game5: string[];
};

type EditingScoresMap = Record<string, GamePlayer>;
type SortDirection = "asc" | "desc";

const DEFAULT_CLEAN_GAME_WINNERS: CleanGameWinners = {
    game1: [],
    game2: [],
    game3: [],
    game4: [],
    game5: [],
};

const scoreInputClassMap = {
    game1_score:
        "w-full h-9 bg-blue-50 border border-blue-200 text-blue-900 text-center font-bold focus:border-blue-600 focus:ring-2 focus:ring-blue-500/40 focus:bg-white",
    game2_score:
        "w-full h-9 bg-green-50 border border-green-200 text-green-900 text-center font-bold focus:border-green-600 focus:ring-2 focus:ring-green-500/40 focus:bg-white",
    game3_score:
        "w-full h-9 bg-purple-50 border border-purple-200 text-purple-900 text-center font-bold focus:border-purple-600 focus:ring-2 focus:ring-purple-500/40 focus:bg-white",
    game4_score:
        "w-full h-9 bg-orange-50 border border-orange-200 text-orange-900 text-center font-bold focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:bg-white",
    game5_score:
        "w-full h-9 bg-pink-50 border border-pink-200 text-pink-900 text-center font-bold focus:border-pink-600 focus:ring-2 focus:ring-pink-500/40 focus:bg-white",
    handicap:
        "w-full h-9 bg-yellow-50 border border-yellow-200 text-yellow-900 text-center font-bold focus:border-yellow-600 focus:ring-2 focus:ring-yellow-500/40 focus:bg-white",
} as const;

function sortPlayersByRank(data: GamePlayer[]) {
    return [...data].sort((a, b) => {
        if (a.overall_score !== b.overall_score) return b.overall_score - a.overall_score;
        if (a.game5_score !== b.game5_score) return b.game5_score - a.game5_score;
        if (a.game4_score !== b.game4_score) return b.game4_score - a.game4_score;
        if (a.game3_score !== b.game3_score) return b.game3_score - a.game3_score;
        if (a.game2_score !== b.game2_score) return b.game2_score - a.game2_score;
        return b.game1_score - a.game1_score;
    });
}

function recalculatePlayer(player: GamePlayer): GamePlayer {
    const total =
        player.game1_score +
        player.game2_score +
        player.game3_score +
        player.game4_score +
        player.game5_score;

    return {
        ...player,
        total_score: total,
        overall_score: total + player.handicap,
    };
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

function rankColor(rank: number) {
    if (rank === 0) return "text-yellow-500";
    if (rank === 1) return "text-gray-400";
    if (rank === 2) return "text-orange-600";
    return "text-gray-600";
}

function rankBadgeBg(rank: number) {
    if (rank === 0) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (rank === 1) return "bg-gray-50 text-gray-700 border-gray-200";
    if (rank === 2) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
}

type ScoreRowProps = {
    player: GamePlayer;
    rank: number;
    editedPlayer?: GamePlayer;
    saving: string | null;
    cleanGameWinners: CleanGameWinners;
    onScoreChange: (playerId: string, field: keyof GamePlayer, value: string) => void;
    onSave: (playerId: string) => void;
    onToggleCleanGameWinner: (memberId: string, gameNumber: 1 | 2 | 3 | 4 | 5) => void;
};

const ScoreRow = memo(function ScoreRow({
    player,
    rank,
    editedPlayer,
    saving,
    cleanGameWinners,
    onScoreChange,
    onSave,
    onToggleCleanGameWinner,
}: ScoreRowProps) {
    const displayPlayer = editedPlayer ?? player;
    const hasChanges = !!editedPlayer;

    return (
        <tr
            id={`player-${player.id}`}
            className={`transition-all duration-200 ${hasChanges ? "bg-yellow-50" : "hover:bg-gray-50"}`}
        >
            <td className="px-4 py-3 text-sm text-gray-900">
                <span className={`font-bold ${rankColor(rank)}`}>#{rank + 1}</span>
            </td>

            <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                    {player.members.avatar_url ? (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                                src={player.members.avatar_url}
                                alt={player.members.username}
                                fill
                                className="object-cover"
                                sizes="32px"
                                loading="lazy"
                            />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
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

            {[
                { field: "game1_score", gameNum: 1 as const },
                { field: "game2_score", gameNum: 2 as const },
                { field: "game3_score", gameNum: 3 as const },
                { field: "game4_score", gameNum: 4 as const },
                { field: "game5_score", gameNum: 5 as const },
            ].map(({ field, gameNum }) => (
                <td key={field} className="px-4 py-3 text-sm text-center">
                    <Input
                        type="number"
                        value={displayPlayer[field as keyof GamePlayer] as number}
                        onChange={(e) => onScoreChange(player.id, field as keyof GamePlayer, e.target.value)}
                        className={scoreInputClassMap[field as keyof typeof scoreInputClassMap]}
                        onFocus={(e) => e.target.select()}
                    />
                    <div className="flex items-center justify-center mt-1">
                        <Checkbox
                            checked={cleanGameWinners[`game${gameNum}`].includes(player.member_id)}
                            onCheckedChange={() => onToggleCleanGameWinner(player.member_id, gameNum)}
                            className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                        />
                        <span className="ml-1 text-xs text-gray-500">Clean</span>
                    </div>
                </td>
            ))}

            <td className="px-4 py-3 text-sm text-center">
                <Input
                    type="number"
                    value={displayPlayer.handicap}
                    onChange={(e) => onScoreChange(player.id, "handicap", e.target.value)}
                    className={scoreInputClassMap.handicap}
                    onFocus={(e) => e.target.select()}
                />
            </td>

            <td className="px-4 py-3 text-sm text-center text-gray-900 font-semibold">
                {displayPlayer.total_score}
            </td>

            <td className="px-4 py-3 text-sm text-center text-red-600 font-bold">
                {displayPlayer.overall_score}
            </td>

            <td className="px-4 py-3 text-sm text-right">
                {hasChanges && (
                    <Button
                        size="sm"
                        onClick={() => onSave(player.id)}
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
});

type MobileScoreCardProps = {
    player: GamePlayer;
    rank: number;
    editedPlayer?: GamePlayer;
    saving: string | null;
    cleanGameWinners: CleanGameWinners;
    onScoreChange: (playerId: string, field: keyof GamePlayer, value: string) => void;
    onSave: (playerId: string) => void;
    onToggleCleanGameWinner: (memberId: string, gameNumber: 1 | 2 | 3 | 4 | 5) => void;
};

const MobileScoreCard = memo(function MobileScoreCard({
    player,
    rank,
    editedPlayer,
    saving,
    cleanGameWinners,
    onScoreChange,
    onSave,
    onToggleCleanGameWinner,
}: MobileScoreCardProps) {
    const displayPlayer = editedPlayer ?? player;
    const hasChanges = !!editedPlayer;

    const games = [
        { label: "G1", field: "game1_score" as const, gameNum: 1 as const },
        { label: "G2", field: "game2_score" as const, gameNum: 2 as const },
        { label: "G3", field: "game3_score" as const, gameNum: 3 as const },
        { label: "G4", field: "game4_score" as const, gameNum: 4 as const },
        { label: "G5", field: "game5_score" as const, gameNum: 5 as const },
    ];

    return (
        <Card
            id={`player-${player.id}`}
            className={`border-gray-200 shadow-sm ${hasChanges ? "ring-2 ring-yellow-300 bg-yellow-50/40" : "bg-white"}`}
        >
            <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                    {player.members.avatar_url ? (
                        <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                                src={player.members.avatar_url}
                                alt={player.members.username}
                                fill
                                className="object-cover"
                                sizes="44px"
                                loading="lazy"
                            />
                        </div>
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {player.members.username[0].toUpperCase()}
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-gray-900 truncate">{player.members.username}</p>
                                    {player.clean_game && <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{player.members.full_name}</p>
                            </div>

                            <div className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-bold ${rankBadgeBg(rank)}`}>
                                #{rank + 1}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] text-slate-500">Total</div>
                        <div className="text-base font-bold text-slate-900">{displayPlayer.total_score}</div>
                    </div>

                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <div className="text-[11px] text-red-500">Overall</div>
                        <div className="text-base font-bold text-red-600">{displayPlayer.overall_score}</div>
                    </div>

                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2">
                        <div className="text-[11px] text-yellow-700">HCP</div>
                        <Input
                            type="number"
                            value={displayPlayer.handicap}
                            onChange={(e) => onScoreChange(player.id, "handicap", e.target.value)}
                            className="mt-1 h-8 text-center font-bold border-yellow-200 bg-white"
                            onFocus={(e) => e.target.select()}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {games.map((game) => (
                        <div key={game.field} className="rounded-xl border border-gray-200 p-3 bg-white">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-600">{game.label}</span>
                                <label className="flex items-center gap-1 text-[11px] text-gray-500">
                                    <Checkbox
                                        checked={cleanGameWinners[`game${game.gameNum}`].includes(player.member_id)}
                                        onCheckedChange={() => onToggleCleanGameWinner(player.member_id, game.gameNum)}
                                        className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                                    />
                                    Clean
                                </label>
                            </div>

                            <Input
                                type="number"
                                value={displayPlayer[game.field]}
                                onChange={(e) => onScoreChange(player.id, game.field, e.target.value)}
                                className={scoreInputClassMap[game.field]}
                                onFocus={(e) => e.target.select()}
                            />
                        </div>
                    ))}

                    <div className="rounded-xl border border-gray-200 p-3 bg-slate-50 flex items-center justify-between col-span-2">
                        <div>
                            <div className="text-xs text-slate-500">Perubahan</div>
                            <div className="text-sm font-semibold text-slate-800">
                                {hasChanges ? "Belum disimpan" : "Tiada perubahan"}
                            </div>
                        </div>

                        <Button
                            size="sm"
                            onClick={() => onSave(player.id)}
                            disabled={!hasChanges || saving === player.id}
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
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

function SortButton({
    field,
    label,
    sortField,
    sortDirection,
    onSort,
    className = "",
}: {
    field: string;
    label: string;
    sortField: string;
    sortDirection: SortDirection;
    onSort: (field: string) => void;
    className?: string;
}) {
    const icon =
        sortField !== field ? (
            <span className="text-gray-400 ml-1">⇅</span>
        ) : sortDirection === "asc" ? (
            <span className="text-red-600 ml-1">↑</span>
        ) : (
            <span className="text-red-600 ml-1">↓</span>
        );

    return (
        <button onClick={() => onSort(field)} className={`flex items-center transition-colors ${className}`}>
            {label} {icon}
        </button>
    );
}

export function ScoreManagement() {
    const [games, setGames] = useState < Game[] > ([]);
    const [selectedGameId, setSelectedGameId] = useState < string > ("");
    const [players, setPlayers] = useState < GamePlayer[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [saving, setSaving] = useState < string | null > (null);
    const [editingScores, setEditingScores] = useState < EditingScoresMap > ({});
    const [sortField, setSortField] = useState < string > ("rank");
    const [sortDirection, setSortDirection] = useState < SortDirection > ("asc");

    const [uploadedImage, setUploadedImage] = useState < File | null > (null);
    const [imagePreview, setImagePreview] = useState < string | null > (null);
    const [parsing, setParsing] = useState(false);
    const [ocrResult, setOcrResult] = useState < OCRResult | null > (null);
    const [parsedScores, setParsedScores] = useState < ParsedScore[] > ([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [allMembers, setAllMembers] = useState < Member[] > ([]);
    const [showRawText, setShowRawText] = useState(false);

    const [showCsvModal, setShowCsvModal] = useState(false);
    const [uploadedCsv, setUploadedCsv] = useState < File | null > (null);
    const [csvParsing, setCsvParsing] = useState(false);
    const [csvParsedScores, setCsvParsedScores] = useState < ParsedScore[] > ([]);

    const [cleanGameWinners, setCleanGameWinners] =
        useState < CleanGameWinners > (DEFAULT_CLEAN_GAME_WINNERS);

    const [isSyncingCouples, setIsSyncingCouples] = useState(false);

    const selectedGame = useMemo(
        () => games.find((g) => g.id === selectedGameId),
        [games, selectedGameId]
    );

    const isCoupleGame = selectedGame?.game_type === "COUPLE";

    const findBestMemberMatch = useCallback(
        (name: string): { member: Member; confidence: number } | null => {
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
        },
        [allMembers]
    );

    const loadAllMembers = useCallback(async () => {
        try {
            const data = await memberService.getAllMembers();
            setAllMembers(
                data.map((m: any) => ({
                    id: m.id,
                    username: m.username,
                    full_name: m.full_name,
                    handicap: m.handicap || 0,
                }))
            );
        } catch (error) {
            console.error("Error loading members:", error);
        }
    }, []);

    const loadGames = useCallback(async () => {
        try {
            const data = await gameService.getAllGames();
            setGames(data as unknown as Game[]);
            if (data.length > 0) {
                setSelectedGameId((prev) => prev || data[0].id);
            }
        } catch (error) {
            console.error("Error loading games:", error);
        }
    }, []);

    const loadCleanGameWinners = useCallback(async (gameId: string) => {
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
            setCleanGameWinners(DEFAULT_CLEAN_GAME_WINNERS);
        }
    }, []);

    const loadGamePlayers = useCallback(
        async (gameId: string) => {
            try {
                setLoadingPlayers(true);
                setEditingScores({});
                setCleanGameWinners(DEFAULT_CLEAN_GAME_WINNERS);

                const data = await gameService.getGamePlayers(gameId);
                const playersData = data as unknown as GamePlayer[];
                const sortedData = sortPlayersByRank(playersData);

                setPlayers(sortedData);
                setSortField("rank");
                setSortDirection("asc");

                loadCleanGameWinners(gameId);
            } catch (error) {
                console.error("Error loading players:", error);
                setPlayers([]);
            } finally {
                setLoadingPlayers(false);
            }
        },
        [loadCleanGameWinners]
    );

    useEffect(() => {
        let active = true;

        async function init() {
            try {
                setLoading(true);
                await Promise.all([loadGames(), loadAllMembers()]);
            } finally {
                if (active) setLoading(false);
            }
        }

        init();

        return () => {
            active = false;
        };
    }, [loadGames, loadAllMembers]);

    useEffect(() => {
        if (selectedGameId) {
            loadGamePlayers(selectedGameId);
        }
    }, [selectedGameId, loadGamePlayers]);

    const mergedPlayers = useMemo(() => {
        return players.map((player) => editingScores[player.id] ?? player);
    }, [players, editingScores]);

    const filteredPlayers = useMemo(() => {
        if (!searchQuery.trim()) return mergedPlayers;

        const query = searchQuery.toLowerCase();
        return mergedPlayers.filter(
            (p) =>
                p.members.username.toLowerCase().includes(query) ||
                p.members.full_name.toLowerCase().includes(query)
        );
    }, [mergedPlayers, searchQuery]);

    const displayedPlayers = useMemo(() => {
        const data = [...filteredPlayers];

        if (sortField === "rank") {
            return sortDirection === "asc" ? sortPlayersByRank(data) : [...sortPlayersByRank(data)].reverse();
        }

        return data.sort((a, b) => {
            if (sortField === "overall_score" || sortField === "total_score") {
                const mult = sortDirection === "asc" ? -1 : 1;
                const aValue = a[sortField];
                const bValue = b[sortField];

                if (aValue !== bValue) return (aValue - bValue) * mult;
                if (a.game5_score !== b.game5_score) return (a.game5_score - b.game5_score) * mult;
                if (a.game4_score !== b.game4_score) return (a.game4_score - b.game4_score) * mult;
                if (a.game3_score !== b.game3_score) return (a.game3_score - b.game3_score) * mult;
                if (a.game2_score !== b.game2_score) return (a.game2_score - b.game2_score) * mult;
                return (a.game1_score - b.game1_score) * mult;
            }

            if (sortField === "username" || sortField === "fullname") {
                const aValue =
                    sortField === "username"
                        ? a.members.username.toLowerCase()
                        : a.members.full_name.toLowerCase();
                const bValue =
                    sortField === "username"
                        ? b.members.username.toLowerCase()
                        : b.members.full_name.toLowerCase();

                if (sortDirection === "asc") return aValue > bValue ? 1 : -1;
                return aValue < bValue ? 1 : -1;
            }

            const aValue = (a[sortField as keyof GamePlayer] as number) ?? 0;
            const bValue = (b[sortField as keyof GamePlayer] as number) ?? 0;

            if (sortDirection === "asc") return aValue > bValue ? 1 : -1;
            return aValue < bValue ? 1 : -1;
        });
    }, [filteredPlayers, sortField, sortDirection]);

    const cleanGameSummary = useMemo(() => {
        const cleanGamePlayersCount = players.filter((p) => p.clean_game).length;
        const totalPrize = cleanGamePlayersCount * 2;

        return [1, 2, 3, 4, 5].map((gameNum) => {
            const key = `game${gameNum}` as keyof CleanGameWinners;
            const winners = cleanGameWinners[key];
            return {
                gameNum,
                totalPrize,
                winnerCount: winners.length,
                prizePerWinner: winners.length > 0 ? totalPrize / winners.length : 0,
            };
        });
    }, [players, cleanGameWinners]);

    const handleSort = useCallback((field: string) => {
        setSortField((prevField) => {
            if (prevField === field) {
                setSortDirection((prevDirection) => (prevDirection === "asc" ? "desc" : "asc"));
                return prevField;
            }

            setSortDirection("asc");
            return field;
        });
    }, []);

    const handleScoreChange = useCallback(
        (playerId: string, field: keyof GamePlayer, value: string) => {
            const numValue = parseInt(value, 10) || 0;

            setEditingScores((prev) => {
                const basePlayer = prev[playerId] ?? players.find((p) => p.id === playerId);
                if (!basePlayer) return prev;

                const updated = recalculatePlayer({
                    ...basePlayer,
                    [field]: numValue,
                });

                return { ...prev, [playerId]: updated };
            });
        },
        [players]
    );

    const handleSave = useCallback(
        async (playerId: string) => {
            const updates = editingScores[playerId];
            if (!updates) return;

            setSaving(playerId);

            const previousPlayers = players;
            const optimisticPlayers = sortPlayersByRank(
                players.map((p) => (p.id === playerId ? updates : p))
            );

            setPlayers(optimisticPlayers);

            try {
                await gameService.updatePlayerScores(playerId, {
                    game1_score: updates.game1_score,
                    game2_score: updates.game2_score,
                    game3_score: updates.game3_score,
                    game4_score: updates.game4_score,
                    game5_score: updates.game5_score,
                    handicap: updates.handicap,
                });

                await doubleService.syncDoubleScoresForGame(selectedGameId);
                await coupleService.syncCoupleScoresForGame(selectedGameId);

                setEditingScores((prev) => {
                    const next = { ...prev };
                    delete next[playerId];
                    return next;
                });
            } catch (error) {
                console.error("Error saving score:", error);
                alert("Gagal menyimpan skor");
                setPlayers(previousPlayers);
                await loadGamePlayers(selectedGameId);
            } finally {
                setSaving(null);
            }
        },
        [editingScores, players, selectedGameId, loadGamePlayers]
    );

    const handleSaveAll = useCallback(async () => {
        const playerIds = Object.keys(editingScores);
        if (playerIds.length === 0) return;

        setSaving("all");

        const previousPlayers = players;
        const optimisticPlayers = sortPlayersByRank(
            players.map((p) => editingScores[p.id] ?? p)
        );

        setPlayers(optimisticPlayers);

        try {
            const chunkSize = 10;

            for (let i = 0; i < playerIds.length; i += chunkSize) {
                const chunk = playerIds.slice(i, i + chunkSize);

                await Promise.all(
                    chunk.map((playerId) => {
                        const updates = editingScores[playerId];
                        return gameService.updatePlayerScores(playerId, {
                            game1_score: updates.game1_score,
                            game2_score: updates.game2_score,
                            game3_score: updates.game3_score,
                            game4_score: updates.game4_score,
                            game5_score: updates.game5_score,
                            handicap: updates.handicap,
                        });
                    })
                );
            }

            await doubleService.syncDoubleScoresForGame(selectedGameId);
            await coupleService.syncCoupleScoresForGame(selectedGameId);

            setEditingScores({});
        } catch (error) {
            console.error("Error saving all scores:", error);
            alert("Gagal menyimpan sebahagian skor. Sistem akan memuat turun semula data.");
            setPlayers(previousPlayers);
            await loadGamePlayers(selectedGameId);
        } finally {
            setSaving(null);
        }
    }, [editingScores, players, selectedGameId, loadGamePlayers]);

    const handleToggleCleanGameWinner = useCallback(
        async (memberId: string, gameNumber: 1 | 2 | 3 | 4 | 5) => {
            const gameKey = `game${gameNumber}` as keyof CleanGameWinners;
            const currentWinners = cleanGameWinners[gameKey];
            const isWinner = currentWinners.includes(memberId);

            const updatedWinners = isWinner
                ? currentWinners.filter((id) => id !== memberId)
                : [...currentWinners, memberId];

            const newCleanGameData = {
                ...cleanGameWinners,
                [gameKey]: updatedWinners,
            };

            setCleanGameWinners(newCleanGameData);

            try {
                const { error } = await supabase
                    .from("games")
                    .update({ clean_game_data: newCleanGameData })
                    .eq("id", selectedGameId);

                if (error) throw error;
            } catch (error) {
                console.error("Error updating clean game winner:", error);
                alert("Gagal mengemaskini pemenang clean game");
                await loadCleanGameWinners(selectedGameId);
            }
        },
        [cleanGameWinners, selectedGameId, loadCleanGameWinners]
    );

    const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        setUploadedImage(file);
        setOcrResult(null);
        setParsedScores([]);
        setShowRawText(false);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleParseImage = useCallback(async () => {
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
                    error: data.error || "Failed to parse image",
                });
                return;
            }

            setOcrResult(data);

            if (data.scores?.length > 0) {
                const scoresWithMatches = data.scores.map((score: any) => {
                    const match = findBestMemberMatch(score.name);
                    return {
                        ...score,
                        matchedMember: match?.member,
                        matchConfidence: match?.confidence,
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
                error: "Failed to parse image file",
            });
        } finally {
            setParsing(false);
        }
    }, [uploadedImage, allMembers, findBestMemberMatch]);

    const retryWithNewImage = useCallback(() => {
        setUploadedImage(null);
        setImagePreview(null);
        setOcrResult(null);
        setParsedScores([]);
        setShowRawText(false);
    }, []);

    const resetUpload = useCallback(() => {
        setUploadedImage(null);
        setImagePreview(null);
        setOcrResult(null);
        setParsedScores([]);
        setShowRawText(false);
        setShowUploadModal(false);
    }, []);

    const handleCsvSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".csv")) {
            alert("Please select a CSV file");
            return;
        }

        setUploadedCsv(file);
        setCsvParsedScores([]);
    }, []);

    const handleParseCsv = useCallback(async () => {
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

            const withMatches = (data.scores || []).map((score: ParsedScore) => {
                const match = score.matchedMember || findBestMemberMatch(score.name);

                return {
                    ...score,
                    matchedMember: score.matchedMember ?? (match && 'member' in match ? match.member : match),
                    matchConfidence: score.matchConfidence ?? (match && 'confidence' in match ? match.confidence : undefined),
                };
            });

            setCsvParsedScores(withMatches);

            if (withMatches.length === 0) {
                alert("Tiada skor detected in CSV. Check column names: name/player, g1/game1, g2/game2, etc.");
            }
        } catch (error) {
            console.error("Error parsing CSV:", error);
            alert("Failed to parse CSV file");
        } finally {
            setCsvParsing(false);
        }
    }, [uploadedCsv, allMembers, findBestMemberMatch]);

    const handleApplyCsvScore = useCallback(
        async (parsedScore: ParsedScore, skipSync = false) => {
            if (!parsedScore.matchedMember) return;

            let targetGameId = selectedGameId;

            if (parsedScore.date) {
                const existingGame = games.find((g) => g.game_date === parsedScore.date);

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
                            year: new Date(parsedScore.date).getFullYear(),
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

            let player = currentPlayers.find((p) => p.member_id === parsedScore.matchedMember!.id);

            if (!player) {
                try {
                    await gameService.addPlayerToGame(
                        targetGameId,
                        parsedScore.matchedMember!.id,
                        !!parsedScore.fivefive
                    );
                    const updatedData = await gameService.getGamePlayers(targetGameId);
                    currentPlayers = updatedData as unknown as GamePlayer[];
                    player = currentPlayers.find((p) => p.member_id === parsedScore.matchedMember!.id);
                } catch (err) {
                    console.error(err);
                    alert("Gagal menambah pemain baru ke dalam perlawanan");
                    return;
                }
            } else if (parsedScore.fivefive) {
                await gameService.updatePlayerFiveFiveStatus(player.id, true);
            }

            if (!player) return;

            const updatedPlayer = recalculatePlayer({
                ...player,
                game1_score: parsedScore.scores.game1 ?? player.game1_score,
                game2_score: parsedScore.scores.game2 ?? player.game2_score,
                game3_score: parsedScore.scores.game3 ?? player.game3_score,
                game4_score: parsedScore.scores.game4 ?? player.game4_score,
                game5_score: parsedScore.scores.game5 ?? player.game5_score,
                handicap: parsedScore.handicap ?? player.handicap,
            });

            setPlayers((prev) => {
                const exists = prev.some((p) => p.id === player!.id);
                if (!exists) return prev;
                return sortPlayersByRank(prev.map((p) => (p.id === player!.id ? updatedPlayer : p)));
            });

            setEditingScores((prev) => ({
                ...prev,
                [player!.id]: updatedPlayer,
            }));

            if (!skipSync) {
                await doubleService.syncDoubleScoresForGame(targetGameId);
                await coupleService.syncCoupleScoresForGame(targetGameId);
            }

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
        },
        [selectedGameId, games, players]
    );

    const handleApplyParsedScore = useCallback(
        async (parsedScore: ParsedScore) => {
            await handleApplyCsvScore(parsedScore);
        },
        [handleApplyCsvScore]
    );

    const handleApplyAllCsvScores = useCallback(async () => {
        const highConfidenceScores = csvParsedScores.filter(
            (s) => s.matchConfidence && s.matchConfidence >= 80
        );

        if (highConfidenceScores.length === 0) {
            alert("Tiada skor dengan confidence tinggi (≥80%) untuk diaplikasikan");
            return;
        }

        try {
            for (let i = 0; i < highConfidenceScores.length; i += 5) {
                const chunk = highConfidenceScores.slice(i, i + 5);
                await Promise.all(chunk.map((score) => handleApplyCsvScore(score, true)));
            }

            if (selectedGameId) {
                await doubleService.syncDoubleScoresForGame(selectedGameId);
                await coupleService.syncCoupleScoresForGame(selectedGameId);
            }

            alert(`${highConfidenceScores.length} skor telah berjaya diaplikasikan!`);
        } catch (error) {
            console.error(error);
            alert("Ada ralat semasa import skor CSV.");
        }
    }, [csvParsedScores, handleApplyCsvScore, selectedGameId]);

    const resetCsvUpload = useCallback(() => {
        setUploadedCsv(null);
        setCsvParsedScores([]);
        setShowCsvModal(false);
    }, []);

    const handleResetHandicap = useCallback(() => {
        if (!selectedGameId) return;
        if (
            !confirm(
                "Adakah anda pasti untuk menyelaraskan handicap semua pemain dalam perlawanan ini berdasarkan rekod purata (average) semasa?"
            )
        ) {
            return;
        }

        let hasChanges = false;

        setEditingScores((prev) => {
            const next = { ...prev };

            players.forEach((p) => {
                const memberProfile = allMembers.find((m) => m.id === p.member_id);
                if (memberProfile?.handicap !== undefined) {
                    const current = next[p.id] ?? p;
                    if (current.handicap !== memberProfile.handicap) {
                        hasChanges = true;
                        next[p.id] = recalculatePlayer({
                            ...current,
                            handicap: memberProfile.handicap,
                        });
                    }
                }
            });

            return next;
        });

        if (hasChanges) {
            alert(
                "Handicap telah diselaraskan pada paparan. Sila tekan butang 'Save All' berwarna merah untuk menyimpan perubahan tersebut ke dalam pangkalan data."
            );
        } else {
            alert("Tiada perubahan. Semua handicap pemain sudah selari dengan profil semasa.");
        }
    }, [selectedGameId, players, allMembers]);

    const handleManualSyncCouples = useCallback(async () => {
        if (!selectedGameId) return;

        try {
            setIsSyncingCouples(true);

            const doubleResult = await doubleService.syncDoubleScoresForGame(selectedGameId);
            await coupleService.syncCoupleScoresForGame(selectedGameId);

            let message = "";
            if (doubleResult.success) {
                message += `✅ DOUBLE: ${doubleResult.message}\n`;
                if (doubleResult.details?.length > 0) {
                    message += "\nContoh pengiraan:\n";
                    doubleResult.details.slice(0, 3).forEach((d: any, i: number) => {
                        message += `${i + 1}. P1: ${d.player1_score} + P2: ${d.player2_score} = ${d.total}\n`;
                    });
                }
            } else {
                message += `❌ DOUBLE: ${doubleResult.message}\n`;
            }

            message += `\n✅ COUPLE: Berjaya sync skor couple!\n\n`;
            message += `Sila semak halaman kedudukan Double/Couple untuk lihat perubahan.`;

            alert(message);
        } catch (error) {
            console.error(error);
            alert("Ralat semasa sync skor double & couple.");
        } finally {
            setIsSyncingCouples(false);
        }
    }, [selectedGameId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Score Management</h2>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">Edit player scores for games</p>
                </div>

                <div className="flex flex-wrap gap-2">
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

                    {selectedGameId && !isCoupleGame && players.length > 0 && (
                        <Button
                            onClick={handleResetHandicap}
                            variant="outline"
                            className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                            title="Selaraskan Handicap dari Average Score"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Handicap
                        </Button>
                    )}

                    {selectedGameId && (
                        <Button
                            onClick={handleManualSyncCouples}
                            disabled={isSyncingCouples}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSyncingCouples ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            {isSyncingCouples ? "Syncing..." : "Sync Double & Couple"}
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
                                    const formattedDate = `${date.getFullYear()}/${String(
                                        date.getMonth() + 1
                                    ).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

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

            {selectedGameId && isCoupleGame && (
                <div className="mb-6">
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-4 flex items-start gap-3 border border-blue-200">
                        <Info className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold">Automated Double Scores</h4>
                            <p className="text-sm">
                                Skor double dikira secara automatik apabila anda memasukkan skor individu pemain di bawah.
                                Skor double <strong>tidak mengambil kira handicap</strong>.
                            </p>
                        </div>
                    </div>
                    <CoupleScoreEntry selectedGameId={selectedGameId} />
                </div>
            )}

            {selectedGameId && !isCoupleGame && (
                <>
                    <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
                        <CardContent className="p-4">
                            <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
                                <span className="text-2xl">✨</span>
                                Clean Game Prize Pool
                            </h3>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {cleanGameSummary.map((item) => (
                                    <div
                                        key={item.gameNum}
                                        className="bg-white rounded-lg p-3 border-2 border-yellow-300 text-center"
                                    >
                                        <div className="text-xs font-semibold text-gray-600 mb-1">Game {item.gameNum}</div>
                                        <div className="text-lg font-bold text-amber-600">RM{item.totalPrize}</div>

                                        {item.winnerCount > 0 ? (
                                            <>
                                                <div className="text-xs text-gray-500 mt-1">{item.winnerCount} pemenang</div>
                                                <div className="text-sm font-semibold text-green-600">
                                                    RM{item.prizePerWinner.toFixed(2)}/org
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-xs text-gray-400 mt-1">Tiada pemenang</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200">
                        <CardContent className="p-0">
                            {loadingPlayers ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                                </div>
                            ) : (
                                <>
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        <SortButton
                                                            field="rank"
                                                            label="Rank"
                                                            sortField={sortField}
                                                            sortDirection={sortDirection}
                                                            onSort={handleSort}
                                                            className="hover:text-red-600"
                                                        />
                                                    </th>

                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        <SortButton
                                                            field="username"
                                                            label="Player"
                                                            sortField={sortField}
                                                            sortDirection={sortDirection}
                                                            onSort={handleSort}
                                                            className="hover:text-red-600"
                                                        />
                                                    </th>

                                                    {[
                                                        { field: "game1_score", label: "Game 1", color: "hover:text-blue-600" },
                                                        { field: "game2_score", label: "Game 2", color: "hover:text-green-600" },
                                                        { field: "game3_score", label: "Game 3", color: "hover:text-purple-600" },
                                                        { field: "game4_score", label: "Game 4", color: "hover:text-orange-600" },
                                                        { field: "game5_score", label: "Game 5", color: "hover:text-pink-600" },
                                                        { field: "handicap", label: "Handicap", color: "hover:text-yellow-600" },
                                                        { field: "total_score", label: "Total", color: "hover:text-gray-900" },
                                                        { field: "overall_score", label: "Overall", color: "hover:text-red-600" },
                                                    ].map((col) => (
                                                        <th
                                                            key={col.field}
                                                            className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                                                        >
                                                            <SortButton
                                                                field={col.field}
                                                                label={col.label}
                                                                sortField={sortField}
                                                                sortDirection={sortDirection}
                                                                onSort={handleSort}
                                                                className={`justify-center w-full ${col.color}`}
                                                            />
                                                        </th>
                                                    ))}

                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {displayedPlayers.map((player, index) => {
                                                    const originalPlayer = players.find((p) => p.id === player.id) ?? player;

                                                    return (
                                                        <ScoreRow
                                                            key={player.id}
                                                            player={originalPlayer}
                                                            rank={index}
                                                            editedPlayer={editingScores[player.id]}
                                                            saving={saving}
                                                            cleanGameWinners={cleanGameWinners}
                                                            onScoreChange={handleScoreChange}
                                                            onSave={handleSave}
                                                            onToggleCleanGameWinner={handleToggleCleanGameWinner}
                                                        />
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="lg:hidden p-3 sm:p-4 space-y-3">
                                        {displayedPlayers.map((player, index) => {
                                            const originalPlayer = players.find((p) => p.id === player.id) ?? player;

                                            return (
                                                <MobileScoreCard
                                                    key={player.id}
                                                    player={originalPlayer}
                                                    rank={index}
                                                    editedPlayer={editingScores[player.id]}
                                                    saving={saving}
                                                    cleanGameWinners={cleanGameWinners}
                                                    onScoreChange={handleScoreChange}
                                                    onSave={handleSave}
                                                    onToggleCleanGameWinner={handleToggleCleanGameWinner}
                                                />
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {!loadingPlayers && displayedPlayers.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-600">No scores found for this game</p>
                                    <p className="text-gray-500 text-sm mt-1">
                                        Try selecting a different game or add players first
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Upload Score Image</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {!imagePreview ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                    id="score-image-upload"
                                />
                                <label
                                    htmlFor="score-image-upload"
                                    className="cursor-pointer flex flex-col items-center"
                                >
                                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-900">
                                        Click to upload score image
                                    </span>
                                    <span className="text-xs text-gray-500 mt-1">
                                        Supports JPG, PNG (Max 5MB)
                                    </span>
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-gray-200">
                                    <Image
                                        src={imagePreview}
                                        alt="Score preview"
                                        fill
                                        className="object-contain"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={retryWithNewImage}
                                        disabled={parsing}
                                    >
                                        Choose Different Image
                                    </Button>

                                    <Button
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={handleParseImage}
                                        disabled={parsing}
                                    >
                                        {parsing ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-4 w-4 mr-2" />
                                        )}
                                        {parsing ? "Parsing Scores..." : "Extract Scores"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {ocrResult && !ocrResult.success && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <p>{ocrResult.error || "Failed to parse image. Please try a clearer photo."}</p>
                            </div>
                        )}

                        {parsedScores.length > 0 && (
                            <div className="space-y-3 mt-6 border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">Extracted Scores</h3>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowRawText((prev) => !prev)}
                                        className="h-8 text-xs"
                                    >
                                        {showRawText ? "Hide Raw Text" : "Show Raw Text"}
                                    </Button>
                                </div>

                                {showRawText && ocrResult?.text && (
                                    <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                        {ocrResult.text}
                                    </div>
                                )}

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {parsedScores.map((score, idx) => (
                                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-medium text-gray-900">{score.name}</div>
                                                    {score.matchedMember ? (
                                                        <div className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                                                            Matched: {score.matchedMember.username}
                                                            {getConfidenceBadge(score.matchConfidence)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            No matching member found
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-right">
                                                    <div className="font-bold text-gray-900">
                                                        Total:{" "}
                                                        {(score.scores.game1 || 0) +
                                                            (score.scores.game2 || 0) +
                                                            (score.scores.game3 || 0) +
                                                            (score.scores.game4 || 0) +
                                                            (score.scores.game5 || 0)}
                                                    </div>
                                                    {score.handicap !== undefined && (
                                                        <div className="text-xs text-gray-500">Hcp: {score.handicap}</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-5 gap-1 mt-2 text-center text-xs">
                                                {["game1", "game2", "game3", "game4", "game5"].map((gameKey, i) => (
                                                    <div key={gameKey} className="bg-white border rounded py-1">
                                                        <div className="text-gray-500">G{i + 1}</div>
                                                        <div className="font-semibold">
                                                            {score.scores[gameKey as keyof ParsedScore["scores"]] || "-"}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {score.matchedMember && (
                                                <Button
                                                    size="sm"
                                                    className="w-full mt-2 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                    onClick={() => handleApplyParsedScore(score)}
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Apply Score
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={resetUpload}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showCsvModal} onOpenChange={setShowCsvModal}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Upload CSV Scores</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
                            <p className="font-semibold mb-1">CSV Format Requirements:</p>
                            <ul className="list-disc pl-5 space-y-1 text-xs">
                                <li>
                                    Headers must include: <strong>name</strong> (or player)
                                </li>
                                <li>
                                    Game scores: <strong>game1, game2, game3, game4, game5</strong> (or g1, g2...)
                                </li>
                                <li>
                                    Optional: <strong>handicap</strong> (or hcp), <strong>date</strong> (YYYY-MM-DD),{" "}
                                    <strong>fivefive</strong> (true/false)
                                </li>
                            </ul>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleCsvSelect}
                                className="hidden"
                                id="score-csv-upload"
                            />
                            <label
                                htmlFor="score-csv-upload"
                                className="cursor-pointer flex flex-col items-center"
                            >
                                <FileText className="h-10 w-10 text-gray-400 mb-2" />
                                <span className="text-sm font-medium text-gray-900">
                                    {uploadedCsv ? uploadedCsv.name : "Click to select CSV file"}
                                </span>
                            </label>
                        </div>

                        {uploadedCsv && (
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={handleParseCsv}
                                disabled={csvParsing}
                            >
                                {csvParsing ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <FileText className="h-4 w-4 mr-2" />
                                )}
                                {csvParsing ? "Parsing CSV..." : "Process CSV"}
                            </Button>
                        )}

                        {csvParsedScores.length > 0 && (
                            <div className="space-y-3 mt-6 border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">
                                        Ready to Import (
                                        {csvParsedScores.filter((s) => s.matchConfidence && s.matchConfidence >= 80).length} matches)
                                    </h3>
                                    <Button
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={handleApplyAllCsvScores}
                                    >
                                        Import All Matched
                                    </Button>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {csvParsedScores.map((score, idx) => (
                                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-medium text-gray-900">{score.name}</div>
                                                    {score.matchedMember ? (
                                                        <div className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                                                            Matched: {score.matchedMember.username}
                                                            {getConfidenceBadge(score.matchConfidence)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            No matching member found
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-right">
                                                    <div className="font-bold text-gray-900">
                                                        Total:{" "}
                                                        {(score.scores.game1 || 0) +
                                                            (score.scores.game2 || 0) +
                                                            (score.scores.game3 || 0) +
                                                            (score.scores.game4 || 0) +
                                                            (score.scores.game5 || 0)}
                                                    </div>
                                                    {score.date && (
                                                        <div className="text-xs text-gray-500">Date: {score.date}</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-5 gap-1 mt-2 text-center text-xs">
                                                {["game1", "game2", "game3", "game4", "game5"].map((gameKey, i) => (
                                                    <div key={gameKey} className="bg-white border rounded py-1">
                                                        <div className="text-gray-500">G{i + 1}</div>
                                                        <div className="font-semibold">
                                                            {score.scores[gameKey as keyof ParsedScore["scores"]] || "-"}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={resetCsvUpload}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}